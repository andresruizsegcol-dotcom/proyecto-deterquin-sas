// Modal de Calibración Remota de un dispositivo
// - Sección 5.5/5.6 de la especificación funcional: permite seleccionar
//   grupo de dosificación + lavadora, elegir una bomba (señal saliente) y
//   ejecutar una acción (Cebar/Calibrar/Enjuagar) con una duración, viendo
//   el progreso y registrando la cantidad calibrada al finalizar.
// - A diferencia de ProgramasDispositivoModal (que navega entre "vistas"),
//   aquí se replica el estilo de la referencia: las 4 secciones del flujo
//   (Selección, Acción, Progreso, Cantidad calibrada) se muestran apiladas
//   y siempre visibles en un único panel con scroll, deshabilitándose
//   según corresponda en vez de navegar entre pantallas.
// - Las "bombas" son la única entidad nueva con datos reales: cada una
//   dosifica un producto químico del cliente (ya existente). Grupos y
//   lavadoras quedan como listas simples gestionables inline, ya que su
//   configuración detallada (Ajustes Lavadora / Ajustes Grupo Dosificación)
//   pertenece a una fase posterior (Ajustes Generales del dispositivo).
import { useState, useEffect } from "react";
import { MdClose } from "react-icons/md";
import { getCalibracionConfig, saveCalibracionConfig } from "../../services/localMock";
import "./ClientsDetail.css";
import "./CalibracionRemotaModal.css";

const ACCIONES = ["Cebar", "Calibrar", "Enjuagar"];

function bombaLabel(bomba, productos) {
  const producto = productos.find((p) => p.id === bomba.productoId);
  return `${bomba.nombre}${producto ? ` - ${producto.nombre}` : ""}`;
}

function CalibracionRemotaModal({ dispositivo, productos, onClose }) {
  const [config, setConfig] = useState(() => getCalibracionConfig(dispositivo.id));

  // Solo se ofrecen para selección los grupos/lavadoras/bombas habilitados
  // desde Ajustes; los deshabilitados siguen guardándose en el dispositivo
  // pero no aparecen como opciones operables aquí.
  const gruposHabilitados = config.grupos.filter((g) => g.habilitado !== false);
  const lavadorasHabilitadas = config.lavadoras.filter((l) => l.habilitada !== false);
  const bombasActivas = config.bombas.filter((b) => b.activa !== false);

  const [grupoId, setGrupoId] = useState(gruposHabilitados[0]?.id ?? null);
  const [lavadoraId, setLavadoraId] = useState(lavadorasHabilitadas[0]?.id ?? null);
  const [seleccionado, setSeleccionado] = useState(false);

  const [bombaId, setBombaId] = useState(bombasActivas[0]?.id ?? null);
  const [accion, setAccion] = useState("Cebar");
  const [duracion, setDuracion] = useState(60);

  const [running, setRunning] = useState(null); // { bombaId, accion, duracion, remaining } | null
  const [pendingQuantity, setPendingQuantity] = useState(null); // { bombaId } | null
  const [cantidadInput, setCantidadInput] = useState("");

  const [showNuevoGrupo, setShowNuevoGrupo] = useState(false);
  const [showNuevaLavadora, setShowNuevaLavadora] = useState(false);
  const [showNuevaBomba, setShowNuevaBomba] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaBombaProductoId, setNuevaBombaProductoId] = useState(productos[0]?.id ?? "");
  const [nuevaBombaObjetivo, setNuevaBombaObjetivo] = useState("");

  // Timer: cada segundo descuenta `remaining`; al llegar a 0 se decide qué
  // sigue según la acción ejecutada (Calibrar pide cantidad, las demás
  // simplemente vuelven a quedar listas).
  useEffect(() => {
    if (!running || running.remaining <= 0) return undefined;
    const timeoutId = setTimeout(() => {
      setRunning((r) => (r ? { ...r, remaining: r.remaining - 1 } : r));
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [running]);

  useEffect(() => {
    if (running && running.remaining <= 0) {
      const finished = running;
      setRunning(null);
      if (finished.accion === "Calibrar") {
        setPendingQuantity({ bombaId: finished.bombaId });
        setCantidadInput("");
      }
    }
  }, [running]);

  const persist = (next) => {
    setConfig(next);
    saveCalibracionConfig(dispositivo.id, next);
  };

  const handleSeleccionar = () => {
    if (!grupoId || !lavadoraId) return;
    setSeleccionado(true);
  };

  const agregarGrupo = () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    const nuevo = { id: Date.now(), nombre };
    const next = { ...config, grupos: [...config.grupos, nuevo] };
    persist(next);
    setGrupoId(nuevo.id);
    setNuevoNombre("");
    setShowNuevoGrupo(false);
  };

  const agregarLavadora = () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    const nueva = { id: Date.now(), nombre };
    const next = { ...config, lavadoras: [...config.lavadoras, nueva] };
    persist(next);
    setLavadoraId(nueva.id);
    setNuevoNombre("");
    setShowNuevaLavadora(false);
  };

  const agregarBomba = () => {
    if (!nuevaBombaProductoId) return;
    const nombre = (nuevoNombre.trim() || `Bomba ${config.bombas.length + 1}`);
    const nueva = {
      id: Date.now(),
      nombre,
      productoId: nuevaBombaProductoId,
      cantidadCalibrada: 0,
      objetivoMl: nuevaBombaObjetivo === "" ? null : Number(nuevaBombaObjetivo),
    };
    const next = { ...config, bombas: [...config.bombas, nueva] };
    persist(next);
    setBombaId(nueva.id);
    setNuevoNombre("");
    setNuevaBombaObjetivo("");
    setShowNuevaBomba(false);
  };

  const handleExecute = () => {
    if (!seleccionado || !bombaId || !duracion || duracion <= 0) return;
    setRunning({ bombaId, accion, duracion: Number(duracion), remaining: Number(duracion) });
  };

  const handleParar = () => {
    setRunning(null);
  };

  const handleGuardarCantidad = () => {
    if (cantidadInput === "" || !pendingQuantity) return;
    const next = {
      ...config,
      bombas: config.bombas.map((b) =>
        b.id === pendingQuantity.bombaId ? { ...b, cantidadCalibrada: Number(cantidadInput) } : b
      ),
    };
    persist(next);
    setPendingQuantity(null);
    setCantidadInput("");
  };

  const handleCancelarCantidad = () => {
    setPendingQuantity(null);
    setCantidadInput("");
  };

  const bombaPendiente = pendingQuantity
    ? config.bombas.find((b) => b.id === pendingQuantity.bombaId)
    : null;

  const progresoPct = running ? ((running.duracion - running.remaining) / running.duracion) * 100 : 0;

  return (
    <div className="cd-modal-overlay" onClick={onClose}>
      <div className="cd-modal cd-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="cd-modal-header">
          <h3>Calibración a distancia — {dispositivo.nombre}</h3>
          <button className="cd-modal-close" onClick={onClose}><MdClose size={20} /></button>
        </div>

        <div className="cd-modal-body calib-modal-body">
          {/* Card 1: Selección de grupo + lavadora */}
          <div className="calib-card">
            <div className="calib-card-header">{seleccionado ? "Seleccionado" : "Inactivo"}</div>
            <div className="calib-card-content">
              <div className="calib-row">
                <div className="calib-field">
                  <label>Grupo Dosificación</label>
                  <select value={grupoId ?? ""} onChange={(e) => { setGrupoId(Number(e.target.value)); setSeleccionado(false); }}>
                    {gruposHabilitados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                  {!showNuevoGrupo ? (
                    <span className="calib-add-link" onClick={() => { setShowNuevoGrupo(true); setNuevoNombre(""); }}>+ Nuevo grupo</span>
                  ) : (
                    <div className="calib-inline-add">
                      <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre del grupo" />
                      <button onClick={agregarGrupo}>Agregar</button>
                      <button className="calib-inline-cancel" onClick={() => setShowNuevoGrupo(false)}>Cancelar</button>
                    </div>
                  )}
                </div>
                <div className="calib-field">
                  <label>Lavadora</label>
                  <select value={lavadoraId ?? ""} onChange={(e) => { setLavadoraId(Number(e.target.value)); setSeleccionado(false); }}>
                    {lavadorasHabilitadas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                  </select>
                  {!showNuevaLavadora ? (
                    <span className="calib-add-link" onClick={() => { setShowNuevaLavadora(true); setNuevoNombre(""); }}>+ Nueva lavadora</span>
                  ) : (
                    <div className="calib-inline-add">
                      <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre de la lavadora" />
                      <button onClick={agregarLavadora}>Agregar</button>
                      <button className="calib-inline-cancel" onClick={() => setShowNuevaLavadora(false)}>Cancelar</button>
                    </div>
                  )}
                </div>
              </div>
              <button className="cd-btn-crear calib-full-btn" onClick={handleSeleccionar} disabled={!grupoId || !lavadoraId}>
                Seleccionar
              </button>
            </div>
          

          {/* Card 2: Acción (Ready) */}
          
            <div className="calib-card-header">{running ? "Ejecutando" : "Listo"}</div>
            <div className="calib-card-content">
              {bombasActivas.length === 0 ? (
                <div className="calib-empty-inline">
                  <p>No hay bombas configuradas para este dispositivo.</p>
                  {productos.length === 0 ? (
                    <p className="calib-warning">Registra al menos un producto químico para este cliente antes de configurar bombas.</p>
                  ) : !showNuevaBomba ? (
                    <span className="calib-add-link" onClick={() => { setShowNuevaBomba(true); setNuevoNombre(""); setNuevaBombaProductoId(productos[0]?.id ?? ""); setNuevaBombaObjetivo(""); }}>
                      + Configurar primera bomba
                    </span>
                  ) : (
                    <div className="calib-inline-add calib-inline-add-bomba">
                      <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Ej: Bomba 1" />
                      <select value={nuevaBombaProductoId} onChange={(e) => setNuevaBombaProductoId(e.target.value)}>
                        {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                      <input type="number" step="0.1" min="0" value={nuevaBombaObjetivo} onChange={(e) => setNuevaBombaObjetivo(e.target.value)} placeholder="Objetivo ml (opcional)" />
                      <button onClick={agregarBomba}>Agregar</button>
                      <button className="calib-inline-cancel" onClick={() => setShowNuevaBomba(false)}>Cancelar</button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="calib-row">
                    <div className="calib-field">
                      <label>Señal saliente</label>
                      <select value={bombaId ?? ""} onChange={(e) => setBombaId(Number(e.target.value))}>
                        {bombasActivas.map((b) => <option key={b.id} value={b.id}>{bombaLabel(b, productos)}</option>)}
                      </select>
                      {productos.length > 0 && (
                        !showNuevaBomba ? (
                          <span className="calib-add-link" onClick={() => { setShowNuevaBomba(true); setNuevoNombre(""); setNuevaBombaProductoId(productos[0]?.id ?? ""); setNuevaBombaObjetivo(""); }}>
                            + Nueva bomba
                          </span>
                        ) : (
                          <div className="calib-inline-add calib-inline-add-bomba">
                            <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Ej: Bomba 2" />
                            <select value={nuevaBombaProductoId} onChange={(e) => setNuevaBombaProductoId(e.target.value)}>
                              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                            <input type="number" step="0.1" min="0" value={nuevaBombaObjetivo} onChange={(e) => setNuevaBombaObjetivo(e.target.value)} placeholder="Objetivo ml (opcional)" />
                            <button onClick={agregarBomba}>Agregar</button>
                            <button className="calib-inline-cancel" onClick={() => setShowNuevaBomba(false)}>Cancelar</button>
                          </div>
                        )
                      )}
                    </div>
                    <div className="calib-field">
                      <label>Acción</label>
                      <select value={accion} onChange={(e) => setAccion(e.target.value)}>
                        {ACCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="calib-field">
                      <label>Duración (s)</label>
                      <input type="number" min="1" value={duracion} onChange={(e) => setDuracion(e.target.value)} />
                    </div>
                  </div>
                  <div className="calib-btn-row">
                    <button className="cd-btn-crear" disabled={!seleccionado || !!running || !bombaId || !duracion || duracion <= 0} onClick={handleExecute}>
                      Execute
                    </button>
                    <button className="calib-btn-parar" disabled={!running} onClick={handleParar}>Parar</button>
                  </div>
                </>
              )}
            </div>
          

          {/* Card 3: Progreso (Busy) */}
          
            <div className="calib-card-header">Progreso</div>
            <div className="calib-card-content">
              {running ? (
                <>
                  <p className="calib-progress-label">Tiempo restante estimado ({running.remaining}s)</p>
                  <div className="calib-progress-track">
                    <div className="calib-progress-fill" style={{ width: `${progresoPct}%` }} />
                  </div>
                  <button className="calib-btn-parar calib-full-btn" onClick={handleParar}>Parar</button>
                </>
              ) : (
                <p className="calib-idle-text">Sin ejecución en curso.</p>
              )}
            </div>
        

          {/* Card 4: Cantidad calibrada (Enter Quantity) */}
          
            <div className="calib-card-header">Cantidad calibrada</div>
            <div className="calib-card-content">
              {pendingQuantity ? (
                <>
                  <div className="calib-row">
                    <div className="calib-field">
                      <label>Cantidad de calibración actual (ml)</label>
                      <p className="calib-readonly-val">{bombaPendiente?.cantidadCalibrada ?? 0}</p>
                    </div>
                    <div className="calib-field">
                      <label>Valor objetivo (ml)</label>
                      <p className="calib-readonly-val">{bombaPendiente?.objetivoMl ?? "—"}</p>
                    </div>
                    <div className="calib-field">
                      <label>Cantidad a calibrar (ml) *</label>
                      <input type="number" step="0.1" min="0" value={cantidadInput} onChange={(e) => setCantidadInput(e.target.value)} />
                    </div>
                  </div>
                  <div className="calib-btn-row">
                    <button className="cd-btn-crear" disabled={cantidadInput === ""} onClick={handleGuardarCantidad}>Guardar</button>
                    <button className="cd-btn-cancel" onClick={handleCancelarCantidad}>Cancelar</button>
                  </div>
                </>
              ) : (
                <p className="calib-idle-text">No hay calibraciones pendientes de confirmar.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalibracionRemotaModal;
