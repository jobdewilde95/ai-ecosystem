import { fetchJson } from '../lib/http.js';
import type { FetcherResult } from '../lib/snapshot.js';
import type { hfSnapshotSchema } from '../lib/schema.js';
import type { z } from 'zod';

type HfModel = z.infer<typeof hfSnapshotSchema>[number];

/** Text-generation models by 30-day downloads: a usable proxy for which
 *  open-weight families are actually being deployed, not just announced. */
const ENDPOINT =
  'https://huggingface.co/api/models?sort=downloads&direction=-1&limit=200' +
  '&filter=text-generation&full=false';

interface RawHf {
  id?: string;
  modelId?: string;
  author?: string;
  downloads?: number;
  likes?: number;
  createdAt?: string;
  tags?: string[];
}

export async function fetchHuggingFace(): Promise<FetcherResult<HfModel[]>> {
  const raw = await fetchJson<RawHf[]>(ENDPOINT);
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('HuggingFace returned no models');
  }

  const models = raw
    .map((entry) => {
      const id = entry.id ?? entry.modelId ?? '';
      return {
        id,
        author: entry.author ?? (id.includes('/') ? id.split('/')[0] : null),
        downloads: entry.downloads ?? 0,
        likes: entry.likes ?? 0,
        createdAt: entry.createdAt ? entry.createdAt.slice(0, 10) : null,
        tags: entry.tags ?? [],
      };
    })
    .filter((model) => model.id);

  return { data: models, recordCount: models.length };
}
