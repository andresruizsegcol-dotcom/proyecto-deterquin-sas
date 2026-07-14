// Modal de Producto Químico dentro de un paso de un programa.
// - Se abre desde el badge de una señal o desde "+ Añadir Productos químicos"
//   en la vista de detalle del programa.
// - Permite editar grupo de dosificación, producto, dosing delay, capacity
//   multiplier, cantidad en ml/kg y gr/kg (con recálculo automático según
//   el ratio del producto y la capacidad de la lavadora del dispositivo).
// - Al guardar, devuelve el producto modificado al componente padre, que es
//   quien persiste el cambio en localStorage.
import { useEffect, useMemo, useState } from "react";
import { MdClose, MdCheck } from "react-icons/md";
import "./ClientsDetail.css";   // reutiliza .cd-modal-overlay, .cd-modal, etc.

const DEFAULT_FORM = {
  senal: 1,
  grupoDosificacion: "",
  grupoDosificacionId: null,
  productoId: "",
  productoNombre: "",
  productoRatio: 1.0,
  dosingDelay: 0,
  capacityMultiplier: 1,
  cantidadMlPorKg: 0,
  cantidadGrPorKg: 0,
  prioridadAlta: false,
  temperatureDosing: false,
};

function formatNumber(n, decimales = 2) {
  const num = Number(n);
  if (Number.isNaN(num)) return "0";
  return num.toFixed(decimales);
}

// Calcula el total de gramo por lavadora del dispositivo.
// Devuelve un array de strings tipo "540 gr (90kg)" para mostrar en la tabla.
export function calcularTotalesPorLavadora(cantidadGrPorKg, lavadoras) {
  if (!Array.isArray(lavadoras) || lavadoras.length === 0) return [];
  return lavadoras.map(lav => {
    const total = Number(cantidadGrPorKg || 0) * Number(lav.capacidadKg || 0);
    return `${formatNumber(total, 2)} gr (${lav.capacidadKg}kg)`;
  });
}

export default function ProductoQuimicoModal({
  open,
  onClose,
  onSave,                 // (producto) => void
  onDelete,               // opcional: () => void
  initialProducto,        // producto a editar (o null para "nuevo")
  senalesDisponibles,     // [1,2,...,10]
  grupos,                 // [{id, nombre}]
  productos,              // catálogo: [{id, nombre, ratio}]
  lavadoras,              // [{id, nombre, capacidadKg}]
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState("");

  // Carga el producto a editar (o el default) cada vez que se abre el modal
  useEffect(() => {
    if (!open) return;
    if (initialProducto) {
      setForm({ ...DEFAULT_FORM, ...initialProducto });
    } else {
      setForm(DEFAULT_FORM);
    }
    setError("");
  }, [open, initialProducto]);

  // Recalcular ml <-> gr cuando cambia el ratio del producto seleccionado
  useEffect(() => {
    if (!open) return;
    const ratio = Number(form.productoRatio || 1);
    // Si acabamos de cambiar el producto, sincronizamos ml/gr respetando ml
    // (la cantidad en ml se mantiene, los gr se recalculan)
    const ml = Number(form.cantidadMlPorKg || 0);
    setForm(f => ({ ...f, cantidadGrPorKg: ml * ratio }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.productoId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setError("");
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleChangeNumber = (name, value) => {
    setError("");
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleChangeMl = (value) => {
    const ml = Number(value);
    const ratio = Number(form.productoRatio || 1);
    setForm(f => ({
      ...f,
      cantidadMlPorKg: value,
      cantidadGrPorKg: formatNumber(ml * ratio, 3),
    }));
  };

  const handleChangeGr = (value) => {
    const gr = Number(value);
    const ratio = Number(form.productoRatio || 1);
    const ml = ratio > 0 ? gr / ratio : 0;
    setForm(f => ({
      ...f,
      cantidadGrPorKg: value,
      cantidadMlPorKg: formatNumber(ml, 3),
    }));
  };

  const handleSelectProducto = (e) => {
    const id = e.target.value;
    const prod = productos.find(p => String(p.id) === String(id));
    if (!prod) {
      setForm(f => ({ ...f, productoId: "", productoNombre: "", productoRatio: 1.0 }));
      return;
    }
    setForm(f => ({
      ...f,
      productoId: prod.id,
      productoNombre: prod.nombre,
      productoRatio: prod.ratio ?? 1.0,
    }));
  };

  const handleSelectGrupo = (e) => {
    const id = e.target.value;
    const grp = grupos.find(g => String(g.id) === String(id));
    setForm(f => ({
      ...f,
      grupoDosificacionId: grp ? grp.id : null,
      grupoDosificacion: grp ? grp.nombre : "",
    }));
  };

  const guardar = () => {
    if (!form.productoId) {
      setError("Selecciona un producto químico.");
      return;
    }
    if (!form.grupoDosificacionId) {
      setError("Selecciona un grupo de dosificación.");
      return;
    }
    const productoFinal = {
      ...form,
      id: form.id ?? Date.now(),
      cantidadMlPorKg: Number(form.cantidadMlPorKg || 0),
      cantidadGrPorKg: Number(form.cantidadGrPorKg || 0),
      dosingDelay: Number(form.dosingDelay || 0),
      capacityMultiplier: Number(form.capacityMultiplier || 1),
      senal: Number(form.senal || 1),
    };
    onSave(productoFinal);
  };

  // Vista previa del total por lavadora (en vivo, mientras el usuario edita)
  const totalesPreview = useMemo(
    () => calcularTotalesPorLavadora(form.cantidadGrPorKg, lavadoras),
    [form.cantidadGrPorKg, lavadoras]
  );

  if (!open) return null;

  return (
    <div className="cd-modal-overlay" onClick={onClose}>
      <div className="cd-modal cd-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="cd-modal-header">
          <h3>Producto químico</h3>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            {onDelete && (
              <span
                className="cd-modal-header-action"
                onClick={onDelete}
                title="Borrar producto"
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#fff", fontSize: 12 }}
              >
                <MdClose size={14} /> Borrar
              </span>
            )}
            <span
              className="cd-modal-header-action"
              onClick={guardar}
              title="Guardar"
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#fff", fontSize: 12 }}
            >
              <MdCheck size={16} /> Actualizar
            </span>
            <span
              className="cd-modal-header-action"
              onClick={onClose}
              title="Cerrar"
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#fff", fontSize: 12 }}
            >
              <MdClose size={16} /> Cerrar
            </span>
          </div>
        </div>

        <div className="cd-modal-body">
          {/* Grupo Dosificacion */}
          <div className="prog-form-row">
            <label>Grupo Dosificacion</label>
            <select value={form.grupoDosificacionId ?? ""} onChange={handleSelectGrupo}>
              <option value="">— Selecciona —</option>
              {grupos.map(g => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          </div>

          {/* Productos quimicos */}
          <div className="prog-form-row">
            <label>Productos quimicos</label>
            <select value={form.productoId ?? ""} onChange={handleSelectProducto}>
              <option value="">— Selecciona —</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          {/* Dosing delay */}
          <div className="prog-form-row">
            <label>Dosing delay, s</label>
            <input
              type="number"
              min="0"
              value={form.dosingDelay}
              onChange={(e) => handleChangeNumber("dosingDelay", e.target.value)}
            />
          </div>

          {/* Capacity multiplier */}
          <div className="prog-form-row">
            <label>Capacity multiplier</label>
            <select
              value={form.capacityMultiplier}
              onChange={(e) => handleChangeNumber("capacityMultiplier", e.target.value)}
            >
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Cantidad ml/kg + Ratio + Cantidad gr/kg */}
          <div className="prog-form-grid-3">
            <div>
              <label>Cantidad, ml per 1 kg</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.cantidadMlPorKg}
                onChange={(e) => handleChangeMl(e.target.value)}
              />
            </div>
            <div>
              <label>Ratio kg/L</label>
              <input
                type="text"
                readOnly
                value={formatNumber(form.productoRatio, 4)}
                style={{ background: "#f8fafc" }}
              />
            </div>
            <div>
              <label>Cantidad, gr per 1 kg</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.cantidadGrPorKg}
                onChange={(e) => handleChangeGr(e.target.value)}
              />
            </div>
          </div>

          {/* Vista previa: total por lavadora */}
          {totalesPreview.length > 0 && (
            <div className="prog-form-row" style={{ background: "#f1f5f9", padding: 10, borderRadius: 6 }}>
              <label style={{ marginBottom: 4 }}>Total por lavadora del dispositivo</label>
              <div style={{ fontSize: 13, color: "#1f3a5f" }}>
                {totalesPreview.join("  /  ")}
              </div>
            </div>
          )}

          {/* Prioridad alta */}
          <div className="prog-form-row prog-checkbox-row">
            <input
              type="checkbox"
              id="priAlta"
              checked={form.prioridadAlta}
              onChange={(e) => setForm(f => ({ ...f, prioridadAlta: e.target.checked }))}
            />
            <label htmlFor="priAlta" style={{ margin: 0 }}>Prioridad alta</label>
          </div>

          {/* Temperature dosing by product */}
          <div className="prog-form-row">
            <label>Temperature dosing by product</label>
            <span className="prog-badge-disabled">Deshabilitado</span>
          </div>

          {/* Error */}
          {error && (
            <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
