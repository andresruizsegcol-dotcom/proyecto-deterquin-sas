// Componente `Input` controlado reutilizable
// - Agrega label opcional y mensaje de error, manteniendo el mismo estilo
//   en todos los formularios que lo adopten
// - Ejemplo: <Input label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} />
import "./ui.css";

function Input({ label, error, ...inputProps }) {
  return (
    <div className="ui-input-group">
      {label && <label className="ui-input-label">{label}</label>}
      <input className={`ui-input ${error ? "ui-input-error" : ""}`.trim()} {...inputProps} />
      {error && <span className="ui-input-error-text">{error}</span>}
    </div>
  );
}

export default Input;
