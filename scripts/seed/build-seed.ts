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
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
