// Componente contenedor para generar el menú lateral desde `menuData`
// - Puede mapear `menuData` y usar `SidebarItem` para cada entrada
// - No se usa todavía: `Sidebar.jsx` tiene submenús colapsables (Dashboard
//   del dispositivo, Reporte general/detallado) que `menuData` aún no
//   modela (ver nota en menuData.js). Conectar esto requeriría primero
//   extender `menuData` con `children` y añadir soporte de submenú aquí
//   y en `SidebarItem`.

// Ejemplo de uso (comentado):
// import menuData from './menuData';
// import SidebarItem from './SidebarItem';
// export default function SidebarMenu(){
//   return <nav>{menuData.map(item => <SidebarItem key={item.path} item={item} />)}</nav>
// }

export default function SidebarMenu() {
	// Placeholder: el proyecto actualmente renderiza items manualmente en `Sidebar.jsx`
	return null;
}
