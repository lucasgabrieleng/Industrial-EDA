# Industrial EDA Studio — Dynamic Exploratory Data Analysis

> Modern **Industrial Exploratory Data Analysis (EDA)** web platform migrated from Python/Streamlit to **React 19, TypeScript, Vite, and Tailwind CSS** for real-time KPI monitoring, statistical diagnostics, Excel ingestion, and PDF executive reporting.

## Overview

Industrial engineering teams frequently rely on Excel spreadsheets and static scripts to inspect production stability, Overall Equipment Effectiveness (OEE), specific energy consumption, and unit costs. This project transforms a multi-iteration Python/Streamlit EDA workflow into a fast, client-side **React + TypeScript** analytical workspace with realistic simulated plant data and zero backend dependencies.

## Key Features

- **Correlated Hierarchy Filtering**: Dynamic `Gerência` $\rightarrow$ `Planta` cascading selectors, multi-select KPI toggles, and quick date-range windows (`30d`, `60d`, `90d`, `Tudo`, or custom range).
- **Dynamic KPI Trends & Distributions**: Interactive SVG time-series trend lines (with 7-day rolling mean and $1.5 \times \text{IQR}$ Tukey outlier highlighting) paired with zero-baseline daily bar charts and period-over-period comparisons.
- **Real-Time Shift Telemetry Simulator**: Stream live operational shift readings every 2 seconds to observe dynamic recalculation of trends, descriptive statistics, and correlations.
- **Pearson Correlation Heatmap & OLS Regression**: Clickable diverging correlation matrix (`coolwarm` scale) coupled with an interactive bivariate scatter plot and Ordinary Least Squares regression line ($r$, $R^2$, equation).
- **Complete Descriptive Statistics (`describe()`)**: Count, mean, sample standard deviation ($n-1$), coefficient of variation (CV%), min, quartiles (`Q1`, median, `Q3`), max, and inline SVG boxplots.
- **Excel (`.xlsx` / `.xls`) & CSV Ingestion**: Drag-and-drop spreadsheet upload via SheetJS (`xlsx`), downloadable mock Excel template (`Industrial_KPIs_Mock_Data.xlsx`), manual daily record entry, and delete/undo actions persisted in `localStorage`.
- **Light & Dark Themes (`?theme=light` / `?theme=dark`)**: Instant switching between high-contrast **Modo Claro** and **Modo Escuro** control-room palettes, persisted locally and preserved in shareable URLs so both visual modes can be published and showcased.
- **Branded Multi-Page PDF Export & Shareable URLs**: Generate executive PDF reports (with optional custom logo upload, descriptive stats table, correlation heatmap, and KPI charts) and copy shareable filter state URLs.

## Mock Dataset Schema

The built-in simulator seeds **960 daily records** across **3 management units** and **8 industrial plants** with the following schema:

| Column | Type | Unit / Description |
| :--- | :--- | :--- |
| `Data` | Date (`YYYY-MM-DD`) | Daily operational date |
| `Gerencia` | String | Industrial management unit |
| `Planta` | String | Plant or production line |
| `Produção` | Number | Daily output (`t`) |
| `OEE` | Number | Overall Equipment Effectiveness (`%`) |
| `Disponibilidade` | Number | Operational availability (`%`) |
| `Qualidade` | Number | First-pass yield (`%`) |
| `Consumo especifico` | Number | Specific energy consumption (`MWh/t`) |
| `Custos` | Number | Unit transformation cost (`R$/t`) |

## Getting Started Locally

```bash
# Install dependencies
npm install

# Run development server on http://localhost:3000
npm run dev

# Type-check and build for production
npm run lint
npm run build
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion
- **Data & Reporting**: SheetJS (`xlsx`), jsPDF, `jspdf-autotable`
- **Build Tool**: Vite
