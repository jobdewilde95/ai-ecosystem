import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatTile } from '@/components/ui/StatTile';
import { SeededTag } from '@/components/ui/Provenance';
import { getCapital, getCompanies, getSupplyChain } from '@/lib/data';
import { LAYER_DESCRIPTIONS, LAYER_LABELS, LAYER_ORDER } from '@/lib/layers';
import { usdCompact } from '@/lib/format';
import { LayerMap } from './LayerMap';
import { DealGraph } from './DealGraph';

export const metadata = { title: 'Supply chain · AI Ecosystem' };

export default function SupplyChainPage() {
  const layers = getSupplyChain();
  const companies = getCompanies();
  const capital = getCapital();

  // Ordered upstream to downstream: capital and goods flow down it, and
  // constraints propagate back up it.
  const ordered = LAYER_ORDER.map((layer) => layers.find((entry) => entry.layer === layer)).filter(
    (entry): entry is NonNullable<typeof entry> => Boolean(entry),
  );

  const bottlenecks = companies.filter((company) => company.tags.includes('bottleneck'));
  const totalCapex = ordered.reduce((sum, layer) => sum + layer.ttmCapex, 0);

  return (
    <>
      <PageHeader
        title="Supply chain"
        lede={
          <>
            {companies.length} companies across {ordered.length} layers, from the lithography that
            makes the silicon possible to the applications that have to turn inference into
            revenue. Listed names carry live prices and filed fundamentals; private ones carry
            curated valuations.
          </>
        }
        aside={<SeededTag>curated registry</SeededTag>}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Companies tracked"
          value={companies.length}
          note={`${companies.filter((c) => c.type === 'public').length} listed · ${companies.filter((c) => c.type === 'private').length} private`}
        />
        <StatTile
          label="Flagged bottlenecks"
          value={bottlenecks.length}
          tone="warning"
          note="Points where capacity, not capital, is the binding constraint"
        />
        <StatTile
          label="Tracked TTM capex"
          value={usdCompact(totalCapex, 0)}
          note="Across listed companies with SEC filings"
        />
        <StatTile
          label="Deals mapped"
          value={capital.deals.length}
          note={`${capital.deals.filter((d) => d.circular).length} route capital back to a supplier`}
        />
      </div>

      <div className="mb-6">
        <Card
          title="The chain, upstream to downstream"
          subtitle="Each layer depends on the one above it. Expand a layer to see its companies, and where the constraint sits."
        >
          <LayerMap
            layers={ordered.map((layer) => ({
              layer: layer.layer,
              label: LAYER_LABELS[layer.layer] ?? layer.layer,
              description: LAYER_DESCRIPTIONS[layer.layer] ?? '',
              publicCount: layer.publicCount,
              privateCount: layer.privateCount,
              bottleneckCount: layer.bottleneckCount,
              ttmCapex: layer.ttmCapex,
              returnYtd: layer.basket?.averageReturns.ytd ?? null,
              relativeYtd: layer.basket?.relativeStrength.ytd.value ?? null,
              companies: layer.companies,
            }))}
          />
        </Card>
      </div>

      <Card
        title="Deal graph"
        subtitle="Who funds, supplies and commits compute to whom. Edges pointing back at a supplier are what makes the demand question hard to answer from the outside."
      >
        <DealGraph deals={capital.deals} />
      </Card>

      <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-muted)]">
        Layer assignments are editorial: several companies genuinely sit in more than one and are
        counted in each. Bottleneck flags mark where reporting consistently identifies capacity
        rather than capital as the constraint — advanced packaging, HBM supply, grid interconnect
        and turbine lead times — and are a judgement, not a measurement.
      </p>
    </>
  );
}
