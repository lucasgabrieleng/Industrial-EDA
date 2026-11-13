import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { formatFullPtDate, formatLocalDate } from '../data/mockIndustrialData';
import {
  ALL_KPIS,
  KPI_METADATA,
  type IndustrialRecord,
  type KpiKey,
} from '../types/eda';
import {
  exportRecordsToCsv,
  exportRecordsToExcel,
  parseIndustrialSpreadsheet,
} from '../utils/excelService';
import { formatKpiNumber } from '../utils/statistics';
import { Button, Field, Surface, inputClassName } from './ui';

interface DatasetViewProps {
  filteredRows: IndustrialRecord[];
  allRows: IndustrialRecord[];
  selectedGerencia: string;
  selectedPlanta: string;
  selectedKpis: KpiKey[];
  highlightedDate: string | null;
  onClearHighlightedDate: () => void;
  onImportRecords: (records: IndustrialRecord[], sourceName: string) => void;
  onAddRecord: (record: IndustrialRecord) => void;
  onDeleteRecord: (id: string) => void;
  onResetDefaultDataset: () => void;
}

type SortKey = 'Data' | KpiKey;

export const DatasetView: React.FC<DatasetViewProps> = ({
  filteredRows,
  allRows,
  selectedGerencia,
  selectedPlanta,
  selectedKpis,
  highlightedDate,
  onClearHighlightedDate,
  onImportRecords,
  onAddRecord,
  onDeleteRecord,
  onResetDefaultDataset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('Data');
  const [sortAsc, setSortAsc] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(25);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState(() => formatLocalDate(new Date()));
  const [newProducao, setNewProducao] = useState('320');
  const [newOee, setNewOee] = useState('84.5');
  const [newDisp, setNewDisp] = useState('92.4');
  const [newQual, setNewQual] = useState('98.6');
  const [newConsumo, setNewConsumo] = useState('3.45');
  const [newCustos, setNewCustos] = useState('4310');

  const handleSpreadsheetFile = async (file: File) => {
    setUploadError(null);
    setStatusNote(null);
    setIsParsing(true);
    try {
      const result = await parseIndustrialSpreadsheet(file);
      onImportRecords(result.records, file.name);
      setStatusNote(
        `Planilha "${file.name}" carregada (${result.records.length} registros válidos${
          result.skippedRows > 0 ? `, ${result.skippedRows} ignorados` : ''
        }).`
      );
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : 'Erro ao processar a planilha Excel/CSV.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parseBounded = (raw: string, min: number, max: number) => {
      const n = Number(raw.replace(',', '.'));
      if (!Number.isFinite(n)) return null;
      return Math.min(max, Math.max(min, n));
    };

    const record: IndustrialRecord = {
      id: `manual-${Date.now()}`,
      Data: newDate || formatLocalDate(new Date()),
      Gerencia: selectedGerencia,
      Planta: selectedPlanta,
      Produção: parseBounded(newProducao, 0, 50000),
      OEE: parseBounded(newOee, 0, 100),
      Disponibilidade: parseBounded(newDisp, 0, 100),
      Qualidade: parseBounded(newQual, 0, 100),
      'Consumo especifico': parseBounded(newConsumo, 0, 500),
      Custos: parseBounded(newCustos, 0, 1000000),
      kind: 'measured',
    };

    onAddRecord(record);
    setShowAddForm(false);
    setStatusNote(
      `Registro diário de ${formatFullPtDate(record.Data)} adicionado em ${selectedPlanta}.`
    );
  };

  const sortedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = filteredRows.filter((r) => {
      if (highlightedDate && r.Data !== highlightedDate) return false;
      if (!q) return true;
      return (
        r.Data.includes(q) ||
        formatFullPtDate(r.Data).includes(q) ||
        r.Planta.toLowerCase().includes(q) ||
        r.Gerencia.toLowerCase().includes(q)
      );
    });

    base.sort((a, b) => {
      if (sortKey === 'Data') {
        return sortAsc
          ? a.Data.localeCompare(b.Data)
          : b.Data.localeCompare(a.Data);
      }
      const va = a[sortKey] ?? -Infinity;
      const vb = b[sortKey] ?? -Infinity;
      return sortAsc ? va - vb : vb - va;
    });
    return base;
  }, [filteredRows, searchQuery, sortKey, sortAsc, highlightedDate]);

  const displayedRows = sortedRows.slice(0, visibleLimit);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 min-w-0">
      {/* Excel / CSV Upload & Workbook Actions */}
      <Surface className="divide-y divide-border/60">
        <div className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-title text-foreground">
              Ingestão de planilha Excel (.xlsx) ou CSV
            </h2>
            <p className="text-caption text-muted">
              Compatível com as colunas originais: Data, Gerencia, Planta, Produção, OEE, Disponibilidade, Qualidade, Consumo especifico e Custos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              tone="quiet"
              size="sm"
              onClick={() =>
                exportRecordsToExcel(
                  allRows,
                  'Industrial_KPIs_Mock_Data.xlsx'
                )
              }
            >
              <FileSpreadsheet className="w-4 h-4" />
              Baixar base modelo (.xlsx)
            </Button>
            <Button
              tone="quiet"
              size="sm"
              onClick={() =>
                exportRecordsToCsv(
                  filteredRows,
                  `KPIs_${selectedPlanta.replace(/\s+/g, '_')}.csv`
                )
              }
            >
              <Download className="w-4 h-4" />
              Exportar recorte (.csv)
            </Button>
            <Button
              tone="quiet"
              size="sm"
              onClick={() => {
                onResetDefaultDataset();
                setStatusNote(
                  'Base industrial padrão (960 registros em 8 plantas) restaurada.'
                );
              }}
            >
              <RotateCcw className="w-4 h-4" />
              Restaurar base padrão
            </Button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Genuine recessed file dropzone using Surface inset */}
          <Surface
            inset
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void handleSpreadsheetFile(file);
            }}
            className={`p-6 border-dashed flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-[border-color] duration-150 ${
              isDragging ? 'border-primary' : 'border-border'
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <Upload className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-label font-medium text-foreground">
                  Arraste sua planilha .xlsx, .xls ou .csv aqui
                </p>
                <p className="text-caption text-muted">
                  Processamento local imediato no navegador · {allRows.length} registros atualmente em memória
                </p>
              </div>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleSpreadsheetFile(file);
                  e.target.value = '';
                }}
                className="sr-only"
                id="spreadsheet-file-upload"
              />
              <Button
                tone="primary"
                size="sm"
                disabled={isParsing}
                onClick={() => fileInputRef.current?.click()}
              >
                {isParsing ? 'Lendo planilha...' : 'Selecionar arquivo Excel / CSV'}
              </Button>
            </div>
          </Surface>

          {uploadError && (
            <p role="alert" className="text-label text-danger font-medium">
              {uploadError}
            </p>
          )}

          {statusNote && (
            <p role="status" className="text-label text-positive font-medium">
              {statusNote}
            </p>
          )}
        </div>
      </Surface>

      {/* Filtered Exploratory Data Table + Inline Record Entry */}
      <Surface className="divide-y divide-border/60">
        <div className="p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <h2 className="text-title text-foreground">
              Tabela de análise exploratória
            </h2>
            <span className="text-caption text-muted tabular-nums">
              {sortedRows.length} de {filteredRows.length} registros exibidos · {selectedPlanta}
            </span>
            {highlightedDate && (
              <button
                type="button"
                onClick={onClearHighlightedDate}
                className="min-h-7 px-2.5 rounded-control border border-primary bg-primary/10 text-caption font-medium text-primary cursor-pointer"
              >
                Data filtrada: {formatFullPtDate(highlightedDate)} ×
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="search"
              aria-label="Filtrar registros por data ou planta"
              placeholder="Buscar data (ex: 12/11)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-9 rounded-control border border-border bg-surface px-3 text-label text-foreground placeholder:text-muted/70 focus-visible:outline-2 focus-visible:outline-primary"
            />
            <Button
              tone={showAddForm ? 'primary' : 'quiet'}
              size="sm"
              onClick={() => setShowAddForm((v) => !v)}
            >
              <Plus className="w-4 h-4" />
              Inserir leitura diária
            </Button>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddSubmit} className="p-5 bg-background/40 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              <Field label="Data" htmlFor="add-date">
                <input
                  id="add-date"
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className={inputClassName}
                />
              </Field>
              <Field label="Produção (t)" htmlFor="add-prod">
                <input
                  id="add-prod"
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={newProducao}
                  onChange={(e) => setNewProducao(e.target.value)}
                  className={inputClassName}
                />
              </Field>
              <Field label="OEE (%)" htmlFor="add-oee">
                <input
                  id="add-oee"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={newOee}
                  onChange={(e) => setNewOee(e.target.value)}
                  className={inputClassName}
                />
              </Field>
              <Field label="Disponib. (%)" htmlFor="add-disp">
                <input
                  id="add-disp"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={newDisp}
                  onChange={(e) => setNewDisp(e.target.value)}
                  className={inputClassName}
                />
              </Field>
              <Field label="Qualidade (%)" htmlFor="add-qual">
                <input
                  id="add-qual"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={newQual}
                  onChange={(e) => setNewQual(e.target.value)}
                  className={inputClassName}
                />
              </Field>
              <Field label="Consumo (MWh/t)" htmlFor="add-cons">
                <input
                  id="add-cons"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newConsumo}
                  onChange={(e) => setNewConsumo(e.target.value)}
                  className={inputClassName}
                />
              </Field>
              <Field label="Custos (R$/t)" htmlFor="add-cost">
                <input
                  id="add-cost"
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={newCustos}
                  onChange={(e) => setNewCustos(e.target.value)}
                  className={inputClassName}
                />
              </Field>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button tone="quiet" size="sm" onClick={() => setShowAddForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" tone="primary" size="sm">
                Salvar registro em {selectedPlanta}
              </Button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-label tabular-nums border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-background/60 text-caption uppercase tracking-wider text-muted">
                <th className="py-3 px-4 text-left font-semibold">
                  <button
                    type="button"
                    onClick={() => toggleSort('Data')}
                    className="inline-flex items-center gap-1 uppercase tracking-wider cursor-pointer hover:text-foreground"
                  >
                    Data
                    {sortKey === 'Data' &&
                      (sortAsc ? (
                        <ArrowUp className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5" />
                      ))}
                  </button>
                </th>
                <th className="py-3 px-3 text-left font-semibold">Origem</th>
                {(selectedKpis.length > 0 ? selectedKpis : ALL_KPIS).map((kpi) => (
                  <th key={kpi} className="py-3 px-3 text-right font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort(kpi)}
                      className="inline-flex items-center justify-end gap-1 uppercase tracking-wider cursor-pointer hover:text-foreground whitespace-nowrap"
                    >
                      {KPI_METADATA[kpi].shortLabel} ({KPI_METADATA[kpi].unit})
                      {sortKey === kpi &&
                        (sortAsc ? (
                          <ArrowUp className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5" />
                        ))}
                    </button>
                  </th>
                ))}
                <th className="py-3 px-3 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {displayedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={(selectedKpis.length || ALL_KPIS.length) + 3}
                    className="py-10 px-4 text-center text-body text-muted"
                  >
                    Nenhum registro encontrado para os critérios informados.
                  </td>
                </tr>
              ) : (
                displayedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-background/50">
                    <td className="py-2.5 px-4 text-left font-medium text-foreground whitespace-nowrap">
                      {formatFullPtDate(row.Data)}
                    </td>
                    <td className="py-2.5 px-3 text-left text-caption text-muted whitespace-nowrap">
                      {row.kind === 'simulated' ? (
                        <span className="text-positive font-medium">Simulado</span>
                      ) : (
                        'Medido'
                      )}
                    </td>
                    {(selectedKpis.length > 0 ? selectedKpis : ALL_KPIS).map((kpi) => (
                      <td
                        key={kpi}
                        className="py-2.5 px-3 text-right text-foreground whitespace-nowrap"
                      >
                        {formatKpiNumber(row[kpi], KPI_METADATA[kpi].decimals)}
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteRecord(row.id);
                          setStatusNote(
                            `Registro de ${formatFullPtDate(row.Data)} removido.`
                          );
                        }}
                        aria-label={`Remover registro de ${formatFullPtDate(row.Data)}`}
                        className="min-h-8 min-w-8 inline-flex items-center justify-center rounded-control text-muted hover:text-danger hover:bg-danger/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {sortedRows.length > visibleLimit && (
          <div className="p-4 flex items-center justify-between gap-3">
            <span className="text-caption text-muted tabular-nums">
              Mostrando {displayedRows.length} de {sortedRows.length} linhas
            </span>
            <div className="flex items-center gap-2">
              <Button
                tone="quiet"
                size="sm"
                onClick={() => setVisibleLimit((prev) => prev + 30)}
              >
                Mostrar mais 30 linhas
              </Button>
              <Button
                tone="ghost"
                size="sm"
                onClick={() => setVisibleLimit(sortedRows.length)}
              >
                Mostrar todas ({sortedRows.length})
              </Button>
            </div>
          </div>
        )}
      </Surface>
    </div>
  );
};
