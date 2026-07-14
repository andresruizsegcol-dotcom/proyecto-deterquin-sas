// Vista de detalle de un Programa — ruta /dispositivos/:deviceId/programas/:programaId
// Muestra la configuración completa del programa (Main settings / Energy consumption)
// y la tabla de pasos con navegación al detalle de cada paso.
import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MdArrowBack, MdRefresh, MdCheck, MdClose, MdMoreVert,
  MdAdd, MdInfo, MdLocationOn, MdApartment,
  MdSignalWifi4Bar, MdSignalWifiOff, MdSettings, MdDelete,
} from "react-icons/md";
import {
  findDeviceById, getProgramsForDevice, saveProgramsForDevice,
  getCalibracionConfig,
} from "../../services/localMock";
import { SignalBadges, SENALES } from "./ProgramasPage";
import DropdownMenu from "../../components/ui/DropdownMenu";
import "./ClientsDetail.css";
import "./ProgramasPage.css";

const DEFAULT_DOSING_MODES = ["Set by %", "Set by ml", "Set by gr"];

function ProgramaDetallePage() {
  const { deviceId, programaId } = useParams();
  const navigate = useNavigate();
  const match = findDeviceById(deviceId);

  const [programas, setProgramas] = useState(() => getProgramsForDevice(deviceId));
  const [activeTab, setActiveTab] = useState("main");
  const [showOpciones, setShowOpciones] = useState(false);
  const [dirty, setDirty] = useState(false);

  const programa = programas.find((p) => String(p.id) === String(programaId));

  const [form, setForm] = useState(() => {
    if (!programa) return {};
    return {
      nombre: programa.nombre || "",
      numero: programa.numero || "",
      categoria: programa.categoria || "",
      lavadoras: programa.lavadoras || "",
      inicioManual: programa.inicioManual || false,
      arranqueAutomatico: programa.arranqueAutomatico || false,
      duracionMin: programa.duracionMin ?? "",
      duracionMax: programa.duracionMax ?? "",
      senales: programa.senales || [],
      cuentaCiclos: programa.cuentaCiclos || "",
      precioPorKg: programa.precioPorKg || "",
      pasos: programa.pasos || [],
      defaultDosingMode: programa.defaultDosingMode || "Set by %",
      defaultWeightCapacity: programa.defaultWeightCapacity || "",
      defaultProductDosage: programa.defaultProductDosage || "",
      fullWashingCycleTime: programa.fullWashingCycleTime || "",
      tiempoMaxEjecucion: programa.tiempoMaxEjecucion || "",
      terminarDespuesDe: programa.terminarDespuesDe || "",
    };
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

  const { device, clienteNombre } = match;
  const calibracion = getCalibracionConfig(deviceId);
  const lavadorasList = (form.lavadoras || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const handleChange = (name, value) => {
    setDirty(true);
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    handleChange(name, type === "checkbox" ? checked : value);
  };

  const toggleSenal = (n) => {
    setDirty(true);
    setForm((f) => ({
      ...f,
      senales: f.senales.includes(n)
        ? f.senales.filter((s) => s !== n)
        : [...f.senales, n],
    }));
  };

  const guardar = () => {
    const updated = { ...programa, ...form };
    const actualizados = programas.map((p) =>
      String(p.id) === String(programaId) ? updated : p
    );
    saveProgramsForDevice(deviceId, actualizados);
    setProgramas(actualizados);
    setDirty(false);
  };

  const refresh = () => {
    const fresh = getProgramsForDevice(deviceId);
    setProgramas(fresh);
    const prog = fresh.find((p) => String(p.id) === String(programaId));
    if (prog) {
      setForm({
        nombre: prog.nombre || "",
        numero: prog.numero || "",
        categoria: prog.categoria || "",
        lavadoras: prog.lavadoras || "",
        inicioManual: prog.inicioManual || false,
        arranqueAutomatico: prog.arranqueAutomatico || false,
        duracionMin: prog.duracionMin ?? "",
        duracionMax: prog.duracionMax ?? "",
        senales: prog.senales || [],
        cuentaCiclos: prog.cuentaCiclos || "",
        precioPorKg: prog.precioPorKg || "",
        pasos: prog.pasos || [],
        defaultDosingMode: prog.defaultDosingMode || "Set by %",
        defaultWeightCapacity: prog.defaultWeightCapacity || "",
        defaultProductDosage: prog.defaultProductDosage || "",
        fullWashingCycleTime: prog.fullWashingCycleTime || "",
        tiempoMaxEjecucion: prog.tiempoMaxEjecucion || "",
        terminarDespuesDe: prog.terminarDespuesDe || "",
      });
      setDirty(false);
    }
  };

  const addPaso = () => {
    const newPaso = {
      id: Date.now(),
      nombre: `Paso ${form.pasos.length + 1}`,
      senal: 1,
      cantidadMl: "",
      precioPorKg: "",
      ozoneDosing: 0,
      activoOn: true,
      risingEdge: true,
      fallingEdge: false,
      opcional: false,
      senalesPaso: [],
      dosisDirecta: false,
      temperatureMonitoring: false,
      productos: [],
    };
    handleChange("pasos", [...form.pasos, newPaso]);
  };

  const deletePaso = (pasoId) => {
    if (!window.confirm("¿Eliminar este paso?")) return;
    handleChange(
      "pasos",
      form.pasos.filter((p) => p.id !== pasoId)
    );
  };

  // Calculate totals for the steps table
  const totalQty = form.pasos.reduce((sum, p) => {
    const productos = p.productos || [];
    return sum + productos.reduce((s, pr) => s + (Number(pr.cantidadMlPorKg) || 0), 0);
  }, 0);
  const totalPrice = form.pasos.reduce((sum, p) => {
    const productos = p.productos || [];
    return sum + productos.reduce((s, pr) => s + (Number(pr.precioPorKg) || 0), 0);
  }, 0);

  return (
    <div className="cd-container">
      {/* Header */}
      <div className="cd-header">
        <button
          className="cd-back-btn"
          onClick={() => navigate(`/dispositivos/${deviceId}/programas`)}
        >
          <MdArrowBack size={20} />
          <span>{form.nombre || "Programa"}</span>
        </button>
        <div className="cd-header-title">{form.nombre}</div>
        <div className="cd-header-actions">
          <button className="cd-header-btn" onClick={refresh}>
            <MdRefresh size={18} /><span>Actualizar</span>
          </button>
          <button className="cd-header-btn" onClick={guardar}>
            <MdCheck size={18} /><span>Guardar</span>
          </button>
          <button
            className="cd-header-btn"
            onClick={() => navigate(`/dispositivos/${deviceId}/programas`)}
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
                    action: () => navigate(`/dispositivos/${deviceId}`),
                  },
                  {
                    label: "Informes",
                    action: () =>
                      navigate("/informes/detallado", {
                        state: { clientFilter: clienteNombre, deviceFilter: device.nombre },
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

        {/* Tabs */}
        <div className="cd-tabs">
          <div
            className={`cd-tab ${activeTab === "main" ? "cd-tab-active" : ""}`}
            onClick={() => setActiveTab("main")}
          >
            Main settings
          </div>
          <div
            className={`cd-tab ${activeTab === "energy" ? "cd-tab-active" : ""}`}
            onClick={() => setActiveTab("energy")}
          >
            Energy consumption
          </div>
        </div>

        {/* Main settings */}
        {activeTab === "main" && (
          <section className="cd-section">
            <div className="pd-settings-grid">
              {/* Left column */}
              <div className="pd-settings-left">
                <div className="pd-field">
                  <label>Nombre Programa ⓘ</label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleInputChange}
                    placeholder="Nombre del programa"
                  />
                </div>

                <div className="pd-field" style={{ marginTop: 8 }}>
                  <label>Lavadoras del programa</label>
                  <div className="pd-lavadoras-badges">
                    {lavadorasList.length === 0 ? (
                      <span style={{ color: "#94a3b8", fontSize: 12 }}>
                        Sin lavadoras asignadas
                      </span>
                    ) : (
                      lavadorasList.map((lav, i) => (
                        <span key={i} className="pd-lavadora-badge">
                          {lav}
                        </span>
                      ))
                    )}
                  </div>
                  <input
                    name="lavadoras"
                    value={form.lavadoras}
                    onChange={handleInputChange}
                    placeholder="Separar por comas: UNIMAC 90Kg - 1, UNIMAC 90Kg - 2"
                    style={{ marginTop: 6, fontSize: 12 }}
                  />
                </div>

                <div className="pd-checkbox-row">
                  <input
                    type="checkbox"
                    id="pd-inicioManual"
                    name="inicioManual"
                    checked={form.inicioManual}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="pd-inicioManual">Inicio manual</label>
                </div>

                {/* Inicio automático section */}
                <div className="pd-auto-start-section">
                  <div className="pd-checkbox-row">
                    <input
                      type="checkbox"
                      id="pd-arranqueAuto"
                      name="arranqueAutomatico"
                      checked={form.arranqueAutomatico}
                      onChange={handleInputChange}
                    />
                    <label htmlFor="pd-arranqueAuto">Inicio automático ⓘ</label>
                  </div>

                  {form.arranqueAutomatico && (
                    <div className="pd-auto-fields">
                      <div className="pd-auto-row">
                        <div>
                          <label>Duración de la señal, s (mín) ⓘ</label>
                          <input
                            name="duracionMin"
                            type="number"
                            min="0"
                            value={form.duracionMin}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div>
                          <label>Duración de la señal, s (máx) ⓘ</label>
                          <input
                            name="duracionMax"
                            type="number"
                            min="0"
                            value={form.duracionMax}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                      <div>
                        <label>Autostart signal combination ⓘ</label>
                        <SignalBadges
                          selected={form.senales}
                          onToggle={toggleSenal}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="pd-settings-right">
                <div className="pd-field">
                  <label>Numero Programa ⓘ</label>
                  <input
                    name="numero"
                    value={form.numero}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="pd-field">
                  <label>Program category</label>
                  <select
                    name="categoria"
                    value={form.categoria}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Program category</option>
                    <option value="Toallas">Toallas</option>
                    <option value="Sabanas">Sábanas</option>
                    <option value="Uniformes">Uniformes</option>
                    <option value="Delicados">Delicados</option>
                  </select>
                </div>

                <div className="pd-field pd-price-panel">
                  <label>Program category price</label>
                  <div className="pd-price-value">
                    Program price, EUR/kg
                    <br />
                    <strong>{form.precioPorKg || "N/A"}</strong>
                  </div>
                </div>

                <div className="pd-field">
                  <label>Tiempo máximo de ejecución, s ⓘ</label>
                  <input
                    name="tiempoMaxEjecucion"
                    type="number"
                    min="0"
                    value={form.tiempoMaxEjecucion}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="pd-field">
                  <label>Terminar programa después de, s ⓘ</label>
                  <input
                    name="terminarDespuesDe"
                    type="number"
                    min="0"
                    value={form.terminarDespuesDe}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Default dosing controls row */}
            <div className="pd-dosing-row">
              <div className="pd-dosing-item">
                <label>Default dosing mode</label>
                <select
                  name="defaultDosingMode"
                  value={form.defaultDosingMode}
                  onChange={handleInputChange}
                >
                  {DEFAULT_DOSING_MODES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="pd-dosing-item">
                <span>Default weight capacity ⓘ</span>
                <MdSettings size={16} color="#94a3b8" />
              </div>
              <div className="pd-dosing-item">
                <span>Default product dosage ⓘ</span>
                <MdSettings size={16} color="#94a3b8" />
              </div>
              <div className="pd-dosing-item">
                <span>Full Washing Cycle Additional Time</span>
                <MdSettings size={16} color="#94a3b8" />
              </div>
            </div>

            {/* Pasos section */}
            <div className="pd-pasos-section">
              <div className="pd-pasos-header">
                <h4>Pasos</h4>
                <div className="pd-pasos-actions">
                  <button className="cd-add-btn" onClick={addPaso}>
                    <MdAdd size={14} /> Pasos
                  </button>
                  <button className="cd-icon-btn" title="Acciones">
                    <MdSettings size={16} /> <span style={{ fontSize: 11 }}>Acciones</span>
                  </button>
                  <button className="cd-icon-btn" title="Reorganizar">
                    <MdSettings size={16} /> <span style={{ fontSize: 11 }}>Reorganizar</span>
                  </button>
                </div>
              </div>

              <div className="prog-table-wrap">
                <table className="prog-table">
                  <thead>
                    <tr>
                      <th>Paso</th>
                      <th>Nombre</th>
                      <th>Quantity per 1 kg</th>
                      <th>Price per 1 kg</th>
                      <th>Activo On</th>
                      <th>Opcional</th>
                      <th>Información detallada</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.pasos.map((paso, idx) => {
                      const productos = paso.productos || [];
                      const qty = productos.reduce(
                        (s, pr) =>
                          s +
                          (Number(pr.cantidadMlPorKg) || 0) +
                          (Number(pr.cantidadGrPorKg) || 0),
                        0
                      );
                      const price = productos.reduce(
                        (s, pr) => s + (Number(pr.precioPorKg) || 0),
                        0
                      );
                      const cantMl = productos.reduce((s, pr) => s + (Number(pr.cantidadMlPorKg) || 0), 0);
                      const cantGr = productos.reduce((s, pr) => s + (Number(pr.cantidadGrPorKg) || 0), 0);
                      return (
                        <tr key={paso.id}>
                          <td>Paso {idx + 1}</td>
                          <td
                            className="prog-name"
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              navigate(
                                `/dispositivos/${deviceId}/programas/${programaId}/pasos/${paso.id}`
                              )
                            }
                          >
                            {paso.nombre || `Paso ${idx + 1}`}
                          </td>
                          <td>
                            {cantMl.toFixed(2)} ml / {cantGr.toFixed(2)} gr
                          </td>
                          <td>{price.toFixed(2)} EUR</td>
                          <td>
                            {paso.risingEdge ? "Rising edge" : paso.fallingEdge ? "Falling edge" : "—"}
                          </td>
                          <td>
                            {paso.opcional ? <MdCheck className="prog-badge-check" /> : ""}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <MdInfo
                              size={18}
                              color="#2563eb"
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                navigate(
                                  `/dispositivos/${deviceId}/programas/${programaId}/pasos/${paso.id}`
                                )
                              }
                            />
                          </td>
                          <td>
                            <span
                              className="prog-icon-btn"
                              onClick={() => deletePaso(paso.id)}
                              title="Eliminar paso"
                            >
                              <MdDelete size={15} color="#ef4444" />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {form.pasos.length > 0 && (
                      <tr className="pd-paso-total-row">
                        <td colSpan={2}><strong>Total:</strong></td>
                        <td>
                          <strong>
                            {form.pasos.reduce((s, p) => s + (p.productos || []).reduce((ss, pr) => ss + (Number(pr.cantidadMlPorKg) || 0), 0), 0).toFixed(2)} ml /{" "}
                            {form.pasos.reduce((s, p) => s + (p.productos || []).reduce((ss, pr) => ss + (Number(pr.cantidadGrPorKg) || 0), 0), 0).toFixed(2)} gr
                          </strong>
                        </td>
                        <td>
                          <strong>
                            {form.pasos.reduce((s, p) => s + (p.productos || []).reduce((ss, pr) => ss + (Number(pr.precioPorKg) || 0), 0), 0).toFixed(2)} EUR
                          </strong>
                        </td>
                        <td colSpan={4}></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Energy consumption tab */}
        {activeTab === "energy" && (
          <section className="cd-section">
            <div className="cd-empty">
              <p>Energy consumption estará disponible en una próxima fase.</p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default ProgramaDetallePage;
