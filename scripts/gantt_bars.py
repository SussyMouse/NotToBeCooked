#!/usr/bin/env python3
"""Regenerate the Gantt bars and the Overview counts in the project spreadsheet.

The bars are DERIVED, never hand-drawn. Every coloured cell in the timeline grid
comes from the Start and End columns of its own row, so the only way to move a
bar is to change a date. Hand-editing a cell works until the next run of this
script, which then silently overwrites it -- which is exactly the failure mode
that made this a script instead of a habit.

Discovered 2026-08-15: the sheet had 1416 timeline cells all sharing one style
and not a single fill. Nobody had noticed the "Gantt chart" had no bars, because
the task table above it was doing all the work.

Usage:
    python3 scripts/gantt_bars.py "NotToBeCooked Gantt Chart - v1.7 (15 Aug).xlsx"
    python3 scripts/gantt_bars.py <file.xlsx> --today 2026-09-01   # what-if

Reads and writes in place. Take a copy first if that matters.

Sheet contract this depends on (it will refuse to run if any of it is untrue):
    row 5           header; columns I onward are week-start dates like "22 Aug"
    row 6 onward    one task per row until the first row with no Start
    column B        owner        column D  priority, "CUT" marks a dropped row
    column E / F    Start / End, formatted "22 Aug"      column H  done, 1/0 or TRUE/FALSE
"""

import argparse
import datetime as dt
import sys
from collections import Counter
from pathlib import Path

try:
    import openpyxl
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter
except ImportError:
    sys.exit("openpyxl is not installed:  pip install openpyxl")

YEAR = 2026
FIRST_WEEK_COL = 9          # column I
FIRST_TASK_ROW = 6
LEGEND_ROW = 4

MONTHS = {m: i for i, m in enumerate(
    "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), 1)}

# Bar colour carries STATUS, not priority. Priority already has its own column,
# so spending the timeline on it too would say the same thing twice; status is
# the thing you cannot read anywhere else on the sheet.
COLOR = {
    "done":     "FF8FCFA6",
    "overdue":  "FFE8918A",
    "active":   "FFF2C14E",
    "upcoming": "FFA8BEDC",
    "cut":      "FFD8D8D4",
}
CURRENT_WEEK_TINT = "FFF7F3E8"
CURRENT_WEEK_HEADER = "FF3F5A73"
# Every other week header. The current-week header has to be reset back to this,
# not merely overwritten on the new column -- see the comment in main().
WEEK_HEADER = "FF196B7A"

OVERVIEW_PRIORITY_ROWS = {"MUST": 5, "SHOULD": 6, "COULD": 7, "CUT": 8}
OVERVIEW_OWNER_ROWS = {"AI-1": 11, "AI-2": 12, "AI-3": 13}
OVERVIEW_SHARED_ROW = 16
# Bumped by one on 19 Aug 2026 when the Resume Cut milestone was inserted at
# Overview row 22. These are positions in a hand-laid-out sheet, so inserting a
# row above them moves them -- there is nothing here to detect that.
OVERVIEW_COMPLETED_ROW = 31
OVERVIEW_REMAINING_ROW = 32
OVERVIEW_PERCENT_ROW = 33


def parse_day(value: str) -> dt.date:
    """'22 Aug' -> date(2026, 8, 22)."""
    day, month = str(value).strip().split()
    return dt.date(YEAR, MONTHS[month], int(day))


def status_of(priority, done, start: dt.date, end: dt.date, today: dt.date) -> str:
    if priority == "CUT":
        return "cut"
    # `is True` until 9 Sep 2026, which stopped being right the moment v1.11 changed
    # the Done column from TRUE/FALSE to 1/0 for the checkbox display. `1 is True` is
    # False, so every completed row was painted overdue and progress read 0 / 65.
    # Membership rather than truthiness: a stray non-empty string must not count.
    if done in (True, 1):
        return "done"
    if end < today:
        return "overdue"
    if start <= today <= end:
        return "active"
    return "upcoming"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("workbook", type=Path)
    ap.add_argument("--today", help="YYYY-MM-DD, defaults to the real date")
    args = ap.parse_args()

    today = (dt.date.fromisoformat(args.today) if args.today else dt.date.today())
    wb = openpyxl.load_workbook(args.workbook)
    ws = wb["Gantt"]

    weeks = []
    for col in range(FIRST_WEEK_COL, ws.max_column + 1):
        header = ws.cell(5, col).value
        if not header:
            break
        weeks.append((col, parse_day(header)))
    if not weeks:
        sys.exit("no week headers found on row 5 from column I onward")

    # The task block ends at the first row with no Start date. Trusting max_row
    # instead would paint 900 empty rows, which is how the conditional-format
    # range got anchored to H1007 the first time this was done by hand.
    last_row = FIRST_TASK_ROW - 1
    for row in range(FIRST_TASK_ROW, ws.max_row + 1):
        if ws.cell(row, 5).value and ws.cell(row, 6).value:
            last_row = row
        elif not any(ws.cell(row, c).value for c in range(1, 9)):
            break

    current_col = max(c for c, wk in weeks if wk <= today)
    blank = PatternFill(fill_type=None)
    tally = Counter()

    for row in range(FIRST_TASK_ROW, last_row + 1):
        start_v, end_v = ws.cell(row, 5).value, ws.cell(row, 6).value
        for col, _ in weeks:
            ws.cell(row, col).fill = blank
        if not start_v or not end_v:
            continue
        start, end = parse_day(start_v), parse_day(end_v)
        st = status_of(ws.cell(row, 4).value, ws.cell(row, 8).value, start, end, today)
        tally[st] += 1
        for col, week_start in weeks:
            if start <= week_start + dt.timedelta(days=6) and end >= week_start:
                ws.cell(row, col).fill = PatternFill("solid", fgColor=COLOR[st])
            elif col == current_col:
                ws.cell(row, col).fill = PatternFill("solid", fgColor=CURRENT_WEEK_TINT)

    # Reset every week header before painting this week's. Only setting the
    # current column leaves last week's dark header in place, so the sheet grows
    # one extra "current week" every run -- found on 19 Aug with 12 Aug and
    # 19 Aug both dark. A generator that is not idempotent is not a generator.
    for col, _ in weeks:
        cell = ws.cell(5, col)
        cell.fill = PatternFill("solid", fgColor=WEEK_HEADER)
        cell.font = Font(bold=True, color="FFFFFFFF", size=8)
    header = ws.cell(5, current_col)
    header.fill = PatternFill("solid", fgColor=CURRENT_WEEK_HEADER)
    header.font = Font(bold=True, color="FFFFFFFF", size=10)

    ws.cell(LEGEND_ROW, 8).value = "Bars:"
    ws.cell(LEGEND_ROW, 8).font = Font(bold=True, size=9)
    ws.cell(LEGEND_ROW, 8).alignment = Alignment(horizontal="right")
    for offset, (key, label) in enumerate([
            ("done", "Done"), ("overdue", "Overdue"), ("active", "Active"),
            ("upcoming", "Upcoming"), ("cut", "Cut")]):
        cell = ws.cell(LEGEND_ROW, FIRST_WEEK_COL + offset)
        cell.value = label
        cell.fill = PatternFill("solid", fgColor=COLOR[key])
        cell.font = Font(size=9)
        cell.alignment = Alignment(horizontal="center")
    ws.cell(LEGEND_ROW, FIRST_WEEK_COL + 5).value = (
        "Current week = shaded column + dark header. Bars are generated from Start/End "
        "by scripts/gantt_bars.py — do not hand-edit.")
    ws.cell(LEGEND_ROW, FIRST_WEEK_COL + 5).font = Font(size=9, italic=True, color="FF7C8792")

    priority, owner, done_count = Counter(), Counter(), 0
    for row in range(FIRST_TASK_ROW, last_row + 1):
        p = ws.cell(row, 4).value
        priority[p] += 1
        if p == "CUT":
            continue
        owner[ws.cell(row, 2).value] += 1
        if ws.cell(row, 8).value in (True, 1):
            done_count += 1
    live = sum(v for k, v in priority.items() if k != "CUT")

    if "Overview" in wb.sheetnames:
        ov = wb["Overview"]
        for key, row in OVERVIEW_PRIORITY_ROWS.items():
            ov.cell(row, 2).value = priority[key]
        for name, row in OVERVIEW_OWNER_ROWS.items():
            ov.cell(row, 2).value = owner.get(name, 0)
        ov.cell(OVERVIEW_SHARED_ROW, 2).value = sum(
            v for k, v in owner.items() if k not in OVERVIEW_OWNER_ROWS)
        ov.cell(OVERVIEW_COMPLETED_ROW, 2).value = done_count
        ov.cell(OVERVIEW_REMAINING_ROW, 2).value = live - done_count
        ov.cell(OVERVIEW_PERCENT_ROW, 2).value = f"{round(done_count / live * 100)}%"

    wb.save(args.workbook)

    print(f"{args.workbook.name}")
    print(f"  rows {FIRST_TASK_ROW}..{last_row}   "
          f"current week = {get_column_letter(current_col)} "
          f"({ws.cell(5, current_col).value})   today = {today}")
    print(f"  bars      {dict(tally)}")
    print(f"  priority  {dict(priority)}")
    print(f"  owners    {dict(owner)}")
    print(f"  progress  {done_count} / {live} = {round(done_count / live * 100)}%")
    if tally["overdue"]:
        print(f"\n  {tally['overdue']} overdue:")
        for row in range(FIRST_TASK_ROW, last_row + 1):
            s, e = ws.cell(row, 5).value, ws.cell(row, 6).value
            if not s or not e or ws.cell(row, 4).value == "CUT":
                continue
            if ws.cell(row, 8).value not in (True, 1) and parse_day(e) < today:
                print(f"    row {row:>3}  {str(ws.cell(row, 2).value):<20} "
                      f"{(today - parse_day(e)).days:>3}d  {str(ws.cell(row, 3).value)[:56]}")


if __name__ == "__main__":
    main()
