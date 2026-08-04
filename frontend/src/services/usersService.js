// usersService.js
// Servicio centralizado para gestión de usuarios en localStorage.
// Clave de storage: "deterquin_usuarios"
// Seed automático: si la clave no existe, se crean los dos usuarios por defecto.

// ── Definición de permisos disponibles ────────────────────────────────────

export const PERMISOS_DISPONIBLES = [
  { key: "dashboard",               label: "Dashboard",                      grupo: "General" },
  { key: "ver_clientes",            label: "Ver clientes",                   grupo: "Clientes" },
  { key: "crear_clientes",          label: "Crear clientes",                 grupo: "Clientes" },
  { key: "editar_clientes",         label: "Editar clientes",                grupo: "Clientes" },
  { key: "eliminar_clientes",       label: "Eliminar clientes",              grupo: "Clientes" },
  { key: "ver_dispositivos",        label: "Ver dispositivos",               grupo: "Dispositivos" },
  { key: "crear_dispositivos",      label: "Crear dispositivos",             grupo: "Dispositivos" },
  { key: "editar_dispositivos",     label: "Editar dispositivos",            grupo: "Dispositivos" },
  { key: "eliminar_dispositivos",   label: "Eliminar dispositivos",          grupo: "Dispositivos" },
  { key: "ver_productos",           label: "Ver productos",                  grupo: "Productos" },
  { key: "crear_productos",         label: "Crear productos",                grupo: "Productos" },
  { key: "editar_productos",        label: "Editar productos",               grupo: "Productos" },
  { key: "eliminar_productos",      label: "Eliminar productos",             grupo: "Productos" },
  { key: "crear_bombas",            label: "Crear bombas",                   grupo: "Bombas" },
  { key: "editar_bombas",           label: "Editar bombas",                  grupo: "Bombas" },
  { key: "eliminar_bombas",         label: "Eliminar bombas",                grupo: "Bombas" },
  { key: "calibracion_bombas",      label: "Calibración de bombas",         grupo: "Bombas" },
  { key: "ver_informes",            label: "Ver informes",                   grupo: "Informes" },
  { key: "exportar_excel",          label: "Exportar informes Excel",        grupo: "Informes" },
  { key: "exportar_pdf",            label: "Exportar informes PDF",          grupo: "Informes" },
  { key: "ver_estadisticas",        label: "Ver estadísticas",              grupo: "Estadísticas" },
  { key: "ver_alarmas",             label: "Ver alarmas",                    grupo: "Alarmas" },
  { key: "admin_programas",         label: "Administrar programas de lavado",grupo: "Programas" },
  { key: "admin_formulas",          label: "Administrar fórmulas",          grupo: "Fórmulas" },
  { key: "admin_usuarios",          label: "Administrar usuarios",           grupo: "Usuarios" },
  { key: "crear_usuarios",          label: "Crear usuarios",                 grupo: "Usuarios" },
  { key: "editar_usuarios",         label: "Editar usuarios",                grupo: "Usuarios" },
  { key: "eliminar_usuarios",       label: "Eliminar usuarios",              grupo: "Usuarios" },
  { key: "admin_roles",             label: "Administrar roles",              grupo: "Usuarios" },
  { key: "configuracion",           label: "Configuración",                  grupo: "Sistema" },
  { key: "auditoria",               label: "Auditoría",                      grupo: "Sistema" },
];

// ── Permisos por defecto según rol ────────────────────────────────────────

export const ROLES = ["superadministrador", "administrador", "operador"];

function todosLosPermisos(valor = true) {
  return Object.fromEntries(PERMISOS_DISPONIBLES.map((p) => [p.key, valor]));
}

export const PERMISOS_POR_ROL = {
  superadministrador: todosLosPermisos(true),

  administrador: {
    dashboard: true,
    ver_clientes: true,
    crear_clientes: true,
    editar_clientes: true,
    eliminar_clientes: true,
    ver_dispositivos: true,
    crear_dispositivos: true,
    editar_dispositivos: true,
    eliminar_dispositivos: true,
    ver_productos: true,
    crear_productos: true,
    editar_productos: true,
    eliminar_productos: true,
    crear_bombas: true,
    editar_bombas: true,
    eliminar_bombas: true,
    calibracion_bombas: true,
    ver_informes: true,
    exportar_excel: true,
    exportar_pdf: true,
    ver_estadisticas: true,
    ver_alarmas: true,
    admin_programas: true,
    admin_formulas: true,
    // ── Denegados ──
    admin_usuarios: false,
    crear_usuarios: false,
    editar_usuarios: false,
    eliminar_usuarios: false,
    admin_roles: false,
    configuracion: false,
    auditoria: false,
  },

  operador: todosLosPermisos(false),
};

// ── Usuarios semilla ───────────────────────────────────────────────────────

function crearSeed() {
  const ahora = new Date().toISOString();
  return [
    {
      id: "usr-1",
      nombre: "Andrés Felipe Ruiz",
      email: "andres@deterquin.com",
      rol: "superadministrador",
      estado: "activo",
      ultimoAcceso: ahora,
      avatar: null,
      observaciones: "Usuario superadministrador del sistema.",
      permisos: { ...PERMISOS_POR_ROL.superadministrador },
    },
    {
      id: "usr-2",
      nombre: "Juan Pérez",
      email: "juan@deterquin.com",
      rol: "administrador",
      estado: "activo",
      ultimoAcceso: new Date(Date.now() - 3600000 * 24).toISOString(),
      avatar: null,
      observaciones: "",
      permisos: { ...PERMISOS_POR_ROL.administrador },
    },
  ];
}

const STORAGE_KEY = "deterquin_usuarios";

// ── CRUD ──────────────────────────────────────────────────────────────────

export function getUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    // Seed automático si no existen usuarios
    const seed = crearSeed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  } catch (e) {
    console.error("getUsers: error leyendo localStorage", e);
    return [];
  }
}

export function saveUsers(users) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users || []));
  } catch (e) {
    console.error("saveUsers: error guardando localStorage", e);
  }
}

export function createUser(userData) {
  const users = getUsers();
  const newUser = {
    id: `usr-${Date.now()}`,
    nombre: userData.nombre || "",
    email: userData.email || "",
    rol: userData.rol || "operador",
    estado: userData.estado || "activo",
    ultimoAcceso: new Date().toISOString(),
    avatar: null,
    observaciones: userData.observaciones || "",
    permisos: userData.permisos || { ...PERMISOS_POR_ROL[userData.rol || "operador"] },
  };
  users.push(newUser);
  saveUsers(users);
  return newUser;
}

export function updateUser(id, updates) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return users[idx];
}

export function deleteUser(id) {
  const users = getUsers().filter((u) => u.id !== id);
  saveUsers(users);
}

export function toggleUserStatus(id) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx].estado = users[idx].estado === "activo" ? "inactivo" : "activo";
  saveUsers(users);
  return users[idx];
}

export function resetUserPassword(id, newPassword) {
  // En frontend simulado se guarda la contraseña temporal en el objeto de usuario
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx].passwordTemp = newPassword;
  users[idx].mustChangePassword = true;
  saveUsers(users);
  return users[idx];
}

// ── Utilidades ────────────────────────────────────────────────────────────

export function getInitials(nombre = "") {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

export function getRolLabel(rol) {
  const map = {
    superadministrador: "Superadministrador",
    administrador: "Administrador",
    operador: "Operador",
  };
  return map[rol] || rol;
}

export function formatLastAccess(iso) {
  if (!iso) return "Nunca";
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

// Devuelve estadísticas resumidas para las tarjetas KPI
export function getUserStats() {
  const users = getUsers();
  return {
    total: users.length,
    superadministradores: users.filter((u) => u.rol === "superadministrador").length,
    administradores: users.filter((u) => u.rol === "administrador").length,
    operadores: users.filter((u) => u.rol === "operador").length,
    inactivos: users.filter((u) => u.estado === "inactivo").length,
  };
}
