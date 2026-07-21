import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  getClients, saveClients, deleteClient,
  getDevicesForClient, saveDevicesForClient,
  getProductsForClient, saveProductsForClient,
  deleteProgramsForDevice, deleteCalibracionConfig,
} from "../../services/localMock";
import {
  MdArrowBack, MdAdd, MdClose, MdDevices, MdLocationOn,
  MdApartment, MdSignalWifi4Bar, MdSignalWifiOff, MdDraw, MdMoreVert,
  MdDescription, MdFilterList, MdRefresh, MdScience, MdNotes,
  MdDashboard, MdFlashOn, MdPlaylistPlay, MdDelete, MdSearch, MdTune,
} from "react-icons/md";
import DropdownMenu from "../../components/ui/DropdownMenu";
import DeviceFormModal from "../../components/devices/DeviceFormModal";
import CalibracionRemotaModal from "./CalibracionRemotaModal";

import "./ClientsDetail.css";

// ── Componente de Notas por cliente ──
// Persiste texto libre en localStorage bajo la clave `notas_cliente_${id}`.
function NotasTab({ clienteId }) {
  const storageKey = `notas_cliente_${clienteId}`;
  const [texto, setTexto] = useState(() => localStorage.getItem(storageKey) || "");
  const [guardado, setGuardado] = useState(true);

  const handleChange = (e) => {
    setTexto(e.target.value);
    setGuardado(false);
  };

  const handleGuardar = () => {
    localStorage.setItem(storageKey, texto);
    setGuardado(true);
  };

  const handleLimpiar = () => {
    if (!window.confirm("¿Borrar todas las notas de este cliente?")) return;
    localStorage.removeItem(storageKey);
    setTexto("");
    setGuardado(true);
  };

  return (
    <section className="cd-section">
      <div className="cd-section-header">
        <div className="cd-section-label">
          <MdNotes size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Notas del cliente
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!guardado && (
            <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>Sin guardar</span>
          )}
          {texto && (
            <button className="cd-icon-btn" title="Limpiar notas" onClick={handleLimpiar}
              style={{ color: "#ef4444" }}>
              <MdDelete size={16} />
            </button>
          )}
          <button className="cd-btn-crear" onClick={handleGuardar} disabled={guardado}>
            Guardar
          </button>
        </div>
      </div>
      <textarea
        value={texto}
        onChange={handleChange}
        placeholder="Escribe aquí notas, observaciones o recordatorios sobre este cliente..."
        style={{
          width: "100%",
          minHeight: 220,
          padding: "12px 14px",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          fontSize: 13,
          fontFamily: "inherit",
          resize: "vertical",
          outline: "none",
          color: "#1e293b",
          lineHeight: 1.6,
          background: guardado ? "#fff" : "#fffbeb",
          transition: "background 0.2s",
          boxSizing: "border-box",
        }}
      />
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, textAlign: "right" }}>
        {texto.length} caracteres
      </div>
    </section>
  );
}

function ClientsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const clientes = getClients();
  const cliente = clientes[parseInt(id)];

  const [dispositivos, setDispositivos] = useState(() => getDevicesForClient(id));
  const [productos, setProductos] = useState(() => getProductsForClient(id));
  const [activeTab, setActiveTab] = useState(location.state?.tab || "dispositivos");

  const [showModal, setShowModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [devMenuId, setDevMenuId] = useState(null);
  const [programasDispositivo, setProgramasDispositivo] = useState(null);
  const [calibracionDispositivo, setCalibracionDispositivo] = useState(null);

  const [showDeviceFilter, setShowDeviceFilter] = useState(false);
  const [deviceQuery, setDeviceQuery] = useState("");
  const [showProductFilter, setShowProductFilter] = useState(false);
  const [productQuery, setProductQuery] = useState("");

  const [showEditClienteModal, setShowEditClienteModal] = useState(false);
  const [editClienteTab, setEditClienteTab] = useState("details");
  const [showOpcionesHeader, setShowOpcionesHeader] = useState(false);
  const [showInformes, setShowInformes] = useState(false);
  const [clienteForm, setClienteForm] = useState({
    ...cliente,
    contacto: cliente?.contacto || { nombre: "", telefono: "", email: "" },
  });

  const [showProductModal, setShowProductModal] = useState(false);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [productMenuId, setProductMenuId] = useState(null);
  const [productForm, setProductForm] = useState({ nombre: "", precio: "", cantidadRestante: "", consumoDiario: "" });
  const [editProductForm, setEditProductForm] = useState({});
  const [productError, setProductError] = useState("");
  const [editProductError, setEditProductError] = useState("");

  useEffect(() => {
    if (location.state?.openInformes) setShowInformes(true);
  }, [location.state]);

  if (!cliente) {
    return (
      <div className="cd-not-found">
        <p>Cliente no encontrado.</p>
        <button onClick={() => navigate("/clientes")}>Volver</button>
      </div>
    );
  }

  const handleClienteChange = (e) => setClienteForm({ ...clienteForm, [e.target.name]: e.target.value });
  const handleClienteContactoChange = (e) =>
    setClienteForm({ ...clienteForm, contacto: { ...clienteForm.contacto, [e.target.name]: e.target.value } });

  const handleGuardarCliente = () => {
    const actualizados = clientes.map((c, i) => i === parseInt(id) ? clienteForm : c);
    saveClients(actualizados);
    setShowEditClienteModal(false);
    window.location.reload();
  };

  const handleEliminarCliente = () => {
    if (!window.confirm(`¿Eliminar a ${cliente.nombre} y todos sus dispositivos?`)) return;
    deleteClient(parseInt(id));
    navigate("/clientes");
  };

  const handleCrearDevice = (nuevo) => {
    const actualizados = [...dispositivos, nuevo];
    setDispositivos(actualizados);
    saveDevicesForClient(id, actualizados);
    setShowModal(false);
  };

  const handleEliminar = (devId) => {
    const actualizados = dispositivos.filter((d) => d.id !== devId);
    setDispositivos(actualizados);
    saveDevicesForClient(id, actualizados);
    deleteProgramsForDevice(devId);
    deleteCalibracionConfig(devId);
  };

  const handleGuardarEditDevice = (actualizado) => {
    const actualizados = dispositivos.map((d) => d.id === actualizado.id ? actualizado : d);
    setDispositivos(actualizados);
    saveDevicesForClient(id, actualizados);
    setEditingDevice(null);
  };

  const handleProductChange = (e) => { setProductError(""); setProductForm({ ...productForm, [e.target.name]: e.target.value }); };
  const handleEditProductChange = (e) => { setEditProductError(""); setEditProductForm({ ...editProductForm, [e.target.name]: e.target.value }); };

  const handleCrearProducto = () => {
    const nombre = productForm.nombre.trim();
    if (!nombre || !productForm.precio) return;
    if (productos.some((p) => p.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      setProductError("Ya existe un producto con ese nombre."); return;
    }
    const nuevo = { id: Date.now(), nombre, precio: parseFloat(productForm.precio) || 0, cantidadRestante: parseFloat(productForm.cantidadRestante) || 0, consumoDiario: parseFloat(productForm.consumoDiario) || 0 };
    const actualizados = [...productos, nuevo];
    setProductos(actualizados);
    saveProductsForClient(id, actualizados);
    setProductForm({ nombre: "", precio: "", cantidadRestante: "", consumoDiario: "" });
    setShowProductModal(false);
  };

  const handleEliminarProducto = (prodId) => {
    const actualizados = productos.filter((p) => p.id !== prodId);
    setProductos(actualizados);
    saveProductsForClient(id, actualizados);
  };

  const handleEditarProducto = (prod) => { setEditProductForm(prod); setEditProductError(""); setShowEditProductModal(true); setProductMenuId(null); };

  const handleGuardarEditProducto = () => {
    const nombre = (editProductForm.nombre || "").trim();
    if (!nombre) return;
    if (productos.some((p) => p.id !== editProductForm.id && p.nombre.trim().toLowerCase() === nombre.toLowerCase())) {
      setEditProductError("Ya existe otro producto con ese nombre."); return;
    }
    const actualizado = { ...editProductForm, nombre, precio: parseFloat(editProductForm.precio) || 0, cantidadRestante: parseFloat(editProductForm.cantidadRestante) || 0, consumoDiario: parseFloat(editProductForm.consumoDiario) || 0 };
    const actualizados = productos.map((p) => p.id === actualizado.id ? actualizado : p);
    setProductos(actualizados);
    saveProductsForClient(id, actualizados);
    setShowEditProductModal(false);
  };

  const activos = dispositivos.filter((d) => d.estado === "activo").length;
  const dispositivosFiltrados = dispositivos.filter((d) => { const q = deviceQuery.trim().toLowerCase(); return !q || d.nombre.toLowerCase().includes(q) || (d.serial || "").toLowerCase().includes(q); });
  const productosFiltrados = productos.filter((p) => { const q = productQuery.trim().toLowerCase(); return !q || p.nombre.toLowerCase().includes(q); });

  return (
    <div className="cd-container">
      <div className="cd-header">
        <button className="cd-back-btn" onClick={() => navigate("/clientes")}>
          <MdArrowBack size={20} /><span>Ver Clientes</span>
        </button>
        <div className="cd-header-title">{cliente.nombre}</div>
        <div className="cd-header-actions">
          <button className="cd-header-btn" onClick={() => setShowEditClienteModal(true)}>
            <MdDraw size={18} /><span>Editar</span>
          </button>
          <div style={{ position: "relative" }}>
            <button className="cd-header-btn" onClick={() => setShowOpcionesHeader((v) => !v)}>
              <MdMoreVert size={18} /><span>Opciones</span>
            </button>
            {showOpcionesHeader && (
              <DropdownMenu onClose={() => setShowOpcionesHeader(false)}
                options={[{ label: "Borrar", icon: MdDelete, red: true, action: handleEliminarCliente }]} />
            )}
          </div>
        </div>
      </div>

      <div className="cd-body">
        <section className="cd-client-info-card">
          <div className="cd-client-info-left">
            <div className="cd-client-nombre">{cliente.nombre}</div>
            <div className="cd-client-sub"><MdLocationOn size={13} /> {cliente.ciudad || "—"}, {cliente.pais || "—"}</div>
            <div className="cd-client-sub"><MdApartment size={13} /> Deterquin SAS</div>
          </div>
          <div className="cd-client-info-mid">
            <div className="cd-client-stat-label">Activo / Dispositivos</div>
            <div className="cd-client-stat-val">{activos}<span>/{dispositivos.length}</span></div>
            <div className="cd-circle-wrap">
              <svg viewBox="0 0 36 36" className="cd-circle-svg">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2563eb" strokeWidth="3"
                  strokeDasharray={`${dispositivos.length > 0 ? (activos / dispositivos.length) * 100 : 0}, 100`} />
                <text x="18" y="20.5" textAnchor="middle" fontSize="8" fill="#2563eb" fontWeight="700">
                  {dispositivos.length > 0 ? Math.round((activos / dispositivos.length) * 100) : 0}%
                </text>
              </svg>
            </div>
          </div>
          <div className="cd-client-info-notif">
            <div className="cd-client-stat-label">Notificaciones</div>
            <div className="cd-notif-ok">✓ Sin notificaciones</div>
          </div>
          <div className="cd-client-info-status">
            <div className="cd-client-stat-label">Estado</div>
            <div className="cd-no-suscrito">Sin suscripción</div>
          </div>
          <div className="cd-client-info-btns">
            <div className="cd-client-btn cd-client-btn-full" onClick={() => setActiveTab("dispositivos")}>
              <div className="cd-client-btn-icon-row">
                <MdDevices size={15} color="#2563eb" />
                <span className="cd-client-btn-count">{dispositivos.length}</span>
              </div>
              <span>Dispositivos</span>
            </div>
            <div className="cd-client-btn" onClick={() => setActiveTab("productos")}>
              <MdScience size={15} color="#2563eb" /><span>Productos</span>
            </div>
            <div className="cd-client-btn" onClick={() => setShowInformes(true)}>
              <MdDescription size={15} color="#2563eb" /><span>Informes</span>
            </div>
          </div>
        </section>

        <div className="cd-tabs">
          {["dispositivos", "productos", "categorias", "notas"].map((tab) => (
            <div key={tab} className={`cd-tab ${activeTab === tab ? "cd-tab-active" : ""}`} onClick={() => setActiveTab(tab)}>
              {{ dispositivos: "Dispositivos", productos: "Productos del cliente", categorias: "Categorías de programas", notas: "Notas" }[tab]}
            </div>
          ))}
        </div>

        {activeTab === "dispositivos" && (
          <section className="cd-section">
            <div className="cd-section-header">
              <div className="cd-section-label">
                <MdDevices size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
                Dispositivos <span style={{ color: "#2563eb" }}>Dentro</span>
                <span className="cd-count-badge">{dispositivos.length}</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="cd-icon-btn" onClick={() => setShowDeviceFilter((v) => !v)}><MdFilterList size={18} /></button>
                <button className="cd-icon-btn" onClick={() => setDispositivos(getDevicesForClient(id))}><MdRefresh size={18} /></button>
                <button className="cd-add-btn" onClick={() => setShowModal(true)}><MdAdd size={16} /> Agregar</button>
              </div>
            </div>
            {showDeviceFilter && (
              <div className="cd-inline-filter">
                <MdSearch size={16} />
                <input type="text" placeholder="Buscar por nombre o serial..." value={deviceQuery} onChange={(e) => setDeviceQuery(e.target.value)} autoFocus />
              </div>
            )}
            {dispositivos.length === 0 ? (
              <div className="cd-empty">
                <MdDevices size={40} className="cd-empty-icon" />
                <p>Este cliente no tiene dispositivos registrados.</p>
                <button className="cd-add-btn-empty" onClick={() => setShowModal(true)}><MdAdd size={15} /> Crear primer dispositivo</button>
              </div>
            ) : dispositivosFiltrados.length === 0 ? (
              <div className="cd-empty"><p>Ningún dispositivo coincide con "{deviceQuery}".</p></div>
            ) : (
              <div className="cd-devices-list">
                {dispositivosFiltrados.map((dev) => (
                  <div className="cd-device-row" key={dev.id}>
                    <div className="cd-device-row-left">
                      <div className="cd-device-blue-bar" />
                      <div>
                        <div className="cd-device-row-name">{cliente.nombre}</div>
                        <div className="cd-device-row-serial">{dev.nombre} &nbsp;▷&nbsp; 🌐 {dev.serial}</div>
                        <div className="cd-device-row-sub">
                          <MdLocationOn size={12} /> {dev.ubicacion || "—"} &nbsp;
                          <MdApartment size={12} /> Deterquin SAS
                        </div>
                      </div>
                    </div>
                    <div className="cd-device-row-mid">
                      <div className={`cd-device-status ${dev.estado === "activo" ? "cd-status-on" : "cd-status-off"}`}>
                        {dev.estado === "activo" ? <><MdSignalWifi4Bar size={12} /> Activo</> : <><MdSignalWifiOff size={12} /> Inactivo</>}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>✓ Sin notificaciones</div>
                    </div>
                    <div className="cd-device-row-actions">
                      <div className="cd-dev-action-btn" onClick={() => navigate(`/dispositivos/${dev.id}`)}>
                        <MdDevices size={16} /><span>Dispositivo</span>
                      </div>
                      <div className="cd-dev-action-btn" onClick={() => navigate("/dashboard/dispositivo", { state: { deviceId: dev.id } })}>
                        <MdDashboard size={16} /><span>Dashboard</span>
                      </div>
                      <div className="cd-dev-action-btn" onClick={() => setCalibracionDispositivo(dev)}>
                        <MdFlashOn size={16} /><span>Acciones</span>
                      </div>
                      <div className="cd-dev-action-btn" onClick={() => navigate("/informes/detallado", { state: { clientFilter: cliente.nombre, deviceFilter: dev.nombre } })}>
                        <MdDescription size={16} /><span>Informes</span>
                      </div>
                      <div style={{ position: "relative" }}>
                        <div className="cd-dev-action-btn" onClick={() => setDevMenuId(devMenuId === dev.id ? null : dev.id)}>
                          <MdMoreVert size={16} /><span>Opciones</span>
                        </div>
                        {devMenuId === dev.id && (
                          <DropdownMenu onClose={() => setDevMenuId(null)} options={[
                            { label: "Ajustes", icon: MdTune, action: () => { navigate(`/dispositivos/${dev.id}/ajustes`); setDevMenuId(null); } },
                            { label: "Editar", icon: MdDraw, action: () => { setEditingDevice(dev); setDevMenuId(null); } },
                            { label: "Programas", icon: MdPlaylistPlay, action: () => { navigate(`/dispositivos/${dev.id}/programas`); setDevMenuId(null); } },
                            { label: "Borrar", icon: MdDelete, red: true, action: () => handleEliminar(dev.id) },
                          ]} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "productos" && (
          <section className="cd-section">
            <div className="cd-section-header">
              <div className="cd-section-label">
                <MdScience size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
                Productos <span style={{ color: "#2563eb" }}>del cliente</span>
                <span className="cd-count-badge">{productos.length}</span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="cd-icon-btn" onClick={() => setShowProductFilter((v) => !v)}><MdFilterList size={18} /></button>
                <button className="cd-icon-btn" onClick={() => setProductos(getProductsForClient(id))}><MdRefresh size={18} /></button>
                <button className="cd-add-btn" onClick={() => { setProductError(""); setShowProductModal(true); }}><MdAdd size={16} /> Agregar</button>
              </div>
            </div>
            {showProductFilter && (
              <div className="cd-inline-filter">
                <MdSearch size={16} />
                <input type="text" placeholder="Buscar por nombre..." value={productQuery} onChange={(e) => setProductQuery(e.target.value)} autoFocus />
              </div>
            )}
            {productos.length === 0 ? (
              <div className="cd-empty">
                <MdScience size={40} className="cd-empty-icon" />
                <p>Este cliente no tiene productos químicos registrados.</p>
                <button className="cd-add-btn-empty" onClick={() => { setProductError(""); setShowProductModal(true); }}><MdAdd size={15} /> Crear primer producto</button>
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div className="cd-empty"><p>Ningún producto coincide con "{productQuery}".</p></div>
            ) : (
              <div className="cd-products-list">
                {productosFiltrados.map((prod) => {
                  const precio = Number(prod.precio) || 0;
                  const cantidadRestante = Number(prod.cantidadRestante) || 0;
                  const consumoDiario = Number(prod.consumoDiario) || 0;
                  const agotado = cantidadRestante <= 0;
                  const diasRestantes = consumoDiario > 0 ? Math.max(0, Math.round(cantidadRestante / consumoDiario)) : null;
                  return (
                    <div className="cd-product-row" key={prod.id}>
                      <div className="cd-product-row-left">
                        <div className="cd-product-blue-bar" />
                        <div>
                          <div className="cd-product-row-name">{prod.nombre}</div>
                          <div className="cd-product-row-serial">{precio.toFixed(2)} /L &nbsp;▷&nbsp; Restante: {cantidadRestante.toFixed(2)} L</div>
                          <div className="cd-product-row-sub">Consumo promedio: {consumoDiario.toFixed(2)} L/día</div>
                        </div>
                      </div>
                      <div className="cd-product-row-mid">
                        <div className={`cd-product-status ${agotado ? "cd-status-off" : "cd-status-on"}`}>{agotado ? "Agotado" : "Activo"}</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                          {diasRestantes !== null ? `${diasRestantes} días restantes` : "Sin consumo registrado"}
                        </div>
                      </div>
                      <div className="cd-product-row-actions">
                        <div className="cd-prod-action-btn" onClick={() => handleEditarProducto(prod)}>
                          <MdDraw size={16} /><span>Editar</span>
                        </div>
                        <div style={{ position: "relative" }}>
                          <div className="cd-prod-action-btn" onClick={() => setProductMenuId(productMenuId === prod.id ? null : prod.id)}>
                            <MdMoreVert size={16} /><span>Opciones</span>
                          </div>
                          {productMenuId === prod.id && (
                            <DropdownMenu onClose={() => setProductMenuId(null)}
                              options={[{ label: "Borrar", icon: MdDelete, red: true, action: () => handleEliminarProducto(prod.id) }]} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "notas" && <NotasTab clienteId={id} />}

        {activeTab === "categorias" && (
          <section className="cd-section">
            <div className="cd-empty">
              <MdDescription size={40} className="cd-empty-icon" />
              <p>Categorías de programas estará disponible en una próxima fase.</p>
            </div>
          </section>
        )}
      </div>

      {showModal && <DeviceFormModal onSave={handleCrearDevice} onClose={() => setShowModal(false)} />}
      {editingDevice && <DeviceFormModal device={editingDevice} onSave={handleGuardarEditDevice} onClose={() => setEditingDevice(null)} />}
      {calibracionDispositivo && <CalibracionRemotaModal dispositivo={calibracionDispositivo} productos={productos} onClose={() => setCalibracionDispositivo(null)} />}


      {showEditClienteModal && (
        <div className="cd-modal-overlay" onClick={() => setShowEditClienteModal(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-header">
              <h3>Editar Cliente</h3>
              <button className="cd-modal-close" onClick={() => setShowEditClienteModal(false)}><MdClose size={20} /></button>
            </div>
            <div className="cd-tabs" style={{ padding: "0 22px" }}>
              {["details", "contacts"].map((t) => (
                <div key={t} className={`cd-tab ${editClienteTab === t ? "cd-tab-active" : ""}`} onClick={() => setEditClienteTab(t)}>
                  {t === "details" ? "Details" : "Contacts"}
                </div>
              ))}
            </div>
            <div className="cd-modal-body">
              {editClienteTab === "details" ? (
                <>
                  <label>Nombre</label><input name="nombre" value={clienteForm.nombre || ""} onChange={handleClienteChange} />
                  <label>Ciudad</label><input name="ciudad" value={clienteForm.ciudad || ""} onChange={handleClienteChange} />
                  <label>País</label><input name="pais" value={clienteForm.pais || ""} onChange={handleClienteChange} />
                  <label>Tipo</label>
                  <select name="tipo" value={clienteForm.tipo || ""} onChange={handleClienteChange}>
                    <option value="">Seleccionar</option>
                    <option value="empresa">Empresa</option>
                    <option value="persona">Persona</option>
                  </select>
                </>
              ) : (
                <>
                  <label>Nombre del contacto</label><input name="nombre" value={clienteForm.contacto?.nombre || ""} onChange={handleClienteContactoChange} placeholder="Ej: Juan Pérez" />
                  <label>Teléfono</label><input name="telefono" value={clienteForm.contacto?.telefono || ""} onChange={handleClienteContactoChange} placeholder="Ej: +57 300 1234567" />
                  <label>Email</label><input name="email" type="email" value={clienteForm.contacto?.email || ""} onChange={handleClienteContactoChange} placeholder="Ej: contacto@cliente.com" />
                </>
              )}
            </div>
            <div className="cd-modal-footer">
              <button className="cd-btn-cancel" onClick={() => setShowEditClienteModal(false)}>Cancelar</button>
              <button className="cd-btn-crear" onClick={handleGuardarCliente}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showProductModal && (
        <div className="cd-modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-header">
              <h3>Nuevo Producto</h3>
              <button className="cd-modal-close" onClick={() => setShowProductModal(false)}><MdClose size={20} /></button>
            </div>
            <div className="cd-modal-body">
              <label>Nombre *</label><input name="nombre" value={productForm.nombre} onChange={handleProductChange} placeholder="Ej: BUSTER 40" />
              <label>Precio (por litro) *</label><input name="precio" type="number" step="0.01" min="0" value={productForm.precio} onChange={handleProductChange} placeholder="Ej: 0.68" />
              <label>Cantidad restante (L)</label><input name="cantidadRestante" type="number" step="0.01" value={productForm.cantidadRestante} onChange={handleProductChange} placeholder="Ej: 145" />
              <label>Consumo diario promedio (L/día)</label><input name="consumoDiario" type="number" step="0.01" min="0" value={productForm.consumoDiario} onChange={handleProductChange} placeholder="Ej: 7.45" />
              {productError && <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{productError}</p>}
            </div>
            <div className="cd-modal-footer">
              <button className="cd-btn-cancel" onClick={() => setShowProductModal(false)}>Cancelar</button>
              <button className="cd-btn-crear" onClick={handleCrearProducto} disabled={!productForm.nombre || !productForm.precio}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {showEditProductModal && (
        <div className="cd-modal-overlay" onClick={() => setShowEditProductModal(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-header">
              <h3>Editar Producto</h3>
              <button className="cd-modal-close" onClick={() => setShowEditProductModal(false)}><MdClose size={20} /></button>
            </div>
            <div className="cd-modal-body">
              <label>Nombre *</label><input name="nombre" value={editProductForm.nombre || ""} onChange={handleEditProductChange} />
              <label>Precio (por litro) *</label><input name="precio" type="number" step="0.01" min="0" value={editProductForm.precio ?? ""} onChange={handleEditProductChange} />
              <label>Cantidad restante (L)</label><input name="cantidadRestante" type="number" step="0.01" value={editProductForm.cantidadRestante ?? ""} onChange={handleEditProductChange} />
              <label>Consumo diario promedio (L/día)</label><input name="consumoDiario" type="number" step="0.01" min="0" value={editProductForm.consumoDiario ?? ""} onChange={handleEditProductChange} />
              {editProductError && <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{editProductError}</p>}
            </div>
            <div className="cd-modal-footer">
              <button className="cd-btn-cancel" onClick={() => setShowEditProductModal(false)}>Cancelar</button>
              <button className="cd-btn-crear" onClick={handleGuardarEditProducto}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showInformes && (
        <div className="cd-modal-overlay" onClick={() => setShowInformes(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-header">
              <h3>Informes — {cliente.nombre}</h3>
              <button className="cd-modal-close" onClick={() => setShowInformes(false)}><MdClose size={20} /></button>
            </div>
            <div className="cd-modal-body">
              <p style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>Para ver el detalle completo, abre la página de Informes.</p>
              <button className="cd-btn-crear" style={{ alignSelf: "flex-start" }}
                onClick={() => navigate("/informes/detallado", { state: { clientFilter: cliente.nombre } })}>
                Ir a Informes de {cliente.nombre}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientsDetail;
