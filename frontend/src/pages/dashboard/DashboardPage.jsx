// Página principal del dashboard
// - Calcula los KPIs reales a partir de los clientes/dispositivos guardados
//   en localStorage (vía el servicio `localMock`).
// - "Alarmas Activas" e "Informes" siguen en "0": todavía no existe un
//   modelo de datos para alarmas ni informes en ningún lado de la app.
// - Widget "Últimos eventos de lavado": recorre todos los clientes y
//   dispositivos para generar un feed de actividad reciente usando
//   simulateHistoricalWashEvents (misma función que usa Informes > Detallado).
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./DashboardPage.css";
import {
  MdPeople, MdDevices, MdAlarm, MdEditDocument,
  MdCheckCircle, MdError, MdCancel, MdPlayArrow, MdOpenInNew,
} from "react-icons/md";
import { getClients, getDeviceCounts, getDevicesForClient } from "../../services/localMock";
import { simulateHistoricalWashEvents } from "../../services/deviceLiveSimulation";

// Configuración visual por tipo de evento
const EVENTO_CONFIG = {
  "Programa acabado":    { color: "#22c55e", bg: "#f0fdf4", icon: MdCheckCircle, label: "Acabado" },
  "Programa con error":  { color: "#ef4444", bg: "#fef2f2", icon: MdError,       label: "Error" },
  "Programa cancelado":  { color: "#f59e0b", bg: "#fffbeb", icon: MdCancel,      label: "Cancelado" },
  "Inicio manual":       { color: "#3b82f6", bg: "#eff6ff", icon: MdPlayArrow,   label: "Manual" },
};

function getEventoConfig(origen) {
  return EVENTO_CONFIG[origen] || { color: "#6b7280", bg: "#f9fafb", icon: MdCheckCircle, label: origen };
}

function formatTiempo(fecha) {
  const ahora = new Date();
  const diffMs = ahora - new Date(fecha);
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `hace ${diffD}d`;
}

function formatDuracion(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m > 0 ? `${m}min ${s}s` : `${s}s`;
}

function DashboardPage() {
  const navigate = useNavigate();
  const clientes = getClients();

  // KPIs
  const { totalDispositivos, dispositivosActivos } = clientes.reduce(
    (acc, _cliente, index) => {
      const { total, activos } = getDeviceCounts(index);
      return {
        totalDispositivos: acc.totalDispositivos + total,
        dispositivosActivos: acc.dispositivosActivos + activos,
      };
    },
    { totalDispositivos: 0, dispositivosActivos: 0 }
  );

  const kpis = [
    { icon: <MdPeople size={32} />, label: "Total Clientes", value: String(clientes.length), color: "#2cc664" },
    { icon: <MdDevices size={32} />, label: "Dispositivos Activos", value: `${dispositivosActivos}/${totalDispositivos}`, color: "#3b82f6" },
    { icon: <MdAlarm size={32} />, label: "Alarmas Activas", value: "0", color: "#ef4444" },
    { icon: <MdEditDocument size={32} />, label: "Informes", value: "0", color: "#f59e0b" },
  ];

  // Últimos eventos: recorrer todos los clientes y sus dispositivos,
  // generar ~3 eventos por dispositivo, ordenar por fecha desc, tomar los 8 más recientes.
  const ultimosEventos = useMemo(() => {
    const eventos = clientes.flatMap((cliente, clienteIndex) => {
      const dispositivos = getDevicesForClient(clienteIndex);
      return dispositivos.flatMap((dispositivo) =>
        simulateHistoricalWashEvents(dispositivo, cliente.nombre || "Cliente sin nombre", 3)
      );
    });
    return eventos
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 8);
  }, [clientes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const hayEventos = ultimosEventos.length > 0;

  return (
    <div className="dashboard-page">
      <h2 className="dashboard-title">Resumen General</h2>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map((kpi, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-icon" style={{ color: kpi.color }}>
              {kpi.icon}
            </div>
            <div className="kpi-info">
              <span className="kpi-value">{kpi.value}</span>
              <span className="kpi-label">{kpi.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Widget: Últimos eventos de lavado */}
      <div className="dash-events-card">
        <div className="dash-events-header">
          <div className="dash-events-title-group">
            <span className="dash-events-live-dot" />
            <h3 className="dash-events-title">Últimos eventos de lavado</h3>
            <span className="dash-events-count">{ultimosEventos.length}</span>
          </div>
          <button
            className="dash-events-link"
            onClick={() => navigate("/informes/detallado")}
          >
            Ver todos
            <MdOpenInNew size={14} />
          </button>
        </div>

        {!hayEventos ? (
          <div className="dash-events-empty">
            <MdDevices size={36} />
            <p>No hay eventos registrados todavía.</p>
            <span>Configura lavadoras y programas en los dispositivos de tus clientes.</span>
          </div>
        ) : (
          <div className="dash-events-table-wrap">
            <table className="dash-events-table">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Cliente / Dispositivo</th>
                  <th>Lavadora</th>
                  <th>Programa</th>
                  <th>Duración</th>
                  <th>Hace</th>
                </tr>
              </thead>
              <tbody>
                {ultimosEventos.map((ev) => {
                  const cfg = getEventoConfig(ev.origenEvento);
                  const IconComp = cfg.icon;
                  return (
                    <tr key={ev.id} className="dash-events-row">
                      <td>
                        <span
                          className="dash-evento-badge"
                          style={{ color: cfg.color, background: cfg.bg }}
                        >
                          <IconComp size={13} />
                          {cfg.label}
                        </span>
                      </td>
                      <td>
                        <div className="dash-events-client">
                          <strong>{ev.client}</strong>
                          <span>{ev.device}</span>
                        </div>
                      </td>
                      <td className="dash-events-muted">{ev.lavadora}</td>
                      <td className="dash-events-muted">{ev.programa}</td>
                      <td className="dash-events-muted">{formatDuracion(ev.duracionSegundos)}</td>
                      <td className="dash-events-time">{formatTiempo(ev.fecha)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
