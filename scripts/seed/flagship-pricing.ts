/**
 * Seeded flagship list pricing.
 *
 * Artificial Analysis only scores models that are currently served, and its
 * intelligence index is rebased as the frontier moves — so a 2023 flagship
 * scores near zero on today's scale and no live source can reconstruct what
 * inference cost two years ago. Without this, the cost-decline chart starts in
 * 2026 and shows six months of history.
 *
 * These are published list prices at launch, per million tokens, USD, for the
 * standard (non-batch, non-cached) tier. They are seeded from prior knowledge
 * rather than fetched, are tagged as such in the data, and render visually
 * distinct in the UI. Where a model had tiered context pricing, the base tier
 * is used and noted.
 *
 * This file is the input to `npm run data:seed`, which writes
 * data/curated/flagship-pricing.json. Corrections belong here, not in the
 * generated file.
 */

export interface FlagshipPrice {
  /** Stable id: provider-model-variant. */
  id: string;
  provider: string;
  model: string;
  /** Date the price took effect (launch, or the date of a repricing). */
  date: string;
  inputPerMtok: number;
  outputPerMtok: number;
  /** Provider's own positioning, used to compare like with like over time. */
  tier: 'frontier' | 'mid' | 'small';
  note?: string;
  confidence: 'high' | 'medium';
}

export const FLAGSHIP_PRICING: FlagshipPrice[] = [
  // ---------------------------------------------------------------- OpenAI
  { id: 'openai-gpt-4-8k', provider: 'OpenAI', model: 'GPT-4 (8k)', date: '2023-03-14', inputPerMtok: 30, outputPerMtok: 60, tier: 'frontier', confidence: 'high' },
  { id: 'openai-gpt-4-32k', provider: 'OpenAI', model: 'GPT-4 (32k)', date: '2023-03-14', inputPerMtok: 60, outputPerMtok: 120, tier: 'frontier', note: 'Extended-context tier', confidence: 'high' },
  { id: 'openai-gpt-3-5-turbo', provider: 'OpenAI', model: 'GPT-3.5 Turbo', date: '2023-03-01', inputPerMtok: 1.5, outputPerMtok: 2, tier: 'small', confidence: 'medium' },
  { id: 'openai-gpt-4-turbo', provider: 'OpenAI', model: 'GPT-4 Turbo', date: '2023-11-06', inputPerMtok: 10, outputPerMtok: 30, tier: 'frontier', confidence: 'high' },
  { id: 'openai-gpt-4o', provider: 'OpenAI', model: 'GPT-4o', date: '2024-05-13', inputPerMtok: 5, outputPerMtok: 15, tier: 'frontier', confidence: 'high' },
  { id: 'openai-gpt-4o-mini', provider: 'OpenAI', model: 'GPT-4o mini', date: '2024-07-18', inputPerMtok: 0.15, outputPerMtok: 0.6, tier: 'small', confidence: 'high' },
  { id: 'openai-gpt-4o-0806', provider: 'OpenAI', model: 'GPT-4o (Aug 2024)', date: '2024-08-06', inputPerMtok: 2.5, outputPerMtok: 10, tier: 'frontier', note: 'Repricing of GPT-4o', confidence: 'high' },
  { id: 'openai-o1', provider: 'OpenAI', model: 'o1', date: '2024-12-05', inputPerMtok: 15, outputPerMtok: 60, tier: 'frontier', note: 'Reasoning tier', confidence: 'high' },
  { id: 'openai-o3-mini', provider: 'OpenAI', model: 'o3-mini', date: '2025-01-31', inputPerMtok: 1.1, outputPerMtok: 4.4, tier: 'mid', confidence: 'high' },
  { id: 'openai-gpt-4-1', provider: 'OpenAI', model: 'GPT-4.1', date: '2025-04-14', inputPerMtok: 2, outputPerMtok: 8, tier: 'frontier', confidence: 'high' },
  { id: 'openai-gpt-4-1-mini', provider: 'OpenAI', model: 'GPT-4.1 mini', date: '2025-04-14', inputPerMtok: 0.4, outputPerMtok: 1.6, tier: 'mid', confidence: 'high' },
  { id: 'openai-gpt-4-1-nano', provider: 'OpenAI', model: 'GPT-4.1 nano', date: '2025-04-14', inputPerMtok: 0.1, outputPerMtok: 0.4, tier: 'small', confidence: 'high' },
  { id: 'openai-gpt-5', provider: 'OpenAI', model: 'GPT-5', date: '2025-08-07', inputPerMtok: 1.25, outputPerMtok: 10, tier: 'frontier', confidence: 'high' },

  // ------------------------------------------------------------- Anthropic
  { id: 'anthropic-claude-2', provider: 'Anthropic', model: 'Claude 2', date: '2023-07-11', inputPerMtok: 8, outputPerMtok: 24, tier: 'frontier', confidence: 'medium' },
  { id: 'anthropic-claude-3-opus', provider: 'Anthropic', model: 'Claude 3 Opus', date: '2024-03-04', inputPerMtok: 15, outputPerMtok: 75, tier: 'frontier', confidence: 'high' },
  { id: 'anthropic-claude-3-sonnet', provider: 'Anthropic', model: 'Claude 3 Sonnet', date: '2024-03-04', inputPerMtok: 3, outputPerMtok: 15, tier: 'mid', confidence: 'high' },
  { id: 'anthropic-claude-3-haiku', provider: 'Anthropic', model: 'Claude 3 Haiku', date: '2024-03-04', inputPerMtok: 0.25, outputPerMtok: 1.25, tier: 'small', confidence: 'high' },
  { id: 'anthropic-claude-3-5-sonnet', provider: 'Anthropic', model: 'Claude 3.5 Sonnet', date: '2024-06-20', inputPerMtok: 3, outputPerMtok: 15, tier: 'frontier', confidence: 'high' },
  { id: 'anthropic-claude-3-5-haiku', provider: 'Anthropic', model: 'Claude 3.5 Haiku', date: '2024-10-22', inputPerMtok: 0.8, outputPerMtok: 4, tier: 'small', confidence: 'high' },
  { id: 'anthropic-claude-3-7-sonnet', provider: 'Anthropic', model: 'Claude 3.7 Sonnet', date: '2025-02-24', inputPerMtok: 3, outputPerMtok: 15, tier: 'frontier', confidence: 'high' },
  { id: 'anthropic-claude-4-sonnet', provider: 'Anthropic', model: 'Claude Sonnet 4', date: '2025-05-22', inputPerMtok: 3, outputPerMtok: 15, tier: 'mid', confidence: 'high' },
  { id: 'anthropic-claude-4-opus', provider: 'Anthropic', model: 'Claude Opus 4', date: '2025-05-22', inputPerMtok: 15, outputPerMtok: 75, tier: 'frontier', confidence: 'high' },
  { id: 'anthropic-claude-4-5-sonnet', provider: 'Anthropic', model: 'Claude Sonnet 4.5', date: '2025-09-29', inputPerMtok: 3, outputPerMtok: 15, tier: 'frontier', confidence: 'high' },
  { id: 'anthropic-claude-4-5-haiku', provider: 'Anthropic', model: 'Claude Haiku 4.5', date: '2025-10-15', inputPerMtok: 1, outputPerMtok: 5, tier: 'small', confidence: 'high' },

  // ---------------------------------------------------------------- Google
  { id: 'google-gemini-1-5-pro', provider: 'Google', model: 'Gemini 1.5 Pro', date: '2024-05-14', inputPerMtok: 1.25, outputPerMtok: 5, tier: 'frontier', note: 'Base context tier (≤128k)', confidence: 'medium' },
  { id: 'google-gemini-1-5-flash', provider: 'Google', model: 'Gemini 1.5 Flash', date: '2024-05-14', inputPerMtok: 0.075, outputPerMtok: 0.3, tier: 'small', note: 'Base context tier (≤128k)', confidence: 'medium' },
  { id: 'google-gemini-2-0-flash', provider: 'Google', model: 'Gemini 2.0 Flash', date: '2025-02-05', inputPerMtok: 0.1, outputPerMtok: 0.4, tier: 'small', confidence: 'high' },
  { id: 'google-gemini-2-5-pro', provider: 'Google', model: 'Gemini 2.5 Pro', date: '2025-06-17', inputPerMtok: 1.25, outputPerMtok: 10, tier: 'frontier', note: 'Base context tier (≤200k)', confidence: 'high' },
  { id: 'google-gemini-2-5-flash', provider: 'Google', model: 'Gemini 2.5 Flash', date: '2025-06-17', inputPerMtok: 0.3, outputPerMtok: 2.5, tier: 'mid', confidence: 'high' },

  // -------------------------------------------------------------- DeepSeek
  { id: 'deepseek-v3', provider: 'DeepSeek', model: 'DeepSeek-V3', date: '2024-12-26', inputPerMtok: 0.27, outputPerMtok: 1.1, tier: 'frontier', note: 'Standard (cache-miss) rate', confidence: 'high' },
  { id: 'deepseek-r1', provider: 'DeepSeek', model: 'DeepSeek-R1', date: '2025-01-20', inputPerMtok: 0.55, outputPerMtok: 2.19, tier: 'frontier', note: 'Standard (cache-miss) rate', confidence: 'high' },

  // --------------------------------------------------------------- Mistral
  { id: 'mistral-large', provider: 'Mistral', model: 'Mistral Large', date: '2024-02-26', inputPerMtok: 8, outputPerMtok: 24, tier: 'frontier', confidence: 'medium' },
  { id: 'mistral-large-2', provider: 'Mistral', model: 'Mistral Large 2', date: '2024-07-24', inputPerMtok: 3, outputPerMtok: 9, tier: 'frontier', confidence: 'medium' },

  // ------------------------------------------------------------------ Meta
  { id: 'meta-llama-3-1-405b', provider: 'Meta (hosted)', model: 'Llama 3.1 405B', date: '2024-07-23', inputPerMtok: 3, outputPerMtok: 3, tier: 'frontier', note: 'Representative third-party hosting rate; Meta publishes no list price', confidence: 'medium' },
  { id: 'meta-llama-3-3-70b', provider: 'Meta (hosted)', model: 'Llama 3.3 70B', date: '2024-12-06', inputPerMtok: 0.6, outputPerMtok: 0.6, tier: 'mid', note: 'Representative third-party hosting rate', confidence: 'medium' },
];
