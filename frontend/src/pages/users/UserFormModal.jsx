// UserFormModal.jsx
// Modal para crear o editar un usuario.
// Props:
//   mode: "create" | "edit" | "view" | "reset-password"
//   user: objeto usuario (para edit/view/reset-password)
//   onClose: función para cerrar
//   onSave: callback con los datos guardados
import { useState, useEffect, useCallback } from "react";
import {
  MdClose, MdPerson, MdEmail, MdLock, MdVisibility, MdVisibilityOff,
  MdSave, MdAdminPanelSettings,
} from "react-icons/md";
import {
  ROLES, PERMISOS_POR_ROL, getRolLabel, createUser, updateUser, resetUserPassword,
} from "../../services/usersService";
import PermissionsPanel from "./PermissionsPanel";
import "./UserFormModal.css";

const INITIAL_FORM = {
  nombre: "",
  email: "",
  password: "",
  confirmPassword: "",
  rol: "operador",
  estado: "activo",
  observaciones: "",
};

function UserFormModal({ mode = "create", user = null, onClose, onSave }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [permisos, setPermisos] = useState({ ...PERMISOS_POR_ROL.operador });
  const [activeTab, setActiveTab] = useState("datos"); // "datos" | "permisos"
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Poblar form cuando se abre en modo editar/ver
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && user) {
      setForm({
        nombre: user.nombre || "",
        email: user.email || "",
        password: "",
        confirmPassword: "",
        rol: user.rol || "operador",
        estado: user.estado || "activo",
        observaciones: user.observaciones || "",
      });
      setPermisos({ ...PERMISOS_POR_ROL[user.rol || "operador"], ...(user.permisos || {}) });
    } else if (mode === "reset-password" && user) {
      setForm((f) => ({ ...f, nombre: user.nombre, email: user.email }));
    } else {
      setForm(INITIAL_FORM);
      setPermisos({ ...PERMISOS_POR_ROL.operador });
    }
    setErrors({});
    setSuccessMsg("");
    setActiveTab("datos");
  }, [mode, user]);

  // Al cambiar el rol, actualizar permisos por defecto
  const handleRolChange = (e) => {
    const newRol = e.target.value;
    setForm((f) => ({ ...f, rol: newRol }));
    setPermisos({ ...PERMISOS_POR_ROL[newRol] });
  };

  const validate = useCallback(() => {
    const errs = {};
    if (mode === "reset-password") {
      if (!form.password.trim()) errs.password = "La contraseña es obligatoria";
      else if (form.password.length < 6) errs.password = "Mínimo 6 caracteres";
      if (form.password !== form.confirmPassword) errs.confirmPassword = "Las contraseñas no coinciden";
      return errs;
    }
    if (!form.nombre.trim()) errs.nombre = "El nombre es obligatorio";
    if (!form.email.trim()) errs.email = "El correo es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Correo inválido";
    if (mode === "create") {
      if (!form.password.trim()) errs.password = "La contraseña temporal es obligatoria";
      else if (form.password.length < 6) errs.password = "Mínimo 6 caracteres";
      if (form.password !== form.confirmPassword) errs.confirmPassword = "Las contraseñas no coinciden";
    }
    return errs;
  }, [form, mode]);

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      let result;
      if (mode === "create") {
        result = createUser({ ...form, permisos });
        setSuccessMsg("Usuario creado correctamente.");
      } else if (mode === "edit") {
        result = updateUser(user.id, { ...form, permisos });
        setSuccessMsg("Usuario actualizado correctamente.");
      } else if (mode === "reset-password") {
        result = resetUserPassword(user.id, form.password);
        setSuccessMsg("Contraseña restablecida correctamente.");
      }
      setTimeout(() => { onSave && onSave(result); onClose(); }, 700);
    } catch (e) {
      console.error("handleSave error", e);
    } finally {
      setSaving(false);
    }
  };

  const isView = mode === "view";
  const isReset = mode === "reset-password";

  const modeTitle = {
    create: "Nuevo Usuario",
    edit: "Editar Usuario",
    view: "Ver Usuario",
    "reset-password": "Restablecer Contraseña",
  }[mode] || "Usuario";

  return (
    <div className="ufm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ufm-box" role="dialog" aria-modal="true" aria-label={modeTitle}>
        {/* ── Cabecera ── */}
        <div className="ufm-header">
          <div className="ufm-header-icon">
            <MdAdminPanelSettings size={22} />
          </div>
          <h2 className="ufm-title">{modeTitle}</h2>
          <button className="ufm-close" onClick={onClose} aria-label="Cerrar">
            <MdClose size={20} />
          </button>
        </div>

        {/* ── Tabs (solo en create/edit/view) ── */}
        {!isReset && (
          <div className="ufm-tabs">
            <button
              className={`ufm-tab ${activeTab === "datos" ? "active" : ""}`}
              onClick={() => setActiveTab("datos")}
            >
              Datos del usuario
            </button>
            <button
              className={`ufm-tab ${activeTab === "permisos" ? "active" : ""}`}
              onClick={() => setActiveTab("permisos")}
            >
              Permisos
            </button>
          </div>
        )}

        {/* ── Body ── */}
        <div className="ufm-body">
          {successMsg && (
            <div className="ufm-success-msg">{successMsg}</div>
          )}

          {/* ── Tab: Datos ── */}
          {(activeTab === "datos" || isReset) && (
            <div className="ufm-fields">

              {/* Nombre completo */}
              {!isReset && (
                <div className="ufm-field">
                  <label className="ufm-label">
                    <MdPerson size={15} /> Nombre completo
                  </label>
                  <input
                    type="text"
                    className={`ufm-input ${errors.nombre ? "error" : ""}`}
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    disabled={isView || saving}
                    placeholder="Ej: María García López"
                  />
                  {errors.nombre && <span className="ufm-error">{errors.nombre}</span>}
                </div>
              )}

              {/* Correo */}
              {!isReset && (
                <div className="ufm-field">
                  <label className="ufm-label">
                    <MdEmail size={15} /> Correo electrónico
                  </label>
                  <input
                    type="email"
                    className={`ufm-input ${errors.email ? "error" : ""}`}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    disabled={isView || saving}
                    placeholder="correo@deterquin.com"
                  />
                  {errors.email && <span className="ufm-error">{errors.email}</span>}
                </div>
              )}

              {/* Contraseña temporal */}
              {(mode === "create" || isReset) && (
                <div className="ufm-field">
                  <label className="ufm-label">
                    <MdLock size={15} />
                    {isReset ? "Nueva contraseña" : "Contraseña temporal"}
                  </label>
                  <div className="ufm-input-pw">
                    <input
                      type={showPassword ? "text" : "password"}
                      className={`ufm-input ${errors.password ? "error" : ""}`}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      disabled={saving}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      className="ufm-pw-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                    >
                      {showPassword ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                    </button>
                  </div>
                  {errors.password && <span className="ufm-error">{errors.password}</span>}
                </div>
              )}

              {/* Confirmar contraseña */}
              {(mode === "create" || isReset) && (
                <div className="ufm-field">
                  <label className="ufm-label">
                    <MdLock size={15} /> Confirmar contraseña
                  </label>
                  <div className="ufm-input-pw">
                    <input
                      type={showConfirm ? "text" : "password"}
                      className={`ufm-input ${errors.confirmPassword ? "error" : ""}`}
                      value={form.confirmPassword}
                      onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                      disabled={saving}
                      placeholder="Repetir contraseña"
                    />
                    <button
                      type="button"
                      className="ufm-pw-toggle"
                      onClick={() => setShowConfirm((v) => !v)}
                      tabIndex={-1}
                    >
                      {showConfirm ? <MdVisibilityOff size={18} /> : <MdVisibility size={18} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <span className="ufm-error">{errors.confirmPassword}</span>}
                </div>
              )}

              {/* Rol */}
              {!isReset && (
                <div className="ufm-field">
                  <label className="ufm-label">Rol</label>
                  <select
                    className="ufm-select"
                    value={form.rol}
                    onChange={handleRolChange}
                    disabled={isView || saving}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{getRolLabel(r)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Estado */}
              {!isReset && (
                <div className="ufm-field">
                  <label className="ufm-label">Estado</label>
                  <select
                    className="ufm-select"
                    value={form.estado}
                    onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
                    disabled={isView || saving}
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              )}

              {/* Observaciones */}
              {!isReset && (
                <div className="ufm-field ufm-field-full">
                  <label className="ufm-label">Observaciones</label>
                  <textarea
                    className="ufm-textarea"
                    rows={3}
                    value={form.observaciones}
                    onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
                    disabled={isView || saving}
                    placeholder="Observaciones opcionales…"
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Permisos ── */}
          {activeTab === "permisos" && !isReset && (
            <div className="ufm-permisos">
              <p className="ufm-permisos-hint">
                Permisos precargados según el rol seleccionado. Puedes personalizarlos.
              </p>
              <PermissionsPanel
                permisos={permisos}
                onChange={setPermisos}
                disabled={isView}
              />
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!isView && (
          <div className="ufm-footer">
            <button className="ufm-btn-cancel" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button
              className={`ufm-btn-save ${saving ? "loading" : ""}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <><span className="ufm-spinner" /> Guardando…</>
              ) : (
                <><MdSave size={16} /> Guardar</>
              )}
            </button>
          </div>
        )}
        {isView && (
          <div className="ufm-footer">
            <button className="ufm-btn-cancel" onClick={onClose}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserFormModal;
