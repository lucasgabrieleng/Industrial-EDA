import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatFullDate, formatShortDate } from '../data/mockIndustrialData';
import {
  TRANSLATIONS,
  getKpiText,
  translateManagementName,
  translatePlantName,
} from '../i18n/translations';
import {
  KPI_METADATA,
  type CorrelationMatrix,
  type DescriptiveStats,
  type IndustrialRecord,
  type KpiKey,
  type LanguageMode,
} from '../types/eda';
import { formatKpiNumber } from './statistics';

async function loadImageAsDataUrl(src: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 100;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function getDivergingHeatmapRgb(r: number | null): { bg: string; fg: string } {
  if (r === null || !Number.isFinite(r)) {
    return { bg: '#f1f4f7', fg: '#53606e' };
  }
  // Cool mineral blue (#1c5d8f) for negative to neutral white (#f8fafb) to warm copper-terracotta (#b84b24) for positive
  const clamped = Math.max(-1, Math.min(1, r));
  if (clamped >= 0) {
    const t = clamped;
    const red = Math.round(248 + (184 - 248) * t);
    const green = Math.round(250 + (75 - 250) * t);
    const blue = Math.round(251 + (36 - 251) * t);
    return {
      bg: `rgb(${red}, ${green}, ${blue})`,
      fg: t > 0.52 ? '#ffffff' : '#18222d',
    };
  } else {
    const t = Math.abs(clamped);
    const red = Math.round(248 + (28 - 248) * t);
    const green = Math.round(250 + (93 - 250) * t);
    const blue = Math.round(251 + (143 - 251) * t);
    return {
      bg: `rgb(${red}, ${green}, ${blue})`,
      fg: t > 0.52 ? '#ffffff' : '#18222d',
    };
  }
}

function renderCorrelationHeatmapCanvas(
  kpis: KpiKey[],
  matrix: CorrelationMatrix,
  lang: LanguageMode
): string {
  const t = TRANSLATIONS[lang];
  const scale = 2;
  const width = 760;
  const height = 420;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const leftPad = 165;
  const topPad = 48;
  const rightPad = 36;
  const bottomPad = 60;
  const gridW = width - leftPad - rightPad;
  const gridH = height - topPad - bottomPad;
  const n = Math.max(1, kpis.length);
  const cellW = gridW / n;
  const cellH = gridH / n;

  ctx.font = '600 14px sans-serif';
  ctx.fillStyle = '#18222d';
  ctx.textAlign = 'left';
  ctx.fillText(t.pdfHeatmapTitle, leftPad, 26);

  kpis.forEach((rowKpi, rIdx) => {
    const label = getKpiText(rowKpi, lang).shortLabel;
    // Row label
    ctx.font = '500 11px sans-serif';
    ctx.fillStyle = '#2d3a48';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      label,
      leftPad - 12,
      topPad + rIdx * cellH + cellH / 2
    );

    // Column label
    ctx.save();
    ctx.translate(leftPad + rIdx * cellW + cellW / 2, topPad + gridH + 16);
    ctx.font = '500 11px sans-serif';
    ctx.fillStyle = '#2d3a48';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 0);
    ctx.restore();

    kpis.forEach((colKpi, cIdx) => {
      const val = matrix[rowKpi]?.[colKpi] ?? null;
      const { bg, fg } = getDivergingHeatmapRgb(val);
      const x = leftPad + cIdx * cellW;
      const y = topPad + rIdx * cellH;

      ctx.fillStyle = bg;
      ctx.fillRect(x, y, cellW, cellH);
      ctx.strokeStyle = '#d9e0e6';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellW, cellH);

      ctx.font = '600 12px sans-serif';
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        val === null ? '—' : val.toFixed(2),
        x + cellW / 2,
        y + cellH / 2
      );
    });
  });

  return canvas.toDataURL('image/png');
}

function renderKpiDualChartCanvas(
  rows: IndustrialRecord[],
  kpi: KpiKey,
  lang: LanguageMode
): string {
  const meta = KPI_METADATA[kpi];
  const kpiText = getKpiText(kpi, lang);
  const t = TRANSLATIONS[lang];
  const scale = 2;
  const width = 820;
  const height = 270;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const valid = rows
    .filter((r) => typeof r[kpi] === 'number' && Number.isFinite(r[kpi]))
    .map((r) => ({ date: r.Data, val: r[kpi] as number }));

  const drawPanel = (
    offsetX: number,
    panelW: number,
    mode: 'line' | 'bar',
    title: string
  ) => {
    const padL = 54;
    const padR = 16;
    const padT = 36;
    const padB = 38;
    const plotW = panelW - padL - padR;
    const plotH = height - padT - padB;

    ctx.font = '600 12px sans-serif';
    ctx.fillStyle = '#18222d';
    ctx.textAlign = 'left';
    ctx.fillText(title, offsetX + padL, 20);

    if (valid.length === 0) {
      ctx.font = '400 11px sans-serif';
      ctx.fillStyle = '#606f7d';
      ctx.fillText(t.pdfNoData, offsetX + padL, padT + plotH / 2);
      return;
    }

    const vals = valid.map((d) => d.val);
    const maxVal = Math.max(...vals);
    const rawMin = Math.min(...vals);
    // Bars always start at 0
    const yMin = mode === 'bar' ? 0 : Math.max(0, rawMin - (maxVal - rawMin || 1) * 0.12);
    const yMax = maxVal + (maxVal - yMin || 1) * 0.1;

    // 4 horizontal gridlines
    ctx.strokeStyle = '#e5eaef';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const frac = i / 4;
      const y = padT + plotH - frac * plotH;
      ctx.beginPath();
      ctx.moveTo(offsetX + padL, y);
      ctx.lineTo(offsetX + padL + plotW, y);
      ctx.stroke();

      const tickVal = yMin + frac * (yMax - yMin);
      ctx.font = '400 10px sans-serif';
      ctx.fillStyle = '#53606e';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        formatKpiNumber(tickVal, meta.decimals > 1 ? 1 : meta.decimals, lang),
        offsetX + padL - 6,
        y
      );
    }

    if (mode === 'bar') {
      const step = plotW / valid.length;
      const barW = Math.max(1.5, step * 0.72);
      ctx.fillStyle = '#1f5e8e';
      valid.forEach((pt, idx) => {
        const x = offsetX + padL + idx * step + (step - barW) / 2;
        const barH = ((pt.val - yMin) / (yMax - yMin || 1)) * plotH;
        const y = padT + plotH - barH;
        ctx.fillRect(x, y, barW, barH);
      });
    } else {
      ctx.strokeStyle = '#1f5e8e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      valid.forEach((pt, idx) => {
        const x =
          offsetX +
          padL +
          (valid.length === 1 ? plotW / 2 : (idx / (valid.length - 1)) * plotW);
        const y = padT + plotH - ((pt.val - yMin) / (yMax - yMin || 1)) * plotH;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Up to 4 X-axis date labels
    const tickCount = Math.min(4, valid.length);
    for (let tIdx = 0; tIdx < tickCount; tIdx++) {
      const idx =
        tickCount === 1
          ? 0
          : Math.round((tIdx / (tickCount - 1)) * (valid.length - 1));
      const x =
        offsetX +
        padL +
        (valid.length === 1 ? plotW / 2 : (idx / (valid.length - 1)) * plotW);
      ctx.font = '400 10px sans-serif';
      ctx.fillStyle = '#53606e';
      ctx.textAlign = tIdx === 0 ? 'left' : tIdx === tickCount - 1 ? 'right' : 'center';
      ctx.fillText(formatShortDate(valid[idx].date, lang), x, padT + plotH + 18);
    }
  };

  drawPanel(0, 405, 'line', `${t.pdfTrendPrefix} · ${kpiText.shortLabel} (${meta.unit})`);
  drawPanel(415, 405, 'bar', `${t.pdfBarPrefix} · ${kpiText.shortLabel} (${meta.unit})`);

  return canvas.toDataURL('image/png');
}

export interface PdfExportPayload {
  rows: IndustrialRecord[];
  kpis: KpiKey[];
  gerencia: string;
  planta: string;
  startDate: string;
  endDate: string;
  stats: DescriptiveStats[];
  corrMatrix: CorrelationMatrix;
  logoUrl: string | null;
  lang: LanguageMode;
}

export async function generateIndustrialPdfReport(payload: PdfExportPayload): Promise<void> {
  const {
    rows,
    kpis,
    gerencia,
    planta,
    startDate,
    endDate,
    stats,
    corrMatrix,
    logoUrl,
    lang,
  } = payload;
  const t = TRANSLATIONS[lang];
  const displayGerencia = translateManagementName(gerencia, lang);
  const displayPlanta = translatePlantName(planta, lang);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const logoAsset = logoUrl ? await loadImageAsDataUrl(logoUrl) : null;
  let cursorY = 16;

  if (logoAsset) {
    const targetH = 10;
    const ratio = logoAsset.width / Math.max(1, logoAsset.height);
    const targetW = Math.min(58, targetH * ratio);
    doc.addImage(logoAsset.dataUrl, 'PNG', 14, cursorY, targetW, targetH);
    cursorY += 15;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(24, 34, 45);
  doc.text(t.pdfTitle, 14, cursorY);
  cursorY += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(72, 85, 99);
  doc.text(
    `${t.pdfManagement}: ${displayGerencia}   |   ${t.pdfPlant}: ${displayPlanta}`,
    14,
    cursorY
  );
  cursorY += 5;
  const kpiListText = kpis.map((k) => getKpiText(k, lang).shortLabel).join(', ');
  doc.text(
    `${t.pdfPeriod}: ${formatFullDate(startDate, lang)} ${t.to} ${formatFullDate(
      endDate,
      lang
    )} (${rows.length} ${t.pdfRecords})   |   KPIs: ${kpiListText}`,
    14,
    cursorY
  );
  cursorY += 8;

  // Section 1: Descriptive Statistics (pandas.describe() parity)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(24, 34, 45);
  doc.text(t.pdfSec1, 14, cursorY);
  cursorY += 3;

  autoTable(doc, {
    startY: cursorY,
    head: [
      [
        t.colKpiUnit,
        t.pdfCountCol,
        t.colMean,
        t.colStd,
        t.colMin,
        '25%',
        t.colMedian,
        '75%',
        t.colMax,
      ],
    ],
    body: stats.map((s) => {
      const meta = KPI_METADATA[s.kpi];
      return [
        `${getKpiText(s.kpi, lang).shortLabel} (${meta.unit})`,
        String(s.count),
        formatKpiNumber(s.mean, meta.decimals, lang),
        formatKpiNumber(s.std, meta.decimals, lang),
        formatKpiNumber(s.min, meta.decimals, lang),
        formatKpiNumber(s.q25, meta.decimals, lang),
        formatKpiNumber(s.median, meta.decimals, lang),
        formatKpiNumber(s.q75, meta.decimals, lang),
        formatKpiNumber(s.max, meta.decimals, lang),
      ];
    }),
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [31, 94, 142], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cursorY = ((doc as any).lastAutoTable?.finalY ?? cursorY + 45) + 9;

  // Section 2: Correlation Matrix & Heatmap
  if (kpis.length >= 2) {
    if (cursorY > pageHeight - 115) {
      doc.addPage();
      cursorY = 18;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(24, 34, 45);
    doc.text(t.pdfSec2, 14, cursorY);
    cursorY += 4;

    const heatmapImg = renderCorrelationHeatmapCanvas(kpis, corrMatrix, lang);
    const imgW = pageWidth - 28;
    const imgH = (imgW * 420) / 760;
    doc.addImage(heatmapImg, 'PNG', 14, cursorY, imgW, imgH);
    cursorY += imgH + 8;
  }

  // Section 3: Trend and Bar Charts per KPI
  doc.addPage();
  cursorY = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(24, 34, 45);
  doc.text(t.pdfSec3, 14, cursorY);
  cursorY += 6;

  for (const kpi of kpis) {
    const chartImg = renderKpiDualChartCanvas(rows, kpi, lang);
    const imgW = pageWidth - 28;
    const imgH = (imgW * 270) / 820;
    if (cursorY + imgH > pageHeight - 18) {
      doc.addPage();
      cursorY = 18;
    }
    doc.addImage(chartImg, 'PNG', 14, cursorY, imgW, imgH);
    cursorY += imgH + 6;
  }

  // Section 4: Exploratory Data Sample Table (latest 40 records)
  doc.addPage();
  cursorY = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(24, 34, 45);
  doc.text(t.pdfSec4(Math.min(rows.length, 40)), 14, cursorY);
  cursorY += 3;

  const sampleRows = [...rows].slice(-40).reverse();
  autoTable(doc, {
    startY: cursorY,
    head: [
      [
        t.colDate,
        t.pdfPlant,
        ...kpis.map((k) => `${getKpiText(k, lang).shortLabel} (${KPI_METADATA[k].unit})`),
      ],
    ],
    body: sampleRows.map((r) => [
      formatFullDate(r.Data, lang),
      translatePlantName(r.Planta, lang),
      ...kpis.map((k) => formatKpiNumber(r[k], KPI_METADATA[k].decimals, lang)),
    ]),
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [31, 94, 142], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(115, 126, 138);
    doc.text(
      t.pdfFooter(p, totalPages),
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const safePlant = displayPlanta.replace(/[^a-zA-Z0-9_-]/g, '_');
  const prefix = lang === 'pt' ? 'Analise_EDA' : 'EDA_Report';
  doc.save(`${prefix}_${safePlant}_${startDate}_${endDate}.pdf`);
}
