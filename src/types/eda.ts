export type KpiKey =
  | 'Produção'
  | 'OEE'
  | 'Disponibilidade'
  | 'Qualidade'
  | 'Consumo especifico'
  | 'Custos';

export const ALL_KPIS: KpiKey[] = [
  'Produção',
  'OEE',
  'Disponibilidade',
  'Qualidade',
  'Consumo especifico',
  'Custos',
];

export interface KpiMetadata {
  key: KpiKey;
  shortLabel: string;
  unit: string;
  aggregation: 'sum' | 'mean';
  higherIsBetter: boolean;
  decimals: number;
  definition: string;
  target?: number;
}

export const KPI_METADATA: Record<KpiKey, KpiMetadata> = {
  Produção: {
    key: 'Produção',
    shortLabel: 'Production',
    unit: 't',
    aggregation: 'sum',
    higherIsBetter: true,
    decimals: 1,
    definition: 'Daily plant throughput mass (metric tonnes)',
  },
  OEE: {
    key: 'OEE',
    shortLabel: 'OEE',
    unit: '%',
    aggregation: 'mean',
    higherIsBetter: true,
    decimals: 1,
    definition: 'Overall Equipment Effectiveness (Availability × Performance × Quality)',
    target: 85.0,
  },
  Disponibilidade: {
    key: 'Disponibilidade',
    shortLabel: 'Availability',
    unit: '%',
    aggregation: 'mean',
    higherIsBetter: true,
    decimals: 1,
    definition: 'Effective operating time divided by scheduled calendar time (%)',
    target: 92.0,
  },
  Qualidade: {
    key: 'Qualidade',
    shortLabel: 'Quality',
    unit: '%',
    aggregation: 'mean',
    higherIsBetter: true,
    decimals: 2,
    definition: 'First-pass metallurgical yield within specification (%)',
    target: 98.0,
  },
  'Consumo especifico': {
    key: 'Consumo especifico',
    shortLabel: 'Specific Energy',
    unit: 'MWh/t',
    aggregation: 'mean',
    higherIsBetter: false,
    decimals: 2,
    definition: 'Electrical and thermal energy consumed per tonne produced (MWh/t)',
  },
  Custos: {
    key: 'Custos',
    shortLabel: 'Unit Cost',
    unit: 'R$/t',
    aggregation: 'mean',
    higherIsBetter: false,
    decimals: 0,
    definition: 'Industrial transformation cost per metric tonne (BRL/t)',
  },
};

export interface IndustrialRecord {
  id: string;
  Data: string; // YYYY-MM-DD local date string
  Gerencia: string;
  Planta: string;
  Produção: number | null;
  OEE: number | null;
  Disponibilidade: number | null;
  Qualidade: number | null;
  'Consumo especifico': number | null;
  Custos: number | null;
  kind: 'measured' | 'simulated';
}

export interface DescriptiveStats {
  kpi: KpiKey;
  count: number;
  missingCount: number;
  mean: number | null;
  std: number | null;
  min: number | null;
  q25: number | null;
  median: number | null;
  q75: number | null;
  max: number | null;
  iqr: number | null;
  cvPercent: number | null;
  outlierCount: number;
}

export type CorrelationMatrix = Record<KpiKey, Record<KpiKey, number | null>>;

export interface RegressionResult {
  xKpi: KpiKey;
  yKpi: KpiKey;
  slope: number;
  intercept: number;
  r: number;
  rSquared: number;
  n: number;
  points: { x: number; y: number; date: string; kind: 'measured' | 'simulated' }[];
}

export type ThemeMode = 'light' | 'dark';
export type LanguageMode = 'en' | 'pt';

export enum WorkspaceView {
  OVERVIEW = 'overview',
  CORRELATION = 'correlation',
  DATASET = 'dataset',
}

export interface FilterState {
  gerencia: string;
  planta: string;
  kpis: KpiKey[];
  startDate: string;
  endDate: string;
}
