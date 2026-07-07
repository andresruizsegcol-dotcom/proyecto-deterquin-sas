// Modal "Ajustes" de un dispositivo (secciones 5.11-5.15 de la
// especificación funcional: Ajustes Generales, Ajustes Lavadora, Ajustes
// Grupo de Dosificación, Ajustes de Bombas).
// - A diferencia de la referencia (que incluye decenas de campos de muy
//   bajo nivel: caudalímetros, sensores de nivel de agua, comportamiento
//   de válvulas), aquí solo se construyen los campos que tienen un efecto
//   REAL en el resto de la app: nombre/capacidad/estado de lavadoras y
//   grupos, y la configuración de bombas (producto, cantidad a calibrar,
//   alarmas de flujo, activar/desactivar). Replicar los campos de hardware
//   sin ningún dato detrás solo aparentaría funcionalidad, igual que se
//   evitó con el diagrama de tuberías y los informes de energía/conductividad.
// - Deshabilitar una lavadora o desactivar una bomba aquí SÍ tiene efecto
//   real: Calibración Remota deja de ofrecerlas como opción, y Datos en
//   Vivo / Dashboard / Informes dejan de simularlas como si funcionaran.
import { useState } from "react";
import { MdClose, MdAdd, MdDelete } from "react-icons/md";
import { getCalibracionConfig, saveCalibracionConfig } from "../../services/localMock";
import DeviceFormModal from "../../components/devices/DeviceFormModal";
import "./ClientsDetail.css";
import "./AjustesDispositivoModal.css";

const TABS = [
  { key: "generales", label: "Generales" },
  { key: "lavadoras", label: "Lavadora" },
  { key: "grupos", label: "Grupo Dosificación" },
  { key: "bombas", label: "Bombas" },
];

function AjustesDispositivoModal({ dispositivo, productos, onSaveDevice, onClose }) {
  const [config, setConfig] = useState(() => getCalibracionConfig(dispositivo.id));
  const [activeTab, setActiveTab] = useState("generales");
  const [deviceData, setDeviceData] = useState(dispositivo);
  const [showEditDevice, setShowEditDevice] = useState(false);

  const persist = (next) => {
    setConfig(next);
    saveCalibracionConfig(dispositivo.id, next);
  };

  const handleGuardarDevice = (actualizado) => {
    setDeviceData(actualizado);
    onSaveDevice(actualizado);
    setShowEditDevice(false);
  };

  // ── Lavadoras ──
  const addLavadora = () => {
    const nueva = { id: Date.now(), nombre: `Lavadora ${config.lavadoras.length + 1}`, capacidadKg: 80, habilitada: true };
    persist({ ...config, lavadoras: [...config.lavadoras, nueva] });
  };
  const updateLavadora = (id, field, value) => {
    persist({ ...config, lavadoras: config.lavadoras.map((l) => (l.id === id ? { ...l, [field]: value } : l)) });
  };
  const removeLavadora = (id) => {
    if (!window.confirm("¿Borrar esta lavadora? También se quitará de Calibración Remota y Datos en Vivo.")) return;
    persist({ ...config, lavadoras: config.lavadoras.filter((l) => l.id !== id) });
  };

  // ── Grupos de dosificación ──
  const addGrupo = () => {
    const nuevo = { id: Date.now(), nombre: `Grupo Dosificación ${config.grupos.length + 1}`, habilitado: true };
    persist({ ...config, grupos: [...config.grupos, nuevo] });
  };
  const updateGrupo = (id, field, value) => {
    persist({ ...config, grupos: config.grupos.map((g) => (g.id === id ? { ...g, [field]: value } : g)) });
  };
  const removeGrupo = (id) => {
    if (!window.confirm("¿Borrar este grupo de dosificación?")) return;
    persist({ ...config, grupos: config.grupos.filter((g) => g.id !== id) });
  };

  // ── Bombas ──
  const addBomba = () => {
    if (productos.length === 0) return;
    const nueva = {
      id: Date.now(), nombre: `Bomba ${config.bombas.length + 1}`, productoId: productos[0].id,
      cantidadCalibrada: 0, objetivoMl: null, flujoBajoAlarma: null, flujoAltoAlarma: null, activa: true,
    };
    persist({ ...config, bombas: [...config.bombas, nueva] });
  };
  const updateBomba = (id, field, value) => {
    persist({ ...config, bombas: config.bombas.map((b) => (b.id === id ? { ...b, [field]: value } : b)) });
  };
  const removeBomba = (id) => {
    if (!window.confirm("¿Borrar esta bomba?")) return;
    persist({ ...config, bombas: config.bombas.filter((b) => b.id !== id) });
  };

  return (
    <>
      <div className="cd-modal-overlay" onClick={onClose}>
        <div className="cd-modal cd-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="cd-modal-header">
          <h3>Ajustes — {deviceData.nombre}</h3>
          <button className="cd-modal-close" onClick={onClose}><MdClose size={20} /></button>
        </div>

        <div className="cd-tabs ajustes-tabs">
          {TABS.map((t) => (
            <div
              key={t.key}
              className={`cd-tab ${activeTab === t.key ? "cd-tab-active" : ""}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </div>
          ))}
        </div>

        <div className="cd-modal-body ajustes-modal-body">
          {/* ── Generales ── */}
          {activeTab === "generales" && (
            <div className="ajustes-generales">
              <div className="ajustes-readonly-row"><span>Nombre</span><strong>{deviceData.nombre}</strong></div>
              <div className="ajustes-readonly-row"><span>Serial</span><strong>{deviceData.serial}</strong></div>
              <div className="ajustes-readonly-row"><span>Tipo</span><strong>{deviceData.tipo || "—"}</strong></div>
              <div className="ajustes-readonly-row"><span>Ubicación</span><strong>{deviceData.ubicacion || "—"}</strong></div>
              <div className="ajustes-readonly-row"><span>Estado</span><strong>{deviceData.estado === "activo" ? "Activo" : "Inactivo"}</strong></div>
              <button className="cd-btn-crear ajustes-edit-btn" onClick={() => setShowEditDevice(true)}>
                Editar datos del dispositivo
              </button>
            </div>
          )}

          {/* ── Lavadoras ── */}
          {activeTab === "lavadoras" && (
            <div className="ajustes-list">
              {config.lavadoras.length === 0 && <p className="ajustes-empty-text">Este dispositivo no tiene lavadoras configuradas.</p>}
              {config.lavadoras.map((lav) => (
                <div key={lav.id} className="ajustes-row">
                  <input
                    className="ajustes-row-input"
                    value={lav.nombre}
                    onChange={(e) => updateLavadora(lav.id, "nombre", e.target.value)}
                    placeholder="Nombre"
                  />
                  <div className="ajustes-row-field">
                    <label>Capacidad (kg)</label>
                    <input
                      type="number" min="0" step="0.1"
                      value={lav.capacidadKg ?? ""}
                      onChange={(e) => updateLavadora(lav.id, "capacidadKg", Number(e.target.value))}
                    />
                  </div>
                  <label className="ajustes-checkbox-row">
                    <input
                      type="checkbox"
                      checked={lav.habilitada !== false}
                      onChange={(e) => updateLavadora(lav.id, "habilitada", e.target.checked)}
                    />
                    Habilitada
                  </label>
                  <span className="ajustes-row-delete" onClick={() => removeLavadora(lav.id)} title="Borrar lavadora">
                    <MdDelete size={17} color="#ef4444" />
                  </span>
                </div>
              ))}
              <button className="cd-add-btn" onClick={addLavadora}><MdAdd size={15} /> Añadir lavadora</button>
            </div>
          )}

          {/* ── Grupos de dosificación ── */}
          {activeTab === "grupos" && (
            <div className="ajustes-list">
              {config.grupos.length === 0 && <p className="ajustes-empty-text">Este dispositivo no tiene grupos de dosificación configurados.</p>}
              {config.grupos.map((g) => (
                <div key={g.id} className="ajustes-row">
                  <input
                    className="ajustes-row-input ajustes-row-input-wide"
                    value={g.nombre}
                    onChange={(e) => updateGrupo(g.id, "nombre", e.target.value)}
                    placeholder="Nombre"
                  />
                  <label className="ajustes-checkbox-row">
                    <input
                      type="checkbox"
                      checked={g.habilitado !== false}
                      onChange={(e) => updateGrupo(g.id, "habilitado", e.target.checked)}
                    />
                    Habilitado
                  </label>
                  <span className="ajustes-row-delete" onClick={() => removeGrupo(g.id)} title="Borrar grupo">
                    <MdDelete size={17} color="#ef4444" />
                  </span>
                </div>
              ))}
              <button className="cd-add-btn" onClick={addGrupo}><MdAdd size={15} /> Añadir grupo</button>
            </div>
          )}

          {/* ── Bombas (tabla, fiel a la referencia 5.14/5.15) ── */}
          {activeTab === "bombas" && (
            productos.length === 0 ? (
              <p className="ajustes-empty-text">
                Registra al menos un producto químico para este cliente (pestaña Productos) antes de configurar bombas.
              </p>
            ) : (
              <div className="ajustes-bombas-wrap">
                {config.bombas.length === 0 ? (
                  <p className="ajustes-empty-text">Este dispositivo no tiene bombas configuradas.</p>
                ) : (
                  <table className="ajustes-bombas-table">
                    <thead>
                      <tr>
                        <th>Bomba</th><th>Producto</th><th>Precio</th><th>Cantidad a calibrar (ml)</th>
                        <th>Flujo bajo alarma</th><th>Flujo alto alarma</th><th>Activa</th><th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.bombas.map((bomba) => {
                        const producto = productos.find((p) => p.id === bomba.productoId);
                        return (
                          <tr key={bomba.id}>
                            <td>
                              <input value={bomba.nombre} onChange={(e) => updateBomba(bomba.id, "nombre", e.target.value)} />
                            </td>
                            <td>
                              <select value={bomba.productoId} onChange={(e) => updateBomba(bomba.id, "productoId", e.target.value)}>
                                {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                              </select>
                            </td>
                            <td className="ajustes-bombas-readonly">{producto ? `${producto.precio.toFixed(2)} /L` : "—"}</td>
                            <td>
                              <input type="number" step="0.1" min="0" value={bomba.objetivoMl ?? ""}
                                onChange={(e) => updateBomba(bomba.id, "objetivoMl", e.target.value === "" ? null : Number(e.target.value))} />
                            </td>
                            <td>
                              <input type="number" step="0.1" min="0" value={bomba.flujoBajoAlarma ?? ""}
                                onChange={(e) => updateBomba(bomba.id, "flujoBajoAlarma", e.target.value === "" ? null : Number(e.target.value))} />
                            </td>
                            <td>
                              <input type="number" step="0.1" min="0" value={bomba.flujoAltoAlarma ?? ""}
                                onChange={(e) => updateBomba(bomba.id, "flujoAltoAlarma", e.target.value === "" ? null : Number(e.target.value))} />
                            </td>
                            <td>
                              <input type="checkbox" checked={bomba.activa !== false}
                                onChange={(e) => updateBomba(bomba.id, "activa", e.target.checked)} />
                            </td>
                            <td>
                              <span className="ajustes-row-delete" onClick={() => removeBomba(bomba.id)} title="Borrar bomba">
                                <MdDelete size={16} color="#ef4444" />
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                <button className="cd-add-btn" onClick={addBomba}><MdAdd size={15} /> Añadir bomba</button>
              </div>
            )
          )}
        </div>
      </div>
      </div>

      {showEditDevice && (
        <DeviceFormModal device={deviceData} onSave={handleGuardarDevice} onClose={() => setShowEditDevice(false)} />
      )}
    </>
  );
}

export default AjustesDispositivoModal;
