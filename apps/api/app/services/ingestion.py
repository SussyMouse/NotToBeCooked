from docling.document_converter import DocumentConverter



def main() -> None:
    source=("https://arxiv.org/pdf/2408.09869")
    converter=DocumentConverter()
    result=converter.convert(source)
    document=result.document
    print(document.export_to_markdown())

if __name__ == "__main__":
    main()  