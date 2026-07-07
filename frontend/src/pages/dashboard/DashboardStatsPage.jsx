import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MdArrowBack, MdKeyboardArrowDown, MdRefresh } from "react-icons/md";
import "./DashboardStatsPage.css";
import { getClients, getDevicesForClient, getProductsForClient } from "../../services/localMock";
import { simulateDeviceLiveState, simulateProgramHistogram, simulateFlujoPorBomba, HISTOGRAM_TYPES } from "../../services/deviceLiveSimulation";
import ProgramHistogram from "../../components/charts/ProgramHistogram";
import MiniLineChart from "../../components/charts/MiniLineChart";
import MiniPieChart from "../../components/charts/MiniPieChart";

const LINE_PALETTE = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
const PIE_PALETTE = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

function buildFlujoSeries(deviceId) {
  // Delegado al servicio compartido (deviceLiveSimulation.js) que también
  // usa el informe "Flujo por Bomba" en Informes; aquí solo se le asigna
  // un color de la paleta de líneas a cada bomba.
  return simulateFlujoPorBomba(deviceId).map((s, i) => ({
    name: s.nombre,
    color: LINE_PALETTE[i % LINE_PALETTE.length],
    points: s.points,
  }));
}

function buildConsumoData(productos) {
  return productos.map((p, i) => ({
    label: p.nombre,
    value: Number(p.consumoDiario) > 0 ? Number(p.consumoDiario) : 1,
    color: PIE_PALETTE[i % PIE_PALETTE.length],
  }));
}

function buildErrorSummary() {
  const terminado = 55 + Math.random() * 30;
  const conError = Math.random() * 15;
  const cancelado = Math.max(0, 100 - terminado - conError);
  return [
    { label: "Programa terminado", value: terminado, color: "#22c55e" },
    { label: "Con error", value: conError, color: "#ef4444" },
    { label: "Cancelado", value: cancelado, color: "#94a3b8" },
  ];
}

function DashboardStatsPage() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [liveStates, setLiveStates] = useState([]);
  const [histogramData, setHistogramData] = useState(null);
  const [flujoSeries, setFlujoSeries] = useState([]);
  const [consumoData, setConsumoData] = useState([]);
  const [errorSummary, setErrorSummary] = useState([]);

  const refreshWidgets = useCallback((device) => {
    if (!device) return;
    const productos = getProductsForClient(device.clienteIndex);
    setLiveStates(simulateDeviceLiveState(device.id, productos));
    setHistogramData(simulateProgramHistogram(device.id));
    setFlujoSeries(buildFlujoSeries(device.id));
    setConsumoData(buildConsumoData(productos));
    setErrorSummary(buildErrorSummary());
  }, []);

  useEffect(() => {
    const clientes = getClients();
    const allDevices = clientes.flatMap((cliente, clienteIndex) => {
      const devs = getDevicesForClient(clienteIndex);
      return devs.map((dev) => ({ ...dev, clienteNombre: cliente.nombre, clienteIndex }));
    });
    setDevices(allDevices);

    // Acceso directo desde un dispositivo específico (botón "Dashboard" en
    // ClientsDetail/DevicesPage): preseleccionar ese dispositivo en vez de
    // dejar al usuario buscarlo de nuevo en el selector.
    const targetId = location.state?.deviceId;
    if (targetId != null) {
      const match = allDevices.find((d) => d.id === targetId);
      if (match) {
        setSelectedDevice(match);
        refreshWidgets(match);
      }
    }
  }, [location.state, refreshWidgets]);

  const handleSelectDevice = (device) => {
    setSelectedDevice(device);
    setShowDeviceDropdown(false);
    refreshWidgets(device);
  };

  return (
    <div className="dashboard-device-page">
      <div className="dashboard-device-header" onClick={() => navigate(-1)}>
        <MdArrowBack size={24} />
        <h2>Dashboard del dispositivo</h2>
      </div>

      <div className="dashboard-device-filters">
        <div className="device-select-wrapper">
          <button
            type="button"
            className="device-select-button"
            onClick={() => setShowDeviceDropdown((value) => !value)}
          >
            <span>Seleccione el dispositivo</span>
            <MdKeyboardArrowDown size={20} className={showDeviceDropdown ? "open" : ""} />
          </button>

          {showDeviceDropdown && (
            <div className="device-dropdown">
              {devices.length > 0 ? (
                devices.map((device, index) => (
                  <button
                    key={`${device.serial || device.nombre || index}`}
                    type="button"
                    className="device-dropdown-item"
                    onClick={() => handleSelectDevice(device)}
                  >
                    <div>
                      <strong>{device.nombre || device.serial || "Dispositivo"}</strong>
                      <div>{device.clienteNombre || "Cliente"}</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="device-dropdown-empty">No hay dispositivos registrados.</div>
              )}
            </div>
          )}
        </div>

        <div className="selected-device-box">
          {selectedDevice ? (
            <>
              <span>{selectedDevice.nombre || selectedDevice.serial || "Dispositivo seleccionado"}</span>
              <small>{selectedDevice.clienteNombre || "Cliente"}</small>
            </>
          ) : (
            <span>No hay dispositivo seleccionado</span>
          )}
        </div>
      </div>

      {!selectedDevice ? (
        <div className="dashboard-device-empty">
          <p>Selecciona un dispositivo para ver sus métricas.</p>
          <span>Aquí verás histogramas, estadísticas y métricas simuladas a partir de su configuración (lavadoras, bombas y programas).</span>
        </div>
      ) : (
        <div className="dsp-widget-grid">
          {/* Histograma de programas (ancho completo) */}
          <div className="dsp-widget dsp-widget-full">
            <div className="dsp-widget-header">
              <span>Histograma de los programas de lavadoras</span>
              <MdRefresh size={16} className="dsp-refresh-icon" onClick={() => setHistogramData(simulateProgramHistogram(selectedDevice.id))} />
            </div>
            <div className="dsp-widget-body">
              {histogramData && histogramData.lavadoras.length > 0 ? (
                <ProgramHistogram data={histogramData} legendTypes={HISTOGRAM_TYPES} />
              ) : (
                <p className="dsp-empty-text">Este dispositivo no tiene lavadoras configuradas (ver Calibración remota).</p>
              )}
            </div>
          </div>

          {/* Multisystema Activity status */}
          <div className="dsp-widget">
            <div className="dsp-widget-header">
              <span>Multisystema Activity status</span>
              <MdRefresh size={16} className="dsp-refresh-icon" onClick={() => refreshWidgets(selectedDevice)} />
            </div>
            <div className="dsp-widget-body">
              {liveStates.length === 0 ? (
                <p className="dsp-empty-text">Sin lavadoras configuradas.</p>
              ) : (
                <div className="dsp-table-wrap">
                  <table className="dsp-table">
                    <thead>
                      <tr>
                        <th>Lavadora</th>
                        <th>Programa</th>
                        <th>N°</th>
                        <th>Kg</th>
                        <th>Paso</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveStates.map((lav) => (
                        <tr key={lav.lavadoraId}>
                          <td className="dsp-table-strong">{lav.nombre}</td>
                          {lav.running ? (
                            <>
                              <td>{lav.programaNombre}</td>
                              <td>{lav.programaNumero}</td>
                              <td>{lav.capacidadKg.toFixed(2)}</td>
                              <td>{lav.pasoActual}</td>
                              <td>{lav.pasosTotal}</td>
                            </>
                          ) : (
                            <td colSpan={5} className="dsp-table-muted">Inactivo</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Flujo por bomba */}
          <div className="dsp-widget">
            <div className="dsp-widget-header">
              <span>Dispositivo Flujo por Bomba</span>
              <MdRefresh size={16} className="dsp-refresh-icon" onClick={() => setFlujoSeries(buildFlujoSeries(selectedDevice.id))} />
            </div>
            <div className="dsp-widget-body">
              {flujoSeries.length === 0 ? (
                <p className="dsp-empty-text">Este dispositivo no tiene bombas configuradas (ver Calibración remota).</p>
              ) : (
                <MiniLineChart series={flujoSeries} yUnit=" ml" />
              )}
            </div>
          </div>

          {/* Consumo por producto */}
          <div className="dsp-widget">
            <div className="dsp-widget-header">
              <span>Dispositivo Consumo</span>
              <MdRefresh size={16} className="dsp-refresh-icon" onClick={() => setConsumoData(buildConsumoData(getProductsForClient(selectedDevice.clienteIndex)))} />
            </div>
            <div className="dsp-widget-body">
              {consumoData.length === 0 ? (
                <p className="dsp-empty-text">Este cliente no tiene productos químicos registrados.</p>
              ) : (
                <MiniPieChart data={consumoData} />
              )}
            </div>
          </div>

          {/* Seguimiento de errores */}
          <div className="dsp-widget">
            <div className="dsp-widget-header">
              <span>Dispositivos Seguimiento de errores</span>
              <MdRefresh size={16} className="dsp-refresh-icon" onClick={() => setErrorSummary(buildErrorSummary())} />
            </div>
            <div className="dsp-widget-body">
              <MiniPieChart data={errorSummary} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardStatsPage;
