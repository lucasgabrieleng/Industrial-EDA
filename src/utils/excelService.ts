import * as XLSX from 'xlsx';
import { formatLocalDate } from '../data/mockIndustrialData';
import type { IndustrialRecord } from '../types/eda';

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function parseExcelDateValue(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;

  if (val instanceof Date && !Number.isNaN(val.getTime())) {
    return formatLocalDate(val);
  }

  if (typeof val === 'number' && Number.isFinite(val)) {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return formatLocalDate(new Date(parsed.y, parsed.m - 1, parsed.d));
    }
  }

  const str = String(val).trim();
  // Match YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return formatLocalDate(d);
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const brMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (brMatch) {
    const d = new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    return formatLocalDate(d);
  }

  return null;
}

function parseOptionalNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  const cleaned = String(val)
    .trim()
    .replace(/\s/g, '')
    .replace(/^R\$\s?/, '');

  // Handle Brazilian comma decimal if no dot decimal or dot is thousand separator
  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  }

  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

export interface ExcelImportResult {
  records: IndustrialRecord[];
  sheetName: string;
  skippedRows: number;
}

export async function parseIndustrialSpreadsheet(file: File): Promise<ExcelImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('O arquivo enviado não contém planilhas válidas.');
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: null,
  });

  if (rawRows.length === 0) {
    throw new Error('A planilha está vazia. Inclua cabeçalhos e registros diários.');
  }

  // Map normalized header -> actual header in sheet
  const firstRowKeys = Object.keys(rawRows[0]);
  const keyLookup = new Map<string, string>();
  for (const k of firstRowKeys) {
    keyLookup.set(normalizeKey(k), k);
  }

  const findCol = (candidates: string[]): string | undefined => {
    for (const c of candidates) {
      const hit = keyLookup.get(normalizeKey(c));
      if (hit) return hit;
    }
    return undefined;
  };

  const colData = findCol(['Data', 'Date', 'Dia']);
  const colGerencia = findCol(['Gerencia', 'Gerência', 'Management', 'Diretoria']);
  const colPlanta = findCol(['Planta', 'Plant', 'Unidade']);

  if (!colData || !colGerencia || !colPlanta) {
    throw new Error(
      'Colunas obrigatórias ausentes. Certifique-se de incluir: Data, Gerencia e Planta.'
    );
  }

  const colProducao = findCol(['Produção', 'Producao', 'Production', 'Volume']);
  const colOee = findCol(['OEE', 'Eficiencia Global']);
  const colDisp = findCol(['Disponibilidade', 'Availability']);
  const colQual = findCol(['Qualidade', 'Quality']);
  const colConsumo = findCol([
    'Consumo especifico',
    'Consumo específico',
    'Consumo',
    'Specific Consumption',
  ]);
  const colCustos = findCol(['Custos', 'Custo', 'Costs', 'Cost']);

  const records: IndustrialRecord[] = [];
  let skippedRows = 0;

  rawRows.forEach((row, idx) => {
    const dateStr = parseExcelDateValue(row[colData]);
    const gerencia = row[colGerencia] ? String(row[colGerencia]).trim() : '';
    const planta = row[colPlanta] ? String(row[colPlanta]).trim() : '';

    if (!dateStr || !gerencia || !planta) {
      skippedRows++;
      return;
    }

    records.push({
      id: `upload-${idx}-${dateStr}`,
      Data: dateStr,
      Gerencia: gerencia,
      Planta: planta,
      Produção: colProducao ? parseOptionalNumber(row[colProducao]) : null,
      OEE: colOee ? parseOptionalNumber(row[colOee]) : null,
      Disponibilidade: colDisp ? parseOptionalNumber(row[colDisp]) : null,
      Qualidade: colQual ? parseOptionalNumber(row[colQual]) : null,
      'Consumo especifico': colConsumo ? parseOptionalNumber(row[colConsumo]) : null,
      Custos: colCustos ? parseOptionalNumber(row[colCustos]) : null,
      kind: 'measured',
    });
  });

  if (records.length === 0) {
    throw new Error(
      'Nenhuma linha válida encontrada. Verifique o formato da coluna Data (AAAA-MM-DD ou DD/MM/AAAA).'
    );
  }

  records.sort((a, b) => a.Data.localeCompare(b.Data));
  return { records, sheetName, skippedRows };
}

export function buildExcelArrayBuffer(records: IndustrialRecord[]): ArrayBuffer {
  const sheetRows = records.map((r) => ({
    Data: r.Data,
    Gerencia: r.Gerencia,
    Planta: r.Planta,
    Produção: r.Produção ?? '',
    OEE: r.OEE ?? '',
    Disponibilidade: r.Disponibilidade ?? '',
    Qualidade: r.Qualidade ?? '',
    'Consumo especifico': r['Consumo especifico'] ?? '',
    Custos: r.Custos ?? '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(sheetRows);
  worksheet['!cols'] = [
    { wch: 13 },
    { wch: 36 },
    { wch: 34 },
    { wch: 14 },
    { wch: 11 },
    { wch: 16 },
    { wch: 12 },
    { wch: 20 },
    { wch: 13 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'KPIs_Industriais');
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
}

export function exportRecordsToExcel(
  records: IndustrialRecord[],
  filename = 'Industrial_KPIs_Mock_Data.xlsx'
): void {
  const buffer = buildExcelArrayBuffer(records);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildCsvString(records: IndustrialRecord[]): string {
  const header = [
    'Data',
    'Gerencia',
    'Planta',
    'Produção',
    'OEE',
    'Disponibilidade',
    'Qualidade',
    'Consumo especifico',
    'Custos',
  ].join(',');

  const lines = records.map((r) =>
    [
      r.Data,
      `"${r.Gerencia.replace(/"/g, '""')}"`,
      `"${r.Planta.replace(/"/g, '""')}"`,
      r.Produção ?? '',
      r.OEE ?? '',
      r.Disponibilidade ?? '',
      r.Qualidade ?? '',
      r['Consumo especifico'] ?? '',
      r.Custos ?? '',
    ].join(',')
  );

  return [header, ...lines].join('\n');
}

export function exportRecordsToCsv(
  records: IndustrialRecord[],
  filename = 'Industrial_KPIs_Mock_Data.csv'
): void {
  const csv = buildCsvString(records);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
