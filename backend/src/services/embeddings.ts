import { config } from "../config.js";
import { ApiError } from "../errors.js";

type OpenAIEmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>;
  error?: { message?: string };
};

export async function embedText(text: string): Promise<number[]> {
  if (!config.embeddings.apiKey) {
    throw new ApiError(
      503,
      "embedding_provider_not_configured",
      "OPENAI_API_KEY is required to classify and embed a free-text intent",
    );
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.embeddings.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: config.embeddings.model, input: text }),
    signal: AbortSignal.timeout(15_000),
  });

  const payload = (await response.json()) as OpenAIEmbeddingResponse;
  const embedding = payload.data?.[0]?.embedding;
  if (!response.ok || !embedding?.length) {
    throw new ApiError(
      502,
      "embedding_provider_error",
      payload.error?.message ?? `Embedding provider returned HTTP ${response.status}`,
    );
  }
  return embedding;
}

