// Componente `Loader` (spinner) accesible
// - Ejemplo: {cargando && <Loader />}
import "./ui.css";

function Loader({ label = "Cargando..." }) {
  return (
    <div className="ui-loader" role="status" aria-live="polite">
      <span className="ui-loader-spinner" />
      <span className="ui-loader-label">{label}</span>
    </div>
  );
}

export default Loader;
