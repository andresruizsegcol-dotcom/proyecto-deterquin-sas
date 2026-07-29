// Página de Ubicación — /informes/ubicacion
// Mapa interactivo Leaflet + OpenStreetMap con marcadores por dispositivo.
import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MdClose, MdRefresh, MdFilterList, MdSignalWifi4Bar, MdSignalWifiOff,
  MdDevices, MdDashboard, MdDescription, MdMoreVert, MdCheck,
  MdLocationOn, MdBusiness, MdCalendarToday, MdRouter,
} from "react-icons/md";
import { getClients, getDevicesForClient } from "../../services/localMock";
import "./UbicacionPage.css";

// ── Fix Leaflet marker icons (Vite bundler path issue) ───────────────────────
// Must be inside a function/hook, not at module level
function fixLeafletIcons() {
  try {
    // eslint-disable-next-line no-underscore-dangle
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  } catch (_) { /* ignore */ }
}

// ── Colored circle DivIcon — no external resources needed ────────────────────
function makeCircleIcon(color, size = 14) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px; height:${size}px;
      border-radius:50%;
      background:${color};
      border:2.5px solid white;
      box-shadow:0 1px 5px rgba(0,0,0,.35);
    "></div>`,
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor:[0, -(size / 2) - 4],
  });
}

// Colombia center
const COLOMBIA_CENTER = [4.711, -74.0721];

// Deterministic pseudo-coordinates near Bogotá for devices without coords
function seedCoords(deviceId, clientIdx) {
  const hash = String(deviceId)
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  return [
    4.6097 + ((hash * 7 + clientIdx * 13) % 200) / 100 - 1,
    -74.0817 + ((hash * 11 + clientIdx * 17) % 300) / 150 - 1,
  ];
}

// Fly to marker on selection
function FlyToMarker({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 13, { animate: true, duration: 1.2 });
  }, [coords, map]);
  return null;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function UbicacionPage() {
  const navigate = useNavigate();

  // Fix Leaflet icons once on mount
  useEffect(() => { fixLeafletIcons(); }, []);

  const [tileType,          setTileType]          = useState("mapa");
  const [filterCliente,     setFilterCliente]     = useState("");
  const [filterDispositivo, setFilterDispositivo] = useState("");
  const [selectedDevice,    setSelectedDevice]    = useState(null);
  const [flyCoords,         setFlyCoords]         = useState(null);
  const [modalVisible,      setModalVisible]      = useState(false);

  // Measure wrapper height dynamically so Leaflet gets real pixels
  const wrapperRef = useRef(null);
  const [mapHeight, setMapHeight] = useState(480);
  useEffect(() => {
    function measure() {
      if (wrapperRef.current) {
        const h = wrapperRef.current.clientHeight;
        if (h > 0) setMapHeight(h);
      }
    }
    measure();
    // Re-measure on window resize
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Icons created with useMemo (inside component, after DOM ready)
  const icons = useMemo(() => ({
    active:   makeCircleIcon("#16a34a", 16),
    inactive: makeCircleIcon("#94a3b8", 16),
    selected: makeCircleIcon("#2563eb", 20),
  }), []);

  // ── Data ──────────────────────────────────────────────────────────────────
  const clientes   = useMemo(() => getClients(), []);
  const allDevices = useMemo(() => {
    const result = [];
    clientes.forEach((cliente, clienteIndex) => {
      getDevicesForClient(clienteIndex).forEach((device) => {
        // Guard: device.ubicacion can be a plain string ("Lavanderia") instead
        // of a {lat, lng} object. Only use it when both values are finite numbers.
        const rawLat = device.ubicacion?.lat;
        const rawLng = device.ubicacion?.lng;
        const hasValidCoords =
          typeof rawLat === "number" && isFinite(rawLat) &&
          typeof rawLng === "number" && isFinite(rawLng);

        const coords = hasValidCoords
          ? [rawLat, rawLng]
          : seedCoords(device.id, clienteIndex);

        // Final safety: skip entry if coords still contains non-finite values
        if (!isFinite(coords[0]) || !isFinite(coords[1])) return;

        result.push({ device, clienteNombre: cliente.nombre, clienteIndex, coords });
      });
    });
    return result;
  }, [clientes]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => allDevices.filter((d) => {
    if (filterCliente     && d.clienteNombre     !== filterCliente)     return false;
    if (filterDispositivo && String(d.device.id) !== filterDispositivo) return false;
    return true;
  }), [allDevices, filterCliente, filterDispositivo]);

  const clienteOptions = useMemo(
    () => [...new Set(allDevices.map((d) => d.clienteNombre))],
    [allDevices]
  );
  const dispositivoOptions = useMemo(
    () => allDevices
      .filter((d) => !filterCliente || d.clienteNombre === filterCliente)
      .map((d) => ({ id: String(d.device.id), nombre: d.device.nombre })),
    [allDevices, filterCliente]
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleMarkerClick = (entry) => {
    setSelectedDevice(entry);
    setFlyCoords([...entry.coords]);
    setModalVisible(true);
  };
  const closeModal   = () => { setModalVisible(false); setSelectedDevice(null); };
  const resetFilters = () => { setFilterCliente(""); setFilterDispositivo(""); };

  const tileUrl    = tileType === "satelite"
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const tileAttrib = tileType === "satelite"
    ? "Tiles &copy; Esri"
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <div className="ubic-page">

      {/* Header */}
      <div className="ubic-header">
        <h2 className="ubic-title">
          <MdLocationOn size={22} color="#2563eb" />
          Ubicación de Dispositivos
        </h2>
        <div className="ubic-header-actions">
          <button className="ubic-action-btn" onClick={resetFilters}>
            <MdRefresh size={18} /> Actualizar
          </button>
          {(filterCliente || filterDispositivo) && (
            <button className="ubic-action-btn ubic-action-clear" onClick={resetFilters}>
              <MdClose size={16} /> Borrar filtros
            </button>
          )}
        </div>
      </div>

      {/* Filters bar */}
      <div className="ubic-filters-bar">
        <MdFilterList size={18} color="#2563eb" />
        <select
          className="ubic-filter-select"
          value={filterCliente}
          onChange={(e) => { setFilterCliente(e.target.value); setFilterDispositivo(""); }}
        >
          <option value="">Todos los Clientes</option>
          {clienteOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="ubic-filter-select"
          value={filterDispositivo}
          onChange={(e) => setFilterDispositivo(e.target.value)}
        >
          <option value="">Todos los Dispositivos</option>
          {dispositivoOptions.map((d) => (
            <option key={d.id} value={d.id}>{d.nombre}</option>
          ))}
        </select>
        {filterCliente && (
          <span className="ubic-chip">
            {filterCliente}
            <MdClose size={13} style={{ cursor: "pointer" }}
              onClick={() => { setFilterCliente(""); setFilterDispositivo(""); }} />
          </span>
        )}
        {filterDispositivo && (
          <span className="ubic-chip">
            {dispositivoOptions.find((d) => d.id === filterDispositivo)?.nombre}
            <MdClose size={13} style={{ cursor: "pointer" }}
              onClick={() => setFilterDispositivo("")} />
          </span>
        )}
        <span className="ubic-filter-count" style={{ marginLeft: "auto" }}>
          {filtered.length} dispositivo{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Map wrapper */}
      <div className="ubic-map-wrapper" ref={wrapperRef}>
        {/* Toggle Mapa/Satélite — outside MapContainer so it has no z-index conflict */}
        <div className="ubic-map-toggle">
          <button
            className={`ubic-toggle-btn ${tileType === "mapa" ? "active" : ""}`}
            onClick={() => setTileType("mapa")}
          >Mapa</button>
          <button
            className={`ubic-toggle-btn ${tileType === "satelite" ? "active" : ""}`}
            onClick={() => setTileType("satelite")}
          >Satélite</button>
        </div>

        {/* Leaflet map — explicit pixel height is REQUIRED */}
        <MapContainer
          center={COLOMBIA_CENTER}
          zoom={6}
          style={{ width: "100%", height: `${mapHeight}px` }}
          zoomControl
          scrollWheelZoom
        >
          <TileLayer url={tileUrl} attribution={tileAttrib} maxZoom={19} />
          {flyCoords && <FlyToMarker coords={flyCoords} />}

          {filtered.map((entry) => {
            const isSelected = selectedDevice &&
              String(selectedDevice.device.id) === String(entry.device.id);
            const icon = isSelected
              ? icons.selected
              : entry.device.estado === "activo"
              ? icons.active
              : icons.inactive;
            return (
              <Marker
                key={entry.device.id}
                position={entry.coords}
                icon={icon}
                eventHandlers={{ click: () => handleMarkerClick(entry) }}
              />
            );
          })}
        </MapContainer>

        {/* Legend */}
        <div className="ubic-legend">
          <span className="ubic-legend-dot active"   /> Activo
          <span className="ubic-legend-dot inactive" /> Inactivo
        </div>
      </div>

      {/* Modal */}
      {modalVisible && selectedDevice && (
        <DeviceModal
          entry={selectedDevice}
          onClose={closeModal}
          onNavigateDevice={() => navigate(`/dispositivos/${selectedDevice.device.id}`)}
          onNavigateDashboard={() =>
            navigate("/dashboard/dispositivo", {
              state: { deviceId: selectedDevice.device.id },
            })
          }
          onNavigateInformes={() =>
            navigate("/informes/detallado", {
              state: {
                clientFilter: selectedDevice.clienteNombre,
                deviceFilter: selectedDevice.device.nombre,
              },
            })
          }
        />
      )}
    </div>
  );
}

// ── Device Info Modal ────────────────────────────────────────────────────────
function DeviceModal({
  entry, onClose, onNavigateDevice, onNavigateDashboard, onNavigateInformes,
}) {
  const { device, clienteNombre } = entry;
  const isActivo = device.estado === "activo";
  const lastSeen = device.ultimaConexion
    ? new Date(device.ultimaConexion).toLocaleString("es-CO")
    : new Date().toLocaleString("es-CO");

  return (
    <div className="ubic-modal-overlay" onClick={onClose}>
      <div className="ubic-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="ubic-modal-header">
          <span className="ubic-modal-title">Información de dispositivo</span>
          <div className="ubic-modal-header-actions">
            <button className="ubic-modal-action-btn">
              <MdMoreVert size={16} /> Opciones
            </button>
            <button className="ubic-modal-close-btn" onClick={onClose}>
              <MdClose size={16} /> Cerrar
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="ubic-modal-body">

          {/* LEFT */}
          <div className="ubic-modal-left">
            <div className="ubic-modal-device-name">{device.nombre || "Dispositivo"}</div>
            <div className="ubic-modal-meta-row">
              <MdRouter size={14} color="#64748b" />
              <span className="ubic-modal-serial">{device.serial || "—"}</span>
              <span className={`ubic-modal-status-badge ${isActivo ? "activo" : "inactivo"}`}>
                {isActivo
                  ? <><MdSignalWifi4Bar size={12} /> Activo</>
                  : <><MdSignalWifiOff  size={12} /> Inactivo</>}
              </span>
            </div>
            <div className="ubic-modal-info-rows">
              <div className="ubic-modal-info-row">
                <MdCalendarToday size={13} color="#94a3b8" />
                <span>{lastSeen}</span>
              </div>
              <div className="ubic-modal-info-row">
                <MdBusiness size={13} color="#94a3b8" />
                <span className="ubic-modal-client-link">{clienteNombre}</span>
              </div>
              <div className="ubic-modal-info-row">
                <MdBusiness size={13} color="#94a3b8" />
                <span>DETERQUIN SAS</span>
              </div>
              <div className="ubic-modal-info-row">
                <MdDevices size={13} color="#94a3b8" />
                <span className="ubic-modal-version-badge">Multi-system v0.1.0</span>
              </div>
            </div>
          </div>

          {/* CENTER */}
          <div className="ubic-modal-center">
            <div className="ubic-modal-notif-title">Notificaciones del dispositivo</div>
            <div className="ubic-modal-notif-ok">
              <MdCheck size={16} color="#16a34a" />
              <span>No notifications</span>
            </div>
          </div>

          {/* RIGHT — Quick actions */}
          <div className="ubic-modal-right">
            <button className="ubic-modal-quick-btn" onClick={onNavigateDevice}>
              <MdDevices   size={24} color="#2563eb" /><span>Dispositivo</span>
            </button>
            <button className="ubic-modal-quick-btn" onClick={onNavigateDashboard}>
              <MdDashboard size={24} color="#2563eb" /><span>Dashboard</span>
            </button>
            <button className="ubic-modal-quick-btn">
              <MdDescription size={24} color="#2563eb" /><span>Acciones</span>
            </button>
            <button className="ubic-modal-quick-btn" onClick={onNavigateInformes}>
              <MdDescription size={24} color="#2563eb" /><span>Informes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
