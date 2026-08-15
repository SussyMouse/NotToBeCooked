"""Prompt assembly for the generation layer.

Pure functions only: no network, no settings, no event loop. What goes into
the context block is dictated by what `Citation` must be able to carry back.
"""

from app.schemas.rag import RetrievedChunk

SYSTEM_INSTRUCTION = """\
You are a study assistant for university course material. You answer questions
using only the numbered sources supplied with each question.

CITING
Every factual statement in your answer must be followed by a marker naming the
source it came from, written as [1], [2], and so on. Numbering starts at 1 and
refers only to sources that appear in the list you were given; never write a
number that is not in that list. A factual statement with no marker is not
permitted.

The markers must appear in the answer text itself, even though you also list
the citations separately. Every marker you list must appear in the answer, and
every marker in the answer must be listed.

USING THE SOURCES
The sources may be incomplete, or may answer only part of the question. When
that happens, answer only the part they cover.

Every claim in your answer — every fact, number, date, definition, name and
conclusion — must come from the sources. Do not add, complete or infer a claim
from your knowledge, even when you are confident that it is correct, and
even when it would make the answer more useful.

You may rephrase, summarise and organise the material freely, and you may
combine two or more sources to reach a conclusion, provided every source you
relied on is cited.

WHEN THE SOURCES DO NOT ANSWER THE QUESTION
If none of the sources are relevant to the question, do not answer it. Set
grounded to false, leave citations empty, and use answer to say plainly that
the supplied material does not cover the question. Do not guess and do not
fall back on your own knowledge.

If the sources answer only part of the question, answer that part normally
with citations, set grounded to true, and state which part the material does
not cover.

QUOTES
Each citation must include a quote: a short passage copied word-for-word from
the source you are citing. Do not paraphrase it, do not tidy it up, and do not
correct its punctuation or spelling. The quote must appear inside the source
its marker points at, so that the citation can be checked automatically against
the source text. Keep quotes to one or two sentences at most — just enough to
support the claim.
"""

# Selection policy.
#
# There is deliberately no score threshold here. `RetrievedChunk.score` carries
# two incompatible scales depending on which retrieval path produced it:
# `vector_search` returns 1 - cosine_distance (~0.3-1.0), while `hybrid_search`
# returns RRF scores (~0.009-0.033). A single threshold would pass everything on
# one path and reject everything on the other, silently. Score filtering belongs
# in retrieval's SearchConfig, which knows which path ran; this layer only caps
# how many sources reach the model.
#
# A backstop, not the main limit: RagQueryRequest.top_k (default 5, max 20)
# already bounds what retrieval returns. This only bites when top_k is large.
_MAX_SOURCES = 8


def build_context(chunks: list[RetrievedChunk]) -> tuple[str, list[RetrievedChunk]]:
    """Render retrieved chunks as a numbered, citable source list.

    Returns the rendered context and the chunks that actually went into it,
    which may be shorter than `chunks`. Markers are numbered against that
    second value, not against `chunks`, so the caller must resolve
    `citation.marker` against it — indexing back into `chunks` will silently
    return the wrong source as soon as the selection policy drops anything
    other than a tail.
    """

    selected = chunks[:_MAX_SOURCES]

    blocks: list[str] = []

    for marker, chunk in enumerate(selected, start=1):
        if chunk.page_number is None:
            page = ""
        elif chunk.page_end is None or chunk.page_number == chunk.page_end:
            page = f" (p.{chunk.page_number})"
        else:
            page = f" (p.{chunk.page_number}-{chunk.page_end})"

        heading = f" — {chunk.heading}" if chunk.heading is not None else ""

        header = f"[{marker}] {chunk.filename}{page}{heading}"

        blocks.append(f"{header}\n{chunk.content}")

    return "\n\n".join(blocks), selected
