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

## Merging `bao-sheng`: squash, do not merge

Agreed with Bao Sheng on 16 Aug 2026. Applies to the merge scheduled after the
C2 seam lands, ~22 Aug.

`ff5600f` and `f801754` added two 8K renders of a superseded 13-entity draft:
7.4 MB on disk, against 1.5 MB for the packed history of everything else in this
repository. `4b320e2` deleted them from the working tree, but the blobs remain in
the branch's history, and a normal merge would make those commits ancestors of
`dev` and then `main` — every clone from then on carries the 7.4 MB.

```bash
git switch dev
git pull --ff-only origin dev
git merge --squash bao-sheng
git commit --author="CH'NG BAO SHENG <chngbaosheng@gmail.com>"   # list the squashed subjects in the body
```

Then delete the remote branch, and start the next branch from `dev`.

Three things about that sequence are load-bearing:

**`--author` is not cosmetic.** A squash commit is authored by whoever runs the
merge, so without the flag ten commits collapse into one credited to the wrong
person. On a graded group project the log is evidence.

**Do not keep committing on `bao-sheng` afterwards.** Git does not know the squash
commit contains those ten commits, so the next merge replays them and conflicts
against work `dev` has done since.

**Re-verify on the day.** The zero-conflict dry run on 16 Aug was against `dev` at
`a52840c`. Re-sync `dev`, re-read the final diff, run `pnpm verify` before
squashing.

Squash was chosen over rewriting the branch with `filter-branch`. The rewrite also
works, but it costs Bao Sheng a `git reset --hard` on a branch he is actively
working on — the operation most likely to lose uncommitted work — for 7.4 MB.

The general rule this came from: **multi-megabyte binaries do not belong in git.**
The ERD of record renders to 295 KB.

## Changing the schema

The ERD was ratified by the whole team, so amending it takes a change request,
not a commit. A contract owner may define fields inside their own contract
unilaterally; adding or removing a column here is a different act.

When revising, **diff the new version against the ratified one field-by-field.**
Rewriting from meeting minutes instead dropped eight ratified fields on 15 Aug
2026 — including `MILESTONE.status` and `MILESTONE.file_ids`, which US-16 and
US-17 are built on, so F4 would have become unbuildable and nobody would have
noticed until late September. See Part C of `KNOWN_ISSUES.md`.
