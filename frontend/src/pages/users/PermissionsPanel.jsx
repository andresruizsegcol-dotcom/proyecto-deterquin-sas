// PermissionsPanel.jsx
// Panel de checkboxes agrupados por categoría para gestionar permisos de usuario.
// Se usa dentro del modal de creación/edición de usuarios.
import { PERMISOS_DISPONIBLES } from "../../services/usersService";
import "./PermissionsPanel.css";

function PermissionsPanel({ permisos = {}, onChange, disabled = false }) {
  // Agrupar permisos por grupo
  const grupos = PERMISOS_DISPONIBLES.reduce((acc, p) => {
    if (!acc[p.grupo]) acc[p.grupo] = [];
    acc[p.grupo].push(p);
    return acc;
  }, {});

  const handleChange = (key, checked) => {
    if (disabled) return;
    onChange({ ...permisos, [key]: checked });
  };

  const handleToggleGrupo = (grupoKeys, allChecked) => {
    if (disabled) return;
    const update = {};
    grupoKeys.forEach((k) => { update[k] = !allChecked; });
    onChange({ ...permisos, ...update });
  };

  return (
    <div className="permissions-panel">
      {Object.entries(grupos).map(([grupo, items]) => {
        const grupoKeys = items.map((i) => i.key);
        const allChecked = grupoKeys.every((k) => permisos[k]);
        const someChecked = grupoKeys.some((k) => permisos[k]) && !allChecked;

        return (
          <div key={grupo} className="perm-group">
            <div className="perm-group-header">
              <label className="perm-group-label">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={() => handleToggleGrupo(grupoKeys, allChecked)}
                  disabled={disabled}
                  className="perm-checkbox"
                />
                <span className="perm-group-name">{grupo}</span>
              </label>
            </div>
            <div className="perm-items">
              {items.map((perm) => (
                <label key={perm.key} className={`perm-item ${disabled ? "disabled" : ""}`}>
                  <input
                    type="checkbox"
                    checked={!!permisos[perm.key]}
                    onChange={(e) => handleChange(perm.key, e.target.checked)}
                    disabled={disabled}
                    className="perm-checkbox"
                  />
                  <span className="perm-label">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PermissionsPanel;
