import httpx

from app.core.config import settings


async def generate(client: httpx.AsyncClient, prompt: str) -> str:
    if settings.LLM_FAKE_MODE:
        return "[FAKE MODE] This message is fake, for testing purposes only"

    url = f"{settings.GEMINI_API_BASE_URL}/models/{settings.GEMINI_MODEL_NAME}:generateContent"

    r = await client.post(
        url,
        headers={"x-goog-api-key": settings.GEMINI_API_KEY.get_secret_value()},
        json={"contents": [{"parts": [{"text": prompt}]}]},
    )

    if r.status_code != 200:
        raise RuntimeError(f"Gemini {r.status_code}: {r.text}")

    return r.json()["candidates"][0]["content"]["parts"][0]["text"]
