// Componente reutilizable para un item de la barra lateral
// - Recibe `item` con `{ title, path, icon }`
// - Usa `NavLink` para aplicar la clase `active` cuando la ruta coincide
import { NavLink } from "react-router-dom";

function SidebarItem({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        isActive
          ? "sidebar-item active"
          : "sidebar-item"
      }
    >
      <Icon size={18} />

      <span>{item.title}</span>
    </NavLink>
  );
}

export default SidebarItem;