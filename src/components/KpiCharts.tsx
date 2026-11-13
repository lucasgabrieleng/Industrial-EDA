import React, { useMemo, useState } from 'react';
import { formatFullPtDate, formatShortPtDate } from '../data/mockIndustrialData';
import {
  KPI_METADATA,
  type IndustrialRecord,
  type KpiKey,
  type RegressionResult,
} from '../types/eda';
import {
  computeRollingAverage,
  detectOutlierFlags,
  formatKpiNumber,
} from '../utils/statistics';

interface KpiChartProps {
  rows: IndustrialRecord[];
  kpi: KpiKey;
  showRollingMean?: boolean;
  highlightOutliers?: boolean;
  onSelectDate?: (date: string) => void;
}

export const KpiTrendChart: React.FC<KpiChartProps> = ({
  rows,
  kpi,
  showRollingMean = true,
  highlightOutliers = true,
  onSelectDate,
}) => {
  const meta = KPI_METADATA[kpi];
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const outlierIds = useMemo(
    () => (highlightOutliers ? detectOutlierFlags(rows, kpi) : new Set<string>()),
    [rows, kpi, highlightOutliers]
  );

  const rollingValues = useMemo(
    () => computeRollingAverage(rows.map((r) => r[kpi]), 7),
    [rows, kpi]
  );

  const W = 640;
  const H = 236;
  const padL = 62;
  const padR = 20;
  const padT = 18;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const validNums = useMemo(() => {
    const nums: number[] = [];
    for (const r of rows) {
      const v = r[kpi];
      if (typeof v === 'number' && Number.isFinite(v)) nums.push(v);
    }
    if (meta.target !== undefined) nums.push(meta.target);
    return nums;
  }, [rows, kpi, meta.target]);

  if (rows.length === 0 || validNums.length === 0) {
    return (
      <div className="py-10 text-center text-body text-muted">
        Sem registros numéricos de {meta.shortLabel} para o intervalo selecionado.
      </div>
    );
  }

  const rawMin = Math.min(...validNums);
  const rawMax = Math.max(...validNums);
  const span = rawMax - rawMin || Math.max(1, Math.abs(rawMax) * 0.1);
  const yMin = Math.max(0, rawMin - span * 0.14);
  const yMax = rawMax + span * 0.14;

  const xAt = (idx: number) =>
    rows.length === 1 ? padL + plotW / 2 : padL + (idx / (rows.length - 1)) * plotW;
  const yAt = (val: number) =>
    padT + plotH - ((val - yMin) / Math.max(1e-9, yMax - yMin)) * plotH;

  // Build SVG path with true gaps on missing values (Section 4: Missing is never zero; gaps drawn as gaps)
  const buildPath = (series: (number | null)[]) => {
    const commands: string[] = [];
    let penDown = false;
    series.forEach((v, i) => {
      if (typeof v === 'number' && Number.isFinite(v)) {
        const x = xAt(i).toFixed(1);
        const y = yAt(v).toFixed(1);
        commands.push(`${penDown ? 'L' : 'M'}${x},${y}`);
        penDown = true;
      } else {
        penDown = false;
      }
    });
    return commands.join(' ');
  };

  const mainPath = buildPath(rows.map((r) => r[kpi]));
  const rollingPath = showRollingMean ? buildPath(rollingValues) : '';

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const val = yMin + t * (yMax - yMin);
    return { val, y: padT + plotH - t * plotH };
  });

  const xTickCount = Math.min(5, rows.length);
  const xTicks = Array.from({ length: xTickCount }, (_, t) => {
    const idx =
      xTickCount === 1 ? 0 : Math.round((t / (xTickCount - 1)) * (rows.length - 1));
    return {
      idx,
      x: xAt(idx),
      label: formatShortPtDate(rows[idx].Data),
      anchor: (t === 0 ? 'start' : t === xTickCount - 1 ? 'end' : 'middle') as
        | 'start'
        | 'middle'
        | 'end',
    };
  });

  const hoveredRow = hoverIdx !== null ? rows[hoverIdx] : null;
  const hoveredVal = hoveredRow ? hoveredRow[kpi] : null;
  const hoveredRoll = hoverIdx !== null ? rollingValues[hoverIdx] : null;

  return (
    <div className="min-w-0 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 min-h-6 text-caption text-muted tabular-nums">
        <span>
          Intervalo diário · Unidade: {meta.unit}
          {showRollingMean ? ' · Linha tracejada: média móvel 7d' : ''}
        </span>
        {hoveredRow ? (
          <span className="text-foreground font-medium">
            {formatFullPtDate(hoveredRow.Data)} ·{' '}
            {formatKpiNumber(hoveredVal, meta.decimals)} {meta.unit}
            {hoveredRoll !== null
              ? ` · MM7d: ${formatKpiNumber(hoveredRoll, meta.decimals)}`
              : ''}
            {hoveredRow.kind === 'simulated' ? ' · Simulado' : ''}
            {outlierIds.has(hoveredRow.id) ? ' · Fora de 1,5×IQR' : ''}
          </span>
        ) : (
          <span>Passe o cursor sobre a curva para inspecionar o dia</span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto select-none overflow-visible"
        role="img"
        aria-label={`Gráfico de tendência temporal para ${meta.shortLabel} em ${meta.unit}`}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Horizontal faint gridlines & Y ticks */}
        {yTicks.map((tk, i) => (
          <g key={i}>
            <line
              x1={padL}
              y1={tk.y}
              x2={padL + plotW}
              y2={tk.y}
              stroke="var(--color-border)"
              strokeOpacity={0.55}
              strokeWidth={1}
            />
            <text
              x={padL - 10}
              y={tk.y + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--color-muted)"
              className="svg-halo tabular-nums"
            >
              {formatKpiNumber(tk.val, meta.decimals > 1 ? 1 : meta.decimals)}
            </text>
          </g>
        ))}

        {/* Optional target reference line */}
        {meta.target !== undefined && meta.target >= yMin && meta.target <= yMax && (
          <g>
            <line
              x1={padL}
              y1={yAt(meta.target)}
              x2={padL + plotW}
              y2={yAt(meta.target)}
              stroke="var(--color-positive)"
              strokeDasharray="4 4"
              strokeWidth={1.2}
              strokeOpacity={0.75}
            />
            <text
              x={padL + plotW - 4}
              y={Math.max(padT + 10, yAt(meta.target) - 6)}
              textAnchor="end"
              fontSize={10.5}
              fill="var(--color-positive)"
              className="svg-halo"
            >
              Meta {formatKpiNumber(meta.target, 1)} {meta.unit}
            </text>
          </g>
        )}

        {/* 7-day rolling mean context line */}
        {showRollingMean && rollingPath && (
          <path
            d={rollingPath}
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            strokeOpacity={0.75}
          />
        )}

        {/* Primary KPI trend stroke */}
        {mainPath && (
          <path
            d={mainPath}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth={2.1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Outlier & simulated telemetry markers */}
        {rows.map((r, idx) => {
          const val = r[kpi];
          if (typeof val !== 'number' || !Number.isFinite(val)) return null;
          const isOutlier = outlierIds.has(r.id);
          const isSim = r.kind === 'simulated';
          const isHovered = hoverIdx === idx;
          if (!isOutlier && !isSim && !isHovered && rows.length > 36) return null;

          const cx = xAt(idx);
          const cy = yAt(val);
          return (
            <circle
              key={r.id}
              cx={cx}
              cy={cy}
              r={isHovered ? 4.8 : isOutlier || isSim ? 3.8 : 2.3}
              fill={
                isOutlier
                  ? 'var(--color-accent)'
                  : isSim
                    ? 'var(--color-positive)'
                    : 'var(--color-primary)'
              }
              stroke="var(--color-surface)"
              strokeWidth={1.5}
            />
          );
        })}

        {/* Hover guide rule */}
        {hoverIdx !== null && hoveredVal !== null && (
          <line
            x1={xAt(hoverIdx)}
            y1={padT}
            x2={xAt(hoverIdx)}
            y2={padT + plotH}
            stroke="var(--color-foreground)"
            strokeOpacity={0.25}
            strokeWidth={1}
          />
        )}

        {/* X-axis ticks in reserved bottom band */}
        {xTicks.map((tk) => (
          <text
            key={tk.idx}
            x={tk.x}
            y={padT + plotH + 22}
            textAnchor={tk.anchor}
            fontSize={11}
            fill="var(--color-muted)"
            className="svg-halo tabular-nums"
          >
            {tk.label}
          </text>
        ))}

        {/* Invisible pointer hit columns for smooth scrub & click */}
        {rows.map((r, idx) => {
          const colW = plotW / Math.max(1, rows.length);
          const x =
            rows.length === 1
              ? padL
              : padL + (idx / (rows.length - 1)) * plotW - colW / 2;
          return (
            <rect
              key={`hit-${r.id}`}
              x={Math.max(padL, x)}
              y={padT}
              width={rows.length === 1 ? plotW : colW}
              height={plotH}
              fill="transparent"
              className={onSelectDate ? 'cursor-pointer' : 'cursor-crosshair'}
              onMouseEnter={() => setHoverIdx(idx)}
              onClick={() => onSelectDate?.(r.Data)}
            />
          );
        })}
      </svg>
    </div>
  );
};

export const KpiBarChart: React.FC<KpiChartProps> = ({
  rows,
  kpi,
  highlightOutliers = true,
  onSelectDate,
}) => {
  const meta = KPI_METADATA[kpi];
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const outlierIds = useMemo(
    () => (highlightOutliers ? detectOutlierFlags(rows, kpi) : new Set<string>()),
    [rows, kpi, highlightOutliers]
  );

  const W = 640;
  const H = 224;
  const padL = 62;
  const padR = 20;
  const padT = 16;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const validNums = useMemo(() => {
    const nums: number[] = [];
    for (const r of rows) {
      const v = r[kpi];
      if (typeof v === 'number' && Number.isFinite(v)) nums.push(v);
    }
    return nums;
  }, [rows, kpi]);

  if (rows.length === 0 || validNums.length === 0) {
    return (
      <div className="py-10 text-center text-body text-muted">
        Sem registros numéricos para o gráfico de barras de {meta.shortLabel}.
      </div>
    );
  }

  // Section 4: Bars ALWAYS start at zero
  const yMin = 0;
  const rawMax = Math.max(...validNums, 1);
  const yMax = rawMax * 1.1;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const val = yMin + t * (yMax - yMin);
    return { val, y: padT + plotH - t * plotH };
  });

  const step = plotW / rows.length;
  const barW = Math.max(1.8, Math.min(28, step * 0.74));

  const xTickCount = Math.min(5, rows.length);
  const xTicks = Array.from({ length: xTickCount }, (_, t) => {
    const idx =
      xTickCount === 1 ? 0 : Math.round((t / (xTickCount - 1)) * (rows.length - 1));
    return {
      idx,
      x: padL + idx * step + step / 2,
      label: formatShortPtDate(rows[idx].Data),
      anchor: (t === 0 ? 'start' : t === xTickCount - 1 ? 'end' : 'middle') as
        | 'start'
        | 'middle'
        | 'end',
    };
  });

  const hoveredRow = hoverIdx !== null ? rows[hoverIdx] : null;
  const hoveredVal = hoveredRow ? hoveredRow[kpi] : null;

  return (
    <div className="min-w-0 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 min-h-6 text-caption text-muted tabular-nums">
        <span>Gráfico de barras diário (eixo base em zero · {meta.unit})</span>
        {hoveredRow ? (
          <span className="text-foreground font-medium">
            {formatFullPtDate(hoveredRow.Data)} ·{' '}
            {formatKpiNumber(hoveredVal, meta.decimals)} {meta.unit}
          </span>
        ) : (
          <span>{rows.length} dias exibidos</span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto select-none overflow-visible"
        role="img"
        aria-label={`Gráfico de barras diário para ${meta.shortLabel} em ${meta.unit}`}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {yTicks.map((tk, i) => (
          <g key={i}>
            <line
              x1={padL}
              y1={tk.y}
              x2={padL + plotW}
              y2={tk.y}
              stroke="var(--color-border)"
              strokeOpacity={0.55}
              strokeWidth={1}
            />
            <text
              x={padL - 10}
              y={tk.y + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--color-muted)"
              className="svg-halo tabular-nums"
            >
              {formatKpiNumber(tk.val, meta.decimals > 1 ? 1 : meta.decimals)}
            </text>
          </g>
        ))}

        {rows.map((r, idx) => {
          const val = r[kpi];
          if (typeof val !== 'number' || !Number.isFinite(val)) return null;
          const barH = Math.max(1, (val / yMax) * plotH);
          const x = padL + idx * step + (step - barW) / 2;
          const y = padT + plotH - barH;
          const isOutlier = outlierIds.has(r.id);
          const isSim = r.kind === 'simulated';
          const isHovered = hoverIdx === idx;

          return (
            <rect
              key={r.id}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={barW > 6 ? 1.5 : 0}
              fill={
                isOutlier
                  ? 'var(--color-accent)'
                  : isSim
                    ? 'var(--color-positive)'
                    : 'var(--color-primary)'
              }
              fillOpacity={isHovered ? 1 : 0.84}
              className={onSelectDate ? 'cursor-pointer' : 'cursor-crosshair'}
              onMouseEnter={() => setHoverIdx(idx)}
              onClick={() => onSelectDate?.(r.Data)}
            />
          );
        })}

        {xTicks.map((tk) => (
          <text
            key={tk.idx}
            x={tk.x}
            y={padT + plotH + 22}
            textAnchor={tk.anchor}
            fontSize={11}
            fill="var(--color-muted)"
            className="svg-halo tabular-nums"
          >
            {tk.label}
          </text>
        ))}
      </svg>
    </div>
  );
};

export const BivariateScatterChart: React.FC<{
  regression: RegressionResult | null;
}> = ({ regression }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!regression || regression.points.length < 2) {
    return (
      <div className="py-12 text-center text-body text-muted">
        Selecione pelo menos dois KPIs com registros válidos para visualizar a dispersão e a regressão linear.
      </div>
    );
  }

  const metaX = KPI_METADATA[regression.xKpi];
  const metaY = KPI_METADATA[regression.yKpi];

  const W = 540;
  const H = 310;
  const padL = 64;
  const padR = 24;
  const padT = 20;
  const padB = 46;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xs = regression.points.map((p) => p.x);
  const ys = regression.points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const x0 = minX - spanX * 0.08;
  const x1 = maxX + spanX * 0.08;
  const y0 = minY - spanY * 0.1;
  const y1 = maxY + spanY * 0.1;

  const mapX = (x: number) => padL + ((x - x0) / (x1 - x0)) * plotW;
  const mapY = (y: number) => padT + plotH - ((y - y0) / (y1 - y0)) * plotH;

  const lineStartY = regression.slope * minX + regression.intercept;
  const lineEndY = regression.slope * maxX + regression.intercept;

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const val = x0 + t * (x1 - x0);
    return { val, x: padL + t * plotW };
  });
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const val = y0 + t * (y1 - y0);
    return { val, y: padT + plotH - t * plotH };
  });

  const hovered = hoverIdx !== null ? regression.points[hoverIdx] : null;

  return (
    <div className="min-w-0 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted tabular-nums">
        <span>
          r = {regression.r.toFixed(3)} · R² = {(regression.rSquared * 100).toFixed(1)}% · n ={' '}
          {regression.n} dias
        </span>
        {hovered ? (
          <span className="text-foreground font-medium">
            {formatFullPtDate(hovered.date)} · {metaX.shortLabel}:{' '}
            {formatKpiNumber(hovered.x, metaX.decimals)} {metaX.unit} ·{' '}
            {metaY.shortLabel}: {formatKpiNumber(hovered.y, metaY.decimals)} {metaY.unit}
          </span>
        ) : (
          <span>
            y = {regression.slope >= 0 ? '' : '−'}
            {Math.abs(regression.slope).toFixed(3)}x{' '}
            {regression.intercept >= 0 ? '+' : '−'}{' '}
            {Math.abs(regression.intercept).toFixed(2)}
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto select-none overflow-visible"
        role="img"
        aria-label={`Dispersão entre ${metaX.shortLabel} e ${metaY.shortLabel}`}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {yTicks.map((tk, i) => (
          <g key={`y-${i}`}>
            <line
              x1={padL}
              y1={tk.y}
              x2={padL + plotW}
              y2={tk.y}
              stroke="var(--color-border)"
              strokeOpacity={0.55}
              strokeWidth={1}
            />
            <text
              x={padL - 10}
              y={tk.y + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--color-muted)"
              className="svg-halo tabular-nums"
            >
              {formatKpiNumber(tk.val, metaY.decimals > 1 ? 1 : metaY.decimals)}
            </text>
          </g>
        ))}

        {xTicks.map((tk, i) => (
          <g key={`x-${i}`}>
            <line
              x1={tk.x}
              y1={padT}
              x2={tk.x}
              y2={padT + plotH}
              stroke="var(--color-border)"
              strokeOpacity={0.35}
              strokeWidth={1}
            />
            <text
              x={tk.x}
              y={padT + plotH + 20}
              textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
              fontSize={11}
              fill="var(--color-muted)"
              className="svg-halo tabular-nums"
            >
              {formatKpiNumber(tk.val, metaX.decimals > 1 ? 1 : metaX.decimals)}
            </text>
          </g>
        ))}

        {/* Axis titles in reserved open bands clear of ticks */}
        <text
          x={padL + plotW / 2}
          y={H - 4}
          textAnchor="middle"
          fontSize={11.5}
          fill="var(--color-foreground)"
          className="svg-halo"
        >
          {metaX.shortLabel} ({metaX.unit})
        </text>

        {/* OLS Regression Line */}
        <line
          x1={mapX(minX)}
          y1={mapY(lineStartY)}
          x2={mapX(maxX)}
          y2={mapY(lineEndY)}
          stroke="var(--color-accent)"
          strokeWidth={2}
          strokeDasharray="6 4"
        />

        {/* Scatter Points */}
        {regression.points.map((pt, idx) => {
          const isHovered = hoverIdx === idx;
          return (
            <circle
              key={`${pt.date}-${idx}`}
              cx={mapX(pt.x)}
              cy={mapY(pt.y)}
              r={isHovered ? 5.5 : 3.8}
              fill={
                pt.kind === 'simulated'
                  ? 'var(--color-positive)'
                  : 'var(--color-primary)'
              }
              fillOpacity={isHovered ? 1 : 0.78}
              stroke="var(--color-surface)"
              strokeWidth={1.2}
              className="cursor-crosshair"
              onMouseEnter={() => setHoverIdx(idx)}
            />
          );
        })}
      </svg>
    </div>
  );
};
