#!/usr/bin/env python3
"""Print a folder_id you can POST /files into, on YOUR machine.

There is no endpoint that creates a COURSE or a FOLDER yet (agenda 2026-09-01,
report 8), and POST /files needs a folder_id whose course belongs to the caller.
So this makes one directly, for one account, and prints the id.

    uv run python scripts/seed_folder.py you@example.com

Register that email through POST /auth/register first -- this does not create
accounts, it only attaches a course and a folder to one that exists.

Temporary. Delete this file the day POST /courses and POST /courses/{id}/folders
exist; a script that hands out ids the API refuses to hand out is a workaround,
not a feature, and workarounds outlive their reason when nothing says otherwise.
"""

import asyncio
import sys
from datetime import UTC, datetime

from sqlmodel import col, select

from app.db.database import async_session_maker
from app.schemas.course import Course, CourseStatus
from app.schemas.folder import Folder
from app.schemas.user import User


async def main(email: str) -> int:
    async with async_session_maker() as session:
        user = (await session.exec(select(User).where(col(User.email) == email))).first()
        if user is None:
            print(f"no account for {email} -- register it through POST /auth/register first")
            return 1
        # Primary keys are declared `UUID | None` on the models, so each id is
        # pinned to a local rather than narrowed at every use.
        user_id = user.id
        assert user_id is not None

        course = Course(
            user_id=user_id,
            code="SANDBOX",
            name="Upload sandbox",
            year=2026,
            sem=2,
            status=CourseStatus.ACTIVE,
            created_at=datetime.now(UTC),
        )
        session.add(course)
        await session.flush()
        course_id = course.id
        assert course_id is not None

        folder = Folder(course_id=course_id, name="Lectures", is_root=True, sort_order=0)
        session.add(folder)
        await session.commit()
        await session.refresh(folder)

        print()
        print(f"  account    {email}")
        print(f"  course_id  {course_id}")
        print(f"  folder_id  {folder.id}     <- this is the one POST /files wants")
        print()
        print("  curl -H \"Authorization: Bearer $TOKEN\" \\")
        print(f"       -F folder_id={folder.id} \\")
        print("       -F upload=@some.pdf http://localhost:8000/files")
        print()
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        raise SystemExit(2)
    raise SystemExit(asyncio.run(main(sys.argv[1])))
