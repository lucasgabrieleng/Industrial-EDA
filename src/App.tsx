import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { Check, FileDown, Link2, Menu } from 'lucide-react';
import { CorrelationStatsView } from './components/CorrelationStatsView';
import { DatasetView } from './components/DatasetView';
import { OverviewView } from './components/OverviewView';
import { Sidebar } from './components/Sidebar';
import { Button } from './components/ui';
import {
  formatFullDate,
  formatLocalDate,
  formatShortDate,
  generateInitialIndustrialDataset,
  generateRealtimeShiftTick,
  parseLocalDate,
} from './data/mockIndustrialData';
import { TRANSLATIONS, translatePlantName } from './i18n/translations';
import {
  ALL_KPIS,
  WorkspaceView,
  type IndustrialRecord,
  type KpiKey,
  type LanguageMode,
  type ThemeMode,
} from './types/eda';
import { generateIndustrialPdfReport } from './utils/pdfExport';
import {
  computeCorrelationMatrix,
  computeDescriptiveStats,
  computeKpiComparison,
} from './utils/statistics';

const STORAGE_KEY = 'industrial_eda_custom_records_v2';
const THEME_STORAGE_KEY = 'industrial_eda_theme_v1';
const LANG_STORAGE_KEY = 'industrial_eda_lang_v1';

function loadInitialRecords(): IndustrialRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        typeof parsed[0]?.Data === 'string' &&
        typeof parsed[0]?.Gerencia === 'string' &&
        typeof parsed[0]?.Planta === 'string'
      ) {
        return parsed as IndustrialRecord[];
      }
    }
  } catch {
    // Ignore storage read errors and fall back to seeded dataset
  }
  return generateInitialIndustrialDataset(120);
}

function saveCustomRecords(records: IndustrialRecord[] | null): void {
  try {
    if (records === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  } catch {
    // Quota or private mode safely ignored
  }
}

export default function App() {
  const [records, setRecords] = useState<IndustrialRecord[]>(() =>
    loadInitialRecords()
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Parse initial URL query parameters if shared link was opened
  const initialParams = useMemo(
    () => new URLSearchParams(window.location.search),
    []
  );

  const [theme, setTheme] = useState<ThemeMode>(() => {
    const paramTheme = initialParams.get('theme');
    if (paramTheme === 'dark' || paramTheme === 'light') {
      return paramTheme;
    }
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // Ignore storage errors
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const [lang, setLang] = useState<LanguageMode>(() => {
    const paramLang = initialParams.get('lang');
    if (paramLang === 'en' || paramLang === 'pt') {
      return paramLang;
    }
    try {
      const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'pt') return saved;
    } catch {
      // Ignore storage errors
    }
    return 'en';
  });

  useEffect(() => {
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : 'en';
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }
  }, [lang]);

  const t = TRANSLATIONS[lang];

  const [activeView, setActiveView] = useState<WorkspaceView>(() => {
    const v = initialParams.get('view');
    if (
      v === WorkspaceView.CORRELATION ||
      v === WorkspaceView.DATASET
    ) {
      return v;
    }
    return WorkspaceView.OVERVIEW;
  });

  const gerencias = useMemo(
    () => Array.from(new Set(records.map((r) => r.Gerencia))),
    [records]
  );

  const [selectedGerencia, setSelectedGerencia] = useState<string>(() => {
    const paramG = initialParams.get('gerencia');
    if (paramG && gerencias.includes(paramG)) return paramG;
    return gerencias.includes('Gerência de Metalurgia e Refino')
      ? 'Gerência de Metalurgia e Refino'
      : gerencias[0] ?? '';
  });

  const plantasForGerencia = useMemo(
    () =>
      Array.from(
        new Set(
          records
            .filter((r) => r.Gerencia === selectedGerencia)
            .map((r) => r.Planta)
        )
      ),
    [records, selectedGerencia]
  );

  const [selectedPlanta, setSelectedPlanta] = useState<string>(() => {
    const paramP = initialParams.get('planta');
    if (paramP && plantasForGerencia.includes(paramP)) return paramP;
    return plantasForGerencia[0] ?? '';
  });

  // Ensure Gerencia and Planta remain valid whenever dataset changes (e.g. after Excel upload)
  useEffect(() => {
    if (gerencias.length > 0 && !gerencias.includes(selectedGerencia)) {
      setSelectedGerencia(gerencias[0]);
    }
  }, [gerencias, selectedGerencia]);

  useEffect(() => {
    if (
      plantasForGerencia.length > 0 &&
      !plantasForGerencia.includes(selectedPlanta)
    ) {
      setSelectedPlanta(plantasForGerencia[0]);
    }
  }, [plantasForGerencia, selectedPlanta]);

  const [selectedKpis, setSelectedKpis] = useState<KpiKey[]>(() => {
    const paramKpis = initialParams.get('kpis');
    if (paramKpis) {
      const parsed = paramKpis
        .split(',')
        .filter((k): k is KpiKey => ALL_KPIS.includes(k as KpiKey));
      if (parsed.length > 0) return parsed;
    }
    return [...ALL_KPIS];
  });

  // Min and max dates for active plant
  const plantDateBounds = useMemo(() => {
    const plantRows = records.filter(
      (r) => r.Gerencia === selectedGerencia && r.Planta === selectedPlanta
    );
    if (plantRows.length === 0) {
      const today = formatLocalDate(new Date());
      return { min: today, max: today };
    }
    let min = plantRows[0].Data;
    let max = plantRows[0].Data;
    for (const r of plantRows) {
      if (r.Data < min) min = r.Data;
      if (r.Data > max) max = r.Data;
    }
    return { min, max };
  }, [records, selectedGerencia, selectedPlanta]);

  const [startDate, setStartDate] = useState<string>(() => {
    const pStart = initialParams.get('start');
    if (pStart && /^\d{4}-\d{2}-\d{2}$/.test(pStart)) return pStart;
    // Default to last 60 days for crisp shape & immediate comparison against prior 60 days
    const maxD = parseLocalDate(plantDateBounds.max);
    const d60 = new Date(maxD.getFullYear(), maxD.getMonth(), maxD.getDate() - 59);
    const str60 = formatLocalDate(d60);
    return str60 < plantDateBounds.min ? plantDateBounds.min : str60;
  });

  const [endDate, setEndDate] = useState<string>(() => {
    const pEnd = initialParams.get('end');
    if (pEnd && /^\d{4}-\d{2}-\d{2}$/.test(pEnd)) return pEnd;
    return plantDateBounds.max;
  });

  // Keep date range within bounds if dataset changes completely
  useEffect(() => {
    if (endDate < plantDateBounds.min || startDate > plantDateBounds.max) {
      setStartDate(plantDateBounds.min);
      setEndDate(plantDateBounds.max);
    }
  }, [plantDateBounds.min, plantDateBounds.max, startDate, endDate]);

  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const tickCounterRef = useRef(0);

  // Real-time 2s industrial shift stream simulator
  useEffect(() => {
    if (!isRealtimeActive || !selectedGerencia || !selectedPlanta) return;
    const timer = window.setInterval(() => {
      tickCounterRef.current += 1;
      setRecords((prev) => {
        const plantRows = prev.filter(
          (r) => r.Gerencia === selectedGerencia && r.Planta === selectedPlanta
        );
        const latest = plantRows.reduce<IndustrialRecord | undefined>(
          (best, cur) => (!best || cur.Data > best.Data ? cur : best),
          undefined
        );
        const nextTick = generateRealtimeShiftTick(
          latest,
          selectedGerencia,
          selectedPlanta,
          tickCounterRef.current
        );
        setEndDate((curEnd) =>
          !latest || curEnd >= latest.Data ? nextTick.Data : curEnd
        );
        return [...prev, nextTick];
      });
    }, 2000);

    return () => window.clearInterval(timer);
  }, [isRealtimeActive, selectedGerencia, selectedPlanta]);

  // Sync URL query params for shareable link capability (including theme and language)
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('view', activeView);
    params.set('theme', theme);
    params.set('lang', lang);
    if (selectedGerencia) params.set('gerencia', selectedGerencia);
    if (selectedPlanta) params.set('planta', selectedPlanta);
    if (selectedKpis.length > 0 && selectedKpis.length < ALL_KPIS.length) {
      params.set('kpis', selectedKpis.join(','));
    }
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', nextUrl);
  }, [activeView, theme, lang, selectedGerencia, selectedPlanta, selectedKpis, startDate, endDate]);

  // Filtered rows for active Gerencia, Planta, and Date window
  const filteredRows = useMemo(() => {
    return records
      .filter(
        (r) =>
          r.Gerencia === selectedGerencia &&
          r.Planta === selectedPlanta &&
          r.Data >= startDate &&
          r.Data <= endDate
      )
      .sort((a, b) => a.Data.localeCompare(b.Data));
  }, [records, selectedGerencia, selectedPlanta, startDate, endDate]);

  // Compute equal-length previous window for honest period-over-period comparison
  const { previousRows, windowDays } = useMemo(() => {
    const s = parseLocalDate(startDate);
    const e = parseLocalDate(endDate);
    const diffDays = Math.max(
      1,
      Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const prevEnd = new Date(s.getFullYear(), s.getMonth(), s.getDate() - 1);
    const prevStart = new Date(
      prevEnd.getFullYear(),
      prevEnd.getMonth(),
      prevEnd.getDate() - (diffDays - 1)
    );
    const prevStartStr = formatLocalDate(prevStart);
    const prevEndStr = formatLocalDate(prevEnd);

    const pRows = records.filter(
      (r) =>
        r.Gerencia === selectedGerencia &&
        r.Planta === selectedPlanta &&
        r.Data >= prevStartStr &&
        r.Data <= prevEndStr
    );
    return { previousRows: pRows, windowDays: diffDays };
  }, [records, selectedGerencia, selectedPlanta, startDate, endDate]);

  const kpiComparisons = useMemo(
    () =>
      selectedKpis.map((kpi) =>
        computeKpiComparison(filteredRows, previousRows, kpi)
      ),
    [selectedKpis, filteredRows, previousRows]
  );

  const descriptiveStats = useMemo(
    () => selectedKpis.map((kpi) => computeDescriptiveStats(filteredRows, kpi)),
    [filteredRows, selectedKpis]
  );

  const correlationMatrix = useMemo(
    () => computeCorrelationMatrix(filteredRows, selectedKpis),
    [filteredRows, selectedKpis]
  );

  const simulatedCount = useMemo(
    () => records.filter((r) => r.kind === 'simulated').length,
    [records]
  );

  const [highlightedDate, setHighlightedDate] = useState<string | null>(null);
  const [deletedRecordUndo, setDeletedRecordUndo] =
    useState<IndustrialRecord | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleToggleKpi = useCallback((kpi: KpiKey) => {
    setSelectedKpis((prev) =>
      prev.includes(kpi) ? prev.filter((item) => item !== kpi) : [...prev, kpi]
    );
  }, []);

  const handleApplyQuickDays = useCallback(
    (days: number | 'all') => {
      if (days === 'all') {
        setStartDate(plantDateBounds.min);
        setEndDate(plantDateBounds.max);
        return;
      }
      const maxD = parseLocalDate(plantDateBounds.max);
      const startD = new Date(
        maxD.getFullYear(),
        maxD.getMonth(),
        maxD.getDate() - (days - 1)
      );
      const candidate = formatLocalDate(startD);
      setStartDate(
        candidate < plantDateBounds.min ? plantDateBounds.min : candidate
      );
      setEndDate(plantDateBounds.max);
    },
    [plantDateBounds.min, plantDateBounds.max]
  );

  const handleExportPdf = async () => {
    if (selectedKpis.length === 0 || filteredRows.length === 0) return;
    setPdfError(null);
    setIsExportingPdf(true);
    try {
      await generateIndustrialPdfReport({
        rows: filteredRows,
        kpis: selectedKpis,
        gerencia: selectedGerencia,
        planta: selectedPlanta,
        startDate,
        endDate,
        stats: descriptiveStats,
        corrMatrix: correlationMatrix,
        logoUrl,
        lang,
      });
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : t.pdfErrorFallback
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2400);
    } catch {
      // Ignore clipboard restriction
    }
  };

  const handleImportSpreadsheet = (newRecords: IndustrialRecord[]) => {
    setIsRealtimeActive(false);
    setRecords(newRecords);
    saveCustomRecords(newRecords);
    const firstG = newRecords[0]?.Gerencia ?? '';
    const firstP = newRecords[0]?.Planta ?? '';
    setSelectedGerencia(firstG);
    setSelectedPlanta(firstP);

    const plantSubset = newRecords.filter(
      (r) => r.Gerencia === firstG && r.Planta === firstP
    );
    if (plantSubset.length > 0) {
      setStartDate(plantSubset[0].Data);
      setEndDate(plantSubset[plantSubset.length - 1].Data);
    }
  };

  const handleAddRecord = (record: IndustrialRecord) => {
    setRecords((prev) => {
      const updated = [...prev, record].sort((a, b) =>
        a.Data.localeCompare(b.Data)
      );
      saveCustomRecords(updated);
      return updated;
    });
    if (record.Data > endDate) setEndDate(record.Data);
    if (record.Data < startDate) setStartDate(record.Data);
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => {
      const target = prev.find((r) => r.id === id) ?? null;
      setDeletedRecordUndo(target);
      const updated = prev.filter((r) => r.id !== id);
      saveCustomRecords(updated);
      return updated;
    });
  };

  const handleUndoDelete = () => {
    if (!deletedRecordUndo) return;
    setRecords((prev) => {
      const restored = [...prev, deletedRecordUndo].sort((a, b) =>
        a.Data.localeCompare(b.Data)
      );
      saveCustomRecords(restored);
      return restored;
    });
    setDeletedRecordUndo(null);
  };

  const handleResetDefault = () => {
    setIsRealtimeActive(false);
    const fresh = generateInitialIndustrialDataset(120);
    setRecords(fresh);
    saveCustomRecords(null);
    setDeletedRecordUndo(null);
    setHighlightedDate(null);
  };

  const viewTitleMap: Record<WorkspaceView, string> = {
    [WorkspaceView.OVERVIEW]: t.viewTitles.overview,
    [WorkspaceView.CORRELATION]: t.viewTitles.correlation,
    [WorkspaceView.DATASET]: t.viewTitles.dataset,
  };

  const displayPlant = translatePlantName(selectedPlanta, lang);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-background text-foreground flex flex-col md:flex-row">
        <Sidebar
          activeView={activeView}
          onSelectView={setActiveView}
          gerencias={gerencias}
          selectedGerencia={selectedGerencia}
          onChangeGerencia={(g) => {
            setSelectedGerencia(g);
            setHighlightedDate(null);
          }}
          plantas={plantasForGerencia}
          selectedPlanta={selectedPlanta}
          onChangePlanta={(p) => {
            setSelectedPlanta(p);
            setHighlightedDate(null);
          }}
          selectedKpis={selectedKpis}
          onToggleKpi={handleToggleKpi}
          onSelectAllKpis={() => setSelectedKpis([...ALL_KPIS])}
          minDate={plantDateBounds.min}
          maxDate={plantDateBounds.max}
          startDate={startDate}
          endDate={endDate}
          onChangeDateRange={(s, e) => {
            setStartDate(s);
            setEndDate(e);
          }}
          onApplyQuickDays={handleApplyQuickDays}
          isRealtimeActive={isRealtimeActive}
          onToggleRealtime={() => setIsRealtimeActive((v) => !v)}
          simulatedCount={simulatedCount}
          onClearSimulated={() => {
            setIsRealtimeActive(false);
            setRecords((prev) => prev.filter((r) => r.kind !== 'simulated'));
          }}
          logoUrl={logoUrl}
          onCustomLogoUpload={setLogoUrl}
          theme={theme}
          onChangeTheme={setTheme}
          lang={lang}
          onChangeLang={setLang}
          mobileOpen={mobileDrawerOpen}
          onCloseMobile={() => setMobileDrawerOpen(false)}
        />

        {/* Main Workspace Stage */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Scoped Workspace Header: Title + <=8-word scope subtitle left; 1 secondary + 1 primary action right */}
          <header className="border-b border-border/70 bg-surface px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                aria-label={t.openDrawer}
                className="md:hidden min-h-10 min-w-10 inline-flex items-center justify-center rounded-control border border-border bg-surface text-foreground hover:bg-background cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <h1 className="text-title sm:text-display text-foreground text-balance">
                  {viewTitleMap[activeView]}
                </h1>
                <p
                  className="text-caption sm:text-label text-muted truncate"
                  title={`${displayPlant} · ${formatShortDate(startDate, lang)} ${t.to} ${formatShortDate(endDate, lang)}`}
                >
                  {displayPlant} · {formatShortDate(startDate, lang)} {t.to}{' '}
                  {formatShortDate(endDate, lang)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button tone="quiet" size="sm" onClick={() => void handleShareLink()}>
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4 text-positive" />
                    {t.linkCopied}
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    {t.shareLink}
                  </>
                )}
              </Button>

              <Button
                tone="primary"
                size="sm"
                disabled={
                  isExportingPdf ||
                  selectedKpis.length === 0 ||
                  filteredRows.length === 0
                }
                onClick={() => void handleExportPdf()}
              >
                <FileDown className="w-4 h-4" />
                {isExportingPdf ? t.exportingPdf : t.exportPdf}
              </Button>
            </div>
          </header>

          {/* Inline Undo or Error Status Strip */}
          {(deletedRecordUndo || pdfError) && (
            <div className="px-4 sm:px-6 lg:px-8 pt-4">
              {deletedRecordUndo && (
                <div
                  role="status"
                  className="rounded-control border border-border bg-surface px-4 py-2.5 flex items-center justify-between gap-3 text-label"
                >
                  <span>
                    {t.recordRemoved(
                      formatFullDate(deletedRecordUndo.Data, lang),
                      translatePlantName(deletedRecordUndo.Planta, lang)
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleUndoDelete}
                    className="font-medium text-primary hover:underline cursor-pointer whitespace-nowrap"
                  >
                    {t.undoDelete}
                  </button>
                </div>
              )}
              {pdfError && (
                <div
                  role="alert"
                  className="rounded-control border border-danger/40 bg-surface px-4 py-2.5 text-label text-danger"
                >
                  {pdfError}
                </div>
              )}
            </div>
          )}

          {/* Active Workspace View */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
            {activeView === WorkspaceView.OVERVIEW && (
              <OverviewView
                gerencia={selectedGerencia}
                planta={selectedPlanta}
                isRealtimeActive={isRealtimeActive}
                filteredRows={filteredRows}
                selectedKpis={selectedKpis}
                comparisons={kpiComparisons}
                comparisonDays={windowDays}
                lang={lang}
                onInspectDateInTable={(date) => {
                  setHighlightedDate(date ?? null);
                  setActiveView(WorkspaceView.DATASET);
                }}
              />
            )}

            {activeView === WorkspaceView.CORRELATION && (
              <CorrelationStatsView
                filteredRows={filteredRows}
                selectedKpis={selectedKpis}
                stats={descriptiveStats}
                corrMatrix={correlationMatrix}
                theme={theme}
                lang={lang}
              />
            )}

            {activeView === WorkspaceView.DATASET && (
              <DatasetView
                filteredRows={filteredRows}
                allRows={records}
                selectedGerencia={selectedGerencia}
                selectedPlanta={selectedPlanta}
                selectedKpis={selectedKpis}
                highlightedDate={highlightedDate}
                lang={lang}
                onClearHighlightedDate={() => setHighlightedDate(null)}
                onImportRecords={handleImportSpreadsheet}
                onAddRecord={handleAddRecord}
                onDeleteRecord={handleDeleteRecord}
                onResetDefaultDataset={handleResetDefault}
              />
            )}
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
