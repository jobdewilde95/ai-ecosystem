/**
 * Supply-chain layers, ordered upstream to downstream.
 *
 * This ordering is the backbone of the supply-chain view: capital and physical
 * goods flow down it, and constraints propagate up it. The registry tags each
 * company with one or more layers; everything else joins through those tags.
 */
export const LAYER_ORDER = [
  'equipment',
  'memory',
  'foundry',
  'silicon',
  'networking',
  'systems',
  'datacenter',
  'power',
  'cloud',
  'labs',
  'infra-software',
  'applications',
  'data-labeling',
] as const;

export type Layer = (typeof LAYER_ORDER)[number];

export const LAYER_LABELS: Record<string, string> = {
  equipment: 'Equipment & EDA',
  memory: 'Memory / HBM',
  foundry: 'Foundry & packaging',
  silicon: 'Accelerators',
  networking: 'Networking & optics',
  systems: 'Servers & ODM',
  datacenter: 'Data centers',
  power: 'Power & energy',
  cloud: 'Clouds & neoclouds',
  labs: 'Model labs',
  'infra-software': 'Infra software',
  applications: 'Applications',
  'data-labeling': 'Data & labeling',
};

export const LAYER_DESCRIPTIONS: Record<string, string> = {
  equipment: 'Lithography, deposition, etch, test and the EDA tools chips are designed in.',
  memory: 'High-bandwidth memory stacked beside the accelerator die.',
  foundry: 'Leading-edge fabrication and the advanced packaging that binds compute to memory.',
  silicon: 'The accelerators themselves, merchant and custom.',
  networking: 'Switching, optics and interconnect that turn chips into a cluster.',
  systems: 'Integration of silicon into racks and the ODMs that build them.',
  datacenter: 'The buildings, power distribution and cooling the racks sit in.',
  power: 'Generation, grid equipment and the interconnect queue that gates everything downstream.',
  cloud: 'Operators selling compute: hyperscalers and the neoclouds built on borrowed capital.',
  labs: 'Organisations training frontier models and selling access to them.',
  'infra-software': 'Serving, orchestration, data platforms and the tooling around deployment.',
  applications: 'Products people buy, where inference spend has to turn into revenue.',
  'data-labeling': 'Human data and evaluation feeding the training loop.',
};

/** Fixed colour slot per layer so a layer keeps its identity across every view. */
export const layerColorIndex = (layer: string): number => {
  const index = LAYER_ORDER.indexOf(layer as Layer);
  return index >= 0 ? index % 8 : 0;
};
