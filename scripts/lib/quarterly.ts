/**
 * Converts XBRL duration facts into discrete quarterly values.
 *
 * Cash-flow and income-statement facts in 10-Qs are cumulative year-to-date:
 * Q2 is reported as a six-month figure, Q3 as nine months, and the 10-K as a
 * full year. Filtering to "periods under ~100 days" therefore keeps Q1 and
 * throws away the rest, which silently drops three quarters in four for most
 * filers — and produced empty capex and debt-issuance series for Meta and
 * Alphabet while looking perfectly healthy.
 *
 * Discrete quarters are recovered by differencing: given a cumulative period
 * [start, end] and a shorter cumulative [start, mid] sharing the same start,
 * the stub [mid, end] equals the difference of the two values. Applying that
 * repeatedly to a fixed point recovers every quarter a filer's disclosures
 * actually determine, and no more.
 */

export interface DurationFact {
  start: string;
  end: string;
  value: number;
  form: string;
  filed: string;
  fiscalYear: number;
  fiscalPeriod: string;
  frame: string | null;
}

const DAY = 86_400_000;

export function durationDays(fact: { start: string; end: string }): number {
  return (Date.parse(fact.end) - Date.parse(fact.start)) / DAY;
}

/** A single reporting quarter, allowing for 13-week fiscal calendars. */
function isQuarterLength(days: number): boolean {
  return days >= 80 && days <= 100;
}

const keyOf = (fact: { start: string; end: string }) => `${fact.start}..${fact.end}`;

/**
 * Derives every discrete quarter obtainable from a set of cumulative facts.
 * Returns them sorted by period end.
 */
export function deriveQuarterly(facts: DurationFact[]): DurationFact[] {
  const byPeriod = new Map<string, DurationFact>();
  for (const fact of facts) {
    const existing = byPeriod.get(keyOf(fact));
    // Restatements: the most recently filed value is the one that stands.
    if (!existing || fact.filed > existing.filed) byPeriod.set(keyOf(fact), fact);
  }

  // Differencing pairs that share a start date, repeated until nothing new
  // appears. Each pass can expose a further stub (a 9-month minus a 6-month
  // yields Q3, which then makes the 12-month minus 9-month Q4 derivable).
  let added = true;
  let guard = 0;
  while (added && guard++ < 8) {
    added = false;
    const all = [...byPeriod.values()];
    const byStart = new Map<string, DurationFact[]>();
    for (const fact of all) {
      const bucket = byStart.get(fact.start) ?? [];
      bucket.push(fact);
      byStart.set(fact.start, bucket);
    }

    for (const bucket of byStart.values()) {
      if (bucket.length < 2) continue;
      const sorted = [...bucket].sort((a, b) => a.end.localeCompare(b.end));
      for (let i = 1; i < sorted.length; i++) {
        const shorter = sorted[i - 1];
        const longer = sorted[i];
        // The stub runs from the day after the shorter period ends.
        const stubStart = new Date(Date.parse(shorter.end) + DAY).toISOString().slice(0, 10);
        const stub: DurationFact = {
          start: stubStart,
          end: longer.end,
          value: longer.value - shorter.value,
          form: longer.form,
          filed: longer.filed,
          fiscalYear: longer.fiscalYear,
          fiscalPeriod: longer.fiscalPeriod,
          frame: null,
        };
        if (!isQuarterLength(durationDays(stub))) continue;
        if (byPeriod.has(keyOf(stub))) continue;
        byPeriod.set(keyOf(stub), stub);
        added = true;
      }
    }
  }

  return [...byPeriod.values()]
    .filter((fact) => isQuarterLength(durationDays(fact)))
    .sort((a, b) => a.end.localeCompare(b.end));
}

/** Trailing-twelve-month sum ending at each quarter that has four predecessors. */
export function trailingTwelveMonths(
  quarters: DurationFact[],
): Array<{ end: string; value: number }> {
  const sorted = [...quarters].sort((a, b) => a.end.localeCompare(b.end));
  const out: Array<{ end: string; value: number }> = [];
  for (let i = 3; i < sorted.length; i++) {
    const window = sorted.slice(i - 3, i + 1);
    // Only sum a genuine year: gaps mean a filer skipped a period and the sum
    // would understate rather than simply be missing.
    const span = durationDays({ start: window[0].start, end: window[3].end });
    if (span < 330 || span > 400) continue;
    out.push({ end: window[3].end, value: window.reduce((sum, f) => sum + f.value, 0) });
  }
  return out;
}
