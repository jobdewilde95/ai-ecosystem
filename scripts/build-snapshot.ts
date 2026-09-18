/**
 * Data pipeline entry point: fetch → validate → snapshot → history → changelog.
 *
 * Sources refresh on different tiers because they change on different clocks —
 * prices move daily, filings quarterly, Epoch's dataset monthly. `--only` and
 * `--tier` let CI run the cheap daily pass without re-pulling 70 MB of XBRL.
 */
import fs from 'node:fs/promises';
import { runFetcher, type FetcherResult } from './lib/snapshot.js';
import { appendChanges } from './lib/history.js';
import { writeChangelog, type ChangeEntry } from './lib/changelog.js';
import type { ZodType } from 'zod';
import * as schema from './lib/schema.js';
import { fetchOpenRouter } from './fetch/openrouter.js';
import { fetchArtificialAnalysis, MissingApiKeyError } from './fetch/artificialanalysis.js';
import { fetchMarket } from './fetch/market.js';
import { fetchSecFinancials } from './fetch/sec.js';
import { fetchFilings } from './fetch/filings.js';
import { fetchEpochModels } from './fetch/epoch.js';
import { fetchHuggingFace } from './fetch/huggingface.js';
import { SNAPSHOT_DIR, HISTORY_DIR } from './lib/paths.js';

type Tier = 'daily' | 'weekly' | 'monthly';

interface SourceDef {
  name: string;
  tier: Tier;
  schema: ZodType<unknown>;
  run: () => Promise<FetcherResult<unknown>>;
  /** Failure is expected and non-fatal (e.g. an optional API key is absent). */
  optional?: boolean;
}

/**
 * Ties a source's schema to its fetcher's return type at the definition site,
 * then erases both. Without this the array of heterogeneous sources widens to
 * a union and the schema/fetcher pairing stops being checked at all.
 */
function defineSource<T>(def: {
  name: string;
  tier: Tier;
  schema: ZodType<T>;
  run: () => Promise<FetcherResult<T>>;
  optional?: boolean;
}): SourceDef {
  return def as SourceDef;
}

const SOURCES: SourceDef[] = [
  defineSource({ name: 'openrouter', tier: 'daily', schema: schema.openRouterSnapshotSchema, run: fetchOpenRouter }),
  defineSource({ name: 'artificialanalysis', tier: 'daily', schema: schema.aaSnapshotSchema, run: fetchArtificialAnalysis, optional: true }),
  defineSource({ name: 'market', tier: 'daily', schema: schema.marketSnapshotSchema, run: () => fetchMarket() }),
  defineSource({ name: 'sec-financials', tier: 'weekly', schema: schema.secSnapshotSchema, run: fetchSecFinancials }),
  defineSource({ name: 'filings', tier: 'weekly', schema: schema.filingsSnapshotSchema, run: fetchFilings }),
  defineSource({ name: 'huggingface', tier: 'weekly', schema: schema.hfSnapshotSchema, run: fetchHuggingFace }),
  defineSource({ name: 'epoch-models', tier: 'monthly', schema: schema.epochSnapshotSchema, run: fetchEpochModels }),
];

const today = () => new Date().toISOString().slice(0, 10);

function parseArgs() {
  const args = process.argv.slice(2);
  const value = (flag: string) => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };
  return {
    dryRun: args.includes('--dry-run'),
    only: value('--only')?.split(','),
    tiers: (value('--tier')?.split(',') ?? ['daily', 'weekly', 'monthly']) as Tier[],
  };
}

/** Records token-price movements and flags the ones worth surfacing. */
async function recordPricing(models: schema.OpenRouterModel[]): Promise<ChangeEntry[]> {
  const date = today();
  const rows = models
    .filter((model) => model.pricing.blended3to1 !== null)
    .map((model) => ({
      date,
      key: model.id,
      inputPerMtok: model.pricing.inputPerMtok,
      outputPerMtok: model.pricing.outputPerMtok,
      blended3to1: model.pricing.blended3to1,
    }));

  // Only genuine moves reach the feed; first observations are a backfill.
  const { changed } = await appendChanges('token-pricing', rows, {
    trackedFields: ['inputPerMtok', 'outputPerMtok'],
  });

  const byId = new Map(models.map((model) => [model.id, model]));
  return changed.slice(0, 40).map((row) => {
    const model = byId.get(row.key);
    return {
      date,
      category: 'pricing' as const,
      severity: 'notable' as const,
      title: `${model?.name ?? row.key} price changed`,
      detail:
        `$${Number(row.inputPerMtok).toFixed(2)} in / ` +
        `$${Number(row.outputPerMtok).toFixed(2)} out per Mtok`,
      entity: model?.creator,
      href: '/costs/',
    };
  });
}

/** Only outsized single-day moves earn a spot in the feed. */
function recordMarket(summaries: schema.TickerSummary[]): ChangeEntry[] {
  return summaries
    .filter((summary) => summary.returns.d1 !== null && Math.abs(summary.returns.d1) >= 5)
    .sort((a, b) => Math.abs(b.returns.d1 as number) - Math.abs(a.returns.d1 as number))
    .slice(0, 12)
    .map((summary) => {
      const move = summary.returns.d1 as number;
      return {
        date: summary.latestDate,
        category: 'markets' as const,
        severity: Math.abs(move) >= 10 ? ('major' as const) : ('notable' as const),
        title: `${summary.ticker} ${move >= 0 ? '+' : ''}${move.toFixed(1)}%`,
        detail: `Closed at $${summary.latestClose.toFixed(2)}`,
        changePct: move,
        entity: summary.ticker,
        href: '/markets/',
      };
    });
}

type FilingRow = {
  ticker: string;
  form: string;
  filed: string;
  items: string | null;
  primaryDoc: string;
};

/** Surfaces newly filed financing documents. */
function recordFilings(filings: FilingRow[]): ChangeEntry[] {
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  return filings
    .filter((filing) => filing.filed >= cutoff)
    .filter((filing) => filing.form.startsWith('S-3') || filing.form.startsWith('424B'))
    .slice(0, 15)
    .map((filing) => ({
      date: filing.filed,
      category: 'filings' as const,
      severity: 'notable' as const,
      title: `${filing.ticker} filed ${filing.form}`,
      detail: 'Shelf registration or pricing supplement — a financing signal',
      entity: filing.ticker,
      href: filing.primaryDoc,
    }));
}

async function main(): Promise<void> {
  const { dryRun, only, tiers } = parseArgs();
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
  await fs.mkdir(HISTORY_DIR, { recursive: true });

  const selected = SOURCES.filter(
    (source) => (!only || only.includes(source.name)) && tiers.includes(source.tier),
  );

  console.log(`Running ${selected.length} source(s): ${selected.map((s) => s.name).join(', ')}`);
  if (dryRun) console.log('(dry run — no files written)\n');

  const entries: ChangeEntry[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];

  for (const source of selected) {
    const started = Date.now();
    process.stdout.write(`→ ${source.name} ... `);

    if (dryRun) {
      try {
        const { recordCount } = await source.run();
        console.log(`ok (${recordCount} records, ${Date.now() - started}ms) [not written]`);
      } catch (error) {
        const missingKey = error instanceof MissingApiKeyError;
        console.log(missingKey ? 'skipped (no API key)' : `FAILED: ${error}`);
        (missingKey ? skipped : failed).push(source.name);
      }
      continue;
    }

    const result = await runFetcher(source.name, source.schema, source.run);
    if (result.ok && result.snapshot) {
      // Sources that carry a time series append it before anything else, so a
      // later changelog failure cannot lose the day's observations.
      if (result.history) {
        const { appended } = await appendChanges(result.history.series, result.history.rows, {
          trackedFields: result.history.trackedFields,
          alwaysAppend: result.history.alwaysAppend,
        });
        if (appended.length > 0) {
          process.stdout.write(`(+${appended.length} history rows) `);
        }
      }
      console.log(`ok (${result.snapshot.recordCount} records, ${Date.now() - started}ms)`);
      const data = result.snapshot.data;
      if (source.name === 'openrouter') {
        entries.push(...(await recordPricing(data as schema.OpenRouterModel[])));
      } else if (source.name === 'market') {
        entries.push(...recordMarket(data as schema.TickerSummary[]));
      } else if (source.name === 'filings') {
        entries.push(...recordFilings(data as FilingRow[]));
      }
    } else if (source.optional && result.error?.includes('API key')) {
      console.log('skipped (no API key configured)');
      skipped.push(source.name);
    } else {
      console.log(`FAILED — ${result.snapshot ? 'kept previous snapshot' : 'no snapshot'}`);
      console.log(`   ${result.error}`);
      failed.push(source.name);
    }
  }

  if (!dryRun && entries.length > 0) {
    const added = await writeChangelog(entries);
    console.log(`\nChangelog: ${added} new entries`);
  }

  if (skipped.length > 0) console.log(`Skipped: ${skipped.join(', ')}`);
  if (failed.length > 0) {
    console.error(`\nFailed sources: ${failed.join(', ')}`);
    // A failed source keeps its last-good snapshot, so the build still works.
    // Exit non-zero anyway so CI surfaces it rather than silently drifting.
    process.exitCode = 1;
  } else {
    console.log('\nAll sources up to date.');
  }
}

main().catch((error) => {
  console.error('Pipeline crashed:', error);
  process.exit(1);
});
