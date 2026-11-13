import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Table2 } from 'lucide-react';
import { KPI_METADATA, type IndustrialRecord, type KpiKey } from '../types/eda';
import {
  computeDescriptiveStats,
  formatKpiNumber,
  type KpiSummaryComparison,
} from '../utils/statistics';
import { KpiBarChart, KpiTrendChart } from './KpiCharts';
import { Button, Surface } from './ui';

interface OverviewViewProps {
  filteredRows: IndustrialRecord[];
  selectedKpis: KpiKey[];
  comparisons: KpiSummaryComparison[];
  comparisonDays: number;
  onInspectDateInTable: (date?: string) => void;
}

type ChartLayoutMode = 'both' | 'line' | 'bar';

export const OverviewView: React.FC<OverviewViewProps> = ({
  filteredRows,
  selectedKpis,
  comparisons,
  comparisonDays,
  onInspectDateInTable,
}) => {
  const [chartMode, setChartMode] = useState<ChartLayoutMode>('both');
  const [showRollingMean, setShowRollingMean] = useState(true);
  const [highlightOutliers, setHighlightOutliers] = useState(true);

  if (selectedKpis.length === 0) {
    return (
      <Surface className="p-8 flex flex-col items-start gap-3">
        <h2 className="text-title text-foreground">Nenhum KPI selecionado</h2>
        <p className="text-body text-muted">
          Selecione ao menos um indicador no painel lateral para visualizar a síntese operacional, curvas de tendência e distribuição diária.
        </p>
      </Surface>
    );
  }

  if (filteredRows.length === 0) {
    return (
      <Surface className="p-8 flex flex-col items-start gap-3">
        <h2 className="text-title text-foreground">
          Sem registros para o período selecionado
        </h2>
        <p className="text-body text-muted">
          Amplie o intervalo de datas no menu lateral ou carregue uma nova planilha Excel na aba de dados.
        </p>
      </Surface>
    );
  }

  // Lead figure is OEE if selected, otherwise first selected KPI
  const leadComp =
    comparisons.find((c) => c.kpi === 'OEE') ?? comparisons[0];
  const secondaryComps = comparisons
    .filter((c) => c.kpi !== leadComp?.kpi)
    .slice(0, 4);

  const renderDeltaLine = (comp: KpiSummaryComparison) => {
    if (comp.deltaPercent === null) {
      return (
        <span className="inline-flex items-center gap-1 text-caption text-muted">
          <Minus className="w-3.5 h-3.5" />
          Sem janela anterior equivalente
        </span>
      );
    }
    const sign = comp.deltaPercent > 0 ? '+' : '';
    const toneClass =
      comp.isFavorable === null
        ? 'text-muted'
        : comp.isFavorable
          ? 'text-positive'
          : 'text-danger';
    const Icon =
      comp.deltaPercent > 0.05
        ? ArrowUpRight
        : comp.deltaPercent < -0.05
          ? ArrowDownRight
          : Minus;

    return (
      <span className="inline-flex flex-wrap items-center gap-1.5 text-caption tabular-nums">
        <span className={`inline-flex items-center gap-0.5 font-medium ${toneClass}`}>
          <Icon className="w-3.5 h-3.5" />
          {sign}
          {formatKpiNumber(comp.deltaPercent, 1)}%
        </span>
        <span className="text-muted">vs {comparisonDays}d anteriores</span>
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {/* Single-row Answer Figure Strip parted by 1px rules (Zero nested stat boxes) */}
      {leadComp && (
        <Surface className="divide-y lg:divide-y-0 lg:divide-x divide-border/60 grid grid-cols-1 lg:grid-cols-12">
          <div className="p-5 lg:col-span-4 flex flex-col justify-between gap-2 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-label font-medium text-muted">
                {KPI_METADATA[leadComp.kpi].shortLabel} (
                {KPI_METADATA[leadComp.kpi].aggregation === 'sum'
                  ? 'acumulado'
                  : 'média do período'}
                )
              </span>
              <button
                type="button"
                onClick={() => onInspectDateInTable()}
                className="inline-flex items-center gap-1 text-caption font-medium text-primary hover:underline cursor-pointer whitespace-nowrap"
              >
                <Table2 className="w-3.5 h-3.5" />
                Ver linhas ({filteredRows.length})
              </button>
            </div>

            <div className="flex items-baseline gap-2 tabular-nums">
              <span className="text-display text-foreground">
                {formatKpiNumber(
                  leadComp.value,
                  KPI_METADATA[leadComp.kpi].decimals
                )}
              </span>
              <span className="text-title text-muted font-normal">
                {KPI_METADATA[leadComp.kpi].unit}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              {renderDeltaLine(leadComp)}
              <p className="text-caption text-muted">
                {KPI_METADATA[leadComp.kpi].definition}
              </p>
            </div>
          </div>

          {secondaryComps.length > 0 && (
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
              {secondaryComps.map((comp) => {
                const meta = KPI_METADATA[comp.kpi];
                return (
                  <div
                    key={comp.kpi}
                    className="p-5 flex flex-col justify-between gap-2 min-w-0"
                  >
                    <span className="text-label text-muted">
                      {meta.shortLabel}{' '}
                      <span className="text-caption">
                        ({meta.aggregation === 'sum' ? 'soma' : 'média'})
                      </span>
                    </span>
                    <div className="flex items-baseline gap-1.5 tabular-nums">
                      <span className="text-title font-semibold text-foreground">
                        {formatKpiNumber(comp.value, meta.decimals)}
                      </span>
                      <span className="text-caption text-muted">{meta.unit}</span>
                    </div>
                    {renderDeltaLine(comp)}
                  </div>
                );
              })}
            </div>
          )}
        </Surface>
      )}

      {/* Visualization Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Modo de gráfico">
          {(
            [
              { id: 'both', label: 'Tendência e barras' },
              { id: 'line', label: 'Apenas tendência' },
              { id: 'bar', label: 'Apenas barras' },
            ] as const
          ).map((mode) => (
            <Button
              key={mode.id}
              size="sm"
              tone={chartMode === mode.id ? 'primary' : 'quiet'}
              onClick={() => setChartMode(mode.id)}
            >
              {mode.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={showRollingMean}
            onClick={() => setShowRollingMean((v) => !v)}
            className={`min-h-9 px-3 rounded-control border text-caption font-medium cursor-pointer whitespace-nowrap transition-[background-color,color,border-color] duration-150 ${
              showRollingMean
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-surface border-border text-muted hover:text-foreground'
            }`}
          >
            Média móvel 7 dias
          </button>
          <button
            type="button"
            aria-pressed={highlightOutliers}
            onClick={() => setHighlightOutliers((v) => !v)}
            className={`min-h-9 px-3 rounded-control border text-caption font-medium cursor-pointer whitespace-nowrap transition-[background-color,color,border-color] duration-150 ${
              highlightOutliers
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-surface border-border text-muted hover:text-foreground'
            }`}
          >
            Destacar anomalias (1,5×IQR)
          </button>
        </div>
      </div>

      {/* Small Multiples / Per-KPI Trend & Bar Panels (Upgrading Streamlit's per-KPI loop) */}
      <div className="flex flex-col gap-5">
        {selectedKpis.map((kpi) => {
          const meta = KPI_METADATA[kpi];
          const stats = computeDescriptiveStats(filteredRows, kpi);

          return (
            <Surface key={kpi} className="divide-y divide-border/60">
              <div className="px-5 py-3.5 flex flex-wrap items-baseline justify-between gap-3">
                <div className="min-w-0 flex flex-wrap items-baseline gap-2">
                  <h3 className="text-title text-foreground">
                    {meta.shortLabel}
                  </h3>
                  <span className="text-caption text-muted">
                    {meta.definition}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-caption text-muted tabular-nums">
                  <span>
                    Média:{' '}
                    <strong className="text-foreground font-medium">
                      {formatKpiNumber(stats.mean, meta.decimals)} {meta.unit}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    Amplitude: {formatKpiNumber(stats.min, meta.decimals)} a{' '}
                    {formatKpiNumber(stats.max, meta.decimals)} {meta.unit}
                  </span>
                  <span>·</span>
                  <span>
                    DP: {formatKpiNumber(stats.std, meta.decimals)}
                  </span>
                  {stats.outlierCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-accent font-medium">
                        {stats.outlierCount}{' '}
                        {stats.outlierCount === 1 ? 'anomalia' : 'anomalias'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div
                className={`grid grid-cols-1 ${
                  chartMode === 'both'
                    ? 'xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-border/60'
                    : ''
                }`}
              >
                {(chartMode === 'both' || chartMode === 'line') && (
                  <div className="p-5 min-w-0">
                    <KpiTrendChart
                      rows={filteredRows}
                      kpi={kpi}
                      showRollingMean={showRollingMean}
                      highlightOutliers={highlightOutliers}
                      onSelectDate={(date) => onInspectDateInTable(date)}
                    />
                  </div>
                )}

                {(chartMode === 'both' || chartMode === 'bar') && (
                  <div className="p-5 min-w-0">
                    <KpiBarChart
                      rows={filteredRows}
                      kpi={kpi}
                      highlightOutliers={highlightOutliers}
                      onSelectDate={(date) => onInspectDateInTable(date)}
                    />
                  </div>
                )}
              </div>
            </Surface>
          );
        })}
      </div>
    </div>
  );
};
