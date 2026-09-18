/**
 * Curated private-capital datasets: funding rounds, deals and debt.
 *
 * No free API covers private rounds, partnership terms or deal structure, so
 * this is hand-maintained from public reporting and company announcements. It
 * is the input to `npm run data:seed`.
 *
 * Three things to hold in mind when reading anything derived from this file:
 *
 * 1. Announced is not deployed. A "$100B investment" or "$300B compute
 *    commitment" is a headline figure attached to a multi-year, often
 *    milestone-gated arrangement. `amountUsd` is the announced headline; it is
 *    not cash that has changed hands.
 * 2. Coverage is partial by construction. Undisclosed rounds and private terms
 *    are simply absent, so any share computed over this data — circularity
 *    exposure especially — is a share of what was disclosed.
 * 3. Confidence is marked per record. `medium` means the figure was reported
 *    but terms were partial, contested, or the structure makes a single number
 *    misleading.
 */

export interface FundingRound {
  id: string;
  /** Company id from the registry in data/curated/companies.json. */
  company: string;
  date: string;
  round: string;
  amountUsd: number | null;
  postMoneyUsd: number | null;
  leadInvestors: string[];
  note?: string;
  confidence: 'high' | 'medium';
}

export interface Deal {
  id: string;
  date: string;
  /** Registry ids. The edge points the way value flows: from → to. */
  from: string;
  to: string;
  type: 'investment' | 'compute-commitment' | 'supply' | 'jv' | 'warrant' | 'acquisition';
  amountUsd: number | null;
  /**
   * True when the capital and the demand it funds point back at each other —
   * a supplier financing a customer that buys its product. The central
   * structural question about AI infrastructure demand.
   */
  circular: boolean;
  description: string;
  confidence: 'high' | 'medium';
}

export interface DebtItem {
  id: string;
  issuer: string;
  date: string;
  instrument: 'bond' | 'term-loan' | 'convertible' | 'credit-facility' | 'spv' | 'abs';
  amountUsd: number;
  collateral?: string;
  counterparties?: string[];
  description: string;
  confidence: 'high' | 'medium';
}

const B = 1_000_000_000;
const M = 1_000_000;

/* ------------------------------------------------------------------ rounds */

export const FUNDING_ROUNDS: FundingRound[] = [
  { id: 'openai-2024-10', company: 'openai', date: '2024-10-02', round: 'Series', amountUsd: 6.6 * B, postMoneyUsd: 157 * B, leadInvestors: ['Thrive Capital'], confidence: 'high' },
  { id: 'openai-2025-03', company: 'openai', date: '2025-03-31', round: 'Series', amountUsd: 40 * B, postMoneyUsd: 300 * B, leadInvestors: ['SoftBank'], note: 'Tranched and conditional on restructuring', confidence: 'high' },
  { id: 'openai-2025-10', company: 'openai', date: '2025-10-02', round: 'Secondary', amountUsd: null, postMoneyUsd: 500 * B, leadInvestors: ['Employee tender'], note: 'Secondary sale valuation, not primary capital', confidence: 'medium' },

  { id: 'anthropic-2024-11', company: 'anthropic', date: '2024-11-22', round: 'Strategic', amountUsd: 4 * B, postMoneyUsd: null, leadInvestors: ['Amazon'], note: 'Second Amazon tranche, $8B cumulative', confidence: 'high' },
  { id: 'anthropic-2025-03', company: 'anthropic', date: '2025-03-03', round: 'Series E', amountUsd: 3.5 * B, postMoneyUsd: 61.5 * B, leadInvestors: ['Lightspeed'], confidence: 'high' },
  { id: 'anthropic-2025-09', company: 'anthropic', date: '2025-09-02', round: 'Series F', amountUsd: 13 * B, postMoneyUsd: 183 * B, leadInvestors: ['ICONIQ', 'Fidelity', 'Lightspeed'], confidence: 'high' },
  { id: 'anthropic-2025-11', company: 'anthropic', date: '2025-11-18', round: 'Strategic', amountUsd: 15 * B, postMoneyUsd: 350 * B, leadInvestors: ['Microsoft', 'NVIDIA'], note: 'Announced as up to $15B combined, staged', confidence: 'medium' },

  { id: 'xai-2024-12', company: 'xai', date: '2024-12-24', round: 'Series C', amountUsd: 6 * B, postMoneyUsd: 45 * B, leadInvestors: ['a16z', 'Sequoia', 'Valor'], confidence: 'high' },
  { id: 'xai-2025-07', company: 'xai', date: '2025-07-01', round: 'Equity + debt', amountUsd: 10 * B, postMoneyUsd: null, leadInvestors: ['Valor', 'Morgan Stanley'], note: 'Split roughly evenly between equity and debt', confidence: 'medium' },
  { id: 'xai-2025-12', company: 'xai', date: '2025-12-01', round: 'Series', amountUsd: 20 * B, postMoneyUsd: 230 * B, leadInvestors: ['Valor', 'NVIDIA'], note: 'Reported; includes an SPV holding GPUs', confidence: 'medium' },

  { id: 'mistral-2024-06', company: 'mistral', date: '2024-06-11', round: 'Series B', amountUsd: 645 * M, postMoneyUsd: 6 * B, leadInvestors: ['General Catalyst'], confidence: 'high' },
  { id: 'mistral-2025-09', company: 'mistral', date: '2025-09-09', round: 'Series C', amountUsd: 2 * B, postMoneyUsd: 13.7 * B, leadInvestors: ['ASML'], note: 'ASML took the lead position — a supplier backing the model layer', confidence: 'high' },

  { id: 'ssi-2024-09', company: 'ssi', date: '2024-09-04', round: 'Seed', amountUsd: 1 * B, postMoneyUsd: 5 * B, leadInvestors: ['Sequoia', 'a16z'], confidence: 'high' },
  { id: 'ssi-2025-04', company: 'ssi', date: '2025-04-12', round: 'Series', amountUsd: 2 * B, postMoneyUsd: 32 * B, leadInvestors: ['Greenoaks'], note: 'No product revenue at the time of the round', confidence: 'high' },

  { id: 'thinking-machines-2025-07', company: 'thinking-machines', date: '2025-07-15', round: 'Seed', amountUsd: 2 * B, postMoneyUsd: 12 * B, leadInvestors: ['a16z'], confidence: 'high' },

  { id: 'databricks-2024-12', company: 'databricks', date: '2024-12-17', round: 'Series J', amountUsd: 10 * B, postMoneyUsd: 62 * B, leadInvestors: ['Thrive Capital'], confidence: 'high' },
  { id: 'databricks-2025-09', company: 'databricks', date: '2025-09-16', round: 'Series K', amountUsd: 1 * B, postMoneyUsd: 100 * B, leadInvestors: ['Insight Partners'], confidence: 'medium' },

  { id: 'anysphere-2025-06', company: 'anysphere', date: '2025-06-05', round: 'Series C', amountUsd: 900 * M, postMoneyUsd: 9.9 * B, leadInvestors: ['Thrive Capital'], confidence: 'high' },
  { id: 'anysphere-2025-11', company: 'anysphere', date: '2025-11-13', round: 'Series D', amountUsd: 2.3 * B, postMoneyUsd: 29.3 * B, leadInvestors: ['Accel', 'Coatue'], confidence: 'high' },

  { id: 'perplexity-2025-09', company: 'perplexity', date: '2025-09-10', round: 'Series', amountUsd: 200 * M, postMoneyUsd: 20 * B, leadInvestors: ['Undisclosed'], confidence: 'medium' },
  { id: 'cognition-2025-08', company: 'cognition', date: '2025-08-13', round: 'Series C', amountUsd: 400 * M, postMoneyUsd: 10.2 * B, leadInvestors: ['Founders Fund'], confidence: 'high' },
  { id: 'sierra-2025-09', company: 'sierra', date: '2025-09-24', round: 'Series C', amountUsd: 350 * M, postMoneyUsd: 10 * B, leadInvestors: ['Greenoaks'], confidence: 'high' },
  { id: 'harvey-2025-06', company: 'harvey', date: '2025-06-23', round: 'Series E', amountUsd: 300 * M, postMoneyUsd: 5 * B, leadInvestors: ['Kleiner Perkins'], confidence: 'high' },
  { id: 'glean-2025-06', company: 'glean', date: '2025-06-10', round: 'Series F', amountUsd: 150 * M, postMoneyUsd: 7.2 * B, leadInvestors: ['Wellington'], confidence: 'high' },
  { id: 'elevenlabs-2025-01', company: 'elevenlabs', date: '2025-01-30', round: 'Series C', amountUsd: 180 * M, postMoneyUsd: 3.3 * B, leadInvestors: ['a16z', 'ICONIQ'], confidence: 'high' },
  { id: 'abridge-2025-06', company: 'abridge', date: '2025-06-24', round: 'Series E', amountUsd: 300 * M, postMoneyUsd: 5.3 * B, leadInvestors: ['a16z'], confidence: 'high' },
  { id: 'mercor-2025-10', company: 'mercor', date: '2025-10-01', round: 'Series C', amountUsd: 350 * M, postMoneyUsd: 10 * B, leadInvestors: ['Felicis'], confidence: 'medium' },
  { id: 'surge-2025-10', company: 'surge', date: '2025-10-01', round: 'Series A', amountUsd: 1 * B, postMoneyUsd: 24 * B, leadInvestors: ['Undisclosed'], note: 'First external round; previously bootstrapped', confidence: 'medium' },

  { id: 'crusoe-2024-12', company: 'crusoe', date: '2024-12-05', round: 'Series D', amountUsd: 600 * M, postMoneyUsd: 2.8 * B, leadInvestors: ['Founders Fund'], confidence: 'high' },
  { id: 'crusoe-2025-12', company: 'crusoe', date: '2025-12-01', round: 'Series E', amountUsd: 1.375 * B, postMoneyUsd: 13 * B, leadInvestors: ['Valor'], confidence: 'medium' },
  { id: 'lambda-2025-02', company: 'lambda', date: '2025-02-19', round: 'Series D', amountUsd: 480 * M, postMoneyUsd: 2.5 * B, leadInvestors: ['Andra Capital', 'SGW'], confidence: 'high' },
  { id: 'together-2025-02', company: 'together', date: '2025-02-20', round: 'Series B', amountUsd: 305 * M, postMoneyUsd: 3.3 * B, leadInvestors: ['General Catalyst'], confidence: 'high' },
  { id: 'cerebras-2025-09', company: 'cerebras', date: '2025-09-30', round: 'Series G', amountUsd: 1.1 * B, postMoneyUsd: 8.1 * B, leadInvestors: ['Fidelity', 'Atreides'], confidence: 'high' },
  { id: 'groq-2025-09', company: 'groq', date: '2025-09-17', round: 'Series E', amountUsd: 750 * M, postMoneyUsd: 6.9 * B, leadInvestors: ['Disruptive'], confidence: 'high' },
];

/* ------------------------------------------------------------------- deals */

export const DEALS: Deal[] = [
  // --- The circular core: suppliers financing their own demand ------------
  { id: 'nvda-openai-2025', date: '2025-09-22', from: 'nvidia', to: 'openai', type: 'investment', amountUsd: 100 * B, circular: true, description: 'Up to $100B staged against 10GW of NVIDIA systems deployed by OpenAI — the supplier funding the customer that buys its chips.', confidence: 'high' },
  { id: 'openai-oracle-2025', date: '2025-09-10', from: 'openai', to: 'oracle', type: 'compute-commitment', amountUsd: 300 * B, circular: false, description: 'Five-year OCI capacity commitment; Oracle is funding the build largely with debt.', confidence: 'high' },
  { id: 'openai-amd-2025', date: '2025-10-06', from: 'amd', to: 'openai', type: 'warrant', amountUsd: null, circular: true, description: 'AMD issued OpenAI a warrant for up to 160M shares tied to 6GW of deployment — supplier equity granted against customer purchases.', confidence: 'high' },
  { id: 'openai-broadcom-2025', date: '2025-10-13', from: 'openai', to: 'broadcom', type: 'supply', amountUsd: null, circular: false, description: '10GW of co-designed custom accelerators.', confidence: 'high' },
  { id: 'msft-openai-restructure', date: '2025-10-28', from: 'openai', to: 'microsoft', type: 'compute-commitment', amountUsd: 250 * B, circular: true, description: 'Incremental Azure commitment alongside Microsoft’s ~27% stake — the investor is also the vendor being paid.', confidence: 'high' },
  { id: 'openai-aws-2025', date: '2025-11-03', from: 'openai', to: 'amazon', type: 'compute-commitment', amountUsd: 38 * B, circular: false, description: 'Seven-year AWS capacity agreement.', confidence: 'high' },
  { id: 'openai-coreweave-2025', date: '2025-03-10', from: 'openai', to: 'coreweave', type: 'compute-commitment', amountUsd: 11.9 * B, circular: false, description: 'Capacity contract signed alongside a pre-IPO equity stake taken by OpenAI.', confidence: 'high' },

  { id: 'amzn-anthropic', date: '2024-11-22', from: 'amazon', to: 'anthropic', type: 'investment', amountUsd: 8 * B, circular: true, description: 'Cumulative investment paired with Trainium commitments and AWS as primary training partner.', confidence: 'high' },
  { id: 'googl-anthropic-tpu', date: '2025-10-23', from: 'anthropic', to: 'alphabet', type: 'compute-commitment', amountUsd: null, circular: true, description: 'Up to 1GW of TPU capacity from an investor that is also the supplier.', confidence: 'high' },
  { id: 'msft-nvda-anthropic', date: '2025-11-18', from: 'microsoft', to: 'anthropic', type: 'investment', amountUsd: 15 * B, circular: true, description: 'Microsoft and NVIDIA investing alongside a $30B Azure commitment from Anthropic.', confidence: 'medium' },

  { id: 'nvda-coreweave', date: '2023-04-01', from: 'nvidia', to: 'coreweave', type: 'investment', amountUsd: 100 * M, circular: true, description: 'Early equity in a neocloud whose entire fleet is NVIDIA silicon; later extended by a capacity backstop.', confidence: 'medium' },
  { id: 'nvda-nebius', date: '2024-12-02', from: 'nvidia', to: 'nebius', type: 'investment', amountUsd: 700 * M, circular: true, description: 'Participation in Nebius’s raise to fund GPU purchases.', confidence: 'high' },
  { id: 'nvda-xai', date: '2025-12-01', from: 'nvidia', to: 'xai', type: 'investment', amountUsd: 2 * B, circular: true, description: 'Equity into an SPV holding GPUs for the Colossus cluster.', confidence: 'medium' },

  { id: 'meta-scale', date: '2025-06-12', from: 'meta', to: 'scale-ai', type: 'acquisition', amountUsd: 14.3 * B, circular: false, description: '49% stake valuing Scale near $29B, with its leadership moving to Meta.', confidence: 'high' },
  { id: 'meta-coreweave', date: '2025-09-30', from: 'meta', to: 'coreweave', type: 'compute-commitment', amountUsd: 14.2 * B, circular: false, description: 'Capacity contract running to 2031.', confidence: 'high' },
  { id: 'meta-blueowl-hyperion', date: '2025-10-21', from: 'blue-owl', to: 'meta', type: 'jv', amountUsd: 27 * B, circular: false, description: 'Blue Owl funding the Hyperion campus through a JV that keeps the build off Meta\u2019s balance sheet.', confidence: 'high' },

  { id: 'stargate', date: '2025-01-21', from: 'softbank', to: 'openai', type: 'jv', amountUsd: 500 * B, circular: false, description: 'Stargate JV with Oracle and MGX. An announced four-year programme target, not committed capital — the headline figure exceeds all disclosed funding for it.', confidence: 'medium' },
  { id: 'msft-openai-initial', date: '2023-01-23', from: 'microsoft', to: 'openai', type: 'investment', amountUsd: 10 * B, circular: true, description: 'Multi-year investment paid substantially in Azure credits.', confidence: 'high' },
  { id: 'asml-mistral', date: '2025-09-09', from: 'asml', to: 'mistral', type: 'investment', amountUsd: 1.5 * B, circular: false, description: 'Lithography supplier taking the lead position in a model lab.', confidence: 'high' },
  { id: 'blackstone-coreweave', date: '2024-05-17', from: 'blackstone', to: 'coreweave', type: 'investment', amountUsd: 7.5 * B, circular: false, description: 'GPU-backed term loan led by Blackstone and Magnetar — private credit underwriting hardware as collateral.', confidence: 'high' },
  { id: 'googl-terawulf', date: '2025-10-14', from: 'alphabet', to: 'core-scientific', type: 'investment', amountUsd: 3.2 * B, circular: true, description: 'Backstop of neocloud lease obligations in exchange for equity, enabling debt the operator could not otherwise raise.', confidence: 'medium' },
];

/* -------------------------------------------------------------------- debt */

export const DEBT_ITEMS: DebtItem[] = [
  { id: 'meta-bond-2025-10', issuer: 'meta', date: '2025-10-30', instrument: 'bond', amountUsd: 30 * B, description: 'Largest US corporate bond sale since 2023, funding AI infrastructure.', confidence: 'high' },
  { id: 'meta-hyperion-spv', issuer: 'meta', date: '2025-10-21', instrument: 'spv', amountUsd: 27 * B, collateral: 'Hyperion data center campus', counterparties: ['Blue Owl'], description: 'Off-balance-sheet JV financing the Louisiana campus.', confidence: 'high' },
  { id: 'oracle-bond-2025-09', issuer: 'oracle', date: '2025-09-24', instrument: 'bond', amountUsd: 18 * B, description: 'Four-part offering ahead of the OpenAI capacity build.', confidence: 'high' },
  { id: 'alphabet-bond-2025-11', issuer: 'alphabet', date: '2025-11-04', instrument: 'bond', amountUsd: 25 * B, description: 'Dual-currency issuance across US dollar and euro tranches.', confidence: 'medium' },
  { id: 'amazon-bond-2025-12', issuer: 'amazon', date: '2025-12-01', instrument: 'bond', amountUsd: 15 * B, description: 'First major issuance since 2022, funding AWS capacity.', confidence: 'medium' },
  { id: 'microsoft-bond-2025', issuer: 'microsoft', date: '2025-09-01', instrument: 'bond', amountUsd: 10 * B, description: 'Issuance supporting Azure buildout.', confidence: 'medium' },

  { id: 'coreweave-ddtl2', issuer: 'coreweave', date: '2024-05-17', instrument: 'term-loan', amountUsd: 7.5 * B, collateral: 'GPUs and customer contracts', counterparties: ['Blackstone', 'Magnetar'], description: 'GPU-backed delayed-draw term loan — the template for neocloud debt.', confidence: 'high' },
  { id: 'coreweave-notes-2025', issuer: 'coreweave', date: '2025-05-20', instrument: 'bond', amountUsd: 2 * B, description: 'High-yield senior notes.', confidence: 'high' },
  { id: 'xai-debt-2025', issuer: 'xai', date: '2025-06-25', instrument: 'term-loan', amountUsd: 5 * B, counterparties: ['Morgan Stanley'], description: 'Debt package funding the Colossus cluster.', confidence: 'high' },
  { id: 'xai-colossus-spv', issuer: 'xai', date: '2025-10-01', instrument: 'spv', amountUsd: 12.5 * B, collateral: 'GPUs', counterparties: ['Valor', 'NVIDIA'], description: 'SPV holding GPUs for Colossus 2, with NVIDIA participating.', confidence: 'medium' },
  { id: 'nebius-convertible-2025', issuer: 'nebius', date: '2025-09-01', instrument: 'convertible', amountUsd: 3 * B, description: 'Convertible notes funding GPU purchases against a Microsoft capacity contract.', confidence: 'medium' },
  { id: 'applied-digital-2025', issuer: 'applied-digital', date: '2025-06-01', instrument: 'credit-facility', amountUsd: 5 * B, counterparties: ['Macquarie'], description: 'Perpetual preferred and project financing for HPC campuses.', confidence: 'medium' },
  { id: 'vantage-frontier-2025', issuer: 'vantage', date: '2025-10-01', instrument: 'abs', amountUsd: 25 * B, collateral: 'Data center assets', counterparties: ['Silver Lake', 'DigitalBridge'], description: 'Frontier campus financing, among the largest private data center packages raised.', confidence: 'medium' },
];
