import React, { useEffect, useMemo, useState } from 'react';
import {
  KPI_METADATA,
  type CorrelationMatrix,
  type DescriptiveStats,
  type IndustrialRecord,
  type KpiKey,
  type ThemeMode,
} from '../types/eda';
import { computeLinearRegression, formatKpiNumber } from '../utils/statistics';
import { BivariateScatterChart } from './KpiCharts';
import { Field, Surface, selectClassName } from './ui';

interface CorrelationStatsViewProps {
  filteredRows: IndustrialRecord[];
  selectedKpis: KpiKey[];
  stats: DescriptiveStats[];
  corrMatrix: CorrelationMatrix;
  theme: ThemeMode;
}

function getHeatmapCellStyle(
  r: number | null,
  theme: ThemeMode
): {
  backgroundColor: string;
  color: string;
} {
  if (r === null || !Number.isFinite(r)) {
    return {
      backgroundColor: 'transparent',
      color: 'var(--color-muted)',
    };
  }
  const clamped = Math.max(-1, Math.min(1, r));
  const mag = Math.abs(clamped);

  if (theme === 'dark') {
    if (clamped >= 0) {
      // Dark surface (L=0.205) warming toward terracotta/copper (L=0.52)
      const bgL = (0.22 + mag * 0.30).toFixed(3);
      const bgC = (0.015 + mag * 0.135).toFixed(3);
      return {
        backgroundColor: `oklch(${bgL} ${bgC} 40)`,
        color: '#f5f7fa',
      };
    } else {
      // Dark surface (L=0.205) cooling toward deep mineral steel blue (L=0.47)
      const bgL = (0.22 + mag * 0.25).toFixed(3);
      const bgC = (0.015 + mag * 0.125).toFixed(3);
      return {
        backgroundColor: `oklch(${bgL} ${bgC} 238)`,
        color: '#f5f7fa',
      };
    }
  }

  if (clamped >= 0) {
    // Light surface warming toward terracotta/copper
    const bgL = (0.985 - mag * 0.44).toFixed(3);
    const bgC = (mag * 0.14).toFixed(3);
    return {
      backgroundColor: `oklch(${bgL} ${bgC} 40)`,
      color: mag > 0.56 ? '#ffffff' : 'var(--color-foreground)',
    };
  } else {
    // Light surface cooling toward steel blue
    const bgL = (0.985 - mag * 0.48).toFixed(3);
    const bgC = (mag * 0.115).toFixed(3);
    return {
      backgroundColor: `oklch(${bgL} ${bgC} 238)`,
      color: mag > 0.52 ? '#ffffff' : 'var(--color-foreground)',
    };
  }
}

export const CorrelationStatsView: React.FC<CorrelationStatsViewProps> = ({
  filteredRows,
  selectedKpis,
  stats,
  corrMatrix,
  theme,
}) => {
  const [pairX, setPairX] = useState<KpiKey>(selectedKpis[0] ?? 'Produção');
  const [pairY, setPairY] = useState<KpiKey>(
    selectedKpis[1] ?? selectedKpis[0] ?? 'Consumo especifico'
  );

  useEffect(() => {
    if (selectedKpis.length > 0 && !selectedKpis.includes(pairX)) {
      setPairX(selectedKpis[0]);
    }
    if (selectedKpis.length > 1 && !selectedKpis.includes(pairY)) {
      setPairY(selectedKpis[1]);
    } else if (selectedKpis.length === 1) {
      setPairY(selectedKpis[0]);
    }
  }, [selectedKpis, pairX, pairY]);

  const regression = useMemo(
    () => computeLinearRegression(filteredRows, pairX, pairY),
    [filteredRows, pairX, pairY]
  );

  // Find strongest non-diagonal correlation insight automatically
  const strongestInsight = useMemo(() => {
    if (selectedKpis.length < 2) return null;
    let bestA: KpiKey | null = null;
    let bestB: KpiKey | null = null;
    let bestR = 0;

    for (let i = 0; i < selectedKpis.length; i++) {
      for (let j = i + 1; j < selectedKpis.length; j++) {
        const a = selectedKpis[i];
        const b = selectedKpis[j];
        const r = corrMatrix[a]?.[b];
        if (r !== null && Math.abs(r) > Math.abs(bestR)) {
          bestR = r;
          bestA = a;
          bestB = b;
        }
      }
    }
    if (!bestA || !bestB) return null;
    return { a: bestA, b: bestB, r: bestR };
  }, [selectedKpis, corrMatrix]);

  if (selectedKpis.length === 0) {
    return (
      <Surface className="p-8">
        <p className="text-body text-muted">
          Selecione pelo menos um KPI no menu lateral para calcular as estatísticas descritivas e matriz de correlação.
        </p>
      </Surface>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {/* Correlation Heatmap + Interactive Bivariate Regression Side-by-Side */}
      <Surface className="divide-y xl:divide-y-0 xl:divide-x divide-border/60 grid grid-cols-1 xl:grid-cols-12">
        {/* Left: Heatmap Matrix (One outer border, 1px hairline grid dividers) */}
        <div className="xl:col-span-7 p-5 flex flex-col gap-4 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-title text-foreground">
                Heatmap da matriz de correlação de Pearson
              </h2>
              <p className="text-caption text-muted">
                Coeficiente linear r ∈ [−1, +1] sobre {filteredRows.length} registros · Clique em uma célula para abrir a regressão
              </p>
            </div>
            {strongestInsight && (
              <button
                type="button"
                onClick={() => {
                  setPairX(strongestInsight.a);
                  setPairY(strongestInsight.b);
                }}
                className="text-caption font-medium text-primary hover:underline cursor-pointer"
              >
                Maior relação: {KPI_METADATA[strongestInsight.a].shortLabel} ×{' '}
                {KPI_METADATA[strongestInsight.b].shortLabel} (r ={' '}
                {strongestInsight.r.toFixed(2)})
              </button>
            )}
          </div>

          {selectedKpis.length < 2 ? (
            <p className="py-8 text-body text-muted">
              Selecione ao menos 2 KPIs na barra lateral para construir a matriz de correlação.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border/70 text-label tabular-nums">
                <thead>
                  <tr className="border-b border-border/70 bg-background/60">
                    <th className="p-2.5 text-left text-caption uppercase tracking-wider font-semibold text-muted border-r border-border/70">
                      KPI
                    </th>
                    {selectedKpis.map((colKpi) => (
                      <th
                        key={colKpi}
                        className="p-2.5 text-center text-caption uppercase tracking-wider font-semibold text-muted border-r last:border-r-0 border-border/70"
                      >
                        {KPI_METADATA[colKpi].shortLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {selectedKpis.map((rowKpi) => (
                    <tr key={rowKpi}>
                      <th
                        scope="row"
                        className="p-2.5 text-left text-label font-medium text-foreground bg-background/40 border-r border-border/70 whitespace-nowrap"
                      >
                        {KPI_METADATA[rowKpi].shortLabel}
                      </th>
                      {selectedKpis.map((colKpi) => {
                        const r = corrMatrix[rowKpi]?.[colKpi] ?? null;
                        const cellStyle = getHeatmapCellStyle(r, theme);
                        const isSelectedPair =
                          (pairX === rowKpi && pairY === colKpi) ||
                          (pairX === colKpi && pairY === rowKpi);

                        return (
                          <td
                            key={colKpi}
                            style={cellStyle}
                            className={`p-0 border-r last:border-r-0 border-border/70 ${
                              isSelectedPair ? 'ring-2 ring-inset ring-foreground' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setPairX(rowKpi);
                                setPairY(colKpi);
                              }}
                              aria-label={`Inspecionar correlação entre ${rowKpi} e ${colKpi}: ${
                                r === null ? 'Sem dados' : r.toFixed(2)
                              }`}
                              className="w-full min-h-12 px-2 py-2.5 text-center font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground"
                            >
                              {r === null ? 'Sem dados' : r.toFixed(2)}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend for diverging coolwarm scale */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-caption text-muted">
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-xs"
                style={{ backgroundColor: 'oklch(0.51 0.11 238)' }}
              />
              −1,00 Correlação inversa forte
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-xs border border-border bg-surface" />
              0,00 Independente
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-xs"
                style={{ backgroundColor: 'oklch(0.57 0.135 40)' }}
              />
              +1,00 Correlação direta forte
            </span>
          </div>
        </div>

        {/* Right: Interactive Scatter & OLS Regression Explorer */}
        <div className="xl:col-span-5 p-5 flex flex-col gap-4 min-w-0">
          <div>
            <h2 className="text-title text-foreground">
              Dispersão bivariada e regressão linear
            </h2>
            <p className="text-caption text-muted">
              Ajuste por mínimos quadrados ordinários (OLS) entre dois indicadores
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Eixo X (explicativa)" htmlFor="scatter-x-kpi">
              <select
                id="scatter-x-kpi"
                value={pairX}
                onChange={(e) => setPairX(e.target.value as KpiKey)}
                className={selectClassName}
              >
                {selectedKpis.map((k) => (
                  <option key={k} value={k}>
                    {KPI_METADATA[k].shortLabel} ({KPI_METADATA[k].unit})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Eixo Y (resposta)" htmlFor="scatter-y-kpi">
              <select
                id="scatter-y-kpi"
                value={pairY}
                onChange={(e) => setPairY(e.target.value as KpiKey)}
                className={selectClassName}
              >
                {selectedKpis.map((k) => (
                  <option key={k} value={k}>
                    {KPI_METADATA[k].shortLabel} ({KPI_METADATA[k].unit})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <BivariateScatterChart regression={regression} />
        </div>
      </Surface>

      {/* Descriptive Statistics Table (pandas.describe() + IQR & Boxplot Strip) */}
      <Surface className="divide-y divide-border/60">
        <div className="px-5 py-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-title text-foreground">
              Estatísticas descritivas (describe)
            </h2>
            <p className="text-caption text-muted">
              Resumo paramétrico e quartílico calculado sobre os registros válidos da planta e período ativos
            </p>
          </div>
          <span className="text-caption text-muted tabular-nums">
             Amostra filtrada: {filteredRows.length} linhas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-label tabular-nums border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-background/60 text-caption uppercase tracking-wider text-muted">
                <th className="py-3 px-4 text-left font-semibold">KPI (Unidade)</th>
                <th className="py-3 px-3 text-right font-semibold">N</th>
                <th className="py-3 px-3 text-right font-semibold">Média</th>
                <th className="py-3 px-3 text-right font-semibold">Desv. Padrão</th>
                <th className="py-3 px-3 text-right font-semibold">CV (%)</th>
                <th className="py-3 px-3 text-right font-semibold">Mínimo</th>
                <th className="py-3 px-3 text-right font-semibold">25% (Q1)</th>
                <th className="py-3 px-3 text-right font-semibold">Mediana (50%)</th>
                <th className="py-3 px-3 text-right font-semibold">75% (Q3)</th>
                <th className="py-3 px-3 text-right font-semibold">Máximo</th>
                <th className="py-3 px-4 text-left font-semibold">Distribuição (Q1–Q3)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {stats.map((s) => {
                const meta = KPI_METADATA[s.kpi];
                const span =
                  s.max !== null && s.min !== null ? Math.max(1e-9, s.max - s.min) : 1;
                const q1Pct =
                  s.q25 !== null && s.min !== null ? ((s.q25 - s.min) / span) * 100 : 0;
                const medPct =
                  s.median !== null && s.min !== null
                    ? ((s.median - s.min) / span) * 100
                    : 50;
                const q3Pct =
                  s.q75 !== null && s.min !== null ? ((s.q75 - s.min) / span) * 100 : 100;

                return (
                  <tr key={s.kpi} className="hover:bg-background/50">
                    <td className="py-3 px-4 text-left font-medium text-foreground whitespace-nowrap">
                      {meta.shortLabel}{' '}
                      <span className="text-caption text-muted font-normal">
                        ({meta.unit})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-muted">{s.count}</td>
                    <td className="py-3 px-3 text-right font-medium text-foreground">
                      {formatKpiNumber(s.mean, meta.decimals)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground">
                      {formatKpiNumber(s.std, meta.decimals)}
                    </td>
                    <td className="py-3 px-3 text-right text-muted">
                      {s.cvPercent !== null ? `${formatKpiNumber(s.cvPercent, 1)}%` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-muted">
                      {formatKpiNumber(s.min, meta.decimals)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground">
                      {formatKpiNumber(s.q25, meta.decimals)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-primary">
                      {formatKpiNumber(s.median, meta.decimals)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground">
                      {formatKpiNumber(s.q75, meta.decimals)}
                    </td>
                    <td className="py-3 px-3 text-right text-muted">
                      {formatKpiNumber(s.max, meta.decimals)}
                    </td>
                    <td className="py-3 px-4 min-w-[140px]">
                      {s.count > 1 ? (
                        <svg
                          viewBox="0 0 120 18"
                          className="w-28 h-4 overflow-visible"
                          aria-label={`Boxplot resumido de ${meta.shortLabel}`}
                        >
                          <line
                            x1={4}
                            y1={9}
                            x2={116}
                            y2={9}
                            stroke="var(--color-border)"
                            strokeWidth={1.5}
                          />
                          <line
                            x1={4}
                            y1={5}
                            x2={4}
                            y2={13}
                            stroke="var(--color-muted)"
                            strokeWidth={1.2}
                          />
                          <line
                            x1={116}
                            y1={5}
                            x2={116}
                            y2={13}
                            stroke="var(--color-muted)"
                            strokeWidth={1.2}
                          />
                          <rect
                            x={4 + (q1Pct / 100) * 112}
                            y={3}
                            width={Math.max(3, ((q3Pct - q1Pct) / 100) * 112)}
                            height={12}
                            rx={1.5}
                            fill="var(--color-primary)"
                            fillOpacity={0.22}
                            stroke="var(--color-primary)"
                            strokeWidth={1.2}
                          />
                          <line
                            x1={4 + (medPct / 100) * 112}
                            y1={2}
                            x2={4 + (medPct / 100) * 112}
                            y2={16}
                            stroke="var(--color-accent)"
                            strokeWidth={2}
                          />
                        </svg>
                      ) : (
                        <span className="text-caption text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  );
};
