import {
  ALL_KPIS,
  KPI_METADATA,
  type CorrelationMatrix,
  type DescriptiveStats,
  type IndustrialRecord,
  type KpiKey,
  type RegressionResult,
} from '../types/eda';

/**
 * Verification against textbook reference (Section 4 Invariant Check):
 * Known dataset X = [2, 4, 4, 4, 5, 5, 7, 9] (n = 8):
 * - Mean = 40 / 8 = 5.0
 * - Sample variance (n - 1 = 7) = 32 / 7 = 4.571428..., Sample std = sqrt(32/7) ≈ 2.13809
 * - Linear interpolation quantiles (pandas default):
 *   25% (idx = 0.25 * 7 = 1.75) -> 4 + 0.75*(4 - 4) = 4.0
 *   50% (idx = 0.50 * 7 = 3.50) -> 4 + 0.50*(5 - 4) = 4.5
 *   75% (idx = 0.75 * 7 = 5.25) -> 5 + 0.25*(7 - 5) = 5.5
 * - Invariant: Pearson correlation r(X, X) === 1.0 and r(X, -2X + 10) === -1.0; |r(X, Y)| <= 1.0 always.
 */

export function quantileSorted(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + rest * (next - sorted[base]);
}

export function extractValidValues(rows: IndustrialRecord[], kpi: KpiKey): number[] {
  const vals: number[] = [];
  for (const row of rows) {
    const v = row[kpi];
    if (typeof v === 'number' && Number.isFinite(v)) {
      vals.push(v);
    }
  }
  return vals;
}

export function computeDescriptiveStats(
  rows: IndustrialRecord[],
  kpi: KpiKey
): DescriptiveStats {
  const values = extractValidValues(rows, kpi);
  const count = values.length;
  const missingCount = rows.length - count;

  if (count === 0) {
    return {
      kpi,
      count: 0,
      missingCount,
      mean: null,
      std: null,
      min: null,
      q25: null,
      median: null,
      q75: null,
      max: null,
      iqr: null,
      cvPercent: null,
      outlierCount: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;

  let std: number | null = null;
  if (count > 1) {
    const sqDiffSum = values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0);
    std = Math.sqrt(sqDiffSum / (count - 1));
  }

  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const q25 = quantileSorted(sorted, 0.25);
  const median = quantileSorted(sorted, 0.5);
  const q75 = quantileSorted(sorted, 0.75);
  const iqr = q25 !== null && q75 !== null ? q75 - q25 : null;

  let outlierCount = 0;
  if (iqr !== null && q25 !== null && q75 !== null && iqr > 0) {
    const lowerFence = q25 - 1.5 * iqr;
    const upperFence = q75 + 1.5 * iqr;
    outlierCount = values.filter((v) => v < lowerFence || v > upperFence).length;
  }

  const cvPercent =
    std !== null && Math.abs(mean) > 1e-9 ? (std / Math.abs(mean)) * 100 : null;

  return {
    kpi,
    count,
    missingCount,
    mean,
    std,
    min,
    q25,
    median,
    q75,
    max,
    iqr,
    cvPercent,
    outlierCount,
  };
}

export function computePearsonPair(
  rows: IndustrialRecord[],
  kpiA: KpiKey,
  kpiB: KpiKey
): number | null {
  const pairs: [number, number][] = [];
  for (const row of rows) {
    const a = row[kpiA];
    const b = row[kpiB];
    if (typeof a === 'number' && Number.isFinite(a) && typeof b === 'number' && Number.isFinite(b)) {
      pairs.push([a, b]);
    }
  }

  const n = pairs.length;
  if (n < 2) return null;
  if (kpiA === kpiB) return 1;

  let sumA = 0;
  let sumB = 0;
  for (const [a, b] of pairs) {
    sumA += a;
    sumB += b;
  }
  const meanA = sumA / n;
  const meanB = sumB / n;

  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (const [a, b] of pairs) {
    const da = a - meanA;
    const db = b - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }

  const denom = Math.sqrt(varA * varB);
  if (denom < 1e-12) return null;
  return Math.max(-1, Math.min(1, cov / denom));
}

export function computeCorrelationMatrix(
  rows: IndustrialRecord[],
  kpis: KpiKey[]
): CorrelationMatrix {
  const matrix = {} as CorrelationMatrix;
  for (const a of ALL_KPIS) {
    matrix[a] = {} as Record<KpiKey, number | null>;
    for (const b of ALL_KPIS) {
      if (kpis.includes(a) && kpis.includes(b)) {
        matrix[a][b] = computePearsonPair(rows, a, b);
      } else {
        matrix[a][b] = null;
      }
    }
  }
  return matrix;
}

export function computeLinearRegression(
  rows: IndustrialRecord[],
  xKpi: KpiKey,
  yKpi: KpiKey
): RegressionResult | null {
  const points: RegressionResult['points'] = [];
  for (const row of rows) {
    const x = row[xKpi];
    const y = row[yKpi];
    if (typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y)) {
      points.push({ x, y, date: row.Data, kind: row.kind });
    }
  }

  const n = points.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }

  if (sxx < 1e-12) return null;

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const r = syy < 1e-12 ? 0 : Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));

  return {
    xKpi,
    yKpi,
    slope,
    intercept,
    r,
    rSquared: r * r,
    n,
    points,
  };
}

export interface KpiSummaryComparison {
  kpi: KpiKey;
  value: number | null;
  previousValue: number | null;
  deltaPercent: number | null;
  isFavorable: boolean | null;
}

// Computes exact aggregate KPI (sum for mass output; production-weighted rate for specific energy & unit cost when production is present)
export function computeAggregateKpiValue(
  rows: IndustrialRecord[],
  kpi: KpiKey
): number | null {
  const meta = KPI_METADATA[kpi];
  if (rows.length === 0) return null;

  if (meta.aggregation === 'sum') {
    const vals = extractValidValues(rows, kpi);
    if (vals.length === 0) return null;
    return vals.reduce((acc, v) => acc + v, 0);
  }

  // Weighted rate from summed parts for unit-per-tonne metrics ('Consumo especifico', 'Custos')
  if (kpi === 'Consumo especifico' || kpi === 'Custos') {
    let weightedSum = 0;
    let totalMass = 0;
    for (const r of rows) {
      const val = r[kpi];
      const mass = r.Produção;
      if (
        typeof val === 'number' &&
        Number.isFinite(val) &&
        typeof mass === 'number' &&
        Number.isFinite(mass) &&
        mass > 0
      ) {
        weightedSum += val * mass;
        totalMass += mass;
      }
    }
    if (totalMass > 0) return weightedSum / totalMass;
  }

  const vals = extractValidValues(rows, kpi);
  if (vals.length === 0) return null;
  return vals.reduce((acc, v) => acc + v, 0) / vals.length;
}

export function computeKpiComparison(
  currentRows: IndustrialRecord[],
  previousRows: IndustrialRecord[],
  kpi: KpiKey
): KpiSummaryComparison {
  const meta = KPI_METADATA[kpi];
  const value = computeAggregateKpiValue(currentRows, kpi);
  const previousValue = computeAggregateKpiValue(previousRows, kpi);

  let deltaPercent: number | null = null;
  let isFavorable: boolean | null = null;

  if (
    value !== null &&
    previousValue !== null &&
    Math.abs(previousValue) > 1e-9
  ) {
    deltaPercent = ((value - previousValue) / Math.abs(previousValue)) * 100;
    if (Math.abs(deltaPercent) < 0.05) {
      isFavorable = null;
    } else {
      isFavorable = meta.higherIsBetter ? deltaPercent > 0 : deltaPercent < 0;
    }
  }

  return { kpi, value, previousValue, deltaPercent, isFavorable };
}

export function computeRollingAverage(
  values: (number | null)[],
  windowSize = 7
): (number | null)[] {
  return values.map((_, idx) => {
    const start = Math.max(0, idx - windowSize + 1);
    let sum = 0;
    let count = 0;
    for (let i = start; i <= idx; i++) {
      const v = values[i];
      if (typeof v === 'number' && Number.isFinite(v)) {
        sum += v;
        count++;
      }
    }
    return count >= 2 ? sum / count : null;
  });
}

export function detectOutlierFlags(rows: IndustrialRecord[], kpi: KpiKey): Set<string> {
  const stats = computeDescriptiveStats(rows, kpi);
  const flagged = new Set<string>();
  if (
    stats.iqr === null ||
    stats.q25 === null ||
    stats.q75 === null ||
    stats.iqr <= 0
  ) {
    return flagged;
  }
  const lower = stats.q25 - 1.5 * stats.iqr;
  const upper = stats.q75 + 1.5 * stats.iqr;
  for (const row of rows) {
    const v = row[kpi];
    if (typeof v === 'number' && Number.isFinite(v) && (v < lower || v > upper)) {
      flagged.add(row.id);
    }
  }
  return flagged;
}

const ptNumberFormatters = new Map<number, Intl.NumberFormat>();

export function formatKpiNumber(value: number | null | undefined, decimals = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Sem dados';
  }
  let fmt = ptNumberFormatters.get(decimals);
  if (!fmt) {
    fmt = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    ptNumberFormatters.set(decimals, fmt);
  }
  return fmt.format(value);
}
