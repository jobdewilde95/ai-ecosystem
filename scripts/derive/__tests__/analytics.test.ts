import { describe, it, expect } from 'vitest';
import {
  ttm,
  capexCoverage,
  capexIntensity,
  depreciationDrag,
  interestBurden,
  nearTermRefinancingRisk,
  intelligencePerDollar,
  frontierCostCurve,
  circularityExposure,
  basketRelativeStrength,
  type Fact,
  type PricedModel,
} from '../analytics.js';

const quarters = (values: number[]): Fact[] =>
  values.map((value, index) => ({ end: `202${index}-03-31`, value }));

describe('ttm', () => {
  it('sums the last four quarters', () => {
    expect(ttm(quarters([1, 2, 3, 4, 5]))).toBe(14);
  });

  it('returns null below four quarters rather than a misleading partial sum', () => {
    expect(ttm(quarters([1, 2, 3]))).toBeNull();
    expect(ttm(undefined)).toBeNull();
  });
});

describe('capexCoverage', () => {
  it('reports the ratio of operating cash flow to capex', () => {
    const result = capexCoverage(quarters([25, 25, 25, 25]), quarters([10, 10, 10, 10]));
    expect(result.value).toBeCloseTo(2.5);
    expect(result.inputs.ttmOperatingCashFlow).toBe(100);
  });

  it('flags a buildout that operations cannot fund', () => {
    const result = capexCoverage(quarters([10, 10, 10, 10]), quarters([20, 20, 20, 20]));
    expect(result.value).toBeCloseTo(0.5);
    expect(result.caveat).toMatch(/exceeds/);
  });

  it('avoids dividing by zero capex', () => {
    expect(capexCoverage(quarters([1, 1, 1, 1]), quarters([0, 0, 0, 0])).value).toBeNull();
  });
});

describe('capexIntensity', () => {
  it('expresses capex as a percentage of revenue', () => {
    expect(capexIntensity(quarters([5, 5, 5, 5]), quarters([25, 25, 25, 25])).value).toBeCloseTo(20);
  });
});

describe('depreciationDrag', () => {
  it('is positive when D&A outgrows revenue', () => {
    // D&A doubles year over year; revenue grows 10%.
    const da = quarters([10, 10, 10, 10, 20, 20, 20, 20]);
    const revenue = quarters([100, 100, 100, 100, 110, 110, 110, 110]);
    const result = depreciationDrag(da, revenue);
    expect(result.value).toBeCloseTo(90);
    expect(result.caveat).toMatch(/faster than revenue/);
  });

  it('needs two full years before it will answer', () => {
    expect(depreciationDrag(quarters([1, 1, 1, 1]), quarters([1, 1, 1, 1])).value).toBeNull();
  });
});

describe('interestBurden', () => {
  it('measures interest against operating income', () => {
    const result = interestBurden(quarters([10, 10, 10, 10]), quarters([100, 100, 100, 100]));
    expect(result.value).toBeCloseTo(10);
    expect(result.caveat).toBeUndefined();
  });

  it('flags a burden above a quarter of operating income', () => {
    expect(interestBurden(quarters([30, 30, 30, 30]), quarters([100, 100, 100, 100])).caveat)
      .toMatch(/quarter of operating income/);
  });

  it('declines to divide by non-positive operating income', () => {
    expect(interestBurden(quarters([1, 1, 1, 1]), quarters([-5, -5, -5, -5])).value).toBeNull();
  });
});

describe('nearTermRefinancingRisk', () => {
  it('compares maturities against cash and flags a shortfall', () => {
    const result = nearTermRefinancingRisk(
      [{ end: '2026-06-30', value: 20 }],
      [{ end: '2026-06-30', value: 10 }],
    );
    expect(result.value).toBeCloseTo(2);
    expect(result.caveat).toMatch(/exceed cash/);
  });
});

describe('intelligencePerDollar', () => {
  it('divides the index by blended price', () => {
    const model: PricedModel = {
      id: 'a', name: 'A', creator: 'lab', blended3to1: 4, intelligenceIndex: 40,
    };
    expect(intelligencePerDollar(model).value).toBeCloseTo(10);
  });

  it('returns null for a free model rather than infinity', () => {
    const model: PricedModel = {
      id: 'a', name: 'A', creator: 'lab', blended3to1: 0, intelligenceIndex: 40,
    };
    expect(intelligencePerDollar(model).value).toBeNull();
  });
});

describe('frontierCostCurve', () => {
  const models: PricedModel[] = [
    { id: '1', name: 'Old', creator: 'x', blended3to1: 30, intelligenceIndex: 50, releaseDate: '2024-01-15' },
    { id: '2', name: 'Mid', creator: 'y', blended3to1: 10, intelligenceIndex: 55, releaseDate: '2024-06-02' },
    { id: '3', name: 'Cheap', creator: 'z', blended3to1: 2, intelligenceIndex: 60, releaseDate: '2025-02-20' },
    { id: '4', name: 'Weak', creator: 'w', blended3to1: 1, intelligenceIndex: 20, releaseDate: '2025-03-01' },
  ];

  it('tracks the cheapest model clearing the quality bar', () => {
    const curve = frontierCostCurve(models, 50);
    expect(curve.map((point) => point.cheapestPerMtok)).toEqual([30, 10, 2]);
    expect(curve.at(-1)?.model).toBe('Cheap');
  });

  it('excludes cheap models that miss the quality bar', () => {
    expect(frontierCostCurve(models, 50).some((point) => point.model === 'Weak')).toBe(false);
  });

  it('never rises: a price once available stays available', () => {
    const curve = frontierCostCurve(models, 50);
    const prices = curve.map((point) => point.cheapestPerMtok);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });
});

describe('circularityExposure', () => {
  it('reports the circular share of disclosed inbound capital', () => {
    const result = circularityExposure('lab', [
      { from: 'chipmaker', to: 'lab', type: 'investment', amountUsd: 75, circular: true },
      { from: 'fund', to: 'lab', type: 'investment', amountUsd: 25, circular: false },
      { from: 'lab', to: 'cloud', type: 'compute-commitment', amountUsd: 500, circular: true },
    ]);
    // Only inbound edges count; the lab's own outbound commitment is excluded.
    expect(result.value).toBeCloseTo(75);
    expect(result.inputs.dealCount).toBe(2);
  });

  it('always states the disclosure limit', () => {
    expect(circularityExposure('x', []).caveat).toMatch(/disclosed deals only/);
  });
});

describe('basketRelativeStrength', () => {
  const summary = (ticker: string, y1: number) => ({
    ticker,
    returns: { d1: null, m1: null, m3: null, y1, ytd: null },
    maxDrawdownPct: null,
  });

  it('subtracts the benchmark from the equal-weighted basket', () => {
    const result = basketRelativeStrength(
      [summary('A', 30), summary('B', 10)],
      summary('SPY', 12),
      'y1',
    );
    expect(result.value).toBeCloseTo(8);
    expect(result.inputs.constituents).toBe(2);
  });

  it('notes when constituents are missing data', () => {
    const missing = { ticker: 'C', returns: { d1: null, m1: null, m3: null, y1: null, ytd: null }, maxDrawdownPct: null };
    const result = basketRelativeStrength([summary('A', 30), missing], summary('SPY', 10), 'y1');
    expect(result.caveat).toMatch(/1 constituents lack data/);
  });
});

describe('capexCoverage with negative operating cash flow', () => {
  it('distinguishes cash-consuming operations from merely out-spending them', () => {
    const result = capexCoverage(quarters([-10, -10, -10, -10]), quarters([1, 1, 1, 1]));
    expect(result.value).toBeCloseTo(-10);
    expect(result.caveat).toMatch(/consumed cash/);
  });
});
