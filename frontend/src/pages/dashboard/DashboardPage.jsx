// Página principal del dashboard
// - Calcula los KPIs reales a partir de los clientes/dispositivos guardados
//   en localStorage (vía el servicio `localMock`).
// - "Alarmas Activas" e "Informes" siguen en "0": todavía no existe un
//   modelo de datos para alarmas ni informes en ningún lado de la app.
import "./DashboardPage.css";
import { MdPeople, MdDevices, MdAlarm, MdEditDocument } from "react-icons/md";
import { getClients, getDeviceCounts } from "../../services/localMock";

function DashboardPage() {
  const clientes = getClients();

  const { totalDispositivos, dispositivosActivos } = clientes.reduce(
    (acc, _cliente, index) => {
      const { total, activos } = getDeviceCounts(index);
      return {
        totalDispositivos: acc.totalDispositivos + total,
        dispositivosActivos: acc.dispositivosActivos + activos,
      };
    },
    { totalDispositivos: 0, dispositivosActivos: 0 }
  );

  const kpis = [
    { icon: <MdPeople size={32} />, label: "Total Clientes", value: String(clientes.length), color: "#2cc664" },
    { icon: <MdDevices size={32} />, label: "Dispositivos Activos", value: `${dispositivosActivos}/${totalDispositivos}`, color: "#3b82f6" },
    { icon: <MdAlarm size={32} />, label: "Alarmas Activas", value: "0", color: "#ef4444" },
    { icon: <MdEditDocument size={32} />, label: "Informes", value: "0", color: "#f59e0b" },
  ];

  return (
    <div className="dashboard-page">
      <h2 className="dashboard-title">Resumen General</h2>
      <div className="kpi-grid">
        {kpis.map((kpi, i) => (
          <div className="kpi-card" key={i}>
            <div className="kpi-icon" style={{ color: kpi.color }}>
              {kpi.icon}
            </div>
            <div className="kpi-info">
              <span className="kpi-value">{kpi.value}</span>
              <span className="kpi-label">{kpi.label}</span>
            </div>
          </div>
          
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
