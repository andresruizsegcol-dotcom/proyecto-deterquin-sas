// Formulario de Dispositivo, compartido entre ClientsDetail.jsx (crear y
// editar dispositivos de un cliente) y DevicesPage.jsx (editar desde la
// vista global de dispositivos), para no mantener dos copias del mismo
// formulario con el riesgo de que se desincronicen.
// - Si `device` viene definido, el modal entra en modo "editar" (precarga
//   sus valores); si es null, entra en modo "crear".
// - Reutiliza las clases `.cd-modal*` definidas en ClientsDetail.css para
//   mantener un único estilo de modal en todo el proyecto.
import { useState } from "react";
import { MdClose } from "react-icons/md";
import "../../pages/clients/ClientsDetail.css";

const TIPOS = ["Dosificador", "Sensor", "Controlador", "Otro"];

function DeviceFormModal({ device, onSave, onClose }) {
  const isEdit = Boolean(device);
  const [form, setForm] = useState(() =>
    device ? { ...device } : { nombre: "", serial: "", tipo: "", ubicacion: "" }
  );

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = () => {
    if (!form.nombre || !form.serial) return;
    onSave(isEdit ? form : { ...form, id: Date.now(), estado: "activo" });
  };

  return (
    <div className="cd-modal-overlay" onClick={onClose}>
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cd-modal-header">
          <h3>{isEdit ? "Editar Dispositivo" : "Nuevo Dispositivo"}</h3>
          <button className="cd-modal-close" onClick={onClose}><MdClose size={20} /></button>
        </div>
        <div className="cd-modal-body">
          <label>Nombre *</label>
          <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej: Dosificador Principal" />
          <label>Serial *</label>
          <input name="serial" value={form.serial} onChange={handleChange} placeholder="Ej: DQ-00456" />
          <label>Tipo</label>
          <select name="tipo" value={form.tipo || ""} onChange={handleChange}>
            <option value="">Seleccionar tipo</option>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label>Ubicación</label>
          <input name="ubicacion" value={form.ubicacion || ""} onChange={handleChange} placeholder="Ej: Lavandería Piso 1" />
        </div>
        <div className="cd-modal-footer">
          <button className="cd-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="cd-btn-crear" onClick={handleSubmit} disabled={!form.nombre || !form.serial}>
            {isEdit ? "Guardar" : "Crear"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeviceFormModal;
