from docling.document_converter import DocumentConverter





def ingest_document(file_path):
   converter=DocumentConverter()
   result=converter.convert(file_path)
   document=result.document
   return document

def extract_text(document):
    current_heading=None
    extracted_items=[]
    

    for document_item in document.texts:
        if document_item.label.value=="section_header":
            current_heading=document_item.text

        elif document_item.label.value=="text":
            if not document_item.prov:
                continue
            
            pages=[]
            for provenance in document_item.prov:
                pages.append(provenance.page_no)

            page_number=min(pages)
            page_end=max(pages)

            item={
                "heading":current_heading,
                "page_number":page_number,
                "page_end":page_end,
                "content":document_item.text
            }
            
            extracted_items.append(item)
    return extracted_items
            

        





def main()->None:
    file_path="https://arxiv.org/pdf/2408.09869"
    document=ingest_document(file_path)
    extracted_texts=extract_text(document)
    print("Number of extracted items:", len(extracted_texts))
    print("First extracted item:", extracted_texts[0])

    first_content=extracted_texts[0]["content"]
    words=first_content.split()
    print("Words",words)
    print("Words count",len(words))

    chunk_parts=[]
    for item in extracted_texts[:3]:
        chunk_parts.append(item["content"])

    chunk_content=" ".join(chunk_parts)

    print("Combine content: ",chunk_content)
    print("Combined word count: ",len(chunk_content.split()))

   
    chunks=[]
    current_parts=[]
    current_word_count=0
    max_word=350

    for item in extracted_texts:
        content=item["content"]
        words=content.split()
        item_word_count=len(words)

        if current_parts and current_word_count+item_word_count>max_word:
            chunk_content=" ".join(current_parts)
            chunks.append(chunk_content)

            current_parts=[]
            current_word_count=0

        current_parts.append(content)
        current_word_count=current_word_count+item_word_count


    if current_parts:
        chunk_content=" ".join(current_parts)
        chunks.append(chunk_content)
        print("Number of chunks:", len(chunks))
        print("First chunk word count:", len(chunks[0].split()))
        print("First chunk:", chunks[0])

if __name__=="__main__":
    main()



#uv run --directory apps/api python -m app.services.ingestion
