/**
 * Writes seeded curated datasets from the typed sources in scripts/seed.
 *
 * Keeping the authored data in TypeScript rather than raw JSON means
 * corrections get type-checked, and every emitted record carries provenance
 * marking it as seeded rather than fetched.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { CURATED_DIR } from '../lib/paths.js';
import { FLAGSHIP_PRICING } from './flagship-pricing.js';
import { FUNDING_ROUNDS, DEALS, DEBT_ITEMS } from './capital.js';
import { loadCompanies } from '../lib/companies.js';

async function main(): Promise<void> {
  await fs.mkdir(CURATED_DIR, { recursive: true });

  const flagship = FLAGSHIP_PRICING.map((entry) => ({
    ...entry,
    blended3to1: (entry.inputPerMtok * 3 + entry.outputPerMtok) / 4,
    provenance: {
      origin: 'seeded' as const,
      asOf: entry.date,
      confidence: entry.confidence,
      sourceUrl: null,
    },
  })).sort((a, b) => a.date.localeCompare(b.date));

  await fs.writeFile(
    path.join(CURATED_DIR, 'flagship-pricing.json'),
    `${JSON.stringify(flagship, null, 2)}\n`,
    'utf8',
  );

  const span = `${flagship[0]?.date} → ${flagship.at(-1)?.date}`;
  console.log(`Seeded ${flagship.length} flagship price points (${span})`);

  // Every deal and round references the entity registry; a typo would silently
  // drop an edge from the graph, so unresolved ids fail the build loudly.
  const companies = await loadCompanies();
  const known = new Set(companies.map((company) => company.id));
  const unresolved: string[] = [];
  for (const round of FUNDING_ROUNDS) {
    if (!known.has(round.company)) unresolved.push(`funding ${round.id}: ${round.company}`);
  }
  for (const deal of DEALS) {
    if (!known.has(deal.from)) unresolved.push(`deal ${deal.id}: from=${deal.from}`);
    if (!known.has(deal.to)) unresolved.push(`deal ${deal.id}: to=${deal.to}`);
  }
  for (const item of DEBT_ITEMS) {
    if (!known.has(item.issuer)) unresolved.push(`debt ${item.id}: ${item.issuer}`);
  }
  if (unresolved.length > 0) {
    throw new Error(`Unknown company ids:\n  ${unresolved.join('\n  ')}`);
  }

  const provenance = (date: string, confidence: string) => ({
    origin: 'curated' as const,
    asOf: date,
    confidence,
    sourceUrl: null,
  });

  const funding = [...FUNDING_ROUNDS]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((round) => ({ ...round, provenance: provenance(round.date, round.confidence) }));
  await fs.writeFile(
    path.join(CURATED_DIR, 'funding.json'),
    `${JSON.stringify(funding, null, 2)}\n`,
    'utf8',
  );

  const deals = [...DEALS]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((deal) => ({ ...deal, provenance: provenance(deal.date, deal.confidence) }));
  await fs.writeFile(
    path.join(CURATED_DIR, 'deals.json'),
    `${JSON.stringify(deals, null, 2)}\n`,
    'utf8',
  );

  const debt = [...DEBT_ITEMS]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({ ...item, provenance: provenance(item.date, item.confidence) }));
  await fs.writeFile(
    path.join(CURATED_DIR, 'debt.json'),
    `${JSON.stringify(debt, null, 2)}\n`,
    'utf8',
  );

  console.log(
    `Seeded ${funding.length} funding rounds, ${deals.length} deals, ${debt.length} debt items`,
  );
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
