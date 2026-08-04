// UsersPage.jsx
// Página completa de administración de usuarios.
// Incluye: tarjetas KPI, tabla con buscador y filtros, menú de acciones,
// y apertura del modal de creación/edición.
import { useState, useEffect, useCallback, useRef } from "react";
import {
  MdPeople, MdAdminPanelSettings, MdPersonOff, MdSearch, MdFilterList,
  MdAdd, MdMoreVert, MdVisibility, MdEdit, MdLockReset, MdToggleOn,
  MdToggleOff, MdDelete, MdRefresh, MdClose,
} from "react-icons/md";
import {
  getUsers, deleteUser, toggleUserStatus, getUserStats,
  getInitials, getRolLabel, formatLastAccess,
} from "../../services/usersService";
import UserFormModal from "./UserFormModal";
import "./UsersPage.css";

// ── Utilidades ────────────────────────────────────────────────────────────

function RolBadge({ rol }) {
  const cls = {
    superadministrador: "badge-superadmin",
    administrador: "badge-admin",
    operador: "badge-operador",
  }[rol] || "badge-default";
  return <span className={`users-badge ${cls}`}>{getRolLabel(rol)}</span>;
}

function StatusBadge({ estado }) {
  return (
    <span className={`users-badge ${estado === "activo" ? "badge-activo" : "badge-inactivo"}`}>
      {estado === "activo" ? "Activo" : "Inactivo"}
    </span>
  );
}

function Avatar({ user }) {
  const initials = getInitials(user.nombre);
  const colorMap = {
    superadministrador: "#08204A",
    administrador: "#2563eb",
    operador: "#6abf3f",
  };
  const bg = colorMap[user.rol] || "#6b7280";
  return (
    <div className="user-avatar" style={{ background: bg }}>
      {initials}
    </div>
  );
}

// ── Menú de acciones por usuario ──────────────────────────────────────────

function ActionMenu({ user, onView, onEdit, onReset, onToggle, onDelete, onClose }) {
  return (
    <div className="users-action-menu">
      <button className="users-action-item" onClick={() => { onView(user); onClose(); }}>
        <MdVisibility size={16} /> Ver información
      </button>
      <button className="users-action-item" onClick={() => { onEdit(user); onClose(); }}>
        <MdEdit size={16} /> Editar
      </button>
      <button className="users-action-item" onClick={() => { onReset(user); onClose(); }}>
        <MdLockReset size={16} /> Restablecer contraseña
      </button>
      <div className="users-action-divider" />
      <button className="users-action-item" onClick={() => { onToggle(user); onClose(); }}>
        {user.estado === "activo"
          ? <><MdToggleOff size={16} /> Desactivar</>
          : <><MdToggleOn size={16} /> Activar</>}
      </button>
      <button className="users-action-item danger" onClick={() => { onDelete(user); onClose(); }}>
        <MdDelete size={16} /> Eliminar
      </button>
    </div>
  );
}

// ── Tarjeta KPI ───────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, color, accent }) {
  return (
    <div className="users-kpi-card" style={{ "--kpi-accent": accent }}>
      <div className="users-kpi-icon" style={{ background: color }}>
        <Icon size={22} color="white" />
      </div>
      <div className="users-kpi-info">
        <span className="users-kpi-value">{value}</span>
        <span className="users-kpi-label">{label}</span>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, superadministradores: 0, administradores: 0, operadores: 0, inactivos: 0 });
  const [query, setQuery] = useState("");
  const [rolFilter, setRolFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);

  // Modal
  const [modalMode, setModalMode] = useState(null); // "create"|"edit"|"view"|"reset-password"
  const [selectedUser, setSelectedUser] = useState(null);

  // Menú desplegable de acciones por fila
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  // Confirmación de eliminación
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Cargar usuarios
  const loadUsers = useCallback(() => {
    setUsers(getUsers());
    setStats(getUserStats());
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers, refreshTick]);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Filtrado ──
  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    const matchQ = !q
      || u.nombre.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q)
      || u.rol.toLowerCase().includes(q);
    const matchRol = !rolFilter || u.rol === rolFilter;
    const matchStatus = !statusFilter || u.estado === statusFilter;
    return matchQ && matchRol && matchStatus;
  });

  // ── Acciones ──
  const handleRefresh = () => {
    setQuery("");
    setRolFilter("");
    setStatusFilter("");
    setRefreshTick((t) => t + 1);
  };

  const handleModalSave = () => {
    setRefreshTick((t) => t + 1);
  };

  const handleToggle = (user) => {
    toggleUserStatus(user.id);
    setRefreshTick((t) => t + 1);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteUser(deleteTarget.id);
    setDeleteTarget(null);
    setRefreshTick((t) => t + 1);
  };

  return (
    <div className="users-page">

      {/* ── Cabecera ── */}
      <div className="users-page-header">
        <div className="users-page-title">
          <MdAdminPanelSettings size={26} color="var(--color-sidebar, #08204A)" />
          <div>
            <h1 className="users-title-text">Usuarios</h1>
            <p className="users-subtitle">Gestión de usuarios y permisos del sistema</p>
          </div>
        </div>
        <div className="users-header-actions">
          <button className="users-btn-refresh" onClick={handleRefresh} title="Actualizar">
            <MdRefresh size={20} />
          </button>
          <button
            className="users-btn-new"
            onClick={() => { setSelectedUser(null); setModalMode("create"); }}
            id="btn-nuevo-usuario"
          >
            <MdAdd size={18} />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* ── Tarjetas KPI ── */}
      <div className="users-kpi-grid">
        <KpiCard
          icon={MdPeople}
          label="Total usuarios"
          value={stats.total}
          color="#08204A"
          accent="#08204A"
        />
        <KpiCard
          icon={MdAdminPanelSettings}
          label="Administradores"
          value={stats.administradores + stats.superadministradores}
          color="#2563eb"
          accent="#2563eb"
        />
        <KpiCard
          icon={MdPeople}
          label="Operadores"
          value={stats.operadores}
          color="#6abf3f"
          accent="#6abf3f"
        />
        <KpiCard
          icon={MdPersonOff}
          label="Usuarios inactivos"
          value={stats.inactivos}
          color="#ef4444"
          accent="#ef4444"
        />
      </div>

      {/* ── Barra de filtros ── */}
      <div className="users-content-area">
        <div className="users-toolbar">
          {/* Buscador */}
          <div className="users-search-wrap">
            <MdSearch size={18} className="users-search-icon" />
            <input
              id="users-search"
              type="text"
              className="users-search-input"
              placeholder="Buscar por nombre, correo o rol…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="users-search-clear" onClick={() => setQuery("")}>
                <MdClose size={15} />
              </button>
            )}
          </div>

          {/* Filtro Rol */}
          <div className="users-filter-wrap">
            <MdFilterList size={16} />
            <select
              id="users-filter-rol"
              className="users-filter-select"
              value={rolFilter}
              onChange={(e) => setRolFilter(e.target.value)}
            >
              <option value="">Todos los roles</option>
              <option value="superadministrador">Superadministrador</option>
              <option value="administrador">Administrador</option>
              <option value="operador">Operador</option>
            </select>
          </div>

          {/* Filtro Estado */}
          <div className="users-filter-wrap">
            <select
              id="users-filter-estado"
              className="users-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>

          <span className="users-count">{filtered.length} usuario{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* ── Tabla ── */}
        <div className="users-table-wrap">
          {filtered.length === 0 ? (
            <div className="users-empty">
              <MdPeople size={42} color="#d1d5db" />
              <p>No se encontraron usuarios</p>
              {(query || rolFilter || statusFilter) && (
                <button className="users-btn-clear" onClick={handleRefresh}>
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className={user.estado === "inactivo" ? "row-inactive" : ""}>
                    {/* Foto / Avatar + Nombre */}
                    <td className="users-td-name">
                      <div className="users-name-cell">
                        <Avatar user={user} />
                        <span className="users-name-text">{user.nombre}</span>
                      </div>
                    </td>

                    {/* Correo */}
                    <td className="users-td-email">
                      <span className="users-email-text">{user.email}</span>
                    </td>

                    {/* Rol */}
                    <td><RolBadge rol={user.rol} /></td>

                    {/* Estado */}
                    <td><StatusBadge estado={user.estado} /></td>

                    {/* Último acceso */}
                    <td className="users-td-access">
                      {formatLastAccess(user.ultimoAcceso)}
                    </td>

                    {/* Acciones */}
                    <td className="users-td-actions">
                      <div className="users-action-wrap" ref={openMenuId === user.id ? menuRef : null}>
                        <button
                          className="users-action-trigger"
                          onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                          aria-label="Acciones"
                          title="Acciones"
                        >
                          <MdMoreVert size={20} />
                        </button>
                        {openMenuId === user.id && (
                          <ActionMenu
                            user={user}
                            onView={(u) => { setSelectedUser(u); setModalMode("view"); }}
                            onEdit={(u) => { setSelectedUser(u); setModalMode("edit"); }}
                            onReset={(u) => { setSelectedUser(u); setModalMode("reset-password"); }}
                            onToggle={handleToggle}
                            onDelete={(u) => setDeleteTarget(u)}
                            onClose={() => setOpenMenuId(null)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modal de formulario ── */}
      {modalMode && (
        <UserFormModal
          mode={modalMode}
          user={selectedUser}
          onClose={() => { setModalMode(null); setSelectedUser(null); }}
          onSave={handleModalSave}
        />
      )}

      {/* ── Confirmación de eliminación ── */}
      {deleteTarget && (
        <div className="users-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="users-confirm-box">
            <MdDelete size={32} color="#ef4444" />
            <h3 className="users-confirm-title">¿Eliminar usuario?</h3>
            <p className="users-confirm-text">
              Esta acción eliminará permanentemente a <strong>{deleteTarget.nombre}</strong>.
              No se puede deshacer.
            </p>
            <div className="users-confirm-actions">
              <button className="ufm-btn-cancel" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button className="users-btn-delete-confirm" onClick={handleDeleteConfirm}>
                <MdDelete size={15} /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersPage;
