import fs from 'node:fs/promises';
import path from 'node:path';
import { CURATED_DIR } from './paths.js';

export interface Company {
  id: string;
  name: string;
  type: 'public' | 'private';
  ticker: string | null;
  cik: string | null;
  layers: string[];
  country: string;
  role: string;
  tags: string[];
  provenance: { origin: string; asOf: string; confidence?: string; sourceUrl?: string | null };
}

let cache: Company[] | null = null;

export async function loadCompanies(): Promise<Company[]> {
  if (cache) return cache;
  const raw = await fs.readFile(path.join(CURATED_DIR, 'companies.json'), 'utf8');
  cache = JSON.parse(raw) as Company[];
  return cache;
}
