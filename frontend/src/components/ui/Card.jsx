// Componente `Card` para paneles reutilizables
// - Encapsula fondo blanco, bordes redondeados y sombra suave
// - Ejemplo: <Card><h3>Título</h3><p>Contenido</p></Card>
import "./ui.css";

function Card({ className = "", children }) {
  return <div className={`ui-card ${className}`.trim()}>{children}</div>;
}

export default Card;
