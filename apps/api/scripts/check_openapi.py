#!/usr/bin/env python3
"""Fail if packages/contracts/openapi.json no longer matches the running app.

`pnpm verify` proves the backend compiles and the frontend compiles. It does not
prove they agree, because the contract between them is a checked-in file that
nothing regenerates and nothing compares.

Measured 1 September 2026: CR-33 changed the ingest endpoint to 202 and made
`ingestion_run_id` required. `packages/contracts/openapi.json` was not
regenerated, so for several hours it said 200 with `status` still carrying
"uploaded" -- while `pnpm verify` was 13/13 green the whole time. The frontend
would have been typed against a backend that no longer existed.

This closes that: the generated document is compared to the committed one, and a
difference is a failure with the fix printed. It is deliberately an equality
check rather than a compatibility check -- "did you regenerate" is a question
with one right answer, and a cleverer check would let a real drift through while
arguing about what counts as breaking.
"""

import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402

COMMITTED = Path(__file__).resolve().parents[3] / "packages" / "contracts" / "openapi.json"


def main() -> int:
    if not COMMITTED.exists():
        print(f"missing: {COMMITTED}")
        print("run: pnpm schema:update")
        return 1

    current = json.loads(json.dumps(app.openapi()))
    committed = json.loads(COMMITTED.read_text(encoding="utf-8"))

    if current == committed:
        print(f"openapi.json matches the app ({len(current.get('paths', {}))} paths)")
        return 0

    print("packages/contracts/openapi.json is out of date with the app.")
    print()

    # A whole-file diff of a 2000-line JSON document is unreadable, so name the
    # paths and schemas that moved. That is what a person needs to decide whether
    # the change was intended.
    for label, key in (("paths", "paths"), ("schemas", "components")):
        a = set(_keys(current, key))
        b = set(_keys(committed, key))
        for name in sorted(a - b):
            print(f"  + {label}: {name}")
        for name in sorted(b - a):
            print(f"  - {label}: {name}")
        for name in sorted(a & b):
            if _get(current, key, name) != _get(committed, key, name):
                print(f"  ~ {label}: {name}")

    print()
    print("run: pnpm schema:update   (regenerates openapi.json and the TS/zod types)")
    return 1


def _keys(doc: dict, key: str) -> list[str]:
    return list(doc.get("components", {}).get("schemas", {}) if key == "components" else doc.get(key, {}))


def _get(doc: dict, key: str, name: str):
    root = doc.get("components", {}).get("schemas", {}) if key == "components" else doc.get(key, {})
    return root.get(name)


if __name__ == "__main__":
    raise SystemExit(main())
