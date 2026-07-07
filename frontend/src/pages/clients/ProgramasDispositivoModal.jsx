// Modal de Programas de un dispositivo
// - Lista los programas de lavado configurados para el dispositivo, con
//   creación/edición y un resumen de inicio automático (sección 5.16-5.19
//   de la especificación funcional).
// - Reutiliza las clases `.cd-modal*` / `.cd-btn-*` / `.cd-dropdown*` ya
//   definidas en ClientsDetail.css para mantener el mismo look & feel
//   (mismos colores, mismos componentes) en vez de inventar un estilo nuevo.
// - No modela "lavadoras" como entidad propia todavía (eso es una fase
//   posterior, ligada a Datos en Vivo); por ahora son texto libre.
import { useState } from "react";
import {
  MdClose, MdAdd, MdRefresh, MdMoreVert, MdDraw, MdDelete,
  MdArrowBack, MdCheck,
} from "react-icons/md";
import { getProgramsForDevice, saveProgramsForDevice } from "../../services/localMock";
import DropdownMenu from "../../components/ui/DropdownMenu";
import "./ClientsDetail.css";
import "./ProgramasDispositivoModal.css";

const SENALES = Array.from({ length: 10 }, (_, i) => i + 1); // Señal 1..10

const PROGRAM_FORM_DEFAULT = {
  nombre: "",
  numero: "",
  categoria: "",
  lavadoras: "",
  inicioManual: false,
  arranqueAutomatico: false,
  duracionMin: "",
  duracionMax: "",
  senales: [],
  cuentaCiclos: "",
  precioPorKg: "",
  pasos: [],
};

function SignalBadges({ selected, onToggle, readOnly = false }) {
  return (
    <div className="signal-badges">
      {SENALES.map((n) => {
        const active = selected.includes(n);
        return (
          <span
            key={n}
            className={`signal-badge ${active ? "active" : ""} ${readOnly ? "readonly" : ""}`}
            onClick={readOnly ? undefined : () => onToggle(n)}
            title={readOnly ? undefined : "Click para activar/desactivar"}
          >
            Señal {n}
          </span>
        );
      })}
    </div>
  );
}

function ProgramasDispositivoModal({ dispositivo, onClose }) {
  const [programas, setProgramas] = useState(() => getProgramsForDevice(dispositivo.id));
  const [view, setView] = useState("lista"); // 'lista' | 'form' | 'inicioAutomatico'
  const [form, setForm] = useState(PROGRAM_FORM_DEFAULT);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [showOpciones, setShowOpciones] = useState(false);
  const [progMenuId, setProgMenuId] = useState(null);

  const persist = (actualizados) => {
    setProgramas(actualizados);
    saveProgramsForDevice(dispositivo.id, actualizados);
  };

  const abrirNuevo = () => {
    // Sugerir el siguiente número de programa libre, igual que se ve en la
    // referencia (números consecutivos), aunque sigue siendo editable.
    const siguienteNumero = programas.length
      ? Math.max(...programas.map((p) => Number(p.numero) || 0)) + 1
      : 1;
    setForm({ ...PROGRAM_FORM_DEFAULT, numero: String(siguienteNumero) });
    setEditId(null);
    setError("");
    setView("form");
  };

  const abrirEditar = (prog) => {
    setForm({ ...PROGRAM_FORM_DEFAULT, ...prog });
    setEditId(prog.id);
    setError("");
    setProgMenuId(null);
    setView("form");
  };

  const eliminarPrograma = (progId) => {
    if (!window.confirm("¿Borrar este programa?")) return;
    persist(programas.filter((p) => p.id !== progId));
    setProgMenuId(null);
  };

  const toggleSenal = (n) => {
    setForm((f) => ({
      ...f,
      senales: f.senales.includes(n) ? f.senales.filter((s) => s !== n) : [...f.senales, n],
    }));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setError("");
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const addPaso = () => {
    setForm((f) => ({
      ...f,
      pasos: [...f.pasos, { id: Date.now(), senal: 1, cantidadMl: "", precioPorKg: "" }],
    }));
  };

  const updatePaso = (pasoId, field, value) => {
    setForm((f) => ({
      ...f,
      pasos: f.pasos.map((p) => (p.id === pasoId ? { ...p, [field]: value } : p)),
    }));
  };

  const removePaso = (pasoId) => {
    setForm((f) => ({ ...f, pasos: f.pasos.filter((p) => p.id !== pasoId) }));
  };

  const guardarPrograma = () => {
    const nombre = form.nombre.trim();
    const numero = String(form.numero).trim();
    if (!nombre || !numero) {
      setError("El nombre y el número de programa son obligatorios.");
      return;
    }
    const duplicado = programas.some((p) => String(p.numero) === numero && p.id !== editId);
    if (duplicado) {
      setError("Ya existe un programa con ese número en este dispositivo.");
      return;
    }
    if (form.arranqueAutomatico) {
      if (form.senales.length === 0) {
        setError("Selecciona al menos una señal de arranque automático.");
        return;
      }
      if (form.duracionMin === "" || form.duracionMax === "" || Number(form.duracionMin) > Number(form.duracionMax)) {
        setError("Revisa la duración mínima/máxima de la señal (mínima no puede ser mayor que la máxima).");
        return;
      }
    }
    const programa = { ...form, id: editId ?? Date.now(), nombre, numero };
    const actualizados = editId
      ? programas.map((p) => (p.id === editId ? programa : p))
      : [...programas, programa];
    persist(actualizados);
    setView("lista");
  };

  const exportarCSV = () => {
    const headers = ["Nombre", "Numero", "Categoria", "Inicio manual", "Arranque automatico", "Ciclos", "Precio por kg", "Lavadoras"];
    const rows = programas.map((p) => [
      p.nombre, p.numero, p.categoria || "", p.inicioManual ? "Si" : "No",
      p.arranqueAutomatico ? "Si" : "No", p.cuentaCiclos || "", p.precioPorKg || "", p.lavadoras || "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `programas_${dispositivo.serial || dispositivo.nombre}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowOpciones(false);
  };

  const titulo =
    view === "form" ? (editId ? "Editar Programa" : "Nuevo Programa")
    : view === "inicioAutomatico" ? "Detalles de inicio automático"
    : `Programas — ${dispositivo.nombre}`;

  return (
    <div className="cd-modal-overlay" onClick={onClose}>
      <div className="cd-modal cd-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="cd-modal-header">
          <h3>
            {view !== "lista" && (
              <MdArrowBack
                size={18}
                style={{ verticalAlign: "middle", marginRight: 8, cursor: "pointer" }}
                onClick={() => setView("lista")}
              />
            )}
            {titulo}
          </h3>
          <button className="cd-modal-close" onClick={onClose}><MdClose size={20} /></button>
        </div>

        {/* Vista: lista de programas */}
        {view === "lista" && (
          <div className="cd-modal-body prog-modal-body">
            <div className="prog-toolbar">
              <button className="cd-icon-btn" title="Actualizar" onClick={() => setProgramas(getProgramsForDevice(dispositivo.id))}>
                <MdRefresh size={18} />
              </button>
              <button className="cd-add-btn" onClick={abrirNuevo}>
                <MdAdd size={16} /> Crear
              </button>
              <div style={{ position: "relative" }}>
                <button className="cd-icon-btn" title="Opciones" onClick={() => setShowOpciones((v) => !v)}>
                  <MdMoreVert size={18} />
                </button>
                {showOpciones && (
                  <DropdownMenu
                    onClose={() => setShowOpciones(false)}
                    options={[
                      { label: "Detalles de inicio automático", action: () => setView("inicioAutomatico") },
                      { label: "Exportar", action: exportarCSV },
                    ]}
                  />
                )}
              </div>
            </div>

            {programas.length === 0 ? (
              <div className="cd-empty">
                <p>Este dispositivo no tiene programas registrados.</p>
                <button className="cd-add-btn-empty" onClick={abrirNuevo}>
                  <MdAdd size={15} /> Crear primer programa
                </button>
              </div>
            ) : (
              <div className="prog-table-wrap">
                <table className="prog-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Número</th>
                      <th>Categoría</th>
                      <th>Inicio manual</th>
                      <th>Arranque automático</th>
                      <th>Ciclos</th>
                      <th>Precio por kg</th>
                      <th>Lavadoras</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {programas.map((prog) => (
                      <tr key={prog.id}>
                        <td className="prog-name">{prog.nombre}</td>
                        <td>{prog.numero}</td>
                        <td>{prog.categoria || "—"}</td>
                        <td>{prog.inicioManual ? <MdCheck className="prog-badge-check" /> : "—"}</td>
                        <td>{prog.arranqueAutomatico ? <MdCheck className="prog-badge-check" /> : "—"}</td>
                        <td>{prog.cuentaCiclos || "—"}</td>
                        <td>{prog.precioPorKg ? `${prog.precioPorKg}` : "N/A"}</td>
                        <td>{prog.lavadoras || "—"}</td>
                        <td>
                          <div className="prog-actions-cell" style={{ position: "relative" }}>
                            <span className="prog-icon-btn" onClick={() => abrirEditar(prog)} title="Editar">
                              <MdDraw size={16} />
                            </span>
                            <span
                              className="prog-icon-btn"
                              onClick={() => setProgMenuId(progMenuId === prog.id ? null : prog.id)}
                              title="Opciones"
                            >
                              <MdMoreVert size={16} />
                            </span>
                            {progMenuId === prog.id && (
                              <DropdownMenu
                                onClose={() => setProgMenuId(null)}
                                options={[
                                  { label: "Borrar", red: true, action: () => eliminarPrograma(prog.id) },
                                ]}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Vista: crear/editar programa */}
        {view === "form" && (
          <>
            <div className="cd-modal-body prog-modal-body">
              <div className="prog-form-grid">
                <div className="prog-form-full">
                  <label>Nombre del programa *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: C1 - Toalla Blanca" />
                </div>

                <div>
                  <label>Número de programa *</label>
                  <input name="numero" value={form.numero} onChange={handleChange} placeholder="Ej: 1" />
                </div>
                <div>
                  <label>Categoría del programa</label>
                  <input name="categoria" value={form.categoria} onChange={handleChange} placeholder="Ej: Toallas" />
                </div>

                <div className="prog-form-full">
                  <label>Lavadoras asociadas</label>
                  <input name="lavadoras" value={form.lavadoras} onChange={handleChange} placeholder="Ej: UNIMAC 90Kg - 1, UNIMAC 90Kg - 2" />
                </div>

                <div className="prog-checkbox-row">
                  <input type="checkbox" name="inicioManual" checked={form.inicioManual} onChange={handleChange} id="inicioManual" />
                  <label htmlFor="inicioManual" style={{ margin: 0 }}>Inicio manual</label>
                </div>
                <div className="prog-checkbox-row">
                  <input type="checkbox" name="arranqueAutomatico" checked={form.arranqueAutomatico} onChange={handleChange} id="arranqueAutomatico" />
                  <label htmlFor="arranqueAutomatico" style={{ margin: 0 }}>Arranque automático</label>
                </div>

                {form.arranqueAutomatico && (
                  <>
                    <div>
                      <label>Duración de la señal, s (mín)</label>
                      <input name="duracionMin" type="number" min="0" value={form.duracionMin} onChange={handleChange} />
                    </div>
                    <div>
                      <label>Duración de la señal, s (máx)</label>
                      <input name="duracionMax" type="number" min="0" value={form.duracionMax} onChange={handleChange} />
                    </div>
                    <div className="prog-form-full">
                      <label>Combinación de señales de arranque automático</label>
                      <SignalBadges selected={form.senales} onToggle={toggleSenal} />
                    </div>
                  </>
                )}

                <div>
                  <label>Cuenta de ciclos</label>
                  <input name="cuentaCiclos" type="number" min="0" value={form.cuentaCiclos} onChange={handleChange} />
                </div>
                <div>
                  <label>Precio por kg</label>
                  <input name="precioPorKg" type="number" step="0.01" min="0" value={form.precioPorKg} onChange={handleChange} />
                </div>

                <div className="prog-form-full">
                  <div className="prog-pasos-header">
                    <label style={{ margin: 0 }}>Pasos de dosificación</label>
                    <button type="button" className="cd-add-btn" onClick={addPaso}>
                      <MdAdd size={14} /> Añadir paso
                    </button>
                  </div>
                  {form.pasos.length === 0 ? (
                    <p className="prog-pasos-empty">Sin pasos configurados todavía.</p>
                  ) : (
                    <table className="prog-pasos-table">
                      <thead>
                        <tr>
                          <th>Señal</th>
                          <th>Cantidad por kg (ml)</th>
                          <th>Precio por kg</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.pasos.map((paso) => (
                          <tr key={paso.id}>
                            <td>
                              <select value={paso.senal} onChange={(e) => updatePaso(paso.id, "senal", Number(e.target.value))}>
                                {SENALES.map((n) => <option key={n} value={n}>Señal {n}</option>)}
                              </select>
                            </td>
                            <td>
                              <input type="number" step="0.1" min="0" value={paso.cantidadMl}
                                onChange={(e) => updatePaso(paso.id, "cantidadMl", e.target.value)} />
                            </td>
                            <td>
                              <input type="number" step="0.01" min="0" value={paso.precioPorKg}
                                onChange={(e) => updatePaso(paso.id, "precioPorKg", e.target.value)} />
                            </td>
                            <td>
                              <span className="prog-icon-btn" onClick={() => removePaso(paso.id)} title="Eliminar paso">
                                <MdDelete size={15} color="#ef4444" />
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {error && <p className="prog-form-full" style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{error}</p>}
              </div>
            </div>
            <div className="cd-modal-footer">
              <button className="cd-btn-cancel" onClick={() => setView("lista")}>Cancelar</button>
              <button className="cd-btn-crear" onClick={guardarPrograma}>Guardar</button>
            </div>
          </>
        )}

        {/* Vista: detalles de inicio automático (solo lectura) */}
        {view === "inicioAutomatico" && (
          <div className="cd-modal-body prog-modal-body">
            {programas.filter((p) => p.arranqueAutomatico).length === 0 ? (
              <p style={{ color: "#64748b", fontSize: 13 }}>
                Ningún programa de este dispositivo tiene arranque automático configurado.
              </p>
            ) : (
              <div className="prog-table-wrap">
                <table className="prog-table">
                  <thead>
                    <tr>
                      <th>Nombre Programa</th>
                      <th>Número</th>
                      <th>Señales</th>
                      <th>Duración mín (s)</th>
                      <th>Duración máx (s)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programas.filter((p) => p.arranqueAutomatico).map((prog) => (
                      <tr key={prog.id}>
                        <td className="prog-name">{prog.nombre}</td>
                        <td>{prog.numero}</td>
                        <td><SignalBadges selected={prog.senales || []} readOnly /></td>
                        <td>{prog.duracionMin || "—"}</td>
                        <td>{prog.duracionMax || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgramasDispositivoModal;
