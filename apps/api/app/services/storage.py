"""Where uploaded bytes live.

One module with two functions, because the storage backend is expected to
change. `FILE.storage_key` is documented as an object-store key rather than a
filesystem path, so the database never learns that today it happens to be a
local directory. Moving to S3 or OCI Object Storage should touch this file and
nothing else.

The key layout is `{user_id}/{file_id}{suffix}`. Two properties matter:

  * It is unique by construction, which is what `FILE.storage_key`'s UNIQUE
    constraint wants. A UUID collision is the only way to break it.
  * It is prefixed by owner, so a per-user listing or a per-user delete is one
    prefix scan in any object store, and one directory here.

The original filename is deliberately NOT part of the key. It is renameable
(Lead call, 3 Aug: filename wins in the UI), and a key that moves when a user
renames a file is a key that stops resolving.
"""

import hashlib
from pathlib import Path
from uuid import UUID

from fastapi import UploadFile

from app.core.config import settings

_CHUNK = 1024 * 1024


class UploadTooLargeError(Exception):
    """Raised once the stream passes MAX_UPLOAD_BYTES. The partial file is removed."""


def build_storage_key(user_id: UUID, file_id: UUID, filename: str) -> str:
    suffix = Path(filename).suffix.lower()[:16]
    return f"{user_id}/{file_id}{suffix}"


def resolve(storage_key: str) -> Path:
    """The local path a key currently maps to. The only place that assumption lives."""
    return settings.STORAGE_DIR / storage_key


async def write_upload(upload: UploadFile, storage_key: str) -> tuple[int, str]:
    """Stream an upload to storage. Returns (size_bytes, sha256 hex).

    Streamed rather than `await upload.read()` for two reasons: a large file
    never sits in memory whole, and the size limit can be enforced part-way
    instead of after the damage is done. The checksum is computed on the way
    past, so the file is read once rather than twice.
    """
    destination = resolve(storage_key)
    destination.parent.mkdir(parents=True, exist_ok=True)

    digest = hashlib.sha256()
    size = 0
    try:
        with destination.open("wb") as out:
            while chunk := await upload.read(_CHUNK):
                size += len(chunk)
                if size > settings.MAX_UPLOAD_BYTES:
                    raise UploadTooLargeError(
                        f"Upload exceeds {settings.MAX_UPLOAD_BYTES} bytes"
                    )
                digest.update(chunk)
                out.write(chunk)
    except BaseException:
        # A half-written object with no FILE row pointing at it is invisible
        # rubbish -- nothing will ever look for it again.
        destination.unlink(missing_ok=True)
        raise

    return size, digest.hexdigest()


def delete(storage_key: str) -> None:
    resolve(storage_key).unlink(missing_ok=True)
