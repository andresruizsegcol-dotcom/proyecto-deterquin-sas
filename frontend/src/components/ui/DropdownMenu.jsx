// Componente `DropdownMenu`: menú contextual reutilizable (ej. el botón
// "Opciones" en filas de dispositivos, productos y programas).
// - Se cierra solo al hacer clic afuera.
// - Cada opción admite un `icon` opcional (componente de react-icons) para
//   mantener consistencia visual: misma acción, mismo icono, en todos lados.
// - Usa las clases `.cd-dropdown*` ya definidas en ClientsDetail.css; como
//   los estilos de este proyecto son CSS global (no CSS modules), no hace
//   falta duplicarlas aquí, solo que ese archivo se haya cargado en algún
//   punto de la app.
import { useRef, useEffect } from "react";

function DropdownMenu({ options, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return (
    <div ref={ref} className="cd-dropdown">
      {options.map((opt, i) => {
        const Icon = opt.icon;
        return (
          <div key={i} className={`cd-dropdown-item ${opt.red ? "cd-dropdown-red" : ""}`}
            onClick={() => { opt.action && opt.action(); onClose(); }}>
            {Icon && <Icon size={15} className="cd-dropdown-icon" />}
            <span>{opt.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default DropdownMenu;
