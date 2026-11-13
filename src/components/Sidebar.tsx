import React, { useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Database,
  ImagePlus,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sun,
  X,
} from 'lucide-react';
import {
  ALL_KPIS,
  KPI_METADATA,
  WorkspaceView,
  type KpiKey,
  type ThemeMode,
} from '../types/eda';
import { Button, Field, inputClassName, selectClassName } from './ui';

interface SidebarProps {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  gerencias: string[];
  selectedGerencia: string;
  onChangeGerencia: (gerencia: string) => void;
  plantas: string[];
  selectedPlanta: string;
  onChangePlanta: (planta: string) => void;
  selectedKpis: KpiKey[];
  onToggleKpi: (kpi: KpiKey) => void;
  onSelectAllKpis: () => void;
  minDate: string;
  maxDate: string;
  startDate: string;
  endDate: string;
  onChangeDateRange: (start: string, end: string) => void;
  onApplyQuickDays: (days: number | 'all') => void;
  isRealtimeActive: boolean;
  onToggleRealtime: () => void;
  simulatedCount: number;
  onClearSimulated: () => void;
  logoUrl: string | null;
  onCustomLogoUpload: (dataUrl: string | null) => void;
  theme: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: { id: WorkspaceView; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: WorkspaceView.OVERVIEW, label: 'Tendências e KPIs', icon: BarChart3 },
  { id: WorkspaceView.CORRELATION, label: 'Correlação e estatísticas', icon: Activity },
  { id: WorkspaceView.DATASET, label: 'Base Excel e registros', icon: Database },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onSelectView,
  gerencias,
  selectedGerencia,
  onChangeGerencia,
  plantas,
  selectedPlanta,
  onChangePlanta,
  selectedKpis,
  onToggleKpi,
  onSelectAllKpis,
  minDate,
  maxDate,
  startDate,
  endDate,
  onChangeDateRange,
  onApplyQuickDays,
  isRealtimeActive,
  onToggleRealtime,
  simulatedCount,
  onClearSimulated,
  logoUrl,
  onCustomLogoUpload,
  theme,
  onChangeTheme,
  mobileOpen,
  onCloseMobile,
}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoFailed(false);
        onCustomLogoUpload(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sidebarContent = (
    <div className="flex flex-col divide-y divide-border/60 text-foreground">
      {/* Brand & Optional Company Logo Upload */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 flex items-center gap-2.5">
            {logoUrl && !logoFailed ? (
              <img
                src={logoUrl}
                alt="Logomarca personalizada para relatório"
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="h-7 w-auto max-w-[195px] object-contain object-left"
              />
            ) : (
              <div className="flex items-center gap-2.5 min-w-0">
                <svg
                  viewBox="0 0 28 28"
                  className="w-7 h-7 shrink-0"
                  aria-hidden="true"
                >
                  <rect
                    x="1"
                    y="1"
                    width="26"
                    height="26"
                    rx="5"
                    fill="var(--color-primary)"
                  />
                  <path
                    d="M7 19V13M12 19V9M17 19V14M22 19V8"
                    stroke="var(--color-primary-foreground)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-label font-semibold text-foreground truncate">
                  Industrial EDA Studio
                </span>
              </div>
            )}
          </div>
          {mobileOpen && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Fechar painel lateral"
              className="md:hidden min-h-9 min-w-9 inline-flex items-center justify-center rounded-control text-muted hover:text-foreground hover:bg-background cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-caption text-muted">
            Telemetria &amp; KPIs Industriais
          </span>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleLogoFile}
            className="sr-only"
            id="company-logo-upload"
          />
          <div className="flex items-center gap-2">
            {logoUrl && (
              <button
                type="button"
                onClick={() => {
                  setLogoFailed(false);
                  onCustomLogoUpload(null);
                }}
                className="text-caption text-muted hover:text-foreground cursor-pointer whitespace-nowrap"
              >
                Remover
              </button>
            )}
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-caption font-medium text-primary hover:underline cursor-pointer whitespace-nowrap"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              Logo no PDF
            </button>
          </div>
        </div>

        {/* Two-option Light / Dark Theme Switcher */}
        <div
          role="group"
          aria-label="Tema da interface"
          className="grid grid-cols-2 gap-1.5 pt-1"
        >
          <button
            type="button"
            aria-pressed={theme === 'light'}
            onClick={() => onChangeTheme('light')}
            className={`min-h-9 px-2.5 rounded-control border inline-flex items-center justify-center gap-1.5 text-caption font-medium transition-[background-color,color,border-color] duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
              theme === 'light'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-surface text-foreground border-border hover:bg-background'
            }`}
          >
            <Sun className="w-3.5 h-3.5 shrink-0" />
            Modo Claro
          </button>
          <button
            type="button"
            aria-pressed={theme === 'dark'}
            onClick={() => onChangeTheme('dark')}
            className={`min-h-9 px-2.5 rounded-control border inline-flex items-center justify-center gap-1.5 text-caption font-medium transition-[background-color,color,border-color] duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
              theme === 'dark'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-surface text-foreground border-border hover:bg-background'
            }`}
          >
            <Moon className="w-3.5 h-3.5 shrink-0" />
            Modo Escuro
          </button>
        </div>
      </div>

      {/* Primary Workspace Navigation */}
      <nav aria-label="Visualizações da plataforma" className="p-3 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isCurrent = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectView(item.id);
                onCloseMobile();
              }}
              aria-current={isCurrent ? 'page' : undefined}
              className={`min-h-10 px-3 rounded-control flex items-center gap-2.5 text-label whitespace-nowrap transition-[background-color,color] duration-150 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                isCurrent
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-foreground hover:bg-background'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Correlated Hierarchy: Gerência -> Planta */}
      <div className="p-4 flex flex-col gap-3.5">
        <h2 className="text-label font-semibold text-foreground">
          Unidade industrial
        </h2>

        <Field label="Gerência" htmlFor="select-gerencia">
          <select
            id="select-gerencia"
            value={selectedGerencia}
            onChange={(e) => onChangeGerencia(e.target.value)}
            className={selectClassName}
          >
            {gerencias.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Planta"
          htmlFor="select-planta"
          hint={`${plantas.length} ${plantas.length === 1 ? 'unidade' : 'unidades'}`}
        >
          <select
            id="select-planta"
            value={selectedPlanta}
            onChange={(e) => onChangePlanta(e.target.value)}
            className={selectClassName}
          >
            {plantas.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Multi-select KPIs */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-label font-semibold text-foreground">
            KPIs selecionados
          </h2>
          <button
            type="button"
            onClick={onSelectAllKpis}
            className="text-caption font-medium text-primary hover:underline cursor-pointer whitespace-nowrap"
          >
            Selecionar todos
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Seleção de KPIs">
          {ALL_KPIS.map((kpi) => {
            const active = selectedKpis.includes(kpi);
            const meta = KPI_METADATA[kpi];
            return (
              <button
                key={kpi}
                type="button"
                aria-pressed={active}
                onClick={() => onToggleKpi(kpi)}
                className={`min-h-8 px-2.5 py-1 rounded-control border text-caption font-medium transition-[background-color,color,border-color] duration-150 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-surface text-foreground border-border hover:bg-background'
                }`}
              >
                {meta.shortLabel} ({meta.unit})
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="p-4 flex flex-col gap-3">
        <h2 className="text-label font-semibold text-foreground">
          Intervalo de datas
        </h2>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Atalhos de período">
          {(
            [
              { label: '30d', val: 30 },
              { label: '60d', val: 60 },
              { label: '90d', val: 90 },
              { label: 'Tudo', val: 'all' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onApplyQuickDays(preset.val)}
              className="min-h-8 px-2.5 rounded-control border border-border bg-surface text-caption font-medium text-foreground hover:bg-background cursor-pointer whitespace-nowrap"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          <Field label="Data inicial" htmlFor="filter-start-date">
            <input
              id="filter-start-date"
              type="date"
              min={minDate}
              max={endDate || maxDate}
              value={startDate}
              onChange={(e) => {
                if (e.target.value) onChangeDateRange(e.target.value, endDate);
              }}
              className={`${inputClassName} tabular-nums`}
            />
          </Field>
          <Field label="Data final" htmlFor="filter-end-date">
            <input
              id="filter-end-date"
              type="date"
              min={startDate || minDate}
              max={maxDate}
              value={endDate}
              onChange={(e) => {
                if (e.target.value) onChangeDateRange(startDate, e.target.value);
              }}
              className={`${inputClassName} tabular-nums`}
            />
          </Field>
        </div>
      </div>

      {/* Real-time Shift Stream Simulator */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-label font-semibold text-foreground">
            Telemetria em tempo real
          </h2>
          <span className="text-caption text-muted tabular-nums">
            {isRealtimeActive ? 'Ativo (2s)' : 'Pausado'}
          </span>
        </div>
        <p className="text-caption text-muted">
          Simula fechamentos contínuos de turno para {selectedPlanta} e recalcula matrizes ao vivo.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            tone={isRealtimeActive ? 'primary' : 'quiet'}
            size="sm"
            onClick={onToggleRealtime}
            className="flex-1"
          >
            {isRealtimeActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                Pausar fluxo
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Iniciar fluxo ao vivo
              </>
            )}
          </Button>
          {simulatedCount > 0 && (
            <Button
              tone="quiet"
              size="sm"
              onClick={onClearSimulated}
              aria-label="Limpar leituras simuladas"
              title="Remover leituras simuladas"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar ({simulatedCount})
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden md:block w-80 shrink-0 border-r border-border/70 bg-surface self-stretch">
        <div className="sticky top-0">{sidebarContent}</div>
      </aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Filtros e navegação"
        >
          <div
            className="fixed inset-0 bg-foreground/35"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-80 max-w-[88vw] bg-surface border-r border-border min-h-0 overflow-y-auto">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
