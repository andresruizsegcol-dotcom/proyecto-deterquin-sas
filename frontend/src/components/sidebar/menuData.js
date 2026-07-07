// Datos estáticos para construir la barra lateral desde `menuData`
// - Las rutas ya están sincronizadas con las definidas en DashboardLayout.jsx
// - IMPORTANTE: este archivo NO se usa actualmente. `Sidebar.jsx` renderiza sus
//   propios items a mano porque tiene submenús colapsables (Dashboard del
//   dispositivo, Reporte general/detallado) que esta estructura plana todavía
//   no soporta. Si en el futuro se quiere generar el sidebar dinámicamente
//   desde datos, hay que extender este array con un campo `children` y
//   actualizar `SidebarItem`/`SidebarMenu` para soportarlo.
import {
  MdDashboard,
  MdPeople,
  MdDevices,
  MdBarChart,
} from "react-icons/md";


const menuData = [
  {
    title: "Dashboard",
    path: "/",
    icon: MdDashboard,
  },

  {
    title: "Clientes",
    path: "/clientes",
    icon: MdPeople,
  },

  {
    title: "Dispositivos",
    path: "/dispositivos",
    icon: MdDevices,
  },

  {
    title: "Reportes",
    path: "/informes",
    icon: MdBarChart,
  },




  
];

export default menuData;