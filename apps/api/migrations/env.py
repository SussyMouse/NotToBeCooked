"""Alembic environment.

Two jobs, and only two: say which database to connect to, and say which metadata
counts as "what the schema should look like". Everything else here is the stock
async template.

The connection URL comes from `settings`, never from alembic.ini -- alembic.ini is
committed to git and a real URL carries a password. See the note in that file.
"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlmodel import SQLModel

# app.models is imported for its side effect: executing those modules is what
# registers their tables into SQLModel.metadata. Without it the metadata is empty,
# and autogenerate reads an empty metadata as "every table in the database should
# be dropped" -- it writes op.drop_table for all seven without asking. Nothing
# below references the name, which is why it needs the noqa.
import app.models  # noqa: F401
from app.core.config import settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# One metadata covers both the SQLModel tables and Chunk's DeclarativeBase,
# because that Base is declared with metadata = SQLModel.metadata.
target_metadata = SQLModel.metadata

# compare_type is deliberately left off. It catches column type changes, which we
# will want eventually, but SQLModel's AutoString reports as a different type from
# the VARCHAR it produces, so turning it on today means every autogenerate run
# emits spurious alter_column noise. Revisit once the schema has settled.


def run_migrations_offline() -> None:
    """Emit SQL to stdout instead of running it. Used for reviewing a migration."""
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    # The URL is injected into the section dict rather than through
    # config.set_main_option, because ConfigParser would try to interpolate a %
    # in a password and fail with an unhelpful error.
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = settings.DATABASE_URL

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
