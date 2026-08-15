# ERD — source of record

`erd.mmd` is the schema of record for NotToBeCooked. If this file and any other
document disagree, this file wins.

| File | What it is |
|---|---|
| `erd.mmd` | The diagram. Mermaid ER syntax. **Edit this, never the PNG.** |
| `erd.png` | Rendered from `erd.mmd`. Regenerate after every edit — see below. |
| `KNOWN_ISSUES.md` | Findings that are real and not yet fixed, with the reason and the schedule. Read it before assuming a gap is an oversight. |

Ratified 27 Jul 2026. Amended 4 Aug (CR-23) and 15 Aug 2026 (CR-24 → CR-27).
Handed in 16 Aug 2026 as `NotToBeCooked_ERD_2026-08-16.mmd` / `.png`.

## Filenames are deliberately undated

An earlier `docs/erd/` held both `not-to-be-cooked-erd.png` and
`not-to-be-cooked-final-erd.png`, and nothing in either said which one was
current. Git already records every version and when it changed, so the files
here keep stable names and the history lives in the log:

```bash
git log --follow -p docs/erd/erd.mmd
```

Date-stamped copies exist for hand-ins. They are snapshots, not the record.

## Regenerating the PNG

```bash
npm i @mermaid-js/mermaid-cli
npx mmdc -i docs/erd/erd.mmd -o docs/erd/erd.png -c cfg.json -p pp.json -b white -s 3
```

`cfg.json`:

```json
{ "theme": "neutral", "er": { "layoutDirection": "TB", "entityPadding": 14, "fontSize": 12 } }
```

`pp.json` (only needed where Chrome's sandbox is unavailable):

```json
{ "args": ["--no-sandbox", "--disable-setuid-sandbox"] }
```

Current output is 2352 × 2691, ~295 KB. If a render comes out several megabytes,
`-s 3` has been raised — three is enough to read every annotation at 100%.

## Three traps, all hit for real

**A bare `%%` line crashes the ER parser.** A comment marker with nothing after
it. The error is `Parse error on line 1: Expecting 'ER_DIAGRAM', got '%'` and it
blames line 1 no matter where the bare line actually sits, which is what makes it
expensive to find. Every comment line needs content after the marker — `%% ---`
is fine, `%%` alone is not.

**Entity declaration order controls edge routing.** dagre ranks nodes in
declaration order, so reordering the blocks reintroduces edge crossings that were
removed by hand. The current order produces zero crossings. Check the render
after any reorder.

**A self-referencing relationship renders as a long dangling tail.**
`FOLDER ||--o{ FOLDER` routes as a spike down the page that shoves the
`FOLDER → FILE` edge across `CONVERSATION`. `parent_folder_id` is therefore
documented as a column with no edge drawn. The column carries the meaning.

## Changing the schema

The ERD was ratified by the whole team, so amending it takes a change request,
not a commit. A contract owner may define fields inside their own contract
unilaterally; adding or removing a column here is a different act.

When revising, **diff the new version against the ratified one field-by-field.**
Rewriting from meeting minutes instead dropped eight ratified fields on 15 Aug
2026 — including `MILESTONE.status` and `MILESTONE.file_ids`, which US-16 and
US-17 are built on, so F4 would have become unbuildable and nobody would have
noticed until late September. See Part C of `KNOWN_ISSUES.md`.
