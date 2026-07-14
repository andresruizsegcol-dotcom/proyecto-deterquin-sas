// Página independiente "Ver Dispositivo" — ruta /dispositivos/:deviceId.
// Construida según las imágenes 9-12 de la especificación: header con
// Editar/Opciones, barra de info del dispositivo con accesos directos
// (Dashboard/Acciones/Informes), y tabs (Datos en vivo / Notificaciones /
// Notification clear history / Notas / Archivo de imágenes).
// IMPORTANTE: a diferencia de la versión anterior, "Datos en Vivo"
// (Lavadoras extractoras + Ajustes esquemáticos) vive EMBEBIDO aquí mismo
// como contenido de la pestaña, no como modal — por pedido explícito.
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  findDeviceById, getDevicesForClient, saveDevicesForClient,
  getProductsForClient, deleteProgramsForDevice, deleteCalibracionConfig,
} from "../../services/localMock";
import {
  MdArrowBack, MdDraw, MdMoreVert, MdDelete, MdTune, MdPlaylistPlay,
  MdSensors, MdDashboard, MdFlashOn, MdDescription, MdLocationOn,
  MdApartment, MdSignalWifi4Bar, MdSignalWifiOff,
} from "react-icons/md";
import DropdownMenu from "../../components/ui/DropdownMenu";
import DeviceFormModal from "../../components/devices/DeviceFormModal";
import CalibracionRemotaModal from "../clients/CalibracionRemotaModal";
import AjustesDispositivoModal from "../clients/AjustesDispositivoModal";
import DeviceLiveDataPanel from "../clients/DeviceLiveDataPanel";
import "../clients/ClientsDetail.css";
import "./DeviceDetailPage.css";

const TABS = [
  { key: "datos-vivo", label: "Datos en vivo" },
  { key: "notificaciones", label: "Notificaciones" },
  { key: "clear-history", label: "Notification clear history" },
  { key: "notas", label: "Notas" },
  { key: "imagenes", label: "Archivo de imágenes" },
];

function DeviceDetailPage() {
  const { deviceId } = useParams();
  const navigate = useNavigate();

  const [match, setMatch] = useState(() => findDeviceById(deviceId));
  const [activeTab, setActiveTab] = useState("datos-vivo");
  const [showOpciones, setShowOpciones] = useState(false);
  const [editingDevice, setEditingDevice] = useState(false);
  const [programasOpen, setProgramasOpen] = useState(false);
  const [calibracionOpen, setCalibracionOpen] = useState(false);
  const [ajustesOpen, setAjustesOpen] = useState(false);

  if (!match) {
    return (
      <div className="cd-not-found">
        <p>Dispositivo no encontrado (puede haber sido eliminado).</p>
        <button onClick={() => navigate("/dispositivos")}>Volver a Dispositivos</button>
      </div>
    );
  }

  const { device, clienteIndex, clienteNombre } = match;
  const productos = getProductsForClient(clienteIndex);

  const refreshDevice = () => setMatch(findDeviceById(device.id));

  const handleGuardarEditDevice = (actualizado) => {
    const devices = getDevicesForClient(clienteIndex);
    const actualizados = devices.map((d) => (d.id === actualizado.id ? actualizado : d));
    saveDevicesForClient(clienteIndex, actualizados);
    setEditingDevice(false);
    refreshDevice();
  };

  const handleBorrarDispositivo = () => {
    if (!window.confirm(`¿Eliminar el dispositivo "${device.nombre}"? Esta acción no se puede deshacer.`)) return;
    const devices = getDevicesForClient(clienteIndex);
    saveDevicesForClient(clienteIndex, devices.filter((d) => d.id !== device.id));
    deleteProgramsForDevice(device.id);
    deleteCalibracionConfig(device.id);
    navigate("/dispositivos");
  };

  return (
    <div className="cd-container">

      {/* Header */}
      <div className="cd-header">
        <button className="cd-back-btn" onClick={() => navigate("/dispositivos")}>
          <MdArrowBack size={20} /><span>Ver Dispositivo</span>
        </button>
        <div className="cd-header-title">{device.nombre}</div>
        <div className="cd-header-actions">
          <button className="cd-header-btn" onClick={() => setEditingDevice(true)}>
            <MdDraw size={18} /><span>Editar</span>
          </button>
          <div style={{ position: "relative" }}>
            <button className="cd-header-btn" onClick={() => setShowOpciones((v) => !v)}>
              <MdMoreVert size={18} /><span>Opciones</span>
            </button>
            {showOpciones && (
              <DropdownMenu
                onClose={() => setShowOpciones(false)}
                options={[
                  { label: "Ajustes", icon: MdTune, action: () => { setAjustesOpen(true); setShowOpciones(false); } },
                  { label: "Programas", icon: MdPlaylistPlay, action: () => { navigate(`/dispositivos/${device.id}/programas`); setShowOpciones(false); } },
                  { label: "Borrar", icon: MdDelete, red: true, action: handleBorrarDispositivo },
                ]}
              />
            )}
          </div>
        </div>
      </div>

      <div className="cd-body">

        {/* Tarjeta de info del dispositivo */}
        <section className="ddp-info-card">
          <div className="ddp-info-left">
            <div className="ddp-info-nombre">{device.nombre}</div>
            <div className="ddp-info-sub">Serial: {device.serial || "—"}</div>
            <div className="ddp-info-sub"><MdLocationOn size={13} /> {device.ubicacion || "—"}</div>
            <div className="ddp-info-sub"><MdApartment size={13} /> {clienteNombre}</div>
          </div>

          <div className="ddp-info-status-block">
            <div className="ddp-info-label">Estado</div>
            <div className={`cd-device-status ${device.estado === "activo" ? "cd-status-on" : "cd-status-off"}`}>
              {device.estado === "activo"
                ? <><MdSignalWifi4Bar size={12} /> Activo</>
                : <><MdSignalWifiOff size={12} /> Inactivo</>}
            </div>
          </div>

          <div className="ddp-info-status-block">
            <div className="ddp-info-label">Notificaciones</div>
            <div className="cd-notif-ok">✓ Sin notificaciones</div>
          </div>

          <div className="ddp-info-actions">
            <div className="cd-dev-action-btn" onClick={() => navigate("/dashboard/dispositivo", { state: { deviceId: device.id } })}>
              <MdDashboard size={16} /><span>Dashboard</span>
            </div>
            <div className="cd-dev-action-btn" onClick={() => setCalibracionOpen(true)}>
              <MdFlashOn size={16} /><span>Acciones</span>
            </div>
            <div className="cd-dev-action-btn" onClick={() => navigate("/informes/detallado", { state: { clientFilter: clienteNombre, deviceFilter: device.nombre } })}>
              <MdDescription size={16} /><span>Informes</span>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="cd-tabs">
          {TABS.map((tab) => (
            <div
              key={tab.key}
              className={`cd-tab ${activeTab === tab.key ? "cd-tab-active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </div>
          ))}
        </div>

        {/* Contenido de pestañas */}
        {activeTab === "datos-vivo" && (
          <section className="cd-section ddp-live-section">
            <DeviceLiveDataPanel dispositivo={device} productos={productos} />
          </section>
        )}

        {activeTab !== "datos-vivo" && (
          <section className="cd-section">
            <div className="cd-empty">
              <MdSensors size={40} className="cd-empty-icon" />
              <p>
                {TABS.find((t) => t.key === activeTab)?.label} estará disponible en una próxima fase.
              </p>
            </div>
          </section>
        )}
      </div>

      {/* Modales */}
      {editingDevice && (
        <DeviceFormModal device={device} onSave={handleGuardarEditDevice} onClose={() => setEditingDevice(false)} />
      )}
      {calibracionOpen && (
        <CalibracionRemotaModal dispositivo={device} productos={productos} onClose={() => setCalibracionOpen(false)} />
      )}
      {ajustesOpen && (
        <AjustesDispositivoModal
          dispositivo={device}
          productos={productos}
          onSaveDevice={handleGuardarEditDevice}
          onClose={() => setAjustesOpen(false)}
        />
      )}
    </div>
  );
}

export default DeviceDetailPage;
