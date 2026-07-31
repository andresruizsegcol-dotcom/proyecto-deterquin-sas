// Página de Informes
// - El TIPO de informe (Detallado / Cantidad Total / Consumo / ... ) viene
//   de la ruta `/informes/:tipo`, elegido desde el submenú del sidebar
//   (ver constants/reportTypes.js, fuente única compartida con Sidebar.jsx).
// - Los datos de cada informe se generan a partir de configuración REAL
//   del proyecto (clientes, dispositivos, productos, programas, lavadoras,
//   bombas) en vez de inventar datos sueltos; donde no hay telemetría real
//   conectada (Fase 9, Backend pendiente), se simula de forma consistente
//   reutilizando los mismos servicios que ya alimentan Datos en Vivo y el
//   Dashboard del dispositivo.
import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  MdArrowBack, MdDownload, MdFilterList, MdImportExport, MdRefresh,
  MdSearch, MdClose,
} from "react-icons/md";
import ExcelJS from "exceljs";
import { getClients, getDevicesForClient, getProductsForClient } from "../../services/localMock";
import {
  simulateHistoricalWashEvents, simulateDeviceLiveState, simulateProgramHistogram,
  simulateFlujoPorLavadora, simulateFlujoPorBomba, HISTOGRAM_TYPES,
} from "../../services/deviceLiveSimulation";
import { REPORT_TYPES, DEFAULT_REPORT_SLUG } from "../../constants/reportTypes";
import MiniLineChart from "../../components/charts/MiniLineChart";
import MiniPieChart from "../../components/charts/MiniPieChart";
import ProgramHistogram from "../../components/charts/ProgramHistogram";
import "./Reportspage.css";

const LINE_PALETTE = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const PIE_PALETTE = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

function formatNumber(value) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(value || 0);
}
function formatFecha(fecha) {
  return new Date(fecha).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}
function formatDuracion(segundos) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}min ${s}s`;
}

// ── Helpers de exportación CSV ──────────────────────────────────────────────
// Escape correcto: NO envuelve en comillas a no ser que el valor contenga
// caracteres conflictivos (comilla doble, coma, salto de línea o ;).
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const needsQuote = /["\n\r;,]/.test(str);
  if (!needsQuote) return str;
  return `"${str.replace(/"/g, '""')}"`;
}

// Número "limpio" para CSV: 2 decimales con PUNTO (estándar CSV).
function csvNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}

// Fecha/hora estable para CSV: YYYY-MM-DD HH:mm
function csvDateTime(fecha) {
  if (!fecha) return "";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function downloadCSV(header, body, filename) {
  // - Separador ';' para que Excel en español no se confunda con la coma decimal.
  // - \r\n para máxima compatibilidad con Excel/Windows.
  // - BOM \ufeff al inicio para que Excel detecte UTF-8 y respete tildes/ñ.
  const csv = [header, ...body]
    .map((line) => line.map(csvEscape).join(";"))
    .join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Estilos y formato del xlsx (autocontenidos, sin rutas nuevas) ─────────

const XLSX_STYLES = {
  titleBand: {
    font: { name: "Calibri", size: 11, bold: true, color: { argb: "FF1F4E78" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top:    { style: "thin", color: { argb: "FFBFBFBF" } },
      bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
      left:   { style: "thin", color: { argb: "FFBFBFBF" } },
      right:  { style: "thin", color: { argb: "FFBFBFBF" } },
    },
  },
  sectionBand: {
    font: { name: "Calibri", size: 11, bold: true, color: { argb: "FF333333" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7E6E6" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      top:    { style: "thin", color: { argb: "FFBFBFBF" } },
      bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
      left:   { style: "thin", color: { argb: "FFBFBFBF" } },
      right:  { style: "thin", color: { argb: "FFBFBFBF" } },
    },
  },
  header: {
    font: { name: "Calibri", size: 11, bold: true, color: { argb: "FF1F1F1F" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: {
      top:    { style: "thin", color: { argb: "FFBFBFBF" } },
      bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
      left:   { style: "thin", color: { argb: "FFBFBFBF" } },
      right:  { style: "thin", color: { argb: "FFBFBFBF" } },
    },
  },
  cell: {
    font: { name: "Calibri", size: 11, color: { argb: "FF1F1F1F" } },
    alignment: { vertical: "middle" },
    border: {
      top:    { style: "hair", color: { argb: "FFD9D9D9" } },
      bottom: { style: "hair", color: { argb: "FFD9D9D9" } },
      left:   { style: "hair", color: { argb: "FFD9D9D9" } },
      right:  { style: "hair", color: { argb: "FFD9D9D9" } },
    },
  },
  cellError: {
    font: { name: "Calibri", size: 11, color: { argb: "FF9C0006" }, bold: true },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } },
    alignment: { vertical: "middle" },
    border: {
      top:    { style: "hair", color: { argb: "FFD9D9D9" } },
      bottom: { style: "hair", color: { argb: "FFD9D9D9" } },
      left:   { style: "hair", color: { argb: "FFD9D9D9" } },
      right:  { style: "hair", color: { argb: "FFD9D9D9" } },
    },
  },
};

function applyStyle(cell, style) {
  if (!style) return;
  cell.font = style.font;
  if (style.fill) cell.fill = style.fill;
  cell.alignment = style.alignment;
  cell.border = style.border;
  if (style.numFmt) cell.numFmt = style.numFmt;
}

/** "DD.MM.YYYY" estable, usado para el periodo del xlsx */
function fmtDateDot(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** "DD.MM.YYYY HH:mm:ss" como texto literal (la columna Duración es texto) */
function fmtDateTimeDot(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** "Xh Ym Zs" — texto literal para Duración */
function fmtDurationLiteral(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n < 0) return "";
  const total = Math.floor(n);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${m}m ${s}s`;
}

// ── Builders: cada uno arma las filas/series de un informe ──

function buildSummaryRows() {
  const clients = getClients();
  return clients.flatMap((client, clientIndex) => {
    const devices = getDevicesForClient(clientIndex);
    const products = getProductsForClient(clientIndex);
    const productTotal = products.reduce((sum, p) => sum + (Number(p.cantidadRestante) || 0), 0);
    const avgDailyConsumption = products.reduce((sum, p) => sum + (Number(p.consumoDiario) || 0), 0);
    if (devices.length === 0) {
      return [{
        id: `client-${clientIndex}`, client: client.nombre || "Cliente sin nombre",
        city: client.ciudad || "-", country: client.pais || "-",
        device: "Sin dispositivo", serial: client.serial || "-", status: "sin-dispositivo",
        products: products.length, productTotal, avgDailyConsumption,
      }];
    }
    return devices.map((device) => ({
      id: `${clientIndex}-${device.id || device.serial}`, client: client.nombre || "Cliente sin nombre",
      city: client.ciudad || "-", country: client.pais || "-",
      device: device.nombre || "Dispositivo sin nombre", serial: device.serial || "-",
      status: device.estado || "inactivo", products: products.length, productTotal, avgDailyConsumption,
    }));
  });
}

function buildDetailedRows() {
  const clients = getClients();
  const rows = clients.flatMap((client, clientIndex) =>
    getDevicesForClient(clientIndex).flatMap((device) =>
      simulateHistoricalWashEvents(device, client.nombre || "Cliente sin nombre", 6)
    )
  );
  return rows.sort((a, b) => b.fecha - a.fecha);
}

function buildUbicacionRows() {
  const clients = getClients();
  return clients.flatMap((client, clientIndex) => {
    const devices = getDevicesForClient(clientIndex);
    if (devices.length === 0) {
      return [{
        id: `loc-c-${clientIndex}`, client: client.nombre || "Cliente sin nombre",
        device: "—", ciudad: client.ciudad || "—", pais: client.pais || "—", ubicacion: "—",
      }];
    }
    return devices.map((d) => ({
      id: `loc-${clientIndex}-${d.id}`, client: client.nombre || "Cliente sin nombre",
      device: d.nombre, ciudad: client.ciudad || "—", pais: client.pais || "—", ubicacion: d.ubicacion || "—",
    }));
  });
}

function buildSinConsumoRows() {
  const clients = getClients();
  return clients.flatMap((client, clientIndex) =>
    getProductsForClient(clientIndex)
      .filter((p) => !(Number(p.consumoDiario) > 0))
      .map((p) => ({
        id: `sc-${clientIndex}-${p.id}`, client: client.nombre || "Cliente sin nombre",
        producto: p.nombre, cantidadRestante: Number(p.cantidadRestante) || 0,
      }))
  );
}

function buildErroresActivosRows(devices) {
  const rows = [];
  devices.forEach((device) => {
    const productos = getProductsForClient(device.clienteIndex);
    const liveStates = simulateDeviceLiveState(device.id, productos);
    liveStates.forEach((lav) => {
      if (!lav.running) return;
      (lav.bombas || []).forEach((b) => {
        if (b.estado === "error") {
          rows.push({
            id: `err-${device.id}-${lav.lavadoraId}-${b.bombaId}`,
            client: device.clienteNombre, device: device.nombre, lavadora: lav.nombre,
            bomba: b.nombre, producto: b.productoNombre, doneMl: b.doneMl, totalMl: b.totalMl,
          });
        }
      });
    });
  });
  return rows;
}

function buildConsumoAgg(clientFilter) {
  const clients = getClients();
  const totals = {};
  clients.forEach((client, clientIndex) => {
    if (clientFilter && client.nombre !== clientFilter) return;
    getProductsForClient(clientIndex).forEach((p) => {
      const val = Number(p.consumoDiario) || 0;
      if (val <= 0) return;
      totals[p.nombre] = (totals[p.nombre] || 0) + val;
    });
  });
  return Object.entries(totals).map(([label, value], i) => ({ label, value, color: PIE_PALETTE[i % PIE_PALETTE.length] }));
}

function buildSeguimientoErroresSeries(rows) {
  const days = 14;
  const today = new Date();
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const counts = buckets.map(() => 0);
  rows.forEach((r) => {
    if (r.origenEvento !== "Programa con error") return;
    const rDate = new Date(r.fecha);
    rDate.setHours(0, 0, 0, 0);
    const idx = buckets.findIndex((b) => b.getTime() === rDate.getTime());
    if (idx >= 0) counts[idx] += 1;
  });
  return [{
    name: "Eventos con error", color: "#ef4444",
    points: buckets.map((b, i) => ({ label: `${b.getDate()}/${b.getMonth() + 1}`, value: counts[i] })),
  }];
}

function seriesToCSV(series) {
  if (series.length === 0) return { header: [], body: [] };
  const header = ["Fecha", ...series.map((s) => s.name)];
  const body = series[0].points.map((p, i) => [p.label, ...series.map((s) => s.points[i]?.value ?? "")]);
  return { header, body };
}

// ── Exportador xlsx autocontenido para el informe DETALLADO ────────────────

/**
 * Genera y descarga un .xlsx con el layout de la imagen de referencia:
 *  - Hoja: "Informe de dosificación detallada" (sin cuadrícula)
 *  - Fila 1  : "Periodo de informe: DD.MM.YYYY - DD.MM.YYYY" (banda azul merged)
 *  - Fila 4  : "Total" (banda gris merged, vacía)
 *  - Fila 8  : "Detalles" (banda gris merged)
 *  - Fila 10 : encabezados con autofiltro
 *  - Fila 12+: datos (Duración como TEXTO LITERAL "1h 2m 20s")
 *  - Panel congelado debajo de la fila 10
 */
// ── Exportador xlsx autocontenido para el informe DETALLADO ────────────────

/**
 * Función genérica de exportación a XLSX para Deterquin.
 * Mantiene el diseño visual premium:
 *  - Sin cuadrícula (showGridLines: false)
 *  - Título con banda azul fusionada (Fila 1)
 *  - Bandas de sección "Total" (Fila 4) y "Detalles/Datos" (Fila 8)
 *  - Cabeceras con autofiltro y congelación debajo de la fila 10 (ySplit: 10)
 *  - Estilos de Calibri, bordes finos, alineación inteligente y colores premium
 */
async function exportGenericXlsx({
  titleText,
  sheetName,
  filename,
  columns,      // [{ header, key, width, type, numFmt, highlightError }]
  rows,         // [{ ... }]
  totalText = "Total",
  detallesText = "Detalles"
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Deterquin";
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet(sheetName, {
    properties: { defaultRowHeight: 16 },
    views: [{ showGridLines: false, state: "frozen", ySplit: 10 }],
  });

  ws.columns = columns.map((c) => ({ width: c.width || 15 }));
  const COLS = columns.length;

  // 1) Banda título
  ws.mergeCells(1, 1, 1, COLS);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = titleText;
  applyStyle(titleCell, XLSX_STYLES.titleBand);
  ws.getRow(1).height = 22;

  // 2) Banda "Total" (vacía de datos por defecto, sólo la sección gris)
  ws.mergeCells(4, 1, 4, COLS);
  const totalCell = ws.getCell(4, 1);
  totalCell.value = totalText;
  applyStyle(totalCell, XLSX_STYLES.sectionBand);
  ws.getRow(4).height = 18;

  // 3) Banda "Detalles"
  ws.mergeCells(8, 1, 8, COLS);
  const detCell = ws.getCell(8, 1);
  detCell.value = detallesText;
  applyStyle(detCell, XLSX_STYLES.sectionBand);
  ws.getRow(8).height = 18;

  // 4) Encabezados (fila 10)
  columns.forEach((col, i) => {
    const c = ws.getCell(10, i + 1);
    c.value = col.header;
    applyStyle(c, XLSX_STYLES.header);
  });
  ws.getRow(10).height = 30;

  // 5) Datos (fila 12 en adelante)
  rows.forEach((r, rIdx) => {
    const excelRow = ws.getRow(12 + rIdx);
    excelRow.height = 18;

    // Verificar si la fila completa representa un error/inactividad para posible resaltado selectivo
    const isError = columns.some((col) => {
      const valStr = String(r[col.key] || "").toLowerCase();
      return valStr.includes("error") || valStr.includes("inactivo");
    });

    columns.forEach((col, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1);
      const val = r[col.key];

      // Aplicar estilo de error si corresponde y la columna lo requiere
      const cellStyle = (isError && col.highlightError) ? XLSX_STYLES.cellError : XLSX_STYLES.cell;

      // Alineación según tipo
      const alignment = { vertical: "middle" };
      if (col.type === "number") {
        alignment.horizontal = "right";
      } else if (col.type === "date" || col.type === "boolean") {
        alignment.horizontal = "center";
      } else {
        alignment.horizontal = "left";
      }

      // Procesamiento de tipos
      if (col.type === "date") {
        if (val) {
          const d = val instanceof Date ? val : new Date(val);
          if (!isNaN(d.getTime())) {
            cell.value = d;
            cell.numFmt = col.numFmt || "dd/mm/yyyy hh:mm";
          } else {
            cell.value = "";
          }
        } else {
          cell.value = "";
        }
      } else if (col.type === "number") {
        const numVal = Number(val);
        if (val !== null && val !== undefined && !isNaN(numVal)) {
          cell.value = numVal;
          if (col.numFmt) {
            cell.numFmt = col.numFmt;
          }
        } else {
          cell.value = val ?? "";
        }
      } else {
        cell.value = val ?? "";
      }

      applyStyle(cell, {
        ...cellStyle,
        alignment,
      });
    });
  });

  // 6) Autofiltro sobre los encabezados
  const lastDataRow = 12 + rows.length - 1;
  ws.autoFilter = {
    from: { row: 10, column: 1 },
    to:   { row: Math.max(10, lastDataRow), column: COLS },
  };

  // 7) Descarga
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Genera y descarga el .xlsx de Informe Detallado usando la función genérica
 */
async function exportDetalladoXlsx(rows) {
  const starts = rows.map((r) => new Date(r.horaInicio)).filter((d) => !Number.isNaN(d.getTime()));
  const ends   = rows.map((r) => new Date(r.fecha))     .filter((d) => !Number.isNaN(d.getTime()));
  const periodoTexto = (starts.length && ends.length)
    ? `${fmtDateDot(new Date(Math.min(...starts.map((d) => d.getTime()))))} - ${fmtDateDot(new Date(Math.max(...ends.map((d) => d.getTime()))))}`
    : "—";

  const columns = [
    { header: "Cliente", key: "client", width: 22 },
    { header: "Dispositivo", key: "device", width: 22 },
    { header: "Lavadora", key: "lavadora", width: 20 },
    { header: "Origen del evento", key: "origenEvento", width: 26, highlightError: true },
    { header: "Programa", key: "programaText", width: 26 },
    { header: "Capacidad (kg)", key: "capacidadKg", width: 16, type: "number", numFmt: "0.00" },
    { header: "Detergente (ml)", key: "detergenteMl", width: 18, type: "number", numFmt: "#,##0" },
    { header: "Agua (L)", key: "aguaL", width: 14, type: "number", numFmt: "0.0" },
    { header: "Precio ($)", key: "precio", width: 14, type: "number", numFmt: "$#,##0.00" },
    { header: "Hora de inicio", key: "horaInicio", width: 22, type: "date", numFmt: "dd/mm/yyyy hh:mm" },
    { header: "Hora de finalización", key: "fecha", width: 22, type: "date", numFmt: "dd/mm/yyyy hh:mm" },
    { header: "Duración", key: "duracionText", width: 14 },
  ];

  const mappedRows = rows.map((r) => {
    let programa = r.programaDescripcion;
    if (!programa) {
      const num = r.programaNumero ?? r.programaNum;
      const name = r.programa || r.programaNombre || "";
      programa = (num != null && name) ? `Programa ${num}: ${name}` : String(name || num || "");
    }
    return {
      ...r,
      client: r.instalacion || r.clienteNombre || r.client || "",
      programaText: programa,
      duracionText: fmtDurationLiteral(r.duracionSegundos),
    };
  });

  await exportGenericXlsx({
    titleText: `Periodo de informe: ${periodoTexto}`,
    sheetName: "Informe de dosificación detallada",
    filename: "deterquin-informe-detallado.xlsx",
    columns,
    rows: mappedRows,
  });
}

function ReportsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { tipo } = useParams();
  const fileInputRef = useRef(null);

  const currentType = REPORT_TYPES.find((r) => r.slug === tipo) || REPORT_TYPES.find((r) => r.slug === DEFAULT_REPORT_SLUG);

  const clients = useMemo(() => getClients(), []);
  const allDevices = useMemo(
    () => clients.flatMap((c, i) => getDevicesForClient(i).map((d) => ({ ...d, clienteNombre: c.nombre, clienteIndex: i }))),
    [clients]
  );

  const [clientFilter, setClientFilter] = useState(location.state?.clientFilter || "");
  const [deviceFilter, setDeviceFilter] = useState(location.state?.deviceFilter || "");
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [exportError, setExportError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  const clientNames = useMemo(() => clients.map((c) => c.nombre || "Cliente sin nombre"), [clients]);
  const deviceNames = useMemo(() => {
    const pool = clientFilter ? allDevices.filter((d) => d.clienteNombre === clientFilter) : allDevices;
    return Array.from(new Set(pool.map((d) => d.nombre)));
  }, [allDevices, clientFilter]);

  const selectedDeviceObj = useMemo(() => {
    if (!deviceFilter) return null;
    return allDevices.find((d) => d.nombre === deviceFilter && (!clientFilter || d.clienteNombre === clientFilter)) || null;
  }, [allDevices, deviceFilter, clientFilter]);

  const filteredDevices = useMemo(() => allDevices.filter((d) =>
    (!clientFilter || d.clienteNombre === clientFilter) && (!deviceFilter || d.nombre === deviceFilter)
  ), [allDevices, clientFilter, deviceFilter]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const summaryRows = useMemo(() => buildSummaryRows(), [refreshTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const detailedRows = useMemo(() => buildDetailedRows(), [refreshTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ubicacionRows = useMemo(() => buildUbicacionRows(), [refreshTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sinConsumoRows = useMemo(() => buildSinConsumoRows(), [refreshTick]);
  const erroresActivosRows = useMemo(() => buildErroresActivosRows(filteredDevices), [filteredDevices, refreshTick]);
  const consumoAgg = useMemo(() => buildConsumoAgg(clientFilter), [clientFilter, refreshTick]);
  const flujoLavadoraSeriesRaw = useMemo(
    () => (selectedDeviceObj ? simulateFlujoPorLavadora(selectedDeviceObj.id) : []),
    [selectedDeviceObj, refreshTick]
  );
  const flujoBombaSeriesRaw = useMemo(
    () => (selectedDeviceObj ? simulateFlujoPorBomba(selectedDeviceObj.id) : []),
    [selectedDeviceObj, refreshTick]
  );
  const histogramData = useMemo(
    () => (selectedDeviceObj ? simulateProgramHistogram(selectedDeviceObj.id) : null),
    [selectedDeviceObj, refreshTick]
  );

  const matchesQuery = (row) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (row.client || "").toLowerCase().includes(q) || (row.device || "").toLowerCase().includes(q) || (row.serial || "").toLowerCase().includes(q);
  };

  const filteredSummary = summaryRows.filter((row) =>
    matchesQuery(row) &&
    (!clientFilter || row.client === clientFilter) &&
    (!deviceFilter || row.device === deviceFilter) &&
    (!statusFilter || row.status === statusFilter)
  );
  const filteredDetailed = detailedRows.filter((row) =>
    matchesQuery(row) && (!clientFilter || row.client === clientFilter) && (!deviceFilter || row.device === deviceFilter)
  );
  const filteredUbicacion = ubicacionRows.filter((row) =>
    matchesQuery(row) && (!clientFilter || row.client === clientFilter) && (!deviceFilter || row.device === deviceFilter)
  );
  const filteredSinConsumo = sinConsumoRows.filter((row) =>
    (!clientFilter || row.client === clientFilter) &&
    (!query.trim() || row.producto.toLowerCase().includes(query.trim().toLowerCase()))
  );
  const filteredErroresActivos = erroresActivosRows.filter((row) =>
    !query.trim() || row.lavadora.toLowerCase().includes(query.trim().toLowerCase()) || row.producto.toLowerCase().includes(query.trim().toLowerCase()))
  ;

  const seguimientoErroresSeries = useMemo(() => buildSeguimientoErroresSeries(filteredDetailed), [filteredDetailed]);

  const flujoLavadoraSeries = flujoLavadoraSeriesRaw.map((s, i) => ({ name: s.nombre, color: LINE_PALETTE[i % LINE_PALETTE.length], points: s.points }));
  const flujoBombaSeries = flujoBombaSeriesRaw.map((s, i) => ({ name: s.nombre, color: LINE_PALETTE[i % LINE_PALETTE.length], points: s.points }));

  const handleActualizar = () => {
    setClientFilter("");
    setDeviceFilter("");
    setStatusFilter("");
    setQuery("");
    setImportMessage("");
    setExportError("");
    setRefreshTick((t) => t + 1);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportMessage(`Archivo importado para revision: ${file.name}`);
    setExportError("");
    event.target.value = "";
  };

  const handleExport = async () => {
    if (isExporting) return;
    setExportError("");
    setIsExporting(true);
    try {
      const slug = currentType.slug;
      const filenameSuffix = slug;

      if (slug === "detallado") {
        if (filteredDetailed.length === 0) return;
        await exportDetalladoXlsx(filteredDetailed);
        return;
      }

      if (slug === "cantidad-total") {
        if (filteredSummary.length === 0) return;
        const columns = [
          { header: "Cliente", key: "client", width: 22 },
          { header: "Dispositivo", key: "device", width: 22 },
          { header: "Serial", key: "serial", width: 18 },
          { header: "Estado", key: "status", width: 14, highlightError: true },
          { header: "Ubicación", key: "ubicacion", width: 24 },
          { header: "Productos", key: "products", width: 14, type: "number", numFmt: "#,##0" },
          { header: "Cantidad restante (L)", key: "productTotal", width: 22, type: "number", numFmt: "#,##0.00" },
          { header: "Consumo diario (L)", key: "avgDailyConsumption", width: 20, type: "number", numFmt: "#,##0.00" },
        ];
        const mappedRows = filteredSummary.map((r) => ({
          ...r,
          ubicacion: `${r.country || "-"}, ${r.city || "-"}`,
        }));
        await exportGenericXlsx({
          titleText: "Informe de Cantidad Total y Consumo",
          sheetName: "Cantidad Total",
          filename: `deterquin-informe-${filenameSuffix}.xlsx`,
          columns,
          rows: mappedRows,
        });

      } else if (slug === "ubicacion") {
        if (filteredUbicacion.length === 0) return;
        const columns = [
          { header: "Cliente", key: "client", width: 22 },
          { header: "Dispositivo", key: "device", width: 22 },
          { header: "Ciudad", key: "ciudad", width: 18 },
          { header: "País", key: "pais", width: 18 },
          { header: "Ubicación", key: "ubicacion", width: 26 },
        ];
        await exportGenericXlsx({
          titleText: "Informe de Ubicación de Dispositivos",
          sheetName: "Ubicaciones",
          filename: `deterquin-informe-${filenameSuffix}.xlsx`,
          columns,
          rows: filteredUbicacion,
        });

      } else if (slug === "sin-consumo") {
        if (filteredSinConsumo.length === 0) return;
        const columns = [
          { header: "Cliente", key: "client", width: 22 },
          { header: "Producto", key: "producto", width: 26 },
          { header: "Cantidad restante (L)", key: "cantidadRestante", width: 22, type: "number", numFmt: "#,##0.00" },
        ];
        await exportGenericXlsx({
          titleText: "Informe de Productos Sin Consumo Registrado",
          sheetName: "Sin Consumo",
          filename: `deterquin-informe-${filenameSuffix}.xlsx`,
          columns,
          rows: filteredSinConsumo,
        });

      } else if (slug === "errores-activos") {
        if (filteredErroresActivos.length === 0) return;
        const columns = [
          { header: "Cliente", key: "client", width: 22 },
          { header: "Dispositivo", key: "device", width: 22 },
          { header: "Lavadora", key: "lavadora", width: 20 },
          { header: "Bomba", key: "bomba", width: 16 },
          { header: "Producto", key: "producto", width: 22 },
          { header: "Cantidad dosificada (ml)", key: "doneMl", width: 24, type: "number", numFmt: "#,##0" },
          { header: "Cantidad objetivo (ml)", key: "totalMl", width: 22, type: "number", numFmt: "#,##0" },
        ];
        await exportGenericXlsx({
          titleText: "Informe de Errores Activos de Dosificación",
          sheetName: "Errores Activos",
          filename: `deterquin-informe-${filenameSuffix}.xlsx`,
          columns,
          rows: filteredErroresActivos,
        });

      } else if (slug === "consumo") {
        if (consumoAgg.length === 0) return;
        const columns = [
          { header: "Producto", key: "label", width: 26 },
          { header: "Consumo diario (L)", key: "value", width: 22, type: "number", numFmt: "#,##0.00" },
        ];
        await exportGenericXlsx({
          titleText: "Informe Consolidado de Consumo de Productos",
          sheetName: "Consumo",
          filename: `deterquin-informe-${filenameSuffix}.xlsx`,
          columns,
          rows: consumoAgg,
        });

      } else if (slug === "flujo-lavadora") {
        const series = flujoLavadoraSeries;
        if (series.length === 0) return;
        const { header, body } = seriesToCSV(series);
        const columns = header.map((h, index) => ({
          header: h,
          key: `col_${index}`,
          width: index === 0 ? 16 : 20,
          type: index === 0 ? "string" : "number",
          numFmt: index === 0 ? undefined : "#,##0",
        }));
        const mappedRows = body.map((rowArr) => {
          const obj = {};
          rowArr.forEach((val, idx) => {
            obj[`col_${idx}`] = val;
          });
          return obj;
        });
        await exportGenericXlsx({
          titleText: "Informe de Flujo Acumulado por Lavadora (ml)",
          sheetName: "Flujo por Lavadora",
          filename: `deterquin-informe-${filenameSuffix}.xlsx`,
          columns,
          rows: mappedRows,
        });

      } else if (slug === "flujo-bomba") {
        const series = flujoBombaSeries;
        if (series.length === 0) return;
        const { header, body } = seriesToCSV(series);
        const columns = header.map((h, index) => ({
          header: h,
          key: `col_${index}`,
          width: index === 0 ? 16 : 20,
          type: index === 0 ? "string" : "number",
          numFmt: index === 0 ? undefined : "#,##0",
        }));
        const mappedRows = body.map((rowArr) => {
          const obj = {};
          rowArr.forEach((val, idx) => {
            obj[`col_${idx}`] = val;
          });
          return obj;
        });
        await exportGenericXlsx({
          titleText: "Informe de Flujo Acumulado por Bomba (ml)",
          sheetName: "Flujo por Bomba",
          filename: `deterquin-informe-${filenameSuffix}.xlsx`,
          columns,
          rows: mappedRows,
        });

      } else if (slug === "seguimiento-errores") {
        const series = seguimientoErroresSeries;
        if (series.length === 0) return;
        const { header, body } = seriesToCSV(series);
        const columns = header.map((h, index) => ({
          header: h,
          key: `col_${index}`,
          width: index === 0 ? 16 : 20,
          type: index === 0 ? "string" : "number",
          numFmt: index === 0 ? undefined : "#,##0",
        }));
        const mappedRows = body.map((rowArr) => {
          const obj = {};
          rowArr.forEach((val, idx) => {
            obj[`col_${idx}`] = val;
          });
          return obj;
        });
        await exportGenericXlsx({
          titleText: "Informe de Seguimiento Histórico de Eventos con Error",
          sheetName: "Seguimiento de Errores",
          filename: `deterquin-informe-${filenameSuffix}.xlsx`,
          columns,
          rows: mappedRows,
        });

      } else if (slug === "histograma" && histogramData) {
        const mappedRows = histogramData.lavadoras.flatMap((lav) =>
          lav.blocks.map((b) => ({
            lavadora: lav.nombre,
            startMin: b.startMin,
            endMin: b.endMin,
            label: b.label,
          }))
        );
        if (mappedRows.length === 0) return;
        const columns = [
          { header: "Lavadora", key: "lavadora", width: 22 },
          { header: "Inicio (min)", key: "startMin", width: 18, type: "number", numFmt: "#,##0" },
          { header: "Fin (min)", key: "endMin", width: 18, type: "number", numFmt: "#,##0" },
          { header: "Evento", key: "label", width: 26 },
        ];
        await exportGenericXlsx({
          titleText: "Informe de Histograma de Programas (Gantt)",
          sheetName: "Histograma",
          filename: `deterquin-informe-${filenameSuffix}.xlsx`,
          columns,
          rows: mappedRows,
        });
      }
    } catch (err) {
      console.error("[handleExport]", err);
      setExportError("No se pudo generar el archivo Excel. Revisa la consola para más detalle.");
    } finally {
      setIsExporting(false);
    }
  };

  const activeChips = [
    clientFilter && { key: "client", label: `Cliente: ${clientFilter}`, onRemove: () => setClientFilter("") },
    deviceFilter && { key: "device", label: `Dispositivo: ${deviceFilter}`, onRemove: () => setDeviceFilter("") },
    statusFilter && { key: "status", label: `Estado: ${statusFilter}`, onRemove: () => setExportError("") },
    query.trim() && { key: "query", label: `Buscar: ${query.trim()}`, onRemove: () => setQuery("") },
  ].filter(Boolean);

  const needsDevice = currentType.kind === "per-device-line" || currentType.kind === "per-device-histogram";

  return (
    <div className="reports-page">
      <div className="reports-header">
        <button className="reports-title" type="button" onClick={() => navigate("/")}>
          <MdArrowBack size={24} />
          <span>Informes</span>
        </button>

        <div className="reports-actions">
          <button type="button" className="reports-action" onClick={handleActualizar}>
            <MdRefresh size={21} />
            <span>Actualizar</span>
          </button>
          <button type="button" className="reports-action" onClick={() => fileInputRef.current?.click()}>
            <MdImportExport size={21} />
            <span>Importar</span>
          </button>
          <button
            type="button"
            className="reports-action reports-action-primary"
            onClick={handleExport}
            disabled={isExporting}
            aria-busy={isExporting}
          >
            <MdDownload size={21} />
            <span>{isExporting ? "Exportando..." : "Exportar"}</span>
          </button>
          <input ref={fileInputRef} className="reports-file-input" type="file" accept=".csv,.json" onChange={handleImport} />
        </div>
      </div>

      <div className="reports-type-heading">
        <currentType.icon size={20} />
        <h3>{currentType.label}</h3>
      </div>

      <section className="reports-filter-band">
        {activeChips.length > 0 && (
          <div className="reports-chip-row">
            {activeChips.map((chip) => (
              <span key={chip.key} className="reports-chip">
                {chip.label}
                <MdClose size={14} onClick={chip.onRemove} />
              </span>
            ))}
            <button type="button" className="reports-chip-clear" onClick={() => { setClientFilter(""); setDeviceFilter(""); setStatusFilter(""); setQuery(""); }}>
              Limpiar todo
            </button>
          </div>
        )}

        <div className="reports-filters-row">
          <div className="reports-search">
            <MdSearch size={18} />
            <input type="text" value={query} placeholder="Buscar..." onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button type="button" className="reports-filter-button" onClick={() => setShowAdvanced((v) => !v)}>
            <MdFilterList size={18} />
            <span>{showAdvanced ? "Ocultar filtros" : "Filtros"}</span>
          </button>
        </div>

        {showAdvanced && (
          <div className="reports-filters">
            <select value={clientFilter} onChange={(e) => { setClientFilter(e.target.value); setDeviceFilter(""); }}>
              <option value="">Cliente</option>
              {clientNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            <select value={deviceFilter} onChange={(e) => setDeviceFilter(e.target.value)}>
              <option value="">Dispositivo</option>
              {deviceNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            {currentType.slug === "cantidad-total" && (
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Estado</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="sin-dispositivo">Sin dispositivo</option>
              </select>
            )}
          </div>
        )}
      </section>

      {importMessage && <div className="reports-import-note">{importMessage}</div>}
      {exportError && (
        <div className="reports-import-note reports-import-note--error" role="alert">
          {exportError}
        </div>
      )}

      {needsDevice && !selectedDeviceObj && (
        <div className="reports-device-required">
          Selecciona un <strong>Dispositivo</strong> en los filtros de arriba para ver este informe.
        </div>
      )}

      <section className="reports-results">
        {/* ── Detallado ── */}
        {currentType.slug === "detallado" && (
          filteredDetailed.length === 0 ? (
            <div className="reports-empty">No hay eventos simulados todavía. Configura lavadoras y programas, o ajusta los filtros.</div>
          ) : (
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Cliente</th><th>Dispositivo</th><th>Lavadora</th><th>Origen del evento</th>
                    <th>Programa</th><th>Capacidad</th><th>Detergente</th><th>Agua</th><th>Precio</th>
                    <th>Inicio</th><th>Fin</th><th>Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDetailed.map((row) => (
                    <tr key={row.id}>
                      <td>{row.client}</td><td>{row.device}</td><td>{row.lavadora}</td>
                      <td><span className={`reports-evento ${row.origenEvento === "Programa con error" ? "evento-error" : ""}`}>{row.origenEvento}</span></td>
                      <td>{row.programa} ({row.programaNumero})</td>
                      <td>{formatNumber(row.capacidadKg)} kg</td>
                      <td>{formatNumber(row.detergenteMl)} ml</td>
                      <td>{formatNumber(row.aguaL)} L</td>
                      <td>{formatNumber(row.precio)}</td>
                      <td>{formatFecha(row.horaInicio)}</td>
                      <td>{formatFecha(row.fecha)}</td>
                      <td>{formatDuracion(row.duracionSegundos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Cantidad Total ── */}
        {currentType.slug === "cantidad-total" && (
          filteredSummary.length === 0 ? (
            <div className="reports-empty">No hay resultados para los filtros seleccionados.</div>
          ) : (
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead>
                  <tr><th>Cliente</th><th>Dispositivo</th><th>Serial</th><th>Estado</th><th>Productos</th><th>Restante</th><th>Consumo diario</th></tr>
                </thead>
                <tbody>
                  {filteredSummary.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.client}</strong><span> {row.country}, {row.city}</span></td>
                      <td>{row.device}</td><td>{row.serial}</td>
                      <td><span className={`reports-status ${row.status}`}>{row.status === "activo" ? "Activo" : row.status === "inactivo" ? "Inactivo" : "Sin dispositivo"}</span></td>
                      <td>{row.products}</td>
                      <td>{formatNumber(row.productTotal)} L</td>
                      <td>{formatNumber(row.avgDailyConsumption)} L/dia</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Ubicación ── */}
        {currentType.slug === "ubicacion" && (
          filteredUbicacion.length === 0 ? (
            <div className="reports-empty">No hay resultados para los filtros seleccionados.</div>
          ) : (
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead><tr><th>Cliente</th><th>Dispositivo</th><th>Ciudad</th><th>País</th><th>Ubicación</th></tr></thead>
                <tbody>
                  {filteredUbicacion.map((row) => (
                    <tr key={row.id}><td>{row.client}</td><td>{row.device}</td><td>{row.ciudad}</td><td>{row.pais}</td><td>{row.ubicacion}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Sin consumo ── */}
        {currentType.slug === "sin-consumo" && (
          filteredSinConsumo.length === 0 ? (
            <div className="reports-empty">Todos los productos registrados tienen consumo diario asignado.</div>
          ) : (
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead><tr><th>Cliente</th><th>Producto</th><th>Cantidad restante</th></tr></thead>
                <tbody>
                  {filteredSinConsumo.map((row) => (
                    <tr key={row.id}><td>{row.client}</td><td>{row.producto}</td><td>{formatNumber(row.cantidadRestante)} L</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Errores activos ── */}
        {currentType.slug === "errores-activos" && (
          filteredErroresActivos.length === 0 ? (
            <div className="reports-empty">No hay errores activos en este momento para los filtros seleccionados.</div>
          ) : (
            <div className="reports-table-wrap">
              <table className="reports-table">
                <thead><tr><th>Cliente</th><th>Dispositivo</th><th>Lavadora</th><th>Bomba</th><th>Producto</th><th>Dosificado</th><th>Objetivo</th></tr></thead>
                <tbody>
                  {filteredErroresActivos.map((row) => (
                    <tr key={row.id}>
                      <td>{row.client}</td><td>{row.device}</td><td>{row.lavadora}</td><td>{row.bomba}</td><td>{row.producto}</td>
                      <td><span className="reports-evento evento-error">{formatNumber(row.doneMl)} ml</span></td>
                      <td>{formatNumber(row.totalMl)} ml</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Consumo (pie) ── */}
        {currentType.slug === "consumo" && (
          consumoAgg.length === 0 ? (
            <div className="reports-empty">No hay consumo diario registrado para los clientes/productos filtrados.</div>
          ) : (
            <div className="reports-chart-card"><MiniPieChart data={consumoAgg} size={200} /></div>
          )
        )}

        {/* ── Flujo por Lavadora (line, por dispositivo) ── */}
        {currentType.slug === "flujo-lavadora" && selectedDeviceObj && (
          flujoLavadoraSeries.length === 0 ? (
            <div className="reports-empty">Este dispositivo no tiene lavadoras configuradas (ver Calibración remota).</div>
          ) : (
            <div className="reports-chart-card"><MiniLineChart series={flujoLavadoraSeries} yUnit=" ml" /></div>
          )
        )}

        {/* ── Flujo por Bomba (line, por dispositivo) ── */}
        {currentType.slug === "flujo-bomba" && selectedDeviceObj && (
          flujoBombaSeries.length === 0 ? (
            <div className="reports-empty">Este dispositivo no tiene bombas configuradas (ver Calibración remota).</div>
          ) : (
            <div className="reports-chart-card"><MiniLineChart series={flujoBombaSeries} yUnit=" ml" /></div>
          )
        )}

        {/* ── Histograma (Gantt, por dispositivo) ── */}
        {currentType.slug === "histograma" && selectedDeviceObj && (
          histogramData && histogramData.lavadoras.length > 0 ? (
            <div className="reports-chart-card"><ProgramHistogram data={histogramData} legendTypes={HISTOGRAM_TYPES} /></div>
          ) : (
            <div className="reports-empty">Este dispositivo no tiene lavadoras configuradas (ver Calibración remota).</div>
          )
        )}

        {/* ── Seguimiento de errores (line, agregado) ── */}
        {currentType.slug === "seguimiento-errores" && (
          <div className="reports-chart-card"><MiniLineChart series={seguimientoErroresSeries} /></div>
        )}
      </section>
    </div>
  );
}

export default ReportsPage;
