# Comentarios del proyecto — Frontend

Resumen breve del frontend y ubicación de los archivos principales comentados inline.

**Estructura principal**
- **Frontend root:** `frontend/` — aplicación Vite + React.
- **Entradas:** [frontend/src/main.jsx](frontend/src/main.jsx) → [frontend/src/App.jsx](frontend/src/App.jsx)
- **Rutas:** [frontend/src/routes/AppRoutes.jsx](frontend/src/routes/AppRoutes.jsx)
- **Layout principal:** [frontend/src/layouts/DashboardLayout.jsx](frontend/src/layouts/DashboardLayout.jsx)

**Componentes y páginas comentadas**
- Barra lateral:
  - `Sidebar`: [frontend/src/components/sidebar/Sidebar.jsx](frontend/src/components/sidebar/Sidebar.jsx)
  - `SidebarItem` y datos: [frontend/src/components/sidebar/SidebarItem.jsx](frontend/src/components/sidebar/SidebarItem.jsx), [frontend/src/components/sidebar/menuData.js](frontend/src/components/sidebar/menuData.js)
  - Nota: hay un `SidebarMenu.jsx` placeholder si quieres generar el menú desde datos.
- Cabecera y usuario:
  - `Header`: [frontend/src/components/header/Header.jsx](frontend/src/components/header/Header.jsx)
  - Estilos header: [frontend/src/components/header/Header.css](frontend/src/components/header/Header.css)
  - `HeaderActions` y `UserMenu` son placeholders para extraer lógica.
- Páginas principales:
  - Dashboard: [frontend/src/pages/dashboard/DashboardPage.jsx](frontend/src/pages/dashboard/DashboardPage.jsx) + [frontend/src/pages/dashboard/DashboardPage.css](frontend/src/pages/dashboard/DashboardPage.css)
  - Clientes: [frontend/src/pages/clients/ClientsPage.jsx](frontend/src/pages/clients/ClientsPage.jsx) + [frontend/src/pages/clients/ClientsPage.css](frontend/src/pages/clients/ClientsPage.css)
  - Cliente detalle: [frontend/src/pages/clients/ClientsDetail.jsx](frontend/src/pages/clients/ClientsDetail.jsx) + [frontend/src/pages/clients/ClientsDetail.css](frontend/src/pages/clients/ClientsDetail.css)
  - Dispositivos: [frontend/src/pages/devices/DevicesPage.jsx](frontend/src/pages/devices/DevicesPage.jsx) + [frontend/src/pages/devices/DevicesPage.css](frontend/src/pages/devices/DevicesPage.css)
  - Informes: [frontend/src/pages/reports/Reportspage.jsx](frontend/src/pages/reports/Reportspage.jsx)
  - Login (demo): [frontend/src/pages/auth/LoginPage.jsx](frontend/src/pages/auth/LoginPage.jsx) + [frontend/src/pages/auth/login.css](frontend/src/pages/auth/login.css)

**UI y utilidades**
- Componentes UI vacíos (placeholders) donde sugeré centralizar estilos: [frontend/src/components/ui/ui.css](frontend/src/components/ui/ui.css), `Button.jsx`, `Card.jsx`, `Input.jsx`, `Loader.jsx` (archivos creados/comentados como placeholders).

**CSS global y notas**
- Estilos globales: [frontend/src/index.css](frontend/src/index.css)
- Layout CSS: [frontend/src/layouts/DashboardLayout.css](frontend/src/layouts/DashboardLayout.css)
- He añadido comentarios en los archivos CSS principales explicando responsabilidad y clases clave. Recomendaciones generales:
  - Extraer variables (`:root`) para colores, radios y tipografías.
  - Centralizar componentes reutilizables en `ui.css` y convertir modales/botones en clases reutilizables.
  - Unificar rutas (algunas usan español `/clientes`, otras `/clients`) — mantener una sola convención.

**Autenticación y datos**
- Actualmente la app usa datos en `localStorage` y un array de usuarios hardcodeado en `LoginPage.jsx` para demo.
- Recomendación: implementar un backend y endpoints para persistencia, autenticación segura (JWT/OAuth) y autorización por roles.

**Próximos pasos sugeridos**
- Consolidar `ui.css` con utilidades y variables CSS.
- Reemplazar almacenamiento en `localStorage` por llamadas al backend; crear servicios/API en `frontend/src/services`.
- Extraer menús y dropdowns a componentes reutilizables (`HeaderActions`, `UserMenu`, `SidebarMenu`).
- Escribir pruebas unitarias para componentes críticos y añadir lint/format en CI.

---
Si quieres, hago ahora:
- a) Convertir los placeholders UI en componentes funcionales y estilos reutilizables.
- b) Unificar las rutas a español o inglés (me indicas cuál prefieres) y actualizo `menuData` y rutas.
- c) Generar anotaciones inline adicionales en archivos backend.

Dime cuál opción prefieres y procedo.