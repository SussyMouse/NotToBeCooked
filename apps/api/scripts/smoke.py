#!/usr/bin/env python3
"""Smoke test — proves the heavy runtime paths actually run.

`pnpm verify` proves the code compiles. It runs lint, format, typecheck and
build, and not one of those loads a model, opens a PDF, or links a shared
library. On 19-20 Aug 2026 three separate defects sat on `dev` behind a green
verify, all of the same shape: a dependency that only fails on a code path
nothing exercises.

    peft missing            embed_query() raised ImportError. Unreached because
                            _retrieve() returns [].
    opencv-python (GUI)     links libxcb.so.1 and libgthread-2.0.so.0, neither
                            of which exists in python:3.13-slim. `import cv2`
                            failed in the shipped image. Unreached because no
                            test ever parsed a PDF.
    HF Xet transfer         tokenizer.json download died with "CAS Client
                            Error", leaving a cache that looks complete.

Each check below corresponds to one of those, plus the end-to-end path.

This is deliberately NOT part of `pnpm verify`: a cold run downloads ~1.9 GB of
model weights and takes minutes. Run it by hand before a deploy, after changing
dependencies, or on a schedule.

    cd apps/api
    HF_HUB_DISABLE_XET=1 uv run python scripts/smoke.py

HF_HUB_DISABLE_XET=1 is not optional on every machine. HuggingFace's Xet
backend fails here with an error that names neither HuggingFace nor the file,
and the fallback plain-HTTP transfer works.

Check 1 fails locally on any machine whose glib no longer ships the
libgthread-2.0.so.0 compatibility stub -- openSUSE Tumbleweed, for one. The
image is fixed in the Dockerfile, which swaps in opencv-python-headless after
uv sync and is never re-synced afterwards. A local checkout cannot be fixed the
same way: uv resolves opencv-python from the lock, so any `uv run` or `uv sync`
puts the GUI build back and its files overwrite the headless ones. Locally:

    uv pip uninstall opencv-python opencv-python-headless
    uv pip install opencv-python-headless==5.0.0.93
    uv run --no-sync python scripts/smoke.py

and re-run those two lines whenever check 1 goes red. It going red is the
signal that a sync undid it, which is exactly what this check is for.
"""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

FIXTURE = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "sample.pdf"
RESULTS: list[tuple[str, bool, str]] = []


def rss_mb() -> float:
    with open("/proc/self/status") as f:
        for line in f:
            if line.startswith("VmRSS:"):
                return int(line.split()[1]) / 1024
    return 0.0


def check(label: str):
    """Run one check. The callable returns a note string, or raises."""

    def wrap(fn):
        t = time.time()
        try:
            RESULTS.append((label, True, f"{fn()}  [{time.time() - t:.0f}s]"))
        except Exception as exc:  # noqa: BLE001
            RESULTS.append((label, False, f"{type(exc).__name__}: {exc}"))
        return fn

    return wrap


# ---------------------------------------------------------------- 1
@check("cv2 imports and every shared library resolves")
def _cv2() -> str:
    import cv2

    # getattr rather than cv2.__file__ / cv2.__version__ directly: the two opencv
    # distributions ship different type information, so pyright sees __file__ as
    # str | None and does not see __version__ at all on one of them. Reading them
    # defensively keeps this check green under either wheel, which matters because
    # swapping between the two is exactly what this check exists to catch.
    location = getattr(cv2, "__file__", None)
    if location is None:
        raise RuntimeError("cv2 has no __file__, so its shared objects cannot be located")

    so = next(Path(location).parent.glob("*.so"))
    ldd = subprocess.run(["ldd", str(so)], capture_output=True, text=True).stdout
    missing = [ln.split()[0] for ln in ldd.splitlines() if "not found" in ln]
    if missing:
        raise RuntimeError(f"unresolved: {', '.join(missing)} — GUI opencv in a headless image?")
    return f"opencv {getattr(cv2, '__version__', 'unknown')}, 0 unresolved"


# ---------------------------------------------------------------- 2
@check("embedding model loads and its width matches settings")
def _model() -> str:
    from app.core.config import settings
    from app.services.embeddings import embed_query

    v = embed_query("How is backpropagation calculated?")
    if len(v) != settings.EMBEDDINGS_DIM:
        raise RuntimeError(
            f"model returns {len(v)}, settings.EMBEDDINGS_DIM is "
            f"{settings.EMBEDDINGS_DIM} — the migration would write the wrong width"
        )
    return f"dim {len(v)}"


# ---------------------------------------------------------------- 3
@check("embeddings separate relevant text from unrelated text")
def _semantics() -> str:
    from app.services.embeddings import embed_query, embed_text

    q = embed_query("How is backpropagation calculated?")
    near, far = embed_text(
        [
            "Backpropagation computes the gradient of the loss with respect to each weight.",
            "The library opens at 9am on weekdays and closes at 6pm.",
        ]
    )

    def cos(a, b):
        return sum(x * y for x, y in zip(a, b, strict=True)) / (
            sum(x * x for x in a) ** 0.5 * sum(y * y for y in b) ** 0.5
        )

    hit, miss = cos(q, near), cos(q, far)
    # A wide margin, not a tuned threshold. This catches a model that loaded but
    # returns constant or untrained vectors, not a model that is merely mediocre.
    if hit - miss < 0.3:
        raise RuntimeError(f"relevant {hit:.3f} vs unrelated {miss:.3f} — too close to be real")
    return f"relevant {hit:.3f}, unrelated {miss:.3f}"


# ---------------------------------------------------------------- 4
@check("Docling parses a PDF to text")
def _docling() -> str:
    from docling.document_converter import DocumentConverter

    if not FIXTURE.exists():
        raise FileNotFoundError(FIXTURE)
    text = DocumentConverter().convert(str(FIXTURE)).document.export_to_markdown()
    if "ackpropagation" not in text:
        raise RuntimeError(f"parsed {len(text)} chars but the expected heading is absent")
    return f"{len(text)} chars"


# ---------------------------------------------------------------- 5
@check("the app imports and /rag/query is registered")
def _app() -> str:
    import app.main

    # Read the OpenAPI schema rather than walking app.routes. The route list
    # mixes Route, APIRoute and _IncludedRouter, and only the first two carry a
    # .path -- an included router holds its children behind original_router with
    # the prefix in its include_context. The schema is the assembled view, and
    # it is the same document packages/contracts generates the TS client from.
    paths = app.main.app.openapi()["paths"]
    if "/rag/query" not in paths:
        raise RuntimeError(f"/rag/query absent from {len(paths)} paths: {sorted(paths)}")
    return f"{len(paths)} paths, /rag/query present"


def main() -> None:
    peak = rss_mb()
    width = max(len(label) for label, _, _ in RESULTS)
    print()
    for i, (label, ok, note) in enumerate(RESULTS, 1):
        print(f"[{i}/{len(RESULTS)}] {label.ljust(width, '.')}... {'PASS' if ok else 'FAIL'}")
        print(f"        {note}")
    passed = sum(1 for _, ok, _ in RESULTS if ok)
    print(f"\n{passed}/{len(RESULTS)} — peak RSS {peak:.0f} MB")
    if passed == len(RESULTS):
        # The number this run cares about most: one process with everything
        # resident. Multiply by the uvicorn worker count before sizing a box —
        # each worker loads its own copy of the model.
        print("Size the host from peak RSS x worker count, not peak RSS.")
    sys.exit(0 if passed == len(RESULTS) else 1)


main()
