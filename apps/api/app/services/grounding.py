"""Does the model's answer actually stand on the sources it was given?

Pure functions only: no network, no settings, no database. Everything here is
decidable from three values the caller already holds, which is the point -- this
is the one check in the generation layer that does not have to trust the model.

Three independent failures are being caught, and they are not the same shape:

- **The two lists disagree.** A model returns prose with `[1]`-style markers in
  it and, separately, a list of citations. Nothing makes those agree. A marker
  in the prose with no entry behind it renders as a citation pill that resolves
  to nothing; an entry the prose never refers to is a source the reader is told
  was used and cannot find.
- **A quote is not in the source it points at.** `Citation.quote` is documented
  as "must be findable in the source chunk; this is what makes a citation
  machine-checkable". The check that makes that sentence true lives here. Note
  the direction: a quote must appear in `selected[marker - 1]` specifically, not
  in *some* source. A model that cites the right sentence under the wrong number
  passes the weaker test and still sends the reader to the wrong page.

- **The answer contradicts itself about coverage.** `uncovered` says the sources
  answered the question only in part. That claim can be checked against the
  answer's own other fields, and against nothing else: whether the material
  *really* left something out needs the right answer, which is the one thing
  this system does not have. So the check is consistency, not truth -- the same
  shape as the quote check above, which does not judge whether the answer is
  correct either, only whether the sentence it quotes is really in the source it
  points at.

What is deliberately NOT a failure: an answer with no markers and no citations.
That is a refusal, and `prompt.py` instructs the model to produce exactly that
when the sources do not cover the question. Treating it as a defect would make
every honest refusal look like a broken answer.

A refusal must not carry `uncovered`, though, and that is not an extra rule --
it falls out of the one below. A refusal covers nothing, so the "part that is
not covered" is the whole question, which `REFUSAL` already says in words.
"""

import re
from dataclasses import dataclass, field

from app.schemas.rag import Citation, RetrievedChunk

# Markers are written `[1]`, `[2]`. Bare digits in brackets only -- a markdown
# link `[see here](url)` has a non-digit inside the brackets and does not match.
_MARKER = re.compile(r"\[(\d+)\]")


@dataclass
class GroundingReport:
    """The verdict, plus every reason behind it.

    `problems` is not decoration. When a report comes back not ok the caller
    refuses to send the answer, and these strings are the only record of why --
    they go to the log, because by then the user is getting a refusal that says
    nothing about the model's mistake.
    """

    ok: bool
    problems: list[str] = field(default_factory=list)


def extract_markers(answer: str) -> set[int]:
    """Every `[n]` written in the answer text, as numbers."""
    return {int(m) for m in _MARKER.findall(answer)}


def _normalise(text: str) -> str:
    """Collapse whitespace and case for quote comparison.

    Whitespace has to go: chunk content carries the line breaks of the source
    PDF, and a model copying a sentence out of it writes that sentence on one
    line. Comparing raw would fail every quote that happens to span a line
    break in the original -- a property of where the PDF wrapped, not of whether
    the model was honest.

    Case goes for the same reason and no stronger one: models routinely
    capitalise the first word of a passage they lift mid-sentence. Nothing
    beyond these two is normalised -- a changed word, a dropped negation or a
    corrected figure must still fail, because those are the misquotes worth
    catching.
    """
    return " ".join(text.split()).casefold()


def check_grounding(
    answer: str,
    citations: list[Citation],
    selected: list[RetrievedChunk],
    uncovered: str | None = None,
) -> GroundingReport:
    """Verify an answer against the exact sources that were put in the prompt.

    `selected` must be the list `build_context` returned, not the list retrieval
    produced. Markers are numbered against the former; indexing into the latter
    silently resolves to the wrong source the moment selection drops anything.

    `uncovered` is the model's own claim that the sources answered the question
    only in part. Defaults to None so that every existing caller and every
    existing test keeps meaning what it meant: no claim, nothing to check.
    """
    problems: list[str] = []

    # r47. Two states are legal -- absent, or a sentence naming what is missing.
    # Everything between them is the model claiming a gap it will not describe,
    # which reaches the reader as a `grounded=true` answer that quietly answered
    # less than was asked.
    if uncovered is not None:
        if not uncovered.strip():
            problems.append("the answer declares an uncovered part and then does not name it")
        elif not citations:
            # Not redundant with the marker checks above: those compare two lists
            # that are both empty here, and agree. "Half of it is in the sources"
            # and "none of it came from the sources" cannot both be true.
            problems.append(
                "the answer declares the sources cover part of the question but cites none of them"
            )

    in_answer = extract_markers(answer)
    listed = [c.marker for c in citations]
    listed_set = set(listed)

    for marker in sorted(in_answer - listed_set):
        problems.append(f"answer cites [{marker}] but no citation carries that marker")
    for marker in sorted(listed_set - in_answer):
        problems.append(f"citation [{marker}] is listed but never referred to in the answer")

    # One source can legitimately be cited more than once: two claims drawn from
    # the same chunk each deserve the line that supports them, and `marker`
    # names a source, not a citation slot. Measured 6 September 2026 -- asked for
    # one-sentence quotes, the model returned exactly that, twice, both under
    # [1]. Rejecting it would have been rejecting correct behaviour.
    #
    # What is still wrong is the same source AND the same quote twice, which
    # carries no second piece of evidence.
    seen: set[tuple[int, str]] = set()
    for citation in citations:
        key = (citation.marker, _normalise(citation.quote))
        if key in seen:
            problems.append(f"citation [{citation.marker}] repeats a quote already listed")
        seen.add(key)

    for citation in citations:
        if not 1 <= citation.marker <= len(selected):
            problems.append(
                f"marker [{citation.marker}] is outside the "
                f"1..{len(selected)} sources the model was given"
            )
            continue

        source = selected[citation.marker - 1]
        if _normalise(citation.quote) not in _normalise(source.content):
            problems.append(
                f"the quote on [{citation.marker}] does not appear in the source "
                f"it points at ({source.filename})"
            )

    return GroundingReport(ok=not problems, problems=problems)
