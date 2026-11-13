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
    shortLabel: 'Produção',
    unit: 't',
    aggregation: 'sum',
    higherIsBetter: true,
    decimals: 1,
    definition: 'Massa diária beneficiada ou fundida na planta (toneladas métricas)',
  },
  OEE: {
    key: 'OEE',
    shortLabel: 'OEE',
    unit: '%',
    aggregation: 'mean',
    higherIsBetter: true,
    decimals: 1,
    definition: 'Eficiência global do equipamento (Disponibilidade × Performance × Qualidade)',
    target: 85.0,
  },
  Disponibilidade: {
    key: 'Disponibilidade',
    shortLabel: 'Disponibilidade',
    unit: '%',
    aggregation: 'mean',
    higherIsBetter: true,
    decimals: 1,
    definition: 'Tempo operacional efetivo dividido pelo tempo calendário programado (%)',
    target: 92.0,
  },
  Qualidade: {
    key: 'Qualidade',
    shortLabel: 'Qualidade',
    unit: '%',
    aggregation: 'mean',
    higherIsBetter: true,
    decimals: 2,
    definition: 'Rendimento metalúrgico de primeira passagem dentro da especificação (%)',
    target: 98.0,
  },
  'Consumo especifico': {
    key: 'Consumo especifico',
    shortLabel: 'Consumo específico',
    unit: 'MWh/t',
    aggregation: 'mean',
    higherIsBetter: false,
    decimals: 2,
    definition: 'Energia elétrica e térmica consumida por tonelada produzida (MWh/t)',
  },
  Custos: {
    key: 'Custos',
    shortLabel: 'Custos',
    unit: 'R$/t',
    aggregation: 'mean',
    higherIsBetter: false,
    decimals: 0,
    definition: 'Custo operacional unitário de transformação industrial (BRL por tonelada)',
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
