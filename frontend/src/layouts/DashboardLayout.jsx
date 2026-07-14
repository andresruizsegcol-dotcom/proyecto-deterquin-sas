import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";
import Header from "../components/header/Header";
import DashboardPage from "../pages/dashboard/DashboardPage";
import DashboardStatsPage from "../pages/dashboard/DashboardStatsPage";
import ClientsPage from "../pages/clients/ClientsPage";
import DevicesPage from "../pages/devices/DevicesPage";
import ClientsDetail from "../pages/clients/ClientsDetail";
import DeviceDetailPage from "../pages/devices/DeviceDetailPage";
import ReportsPage from "../pages/reports/Reportspage";
import ProgramasPage from "../pages/clients/ProgramasPage";
import ProgramaDetallePage from "../pages/clients/ProgramaDetallePage";
import PasoDetallePage from "../pages/clients/PasoDetallePage";
import "./DashboardLayout.css";

function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="dashboard-layout">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="main-content">
        <Header />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/dashboard/dispositivo"
              element={<DashboardStatsPage />}
            />
            <Route path="/clientes" element={<ClientsPage />} />

            <Route path="/clientes/:id" element={<ClientsDetail />} />


            <Route path="/dispositivos" element={<DevicesPage />} />
            <Route path="/dispositivos/:deviceId" element={<DeviceDetailPage />} />
            <Route path="/dispositivos/:deviceId/programas" element={<ProgramasPage />} />
            <Route path="/dispositivos/:deviceId/programas/:programaId" element={<ProgramaDetallePage />} />
            <Route path="/dispositivos/:deviceId/programas/:programaId/pasos/:pasoId" element={<PasoDetallePage />} />

            {/* Cada tipo de informe (REPORT_TYPES) navega a /informes/:tipo;
                ReportsPage lee el parámetro para decidir qué contenido
                renderizar. /informes sin tipo cae al primero por defecto. */}
            <Route path="/informes" element={<ReportsPage />} />
            <Route path="/informes/:tipo" element={<ReportsPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;