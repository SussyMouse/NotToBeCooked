"""r42 chunk course_id chain and course status enum

Two decisions from the 25 Aug 2026 meeting, in one revision because both are
schema changes and one downgrade/upgrade cycle is cheaper to verify than two.

  Decision 02 (R4's second half). `CHUNK.course_id` was free to disagree with
  `CHUNK.file_id` -- a chunk could claim a course its own file does not belong
  to, and nothing stopped it. Measured 23 Aug: the row went in. The fix needs a
  composite foreign key, and a composite FK must point at real columns on one
  table. Nothing carried both `file_id` and `course_id`, so FILE gets a
  denormalised `course_id` to be that target. Two links, not one:

      CHUNK (file_id, course_id)   -> FILE   (id, course_id)
      FILE  (folder_id, course_id) -> FOLDER (id, course_id)

  Decision 06. `COURSE.status` was `varchar` with no domain since it was
  ratified on 27 Jul. The code only ever writes "active". It becomes an enum of
  exactly two values, because R16 declined soft delete and `scope_course_id` is
  RESTRICT -- so a course used by any run can never be deleted, and `archived`
  is the only way a user can get it out of the sidebar.

Verified by check_r42.py (11/11) over upgrade -> downgrade -> upgrade.

Revision ID: 7a0586ff1490
Revises: c8a70c2d9d3f
Create Date: 2026-08-26 12:21:03.095038

"""

from collections.abc import Sequence

# All three noqa markers are for the same situation: a migration whose body is
# empty, or which touches no str column, leaves one of these imports unused and
# `pnpm verify` goes red on a file nobody has written a line of yet. `sqlmodel`
# is not in Alembic's stock template at all -- autogenerate emits
# sqlmodel.sql.sqltypes.AutoString for every str column and imports nothing, so
# without it a generated migration dies with NameError on first run.
#
# Note the submodule form `sqlmodel.sql.sqltypes`. Plain `import sqlmodel` runs
# fine but pyright reports `"sql" is not a known attribute of module "sqlmodel"`
# on every AutoString column, and `pnpm verify` runs pyright over migrations/.
import sqlalchemy as sa  # noqa: F401
import sqlmodel.sql.sqltypes  # noqa: F401
from alembic import op  # noqa: F401

# ---------------------------------------------------------------------------
# Four things autogenerate cannot write. Check all four before running this.
# Every one of them was hit for real on 20-22 Aug 2026 while writing r41.
#
# 1. IMPORTS for types it does not recognise. It renders them by full dotted
#    path -- `pgvector.sqlalchemy.vector.VECTOR`, `app.schemas.chunk.TSVector`
#    -- and imports neither. Fails with NameError before opening a connection.
#    Import the submodule actually referenced, not the top-level package:
#    `import pgvector` leaves `pgvector.sqlalchemy` unbound.
#
# 2. EXTENSIONS. A model says a column is a Vector; it cannot say that the type
#    itself ships with an extension. A fresh database has none installed, and
#    `pgvector/pgvector` only puts the files on the server -- pg_extension is
#    per database. First line of upgrade():
#        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
#
# 3. DROPPING ENUM TYPES in downgrade(). op.drop_table removes the table and
#    nothing else; a PostgreSQL enum is a type in its own right and outlives
#    every table that used it, so the next upgrade dies on DuplicateObjectError.
#        sa.Enum(name="filestatus").drop(op.get_bind(), checkfirst=True)
#    Order matters: drop the tables first, or the type is still depended on.
#
# 4. REUSING AN ENUM that an earlier revision already created. This is the
#    quiet one -- it passes on a clean database and fails on every database
#    that ran the earlier revision separately, which is every teammate's.
#    Two lines, and both are needed, because two different actors emit
#    CREATE TYPE:
#
#        status = postgresql.ENUM("a", "b", name="filestatus", create_type=False)
#
#        def upgrade():
#            status.create(op.get_bind(), checkfirst=True)
#            op.create_table("milestone", sa.Column("status", status), ...)
#
#    create_type=False silences the one create_table fires on its own, which
#    never checks. checkfirst=True is the check, on the call you control.
#    Dropping either line brings the failure back: with create_type left True
#    the table build re-issues CREATE TYPE regardless of your checkfirst, and
#    with create_type=False alone the type is never created at all.
#    PostgreSQL has no CREATE TYPE IF NOT EXISTS -- checkfirst is the substitute.
# ---------------------------------------------------------------------------

# revision identifiers, used by Alembic.
revision: str = "7a0586ff1490"
down_revision: str | Sequence[str] | None = "c8a70c2d9d3f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # `op.create_table` builds an enum type on the way past; `op.alter_column`
    # does not. Without this line the ALTER below dies on
    # `UndefinedObjectError: type "coursestatus" does not exist`, which reads
    # like a typo and is not one. checkfirst=True because PostgreSQL has no
    # CREATE TYPE IF NOT EXISTS -- see item 4 of the template note above.
    sa.Enum("active", "archived", name="coursestatus").create(op.get_bind(), checkfirst=True)

    # postgresql_using is not optional here. varchar -> enum has no implicit
    # cast, and PostgreSQL says so itself:
    #     column "status" cannot be cast automatically to type coursestatus
    #     HINT: You might need to specify "USING status::coursestatus".
    # Every existing row already holds 'active', so the cast cannot fail; a value
    # outside the enum would abort the whole migration, which is the behaviour we
    # want if one ever appears.
    op.alter_column(
        "course",
        "status",
        existing_type=sa.VARCHAR(),
        type_=sa.Enum("active", "archived", name="coursestatus"),
        existing_nullable=False,
        postgresql_using="status::coursestatus",
    )

    # NOT NULL with no server_default is safe only because every deployment is
    # still empty -- ingest is not wired up, so `file` has no rows anywhere. On a
    # populated table this would need a backfill between the ADD and the SET.
    op.add_column("file", sa.Column("course_id", sa.Uuid(), nullable=False))

    # uq_file_id_course covers (id, course_id) with id leftmost, so it answers
    # nothing about course_id alone. Listing a course's files needs its own
    # index -- PostgreSQL does not index a foreign key for you (R20).
    op.create_index(op.f("ix_file_course_id"), "file", ["course_id"], unique=False)

    # Both UNIQUEs exist to be foreign key targets, not to forbid duplicates --
    # `id` is already a primary key on both tables, so as uniqueness claims they
    # say nothing new. PostgreSQL will not accept (id, course_id) as an FK target
    # unless some unique constraint covers exactly those columns. Same reason
    # INGESTION_RUN carries uq_ingestion_run_id_file for R4's first half.
    #
    # Order matters, and autogenerate got it wrong: it emits operations grouped
    # by table name alphabetically, so both foreign keys landed before the
    # constraints they point at. Build the target, then the key that aims at it.
    #     there is no unique constraint matching given keys for referenced
    #     table "folder"
    op.create_unique_constraint("uq_file_id_course", "file", ["id", "course_id"])
    op.create_unique_constraint("uq_folder_id_course", "folder", ["id", "course_id"])

    # Unnamed on purpose: it comes from `Field(foreign_key="course.id")` in the
    # model, which has nowhere to put a name, so PostgreSQL assigns one.
    # downgrade() has to spell that generated name out -- see the note there.
    op.create_foreign_key(None, "file", "course", ["course_id"], ["id"], ondelete="CASCADE")

    # The two links of the chain. Neither is a lookup path; both exist so that a
    # disagreement is rejected at write time rather than discovered at read time.
    op.create_foreign_key(
        "fk_file_folder_course_agree",
        "file",
        "folder",
        ["folder_id", "course_id"],
        ["id", "course_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_chunk_file_course_agree",
        "chunk",
        "file",
        ["file_id", "course_id"],
        ["id", "course_id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Downgrade schema."""
    # This body is upgrade() read backwards, and it has to be. Every foreign key
    # comes off before the constraint or column it depends on; dropping in the
    # order autogenerate wrote them fails with
    #     cannot drop constraint uq_file_id_course on table file because other
    #     objects depend on it
    op.drop_constraint("fk_chunk_file_course_agree", "chunk", type_="foreignkey")
    op.drop_constraint("fk_file_folder_course_agree", "file", type_="foreignkey")

    # The name PostgreSQL generated for the unnamed FK created above. Autogenerate
    # wrote `None` here, which is not a name and cannot be dropped:
    #     CompileError: Can't emit DROP CONSTRAINT ... it has no name
    op.drop_constraint("file_course_id_fkey", "file", type_="foreignkey")

    op.drop_constraint("uq_folder_id_course", "folder", type_="unique")
    op.drop_constraint("uq_file_id_course", "file", type_="unique")
    op.drop_index(op.f("ix_file_course_id"), table_name="file")
    op.drop_column("file", "course_id")

    op.alter_column(
        "course",
        "status",
        existing_type=sa.Enum("active", "archived", name="coursestatus"),
        type_=sa.VARCHAR(),
        existing_nullable=False,
    )

    # A PostgreSQL enum is a type in its own right and outlives the column that
    # used it. Turning the column back into varchar leaves `coursestatus` sitting
    # in the database, and the next `upgrade head` then dies on DuplicateObject.
    # It passes on a clean database and fails on any machine that ran this
    # revision once -- which is every teammate's, and never CI's.
    sa.Enum(name="coursestatus").drop(op.get_bind(), checkfirst=True)
