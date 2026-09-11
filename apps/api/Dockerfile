# High-performance Dockerfile using Astral's uv
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS builder

ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

WORKDIR /app

# Install dependencies using uv lock file
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project --no-dev

# Copy application source code
COPY pyproject.toml uv.lock ./
COPY app ./app

# Sync project
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# Swap opencv-python for opencv-python-headless, same version.
#
# Nothing here chose opencv: docling -> docling-slim[standard] -> rapidocr
# -> opencv-python, and docling_ibm_models' tf_predictor.py imports cv2 for
# table structure detection without declaring it. The GUI build links against
# X11 (libxcb.so.1) and glib (libgthread-2.0.so.0); python:3.13-slim ships
# neither, so `import cv2` fails in the image and every PDF parse dies with it.
#
# Installing X11 into a headless server image is the wrong shape. The headless
# wheel is the same OpenCV at the same version with no display libraries, which
# is what a container wants. uv cannot substitute one distribution for another
# in the lock file, so it is done here, after sync, where it is explicit.
#
# Verify with:  docker run --rm --entrypoint /app/.venv/bin/python <img> -c "import cv2"
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip uninstall opencv-python && \
    uv pip install opencv-python-headless==5.0.0.93

# Final light runtime image
FROM python:3.13-slim

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/app /app/app

# Place venv in PATH
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Docling's layout model reaches torch.compile, whose inductor backend shells out
# to a C++ compiler at run time. This image has none -- python:3.13-slim ships no
# toolchain -- so every parse died with:
#
#     InvalidCxxCompiler: No working C++ compiler found in
#     torch._inductor.config.cpp.cxx: (None, 'g++')
#
# Measured 10 Sep 2026. The container had never parsed a PDF successfully: the
# cv2 fix above cleared the previous wall and nothing walked into this one,
# because no test opens a PDF inside the image and the 31 Aug end-to-end run was
# on a developer laptop, which has g++.
#
# Two ways out. Installing g++ adds ~200 MB to a slim image, puts a compiler in
# the runtime, and then pays JIT compilation on 2 ARM cores at first use. This
# does none of that: eager mode, 516 chars parsed in 57.9 s against a failure
# before.
#
# It has to be an environment variable and it has to be set before torch is
# imported. `torch._dynamo.config.disable = True` after the import does NOT work
# -- verified the same day, it still raised InvalidCxxCompiler.
ENV TORCHDYNAMO_DISABLE=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
