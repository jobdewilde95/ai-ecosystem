/**
 * Joins OpenRouter's catalogue to Artificial Analysis's evaluations.
 *
 * The two use different id conventions — `anthropic/claude-opus-4.5` against
 * `claude-opus-4-5` — and Artificial Analysis additionally lists one entry per
 * reasoning-effort setting (`-high`, `-xhigh`). Normalising separators and
 * collapsing effort suffixes lifts the match from 152 to 230 models; the rest
 * is genuine coverage difference, since each source lists models the other
 * does not.
 */

const EFFORT_SUFFIX =
  /-(xhigh|high|medium|low|minimal|none|thinking|reasoning|nonreasoning|nothinking|pro|preview)$/;

export function normaliseModelId(id: string): string {
  return id
    .toLowerCase()
    .split('/')
    .pop()!
    .replace(/[._]/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Strips every trailing effort suffix, so `-high-thinking` reduces fully. */
export function baseModelId(id: string): string {
  let current = normaliseModelId(id);
  let previous = '';
  while (previous !== current) {
    previous = current;
    current = current.replace(EFFORT_SUFFIX, '');
  }
  return current;
}

/** Index supporting exact-then-base lookup, preferring exact matches. */
export function buildIndex<T>(items: T[], idOf: (item: T) => string): Map<string, T> {
  const index = new Map<string, T>();
  for (const item of items) {
    const exact = normaliseModelId(idOf(item));
    if (!index.has(exact)) index.set(exact, item);
  }
  for (const item of items) {
    const base = baseModelId(idOf(item));
    if (!index.has(base)) index.set(base, item);
  }
  return index;
}

export function lookup<T>(index: Map<string, T>, id: string): T | undefined {
  return index.get(normaliseModelId(id)) ?? index.get(baseModelId(id));
}
