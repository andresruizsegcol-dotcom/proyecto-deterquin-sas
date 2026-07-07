// Gráfico de torta ligero en SVG puro (sin dependencias externas).
// - `data`: [{ label, value, color }]
import "./MiniPieChart.css";

function polarToCartesian(cx, cy, r, angleDeg) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeSlice(cx, cy, r, startAngle, endAngle) {
  // Círculo completo (una sola categoría): un círculo no se puede
  // describir como arco de 360°, así que se dibuja aparte.
  if (endAngle - startAngle >= 359.999) {
    return `M ${cx - r},${cy} a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`;
  }
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return ["M", cx, cy, "L", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y, "Z"].join(" ");
}

function MiniPieChart({ data, size = 160 }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  let angleAcc = 0;
  const slices = data.map((d) => {
    const angle = (d.value / total) * 360;
    const slice = { ...d, startAngle: angleAcc, endAngle: angleAcc + angle, pct: (d.value / total) * 100 };
    angleAcc += angle;
    return slice;
  });

  return (
    <div className="mpc-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="mpc-svg">
        {slices.map((s, i) => (
          <path key={i} d={describeSlice(cx, cy, r, s.startAngle, s.endAngle)} fill={s.color} />
        ))}
      </svg>
      <div className="mpc-legend">
        {slices.map((s, i) => (
          <div key={i} className="mpc-legend-item">
            <span className="mpc-legend-dot" style={{ background: s.color }} />
            <span className="mpc-legend-label">{s.label}</span>
            <span className="mpc-legend-pct">{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MiniPieChart;
