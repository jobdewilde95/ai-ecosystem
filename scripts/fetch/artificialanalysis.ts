import { fetchJson } from '../lib/http.js';
import type { FetcherResult } from '../lib/snapshot.js';
import type { AaModel } from '../lib/schema.js';

const ENDPOINT = 'https://artificialanalysis.ai/api/v2/data/llms/models';

/** Thrown when no key is configured, so the orchestrator can skip rather than fail. */
export class MissingApiKeyError extends Error {
  constructor() {
    super('ARTIFICIALANALYSIS_API_KEY is not set');
    this.name = 'MissingApiKeyError';
  }
}

interface RawAa {
  id: string;
  slug: string;
  name: string;
  release_date: string | null;
  model_creator?: { name?: string };
  evaluations?: Record<string, number | null>;
  pricing?: Record<string, number | null>;
  median_output_tokens_per_second: number | null;
  median_time_to_first_token_seconds: number | null;
}

const num = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export async function fetchArtificialAnalysis(): Promise<FetcherResult<AaModel[]>> {
  const apiKey = process.env.ARTIFICIALANALYSIS_API_KEY?.trim();
  if (!apiKey) throw new MissingApiKeyError();

  const payload = await fetchJson<{ data: RawAa[] }>(ENDPOINT, {
    headers: { 'x-api-key': apiKey },
  });
  if (!Array.isArray(payload?.data) || payload.data.length === 0) {
    throw new Error('Artificial Analysis returned no models');
  }

  const models: AaModel[] = payload.data.map((raw) => {
    const evals = raw.evaluations ?? {};
    return {
      id: raw.id,
      slug: raw.slug,
      name: raw.name,
      creator: raw.model_creator?.name ?? 'unknown',
      releaseDate: raw.release_date ?? null,
      pricing: {
        inputPerMtok: num(raw.pricing?.price_1m_input_tokens),
        outputPerMtok: num(raw.pricing?.price_1m_output_tokens),
        blended3to1: num(raw.pricing?.price_1m_blended_3_to_1),
      },
      evaluations: {
        intelligenceIndex: num(evals.artificial_analysis_intelligence_index),
        codingIndex: num(evals.artificial_analysis_coding_index),
        mathIndex: num(evals.artificial_analysis_math_index),
        gpqa: num(evals.gpqa),
        hle: num(evals.hle),
        livecodebench: num(evals.livecodebench),
        scicode: num(evals.scicode),
        aime25: num(evals.aime_25),
        terminalbench: num(evals.terminalbench_v2_1 ?? evals.terminalbench_hard),
        tau2: num(evals.tau2),
      },
      medianOutputTokensPerSecond: num(raw.median_output_tokens_per_second),
      medianTimeToFirstTokenSeconds: num(raw.median_time_to_first_token_seconds),
    };
  });

  return { data: models, recordCount: models.length };
}
