"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

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
${imports if imports else ""}
# autogenerate renders a type it does not recognise by its full dotted path --
# `pgvector.sqlalchemy.vector.VECTOR`, `app.schemas.chunk.TSVector` -- and then
# imports neither. Any migration touching CHUNK needs those two imports added by
# hand, or it dies with NameError before it reaches the database. Likewise
# `op.execute("CREATE EXTENSION IF NOT EXISTS vector")`: autogenerate reads the
# models, and a model cannot tell it that one of its column types comes from an
# extension.

# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: str | Sequence[str] | None = ${repr(down_revision)}
branch_labels: str | Sequence[str] | None = ${repr(branch_labels)}
depends_on: str | Sequence[str] | None = ${repr(depends_on)}


def upgrade() -> None:
    """Upgrade schema."""
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    """Downgrade schema."""
    ${downgrades if downgrades else "pass"}
