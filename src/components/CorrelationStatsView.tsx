import React, { useEffect, useMemo, useState } from 'react';
import { TRANSLATIONS, getKpiText } from '../i18n/translations';
import {
  KPI_METADATA,
  type CorrelationMatrix,
  type DescriptiveStats,
  type IndustrialRecord,
  type KpiKey,
  type LanguageMode,
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
  lang: LanguageMode;
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
  lang,
}) => {
  const t = TRANSLATIONS[lang];
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
        <p className="text-body text-muted">{t.selectOneKpiCorr}</p>
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
              <h2 className="text-title text-foreground">{t.heatmapTitle}</h2>
              <p className="text-caption text-muted">
                {t.heatmapSubtitle(filteredRows.length)}
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
                {t.strongestPair}: {getKpiText(strongestInsight.a, lang).shortLabel} ×{' '}
                {getKpiText(strongestInsight.b, lang).shortLabel} (r ={' '}
                {strongestInsight.r.toFixed(2)})
              </button>
            )}
          </div>

          {selectedKpis.length < 2 ? (
            <p className="py-8 text-body text-muted">{t.needTwoKpis}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border/70 text-caption sm:text-label tabular-nums">
                <thead>
                  <tr className="border-b border-border/70 bg-background/60">
                    <th className="px-2 py-2 text-left text-caption uppercase tracking-wider font-semibold text-muted border-r border-border/70">
                      KPI
                    </th>
                    {selectedKpis.map((colKpi) => {
                      const kpiText = getKpiText(colKpi, lang);
                      return (
                        <th
                          key={colKpi}
                          title={kpiText.shortLabel}
                          className="px-1.5 py-2 text-center text-caption uppercase tracking-wider font-semibold text-muted border-r last:border-r-0 border-border/70 whitespace-nowrap"
                        >
                          {kpiText.compactLabel}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {selectedKpis.map((rowKpi) => {
                    const rowText = getKpiText(rowKpi, lang);
                    return (
                      <tr key={rowKpi}>
                        <th
                          scope="row"
                          className="px-2 py-2 text-left text-caption sm:text-label font-medium text-foreground bg-background/40 border-r border-border/70 whitespace-nowrap"
                        >
                          {rowText.shortLabel}
                        </th>
                        {selectedKpis.map((colKpi) => {
                          const r = corrMatrix[rowKpi]?.[colKpi] ?? null;
                          const cellStyle = getHeatmapCellStyle(r, theme);
                          const isSelectedPair =
                            (pairX === rowKpi && pairY === colKpi) ||
                            (pairX === colKpi && pairY === rowKpi);
                          const colText = getKpiText(colKpi, lang);
                          const valText = r === null ? t.noDataShort : r.toFixed(2);

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
                                aria-label={t.inspectCorrAria(
                                  rowText.shortLabel,
                                  colText.shortLabel,
                                  valText
                                )}
                                className="w-full min-h-12 px-2 py-2.5 text-center font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-foreground"
                              >
                                {valText}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
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
              {t.corrInverse}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-xs border border-border bg-surface" />
              {t.corrNeutral}
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-xs"
                style={{ backgroundColor: 'oklch(0.57 0.135 40)' }}
              />
              {t.corrDirect}
            </span>
          </div>
        </div>

        {/* Right: Interactive Scatter & OLS Regression Explorer */}
        <div className="xl:col-span-5 p-5 flex flex-col gap-4 min-w-0">
          <div>
            <h2 className="text-title text-foreground">{t.scatterTitle}</h2>
            <p className="text-caption text-muted">{t.scatterSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t.xAxisLabel} htmlFor="scatter-x-kpi">
              <select
                id="scatter-x-kpi"
                value={pairX}
                onChange={(e) => setPairX(e.target.value as KpiKey)}
                className={selectClassName}
              >
                {selectedKpis.map((k) => (
                  <option key={k} value={k}>
                    {getKpiText(k, lang).shortLabel} ({KPI_METADATA[k].unit})
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.yAxisLabel} htmlFor="scatter-y-kpi">
              <select
                id="scatter-y-kpi"
                value={pairY}
                onChange={(e) => setPairY(e.target.value as KpiKey)}
                className={selectClassName}
              >
                {selectedKpis.map((k) => (
                  <option key={k} value={k}>
                    {getKpiText(k, lang).shortLabel} ({KPI_METADATA[k].unit})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <BivariateScatterChart regression={regression} lang={lang} />
        </div>
      </Surface>

      {/* Descriptive Statistics Table (pandas.describe() + IQR & Boxplot Strip) */}
      <Surface className="divide-y divide-border/60">
        <div className="px-5 py-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-title text-foreground">{t.describeTitle}</h2>
            <p className="text-caption text-muted">{t.describeSubtitle}</p>
          </div>
          <span className="text-caption text-muted tabular-nums">
            {t.filteredSample(filteredRows.length)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-label tabular-nums border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-background/60 text-caption uppercase tracking-wider text-muted">
                <th className="py-3 px-4 text-left font-semibold">{t.colKpiUnit}</th>
                <th className="py-3 px-3 text-right font-semibold">{t.colCount}</th>
                <th className="py-3 px-3 text-right font-semibold">{t.colMean}</th>
                <th className="py-3 px-3 text-right font-semibold">{t.colStd}</th>
                <th className="py-3 px-3 text-right font-semibold">{t.colCv}</th>
                <th className="py-3 px-3 text-right font-semibold">{t.colMin}</th>
                <th className="py-3 px-3 text-right font-semibold">{t.colQ1}</th>
                <th className="py-3 px-3 text-right font-semibold">{t.colMedian}</th>
                <th className="py-3 px-3 text-right font-semibold">{t.colQ3}</th>
                <th className="py-3 px-3 text-right font-semibold">{t.colMax}</th>
                <th className="py-3 px-4 text-left font-semibold">{t.colDist}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {stats.map((s) => {
                const meta = KPI_METADATA[s.kpi];
                const kpiText = getKpiText(s.kpi, lang);
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
                      {kpiText.shortLabel}{' '}
                      <span className="text-caption text-muted font-normal">
                        ({meta.unit})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-muted">{s.count}</td>
                    <td className="py-3 px-3 text-right font-medium text-foreground">
                      {formatKpiNumber(s.mean, meta.decimals, lang)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground">
                      {formatKpiNumber(s.std, meta.decimals, lang)}
                    </td>
                    <td className="py-3 px-3 text-right text-muted">
                      {s.cvPercent !== null ? `${formatKpiNumber(s.cvPercent, 1, lang)}%` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right text-muted">
                      {formatKpiNumber(s.min, meta.decimals, lang)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground">
                      {formatKpiNumber(s.q25, meta.decimals, lang)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-primary">
                      {formatKpiNumber(s.median, meta.decimals, lang)}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground">
                      {formatKpiNumber(s.q75, meta.decimals, lang)}
                    </td>
                    <td className="py-3 px-3 text-right text-muted">
                      {formatKpiNumber(s.max, meta.decimals, lang)}
                    </td>
                    <td className="py-3 px-4 min-w-[140px]">
                      {s.count > 1 ? (
                        <svg
                          viewBox="0 0 120 18"
                          className="w-28 h-4 overflow-visible"
                          aria-label={t.boxplotAria(kpiText.shortLabel)}
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
