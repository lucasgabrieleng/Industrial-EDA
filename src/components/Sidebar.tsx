import React, { useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Database,
  ImagePlus,
  Languages,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sun,
  X,
} from 'lucide-react';
import {
  TRANSLATIONS,
  getKpiText,
  translateManagementName,
  translatePlantName,
} from '../i18n/translations';
import {
  ALL_KPIS,
  KPI_METADATA,
  WorkspaceView,
  type KpiKey,
  type LanguageMode,
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
  lang: LanguageMode;
  onChangeLang: (lang: LanguageMode) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

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
  lang,
  onChangeLang,
  mobileOpen,
  onCloseMobile,
}) => {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const t = TRANSLATIONS[lang];

  const navItems: {
    id: WorkspaceView;
    label: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    { id: WorkspaceView.OVERVIEW, label: t.navOverview, icon: BarChart3 },
    { id: WorkspaceView.CORRELATION, label: t.navCorrelation, icon: Activity },
    { id: WorkspaceView.DATASET, label: t.navDataset, icon: Database },
  ];

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
      {/* Brand, Logo Upload, Theme & Language Controls */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 flex items-center gap-2.5">
            {logoUrl && !logoFailed ? (
              <img
                src={logoUrl}
                alt={t.customLogoAlt}
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
              aria-label={t.closeDrawer}
              className="md:hidden min-h-9 min-w-9 inline-flex items-center justify-center rounded-control text-muted hover:text-foreground hover:bg-background cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-caption text-muted">{t.subtitle}</span>
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
                {t.removeLogo}
              </button>
            )}
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-caption font-medium text-primary hover:underline cursor-pointer whitespace-nowrap"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {t.logoPdf}
            </button>
          </div>
        </div>

        {/* Light / Dark Theme Switcher + English / Portuguese Switcher */}
        <div className="flex flex-col gap-2 pt-1">
          <div
            role="group"
            aria-label={t.themeGroupLabel}
            className="grid grid-cols-2 gap-1.5"
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
              {t.lightMode}
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
              {t.darkMode}
            </button>
          </div>

          <div
            role="group"
            aria-label={t.langGroupLabel}
            className="grid grid-cols-2 gap-1.5"
          >
            <button
              type="button"
              aria-pressed={lang === 'en'}
              onClick={() => onChangeLang('en')}
              className={`min-h-9 px-2.5 rounded-control border inline-flex items-center justify-center gap-1.5 text-caption font-medium transition-[background-color,color,border-color] duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                lang === 'en'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-surface text-foreground border-border hover:bg-background'
              }`}
            >
              <Languages className="w-3.5 h-3.5 shrink-0" />
              English
            </button>
            <button
              type="button"
              aria-pressed={lang === 'pt'}
              onClick={() => onChangeLang('pt')}
              className={`min-h-9 px-2.5 rounded-control border inline-flex items-center justify-center gap-1.5 text-caption font-medium transition-[background-color,color,border-color] duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
                lang === 'pt'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-surface text-foreground border-border hover:bg-background'
              }`}
            >
              <Languages className="w-3.5 h-3.5 shrink-0" />
              Português
            </button>
          </div>
        </div>
      </div>

      {/* Primary Workspace Navigation */}
      <nav aria-label={t.navLabel} className="p-3 flex flex-col gap-1">
        {navItems.map((item) => {
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

      {/* Correlated Hierarchy: Management -> Plant */}
      <div className="p-4 flex flex-col gap-3.5">
        <h2 className="text-label font-semibold text-foreground">
          {t.industrialUnit}
        </h2>

        <Field label={t.management} htmlFor="select-gerencia">
          <select
            id="select-gerencia"
            value={selectedGerencia}
            onChange={(e) => onChangeGerencia(e.target.value)}
            className={selectClassName}
          >
            {gerencias.map((g) => (
              <option key={g} value={g}>
                {translateManagementName(g, lang)}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={t.plant}
          htmlFor="select-planta"
          hint={`${plantas.length} ${
            plantas.length === 1 ? t.unitSingular : t.unitPlural
          }`}
        >
          <select
            id="select-planta"
            value={selectedPlanta}
            onChange={(e) => onChangePlanta(e.target.value)}
            className={selectClassName}
          >
            {plantas.map((p) => (
              <option key={p} value={p}>
                {translatePlantName(p, lang)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Multi-select KPIs */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-label font-semibold text-foreground">
            {t.selectedKpis}
          </h2>
          <button
            type="button"
            onClick={onSelectAllKpis}
            className="text-caption font-medium text-primary hover:underline cursor-pointer whitespace-nowrap"
          >
            {t.selectAll}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.selectedKpis}>
          {ALL_KPIS.map((kpi) => {
            const active = selectedKpis.includes(kpi);
            const meta = KPI_METADATA[kpi];
            const kpiText = getKpiText(kpi, lang);
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
                {kpiText.shortLabel} ({meta.unit})
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range Controls */}
      <div className="p-4 flex flex-col gap-3">
        <h2 className="text-label font-semibold text-foreground">
          {t.dateRange}
        </h2>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t.dateRange}>
          {(
            [
              { label: '30d', val: 30 },
              { label: '60d', val: 60 },
              { label: '90d', val: 90 },
              { label: t.quickAll, val: 'all' },
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
          <Field label={t.startDate} htmlFor="filter-start-date">
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
          <Field label={t.endDate} htmlFor="filter-end-date">
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
            {t.realtimeTitle}
          </h2>
          <span className="text-caption text-muted tabular-nums">
            {isRealtimeActive ? t.realtimeActive : t.realtimePaused}
          </span>
        </div>
        <p className="text-caption text-muted">
          {t.realtimeDesc(translatePlantName(selectedPlanta, lang))}
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
                {t.pauseStream}
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                {t.startStream}
              </>
            )}
          </Button>
          {simulatedCount > 0 && (
            <Button
              tone="quiet"
              size="sm"
              onClick={onClearSimulated}
              aria-label={t.clearSimulatedAria}
              title={t.clearSimulatedAria}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t.clearSimulated(simulatedCount)}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:block w-80 shrink-0 border-r border-border/70 bg-surface self-stretch">
        <div className="sticky top-0">{sidebarContent}</div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label={t.openDrawer}
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
