import { fetchJson } from '../lib/http.js';
import type { FetcherResult } from '../lib/snapshot.js';
import type { OpenRouterModel } from '../lib/schema.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/models';

interface RawModel {
  id: string;
  name: string;
  created: number | null;
  context_length: number | null;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  pricing?: Record<string, string | undefined>;
}

/** OpenRouter quotes per-token; the whole industry compares per-million. */
function perMillion(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed * 1_000_000;
}

/** Model ids are `creator/model`; the prefix is the serving organisation. */
function creatorOf(id: string, name: string): string {
  const prefix = id.split('/')[0];
  if (prefix && prefix !== id) return prefix;
  const labelled = name.split(':')[0]?.trim();
  return labelled || 'unknown';
}

export async function fetchOpenRouter(): Promise<FetcherResult<OpenRouterModel[]>> {
  const payload = await fetchJson<{ data: RawModel[] }>(ENDPOINT);
  if (!Array.isArray(payload?.data) || payload.data.length === 0) {
    throw new Error('OpenRouter returned no models');
  }

  const models: OpenRouterModel[] = payload.data.map((raw) => {
    const input = perMillion(raw.pricing?.prompt);
    const output = perMillion(raw.pricing?.completion);
    return {
      id: raw.id,
      name: raw.name,
      creator: creatorOf(raw.id, raw.name),
      createdAt: raw.created ? new Date(raw.created * 1000).toISOString().slice(0, 10) : null,
      contextLength: raw.context_length ?? null,
      inputModalities: raw.architecture?.input_modalities ?? [],
      outputModalities: raw.architecture?.output_modalities ?? [],
      pricing: {
        inputPerMtok: input,
        outputPerMtok: output,
        cacheReadPerMtok: perMillion(raw.pricing?.input_cache_read),
        cacheWritePerMtok: perMillion(raw.pricing?.input_cache_write),
        blended3to1: input !== null && output !== null ? (input * 3 + output) / 4 : null,
      },
    };
  });

  return { data: models, recordCount: models.length };
}
