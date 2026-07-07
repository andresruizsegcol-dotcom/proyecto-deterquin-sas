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
function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}
function downloadCSV(header, body, filename) {
  const csv = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
    !query.trim() || row.lavadora.toLowerCase().includes(query.trim().toLowerCase()) || row.producto.toLowerCase().includes(query.trim().toLowerCase())
  );

  const seguimientoErroresSeries = useMemo(() => buildSeguimientoErroresSeries(filteredDetailed), [filteredDetailed]);

  const flujoLavadoraSeries = flujoLavadoraSeriesRaw.map((s, i) => ({ name: s.nombre, color: LINE_PALETTE[i % LINE_PALETTE.length], points: s.points }));
  const flujoBombaSeries = flujoBombaSeriesRaw.map((s, i) => ({ name: s.nombre, color: LINE_PALETTE[i % LINE_PALETTE.length], points: s.points }));

  const handleActualizar = () => {
    setClientFilter("");
    setDeviceFilter("");
    setStatusFilter("");
    setQuery("");
    setImportMessage("");
    setRefreshTick((t) => t + 1);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportMessage(`Archivo importado para revision: ${file.name}`);
    event.target.value = "";
  };

  const handleExport = () => {
    const slug = currentType.slug;
    let header = [], body = [], filenameSuffix = slug;
    if (slug === "detallado") {
      header = ["Fecha fin", "Hora inicio", "Duracion", "Origen del evento", "Cliente", "Dispositivo", "Lavadora", "Programa", "Capacidad kg", "Detergente ml", "Agua L", "Precio"];
      body = filteredDetailed.map((r) => [
        formatFecha(r.fecha), formatFecha(r.horaInicio), formatDuracion(r.duracionSegundos), r.origenEvento,
        r.client, r.device, r.lavadora, `${r.programa} (${r.programaNumero})`, r.capacidadKg, r.detergenteMl, r.aguaL, r.precio,
      ]);
    } else if (slug === "cantidad-total") {
      header = ["Cliente", "Dispositivo", "Serial", "Estado", "Ubicacion", "Productos", "Cantidad restante L", "Consumo diario L"];
      body = filteredSummary.map((r) => [r.client, r.device, r.serial, r.status, `${r.country}, ${r.city}`, r.products, r.productTotal, r.avgDailyConsumption]);
    } else if (slug === "ubicacion") {
      header = ["Cliente", "Dispositivo", "Ciudad", "Pais", "Ubicacion"];
      body = filteredUbicacion.map((r) => [r.client, r.device, r.ciudad, r.pais, r.ubicacion]);
    } else if (slug === "sin-consumo") {
      header = ["Cliente", "Producto", "Cantidad restante L"];
      body = filteredSinConsumo.map((r) => [r.client, r.producto, r.cantidadRestante]);
    } else if (slug === "errores-activos") {
      header = ["Cliente", "Dispositivo", "Lavadora", "Bomba", "Producto", "Cantidad dosificada", "Cantidad objetivo"];
      body = filteredErroresActivos.map((r) => [r.client, r.device, r.lavadora, r.bomba, r.producto, r.doneMl, r.totalMl]);
    } else if (slug === "consumo") {
      header = ["Producto", "Consumo diario (L)"];
      body = consumoAgg.map((r) => [r.label, r.value]);
    } else if (slug === "flujo-lavadora") {
      const { header: h, body: b } = seriesToCSV(flujoLavadoraSeries);
      header = h; body = b;
    } else if (slug === "flujo-bomba") {
      const { header: h, body: b } = seriesToCSV(flujoBombaSeries);
      header = h; body = b;
    } else if (slug === "seguimiento-errores") {
      const { header: h, body: b } = seriesToCSV(seguimientoErroresSeries);
      header = h; body = b;
    } else if (slug === "histograma" && histogramData) {
      header = ["Lavadora", "Inicio (min)", "Fin (min)", "Evento"];
      body = histogramData.lavadoras.flatMap((lav) => lav.blocks.map((b) => [lav.nombre, b.startMin, b.endMin, b.label]));
    }
    if (body.length === 0) return;
    downloadCSV(header, body, `deterquin-informe-${filenameSuffix}.csv`);
  };

  const activeChips = [
    clientFilter && { key: "client", label: `Cliente: ${clientFilter}`, onRemove: () => setClientFilter("") },
    deviceFilter && { key: "device", label: `Dispositivo: ${deviceFilter}`, onRemove: () => setDeviceFilter("") },
    statusFilter && { key: "status", label: `Estado: ${statusFilter}`, onRemove: () => setStatusFilter("") },
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
          <button type="button" className="reports-action reports-action-primary" onClick={handleExport}>
            <MdDownload size={21} />
            <span>Exportar</span>
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
