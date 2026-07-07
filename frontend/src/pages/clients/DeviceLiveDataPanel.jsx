// Panel "Datos en Vivo" de un dispositivo — sección 5.9 de la especificación.
// Extraído de DatosEnVivoModal.jsx para poder EMBEBERSE directamente dentro
// de la página de detalle de dispositivo (DeviceDetailPage.jsx), en vez de
// abrirse como modal. Dos vistas desde el mismo toggle:
//   1. "Lavadoras extractoras" — tarjetas grandes con barras de progreso por bomba.
//   2. "Ajustes esquemáticos" — diagrama P&ID con los assets reales del proyecto.
import { useState, useEffect, useCallback } from "react";
import { MdRefresh, MdKeyboardArrowDown } from "react-icons/md";
import { getCalibracionConfig } from "../../services/localMock";
import { simulateDeviceLiveState } from "../../services/deviceLiveSimulation";
import bombaPng      from "../../assets/bomba.png";
import flujometroPng from "../../assets/flujometro.png";
import depositoPng   from "../../assets/deposito-de-agua.png";
import valvulaPng    from "../../assets/valvula.png";
import flechaPng     from "../../assets/flecha-hacia-arriba.png";
import "./DatosEnVivoModal.css";

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}min ${s}s`;
}

function dotClass(lav) {
  return lav.disabled ? "disabled" : lav.running ? "running" : "idle";
}

// ── Barra de progreso de una bomba (vista tarjetas) ──
function BombaBar({ bomba }) {
  const pct = bomba.totalMl > 0 ? Math.min(100, (bomba.doneMl / bomba.totalMl) * 100) : 0;
  const fill = bomba.estado === "completado" ? "ok" : bomba.estado === "error" ? "error" : "pend";
  const textDark = bomba.estado === "pendiente";
  return (
    <div className="dev-bomba-bar-wrap">
      <div className={`dev-bomba-bar-fill ${fill}`} style={{ width: `${pct}%` }} />
      <div className={`dev-bomba-bar-label${textDark ? " dark" : ""}`}>
        {bomba.nombre} — {bomba.productoNombre} {bomba.doneMl} ml/{bomba.totalMl} ml
      </div>
    </div>
  );
}

// ── Drum SVG al pie de cada tarjeta de lavadora (vista esquema) ──
function DrumSVG({ running }) {
  return (
    <svg width="64" height="42" viewBox="0 0 64 42" style={{ display: "block", margin: "0 auto" }}>
      <rect x="1" y="1" width="62" height="40" rx="5" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="1" y="26" width="62" height="15" rx="0" fill={running ? "#3b82f6" : "#94a3b8"} opacity="0.35" />
      <rect x="1" y="32" width="62" height="9" rx="0" fill={running ? "#2563eb" : "#64748b"} opacity="0.5" />
      <circle cx="32" cy="19" r="13" fill="#fff" stroke="#94a3b8" strokeWidth="1.5" />
      <circle cx="32" cy="19" r="8" fill={running ? "#bfdbfe" : "#e2e8f0"} stroke={running ? "#3b82f6" : "#94a3b8"} strokeWidth="1" />
      <circle cx="32" cy="19" r="3.5" fill={running ? "#3b82f6" : "#94a3b8"} />
    </svg>
  );
}

// ── Mini-tarjeta de lavadora para el esquema ──
function EsquemaLavCard({ lav }) {
  const borderColor = lav.disabled ? "#f59e0b" : lav.running ? "#22c55e" : "#94a3b8";
  return (
    <div className="dev-esquema-lav-card" style={{ borderColor }}>
      <div className="dev-esquema-lav-name" style={{ borderBottom: `2px solid ${borderColor}`, paddingBottom: 3 }}>
        {lav.nombre}
      </div>
      {lav.disabled ? (
        <div style={{ fontSize: 9.5, color: "#b45309", fontWeight: 700 }}>Deshabilitada</div>
      ) : !lav.running ? (
        <>
          <div className="dev-esquema-lav-row"><span>Pr.</span><strong>Not running</strong></div>
          <div className="dev-esquema-lav-row"><span>Temp.</span><strong>N/A</strong></div>
        </>
      ) : (
        <>
          <div className="dev-esquema-lav-row">
            <span>Pr.</span>
            <strong style={{ maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {lav.programaNombre}
            </strong>
          </div>
          <div className="dev-esquema-lav-row"><span>Cap.</span><strong>{lav.capacidadKg} kg</strong></div>
          <div className="dev-esquema-lav-row"><span>Steps</span><strong>{lav.pasoActual}/{lav.pasosTotal}</strong></div>
          <div className="dev-esquema-lav-row"><span>Temp.</span><strong>N/A</strong></div>
          <div className="dev-esquema-lav-row">
            <span>Start</span>
            <strong style={{ fontSize: 9 }}>{lav.startTime?.toLocaleDateString()}</strong>
          </div>
          <div className="dev-esquema-lav-row"><span>Dur.</span><strong>{formatDuration(lav.elapsedSeconds)}</strong></div>
        </>
      )}
      <div className="dev-esquema-drum">
        <DrumSVG running={lav.running} />
      </div>
    </div>
  );
}

// ── Diagrama P&ID completo ──
// Columnas SUPERIORES = lavadoras del dispositivo.
// Columnas INFERIORES = productos del cliente (bombas→producto si hay
// bombas configuradas; si no, los productos del cliente directamente).
function DiagramaEsquematico({ lavadoras, bombas, productos, grupoNombre }) {
  if (lavadoras.length === 0 && productos.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "#64748b" }}>
        Sin lavadoras ni productos configurados. Agrégalos desde “Ajustes” y la pestaña “Productos”.
      </p>
    );
  }

  const bottomItems = bombas.length > 0
    ? bombas.map((bomba, i) => ({
        key: `bomba-${bomba.id}`,
        producto: productos.find((p) => p.id === bomba.productoId) ?? null,
        flujo: bomba.objetivoMl ?? Math.round(800 + i * 200),
      }))
    : productos.map((producto, i) => ({
        key: `prod-${producto.id}`,
        producto,
        flujo: Math.round(800 + i * 200),
      }));

  const numCols = Math.max(lavadoras.length, bottomItems.length, 1);
  const midCol = Math.floor(numCols / 2);

  return (
    <div>
      <div className="dev-esquema-filtros">
        <div className="dev-esquema-filtro-item">
          <label>Grupo Dosificación</label>
          <select><option>{grupoNombre}</option></select>
        </div>
        <div className="dev-esquema-filtro-item">
          <label>Modo</label>
          <select><option>Modo secuencial</option></select>
        </div>
        <div className="dev-esquema-filtro-item">
          <label>Caudalímetro modo</label>
          <select><option>Single Caudalímetro</option></select>
        </div>
        <div className="dev-esquema-estado-badge">Habilitado</div>
      </div>

      <div className="dev-pid-scroll">
        <div className="dev-pid-diagram">

          {lavadoras.length > 0 && (
            <div className="dev-pid-row">
              <div className="dev-pid-label" />
              <div style={{ display: "flex" }}>
                {Array.from({ length: numCols }).map((_, i) => (
                  <div key={i} className="dev-pid-col">
                    {i < lavadoras.length
                      ? <EsquemaLavCard lav={lavadoras[i]} />
                      : <div style={{ width: 132, height: 10 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {lavadoras.length > 0 && (
            <div className="dev-pid-row" style={{ height: 22 }}>
              <div className="dev-pid-label" />
              <div style={{ display: "flex" }}>
                {Array.from({ length: numCols }).map((_, i) => (
                  <div key={i} className="dev-pid-col" style={{ justifyContent: "center" }}>
                    {i < lavadoras.length && <div className="dev-pid-vline blue" style={{ height: 22 }} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {lavadoras.length > 0 && (
            <div className="dev-pid-row dev-pid-air-row" style={{ height: 60 }}>
              <div className="dev-pid-label"><span className="dev-pid-tag air">AIR →</span></div>
              <div className="dev-pid-cols-wrap">
                {Array.from({ length: numCols }).map((_, i) => (
                  <div key={i} className="dev-pid-col" style={{ height: 60, justifyContent: "center" }}>
                    {i < lavadoras.length && <img src={valvulaPng} className="dev-pid-img valvula" alt="válvula" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {lavadoras.length > 0 && (
            <div className="dev-pid-row" style={{ height: 80 }}>
              <div className="dev-pid-label" />
              <div style={{ display: "flex" }}>
                {Array.from({ length: numCols }).map((_, i) => (
                  <div key={i} className="dev-pid-col" style={{ justifyContent: "center" }}>
                    {i === midCol ? (
                      <div className="dev-pid-flujometro-wrap">
                        <img src={flujometroPng} alt="caudalímetro" style={{ width: 44, height: 26 }} />
                        <div className="dev-pid-flujo-val">2500 pls</div>
                      </div>
                    ) : (
                      <div className="dev-pid-vline cyan" style={{ height: 80 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="dev-pid-row dev-pid-agua-row" style={{ height: 64 }}>
            <div className="dev-pid-label"><span className="dev-pid-tag agua">AGUA →</span></div>
            <div className="dev-pid-cols-wrap">
              {Array.from({ length: numCols }).map((_, i) => {
                const item = bottomItems[i];
                return (
                  <div key={i} className="dev-pid-col" style={{ height: 64, justifyContent: "center" }}>
                    {item ? <img src={bombaPng} className="dev-pid-img bomba" alt="bomba" />
                          : <div className="dev-pid-vline cyan" style={{ height: 40 }} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dev-pid-row" style={{ height: 44 }}>
            <div className="dev-pid-label" />
            <div style={{ display: "flex" }}>
              {Array.from({ length: numCols }).map((_, i) => {
                const item = bottomItems[i];
                return (
                  <div key={i} className="dev-pid-col" style={{ justifyContent: "center", gap: 2 }}>
                    {item && (
                      <>
                        <div className="dev-pid-flow-label">{item.flujo} ml</div>
                        <img src={flechaPng} className="dev-pid-img flecha" alt="flujo" style={{ transform: "rotate(180deg)" }} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dev-pid-row" style={{ paddingBottom: 20 }}>
            <div className="dev-pid-label" />
            <div style={{ display: "flex" }}>
              {Array.from({ length: numCols }).map((_, i) => {
                const item = bottomItems[i];
                const nombreProducto = item?.producto?.nombre ?? null;
                return (
                  <div key={i} className="dev-pid-col" style={{ justifyContent: "center", gap: 4 }}>
                    {item && (
                      <>
                        <img src={depositoPng} className="dev-pid-img deposito" alt="producto" />
                        <div className="dev-pid-producto-label" title={nombreProducto ?? "—"}>{nombreProducto ?? "—"}</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Panel principal (embebido, sin modal) ──
function DeviceLiveDataPanel({ dispositivo, productos }) {
  const [lavadoras, setLavadoras] = useState(() => simulateDeviceLiveState(dispositivo.id, productos));
  const [config]   = useState(() => getCalibracionConfig(dispositivo.id));
  const [vista, setVista] = useState("tarjetas");
  const [showToggle, setShowToggle] = useState(false);

  const refrescar = useCallback(() => {
    setLavadoras(simulateDeviceLiveState(dispositivo.id, productos));
  }, [dispositivo.id, productos]);

  useEffect(() => {
    const id = setInterval(refrescar, 8000);
    return () => clearInterval(id);
  }, [refrescar]);

  const grupoNombre = config.grupos.find((g) => g.habilitado !== false)?.nombre ?? "Grupo Dosificación 1";
  const bombasActivas = config.bombas.filter((b) => b.activa !== false);
  const vistaLabel = vista === "tarjetas" ? `(${lavadoras.length}) Lavadoras extractoras` : "Ajustes esquemáticos";

  return (
    <div className="dev-modal-body">
      <div className="dev-toolbar">
        <div style={{ position: "relative" }}>
          <button className="dev-view-toggle" onClick={() => setShowToggle((v) => !v)}>
            {vistaLabel}
            <MdKeyboardArrowDown size={18} style={{ transition: "transform 0.2s", transform: showToggle ? "rotate(180deg)" : "none" }} />
          </button>
          {showToggle && (
            <div style={{
              position: "absolute", top: "110%", left: 0, zIndex: 50,
              background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)", minWidth: 230, overflow: "hidden",
            }}>
              {[
                { key: "tarjetas", label: `(${lavadoras.length}) Lavadoras extractoras` },
                { key: "esquema",  label: "Ajustes esquemáticos" },
              ].map((opt) => (
                <div
                  key={opt.key}
                  onClick={() => { setVista(opt.key); setShowToggle(false); }}
                  style={{
                    padding: "11px 16px", fontSize: 13, cursor: "pointer",
                    fontWeight: vista === opt.key ? 700 : 500,
                    color: vista === opt.key ? "#2563eb" : "#1e293b",
                    background: vista === opt.key ? "#eff6ff" : "transparent",
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="cd-icon-btn" title="Actualizar" onClick={refrescar}>
          <MdRefresh size={18} />
        </button>
      </div>

      {vista === "tarjetas" && (
        lavadoras.length === 0 ? (
          <p style={{ fontSize: 13, color: "#64748b" }}>Sin lavadoras configuradas. Agrégalas desde "Ajustes".</p>
        ) : (
          <div className="dev-grid">
            {lavadoras.map((lav) => (
              <div key={lav.lavadoraId} className={`dev-card${lav.disabled ? " dev-card-disabled" : ""}`}>
                <h4 className="dev-card-title">
                  <span className={`dev-dot ${dotClass(lav)}`} />
                  {lav.nombre}
                </h4>
                {lav.disabled ? (
                  <div className="dev-field-row">
                    <span className="dev-field-label">Estado</span>
                    <span className="dev-field-value dev-disabled-label">Deshabilitada (ver Ajustes)</span>
                  </div>
                ) : !lav.running ? (
                  <>
                    <div className="dev-field-row"><span className="dev-field-label">Programa</span><span className="dev-field-value dev-not-running">Not running</span></div>
                    <div className="dev-field-row"><span className="dev-field-label">Temperatura</span><span className="dev-field-value">N/A</span></div>
                  </>
                ) : (
                  <>
                    <div className="dev-field-row"><span className="dev-field-label">Programa</span><span className="dev-field-value">{lav.programaNombre} ({lav.programaNumero})</span></div>
                    <div className="dev-field-row"><span className="dev-field-label">Capacidad, kg</span><span className="dev-field-value">{lav.capacidadKg.toFixed(2)} kg</span></div>
                    <div className="dev-field-row"><span className="dev-field-label">Pasos</span><span className="dev-field-value">{lav.pasoActual}/{lav.pasosTotal}</span></div>
                    <div className="dev-field-row"><span className="dev-field-label">Temperatura</span><span className="dev-field-value">N/A</span></div>
                    <div className="dev-field-row"><span className="dev-field-label">Start time</span><span className="dev-field-value">{lav.startTime.toLocaleString()}</span></div>
                    <div className="dev-field-row"><span className="dev-field-label">Duration</span><span className="dev-field-value">{formatDuration(lav.elapsedSeconds)}</span></div>
                    {lav.bombas?.length > 0 && (
                      <div className="dev-bombas-list">
                        {lav.bombas.map((b) => <BombaBar key={b.bombaId} bomba={b} />)}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {vista === "esquema" && (
        <DiagramaEsquematico lavadoras={lavadoras} bombas={bombasActivas} productos={productos} grupoNombre={grupoNombre} />
      )}
    </div>
  );
}

export default DeviceLiveDataPanel;
