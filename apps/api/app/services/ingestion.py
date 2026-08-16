from uuid import uuid4

from docling.document_converter import DocumentConverter

from app.services.embeddings import count_token, get_tokenizer


def ingest_document(file_path):
    converter = DocumentConverter()
    result = converter.convert(file_path)
    document = result.document
    return document


def extract_text(document):
    current_heading = None
    extracted_items = []

    for document_item in document.texts:
        if document_item.label.value == "section_header":
            current_heading = document_item.text

        elif document_item.label.value == "text":
            if not document_item.prov:
                continue

            pages = []
            for provenance in document_item.prov:
                pages.append(provenance.page_no)

            page_number = min(pages)
            page_end = max(pages)

            item = {
                "heading": current_heading,
                "page_number": page_number,
                "page_end": page_end,
                "content": document_item.text,
            }

            extracted_items.append(item)
    return extracted_items


def split_long_text(text, max_token=500):
    token_count = count_token(text)

    if token_count <= max_token:
        return [text]


def create_chunk(extracted_items, file_id, max_word=350):

    chunks = []
    heading = None  # 是旧箱子的 Introduction
    page = []
    content = []
    word_count = 0

    for item in extracted_items:
        current_heading = item["heading"]  # 是刚读到的 Methods
        current_content = item["content"]
        words = len(current_content.split())

        if (content and words + word_count > max_word) or (content and current_heading != heading):
            join_content = " ".join(content)

            chunk = {
                "chunk_index": len(chunks),
                "heading": heading,
                "page_number": min(page),
                "page_end": max(page),
                "content": join_content,
                "word_count": word_count,
                "file_id": file_id,
                "token_count": count_token(join_content),
            }

            heading = None
            page = []
            content = []
            word_count = 0

            chunks.append(chunk)

        if not content:
            heading = current_heading

        content.append(current_content)
        page.append(item["page_number"])
        page.append(item["page_end"])
        word_count += words

    if content:
        join_content = " ".join(content)

        chunk = {
            "chunk_index": len(chunks),
            "heading": heading,
            "page_number": min(page),
            "page_end": max(page),
            "content": join_content,
            "word_count": word_count,
            "file_id": file_id,
            "token_count": count_token(join_content),
        }

        chunks.append(chunk)

    return chunks


def main() -> None:
    file_path = "https://arxiv.org/pdf/2408.09869"
    document = ingest_document(file_path)
    extracted_texts = extract_text(document)
    print("Number of extracted items:", len(extracted_texts))
    print("First extracted item:", extracted_texts[0])

    first_content = extracted_texts[0]["content"]
    words = first_content.split()
    print("Words", words)
    print("Words count", len(words))

    chunk_parts = []
    for item in extracted_texts[:3]:
        chunk_parts.append(item["content"])

    chunk_content = " ".join(chunk_parts)

    print("Combine content: ", chunk_content)
    print("Combined word count: ", len(chunk_content.split()))

    file_id = uuid4()
    chunks = create_chunk(extracted_texts, file_id, max_word=350)
    print("Number of Chunks:", len(chunks))
    print("First chunk:", chunks[0])
    print("Second chunk:", chunks[1])

    text = "I love Python"
    tokenizer = get_tokenizer()
    encoded = tokenizer(text, add_special_tokens=False, return_offsets_mapping=True)
    print(encoded["input_ids"])
    print(encoded["offset_mapping"])

    for start, end in encoded["offset_mapping"]:
        print(text[start:end])

    max_tokens = 2
    offsets = encoded["offset_mapping"]

    last_allocated_offset = offsets[max_tokens - 1]
    cut_position = last_allocated_offset[1]
    first_part = text[:cut_position]
    second_part = text[cut_position:]

    print("First part:", first_part)
    print("Second part: ", second_part)


if __name__ == "__main__":
    main()


# $env:DOCLING_INFERENCE_COMPILE_TORCH_MODELS="false"
# uv run --directory apps/api python -m app.services.ingestion
"""
encoded             → 你的变量名，可以更换
"input_ids"         → Hugging Face 规定的 key= 代表每个 token 在 tokenizer 字典里的编号。
"attention_mask"    → Hugging Face 规定的 key=告诉模型哪些位置是真实内容，哪些位置只是为了对齐而补上的空位
"offset_mapping"    → Hugging Face 规定的 key=代表每个 token 对应原文的字符范围
里面的数字和位置     → tokenizer 根据输入动态生成

input_ids       → token 是谁
attention_mask  → token 要不要看
offset_mapping  → token 在原文哪里
"""
