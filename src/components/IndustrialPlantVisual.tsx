import React, { useMemo, useState } from 'react';
import { formatFullPtDate } from '../data/mockIndustrialData';
import { KPI_METADATA, type IndustrialRecord, type KpiKey } from '../types/eda';
import { computeAggregateKpiValue, formatKpiNumber } from '../utils/statistics';
import { Surface } from './ui';

export type PlantSector = 'mining' | 'metallurgy' | 'manufacturing';

interface IndustrialPlantVisualProps {
  gerencia: string;
  planta: string;
  filteredRows: IndustrialRecord[];
  isRealtimeActive: boolean;
  onFocusKpi?: (kpi: KpiKey) => void;
}

export function inferPlantSector(gerencia: string, planta: string): PlantSector {
  const combined = `${gerencia} ${planta}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    combined.includes('minera') ||
    combined.includes('britag') ||
    combined.includes('moagem') ||
    combined.includes('concentra') ||
    combined.includes('flota')
  ) {
    return 'mining';
  }
  if (
    combined.includes('manufatura') ||
    combined.includes('materiais') ||
    combined.includes('oxido') ||
    combined.includes('liga') ||
    combined.includes('usinag') ||
    combined.includes('sinter')
  ) {
    return 'manufacturing';
  }
  return 'metallurgy';
}

interface StageSpec {
  id: string;
  title: string;
  equipment: string;
  linkedKpi: KpiKey;
  cx: number;
}

const SECTOR_CONFIG: Record<
  PlantSector,
  {
    label: string;
    subtitle: string;
    flowTag: string;
    stages: StageSpec[];
  }
> = {
  mining: {
    label: 'Mineração e Beneficiamento',
    subtitle: 'Fluxograma de cominuição, concentração e desaguamento mineral',
    flowTag: 'Polpa mineral & concentrado',
    stages: [
      {
        id: 'crushing',
        title: '01 · Britagem Primária',
        equipment: 'Alimentador & Britador de Mandíbulas',
        linkedKpi: 'Disponibilidade',
        cx: 120,
      },
      {
        id: 'milling',
        title: '02 · Moagem SAG',
        equipment: 'Moinho Semiautógeno + Classificação',
        linkedKpi: 'Consumo especifico',
        cx: 360,
      },
      {
        id: 'separation',
        title: '03 · Separação & Flotação',
        equipment: 'Células de Flotação & Tambores Magnéticos',
        linkedKpi: 'OEE',
        cx: 600,
      },
      {
        id: 'thickener',
        title: '04 · Espessamento & Silo',
        equipment: 'Espessador de Concentrado & Filtragem',
        linkedKpi: 'Qualidade',
        cx: 840,
      },
    ],
  },
  metallurgy: {
    label: 'Metalurgia e Refino',
    subtitle: 'Fluxograma pirometalúrgico de redução, refino térmico e lingotamento',
    flowTag: 'Carga metálica & liga fundida',
    stages: [
      {
        id: 'preheat',
        title: '01 · Pré-aquecimento',
        equipment: 'Silo Dosador & Forno Rotativo de Carga',
        linkedKpi: 'Disponibilidade',
        cx: 120,
      },
      {
        id: 'furnace',
        title: '02 · Forno Elétrico',
        equipment: 'Reator a Arco Submerso (Alta Potência)',
        linkedKpi: 'Consumo especifico',
        cx: 360,
      },
      {
        id: 'refining',
        title: '03 · Refino & Lixiviação',
        equipment: 'Panela de Refino Metalúrgico & Escória',
        linkedKpi: 'OEE',
        cx: 600,
      },
      {
        id: 'casting',
        title: '04 · Lingotamento',
        equipment: 'Lingoteira Contínua & Expedição',
        linkedKpi: 'Qualidade',
        cx: 840,
      },
    ],
  },
  manufacturing: {
    label: 'Manufatura e Materiais',
    subtitle: 'Fluxograma de dosagem, sinterização controlada, usinagem e metrologia',
    flowTag: 'Lote técnico & peças acabadas',
    stages: [
      {
        id: 'dosing',
        title: '01 · Dosagem & Mistura',
        equipment: 'Estação Gravimétrica & Misturador V',
        linkedKpi: 'Disponibilidade',
        cx: 120,
      },
      {
        id: 'sintering',
        title: '02 · Sinterização Térmica',
        equipment: 'Forno Contínuo a Vácuo / Atmosfera',
        linkedKpi: 'Consumo especifico',
        cx: 360,
      },
      {
        id: 'machining',
        title: '03 · Usinagem CNC',
        equipment: 'Célula Automatizada Multi-eixo',
        linkedKpi: 'OEE',
        cx: 600,
      },
      {
        id: 'metrology',
        title: '04 · Inspeção & Expedição',
        equipment: 'Pórtico de Metrologia & Paletização',
        linkedKpi: 'Qualidade',
        cx: 840,
      },
    ],
  },
};

function getOperationalHealth(
  oee: number | null,
  availability: number | null
): { label: string; colorVar: string } {
  if (availability !== null && availability < 86) {
    return { label: 'Parada / Manutenção', colorVar: 'var(--color-danger)' };
  }
  if (
    (oee !== null && oee < 80) ||
    (availability !== null && availability < 90.5)
  ) {
    return { label: 'Atenção operacional', colorVar: 'var(--color-accent)' };
  }
  return { label: 'Operação nominal', colorVar: 'var(--color-positive)' };
}

export const IndustrialPlantVisual: React.FC<IndustrialPlantVisualProps> = ({
  gerencia,
  planta,
  filteredRows,
  isRealtimeActive,
  onFocusKpi,
}) => {
  const autoSector = useMemo(
    () => inferPlantSector(gerencia, planta),
    [gerencia, planta]
  );
  const [overrideSector, setOverrideSector] = useState<PlantSector | 'auto'>(
    'auto'
  );
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const activeSector: PlantSector =
    overrideSector === 'auto' ? autoSector : overrideSector;
  const config = SECTOR_CONFIG[activeSector];

  const metrics = useMemo(() => {
    const latest = filteredRows[filteredRows.length - 1];
    const prodTotal = computeAggregateKpiValue(filteredRows, 'Produção');
    const prodDailyAvg =
      prodTotal !== null && filteredRows.length > 0
        ? prodTotal / filteredRows.length
        : null;
    const avgOee = computeAggregateKpiValue(filteredRows, 'OEE');
    const avgDisp = computeAggregateKpiValue(filteredRows, 'Disponibilidade');
    const avgQual = computeAggregateKpiValue(filteredRows, 'Qualidade');
    const avgEnergy = computeAggregateKpiValue(
      filteredRows,
      'Consumo especifico'
    );
    const avgCost = computeAggregateKpiValue(filteredRows, 'Custos');

    return {
      latest,
      prodDailyAvg,
      avgOee,
      avgDisp,
      avgQual,
      avgEnergy,
      avgCost,
    };
  }, [filteredRows]);

  const health = getOperationalHealth(
    metrics.latest?.OEE ?? metrics.avgOee,
    metrics.latest?.Disponibilidade ?? metrics.avgDisp
  );

  // Normalized fill factors (0..1) for tank/furnace/load visual bars
  const oeeFill = Math.max(
    0.2,
    Math.min(1, (metrics.latest?.OEE ?? metrics.avgOee ?? 82) / 100)
  );
  const dispFill = Math.max(
    0.2,
    Math.min(
      1,
      (metrics.latest?.Disponibilidade ?? metrics.avgDisp ?? 91) / 100
    )
  );
  const qualFill = Math.max(
    0.2,
    Math.min(1, (metrics.latest?.Qualidade ?? metrics.avgQual ?? 98) / 100)
  );

  const getStageValue = (kpi: KpiKey): string => {
    const meta = KPI_METADATA[kpi];
    if (kpi === 'Disponibilidade') {
      return `${formatKpiNumber(metrics.avgDisp, meta.decimals)} ${meta.unit}`;
    }
    if (kpi === 'Consumo especifico') {
      return `${formatKpiNumber(metrics.avgEnergy, meta.decimals)} ${meta.unit}`;
    }
    if (kpi === 'OEE') {
      return `${formatKpiNumber(metrics.avgOee, meta.decimals)} ${meta.unit}`;
    }
    if (kpi === 'Qualidade') {
      return `${formatKpiNumber(metrics.avgQual, meta.decimals)} ${meta.unit}`;
    }
    return `${formatKpiNumber(metrics.prodDailyAvg, 1)} t/d`;
  };

  const renderStageEquipmentSvg = (stageIndex: number, cx: number) => {
    const cy = 128;
    const isSelected = selectedStageId === config.stages[stageIndex].id;
    const frameStroke = isSelected
      ? 'var(--color-primary)'
      : 'var(--color-border)';
    const frameWidth = isSelected ? 2.2 : 1.3;

    if (activeSector === 'mining') {
      if (stageIndex === 0) {
        // Jaw Crusher & Feed Hopper
        return (
          <g>
            <polygon
              points={`${cx - 52},${cy - 44} ${cx + 52},${cy - 44} ${cx + 28},${cy + 4} ${cx - 28},${cy + 4}`}
              fill="var(--color-background)"
              stroke={frameStroke}
              strokeWidth={frameWidth}
            />
            <line
              x1={cx - 18}
              y1={cy - 34}
              x2={cx - 6}
              y2={cy - 4}
              stroke="var(--color-primary)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <line
              x1={cx + 18}
              y1={cy - 34}
              x2={cx + 6}
              y2={cy - 4}
              stroke="var(--color-primary)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* Availability gauge bar */}
            <rect
              x={cx - 42}
              y={cy + 16}
              width={84}
              height={12}
              rx={2}
              fill="var(--color-background)"
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <rect
              x={cx - 40}
              y={cy + 18}
              width={80 * dispFill}
              height={8}
              rx={1}
              fill={health.colorVar}
            />
          </g>
        );
      }
      if (stageIndex === 1) {
        // SAG Rotating Drum Mill
        return (
          <g>
            <circle
              cx={cx}
              cy={cy - 10}
              r={42}
              fill="var(--color-background)"
              stroke={frameStroke}
              strokeWidth={frameWidth}
            />
            <circle
              cx={cx}
              cy={cy - 10}
              r={28}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={2}
              strokeDasharray="10 6"
            />
            <circle cx={cx} cy={cy - 10} r={9} fill="var(--color-primary)" />
            <rect
              x={cx - 44}
              y={cy + 30}
              width={88}
              height={8}
              rx={2}
              fill="var(--color-border)"
            />
          </g>
        );
      }
      if (stageIndex === 2) {
        // Flotation / Magnetic Separation Cells
        return (
          <g>
            {[-36, 0, 36].map((dx, i) => (
              <g key={i}>
                <rect
                  x={cx + dx - 14}
                  y={cy - 40}
                  width={28}
                  height={64}
                  rx={3}
                  fill="var(--color-background)"
                  stroke={frameStroke}
                  strokeWidth={frameWidth}
                />
                <rect
                  x={cx + dx - 11}
                  y={cy + 20 - 50 * oeeFill}
                  width={22}
                  height={50 * oeeFill}
                  rx={1.5}
                  fill="var(--color-primary)"
                  fillOpacity={0.28 + i * 0.14}
                />
                <line
                  x1={cx + dx}
                  y1={cy - 48}
                  x2={cx + dx}
                  y2={cy + 12}
                  stroke="var(--color-primary)"
                  strokeWidth={1.6}
                />
              </g>
            ))}
          </g>
        );
      }
      // Thickener Tank & Silo
      return (
        <g>
          <path
            d={`M${cx - 50},${cy - 30} L${cx + 50},${cy - 30} L${cx + 50},${cy - 4} L${cx},${cy + 22} L${cx - 50},${cy - 4} Z`}
            fill="var(--color-background)"
            stroke={frameStroke}
            strokeWidth={frameWidth}
          />
          <rect
            x={cx - 44}
            y={cy - 24}
            width={88 * qualFill}
            height={14}
            rx={1.5}
            fill="var(--color-positive)"
            fillOpacity={0.35}
          />
          <line
            x1={cx}
            y1={cy - 42}
            x2={cx}
            y2={cy + 16}
            stroke="var(--color-foreground)"
            strokeOpacity={0.5}
            strokeWidth={1.6}
          />
        </g>
      );
    }

    if (activeSector === 'metallurgy') {
      if (stageIndex === 0) {
        // Charge Silo & Rotary Preheater
        return (
          <g>
            <polygon
              points={`${cx - 40},${cy - 46} ${cx + 40},${cy - 46} ${cx + 26},${cy - 8} ${cx - 26},${cy - 8}`}
              fill="var(--color-background)"
              stroke={frameStroke}
              strokeWidth={frameWidth}
            />
            <rect
              x={cx - 46}
              y={cy - 2}
              width={92}
              height={26}
              rx={4}
              fill="var(--color-background)"
              stroke={frameStroke}
              strokeWidth={frameWidth}
            />
            <rect
              x={cx - 42}
              y={cy + 3}
              width={84 * dispFill}
              height={16}
              rx={2}
              fill="var(--color-primary)"
              fillOpacity={0.3}
            />
          </g>
        );
      }
      if (stageIndex === 1) {
        // Electric Arc Reduction Furnace (with copper-amber molten bath)
        return (
          <g>
            <path
              d={`M${cx - 48},${cy - 34} L${cx + 48},${cy - 34} L${cx + 42},${cy + 26} L${cx - 42},${cy + 26} Z`}
              fill="var(--color-background)"
              stroke={frameStroke}
              strokeWidth={frameWidth}
            />
            {/* Three graphite arc electrodes */}
            {[-20, 0, 20].map((dx) => (
              <rect
                key={dx}
                x={cx + dx - 3.5}
                y={cy - 52}
                width={7}
                height={44}
                rx={1}
                fill="var(--color-foreground)"
                fillOpacity={0.78}
              />
            ))}
            {/* Molten bath level */}
            <rect
              x={cx - 38}
              y={cy - 2}
              width={76}
              height={24}
              rx={2}
              fill="var(--color-accent)"
              fillOpacity={0.55}
            />
          </g>
        );
      }
      if (stageIndex === 2) {
        // Refining Ladle & Reactor Vessel
        return (
          <g>
            <path
              d={`M${cx - 38},${cy - 40} L${cx + 38},${cy - 40} L${cx + 30},${cy + 24} L${cx - 30},${cy + 24} Z`}
              fill="var(--color-background)"
              stroke={frameStroke}
              strokeWidth={frameWidth}
            />
            <rect
              x={cx - 30}
              y={cy + 20 - 52 * oeeFill}
              width={60}
              height={52 * oeeFill}
              rx={2}
              fill="var(--color-accent)"
              fillOpacity={0.38}
            />
            <line
              x1={cx}
              y1={cy - 50}
              x2={cx}
              y2={cy + 6}
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          </g>
        );
      }
      // Continuous Casting & Billet Conveyor
      return (
        <g>
          <rect
            x={cx - 52}
            y={cy - 18}
            width={104}
            height={36}
            rx={4}
            fill="var(--color-background)"
            stroke={frameStroke}
            strokeWidth={frameWidth}
          />
          {[-30, 0, 30].map((dx) => (
            <rect
              key={dx}
              x={cx + dx - 10}
              y={cy - 10}
              width={20}
              height={20}
              rx={2}
              fill="var(--color-primary)"
              fillOpacity={0.38}
              stroke="var(--color-primary)"
              strokeWidth={1.2}
            />
          ))}
          <circle cx={cx - 36} cy={cy + 26} r={5} fill="var(--color-muted)" />
          <circle cx={cx} cy={cy + 26} r={5} fill="var(--color-muted)" />
          <circle cx={cx + 36} cy={cy + 26} r={5} fill="var(--color-muted)" />
        </g>
      );
    }

    // Manufacturing Sector
    if (stageIndex === 0) {
      // Precision Dosing Silos
      return (
        <g>
          {[-24, 24].map((dx) => (
            <g key={dx}>
              <rect
                x={cx + dx - 16}
                y={cy - 44}
                width={32}
                height={48}
                rx={3}
                fill="var(--color-background)"
                stroke={frameStroke}
                strokeWidth={frameWidth}
              />
              <rect
                x={cx + dx - 13}
                y={cy - 40 + 40 * (1 - dispFill)}
                width={26}
                height={40 * dispFill}
                rx={1.5}
                fill="var(--color-primary)"
                fillOpacity={0.32}
              />
            </g>
          ))}
          <rect
            x={cx - 46}
            y={cy + 12}
            width={92}
            height={14}
            rx={2}
            fill="var(--color-background)"
            stroke={frameStroke}
            strokeWidth={1.2}
          />
        </g>
      );
    }
    if (stageIndex === 1) {
      // Vacuum Sintering Tunnel Furnace
      return (
        <g>
          <rect
            x={cx - 54}
            y={cy - 30}
            width={108}
            height={52}
            rx={6}
            fill="var(--color-background)"
            stroke={frameStroke}
            strokeWidth={frameWidth}
          />
          {[-28, 0, 28].map((dx) => (
            <rect
              key={dx}
              x={cx + dx - 9}
              y={cy - 18}
              width={18}
              height={28}
              rx={2}
              fill="var(--color-accent)"
              fillOpacity={0.42}
            />
          ))}
        </g>
      );
    }
    if (stageIndex === 2) {
      // Multi-axis CNC Machining Cell
      return (
        <g>
          <rect
            x={cx - 48}
            y={cy - 40}
            width={96}
            height={66}
            rx={4}
            fill="var(--color-background)"
            stroke={frameStroke}
            strokeWidth={frameWidth}
          />
          <rect
            x={cx - 32}
            y={cy - 28}
            width={64}
            height={36}
            rx={2}
            fill="var(--color-primary)"
            fillOpacity={0.14}
            stroke="var(--color-primary)"
            strokeWidth={1.2}
          />
          <line
            x1={cx}
            y1={cy - 28}
            x2={cx}
            y2={cy - 4}
            stroke="var(--color-primary)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <rect
            x={cx - 20}
            y={cy - 2}
            width={40 * oeeFill}
            height={7}
            rx={1}
            fill="var(--color-primary)"
          />
        </g>
      );
    }
    // Laser Metrology & Quality Gate
    return (
      <g>
        <path
          d={`M${cx - 44},${cy + 24} L${cx - 44},${cy - 36} L${cx + 44},${cy - 36} L${cx + 44},${cy + 24}`}
          fill="none"
          stroke={frameStroke}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <line
          x1={cx}
          y1={cy - 34}
          x2={cx}
          y2={cy + 8}
          stroke="var(--color-positive)"
          strokeWidth={2}
          strokeDasharray="3 3"
        />
        <rect
          x={cx - 24}
          y={cy + 6}
          width={48}
          height={18}
          rx={2}
          fill="var(--color-positive)"
          fillOpacity={0.32}
          stroke="var(--color-positive)"
          strokeWidth={1.4}
        />
      </g>
    );
  };

  return (
    <Surface className="divide-y divide-border/60">
      {/* Header row */}
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-title text-foreground">
              Simulador visual da planta · {config.label}
            </h2>
            <span
              className="inline-flex items-center gap-1.5 text-caption font-medium"
              style={{ color: health.colorVar }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: health.colorVar }}
              />
              {health.label}
            </span>
          </div>
          <p className="text-caption text-muted">
            {config.subtitle} · {planta}
            {metrics.latest
              ? ` · Última leitura: ${formatFullPtDate(metrics.latest.Data)}`
              : ''}
          </p>
        </div>

        {/* Allow automatic inference OR manual preview of the 3 industrial plant topologies */}
        <div
          role="group"
          aria-label="Tipo de planta industrial"
          className="flex flex-wrap items-center gap-1.5"
        >
          {(
            [
              { id: 'auto', label: 'Automático' },
              { id: 'mining', label: 'Mineração' },
              { id: 'metallurgy', label: 'Metalurgia' },
              { id: 'manufacturing', label: 'Manufatura' },
            ] as const
          ).map((opt) => {
            const active = overrideSector === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setOverrideSector(opt.id);
                  setSelectedStageId(null);
                }}
                className={`min-h-8 px-2.5 rounded-control border text-caption font-medium cursor-pointer whitespace-nowrap transition-[background-color,color,border-color] duration-150 ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-surface text-foreground border-border hover:bg-background'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main SVG Process Flow Canvas (recessed interactive stage) */}
      <div className="p-4 sm:p-5 bg-background/40">
        <svg
          viewBox="0 0 960 256"
          className="w-full h-auto select-none"
          role="img"
          aria-label={`Diagrama esquemático de processo industrial para ${config.label}`}
        >
          {/* Transfer pipes between stages */}
          {[0, 1, 2].map((idx) => {
            const x1 = config.stages[idx].cx + 58;
            const x2 = config.stages[idx + 1].cx - 58;
            const pipeY = 124;
            return (
              <g key={`pipe-${idx}`}>
                <line
                  x1={x1}
                  y1={pipeY}
                  x2={x2}
                  y2={pipeY}
                  stroke="var(--color-border)"
                  strokeWidth={6}
                  strokeLinecap="round"
                />
                <line
                  x1={x1}
                  y1={pipeY}
                  x2={x2}
                  y2={pipeY}
                  stroke={
                    isRealtimeActive
                      ? 'var(--color-positive)'
                      : 'var(--color-primary)'
                  }
                  strokeWidth={2.5}
                  className="animate-process-flow"
                />
                {/* Direction chevron centered in open pipe span */}
                <polygon
                  points={`${(x1 + x2) / 2 - 4},${pipeY - 5} ${(x1 + x2) / 2 + 5},${pipeY} ${(x1 + x2) / 2 - 4},${pipeY + 5}`}
                  fill="var(--color-primary)"
                />
              </g>
            );
          })}

          {/* Process flow tag centered above middle transfer line */}
          <text
            x={480}
            y={24}
            textAnchor="middle"
            fontSize={11.5}
            fill="var(--color-muted)"
            className="svg-halo"
          >
            Fluxo contínuo: {config.flowTag} · Vazão média:{' '}
            {formatKpiNumber(metrics.prodDailyAvg, 1)} t/dia
          </text>

          {/* 4 Industrial Stages */}
          {config.stages.map((stage, idx) => {
            const meta = KPI_METADATA[stage.linkedKpi];
            const valLabel = getStageValue(stage.linkedKpi);
            return (
              <g
                key={stage.id}
                className="cursor-pointer"
                onClick={() => {
                  setSelectedStageId(stage.id);
                  onFocusKpi?.(stage.linkedKpi);
                }}
              >
                {/* Stage equipment vector */}
                {renderStageEquipmentSvg(idx, stage.cx)}

                {/* Stage title in reserved open band below equipment */}
                <text
                  x={stage.cx}
                  y={194}
                  textAnchor="middle"
                  fontSize={12.5}
                  fontWeight={600}
                  fill="var(--color-foreground)"
                  className="svg-halo"
                >
                  {stage.title}
                </text>

                {/* KPI readout in reserved bottom band */}
                <text
                  x={stage.cx}
                  y={218}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--color-primary)"
                  className="svg-halo tabular-nums"
                >
                  {meta.shortLabel}: {valLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Stage KPI Readout Strip parted by 1px rules (Zero nested bordered boxes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
        {config.stages.map((stage) => {
          const meta = KPI_METADATA[stage.linkedKpi];
          const isFocused = selectedStageId === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => {
                setSelectedStageId(stage.id);
                onFocusKpi?.(stage.linkedKpi);
              }}
              className={`p-4 text-left flex flex-col gap-1 transition-[background-color] duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
                isFocused ? 'bg-primary/8' : 'hover:bg-background/60'
              }`}
            >
              <span className="text-caption font-medium text-muted">
                {stage.title}
              </span>
              <span className="text-label font-semibold text-foreground tabular-nums">
                {meta.shortLabel}: {getStageValue(stage.linkedKpi)}
              </span>
              <span className="text-caption text-muted">{stage.equipment}</span>
            </button>
          );
        })}
      </div>
    </Surface>
  );
};
