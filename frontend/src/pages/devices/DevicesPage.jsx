// Página de dispositivos (vista global, todos los clientes).
// Cada fila muestra 4 accesos directos:
//   Dispositivo → navega a /dispositivos/:id (página independiente con tabs)
//   Dashboard   → /dashboard/dispositivo preseleccionando ese dispositivo
//   Acciones    → modal CalibracionRemotaModal
//   Informes    → /informes/detallado con filtros precargados
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getClients, getDevicesForClient, saveDevicesForClient, getProductsForClient,
  deleteProgramsForDevice, deleteCalibracionConfig,
} from "../../services/localMock";
import {
  MdFilterList, MdMoreVert, MdRefresh, MdSearch, MdArrowBack, MdAdd,
  MdKeyboardArrowDown, MdKeyboardArrowUp, MdLocationOn, MdApartment,
  MdDraw, MdDashboard, MdDescription, MdFlashOn, MdDevices, MdPlaylistPlay,
  MdDelete, MdSignalWifi4Bar, MdSignalWifiOff, MdClose, MdTune,
} from "react-icons/md";
import DropdownMenu from "../../components/ui/DropdownMenu";
import DeviceFormModal from "../../components/devices/DeviceFormModal";
import CalibracionRemotaModal from "../clients/CalibracionRemotaModal";

import "./DevicesPage.css";

function DeviceCard({ dev, navigate, onDelete, onEdit, onOpenProgramas, onOpenCalibracion }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  return (
    <>
      <div className="dv-card">
        <div className="dv-card-main">
          <div className="dv-blue-bar" style={{ background: dev.estado === "activo" ? "#2563eb" : "#94a3b8" }} />

          <div className="dv-card-left">
            <div className="dv-card-nombre">{dev.clienteNombre}</div>
            <div className="dv-card-serial">{dev.nombre} &nbsp;▷&nbsp; 🌐 {dev.serial}</div>
            <div className="dv-card-sub">
              <MdLocationOn size={12} /> {dev.ubicacion || "—"} &nbsp;
              <MdApartment size={12} /> Deterquin SAS
            </div>
          </div>

          <div className="dv-card-mid">
            <div className="dv-card-sublabel">Estado</div>
            <div className={`device-status-badge ${dev.estado === "activo" ? "status-on" : "status-off"}`}>
              {dev.estado === "activo"
                ? <><MdSignalWifi4Bar size={12} /> Activo</>
                : <><MdSignalWifiOff size={12} /> Inactivo</>}
            </div>
            <div className="dv-notif-ok" style={{ marginTop: 4 }}>✓ Sin notificaciones</div>
          </div>

          <div className="dv-card-actions">
            {/* "Dispositivo" → navega a la página independiente con 5 tabs */}
            <div className="dv-action-btn"
              onClick={() => navigate(`/dispositivos/${dev.id}`)}
              title="Ver detalle completo del dispositivo">
              <MdDevices size={15} /><span>Dispositivo</span>
            </div>
            <div className="dv-action-btn"
              onClick={() => navigate("/dashboard/dispositivo", { state: { deviceId: dev.id } })}
              title="Dashboard del dispositivo">
              <MdDashboard size={15} /><span>Dashboard</span>
            </div>
            <div className="dv-action-btn"
              onClick={() => onOpenCalibracion(dev)}
              title="Calibración remota y acciones rápidas">
              <MdFlashOn size={15} /><span>Acciones</span>
            </div>
            <div className="dv-action-btn"
              onClick={() => navigate("/informes/detallado", { state: { clientFilter: dev.clienteNombre, deviceFilter: dev.nombre } })}
              title="Ver informes de este dispositivo">
              <MdDescription size={15} /><span>Informes</span>
            </div>
            <div style={{ position: "relative" }}>
              <div className="dv-action-btn" onClick={() => setShowMenu((v) => !v)}>
                <MdMoreVert size={15} /><span>Opciones</span>
              </div>
              {showMenu && (
                <DropdownMenu
                  onClose={() => setShowMenu(false)}
                  options={[
                    { label: "Ajustes",   icon: MdTune,       action: () => { navigate(`/dispositivos/${dev.id}/ajustes`); setShowMenu(false); } },
                    { label: "Editar",    icon: MdDraw,       action: () => onEdit(dev) },
                    { label: "Programas", icon: MdPlaylistPlay, action: () => { navigate(`/dispositivos/${dev.id}/programas`); setShowMenu(false); } },
                    { label: "Borrar",    icon: MdDelete,     red: true, action: () => setShowConfirmDelete(true) },
                  ]}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {showConfirmDelete && (
        <div className="dv-modal-overlay" onClick={() => setShowConfirmDelete(false)}>
          <div className="dv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dv-modal-header">
              <h3>Eliminar dispositivo</h3>
              <button className="dv-modal-close" onClick={() => setShowConfirmDelete(false)}><MdClose size={20} /></button>
            </div>
            <div style={{ padding: "16px 20px", fontSize: 14, color: "#475569" }}>
              ¿Estás seguro que deseas eliminar <strong>{dev.nombre}</strong>?
            </div>
            <div className="dv-modal-footer">
              <button className="dv-btn-cancel" onClick={() => setShowConfirmDelete(false)}>Cancelar</button>
              <button className="dv-btn-delete" onClick={() => { onDelete(dev); setShowConfirmDelete(false); }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DevicesPage() {
  const navigate = useNavigate();
  const [buscar, setBuscar] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [showActividad, setShowActividad] = useState(false);
  const [activo, setActivo] = useState(true);
  const [inactivo, setInactivo] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const [editingDevice, setEditingDevice] = useState(null);
  const [programasDispositivo, setProgramasDispositivo] = useState(null);
  const [calibracionDispositivo, setCalibracionDispositivo] = useState(null);


  const clientes = getClients();

  const cargarDispositivos = () =>
    clientes.flatMap((cliente, i) =>
      getDevicesForClient(i).map((dev) => ({ ...dev, clienteNombre: cliente.nombre, clienteIndex: i }))
    );

  const [dispositivos, setDispositivos] = useState(cargarDispositivos);

  const handleActualizar = () => {
    setIsUpdating(true);
    setDispositivos(cargarDispositivos());
    setTimeout(() => setIsUpdating(false), 500);
  };

  const handleDelete = (dev) => {
    const actualizados = getDevicesForClient(dev.clienteIndex).filter((d) => d.id !== dev.id);
    saveDevicesForClient(dev.clienteIndex, actualizados);
    deleteProgramsForDevice(dev.id);
    deleteCalibracionConfig(dev.id);
    setDispositivos((prev) => prev.filter((d) => !(d.id === dev.id && d.clienteIndex === dev.clienteIndex)));
  };

  const handleGuardarEditDevice = (actualizado) => {
    const actualizados = getDevicesForClient(actualizado.clienteIndex)
      .map((d) => (d.id === actualizado.id ? actualizado : d));
    saveDevicesForClient(actualizado.clienteIndex, actualizados);
    setDispositivos((prev) => prev.map((d) =>
      d.id === actualizado.id && d.clienteIndex === actualizado.clienteIndex ? { ...actualizado } : d
    ));
    setEditingDevice(null);
  };

  const dispositivosFiltrados = dispositivos.filter((dev) => {
    const q = buscar.trim().toLowerCase();
    const matchBuscar = !q || dev.nombre.toLowerCase().includes(q) || dev.serial.toLowerCase().includes(q);
    const matchCliente = !clienteFiltro || dev.clienteNombre.toLowerCase().includes(clienteFiltro.toLowerCase());
    const matchEstado = (activo && dev.estado === "activo") || (inactivo && dev.estado === "inactivo");
    return matchBuscar && matchCliente && matchEstado;
  });

  const productosDelDispositivo = (dev) => (dev ? getProductsForClient(dev.clienteIndex) : []);

  return (
    <div className="devices-container">
      <div className="devices-header">
        <div className="devices-title" onClick={() => navigate("/")}>
          <MdArrowBack size={26} /><h2>Buscar Dispositivos</h2>
        </div>
        <div className="devices-actions">
          <div className="devices-action" onClick={handleActualizar}>
            <MdRefresh size={24} /><span>{isUpdating ? "Cargando..." : "Actualizar"}</span>
          </div>
          <div className="devices-action" onClick={() => setShowFilters((v) => !v)}>
            <MdFilterList size={24} /><span>{showFilters ? "Ocultar filtros" : "Mostrar filtros"}</span>
          </div>
          <div className="devices-action" onClick={() => navigate("/clientes")}>
            <MdAdd size={24} /><span>Crear</span>
          </div>
        </div>
      </div>

      <div className="devices-content">
        {showFilters && (
          <div className="devices-filter-bar">
            <div className="devices-search-box">
              <MdSearch size={18} />
              <input type="text" placeholder="Buscar..." value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            </div>
            <select className="devices-input" value={clienteFiltro} onChange={(e) => setClienteFiltro(e.target.value)}>
              <option value="">Cliente</option>
              {clientes.map((c, i) => <option key={i} value={c.nombre}>{c.nombre}</option>)}
            </select>
            <div className="devices-actividad-wrapper">
              <button className="devices-select-btn" onClick={() => setShowActividad(!showActividad)}>
                Actividad {showActividad ? <MdKeyboardArrowUp size={18} /> : <MdKeyboardArrowDown size={18} />}
              </button>
              {showActividad && (
                <div className="actividad-dropdown">
                  <div className="actividad-item">
                    <span>Activo</span>
                    <div className={`toggle ${activo ? "on" : ""}`} onClick={() => setActivo(!activo)}>
                      <div className="toggle-circle" />
                    </div>
                  </div>
                  <div className="actividad-item">
                    <span>Inactivo</span>
                    <div className={`toggle ${inactivo ? "on" : ""}`} onClick={() => setInactivo(!inactivo)}>
                      <div className="toggle-circle" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="devices-list">
          {dispositivosFiltrados.length === 0 ? (
            <p className="devices-no-data">No hay dispositivos registrados</p>
          ) : (
            dispositivosFiltrados.map((dev) => (
              <DeviceCard
                key={`${dev.clienteIndex}-${dev.id}`}
                dev={dev}
                navigate={navigate}
                onDelete={handleDelete}
                onEdit={setEditingDevice}
                onOpenProgramas={setProgramasDispositivo}
                onOpenCalibracion={setCalibracionDispositivo}
              />
            ))
          )}
        </div>
      </div>

      {editingDevice && (
        <DeviceFormModal device={editingDevice} onSave={handleGuardarEditDevice} onClose={() => setEditingDevice(null)} />
      )}
      {calibracionDispositivo && (
        <CalibracionRemotaModal
          dispositivo={calibracionDispositivo}
          productos={productosDelDispositivo(calibracionDispositivo)}
          onClose={() => setCalibracionDispositivo(null)}
        />
      )}

    </div>
  );
}

export default DevicesPage;
