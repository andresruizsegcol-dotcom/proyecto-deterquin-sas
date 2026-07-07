// CM2W-Sprint1+2+3: Refactor de la vista Buscar Clientes
// - Toolbar horizontal estilo CM2W
// - Toggle tarjetas/tabla
// - Contador de resultados y botón limpiar filtros
// - Filtro tipo renderizado + pills removibles
// - Indicador online + selección múltiple
// - Estado vacío + skeleton loader
// - Sistema de toast éxito/error
// RESTRICCIÓN: no se cambiaron colores, tipografías ni radios base.
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getClients,
  saveClients,
  deleteClient,
  getDeviceCounts,
  getRegisteredDeviceSerials,
} from "../../services/localMock";
import {
  MdFilterList,
  MdRefresh,
  MdSearch,
  MdArrowBack,
  MdAdd,
  MdClose,
  MdApartment,
  MdLocationOn,
  MdDescription,
  MdDelete,
  MdScience,
  MdGridView,
  MdTableRows,
  MdClear,
  MdFilterAltOff,
  MdSearchOff,
  MdGroups,
  MdCheckBoxOutlineBlank,
  MdCheckBox,
  MdFileDownload,
} from "react-icons/md";
import "./ClientsPage.css";

const APP_TYPE = "Multi-system Application";

// CM2W-Sprint2: Calcula el % de dispositivos activos
function buildDeviceRing(percentage) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return { radius, circumference, offset };
}

export default function ClientsPage() {
  // CM2W-Sprint1: estado de vista (cards | table)
  const [viewMode, setViewMode] = useState("cards");

  // CM2W-Sprint2: selección múltiple
  const [selected, setSelected] = useState(new Set());

  // Sort by
  const [sortBy, setSortBy] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);

  // CM2W-Sprint3: toast de éxito/error
  const [toast, setToast] = useState(null);

  // Estados originales
  const [ciudad, setCiudad] = useState("");
  const [pais, setPais] = useState("");
  const [tipo, setTipo] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [clientes, setClientes] = useState(() => getClients());
  const [clientModalTab, setClientModalTab] = useState("details");
  const [form, setForm] = useState({
    nombre: "",
    serial: "",
    fechaInstalacion: "",
    ciudad: "",
    pais: "",
    tipo: "",
    contacto: { nombre: "", telefono: "", email: "" },
  });
  const [buscar, setBuscar] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [organizacion, setOrganizacion] = useState("");
  const [serial, setSerial] = useState("");
  const [serialSuggestions, setSerialSuggestions] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);

  const navigate = useNavigate();

  // CM2W-Sprint3: helper para mostrar toast
  const showToast = (type, message) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  };

  // Cargar clientes al montar
  useEffect(() => {
    setClientes(getClients());
  }, []);

  // CM2W-Sprint2: atajo Ctrl+K / "/" para enfocar la búsqueda
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey && e.key === "k") || (!e.ctrlKey && e.key === "/")) {
        const el = document.getElementById("cm2w-search-input");
        if (el) {
          e.preventDefault();
          el.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // Tab "Contacts": los campos viven anidados en form.contacto
  const handleContactoChange = (e) =>
    setForm({ ...form, contacto: { ...form.contacto, [e.target.name]: e.target.value } });

  // CM2W-Sprint3: crear cliente con validación y toast
  const handleCrear = () => {
    if (!form.nombre || !form.serial || !form.fechaInstalacion) {
      showToast("error", "Completa los campos obligatorios");
      return;
    }
    const nuevosClientes = [...clientes, form];
    setClientes(nuevosClientes);
    saveClients(nuevosClientes);
    setForm({
      nombre: "",
      serial: "",
      fechaInstalacion: "",
      ciudad: "",
      pais: "",
      tipo: "",
      contacto: { nombre: "", telefono: "", email: "" },
    });
    setClientModalTab("details");
    setShowModal(false);
    showToast("success", "Cliente creado correctamente");
  };

  const handleActualizar = () => {
    setIsUpdating(true);
    const saved = getClients();
    setClientes(saved);
    window.setTimeout(() => {
      setIsUpdating(false);
      showToast("success", "Lista actualizada");
    }, 600);
  };

  // CM2W-Sprint3: eliminar con toast
  const handleEliminarCliente = (indexReal, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Estás seguro que deseas eliminar este cliente?"))
      return;
    const actualizados = deleteClient(indexReal);
    setClientes(actualizados);
    showToast("success", "Cliente eliminado");
  };

  // CM2W-Sprint2: eliminar varios
  const handleEliminarSeleccionados = () => {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `¿Eliminar ${selected.size} cliente(s) seleccionado(s)?`
      )
    )
      return;
    const restantes = clientes.filter((_, idx) => !selected.has(idx));
    restantes.forEach((c, i) => saveClients(restantes));
    setClientes(restantes);
    setSelected(new Set());
    showToast("success", `${selected.size} cliente(s) eliminado(s)`);
  };

  // CM2W-Sprint2: exportar CSV
  const handleExportar = () => {
    const filas =
      selected.size > 0
        ? clientes.filter((_, idx) => selected.has(idx))
        : clientesFiltrados;
    const headers = [
      "Nombre",
      "Serial",
      "Fecha instalación",
      "Ciudad",
      "País",
      "Tipo",
    ];
    const csv = [
      headers.join(","),
      ...filas.map((c) =>
        [c.nombre, c.serial, c.fechaInstalacion, c.ciudad, c.pais, c.tipo]
          .map((v) => `"${(v || "").toString().replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "clientes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("success", "Exportación completada");
  };

  // CM2W-Sprint2: limpiar todos los filtros
  const limpiarFiltros = () => {
    setBuscar("");
    setSugerencias([]);
    setShowSugerencias(false);
    setOrganizacion("");
    setSerial("");
    setSerialSuggestions([]);
    setCiudad("");
    setCitySuggestions([]);
    setPais("");
    setTipo("");
  };

  // CM2W-Sprint2: remover un filtro individual desde una pill
  const removeFilter = (key) => {
    if (key === "buscar") setBuscar("");
    if (key === "organizacion") setOrganizacion("");
    if (key === "serial") setSerial("");
    if (key === "ciudad") setCiudad("");
    if (key === "pais") setPais("");
    if (key === "tipo") setTipo("");
  };

  // CM2W-Sprint1: filtros aplicados para contador
  const filtrosActivos = useMemo(() => {
    const activos = [];
    if (buscar) activos.push({ key: "buscar", label: `Búsqueda: ${buscar}` });
    if (organizacion)
      activos.push({ key: "organizacion", label: `Org: ${organizacion}` });
    if (serial) activos.push({ key: "serial", label: `Serial: ${serial}` });
    if (ciudad) activos.push({ key: "ciudad", label: `Ciudad: ${ciudad}` });
    if (pais) activos.push({ key: "pais", label: `País: ${pais}` });
    if (tipo) activos.push({ key: "tipo", label: `Tipo: ${tipo}` });
    return activos;
  }, [buscar, organizacion, serial, ciudad, pais, tipo]);

  const handleBuscar = (value) => {
    setBuscar(value);
    if (value.trim() === "") {
      setSugerencias([]);
      setShowSugerencias(false);
      return;
    }
    const resultados = clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(value.toLowerCase()) ||
        c.serial.toLowerCase().includes(value.toLowerCase())
    );
    setSugerencias(resultados);
    setShowSugerencias(true);
  };

  const handleSeleccionarSugerencia = (cliente) => {
    setBuscar(cliente.nombre);
    setSugerencias([cliente]);
    setShowSugerencias(false);
  };

  const handleSerialChange = (value) => {
    setSerial(value);
    if (value.trim() === "") {
      setSerialSuggestions([]);
      return;
    }
    const opciones = getRegisteredDeviceSerials().filter((s) =>
      s.toLowerCase().includes(value.toLowerCase())
    );
    setSerialSuggestions(opciones);
  };

  const handleSeleccionarSerial = (value) => {
    setSerial(value);
    setSerialSuggestions([]);
  };

  const handleCiudadChange = (value) => {
    setCiudad(value);
    if (value.trim() === "") {
      setCitySuggestions([]);
      return;
    }
    const opciones = Array.from(
      new Set(
        clientes
          .map((c) => c.ciudad?.trim())
          .filter(
            (city) => city && city.toLowerCase().includes(value.toLowerCase())
          )
      )
    ).slice(0, 6);
    setCitySuggestions(opciones);
  };

  const handleSeleccionarCiudad = (value) => {
    setCiudad(value);
    setCitySuggestions([]);
  };

  const clientesFiltradosBase = clientes.filter((c) => {
    const matchBuscar =
      buscar.trim() === "" ||
      c.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
      c.serial.toLowerCase().includes(buscar.toLowerCase());
    const matchOrganizacion = organizacion === "" || c.nombre === organizacion;
    const matchSerial =
      serial === "" ||
      (c.serial || "").toLowerCase().includes(serial.toLowerCase());
    const matchCiudad =
      ciudad === "" ||
      (c.ciudad || "").toLowerCase() === ciudad.toLowerCase();
    const matchPais =
      pais === "" || (c.pais || "").toLowerCase() === pais.toLowerCase();
    const matchTipo =
      tipo === "" || (c.tipo || "").toLowerCase() === tipo.toLowerCase();
    return (
      matchBuscar &&
      matchOrganizacion &&
      matchSerial &&
      matchCiudad &&
      matchPais &&
      matchTipo
    );
  });

  // Sort by aplicado sobre los filtrados
  const clientesFiltrados = [...clientesFiltradosBase].sort((a, b) => {
    if (sortBy === "nombre-asc") return a.nombre.localeCompare(b.nombre);
    if (sortBy === "nombre-desc") return b.nombre.localeCompare(a.nombre);
    if (sortBy === "ciudad") return (a.ciudad || "").localeCompare(b.ciudad || "");
    if (sortBy === "pais") return (a.pais || "").localeCompare(b.pais || "");
    return 0;
  });

  const getDispositivos = (indexReal) => getDeviceCounts(indexReal);

  // CM2W-Sprint2: toggle selección individual
  const toggleSelect = (indexReal) => {
    const next = new Set(selected);
    if (next.has(indexReal)) next.delete(indexReal);
    else next.add(indexReal);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (
      selected.size === clientesFiltrados.length &&
      clientesFiltrados.length > 0
    ) {
      setSelected(new Set());
    } else {
      const all = new Set(
        clientesFiltrados.map((c) => clientes.indexOf(c))
      );
      setSelected(all);
    }
  };

  // CM2W-Sprint2: indicador online
  const isOnline = (indexReal) => {
    const { activos } = getDispositivos(indexReal);
    return activos > 0;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title" onClick={() => navigate("/")}>
          <MdArrowBack size={26} />
          <h2>Buscar Clientes</h2>
        </div>
      </div>

      {/* CM2W-Sprint1: Toolbar horizontal */}
      <div className="cm2w-toolbar">
        <button
          className={`cm2w-btn ${isUpdating ? "updating" : ""}`}
          onClick={handleActualizar}
          disabled={isUpdating}
        >
          <MdRefresh size={18} />
          <span>{isUpdating ? "Cargando..." : "Actualizar"}</span>
        </button>
        <button
          className="cm2w-btn"
          onClick={() => setShowFilters((prev) => !prev)}
        >
          <MdFilterList size={18} />
          <span>{showFilters ? "Ocultar filtros" : "Mostrar filtros"}</span>
        </button>
        <button className="cm2w-btn" onClick={() => setShowModal(true)}>
          <MdAdd size={18} />
          <span>Crear</span>
        </button>
        <button className="cm2w-btn" onClick={handleExportar}>
          <MdFileDownload size={18} />
          <span>Exportar</span>
        </button>

        {/* Sort by */}
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <button className="cm2w-btn" onClick={() => setShowSortMenu((v) => !v)}>
            <MdFilterList size={18} />
            <span>Sort by{sortBy ? ` · ${sortBy.replace("-asc"," ↑").replace("-desc"," ↓")}` : ""}</span>
          </button>
          {showSortMenu && (
            <div style={{
              position:"absolute", top:"110%", right:0, zIndex:50,
              background:"#fff", border:"1px solid #e2e8f0", borderRadius:8,
              boxShadow:"0 8px 24px rgba(0,0,0,0.12)", minWidth:200, overflow:"hidden"
            }}>
              {[
                { value:"", label:"Sin orden" },
                { value:"nombre-asc", label:"Nombre A → Z" },
                { value:"nombre-desc", label:"Nombre Z → A" },
                { value:"ciudad", label:"Ciudad" },
                { value:"pais", label:"País" },
              ].map((opt) => (
                <div key={opt.value}
                  onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                  style={{
                    padding:"10px 16px", fontSize:13, cursor:"pointer",
                    fontWeight: sortBy === opt.value ? 700 : 500,
                    color: sortBy === opt.value ? "#2563eb" : "#1e293b",
                    background: sortBy === opt.value ? "#eff6ff" : "transparent",
                  }}
                >{opt.label}</div>
              ))}
            </div>
          )}
        </div>

        {/* CM2W-Sprint1: Toggle tarjetas/tabla */}
        <div className="cm2w-view-toggle">
          <button
            className={viewMode === "cards" ? "active" : ""}
            onClick={() => setViewMode("cards")}
            aria-label="Vista tarjetas"
            title="Vista tarjetas"
          >
            <MdGridView size={18} />
          </button>
          <button
            className={viewMode === "table" ? "active" : ""}
            onClick={() => setViewMode("table")}
            aria-label="Vista tabla"
            title="Vista tabla"
          >
            <MdTableRows size={18} />
          </button>
        </div>
      </div>

      <div className="content-area">
        {/* CM2W-Sprint1: Contador de resultados */}
        <div className="cm2w-results-count">
          Mostrando <strong>{clientesFiltrados.length}</strong> de{" "}
          <strong>{clientes.length}</strong> clientes
        </div>

        {/* CM2W-Sprint2: Pills de filtros activos */}
        {filtrosActivos.length > 0 && (
          <div className="cm2w-filter-pills">
            {filtrosActivos.map((f) => (
              <span key={f.key} className="filter-pill">
                {f.label}
                <button
                  className="filter-pill-remove"
                  onClick={() => removeFilter(f.key)}
                  aria-label={`Quitar filtro ${f.label}`}
                >
                  <MdClose size={14} />
                </button>
              </span>
            ))}
            <button
              className="cm2w-clear-filters"
              onClick={limpiarFiltros}
            >
              <MdFilterAltOff size={14} />
              <span>Limpiar filtros</span>
            </button>
          </div>
        )}

        {/* Filter bar */}
        {showFilters && (
          <div className="filter-bar">
            <div className="buscar-wrapper">
              <div className="filter-search-btn">
                <MdSearch size={18} />
                <input
                  id="cm2w-search-input"
                  type="text"
                  placeholder="Buscar... (Ctrl+K)"
                  value={buscar}
                  onChange={(e) => handleBuscar(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: "14px",
                    color: "#333",
                    minWidth: 120,
                  }}
                />
                {buscar && (
                  <button
                    className="filter-clear-input"
                    onClick={() => handleBuscar("")}
                    aria-label="Limpiar búsqueda"
                  >
                    <MdClear size={16} />
                  </button>
                )}
              </div>
              {showSugerencias && sugerencias.length > 0 && (
                <div className="sugerencias-dropdown">
                  {sugerencias.map((s, i) => (
                    <div
                      key={i}
                      className="sugerencia-item"
                      onClick={() => handleSeleccionarSugerencia(s)}
                    >
                      <strong>{s.nombre}</strong>
                      <span>{s.serial}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="filter-panel">
              <select
                className="filter-select"
                value={organizacion}
                onChange={(e) => setOrganizacion(e.target.value)}
              >
                <option value="">Organización</option>
                {clientes.map(
                  (c, i) =>
                    c.nombre && (
                      <option key={i} value={c.nombre}>
                        {c.nombre}
                      </option>
                    )
                )}
              </select>

              <input
                className="filter-select filter-fixed"
                type="text"
                value={APP_TYPE}
                disabled
                aria-label="Tipo aplicación"
              />

              {/* CM2W-Sprint1: filtro tipo */}
              <select
                className="filter-select"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                <option value="">Tipo</option>
                <option value="empresa">Empresa</option>
                <option value="persona">Persona</option>
              </select>

              <div className="serial-wrapper">
                <input
                  className="filter-input"
                  type="text"
                  placeholder="Número de serie"
                  value={serial}
                  onChange={(e) => handleSerialChange(e.target.value)}
                />
                {serialSuggestions.length > 0 && (
                  <div className="serial-suggestions-dropdown">
                    {serialSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        className="sugerencia-item"
                        onClick={() => handleSeleccionarSerial(item)}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <select
                className="filter-select"
                value={pais}
                onChange={(e) => setPais(e.target.value)}
              >
                <option value="">País</option>
                <option value="colombia">Colombia</option>
                <option value="mexico">México</option>
                <option value="peru">Perú</option>
                <option value="chile">Chile</option>
                <option value="espana">España</option>
              </select>

              <div className="city-autocomplete">
                <input
                  className="filter-input"
                  type="text"
                  placeholder="Ciudad"
                  value={ciudad}
                  onChange={(e) => handleCiudadChange(e.target.value)}
                />
                {citySuggestions.length > 0 && (
                  <div className="city-suggestions-dropdown">
                    {citySuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        className="sugerencia-item"
                        onClick={() => handleSeleccionarCiudad(item)}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CM2W-Sprint3: Skeleton loader al actualizar */}
        {isUpdating ? (
          <div className="clients-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="client-card cm2w-skeleton">
                <div className="cm2w-skeleton-block sm" />
                <div className="cm2w-skeleton-block md" />
                <div className="cm2w-skeleton-block sm" />
                <div className="cm2w-skeleton-block sm" />
              </div>
            ))}
          </div>
        ) : clientesFiltrados.length === 0 ? (
          /* CM2W-Sprint3: Estado vacío ilustrado */
          <div className="cm2w-empty-state">
            <MdSearchOff size={64} />
            <h3>No se encontraron clientes</h3>
            <p>
              {clientes.length === 0
                ? "Aún no tienes clientes registrados."
                : "Intenta ajustar los filtros o crear un nuevo cliente."}
            </p>
            <button
              className="cm2w-btn primary"
              onClick={() => setShowModal(true)}
            >
              <MdAdd size={18} />
              <span>Crear nuevo cliente</span>
            </button>
          </div>
        ) : viewMode === "cards" ? (
          /* Vista tarjetas */
          <div className="clients-list">
            {clientesFiltrados.map((cliente) => {
              const indexReal = clientes.indexOf(cliente);
              const { total, activos } = getDispositivos(indexReal);
              const pct = total > 0 ? Math.round((activos / total) * 100) : 0;
              const { radius, circumference, offset } = buildDeviceRing(pct);
              const online = isOnline(indexReal);
              const isSelected = selected.has(indexReal);
              return (
                <div
                  className={`client-card ${isSelected ? "is-selected" : ""}`}
                  key={indexReal}
                  onClick={() => navigate(`/clientes/${indexReal}`)}

                >
                  
                  {/* CM2W-Sprint2: semáforo online */}
                  <div
                    className={`cm2w-status-dot ${online ? "online" : "offline"}`}
                    title={online ? "En línea" : "Sin dispositivos activos"}
                  />

                  <div className="client-left">
                    <strong className="client-name">{cliente.nombre}</strong>
                    <div className="client-icon-row">
                      <MdLocationOn size={12} />
                      <span>
                        {cliente.ciudad
                          ? `${cliente.pais || ""}, ${cliente.ciudad}`
                          : "Sin ubicación"}
                      </span>
                    </div>
                    <div className="client-icon-row">
                      <MdApartment size={12} />
                      <span>Deterquin SAS</span>
                    </div>
                  </div>

                  <div className="client-section">
                    <span className="client-section-title">
                      Activo / Dispositivos
                    </span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#2563eb",
                        }}
                      >
                        {activos}
                        <span style={{ color: "#94a3b8", fontSize: 12 }}>
                          /{total}
                        </span>
                      </div>
                      <svg width="34" height="34" viewBox="0 0 44 44">
                        <circle
                          cx="22"
                          cy="22"
                          r={radius}
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="4"
                        />
                        <circle
                          cx="22"
                          cy="22"
                          r={radius}
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="4"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          transform="rotate(-90 22 22)"
                        />
                        <text
                          x="22"
                          y="27"
                          textAnchor="middle"
                          fontSize="10"
                          fill="#2563eb"
                          fontWeight="700"
                        >
                          {pct}%
                        </text>
                      </svg>
                    </div>
                  </div>

                  <div className="client-section">
                    <span className="client-section-title">
                      Notificaciones del dispositivo
                    </span>
                    <span className="client-no-notif">✓ Sin notificaciones</span>
                  </div>

                  <div className="client-section">
                    <span className="client-section-title">Product statuses</span>
                    <span className="client-no-suscrito">NO estás suscrito</span>
                  </div>

                  <div
                    className="client-icons-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      className="client-icon-btn"
                      onClick={() =>
                        navigate(`/clientes/${indexReal}`, {
                          state: { tab: "productos" },
                        })
                      }
                    >
                      <MdScience size={14} />
                      <span>Productos</span>
                    </div>
                    <div
                      className="client-icon-btn"
                      onClick={() =>
                        navigate(`/clientes/${indexReal}`, {
                          state: { openInformes: true },
                        })
                      }
                    >
                      <MdDescription size={14} />
                      <span>Informes</span>
                    </div>
                    <div
                      className="client-icon-btn"
                      onClick={(e) => handleEliminarCliente(indexReal, e)}
                    >
                      <MdDelete size={14} color="#ef4444" />
                      <span style={{ color: "#ef4444" }}>Borrar</span>
                    </div>
                    <div
                      className="client-icon-btn"
                      onClick={() => navigate(`/clientes/${indexReal}`)}
                    >
                      <MdSearch size={14} />
                      <span>Ver</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* CM2W-Sprint1: Vista tabla */
          <div className="cm2w-table-wrapper">
            <table className="cm2w-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <div onClick={toggleSelectAll}>
                      {selected.size === clientesFiltrados.length &&
                      clientesFiltrados.length > 0 ? (
                        <MdCheckBox size={20} color="#2563eb" />
                      ) : (
                        <MdCheckBoxOutlineBlank size={20} color="#94a3b8" />
                      )}
                    </div>
                  </th>
                  <th>Estado</th>
                  <th>Nombre</th>
                  <th>Serial</th>
                  <th>Ciudad</th>
                  <th>País</th>
                  <th>Tipo</th>
                  <th>Dispositivos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente) => {
                  const indexReal = clientes.indexOf(cliente);
                  const { total, activos } = getDispositivos(indexReal);
                  const online = isOnline(indexReal);
                  const isSelected = selected.has(indexReal);
                  return (
                    <tr
                      key={indexReal}
                      className={isSelected ? "is-selected" : ""}
                      onClick={() => navigate(`/clientes/${indexReal}`)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <div onClick={() => toggleSelect(indexReal)}>
                          {isSelected ? (
                            <MdCheckBox size={20} color="#2563eb" />
                          ) : (
                            <MdCheckBoxOutlineBlank
                              size={20}
                              color="#94a3b8"
                            />
                          )}
                        </div>
                      </td>
                      <td>
                        <div
                          className={`cm2w-status-dot ${
                            online ? "online" : "offline"
                          }`}
                        />
                      </td>
                      <td>
                        <strong>{cliente.nombre}</strong>
                      </td>
                      <td>{cliente.serial}</td>
                      <td>{cliente.ciudad || "—"}</td>
                      <td>{cliente.pais || "—"}</td>
                      <td>{cliente.tipo || "—"}</td>
                      <td>
                        <span className="cm2w-device-pill">
                          {activos}/{total}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="cm2w-row-actions">
                          <button
                            className="cm2w-row-btn"
                            onClick={() => navigate(`/clientes/${indexReal}`)}
                            title="Ver"
                          >
                            <MdDescription size={16} />
                          </button>
                          <button
                            className="cm2w-row-btn danger"
                            onClick={(e) =>
                              handleEliminarCliente(indexReal, e)
                            }
                            title="Eliminar"
                          >
                            <MdDelete size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CM2W-Sprint2: Toolbar flotante de selección múltiple */}
      {selected.size > 0 && (
        <div className="cm2w-floating-bar">
          <span>
            <strong>{selected.size}</strong> seleccionado(s)
          </span>
          <button
            className="cm2w-btn danger"
            onClick={handleEliminarSeleccionados}
          >
            <MdDelete size={16} />
            <span>Eliminar</span>
          </button>
          <button className="cm2w-btn" onClick={handleExportar}>
            <MdFileDownload size={16} />
            <span>Exportar</span>
          </button>
          <button
            className="cm2w-btn ghost"
            onClick={() => setSelected(new Set())}
          >
            <MdClose size={16} />
            <span>Cancelar</span>
          </button>
        </div>
      )}

      {/* Modal crear cliente */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Crear Cliente</h3>
              <MdClose
                size={22}
                className="modal-close"
                onClick={() => setShowModal(false)}
              />
            </div>

            {/* Tabs Details / Contacts — referencia CM2W (Crear Clientes) */}
            <div className="modal-tabs">
              <button
                type="button"
                className={`modal-tab ${clientModalTab === "details" ? "active" : ""}`}
                onClick={() => setClientModalTab("details")}
              >
                Details
              </button>
              <button
                type="button"
                className={`modal-tab ${clientModalTab === "contacts" ? "active" : ""}`}
                onClick={() => setClientModalTab("contacts")}
              >
                Contacts
              </button>
            </div>

            {clientModalTab === "details" ? (
              <>
                <label>Nombre del lugar *</label>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Cafam Melgar"
                />
                <label>Serial del equipo *</label>
                <input
                  name="serial"
                  value={form.serial}
                  onChange={handleChange}
                  placeholder="Ej: DQ-001234"
                />
                <label>Fecha de instalación *</label>
                <input
                  name="fechaInstalacion"
                  type="date"
                  value={form.fechaInstalacion}
                  onChange={handleChange}
                />
                <label>Ciudad</label>
                <input
                  name="ciudad"
                  value={form.ciudad}
                  onChange={handleChange}
                  placeholder="Ej: Bogotá"
                />
                <label>País</label>
                <input
                  name="pais"
                  value={form.pais}
                  onChange={handleChange}
                  placeholder="Ej: Colombia"
                />
                <label>Tipo</label>
                <select
                  name="tipo"
                  value={form.tipo}
                  onChange={handleChange}
                  className="modal-select"
                >
                  <option value="">Seleccionar tipo</option>
                  <option value="empresa">Empresa</option>
                  <option value="persona">Persona</option>
                </select>
              </>
            ) : (
              <>
                <label>Nombre del contacto</label>
                <input
                  name="nombre"
                  value={form.contacto?.nombre || ""}
                  onChange={handleContactoChange}
                  placeholder="Ej: Juan Pérez"
                />
                <label>Teléfono</label>
                <input
                  name="telefono"
                  value={form.contacto?.telefono || ""}
                  onChange={handleContactoChange}
                  placeholder="Ej: +57 300 1234567"
                />
                <label>Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.contacto?.email || ""}
                  onChange={handleContactoChange}
                  placeholder="Ej: contacto@cliente.com"
                />
              </>
            )}

            <button className="modal-btn" onClick={handleCrear}>
              Crear
            </button>
          </div>
        </div>
      )}

      {/* CM2W-Sprint3: Toast de éxito/error */}
      {toast && (
        <div className={`cm2w-toast ${toast.type}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}
