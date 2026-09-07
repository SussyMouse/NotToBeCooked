"""Every case here is a way an answer can look right and be wrong."""

from uuid import uuid4

from app.schemas.rag import Citation, RetrievedChunk
from app.services.grounding import check_grounding, extract_markers

COURSE_ID = uuid4()

# The line break in the first chunk is load-bearing: it is what a quote spanning
# a PDF's wrap looks like, and it is the reason _normalise exists.
C1 = RetrievedChunk(
    chunk_id=uuid4(), file_id=uuid4(), course_id=COURSE_ID, filename="A.pdf",
    page_start=1, page_end=1, heading=None, score=0.9,
    content="Photosynthesis converts light energy\ninto chemical energy stored in glucose.",
)
C2 = RetrievedChunk(
    chunk_id=uuid4(), file_id=uuid4(), course_id=COURSE_ID, filename="B.pdf",
    page_start=2, page_end=2, heading=None, score=0.8,
    content="The Calvin cycle fixes carbon dioxide into glucose.",
)
C3 = RetrievedChunk(
    chunk_id=uuid4(), file_id=uuid4(), course_id=COURSE_ID, filename="C.pdf",
    page_start=3, page_end=3, heading=None, score=0.7,
    content="Chlorophyll absorbs light most strongly in the blue and red bands.",
)
SELECTED = [C1, C2, C3]


def cite(marker: int, source: RetrievedChunk, quote: str) -> Citation:
    return Citation(
        marker=marker, file_id=source.file_id, course_id=source.course_id,
        filename=source.filename, page=source.page_start, quote=quote,
    )


def test_extract_markers_ignores_markdown_links():
    answer = "See [1] and [2], but not [this link](https://example.test) or [x]."
    assert extract_markers(answer) == {1, 2}


def test_a_consistent_answer_passes():
    report = check_grounding(
        answer="Plants turn light into chemical energy [1]. Carbon is fixed later [2].",
        citations=[
            cite(1, C1, "Photosynthesis converts light energy"),
            cite(2, C2, "fixes carbon dioxide into glucose"),
        ],
        selected=SELECTED,
    )
    assert report.ok, report.problems


def test_marker_in_the_answer_with_no_citation_behind_it_fails():
    """The pill the reader clicks resolves to nothing."""
    report = check_grounding(
        answer="Light is captured [1], carbon is fixed [2], and pigments matter [3].",
        citations=[
            cite(1, C1, "Photosynthesis converts light energy"),
            cite(2, C2, "fixes carbon dioxide into glucose"),
        ],
        selected=SELECTED,
    )
    assert not report.ok
    assert any("[3]" in p for p in report.problems)


def test_citation_never_referred_to_in_the_answer_fails():
    """A source the reader is told was used, and cannot locate."""
    report = check_grounding(
        answer="Plants turn light into chemical energy [1].",
        citations=[
            cite(1, C1, "Photosynthesis converts light energy"),
            cite(2, C2, "fixes carbon dioxide into glucose"),
        ],
        selected=SELECTED,
    )
    assert not report.ok
    assert any("[2]" in p for p in report.problems)


def test_marker_outside_the_supplied_sources_fails():
    report = check_grounding(
        answer="Pigments absorb light [4].",
        citations=[cite(4, C3, "Chlorophyll absorbs light")],
        selected=SELECTED,
    )
    assert not report.ok
    assert any("outside" in p for p in report.problems)


def test_one_changed_word_fails():
    """power, not energy. Nothing else differs."""
    report = check_grounding(
        answer="Plants turn light into chemical energy [1].",
        citations=[cite(1, C1, "Photosynthesis converts light power")],
        selected=SELECTED,
    )
    assert not report.ok


def test_a_real_quote_under_the_wrong_marker_fails():
    """The sharp one.

    This sentence exists, word for word, in C2. It is cited as [1]. An
    implementation that asks "is this quote in any source" passes every other
    test in this file and sends the reader to the wrong document here.
    """
    report = check_grounding(
        answer="Plants turn light into chemical energy [1].",
        citations=[cite(1, C1, "fixes carbon dioxide into glucose")],
        selected=SELECTED,
    )
    assert not report.ok
    assert any("does not appear in the source it points at" in p for p in report.problems)


def test_a_quote_spanning_a_line_break_in_the_source_passes():
    """Where the PDF wrapped is not evidence about the model."""
    report = check_grounding(
        answer="Plants turn light into chemical energy [1].",
        citations=[cite(1, C1, "converts light energy into chemical energy")],
        selected=SELECTED,
    )
    assert report.ok, report.problems


def test_one_source_may_carry_two_different_quotes():
    """`marker` names a source, not a citation slot.

    Measured 6 Sep 2026 against Gemini: asked for one-sentence quotes, it
    returned two, both under [1], one per claim. That is correct citation
    behaviour and the check must not reject it.
    """
    report = check_grounding(
        answer="Light becomes chemical energy [1], and it is stored in glucose [1].",
        citations=[
            cite(1, C1, "Photosynthesis converts light energy"),
            cite(1, C1, "chemical energy stored in glucose"),
        ],
        selected=SELECTED,
    )
    assert report.ok, report.problems


def test_the_same_quote_listed_twice_fails():
    """A repeat carries no second piece of evidence."""
    report = check_grounding(
        answer="Light becomes chemical energy [1], and that is the point [1].",
        citations=[
            cite(1, C1, "Photosynthesis converts light energy"),
            cite(1, C1, "Photosynthesis  converts   light energy"),
        ],
        selected=SELECTED,
    )
    assert not report.ok
    assert any("repeats a quote" in p for p in report.problems)


def test_a_refusal_is_not_a_grounding_failure():
    """No markers, no citations. prompt.py asks for exactly this when the
    sources do not cover the question, and it must not read as a defect."""
    report = check_grounding(
        answer="The supplied material does not cover this question.",
        citations=[],
        selected=SELECTED,
    )
    assert report.ok, report.problems
