import fs from 'node:fs/promises';
import { CHANGELOG_PATH } from './paths.js';

/** One human-readable thing that moved, for the overview delta feed. */
export interface ChangeEntry {
  date: string;
  category: 'pricing' | 'models' | 'markets' | 'filings' | 'funding' | 'debt' | 'compute';
  severity: 'info' | 'notable' | 'major';
  title: string;
  detail?: string;
  /** Percent change where the entry represents a moved number. */
  changePct?: number;
  entity?: string;
  href?: string;
}

export interface Changelog {
  generatedAt: string;
  entries: ChangeEntry[];
}

const MAX_ENTRIES = 500;

export async function readChangelog(): Promise<Changelog> {
  try {
    const raw = await fs.readFile(CHANGELOG_PATH, 'utf8');
    return JSON.parse(raw) as Changelog;
  } catch {
    return { generatedAt: new Date().toISOString(), entries: [] };
  }
}

/** Merges new entries in front of the existing feed, de-duplicating by identity. */
export async function writeChangelog(entries: ChangeEntry[]): Promise<number> {
  const existing = await readChangelog();
  const identity = (entry: ChangeEntry) => `${entry.date}|${entry.category}|${entry.title}`;
  const seen = new Set(existing.entries.map(identity));
  const fresh = entries.filter((entry) => !seen.has(identity(entry)));

  const merged = [...fresh, ...existing.entries]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, MAX_ENTRIES);

  await fs.writeFile(
    CHANGELOG_PATH,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), entries: merged }, null, 2)}\n`,
    'utf8',
  );
  return fresh.length;
}
