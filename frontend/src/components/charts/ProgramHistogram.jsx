// Histograma tipo Gantt: una fila por lavadora, bloques de color
// posicionados según su hora de inicio/fin dentro de una ventana de tiempo.
import "./ProgramHistogram.css";

function ProgramHistogram({ data, legendTypes }) {
  const { lavadoras, windowMinutes } = data;
  const hourMarks = Math.ceil(windowMinutes / 60);

  return (
    <div className="ph-wrap">
      <div className="ph-legend">
        {legendTypes.map((t) => (
          <span key={t.key} className="ph-legend-chip" style={{ background: t.color }}>
            {t.label}
          </span>
        ))}
      </div>
      <div className="ph-scroll">
        <div className="ph-hours-row">
          <div className="ph-row-label" />
          <div className="ph-row-track">
            {Array.from({ length: hourMarks }).map((_, i) => (
              <span
                key={i}
                className="ph-hour-mark"
                style={{ left: `${((i * 60) / windowMinutes) * 100}%` }}
              >
                {`${String(i).padStart(2, "0")}:00`}
              </span>
            ))}
          </div>
        </div>
        {lavadoras.map((lav) => (
          <div key={lav.lavadoraId} className="ph-row">
            <div className="ph-row-label">{lav.nombre}</div>
            <div className="ph-row-track">
              {lav.blocks.map((b, i) => (
                <div
                  key={i}
                  className="ph-block"
                  title={b.label}
                  style={{
                    left: `${(b.startMin / windowMinutes) * 100}%`,
                    width: `${((b.endMin - b.startMin) / windowMinutes) * 100}%`,
                    background: b.color,
                  }}
                >
                  {b.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProgramHistogram;
