// Componente `Button` reutilizable
// - Variantes: "primary" (azul, acción principal), "secondary" (con borde,
//   acción neutra) y "danger" (rojo, acciones destructivas como borrar)
// - Ejemplo: <Button variant="primary" onClick={...}>Guardar</Button>
import "./ui.css";

function Button({ variant = "primary", type = "button", disabled = false, onClick, children }) {
  return (
    <button
      type={type}
      className={`ui-btn ui-btn-${variant}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default Button;
