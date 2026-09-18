import { fetchText } from '../lib/http.js';
import { parseCsv, toRecords } from '../lib/csv.js';
import type { FetcherResult } from '../lib/snapshot.js';
import type { epochSnapshotSchema } from '../lib/schema.js';
import type { z } from 'zod';

const MODELS_CSV = 'https://epoch.ai/data/notable_ai_models.csv';

type EpochModel = z.infer<typeof epochSnapshotSchema>[number];

function num(value: string | undefined): number | null {
  if (!value || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function str(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function fetchEpochModels(): Promise<FetcherResult<EpochModel[]>> {
  const csv = await fetchText(MODELS_CSV);
  const records = toRecords(parseCsv(csv));
  if (records.length === 0) throw new Error('Epoch CSV parsed to zero rows');

  const models = records
    .map((record) => ({
      model: record.Model?.trim() ?? '',
      organization: record.Organization?.trim() ?? 'unknown',
      publicationDate: str(record['Publication date']),
      domain: str(record.Domain),
      parameters: num(record.Parameters),
      trainingComputeFlop: num(record['Training compute (FLOP)']),
      trainingHardware: str(record['Training hardware']),
      hardwareQuantity: num(record['Hardware quantity']),
      country: str(record['Country (of organization)']),
    }))
    // Only rows with a date and at least one quantitative field are chartable.
    .filter((model) => model.model && model.publicationDate)
    .filter((model) => model.trainingComputeFlop !== null || model.parameters !== null);

  return { data: models, recordCount: models.length };
}
