#!/usr/bin/env python3
"""Regenerate docs/erd/CODE_VS_ERD.md, or fail if the committed copy is stale.

`docs/erd/erd.mmd` is the schema of record. `app/schemas/*.py` is what Alembic
autogenerates from. Nothing made those two agree, so the divergence was written
down by hand -- and the hand-written document says so about itself:

    Regenerate it whenever the models change. A stale diff is worse than none,
    because it will be trusted.

It was last regenerated on 20 August 2026 and was still being read on 10
September. This script is that sentence made mechanical.

Usage:
    uv run python scripts/erd_diff.py --write    # regenerate the document
    uv run python scripts/erd_diff.py --check    # exit 1 if it is out of date

WHAT IS COMPARED, AND WHAT IS DELIBERATELY NOT

Compared: which tables exist, which columns exist on each, and the type family
of every column present in both.

Not compared: nullability. `erd.mmd` has no syntax for it -- the diagram says
"nullable" inside a free-text comment on some columns and says nothing on the
rest, so a mechanical comparison would report every unmarked column as a
mismatch. Silence in the diagram is not a claim, and a check that treats it as
one produces noise that trains people to ignore the check.

Types are compared as FAMILIES, not as strings. `string` in Mermaid and
`VARCHAR` in PostgreSQL are the same decision spelled two ways, and a diff that
reports every one of them tells you nothing about the two that matter.

The dialect matters and is not optional. Without `postgresql.dialect()`,
SQLAlchemy renders UUID as CHAR(32) and every timestamptz as DATETIME; diffing
that produced seventeen mismatches in August, all of them artefacts.
"""

import argparse
import datetime as dt
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy.dialects import postgresql  # noqa: E402
from sqlmodel import SQLModel  # noqa: E402

import app.models  # noqa: F401,E402 -- registers every table with the metadata

REPO = Path(__file__).resolve().parents[3]
ERD = REPO / "docs" / "erd" / "erd.mmd"
DOC = REPO / "docs" / "erd" / "CODE_VS_ERD.md"

_ENTITY = re.compile(r"^\s{4}([A-Z][A-Z_]*)\s*\{$")
_FIELD = re.compile(r'^\s{8}(\w+)\s+(\w+)(?:\s+(PK|FK|UK))?(?:\s+"(.*)")?\s*$')

# Mermaid's type word -> the PostgreSQL type families that spell it. A column
# whose compiled type starts with any of these is a match.
FAMILIES: dict[str, tuple[str, ...]] = {
    "uuid": ("UUID",),
    "string": ("VARCHAR", "TEXT"),
    "text": ("TEXT", "VARCHAR"),
    "int": ("INTEGER", "SERIAL"),
    "bigint": ("BIGINT",),
    "smallint": ("SMALLINT",),
    "bool": ("BOOLEAN",),
    "timestamptz": ("TIMESTAMP WITH TIME ZONE",),
    "date": ("DATE",),
    "jsonb": ("JSONB",),
    "vector": ("VECTOR",),
    "tsvector": ("TSVECTOR",),
}


def erd_tables() -> dict[str, dict[str, str]]:
    """{table_name: {column: mermaid_type}} parsed out of the diagram."""
    out: dict[str, dict[str, str]] = {}
    current: str | None = None
    for line in ERD.read_text(encoding="utf-8").splitlines():
        if (m := _ENTITY.match(line)) is not None:
            # str() rather than the group directly: re.Match.group is typed
            # `str | Any`, which narrows back to `str | None` against the
            # declaration above and makes the dict key untypeable.
            current = str(m.group(1)).lower()
            out[current] = {}
        elif current is not None and line.strip() == "}":
            current = None
        elif current is not None and (m := _FIELD.match(line)) is not None:
            out[current][str(m.group(2))] = str(m.group(1))
    return out


def code_tables() -> dict[str, dict[str, str]]:
    """{table_name: {column: compiled PostgreSQL type}} from live metadata."""
    pg = postgresql.dialect()
    return {
        name: {c.name: c.type.compile(pg).upper() for c in table.columns}
        for name, table in SQLModel.metadata.tables.items()
    }


def family_matches(mermaid_type: str, pg_type: str) -> bool:
    if mermaid_type == "enum":
        # The compiled name is the PostgreSQL enum type's own name -- filestatus,
        # coursestatus, chatrole. There is nothing to match it against but the
        # absence of every other family, which is what this is.
        return not any(pg_type.startswith(p) for fam in FAMILIES.values() for p in fam)
    return any(pg_type.startswith(p) for p in FAMILIES.get(mermaid_type, ()))


def render() -> str:
    erd, code = erd_tables(), code_tables()
    commit = (
        subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=REPO,
            capture_output=True,
            text=True,
        ).stdout.strip()
        or "unknown"
    )

    erd_only_t = sorted(set(erd) - set(code))
    code_only_t = sorted(set(code) - set(erd))
    shared = sorted(set(erd) & set(code))

    col_rows: list[tuple[str, str, str, str]] = []
    for table in shared:
        e, c = erd[table], code[table]
        for col in sorted(set(e) - set(c)):
            col_rows.append((table, col, "in the diagram only", e[col]))
        for col in sorted(set(c) - set(e)):
            col_rows.append((table, col, "in the code only", c[col]))
        for col in sorted(set(e) & set(c)):
            if not family_matches(e[col], c[col]):
                col_rows.append((table, col, "type family differs", f"{e[col]} / {c[col]}"))

    L = [
        "# Code vs ERD",
        "",
        f"**Generated {dt.date.today():%d %B %Y} from `{commit}` by "
        "`apps/api/scripts/erd_diff.py`. Do not edit by hand.**",
        "",
        "`docs/erd/erd.mmd` is the schema of record; the code side is introspected from",
        "live `SQLModel.metadata` and compiled against `postgresql.dialect()`, not read",
        "off the source and summarised.",
        "",
        "Nullability is **not** compared -- `erd.mmd` has no syntax for it. Types are",
        "compared as families, so `string` and `VARCHAR` agree. See the script's",
        "docstring for why both of those are deliberate.",
        "",
        "> The hand-written version of this file, which this replaces, ended with the",
        "> reason it now exists: *being ratified was not enough to get them done -- they",
        "> needed a line in a diff.* That version is in git; the last one is at `1633138`.",
        "",
        "## Totals",
        "",
        "| | Count |",
        "|---|---|",
        f"| Entities in the diagram | {len(erd)} |",
        f"| Tables in the code | {len(code)} |",
        f"| In the diagram, absent from the code | {len(erd_only_t)} |",
        f"| In the code, absent from the diagram | {len(code_only_t)} |",
        f"| Column-level differences | {len(col_rows)} |",
        "",
    ]

    L += ["## Tables", ""]
    if erd_only_t or code_only_t:
        L += ["| Table | Where it is |", "|---|---|"]
        L += [f"| `{t}` | diagram only |" for t in erd_only_t]
        L += [f"| `{t}` | code only |" for t in code_only_t]
    else:
        L.append("Every entity in the diagram exists as a table, and nothing else does.")
    L.append("")

    L += ["## Columns", ""]
    if col_rows:
        L += ["| Table | Column | Difference | Type |", "|---|---|---|---|"]
        L += [f"| `{t}` | `{c}` | {w} | `{ty}` |" for t, c, w, ty in col_rows]
    else:
        L.append("Every shared table matches the diagram column for column.")
    L += [
        "",
        "---",
        "",
        "Regenerate with `uv run python scripts/erd_diff.py --write` from `apps/api`.",
        "",
    ]
    return "\n".join(L)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--write", action="store_true")
    g.add_argument("--check", action="store_true")
    args = ap.parse_args()

    current = render()
    if args.write:
        DOC.write_text(current, encoding="utf-8")
        print(f"wrote {DOC.relative_to(REPO)}")
        return 0

    committed = DOC.read_text(encoding="utf-8") if DOC.exists() else ""
    # The generated header carries today's date, so an unchanged schema would
    # still differ every day. Compare everything below it.
    body = lambda t: t.split("## Totals", 1)[-1]  # noqa: E731
    if body(current) == body(committed):
        print("CODE_VS_ERD.md matches the code and the diagram")
        return 0
    print("docs/erd/CODE_VS_ERD.md is out of date.")
    print("run: cd apps/api && uv run python scripts/erd_diff.py --write")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
