import type { KpiKey, LanguageMode } from '../types/eda';

const KPI_LABELS_EN: Record<
  KpiKey,
  { shortLabel: string; compactLabel: string; definition: string }
> = {
  Produção: {
    shortLabel: 'Production',
    compactLabel: 'Prod.',
    definition: 'Daily plant throughput mass (metric tonnes)',
  },
  OEE: {
    shortLabel: 'OEE',
    compactLabel: 'OEE',
    definition: 'Overall Equipment Effectiveness (Availability × Performance × Quality)',
  },
  Disponibilidade: {
    shortLabel: 'Availability',
    compactLabel: 'Avail.',
    definition: 'Effective operating time divided by scheduled calendar time (%)',
  },
  Qualidade: {
    shortLabel: 'Quality',
    compactLabel: 'Qual.',
    definition: 'First-pass metallurgical yield within specification (%)',
  },
  'Consumo especifico': {
    shortLabel: 'Specific Energy',
    compactLabel: 'Energy',
    definition: 'Electrical and thermal energy consumed per tonne produced (MWh/t)',
  },
  Custos: {
    shortLabel: 'Unit Cost',
    compactLabel: 'Costs',
    definition: 'Industrial transformation cost per metric tonne (BRL/t)',
  },
};

const KPI_LABELS_PT: Record<
  KpiKey,
  { shortLabel: string; compactLabel: string; definition: string }
> = {
  Produção: {
    shortLabel: 'Produção',
    compactLabel: 'Prod.',
    definition: 'Massa diária beneficiada ou fundida na planta (toneladas métricas)',
  },
  OEE: {
    shortLabel: 'OEE',
    compactLabel: 'OEE',
    definition: 'Eficiência global do equipamento (Disponibilidade × Performance × Qualidade)',
  },
  Disponibilidade: {
    shortLabel: 'Disponibilidade',
    compactLabel: 'Disp.',
    definition: 'Tempo operacional efetivo dividido pelo tempo calendário programado (%)',
  },
  Qualidade: {
    shortLabel: 'Qualidade',
    compactLabel: 'Qual.',
    definition: 'Rendimento metalúrgico de primeira passagem dentro da especificação (%)',
  },
  'Consumo especifico': {
    shortLabel: 'Consumo específico',
    compactLabel: 'Consumo',
    definition: 'Energia elétrica e térmica consumida por tonelada produzida (MWh/t)',
  },
  Custos: {
    shortLabel: 'Custos',
    compactLabel: 'Custos',
    definition: 'Custo operacional unitário de transformação industrial (BRL por tonelada)',
  },
};

export function getKpiText(kpi: KpiKey, lang: LanguageMode) {
  return lang === 'pt' ? KPI_LABELS_PT[kpi] : KPI_LABELS_EN[kpi];
}

const MANAGEMENT_EN_MAP: Record<string, string> = {
  'Gerência de Mineração e Beneficiamento': 'Mining & Beneficiation Division',
  'Gerência de Metalurgia e Refino': 'Metallurgy & Refining Division',
  'Gerência de Manufatura e Materiais Avançados': 'Manufacturing & Advanced Materials Division',
};

const PLANT_EN_MAP: Record<string, string> = {
  'Planta Concentração Magnética': 'Magnetic Concentration Plant',
  'Planta Flotação Industrial': 'Industrial Flotation Plant',
  'Planta Britagem e Moagem SAG': 'Crushing & SAG Milling Plant',
  'Planta Pirometalurgia Linha A': 'Pyrometallurgy Line A Plant',
  'Planta Fornos Elétricos de Redução': 'Electric Reduction Furnaces Plant',
  'Planta Lixiviação e Calcinação': 'Leaching & Calcination Plant',
  'Planta Óxidos Técnicos — Linha 01': 'Technical Oxides — Line 01 Plant',
  'Planta Ligas Especiais Alto Vácuo': 'High-Vacuum Specialty Alloys Plant',
};

export function translateManagementName(name: string, lang: LanguageMode): string {
  if (lang === 'pt') return name;
  return MANAGEMENT_EN_MAP[name] ?? name;
}

export function translatePlantName(name: string, lang: LanguageMode): string {
  if (lang === 'pt') return name;
  return PLANT_EN_MAP[name] ?? name;
}

export const TRANSLATIONS = {
  en: {
    subtitle: 'v2.0 · Digital Plant & KPIs',
    logoPdf: 'PDF Logo',
    removeLogo: 'Remove',
    customLogoAlt: 'Custom report logo',
    closeDrawer: 'Close navigation drawer',
    openDrawer: 'Open filters and navigation',
    themeGroupLabel: 'Interface theme',
    lightMode: 'Light',
    darkMode: 'Dark',
    langGroupLabel: 'Application language',
    navLabel: 'Platform views',
    navOverview: 'Trends & KPIs',
    navCorrelation: 'Correlation & Stats',
    navDataset: 'Excel Data & Records',
    industrialUnit: 'Industrial Unit',
    management: 'Management',
    plant: 'Plant',
    unitSingular: 'unit',
    unitPlural: 'units',
    selectedKpis: 'Selected KPIs',
    selectAll: 'Select all',
    dateRange: 'Date Range',
    quickAll: 'All',
    startDate: 'Start date',
    endDate: 'End date',
    realtimeTitle: 'Real-time telemetry',
    realtimeActive: 'Live (2s)',
    realtimePaused: 'Paused',
    realtimeDesc: (plantName: string) =>
      `Simulates continuous shift closings for ${plantName} and recalculates matrices live.`,
    pauseStream: 'Pause stream',
    startStream: 'Start live stream',
    clearSimulated: (n: number) => `Clear (${n})`,
    clearSimulatedAria: 'Clear simulated readings',
    viewTitles: {
      overview: 'Plant Overview, Trends & KPIs',
      correlation: 'Correlation Matrix & Statistics',
      dataset: 'Dataset & Excel Ingestion',
    },
    to: 'to',
    shareLink: 'Share link',
    linkCopied: 'Link copied',
    exportPdf: 'Export PDF report',
    exportingPdf: 'Generating PDF...',
    pdfErrorFallback: 'Unable to generate the PDF file.',
    recordRemoved: (dateStr: string, plantName: string) =>
      `Record from ${dateStr} removed from ${plantName}.`,
    undoDelete: 'Undo delete',
    errorBoundaryTitle: 'Unable to load view',
    errorBoundaryDefault: 'Unexpected error while rendering industrial analytics.',
    reloadApp: 'Reload application',

    // OverviewView
    noKpiTitle: 'No KPI selected',
    noKpiBody:
      'Select at least one indicator in the sidebar to inspect the operational summary, trend curves, and daily distribution.',
    noRowsTitle: 'No records for the selected range',
    noRowsBody:
      'Expand the date range in the sidebar or upload a new Excel spreadsheet in the data tab.',
    aggSum: 'total',
    aggMean: 'period avg',
    aggSumShort: 'sum',
    aggMeanShort: 'avg',
    viewRows: (n: number) => `View rows (${n})`,
    noPriorWindow: 'No equivalent prior window',
    vsPrevDays: (d: number) => `vs prev ${d}d`,
    chartModeLabel: 'Chart mode',
    chartBoth: 'Trend & bars',
    chartLine: 'Trend only',
    chartBar: 'Bars only',
    rollingMeanToggle: '7-day moving average',
    outliersToggle: 'Highlight outliers (1.5×IQR)',
    meanLabel: 'Mean',
    rangeLabel: 'Range',
    stdShort: 'SD',
    anomalySingular: 'outlier',
    anomalyPlural: 'outliers',

    // Charts
    noNumericData: (label: string) =>
      `No numeric records for ${label} in the selected range.`,
    trendSubtitle: (unit: string, withRolling: boolean) =>
      `Daily interval · Unit: ${unit}${withRolling ? ' · Dashed: 7d moving avg' : ''}`,
    hoverPrompt: 'Hover over the curve to inspect a day',
    rollingShort: '7d MA',
    simulatedTag: 'Simulated',
    outlierTag: 'Outside 1.5×IQR',
    targetPrefix: 'Target',
    barSubtitle: (unit: string) => `Daily bar chart (zero baseline · ${unit})`,
    barNoNumericData: (label: string) =>
      `No numeric records for the ${label} bar chart.`,
    daysShown: (n: number) => `${n} days shown`,
    scatterEmpty:
      'Select at least two KPIs with valid records to visualize bivariate scatter and linear regression.',
    daysUnit: 'days',
    daysPerDayUnit: 't/d',

    // IndustrialPlantVisual
    plantSimulatorTitle: (sectorLabel: string) =>
      `Visual Plant Simulator · ${sectorLabel}`,
    lastReading: 'Last reading',
    plantTypeAria: 'Industrial plant topology',
    sectorButtons: {
      auto: 'Auto',
      mining: 'Mining',
      metallurgy: 'Metallurgy',
      manufacturing: 'Manufacturing',
    },
    healthLabels: {
      shutdown: 'Shutdown / Maintenance',
      attention: 'Operational Attention',
      nominal: 'Nominal Operation',
    },
    continuousFlow: 'Continuous flow',
    avgThroughput: 'Avg rate',

    // CorrelationStatsView
    selectOneKpiCorr:
      'Select at least one KPI in the sidebar to compute descriptive statistics and correlation matrix.',
    heatmapTitle: 'Pearson Correlation Matrix Heatmap',
    heatmapSubtitle: (n: number) =>
      `Linear coefficient r ∈ [−1, +1] across ${n} records · Click any cell to open regression`,
    strongestPair: 'Strongest relation',
    needTwoKpis:
      'Select at least 2 KPIs in the sidebar to build the correlation matrix.',
    noDataShort: 'No data',
    corrInverse: '−1.00 Strong inverse',
    corrNeutral: '0.00 Independent',
    corrDirect: '+1.00 Strong direct',
    scatterTitle: 'Bivariate Scatter & Linear Regression',
    scatterSubtitle: 'Ordinary Least Squares (OLS) fit between two KPIs',
    xAxisLabel: 'X-Axis (explanatory)',
    yAxisLabel: 'Y-Axis (response)',
    describeTitle: 'Descriptive Statistics (describe)',
    describeSubtitle:
      'Parametric and quartile summary computed over valid records for the active plant and window',
    filteredSample: (n: number) => `Filtered sample: ${n} rows`,
    colKpiUnit: 'KPI (Unit)',
    colCount: 'N',
    colMean: 'Mean',
    colStd: 'Std. Dev.',
    colCv: 'CV (%)',
    colMin: 'Min',
    colQ1: '25% (Q1)',
    colMedian: 'Median (50%)',
    colQ3: '75% (Q3)',
    colMax: 'Max',
    colDist: 'Distribution (Q1–Q3)',

    // DatasetView
    excelTitle: 'Excel (.xlsx) or CSV Ingestion',
    excelSubtitle:
      'Compatible with standard columns: Data, Gerencia, Planta, Produção, OEE, Disponibilidade, Qualidade, Consumo especifico, and Custos',
    downloadMockExcel: 'Download mock template (.xlsx)',
    exportSliceCsv: 'Export slice (.csv)',
    restoreDefault: 'Restore default data',
    restoreStatus:
      'Default industrial dataset (960 records across 8 plants) restored.',
    dropzoneTitle: 'Drag and drop your .xlsx, .xls, or .csv file here',
    dropzoneDesc: (n: number) =>
      `Instant local browser processing · ${n} records currently in memory`,
    selectSpreadsheetBtn: 'Select Excel / CSV file',
    parsingFile: 'Reading spreadsheet...',
    parseSuccess: (name: string, count: number, skipped: number) =>
      `Spreadsheet "${name}" loaded (${count} valid records${
        skipped > 0 ? `, ${skipped} skipped` : ''
      }).`,
    parseErrorFallback: 'Failed to process the Excel/CSV file.',
    manualAdded: (dateStr: string, plantName: string) =>
      `Daily reading for ${dateStr} added to ${plantName}.`,
    tableTitle: 'Exploratory Data Table',
    rowsDisplayed: (shown: number, total: number, plantName: string) =>
      `${shown} of ${total} records shown · ${plantName}`,
    dateFilteredTag: (d: string) => `Filtered date: ${d} ×`,
    searchPlaceholder: 'Search date (e.g. 11/12)...',
    searchAria: 'Filter records by date or plant',
    insertReading: 'Add daily reading',
    cancel: 'Cancel',
    saveRecordIn: (plantName: string) => `Save record in ${plantName}`,
    colDate: 'Date',
    colSource: 'Source',
    colAction: 'Action',
    sourceSimulated: 'Simulated',
    sourceMeasured: 'Measured',
    noMatchingRows: 'No records found matching the active criteria.',
    showingCount: (shown: number, total: number) =>
      `Showing ${shown} of ${total} rows`,
    showMore30: 'Show 30 more rows',
    showAllRows: (n: number) => `Show all (${n})`,
    deleteSuccess: (dateStr: string) => `Record from ${dateStr} removed.`,
    deleteAria: (dateStr: string) => `Remove record from ${dateStr}`,
    inspectCorrAria: (a: string, b: string, val: string) =>
      `Inspect correlation between ${a} and ${b}: ${val}`,
    boxplotAria: (label: string) => `Summary boxplot for ${label}`,

    // PDF
    pdfTitle: 'Exploratory Data Analysis — Industrial KPI Report',
    pdfHeatmapTitle: 'Pearson Correlation Matrix Heatmap (r)',
    pdfNoData: 'No data in range',
    pdfTrendPrefix: 'Trend',
    pdfBarPrefix: 'Daily Distribution',
    pdfCountCol: 'Count',
    pdfManagement: 'Management',
    pdfPlant: 'Plant',
    pdfPeriod: 'Analyzed period',
    pdfRecords: 'records',
    pdfSec1: '1. Descriptive Statistics (describe)',
    pdfSec2: '2. Pearson Correlation Matrix',
    pdfSec3: '3. KPI Time Trends & Daily Bar Charts',
    pdfSec4: (n: number) =>
      `4. Filtered Dataset — Exploratory Sample (latest ${n} records)`,
    pdfFooter: (p: number, total: number) =>
      `Industrial EDA Studio v2 — Exploratory Data Analysis   |   Page ${p} of ${total}`,
  },
  pt: {
    subtitle: 'v2.0 · Planta Digital & KPIs',
    logoPdf: 'Logo no PDF',
    removeLogo: 'Remover',
    customLogoAlt: 'Logomarca personalizada para relatório',
    closeDrawer: 'Fechar painel lateral',
    openDrawer: 'Abrir filtros e navegação',
    themeGroupLabel: 'Tema da interface',
    lightMode: 'Claro',
    darkMode: 'Escuro',
    langGroupLabel: 'Idioma da aplicação',
    navLabel: 'Visualizações da plataforma',
    navOverview: 'Tendências e KPIs',
    navCorrelation: 'Correlação e estatísticas',
    navDataset: 'Base Excel e registros',
    industrialUnit: 'Unidade industrial',
    management: 'Gerência',
    plant: 'Planta',
    unitSingular: 'unidade',
    unitPlural: 'unidades',
    selectedKpis: 'KPIs selecionados',
    selectAll: 'Selecionar todos',
    dateRange: 'Intervalo de datas',
    quickAll: 'Tudo',
    startDate: 'Data inicial',
    endDate: 'Data final',
    realtimeTitle: 'Telemetria em tempo real',
    realtimeActive: 'Ativo (2s)',
    realtimePaused: 'Pausado',
    realtimeDesc: (plantName: string) =>
      `Simula fechamentos contínuos de turno para ${plantName} e recalcula matrizes ao vivo.`,
    pauseStream: 'Pausar fluxo',
    startStream: 'Iniciar fluxo ao vivo',
    clearSimulated: (n: number) => `Limpar (${n})`,
    clearSimulatedAria: 'Limpar leituras simuladas',
    viewTitles: {
      overview: 'Visão geral da planta, tendências e KPIs',
      correlation: 'Matriz de correlação e estatísticas',
      dataset: 'Base de dados e planilha Excel',
    },
    to: 'a',
    shareLink: 'Compartilhar link',
    linkCopied: 'Link copiado',
    exportPdf: 'Salvar análise em PDF',
    exportingPdf: 'Gerando PDF...',
    pdfErrorFallback: 'Não foi possível gerar o arquivo PDF.',
    recordRemoved: (dateStr: string, plantName: string) =>
      `Registro de ${dateStr} removido de ${plantName}.`,
    undoDelete: 'Desfazer exclusão',
    errorBoundaryTitle: 'Não foi possível carregar a visualização',
    errorBoundaryDefault: 'Erro inesperado ao renderizar a análise industrial.',
    reloadApp: 'Recarregar aplicação',

    // OverviewView
    noKpiTitle: 'Nenhum KPI selecionado',
    noKpiBody:
      'Selecione ao menos um indicador no painel lateral para visualizar a síntese operacional, curvas de tendência e distribuição diária.',
    noRowsTitle: 'Sem registros para o período selecionado',
    noRowsBody:
      'Amplie o intervalo de datas no menu lateral ou carregue uma nova planilha Excel na aba de dados.',
    aggSum: 'acumulado',
    aggMean: 'média do período',
    aggSumShort: 'soma',
    aggMeanShort: 'média',
    viewRows: (n: number) => `Ver linhas (${n})`,
    noPriorWindow: 'Sem janela anterior equivalente',
    vsPrevDays: (d: number) => `vs ${d}d anteriores`,
    chartModeLabel: 'Modo de gráfico',
    chartBoth: 'Tendência e barras',
    chartLine: 'Apenas tendência',
    chartBar: 'Apenas barras',
    rollingMeanToggle: 'Média móvel 7 dias',
    outliersToggle: 'Destacar anomalias (1,5×IQR)',
    meanLabel: 'Média',
    rangeLabel: 'Amplitude',
    stdShort: 'DP',
    anomalySingular: 'anomalia',
    anomalyPlural: 'anomalias',

    // Charts
    noNumericData: (label: string) =>
      `Sem registros numéricos de ${label} para o intervalo selecionado.`,
    trendSubtitle: (unit: string, withRolling: boolean) =>
      `Intervalo diário · Unidade: ${unit}${withRolling ? ' · Tracejada: média móvel 7d' : ''}`,
    hoverPrompt: 'Passe o cursor sobre a curva para inspecionar o dia',
    rollingShort: 'MM7d',
    simulatedTag: 'Simulado',
    outlierTag: 'Fora de 1,5×IQR',
    targetPrefix: 'Meta',
    barSubtitle: (unit: string) => `Gráfico de barras diário (eixo base em zero · ${unit})`,
    barNoNumericData: (label: string) =>
      `Sem registros numéricos para o gráfico de barras de ${label}.`,
    daysShown: (n: number) => `${n} dias exibidos`,
    scatterEmpty:
      'Selecione pelo menos dois KPIs com registros válidos para visualizar a dispersão e a regressão linear.',
    daysUnit: 'dias',
    daysPerDayUnit: 't/dia',

    // IndustrialPlantVisual
    plantSimulatorTitle: (sectorLabel: string) =>
      `Simulador visual da planta · ${sectorLabel}`,
    lastReading: 'Última leitura',
    plantTypeAria: 'Tipo de planta industrial',
    sectorButtons: {
      auto: 'Automático',
      mining: 'Mineração',
      metallurgy: 'Metalurgia',
      manufacturing: 'Manufatura',
    },
    healthLabels: {
      shutdown: 'Parada / Manutenção',
      attention: 'Atenção operacional',
      nominal: 'Operação nominal',
    },
    continuousFlow: 'Fluxo contínuo',
    avgThroughput: 'Vazão média',

    // CorrelationStatsView
    selectOneKpiCorr:
      'Selecione pelo menos um KPI no menu lateral para calcular as estatísticas descritivas e matriz de correlação.',
    heatmapTitle: 'Heatmap da matriz de correlação de Pearson',
    heatmapSubtitle: (n: number) =>
      `Coeficiente linear r ∈ [−1, +1] sobre ${n} registros · Clique em uma célula para abrir a regressão`,
    strongestPair: 'Maior relação',
    needTwoKpis:
      'Selecione ao menos 2 KPIs na barra lateral para construir a matriz de correlação.',
    noDataShort: 'Sem dados',
    corrInverse: '−1,00 Correlação inversa forte',
    corrNeutral: '0,00 Independente',
    corrDirect: '+1,00 Correlação direta forte',
    scatterTitle: 'Dispersão bivariada e regressão linear',
    scatterSubtitle: 'Ajuste por mínimos quadrados ordinários (OLS) entre dois indicadores',
    xAxisLabel: 'Eixo X (explicativa)',
    yAxisLabel: 'Eixo Y (resposta)',
    describeTitle: 'Estatísticas descritivas (describe)',
    describeSubtitle:
      'Resumo paramétrico e quartílico calculado sobre os registros válidos da planta e período ativos',
    filteredSample: (n: number) => `Amostra filtrada: ${n} linhas`,
    colKpiUnit: 'KPI (Unidade)',
    colCount: 'N',
    colMean: 'Média',
    colStd: 'Desv. Padrão',
    colCv: 'CV (%)',
    colMin: 'Mínimo',
    colQ1: '25% (Q1)',
    colMedian: 'Mediana (50%)',
    colQ3: '75% (Q3)',
    colMax: 'Máximo',
    colDist: 'Distribuição (Q1–Q3)',

    // DatasetView
    excelTitle: 'Ingestão de planilha Excel (.xlsx) ou CSV',
    excelSubtitle:
      'Compatível com as colunas originais: Data, Gerencia, Planta, Produção, OEE, Disponibilidade, Qualidade, Consumo especifico e Custos',
    downloadMockExcel: 'Baixar base modelo (.xlsx)',
    exportSliceCsv: 'Exportar recorte (.csv)',
    restoreDefault: 'Restaurar base padrão',
    restoreStatus:
      'Base industrial padrão (960 registros em 8 plantas) restaurada.',
    dropzoneTitle: 'Arraste sua planilha .xlsx, .xls ou .csv aqui',
    dropzoneDesc: (n: number) =>
      `Processamento local imediato no navegador · ${n} registros atualmente em memória`,
    selectSpreadsheetBtn: 'Selecionar arquivo Excel / CSV',
    parsingFile: 'Lendo planilha...',
    parseSuccess: (name: string, count: number, skipped: number) =>
      `Planilha "${name}" carregada (${count} registros válidos${
        skipped > 0 ? `, ${skipped} ignorados` : ''
      }).`,
    parseErrorFallback: 'Erro ao processar a planilha Excel/CSV.',
    manualAdded: (dateStr: string, plantName: string) =>
      `Registro diário de ${dateStr} adicionado em ${plantName}.`,
    tableTitle: 'Tabela de análise exploratória',
    rowsDisplayed: (shown: number, total: number, plantName: string) =>
      `${shown} de ${total} registros exibidos · ${plantName}`,
    dateFilteredTag: (d: string) => `Data filtrada: ${d} ×`,
    searchPlaceholder: 'Buscar data (ex: 12/11)...',
    searchAria: 'Filtrar registros por data ou planta',
    insertReading: 'Inserir leitura diária',
    cancel: 'Cancelar',
    saveRecordIn: (plantName: string) => `Salvar registro em ${plantName}`,
    colDate: 'Data',
    colSource: 'Origem',
    colAction: 'Ação',
    sourceSimulated: 'Simulado',
    sourceMeasured: 'Medido',
    noMatchingRows: 'Nenhum registro encontrado para os critérios informados.',
    showingCount: (shown: number, total: number) =>
      `Mostrando ${shown} de ${total} linhas`,
    showMore30: 'Mostrar mais 30 linhas',
    showAllRows: (n: number) => `Mostrar todas (${n})`,
    deleteSuccess: (dateStr: string) => `Registro de ${dateStr} removido.`,
    deleteAria: (dateStr: string) => `Remover registro de ${dateStr}`,
    inspectCorrAria: (a: string, b: string, val: string) =>
      `Inspecionar correlação entre ${a} e ${b}: ${val}`,
    boxplotAria: (label: string) => `Boxplot resumido de ${label}`,

    // PDF
    pdfTitle: 'Exploratory Data Analysis — Relatório de KPIs Industriais',
    pdfHeatmapTitle: 'Heatmap da Matriz de Correlação de Pearson (r)',
    pdfNoData: 'Sem dados no intervalo',
    pdfTrendPrefix: 'Tendência',
    pdfBarPrefix: 'Distribuição Diária',
    pdfCountCol: 'Contagem',
    pdfManagement: 'Gerência',
    pdfPlant: 'Planta',
    pdfPeriod: 'Período analisado',
    pdfRecords: 'registros',
    pdfSec1: '1. Estatísticas Descritivas (describe)',
    pdfSec2: '2. Matriz de Correlação de Pearson',
    pdfSec3: '3. Tendência Temporal e Gráfico de Barras por KPI',
    pdfSec4: (n: number) =>
      `4. Base Filtrada — Análise Exploratória (${n} registros mais recentes)`,
    pdfFooter: (p: number, total: number) =>
      `Industrial EDA Studio v2 — Análise Exploratória   |   Página ${p} de ${total}`,
  },
};
