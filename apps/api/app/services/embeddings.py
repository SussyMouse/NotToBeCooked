from sentence_transformers import SentenceTransformer
import torch


_BATCH_SIZE = 32
_EMBEDDINGS_DIM = 1024
_MODEL_TYPE = "jinaai/jina-embeddings-v5-text-small"

_active_model: SentenceTransformer | None = None


def _load_model():
    is_cuda = torch.cuda.is_available()
    device = torch.device("cuda" if is_cuda else "cpu")

    model_kwargs = {}
    config_kwargs = {}

    if is_cuda:
        model_kwargs["dtype"] = torch.bfloat16
        try:
            import flash_attn  # type: ignore # noqa: F401
            config_kwargs["_attn_implementation"] = "flash_attention_2"
        except ImportError:
            pass

    return SentenceTransformer(
        _MODEL_TYPE,
        trust_remote_code=True,
        device=device,
        model_kwargs=model_kwargs,
        config_kwargs=config_kwargs
    )


# global singleton lazy loading model
def _get_model():
    global _active_model
    if _active_model is None:
        _active_model = _load_model()
    return _active_model


# Public functions
def get_embeddings_dim():
    return _EMBEDDINGS_DIM

def embed_query(query: str) -> list[float]:
    """Used to vectorise a user's query"""
    return _get_model().encode(
        [query],
        show_progress_bar=False,
        normalize_embeddings=True,
        task="retrieval",
        prompt_name="query"
    )[0].tolist()

def embed_text(texts: list[str]) -> list[list[float]]:
    """Used to build vector db with batch embeddings"""
    return _get_model().encode(
        texts,
        batch_size=_BATCH_SIZE,
        show_progress_bar=True,
        normalize_embeddings=True,
        task="retrieval",
        prompt_name="document"
    ).tolist()
        

if __name__ == "__main__":
    """Try running this file directly to ensure embeddings work locally"""
    print("Embeddings dimensions:", get_embeddings_dim())
    print("Query Embedding:", embed_query("Hello world"))
    print("Text Embedding:", embed_text(["First document text", "Second document text"]))