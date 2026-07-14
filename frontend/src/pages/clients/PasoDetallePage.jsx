// Vista de detalle de un Paso — ruta /dispositivos/:deviceId/programas/:programaId/pasos/:pasoId
// Replica las imágenes 3/5/6: header, campos del paso, señales, tabla de
// productos químicos, e integración con ProductoQuimicoModal.
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MdArrowBack, MdRefresh, MdCheck, MdClose, MdMoreVert,
  MdAdd, MdInfo, MdLocationOn, MdApartment,
  MdSignalWifi4Bar, MdSignalWifiOff, MdDashboard, MdFlashOn,
  MdDescription, MdDevices,
} from "react-icons/md";
import {
  findDeviceById, getProgramsForDevice, saveProgramsForDevice,
  getCalibracionConfig, getProductsForClient,
} from "../../services/localMock";
import { SignalBadges, SENALES } from "./ProgramasPage";
import ProductoQuimicoModal from "./ProductoQuimicoModal";
import DropdownMenu from "../../components/ui/DropdownMenu";
import "./ClientsDetail.css";
import "./ProgramasPage.css";

function PasoDetallePage() {
  const { deviceId, programaId, pasoId } = useParams();
  const navigate = useNavigate();
  const match = findDeviceById(deviceId);

  const [programas, setProgramas] = useState(() => getProgramsForDevice(deviceId));
  const [showOpciones, setShowOpciones] = useState(false);
  const [productoModal, setProductoModal] = useState({ open: false, producto: null });

  const programa = programas.find((p) => String(p.id) === String(programaId));
  const pasoIndex = programa
    ? programa.pasos.findIndex((p) => String(p.id) === String(pasoId))
    : -1;
  const pasoOriginal = pasoIndex >= 0 ? programa.pasos[pasoIndex] : null;

  // Enhanced defaults for paso fields
  const defaultPaso = {
    nombre: "",
    ozoneDosing: 0,
    activoOn: true,
    risingEdge: true,
    fallingEdge: false,
    opcional: false,
    senalesPaso: [],
    dosisDirecta: false,
    temperatureMonitoring: false,
    productos: [],
    senal: 1,
    cantidadMl: "",
    precioPorKg: "",
  };

  const [form, setForm] = useState(() => {
    if (!pasoOriginal) return defaultPaso;
    return { ...defaultPaso, ...pasoOriginal };
  });

  if (!match) {
    return (
      <div className="cd-not-found">
        <p>Dispositivo no encontrado.</p>
        <button onClick={() => navigate("/dispositivos")}>Volver</button>
      </div>
    );
  }

  if (!programa) {
    return (
      <div className="cd-not-found">
        <p>Programa no encontrado.</p>
        <button onClick={() => navigate(`/dispositivos/${deviceId}/programas`)}>
          Volver a Programas
        </button>
      </div>
    );
  }

  if (!pasoOriginal) {
    return (
      <div className="cd-not-found">
        <p>Paso no encontrado.</p>
        <button
          onClick={() =>
            navigate(`/dispositivos/${deviceId}/programas/${programaId}`)
          }
        >
          Volver al Programa
        </button>
      </div>
    );
  }

  const { device, clienteNombre, clienteIndex } = match;
  const calibracion = getCalibracionConfig(deviceId);
  const productosCliente = getProductsForClient(clienteIndex);

  // Build productos catalog for the modal, mapping client products with ratio
  const productosCatalog = productosCliente.map((p) => ({
    id: p.id,
    nombre: `Bomba ${p.id} ${p.nombre}`,
    ratio: p.ratio ?? 1.0,
  }));

  const handleChange = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    handleChange(name, type === "checkbox" ? checked : value);
  };

  const toggleSenalPaso = (n) => {
    setForm((f) => ({
      ...f,
      senalesPaso: f.senalesPaso.includes(n)
        ? f.senalesPaso.filter((s) => s !== n)
        : [...f.senalesPaso, n],
    }));
  };

  const toggleDosisDirecta = () => {
    setForm((f) => ({ ...f, dosisDirecta: !f.dosisDirecta }));
  };

  const guardar = () => {
    // Save the paso back into the programa's pasos array
    const updatedPasos = programa.pasos.map((p) =>
      String(p.id) === String(pasoId) ? { ...p, ...form } : p
    );
    const updatedPrograma = { ...programa, pasos: updatedPasos };
    const updatedProgramas = programas.map((p) =>
      String(p.id) === String(programaId) ? updatedPrograma : p
    );
    saveProgramsForDevice(deviceId, updatedProgramas);
    setProgramas(updatedProgramas);
  };

  const refresh = () => {
    const fresh = getProgramsForDevice(deviceId);
    setProgramas(fresh);
    const prog = fresh.find((p) => String(p.id) === String(programaId));
    if (prog) {
      const paso = prog.pasos.find((p) => String(p.id) === String(pasoId));
      if (paso) setForm({ ...defaultPaso, ...paso });
    }
  };

  // ProductoQuimicoModal handlers
  const handleSaveProducto = (producto) => {
    const productos = form.productos || [];
    const exists = productos.some((p) => p.id === producto.id);
    const updated = exists
      ? productos.map((p) => (p.id === producto.id ? producto : p))
      : [...productos, producto];
    handleChange("productos", updated);
    setProductoModal({ open: false, producto: null });
  };

  const handleDeleteProducto = () => {
    if (!productoModal.producto) return;
    const updated = (form.productos || []).filter(
      (p) => p.id !== productoModal.producto.id
    );
    handleChange("productos", updated);
    setProductoModal({ open: false, producto: null });
  };

  const productos = form.productos || [];

  return (
    <div className="cd-container">
      {/* Header */}
      <div className="cd-header">
        <button
          className="cd-back-btn"
          onClick={() =>
            navigate(`/dispositivos/${deviceId}/programas/${programaId}`)
          }
        >
          <MdArrowBack size={20} />
          <span>
            {programa.nombre} {form.nombre || `Paso ${pasoIndex + 1}`}
          </span>
        </button>
        <div className="cd-header-title">
          {programa.nombre} {form.nombre || `Paso ${pasoIndex + 1}`}
        </div>
        <div className="cd-header-actions">
          <button className="cd-header-btn" onClick={refresh}>
            <MdRefresh size={18} /><span>Actualizar</span>
          </button>
          <button className="cd-header-btn" onClick={guardar}>
            <MdCheck size={18} /><span>Guardar</span>
          </button>
          <button
            className="cd-header-btn"
            onClick={() =>
              navigate(`/dispositivos/${deviceId}/programas/${programaId}`)
            }
          >
            <MdClose size={18} /><span>Cancelar</span>
          </button>
          <div style={{ position: "relative" }}>
            <button
              className="cd-header-btn"
              onClick={() => setShowOpciones((v) => !v)}
            >
              <MdMoreVert size={18} /><span>Opciones</span>
            </button>
            {showOpciones && (
              <DropdownMenu
                onClose={() => setShowOpciones(false)}
                options={[
                  {
                    label: "Dispositivo",
                    icon: MdDevices,
                    action: () => navigate(`/dispositivos/${deviceId}`),
                  },
                  {
                    label: "Dashboard",
                    icon: MdDashboard,
                    action: () =>
                      navigate("/dashboard/dispositivo", {
                        state: { deviceId: device.id },
                      }),
                  },
                  {
                    label: "Informes",
                    icon: MdDescription,
                    action: () =>
                      navigate("/informes/detallado", {
                        state: {
                          clientFilter: clienteNombre,
                          deviceFilter: device.nombre,
                        },
                      }),
                  },
                ]}
              />
            )}
          </div>
        </div>
      </div>

      <div className="cd-body">
        {/* Device info card */}
        <section className="pd-info-card">
          <div className="pd-info-left">
            <div className="pd-info-badge-row">
              <span className="pd-info-client-badge">{clienteNombre}</span>
              <span className="pd-info-serial-badge">
                {device.serial || "—"} D
              </span>
            </div>
            <div className="pd-info-sub">
              <MdLocationOn size={12} /> {clienteNombre}{" "}
              <MdApartment size={12} /> DETERQUIN SAS
            </div>
          </div>
          <div className="pd-info-mid">
            <span className="pd-info-version-badge">Multi-system v14.2</span>
          </div>
          <div className="pd-info-right">
            <div className="pd-info-status">
              {device.estado === "activo" ? (
                <>
                  <MdSignalWifi4Bar size={12} color="#10b981" /> Activo
                </>
              ) : (
                <>
                  <MdSignalWifiOff size={12} color="#94a3b8" /> Inactivo
                </>
              )}
            </div>
            <div className="pd-info-notif">✓ No notifications</div>
          </div>
        </section>

        {/* Step detail section */}
        <section className="cd-section">
          <div className="paso-top-grid">
            {/* Left: Nombre + Ozone dosing */}
            <div className="paso-fields-left">
              <div className="pd-field">
                <label>Nombre</label>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleInputChange}
                  placeholder="Nombre del paso"
                />
              </div>
              <div className="pd-field">
                <label>Ozone dosing, s</label>
                <input
                  name="ozoneDosing"
                  type="number"
                  min="0"
                  value={form.ozoneDosing}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Right: Activo On panel */}
            <div className="paso-activo-panel">
              <div className="paso-activo-title">Activo On</div>
              <div className="paso-toggle-row">
                <span>Rising edge ⓘ</span>
                <div
                  className={`paso-toggle ${form.risingEdge ? "on" : ""}`}
                  onClick={() => handleChange("risingEdge", !form.risingEdge)}
                >
                  <div className="paso-toggle-track">
                    <div className="paso-toggle-thumb" />
                  </div>
                </div>
              </div>
              <div className="paso-toggle-row">
                <span>Falling edge ⓘ</span>
                <div
                  className={`paso-toggle ${form.fallingEdge ? "on" : ""}`}
                  onClick={() => handleChange("fallingEdge", !form.fallingEdge)}
                >
                  <div className="paso-toggle-track">
                    <div className="paso-toggle-thumb" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Opcional */}
          <div className="pd-checkbox-row" style={{ marginTop: 12 }}>
            <input
              type="checkbox"
              id="paso-opcional"
              name="opcional"
              checked={form.opcional}
              onChange={handleInputChange}
            />
            <label htmlFor="paso-opcional">Opcional</label>
          </div>

          {/* Empezar paso con señal */}
          <div className="paso-signal-section">
            <label>Empezar paso con señal ⓘ</label>
            <SignalBadges
              selected={form.senalesPaso}
              onToggle={toggleSenalPaso}
              showDosisDirecta
              dosisDirecta={form.dosisDirecta}
              onToggleDosis={toggleDosisDirecta}
            />
          </div>

          {/* Temperature monitoring */}
          <div className="paso-temp-section">
            <label>Temperature monitoring</label>
            <span className="paso-badge-disabled">Deshabilitado</span>
          </div>
        </section>

        {/* Productos químicos section */}
        <section className="cd-section">
          <div className="paso-productos-header">
            <h4>Productos químicos</h4>
            <div className="paso-productos-actions">
              <button
                className="cd-add-btn"
                onClick={() =>
                  setProductoModal({ open: true, producto: null })
                }
              >
                <MdAdd size={14} /> Añadir Productos químicos
              </button>
              <button className="cd-icon-btn" title="Reorganizar">
                Reorganizar
              </button>
            </div>
          </div>

          <div className="prog-table-wrap">
            <table className="prog-table">
              <thead>
                <tr>
                  <th>Señal saliente</th>
                  <th>Dosing delay</th>
                  <th>Quantity per 1 kg</th>
                  <th>Price per 1 kg</th>
                  <th>Prioridad alta</th>
                  <th>Dosing temperature, °C</th>
                  <th>Temperature dosing timeout, s</th>
                  <th>Información detallada</th>
                </tr>
              </thead>
              <tbody>
                {productos.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "#94a3b8", padding: 20 }}>
                      Sin productos químicos configurados. Haz clic en "+ Añadir" para agregar uno.
                    </td>
                  </tr>
                ) : (
                  productos.map((prod) => {
                    const senalLabel = prod.grupoDosificacion
                      ? `${prod.grupoDosificacion} ${prod.productoNombre || ""}`
                      : prod.productoNombre || `Señal ${prod.senal || 1}`;
                    return (
                      <tr key={prod.id}>
                        <td>{senalLabel}</td>
                        <td>{prod.dosingDelay || 0} s</td>
                        <td>
                          {Number(prod.cantidadMlPorKg || 0).toFixed(2)} ml /{" "}
                          {Number(prod.cantidadGrPorKg || 0).toFixed(2)} gr
                        </td>
                        <td>{Number(prod.precioPorKg || 0).toFixed(2)} EUR</td>
                        <td>
                          {prod.prioridadAlta ? (
                            <MdCheck className="prog-badge-check" />
                          ) : (
                            ""
                          )}
                        </td>
                        <td>
                          {prod.temperatureDosing
                            ? `${prod.dosingTemperature || 0}`
                            : "Deshabilitado"}
                        </td>
                        <td>{prod.temperatureDosingTimeout || 0}</td>
                        <td style={{ textAlign: "center" }}>
                          <MdInfo
                            size={18}
                            color="#2563eb"
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              setProductoModal({ open: true, producto: prod })
                            }
                            title="Ver / editar producto químico"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ProductoQuimicoModal */}
      <ProductoQuimicoModal
        open={productoModal.open}
        onClose={() => setProductoModal({ open: false, producto: null })}
        onSave={handleSaveProducto}
        onDelete={productoModal.producto ? handleDeleteProducto : undefined}
        initialProducto={productoModal.producto}
        senalesDisponibles={SENALES}
        grupos={calibracion.grupos || []}
        productos={productosCatalog}
        lavadoras={(calibracion.lavadoras || []).map((l) => ({
          ...l,
          capacidadKg: l.capacidadKg || 90,
        }))}
      />
    </div>
  );
}

export default PasoDetallePage;
