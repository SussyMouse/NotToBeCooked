"""r47 message.uncovered

Revision ID: cc7bd2052443
Revises: 7a0586ff1490
Create Date: 2026-09-13 18:52:24.647960

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
revision: str = "cc7bd2052443"
down_revision: str | Sequence[str] | None = "7a0586ff1490"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add MESSAGE.uncovered -- r47, partial-coverage handling.

    Nullable, and it has to be: every row already in the table predates the
    column, and NULL is the honest value for them. It is also the value a
    complete answer carries, so the two are not distinguishable on old rows --
    which is correct, because before this column existed the system could not
    tell those two cases apart either. Backfilling a default would have invented
    a claim about turns nobody checked.

    AutoString rather than sa.Text: `Message.uncovered` is a plain `str | None`
    on the model, which SQLModel renders as AutoString -> VARCHAR, and a
    migration that disagrees with the model makes the next autogenerate emit a
    type change nobody asked for.
    """
    op.add_column(
        "message",
        sa.Column("uncovered", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema.

    Dropping the column loses the caveats written while it existed. That is the
    correct behaviour for a downgrade and is stated here rather than guarded,
    because the alternative -- refusing to downgrade -- strands the database on
    a revision it cannot leave.
    """
    op.drop_column("message", "uncovered")
