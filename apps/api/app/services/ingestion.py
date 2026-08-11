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
    current_pages=[]
    current_parts=[]
    current_chunk_heading=None
    current_word_count=0
    max_word=350

    for item in extracted_texts:
        content=item["content"]
        item_heading=item["heading"]

        words=content.split()
        item_word_count=len(words)

        too_large=(
             current_parts and current_word_count+item_word_count>max_word
        )
        
        title_change=(
            current_parts and item_heading!=current_chunk_heading
        )

        if too_large or title_change:
            chunk_content=" ".join(current_parts)
            chunk={
                "chunk_index":len(chunks),
                "heading":current_chunk_heading,
                "page_number":min(current_pages),
                "page_end":max(current_pages),
                "content":chunk_content,
                "word_count":len(chunk_content.split()),
                
            }
            chunks.append(chunk)

            current_parts=[]
            current_pages=[]
            current_word_count=0
            current_chunk_heading=None

        if not current_parts:
            current_chunk_heading=item_heading

        current_parts.append(content)
        current_pages.append(item["page_number"])
        current_pages.append(item["page_end"])
        current_word_count=current_word_count+item_word_count

    if current_parts:
        chunk_content=" ".join(current_parts)
        chunk={
                "chunk_index":len(chunks),
                "heading":current_chunk_heading,
                "page_number":min(current_pages),
                "page_end":max(current_pages),
                "content":chunk_content,
                "word_count":len(chunk_content.split()),
            }
        chunks.append(chunk)
        
    print("Number of Chunks:",len(chunks))
    print("First Chunk Index:",chunks[0]["chunk_index"])
    print("First Chunk heading:",chunks[0]["heading"])
    print("First Chunk Page Number",chunks[0]["page_number"])
    print("First Chunk Page End:",chunks[0]["page_end"])
    print("First Chunk Word Count:",chunks[0]["word_count"])
    print("First Chunk Content:",chunks[0]["content"])
    
       

if __name__=="__main__":
    main()



#uv run --directory apps/api python -m app.services.ingestion
