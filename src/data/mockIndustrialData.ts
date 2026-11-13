import type { IndustrialRecord } from '../types/eda';

export interface PlantProfile {
  gerencia: string;
  planta: string;
  baseProductionTonnes: number;
  baseAvailability: number;
  basePerformance: number;
  baseQuality: number;
  baseEnergyMwhPerTonne: number;
  baseCostBrlPerTonne: number;
  maintenanceDayOffsets: number[];
}

export const PLANT_PROFILES: PlantProfile[] = [
  {
    gerencia: 'Gerência de Mineração e Beneficiamento',
    planta: 'Planta Concentração Magnética',
    baseProductionTonnes: 640,
    baseAvailability: 93.2,
    basePerformance: 92.5,
    baseQuality: 98.4,
    baseEnergyMwhPerTonne: 1.42,
    baseCostBrlPerTonne: 1280,
    maintenanceDayOffsets: [24, 68, 103],
  },
  {
    gerencia: 'Gerência de Mineração e Beneficiamento',
    planta: 'Planta Flotação Industrial',
    baseProductionTonnes: 515,
    baseAvailability: 91.5,
    basePerformance: 90.8,
    baseQuality: 97.6,
    baseEnergyMwhPerTonne: 1.88,
    baseCostBrlPerTonne: 1640,
    maintenanceDayOffsets: [17, 59, 95],
  },
  {
    gerencia: 'Gerência de Mineração e Beneficiamento',
    planta: 'Planta Britagem e Moagem SAG',
    baseProductionTonnes: 890,
    baseAvailability: 90.4,
    basePerformance: 93.1,
    baseQuality: 98.9,
    baseEnergyMwhPerTonne: 1.18,
    baseCostBrlPerTonne: 980,
    maintenanceDayOffsets: [31, 77],
  },
  {
    gerencia: 'Gerência de Metalurgia e Refino',
    planta: 'Planta Pirometalurgia Linha A',
    baseProductionTonnes: 310,
    baseAvailability: 92.8,
    basePerformance: 93.4,
    baseQuality: 98.7,
    baseEnergyMwhPerTonne: 3.65,
    baseCostBrlPerTonne: 4420,
    maintenanceDayOffsets: [19, 62, 108],
  },
  {
    gerencia: 'Gerência de Metalurgia e Refino',
    planta: 'Planta Fornos Elétricos de Redução',
    baseProductionTonnes: 275,
    baseAvailability: 89.8,
    basePerformance: 91.6,
    baseQuality: 98.1,
    baseEnergyMwhPerTonne: 4.48,
    baseCostBrlPerTonne: 5180,
    maintenanceDayOffsets: [12, 48, 89],
  },
  {
    gerencia: 'Gerência de Metalurgia e Refino',
    planta: 'Planta Lixiviação e Calcinação',
    baseProductionTonnes: 410,
    baseAvailability: 92.1,
    basePerformance: 91.2,
    baseQuality: 97.9,
    baseEnergyMwhPerTonne: 2.34,
    baseCostBrlPerTonne: 2890,
    maintenanceDayOffsets: [28, 74],
  },
  {
    gerencia: 'Gerência de Manufatura e Materiais Avançados',
    planta: 'Planta Óxidos Técnicos — Linha 01',
    baseProductionTonnes: 148,
    baseAvailability: 94.1,
    basePerformance: 93.8,
    baseQuality: 99.15,
    baseEnergyMwhPerTonne: 2.95,
    baseCostBrlPerTonne: 6340,
    maintenanceDayOffsets: [36, 84],
  },
  {
    gerencia: 'Gerência de Manufatura e Materiais Avançados',
    planta: 'Planta Ligas Especiais Alto Vácuo',
    baseProductionTonnes: 64,
    baseAvailability: 91.2,
    basePerformance: 90.4,
    baseQuality: 99.35,
    baseEnergyMwhPerTonne: 5.75,
    baseCostBrlPerTonne: 9450,
    maintenanceDayOffsets: [22, 65, 101],
  },
];

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function formatShortPtDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

export function formatShortDate(dateStr: string, lang: 'en' | 'pt' = 'en'): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return lang === 'pt' ? `${parts[2]}/${parts[1]}` : `${parts[1]}/${parts[2]}`;
}

export function formatFullPtDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatFullDate(dateStr: string, lang: 'en' | 'pt' = 'en'): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return lang === 'pt'
    ? `${parts[2]}/${parts[1]}/${parts[0]}`
    : `${parts[1]}/${parts[2]}/${parts[0]}`;
}

// Deterministic pseudo-random generator so initial seeded records are reproducible and realistic
function seededNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function generateInitialIndustrialDataset(days = 120): IndustrialRecord[] {
  const now = new Date();
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const records: IndustrialRecord[] = [];

  PLANT_PROFILES.forEach((profile, plantIdx) => {
    for (let offset = days - 1; offset >= 0; offset--) {
      const d = new Date(
        todayLocal.getFullYear(),
        todayLocal.getMonth(),
        todayLocal.getDate() - offset
      );
      const dateStr = formatLocalDate(d);
      const dayNumber = days - 1 - offset;
      const seedBase = (plantIdx + 1) * 1009 + dayNumber * 37;

      const n1 = seededNoise(seedBase) - 0.5;
      const n2 = seededNoise(seedBase + 13) - 0.5;
      const n3 = seededNoise(seedBase + 29) - 0.5;
      const n4 = seededNoise(seedBase + 53) - 0.5;

      // Gradual process optimization drift + weekly ore/campaign wave
      const campaignWave = Math.sin((dayNumber / 18) * Math.PI * 2) * 2.1;
      const improvementTrend = (dayNumber / days) * 1.8;

      // Planned refractory / mechanical maintenance turnaround dip
      const isMaintenance = profile.maintenanceDayOffsets.some(
        (mDay) => Math.abs(dayNumber - mDay) <= 1
      );
      const maintenancePenalty = isMaintenance ? -13.5 + n1 * 3 : 0;

      const disponibilidade = Number(
        clamp(
          profile.baseAvailability +
            campaignWave * 0.85 +
            improvementTrend * 0.55 +
            maintenancePenalty +
            n1 * 4.2,
          64.0,
          99.2
        ).toFixed(2)
      );

      const performance = clamp(
        profile.basePerformance +
          campaignWave * 0.65 +
          improvementTrend * 0.45 +
          (isMaintenance ? -5.5 : 0) +
          n2 * 3.8,
        72.0,
        99.0
      );

      const qualidade = Number(
        clamp(
          profile.baseQuality +
            improvementTrend * 0.22 +
            (isMaintenance ? -1.35 : 0) +
            n3 * 1.15,
          93.5,
          99.9
        ).toFixed(2)
      );

      // Physical OEE identity: Disponibilidade * Performance * Qualidade
      const oee = Number(
        clamp((disponibilidade * performance * qualidade) / 10000, 48.0, 97.5).toFixed(2)
      );

      // Production scales directly with OEE relative to baseline OEE
      const baselineOee =
        (profile.baseAvailability * profile.basePerformance * profile.baseQuality) / 10000;
      const throughputRatio = oee / baselineOee;
      const producao = Number(
        Math.max(
          12,
          profile.baseProductionTonnes * throughputRatio * (1 + n2 * 0.045)
        ).toFixed(1)
      );

      // Specific energy consumption rises when throughput drops (fixed thermal losses in furnaces/mills)
      const invEfficiencyFactor = Math.pow(baselineOee / Math.max(oee, 50), 0.58);
      const consumoEspecifico = Number(
        Math.max(
          0.65,
          profile.baseEnergyMwhPerTonne * invEfficiencyFactor * (1 + n4 * 0.055)
        ).toFixed(2)
      );

      // Transformation unit cost correlates positively with specific energy & maintenance events
      const energyRatio = consumoEspecifico / profile.baseEnergyMwhPerTonne;
      const reworkFactor = (100 - qualidade) * 0.018;
      const custos = Math.round(
        profile.baseCostBrlPerTonne *
          (0.46 + 0.54 * energyRatio + reworkFactor + (isMaintenance ? 0.08 : 0)) *
          (1 + n3 * 0.035)
      );

      records.push({
        id: `${plantIdx}-${dateStr}`,
        Data: dateStr,
        Gerencia: profile.gerencia,
        Planta: profile.planta,
        Produção: producao,
        OEE: oee,
        Disponibilidade: disponibilidade,
        Qualidade: qualidade,
        'Consumo especifico': consumoEspecifico,
        Custos: custos,
        kind: 'measured',
      });
    }
  });

  return records;
}

export function generateRealtimeShiftTick(
  lastRecord: IndustrialRecord | undefined,
  gerencia: string,
  planta: string,
  tickCount: number
): IndustrialRecord {
  const profile =
    PLANT_PROFILES.find((p) => p.gerencia === gerencia && p.planta === planta) ??
    PLANT_PROFILES[3];

  const baseDate = lastRecord ? parseLocalDate(lastRecord.Data) : new Date();
  const nextDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + 1
  );
  const dateStr = formatLocalDate(nextDate);

  const jitter1 = (Math.random() - 0.48) * 3.4;
  const jitter2 = (Math.random() - 0.48) * 2.8;
  const jitter3 = (Math.random() - 0.49) * 0.75;

  const prevDisp = lastRecord?.Disponibilidade ?? profile.baseAvailability;
  const disponibilidade = Number(
    clamp(prevDisp * 0.65 + profile.baseAvailability * 0.35 + jitter1, 74, 99.1).toFixed(2)
  );
  const performance = clamp(profile.basePerformance + jitter2, 78, 98.5);
  const qualidade = Number(
    clamp(
      (lastRecord?.Qualidade ?? profile.baseQuality) * 0.6 +
        profile.baseQuality * 0.4 +
        jitter3,
      95.2,
      99.85
    ).toFixed(2)
  );

  const oee = Number(((disponibilidade * performance * qualidade) / 10000).toFixed(2));
  const baselineOee =
    (profile.baseAvailability * profile.basePerformance * profile.baseQuality) / 10000;
  const producao = Number(
    (
      profile.baseProductionTonnes *
      (oee / baselineOee) *
      (1 + (Math.random() - 0.5) * 0.04)
    ).toFixed(1)
  );
  const consumoEspecifico = Number(
    (
      profile.baseEnergyMwhPerTonne *
      Math.pow(baselineOee / Math.max(oee, 55), 0.55) *
      (1 + (Math.random() - 0.5) * 0.04)
    ).toFixed(2)
  );
  const custos = Math.round(
    profile.baseCostBrlPerTonne *
      (0.45 + 0.55 * (consumoEspecifico / profile.baseEnergyMwhPerTonne)) *
      (1 + (Math.random() - 0.5) * 0.03)
  );

  return {
    id: `sim-${planta}-${dateStr}-${tickCount}`,
    Data: dateStr,
    Gerencia: gerencia,
    Planta: planta,
    Produção: producao,
    OEE: oee,
    Disponibilidade: disponibilidade,
    Qualidade: qualidade,
    'Consumo especifico': consumoEspecifico,
    Custos: custos,
    kind: 'simulated',
  };
}
