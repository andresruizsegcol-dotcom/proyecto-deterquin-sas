// AjustesPage.jsx — Página independiente de ajustes del dispositivo.
// Ruta: /dispositivos/:deviceId/ajustes
// Reemplaza AjustesDispositivoModal: 5 pestañas completas fiel a CM2W.
// Los cambios sólo se persisten al hacer clic en "Guardar" (header).
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  findDeviceById,
  getCalibracionConfig,
  saveCalibracionConfig,
  getProductsForClient,
} from "../../services/localMock";
import {
  MdArrowBack, MdRefresh, MdDraw, MdMoreVert, MdClose, MdCheck,
  MdLocationOn, MdApartment, MdSignalWifi4Bar, MdSignalWifiOff,
  MdExpandMore, MdExpandLess, MdTune, MdAdd, MdDelete,
} from "react-icons/md";
import DropdownMenu from "../../components/ui/DropdownMenu";
import "../clients/ClientsDetail.css";
import "./AjustesPage.css";

const PAGE_TABS = [
  { key: "generales",  label: "Ajustes generales" },
  { key: "lavadoras",  label: "Ajustes lavadora" },
  { key: "grupos",     label: "Ajustes grupo dosificacion" },
  { key: "bombas",     label: "Ajustes de bomba" },
];

/* ── Extiende el config raw con defaults para todos los campos nuevos ── */
function extendConfig(raw) {
  const gDef = {
    buttonSounds: false, mostrarSugerencias: false, useButtons: false,
    stopPrograms: false, caliber: false, cebar: false, showErrors: false,
    separatedWashExtractorErrors: false, measurementSystem: "Metric",
    duracionComprobacionValvula: 4, cantidadComprobacionValvula: 100,
    periodoAutoComprobacionValvula: 7, comprobarValvulaAlarma: false,
    accionFallaValvula: "Informar solo", internalAlarm: false,
    marinaExterna: false, lowDetergentLevelAlarm: false,
    autoSyncWashExtractors: false, tabAjustesLavadora: true,
    tabAjustesGrupoDosificacion: true, tabAjustesDeBomba: true,
    tabOzoneSettings: false, interrumpirDosisAnterior: false,
    periodoFilms: 25, overdosingProtection: false,
    stopProgramOnModuleDisconnect: false,
  };
  return {
    ...raw,
    generales: { ...gDef, ...(raw.generales || {}) },
    lavadoras: (raw.lavadoras || []).map(l => ({
      washerExtractorMode: "Standard", prioridad: 50,
      minimumCapacityKg: 0, productsDeliveryWaterQuantityMl: 0,
      productsDeliveryAirflushTimeS: 0,
      programaNuevoEmpezarDeteccion: "Deshabilitado", turnTimeMin: 0,
      interrumpirProgramaTrasError: false, interruptOnWaterError: true,
      comenzarAutomaticamenteConCapacidadMaxima: false,
      waitInputsToStopProgram: true, maxSignalsWithoutProgram: 0,
      ...l,
    })),
    grupos: (raw.grupos || []).map(g => ({
      modo: "Modo secuencial", demoraAlternante: 0.5,
      caudalimetro: "Caudalímetro 2500 pls",
      caudalimetroModo: "Single Caudalímetro", habilitarAirFlush: false,
      levelMonitoring: "Deshabilitado", reportLowLoadErrorEveryS: 0,
      alcanzarFlujoPorPeriodo: 40, pumpSwitchOnDelayS: 0,
      volumenAguaAntesProd: 0, volumenAguaTrasProd: 0,
      cantidadAguaCalibradaMl: 0, ticsCalibradaAgua: 0,
      alarmaAguaFlujoBajo: 0, alarmaAguaFlujoAlto: 10000,
      waterCompensationMode: "OFF",
      ...g,
    })),
    bombas: (raw.bombas || []).map(b => ({
      grupoDosificacionId: (raw.grupos || [])[0]?.id ?? null,
      disablePumpDosing: false, stopPumpOnLowDetergentLevel: false,
      desactivarCaudalimetro: false, cantidadACalibrarMl: 1200,
      flujoBajoAlarmaMlMin: 100, flujoAltoAlarmaMlMin: 2000,
      calibrationCorrectionPct: 0, ticsRegistradosCaudalimetro: 3221, flujo: 0,
      ...b,
    })),
  };
}

/* ══════════════════════════════════════════════════════════════════════
   BombaModal — edita los ajustes de una bomba individual
══════════════════════════════════════════════════════════════════════ */
function BombaModal({ bomba, grupos, productos, onConfirm, onClose }) {
  const [draft, setDraft] = useState({ ...bomba });
  const prod = productos.find(p => String(p.id) === String(draft.productoId));
  const set = (k, v) => setDraft(prev => ({ ...prev, [k]: v }));

  return (
    <div className="cd-modal-overlay" onClick={onClose}>
      <div className="cd-modal ap-bomba-modal" onClick={e => e.stopPropagation()}>

        {/* Header azul */}
        <div className="ap-bomba-modal-header">
          <span className="ap-bomba-modal-title">Ajustes de bomba</span>
          <div className="ap-bomba-modal-actions">
            <button className="ap-bomba-btn ap-bomba-btn-confirm" onClick={() => onConfirm(draft)}>
              <MdCheck size={15} /> Confirmar
            </button>
            <button className="ap-bomba-btn ap-bomba-btn-close" onClick={onClose}>
              <MdClose size={15} /> Cerrar
            </button>
          </div>
        </div>

        <div className="ap-bomba-body">
          {/* Grupo dosificación */}
          <label>Grupo Dosificación</label>
          <select className="ap-select" value={draft.grupoDosificacionId ?? ""}
            onChange={e => set("grupoDosificacionId", e.target.value)}>
            {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
          </select>

          {/* Bomba (readonly) */}
          <label>Bomba</label>
          <div className="ap-readonly-val">{bomba.nombre}</div>

          {/* Productos químicos */}
          <label>Productos químicos</label>
          <select className="ap-select" value={draft.productoId ?? ""}
            onChange={e => set("productoId", e.target.value)}>
            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>

          {/* Precio (readonly) */}
          <label>Precio</label>
          <div className="ap-readonly-val">
            {prod ? `${prod.precio.toFixed(2)} EUR/L` : "—"}
          </div>

          {/* Checkboxes */}
          <label className="ap-checkbox-label">
            <input type="checkbox" checked={!!draft.disablePumpDosing}
              onChange={e => set("disablePumpDosing", e.target.checked)} />
            Disable pump dosing
          </label>
          <label className="ap-checkbox-label">
            <input type="checkbox" checked={!!draft.stopPumpOnLowDetergentLevel}
              onChange={e => set("stopPumpOnLowDetergentLevel", e.target.checked)} />
            Stop pump on low detergent level
          </label>
          <label className="ap-checkbox-label">
            <input type="checkbox" checked={!!draft.desactivarCaudalimetro}
              onChange={e => set("desactivarCaudalimetro", e.target.checked)} />
            Desactivar caudalímetro
          </label>

          {/* Fila: calibrar + tics */}
          <div className="ap-field-row">
            <div className="ap-field">
              <label>Cantidad a calibrar, ml</label>
              <input className="ap-input" type="number"
                value={draft.cantidadACalibrarMl ?? ""}
                onChange={e => set("cantidadACalibrarMl", Number(e.target.value))} />
            </div>
            <div className="ap-field">
              <label>Tics registrados caudalímetro</label>
              <div className="ap-readonly-val">{draft.ticsRegistradosCaudalimetro ?? "—"}</div>
            </div>
          </div>

          <label>Flujo bajo alarma, ml/min</label>
          <input className="ap-input" type="number"
            value={draft.flujoBajoAlarmaMlMin ?? ""}
            onChange={e => set("flujoBajoAlarmaMlMin", Number(e.target.value))} />

          <label>Flujo alto alarma, ml/min</label>
          <input className="ap-input" type="number"
            value={draft.flujoAltoAlarmaMlMin ?? ""}
            onChange={e => set("flujoAltoAlarmaMlMin", Number(e.target.value))} />

          <label>Calibration correction, %</label>
          <input className="ap-input" type="number"
            value={draft.calibrationCorrectionPct ?? ""}
            onChange={e => set("calibrationCorrectionPct", Number(e.target.value))} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   AjustesPage — Página principal
══════════════════════════════════════════════════════════════════════ */
function AjustesPage() {
  const { deviceId } = useParams();
  const navigate     = useNavigate();

  const match = findDeviceById(deviceId);
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

  /* ── Estado ── */
  const [config,           setConfig]           = useState(() => extendConfig(getCalibracionConfig(device.id)));
  const [activeTab,        setActiveTab]        = useState("generales");
  const [activeLavIdx,     setActiveLavIdx]     = useState(0);
  const [activeGrpIdx,     setActiveGrpIdx]     = useState(0);
  const [showUserLog,      setShowUserLog]      = useState(false);
  const [showUserLogBomb,  setShowUserLogBomb]  = useState(false);
  const [selectedBomba,    setSelectedBomba]    = useState(null);
  const [saved,            setSaved]            = useState(false);
  const [showOpciones,     setShowOpciones]     = useState(false);

  /* ── Helpers de actualización de config ── */
  const setGen = (k, v) => setConfig(c => ({ ...c, generales: { ...c.generales, [k]: v } }));

  const setLav = (idx, k, v) => setConfig(c => {
    const arr = [...c.lavadoras];
    arr[idx] = { ...arr[idx], [k]: v };
    return { ...c, lavadoras: arr };
  });

  const setGrp = (idx, k, v) => setConfig(c => {
    const arr = [...c.grupos];
    arr[idx] = { ...arr[idx], [k]: v };
    return { ...c, grupos: arr };
  });

  const updateBomba = (id, patch) => setConfig(c => ({
    ...c,
    bombas: c.bombas.map(b => b.id === id ? { ...b, ...patch } : b),
  }));

  const addLavadora = () => {
    const nueva = {
      id: Date.now(),
      nombre: `Lavadora ${config.lavadoras.length + 1}`,
      capacidadKg: 80,
      habilitada: true,
      washerExtractorMode: "Standard",
      prioridad: 50,
      minimumCapacityKg: 0,
      productsDeliveryWaterQuantityMl: 1500,
      productsDeliveryAirflushTimeS: 0,
      programaNuevoEmpezarDeteccion: "Deshabilitado",
      turnTimeMin: 0,
      interrumpirProgramaTrasError: false,
      interruptOnWaterError: true,
      comenzarAutomaticamenteConCapacidadMaxima: false,
      waitInputsToStopProgram: true,
      maxSignalsWithoutProgram: 0,
    };
    setConfig(c => ({ ...c, lavadoras: [...c.lavadoras, nueva] }));
    setActiveLavIdx(config.lavadoras.length);
  };

  const removeLavadora = (idx) => {
    if (!window.confirm("¿Borrar esta lavadora? También se quitará de Calibración Remota y Datos en Vivo.")) return;
    setConfig(c => ({ ...c, lavadoras: c.lavadoras.filter((_, i) => i !== idx) }));
    setActiveLavIdx(0);
  };

  const addGrupo = () => {
    const nuevo = {
      id: Date.now(),
      nombre: `Grupo Dosificación ${config.grupos.length + 1}`,
      habilitado: true,
      modo: "Modo secuencial",
      demoraAlternante: 0.5,
      caudalimetro: "Caudalímetro 2500 pls",
      caudalimetroModo: "Single Caudalímetro",
      habilitarAirFlush: false,
      levelMonitoring: "Deshabilitado",
      reportLowLoadErrorEveryS: 0,
      alcanzarFlujoPorPeriodo: 40,
      pumpSwitchOnDelayS: 0,
      volumenAguaAntesProd: 0,
      volumenAguaTrasProd: 0,
      cantidadAguaCalibradaMl: 0,
      ticsCalibradaAgua: 0,
      alarmaAguaFlujoBajo: 0,
      alarmaAguaFlujoAlto: 10000,
      waterCompensationMode: "OFF",
    };
    setConfig(c => ({ ...c, grupos: [...c.grupos, nuevo] }));
    setActiveGrpIdx(config.grupos.length);
  };

  const removeGrupo = (idx) => {
    if (!window.confirm("¿Borrar este grupo de dosificación?")) return;
    setConfig(c => ({ ...c, grupos: c.grupos.filter((_, i) => i !== idx) }));
    setActiveGrpIdx(0);
  };

  const addBomba = () => {
    if (productos.length === 0) return;
    const nueva = {
      id: Date.now(),
      nombre: `Bomba ${config.bombas.length + 1}`,
      productoId: productos[0].id,
      grupoDosificacionId: config.grupos[0]?.id ?? null,
      disablePumpDosing: false,
      stopPumpOnLowDetergentLevel: false,
      desactivarCaudalimetro: false,
      cantidadACalibrarMl: 1200,
      flujoBajoAlarmaMlMin: 100,
      flujoAltoAlarmaMlMin: 2000,
      calibrationCorrectionPct: 0,
      ticsRegistradosCaudalimetro: 3221,
      flujo: 0,
      activa: true,
    };
    setConfig(c => ({ ...c, bombas: [...c.bombas, nueva] }));
  };

  const removeBomba = (id) => {
    if (!window.confirm("¿Borrar esta bomba?")) return;
    setConfig(c => ({ ...c, bombas: c.bombas.filter(b => b.id !== id) }));
  };

  /* ── Guardar (sólo aquí se persiste en localStorage) ── */
  const handleSave = () => {
    saveCalibracionConfig(device.id, config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleConfirmBomba = (updated) => {
    updateBomba(updated.id, updated);
    setSelectedBomba(null);
  };

  const g   = config.generales;
  const lav = config.lavadoras[activeLavIdx];
  const grp = config.grupos[activeGrpIdx];

  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <div className="cd-container ap-page">

      {/* ── Header (estilo DeviceDetailPage) ── */}
      <div className="cd-header">
        <button className="cd-back-btn" onClick={() => navigate(`/dispositivos/${device.id}`)}>
          <MdArrowBack size={18} /> <span>Volver</span>
        </button>
        <div className="cd-header-title">Device settings</div>
        <div className="cd-header-actions">
          <button className="cd-header-btn" onClick={handleSave}>
            {saved
              ? <MdCheck size={18} style={{ color: "#22c55e" }} />
              : <MdRefresh size={18} />}
            <span style={saved ? { color: "#22c55e" } : {}}>{saved ? "Guardado" : "Guardar"}</span>
          </button>
          <button className="cd-header-btn" onClick={() => navigate(`/dispositivos/${device.id}`)}>
            <MdDraw size={18} /><span>Editar</span>
          </button>
          <div style={{ position: "relative" }}>
            <button className="cd-header-btn" onClick={() => setShowOpciones(v => !v)}>
              <MdMoreVert size={18} /><span>Opciones</span>
            </button>
            {showOpciones && (
              <DropdownMenu onClose={() => setShowOpciones(false)} options={[
                { label: "Ver dispositivo", icon: MdTune,
                  action: () => { navigate(`/dispositivos/${device.id}`); setShowOpciones(false); } },
              ]} />
            )}
          </div>
        </div>
      </div>

      <div className="cd-body">

        {/* ── Barra de info del dispositivo ── */}
        <section className="ap-info-bar">
          <div className="ap-info-bar-left">
            <div className="ap-info-nombre">{device.nombre}</div>
            <div className="ap-info-serial">{device.serial || "—"}</div>
            <div className="ap-info-sub"><MdLocationOn size={12} /> {device.ubicacion || "—"}</div>
            <div className="ap-info-sub"><MdApartment size={12} /> {clienteNombre}</div>
          </div>
          <div className="ap-info-bar-mid">
            <div className="ap-info-label">Multi-system v1.4.7</div>
            <div className={`cd-device-status ${device.estado === "activo" ? "cd-status-on" : "cd-status-off"}`}>
              {device.estado === "activo"
                ? <><MdSignalWifi4Bar size={11} /> Activo</>
                : <><MdSignalWifiOff size={11} /> Inactivo</>}
            </div>
          </div>
          <div className="ap-info-bar-notif">
            <div className="ap-info-label">Notificaciones del dispositivo</div>
            <div className="cd-notif-ok">✓ Sin notificaciones</div>
          </div>
        </section>

        {/* ── Pestañas principales ── */}
        <div className="cd-tabs">
          {PAGE_TABS.map(t => (
            <div key={t.key}
              className={`cd-tab${activeTab === t.key ? " cd-tab-active" : ""}`}
              onClick={() => setActiveTab(t.key)}>
              {t.label}
            </div>
          ))}
        </div>

        <div className="ap-tab-body">

          {/* ══════════ TAB 1 — Ajustes generales ══════════ */}
          {activeTab === "generales" && (
            <div className="ap-tab-content">

              {/* Keyboard Ajustes */}
              <div className="ap-section">
                <div className="ap-section-title">Keyboard Ajustes (Program selector)</div>
                <div className="ap-checkbox-grid">
                  {[
                    ["buttonSounds",                 "Button sounds"],
                    ["mostrarSugerencias",            "Mostrar sugerencias en teclado"],
                    ["useButtons",                   "Use buttons"],
                    ["stopPrograms",                 "Stop programs"],
                    ["calibrador",                      "Calibrador"],
                    ["cebar",                        "Cebar"],
                    ["showErrors",                   "Show errors"],
                    ["separatedWashExtractorErrors", "Separated wash extractor errors"],
                  ].map(([k, label]) => (
                    <label key={k} className="ap-checkbox-label">
                      <input type="checkbox" checked={!!g[k]}
                        onChange={e => setGen(k, e.target.checked)} />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="ap-fields-row" style={{ marginTop: 14 }}>
                  <div className="ap-field" style={{ maxWidth: 260 }}>
                    <label>Measurement system</label>
                    <select className="ap-select" value={g.measurementSystem}
                      onChange={e => setGen("measurementSystem", e.target.value)}>
                      <option>Metric</option>
                      <option>Imperial</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Valve check settings */}
              <div className="ap-section">
                <div className="ap-section-title">Valve check settings</div>
                <div className="ap-fields-row">
                  <div className="ap-field">
                    <label>Duración comprobación válvula (s)</label>
                    <input className="ap-input" type="number"
                      value={g.duracionComprobacionValvula}
                      onChange={e => setGen("duracionComprobacionValvula", Number(e.target.value))} />
                  </div>
                  <div className="ap-field">
                    <label>Cantidad comprobación válvula (ml)</label>
                    <input className="ap-input" type="number"
                      value={g.cantidadComprobacionValvula}
                      onChange={e => setGen("cantidadComprobacionValvula", Number(e.target.value))} />
                  </div>
                  <div className="ap-field">
                    <label>Periodo de auto-comprobación válvula (horas)</label>
                    <input className="ap-input" type="number"
                      value={g.periodoAutoComprobacionValvula}
                      onChange={e => setGen("periodoAutoComprobacionValvula", Number(e.target.value))} />
                  </div>
                </div>
              </div>

              {/* Advanced valve check — azul */}
              <div className="ap-section ap-section-advanced">
                <div className="ap-section-title ap-title-white">Advanced valve check settings</div>
                <div className="ap-fields-row ap-align-center">
                  <label className="ap-checkbox-label ap-checkbox-white">
                    <input type="checkbox" checked={!!g.comprobarValvulaAlarma}
                      onChange={e => setGen("comprobarValvulaAlarma", e.target.checked)} />
                    Comprobar válvula alarma
                  </label>
                  <div className="ap-field" style={{ maxWidth: 260 }}>
                    <label className="ap-label-white">Acción falla válvula</label>
                    <select className="ap-select ap-select-dark" value={g.accionFallaValvula}
                      onChange={e => setGen("accionFallaValvula", e.target.value)}>
                      <option>Informar solo</option>
                      <option>Parar programa</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Other Ajustes */}
              <div className="ap-section">
                <div className="ap-section-title">Other Ajustes</div>
                <div className="ap-checkbox-grid">
                  {[
                    ["internalAlarm",           "Internal alarm"],
                    ["ExternalAlarm",            "External alarm"],
                    ["lowDetergentLevelAlarm",   "Low detergent level alarm"],
                    ["autoSyncWashExtractors",   "Auto sync wash extractors live data"],
                  ].map(([k, label]) => (
                    <label key={k} className="ap-checkbox-label">
                      <input type="checkbox" checked={!!g[k]}
                        onChange={e => setGen(k, e.target.checked)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Tabs settings */}
              <div className="ap-section">
                <div className="ap-section-title">Tabs settings</div>
                <div className="ap-checkbox-grid">
                  {[
                    ["tabAjustesLavadora",          "Ajustes lavadora"],
                    ["tabAjustesGrupoDosificacion",  "Ajustes grupo dosificación"],
                    ["tabAjustesDeBomba",            "Ajustes de bomba"],
                    ["tabOzoneSettings",             "Ozone settings"],
                  ].map(([k, label]) => (
                    <label key={k} className="ap-checkbox-label">
                      <input type="checkbox" checked={!!g[k]}
                        onChange={e => setGen(k, e.target.checked)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Advanced other settings — azul */}
              <div className="ap-section ap-section-advanced">
                <div className="ap-section-title ap-title-white">Advanced other settings</div>
                <div className="ap-checkbox-grid">
                  {[
                    ["interrumpirDosisAnterior",       "Interromper dosis del paso anterior"],
                    ["overdosingProtection",           "Overdosing protection"],
                    ["stopProgramOnModuleDisconnect",  "Stop program on module disconnect"],
                  ].map(([k, label]) => (
                    <label key={k} className="ap-checkbox-label ap-checkbox-white">
                      <input type="checkbox" checked={!!g[k]}
                        onChange={e => setGen(k, e.target.checked)} />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="ap-field" style={{ marginTop: 16, maxWidth: 400 }}>
                  <label className="ap-label-white">
                    Periodo films (Mayor {g.periodoFilms})
                  </label>
                  <input className="ap-slider" type="range" min={0} max={100}
                    value={g.periodoFilms}
                    onChange={e => setGen("periodoFilms", Number(e.target.value))} />
                </div>
              </div>

              {/* User log (colapsable) */}
              <div className="ap-section ap-collapsible-section">
                <div className="ap-collapsible-header">
                  <span className="ap-collapsible-title">User log</span>
                  <button className="ap-show-btn"
                    onClick={() => setShowUserLog(v => !v)}>
                    {showUserLog
                      ? <><MdExpandLess size={14} /> Ocultar</>
                      : <><MdExpandMore size={14} /> Mostrar</>}
                  </button>
                </div>
                {showUserLog && (
                  <div className="ap-userlog-body">
                    <p className="ap-empty-text">No hay entradas en el log de usuario.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════ TAB 2 — Ajustes lavadora ══════════ */}
          {activeTab === "lavadoras" && (
            <div className="ap-tab-content">
              {config.lavadoras.length === 0 ? (
                <div className="ap-empty">
                  <p>No hay lavadoras configuradas para este dispositivo.</p>
                  <button className="ap-pill ap-pill-add" onClick={addLavadora} style={{ marginTop: 10 }}>
                    + Añadir lavadora
                  </button>
                </div>
              ) : (
                <>
                  {/* Pills de lavadoras */}
                  <div className="ap-pills">
                    {config.lavadoras.map((l, idx) => (
                      <button key={l.id}
                        className={`ap-pill${activeLavIdx === idx ? " ap-pill-active" : ""}`}
                        onClick={() => setActiveLavIdx(idx)}>
                        {l.nombre}
                      </button>
                    ))}
                    <button className="ap-pill ap-pill-add" onClick={addLavadora} style={{ borderStyle: "dashed" }}>
                      + Añadir lavadora
                    </button>
                  </div>

                  {lav && (
                    <>
                      {/* Sección principal lavadora */}
                      <div className="ap-section">
                        <div className="ap-section-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="ap-section-title" style={{ marginBottom: 0 }}>{lav.nombre}</span>
                            <span className={`ap-badge ${lav.habilitada !== false ? "ap-badge-habilitado" : "ap-badge-deshabilitado"}`}>
                              {lav.habilitada !== false ? "Habilitado" : "Deshabilitado"}
                            </span>
                          </div>
                          <button onClick={() => removeLavadora(activeLavIdx)} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "Sora" }}>
                            Eliminar lavadora
                          </button>
                        </div>

                        {/* Estado toggle */}
                        <div style={{ marginBottom: 14 }}>
                          <label className="ap-checkbox-label">
                            <input type="checkbox" checked={lav.habilitada !== false}
                              onChange={e => setLav(activeLavIdx, "habilitada", e.target.checked)} />
                            Habilitado
                          </label>
                        </div>

                        <div className="ap-fields-row">
                          <div className="ap-field">
                            <label>Wash Extractor name</label>
                            <input className="ap-input" value={lav.nombre}
                              onChange={e => setLav(activeLavIdx, "nombre", e.target.value)} />
                          </div>
                          <div className="ap-field">
                            <label>Washer extractor mode</label>
                            <select className="ap-select" value={lav.washerExtractorMode || "Standard"}
                              onChange={e => setLav(activeLavIdx, "washerExtractorMode", e.target.value)}>
                              <option>Standard</option>
                              <option>Advanced</option>
                            </select>
                          </div>
                        </div>

                        <div className="ap-field" style={{ marginTop: 14, maxWidth: 400 }}>
                          <label>Prioridad (Menor → Mayor) — {lav.prioridad ?? 50}</label>
                          <input className="ap-slider" type="range" min={0} max={100}
                            value={lav.prioridad ?? 50}
                            onChange={e => setLav(activeLavIdx, "prioridad", Number(e.target.value))} />
                          <div className="ap-slider-labels">
                            <span>Menor</span><span>Mayor</span>
                          </div>
                        </div>

                        <div className="ap-fields-row" style={{ marginTop: 14 }}>
                          {[
                            ["capacidadKg",                   "Capacidad de Lavadora kg"],
                            ["minimumCapacityKg",             "Minimum Wash extractor capacity kg"],
                            ["productsDeliveryWaterQuantityMl","Products delivery water quantity ml"],
                            ["productsDeliveryAirflushTimeS", "Products delivery airflush time s"],
                          ].map(([k, label]) => (
                            <div key={k} className="ap-field">
                              <label>{label}</label>
                              <input className="ap-input" type="number" value={lav[k] ?? ""}
                                onChange={e => setLav(activeLavIdx, k, Number(e.target.value))} />
                            </div>
                          ))}

                          <div className="ap-field">
                            <label>Programa nuevo empezar detección señal de entrada</label>
                            <select className="ap-select"
                              value={lav.programaNuevoEmpezarDeteccion || "Deshabilitado"}
                              onChange={e => setLav(activeLavIdx, "programaNuevoEmpezarDeteccion", e.target.value)}>
                              <option>Deshabilitado</option>
                              <option>Habilitado</option>
                            </select>
                          </div>
                          <div className="ap-field">
                            <label>Turn time min</label>
                            <input className="ap-input" type="number" value={lav.turnTimeMin ?? ""}
                              onChange={e => setLav(activeLavIdx, "turnTimeMin", Number(e.target.value))} />
                          </div>
                        </div>
                      </div>

                      {/* Advanced lavadora — azul */}
                      <div className="ap-section ap-section-advanced">
                        <div className="ap-section-title ap-title-white">Advanced {lav.nombre}</div>
                        <div className="ap-checkbox-grid">
                          {[
                            ["interrumpirProgramaTrasError",                 "Interrumpir programa tras error"],
                            ["interruptOnWaterError",                       "Interrupt on water error"],
                            ["comenzarAutomaticamenteConCapacidadMaxima",   "Comenzar automáticamente con capacidad máxima"],
                            ["waitInputsToStopProgram",                     "Wait inputs to stop program"],
                          ].map(([k, label]) => (
                            <label key={k} className="ap-checkbox-label ap-checkbox-white">
                              <input type="checkbox" checked={!!lav[k]}
                                onChange={e => setLav(activeLavIdx, k, e.target.checked)} />
                              {label}
                            </label>
                          ))}
                        </div>
                        <div className="ap-field" style={{ marginTop: 14, maxWidth: 200 }}>
                          <label className="ap-label-white">Max signals without a program</label>
                          <input className="ap-input ap-input-dark" type="number"
                            value={lav.maxSignalsWithoutProgram ?? ""}
                            onChange={e => setLav(activeLavIdx, "maxSignalsWithoutProgram", Number(e.target.value))} />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══════════ TAB 3 — Ajustes grupo dosificacion ══════════ */}
          {activeTab === "grupos" && (
            <div className="ap-tab-content">
              {config.grupos.length === 0 ? (
                <div className="ap-empty">
                  <p>No hay grupos de dosificación configurados.</p>
                  <button className="ap-pill ap-pill-add" onClick={addGrupo} style={{ marginTop: 10 }}>
                    + Añadir grupo
                  </button>
                </div>
              ) : (
                <>
                  {/* Pills de grupos */}
                  <div className="ap-pills">
                    {config.grupos.map((gr, idx) => (
                      <button key={gr.id}
                        className={`ap-pill${activeGrpIdx === idx ? " ap-pill-active" : ""}`}
                        onClick={() => setActiveGrpIdx(idx)}>
                        {gr.nombre}
                      </button>
                    ))}
                    <button className="ap-pill ap-pill-add" onClick={addGrupo} style={{ borderStyle: "dashed" }}>
                      + Añadir grupo
                    </button>
                  </div>

                  {grp && (
                    <>
                      {/* Ajustes generales del grupo */}
                      <div className="ap-section">
                        <div className="ap-section-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="ap-section-title" style={{ marginBottom: 0 }}>
                              Ajustes generales ({grp.nombre})
                            </span>
                            <span className={`ap-badge ${grp.habilitado !== false ? "ap-badge-habilitado" : "ap-badge-deshabilitado"}`}>
                              {grp.habilitado !== false ? "Habilitado" : "Deshabilitado"}
                            </span>
                          </div>
                          <button onClick={() => removeGrupo(activeGrpIdx)} style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: "Sora" }}>
                            Eliminar grupo
                          </button>
                        </div>

                        <div className="ap-fields-row">
                          <div className="ap-field">
                            <label>Modo</label>
                            <select className="ap-select" value={grp.modo || "Modo secuencial"}
                              onChange={e => setGrp(activeGrpIdx, "modo", e.target.value)}>
                              <option>Modo secuencial</option>
                              <option>Modo paralelo</option>
                            </select>
                          </div>
                          <div className="ap-field">
                            <label>Caudalímetro</label>
                            <select className="ap-select" value={grp.caudalimetro}
                              onChange={e => setGrp(activeGrpIdx, "caudalimetro", e.target.value)}>
                              <option>Caudalímetro 2500 pls</option>
                              <option>Caudalímetro 1000 pls</option>
                              <option>Caudalímetro 5000 pls</option>
                            </select>
                          </div>
                          <div className="ap-field">
                            <label>Caudalímetro modo</label>
                            <select className="ap-select" value={grp.caudalimetroModo}
                              onChange={e => setGrp(activeGrpIdx, "caudalimetroModo", e.target.value)}>
                              <option>Single Caudalímetro</option>
                              <option>Multiple Caudalímetro</option>
                            </select>
                          </div>
                        </div>

                        <div className="ap-field" style={{ marginTop: 14, maxWidth: 400 }}>
                          <label>Demora Alternante (Rápido {grp.demoraAlternante}s)</label>
                          <input className="ap-slider" type="range" min={0.1} max={5} step={0.1}
                            value={grp.demoraAlternante ?? 0.5}
                            onChange={e => setGrp(activeGrpIdx, "demoraAlternante", Number(e.target.value))} />
                        </div>

                        <div style={{ marginTop: 14 }}>
                          <label className="ap-checkbox-label">
                            <input type="checkbox" checked={!!grp.habilitarAirFlush}
                              onChange={e => setGrp(activeGrpIdx, "habilitarAirFlush", e.target.checked)} />
                            Habilitar Air Flush
                          </label>
                        </div>
                      </div>

                      {/* Level monitoring */}
                      <div className="ap-section">
                        <div className="ap-section-title">Level monitoring settings ({grp.nombre})</div>
                        <div className="ap-fields-row">
                          <div className="ap-field">
                            <label>Level monitoring</label>
                            <select className="ap-select" value={grp.levelMonitoring}
                              onChange={e => setGrp(activeGrpIdx, "levelMonitoring", e.target.value)}>
                              <option>Deshabilitado</option>
                              <option>Habilitado</option>
                            </select>
                          </div>
                          <div className="ap-field">
                            <label>Report low load error every seconds (s)</label>
                            <input className="ap-input" type="number"
                              value={grp.reportLowLoadErrorEveryS ?? ""}
                              onChange={e => setGrp(activeGrpIdx, "reportLowLoadErrorEveryS", Number(e.target.value))} />
                          </div>
                        </div>
                      </div>

                      {/* Advanced general — azul */}
                      <div className="ap-section ap-section-advanced">
                        <div className="ap-section-title ap-title-white">
                          Advanced general settings ({grp.nombre})
                        </div>
                        <div className="ap-fields-row">
                          <div className="ap-field">
                            <label className="ap-label-white">
                              Alcanzar flujo por periodo (Normal {grp.alcanzarFlujoPorPeriodo}s)
                            </label>
                            <input className="ap-slider" type="range" min={1} max={120}
                              value={grp.alcanzarFlujoPorPeriodo ?? 40}
                              onChange={e => setGrp(activeGrpIdx, "alcanzarFlujoPorPeriodo", Number(e.target.value))} />
                          </div>
                          <div className="ap-field">
                            <label className="ap-label-white">Pump switch ON delay (s)</label>
                            <input className="ap-input ap-input-dark" type="number"
                              value={grp.pumpSwitchOnDelayS ?? ""}
                              onChange={e => setGrp(activeGrpIdx, "pumpSwitchOnDelayS", Number(e.target.value))} />
                          </div>
                        </div>
                      </div>

                      {/* Water settings */}
                      <div className="ap-section">
                        <div className="ap-section-title">Water settings ({grp.nombre})</div>
                        <div className="ap-fields-row">
                          {[
                            ["volumenAguaAntesProd",   "Volumen de agua antes del producto químico (ml)"],
                            ["volumenAguaTrasProd",    "Volumen de agua tras producto químico (ml)"],
                            ["cantidadAguaCalibradaMl","Cantidad de agua calibrada (ml)"],
                            ["ticsCalibradaAgua",      "Tics de calibración agua"],
                          ].map(([k, label]) => (
                            <div key={k} className="ap-field">
                              <label>{label}</label>
                              <input className="ap-input" type="number" value={grp[k] ?? ""}
                                onChange={e => setGrp(activeGrpIdx, k, Number(e.target.value))} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Advanced water — azul */}
                      <div className="ap-section ap-section-advanced">
                        <div className="ap-section-title ap-title-white">
                          Advanced water settings ({grp.nombre})
                        </div>
                        <div className="ap-fields-row">
                          <div className="ap-field">
                            <label className="ap-label-white">Alarma de agua flujo bajo (ml/min)</label>
                            <input className="ap-input ap-input-dark" type="number"
                              value={grp.alarmaAguaFlujoBajo ?? ""}
                              onChange={e => setGrp(activeGrpIdx, "alarmaAguaFlujoBajo", Number(e.target.value))} />
                          </div>
                          <div className="ap-field">
                            <label className="ap-label-white">Alarma de agua flujo alto (ml/min)</label>
                            <input className="ap-input ap-input-dark" type="number"
                              value={grp.alarmaAguaFlujoAlto ?? ""}
                              onChange={e => setGrp(activeGrpIdx, "alarmaAguaFlujoAlto", Number(e.target.value))} />
                          </div>
                        </div>
                      </div>

                      {/* Advanced agua compensation — azul */}
                      <div className="ap-section ap-section-advanced">
                        <div className="ap-section-title ap-title-white">
                          Advanced Agua Compensation Ajustes ({grp.nombre})
                        </div>
                        <div className="ap-field" style={{ maxWidth: 260 }}>
                          <label className="ap-label-white">Water compensation mode</label>
                          <select className="ap-select ap-select-dark"
                            value={grp.waterCompensationMode || "OFF"}
                            onChange={e => setGrp(activeGrpIdx, "waterCompensationMode", e.target.value)}>
                            <option>OFF</option>
                            <option>ON</option>
                            <option>Automático</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══════════ TAB 4 — Ajustes de bomba ══════════ */}
          {activeTab === "bombas" && (
            <div className="ap-tab-content">
              <div className="ap-section">
                <div className="ap-section-title">Pumps</div>

                {productos.length === 0 ? (
                  <div className="ap-empty">
                    Registra al menos un producto químico para este cliente antes de configurar bombas.
                  </div>
                ) : config.bombas.length === 0 ? (
                  <div className="ap-empty">No hay bombas configuradas para este dispositivo.</div>
                ) : (
                  <div className="ap-table-wrap">
                    <table className="ap-table">
                      <thead>
                        <tr>
                          <th>Grupo Dosificación</th>
                          <th>Bomba</th>
                          <th>Productos químicos</th>
                          <th>Precio</th>
                          <th>Cantidad a calibrar ml</th>
                          <th>Flujo bajo alarma</th>
                          <th>Flujo alto alarma</th>
                          <th>Flujo</th>
                          <th>Disable pump dosing</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {config.bombas.map(bomba => {
                          const prod  = productos.find(p => String(p.id) === String(bomba.productoId));
                          const grupo = config.grupos.find(gr => String(gr.id) === String(bomba.grupoDosificacionId));
                          return (
                            <tr key={bomba.id} className="ap-table-row"
                              onClick={() => setSelectedBomba({ ...bomba })}>
                              <td className="ap-td-link">{grupo?.nombre || "—"}</td>
                              <td>{bomba.nombre}</td>
                              <td className="ap-td-link">{prod?.nombre || "—"}</td>
                              <td>{prod ? `${prod.precio.toFixed(2)} EUR/L` : "—"}</td>
                              <td>{bomba.cantidadACalibrarMl ?? bomba.objetivoMl ?? "—"} ml/min</td>
                              <td>{bomba.flujoBajoAlarmaMlMin ?? bomba.flujoBajoAlarma ?? "—"} ml/min</td>
                              <td>{bomba.flujoAltoAlarmaMlMin ?? bomba.flujoAltoAlarma ?? "—"} ml/min</td>
                              <td>{bomba.flujo ?? 0}</td>
                              <td onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={!!bomba.disablePumpDosing}
                                  onChange={e => updateBomba(bomba.id, { disablePumpDosing: e.target.checked })} />
                              </td>
                              <td onClick={e => e.stopPropagation()}>
                                <button onClick={() => removeBomba(bomba.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px" }} title="Borrar bomba">
                                  <MdDelete size={16} color="#ef4444" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {productos.length > 0 && (
                  <button className="cd-add-btn" onClick={addBomba} style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 5, background: "#eff6ff", border: "1px dashed #3b82f6", borderRadius: "8px", color: "#3b82f6", fontSize: "12px", fontWeight: "600", padding: "8px 16px", cursor: "pointer", fontFamily: "Sora" }}>
                    <MdAdd size={15} /> Añadir bomba
                  </button>
                )}
              </div>

              {/* User log bombas (colapsable) */}
              <div className="ap-section ap-collapsible-section">
                <div className="ap-collapsible-header">
                  <span className="ap-collapsible-title">User log</span>
                  <button className="ap-show-btn"
                    onClick={() => setShowUserLogBomb(v => !v)}>
                    {showUserLogBomb
                      ? <><MdExpandLess size={14} /> Ocultar</>
                      : <><MdExpandMore size={14} /> Mostrar</>}
                  </button>
                </div>
                {showUserLogBomb && (
                  <div className="ap-userlog-body">
                    <p className="ap-empty-text">No hay entradas en el log de usuario.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════ TAB 5 — Ozone settings ══════════ */}
          {activeTab === "ozone" && (
            <div className="ap-tab-content">
              <div className="ap-section ap-ozone-placeholder">
                <div className="ap-ozone-icon">⚗️</div>
                <p>Configuración de ozono disponible próximamente.</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Modal edición de bomba ── */}
      {selectedBomba && (
        <BombaModal
          bomba={selectedBomba}
          grupos={config.grupos}
          productos={productos}
          onConfirm={handleConfirmBomba}
          onClose={() => setSelectedBomba(null)}
        />
      )}
    </div>
  );
}

export default AjustesPage;
