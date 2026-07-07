// Gráfico de líneas ligero en SVG puro (sin dependencias externas).
// - `series`: [{ name, color, points: [{ label, value }] }]
// - Todas las series comparten el mismo eje X (mismo número de puntos).
import "./MiniLineChart.css";

function MiniLineChart({ series, height = 200, yUnit = "" }) {
  const width = 600;
  const padding = { top: 14, right: 14, bottom: 26, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const maxVal = Math.max(1, ...allValues);
  const minVal = Math.min(0, ...allValues);
  const range = maxVal - minVal || 1;

  const pointCount = series[0]?.points.length || 1;
  const xStep = pointCount > 1 ? innerW / (pointCount - 1) : 0;

  const toXY = (index, value) => {
    const x = padding.left + index * xStep;
    const y = padding.top + innerH - ((value - minVal) / range) * innerH;
    return [x, y];
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const y = padding.top + innerH * t;
    const value = maxVal - t * range;
    return { y, value };
  });

  const labels = series[0]?.points.map((p) => p.label) || [];
  // Para no saturar el eje X, mostrar como mucho ~6 etiquetas.
  const labelStep = Math.max(1, Math.ceil(labels.length / 6));

  return (
    <div className="mlc-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="mlc-svg" preserveAspectRatio="xMidYMid meet">
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padding.left} x2={width - padding.right} y1={g.y} y2={g.y} className="mlc-grid" />
            <text x={padding.left - 8} y={g.y + 3} className="mlc-axis-label" textAnchor="end">
              {Math.round(g.value)}{yUnit}
            </text>
          </g>
        ))}

        {labels.map((label, i) =>
          i % labelStep === 0 ? (
            <text key={i} x={padding.left + i * xStep} y={height - 6} className="mlc-axis-label" textAnchor="middle">
              {label}
            </text>
          ) : null
        )}

        {series.map((s) => {
          const d = s.points
            .map((p, i) => {
              const [x, y] = toXY(i, p.value);
              return `${i === 0 ? "M" : "L"}${x},${y}`;
            })
            .join(" ");
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={s.color} strokeWidth="2" />
              {s.points.map((p, i) => {
                const [x, y] = toXY(i, p.value);
                return <circle key={i} cx={x} cy={y} r="2.5" fill={s.color} />;
              })}
            </g>
          );
        })}
      </svg>
      <div className="mlc-legend">
        {series.map((s) => (
          <div key={s.name} className="mlc-legend-item">
            <span className="mlc-legend-dot" style={{ background: s.color }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MiniLineChart;
