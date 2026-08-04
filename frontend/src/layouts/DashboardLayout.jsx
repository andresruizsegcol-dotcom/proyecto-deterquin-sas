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
import AjustesPage from "../pages/devices/AjustesPage";
import ReportsPage from "../pages/reports/Reportspage";
import UbicacionPage from "../pages/reports/UbicacionPage";
import ProgramasPage from "../pages/clients/ProgramasPage";
import ProgramaDetallePage from "../pages/clients/ProgramaDetallePage";
import PasoDetallePage from "../pages/clients/PasoDetallePage";
import UsersPage from "../pages/users/UsersPage";
import "./DashboardLayout.css";

function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  // Mobile drawer — only used on screens ≤767px (controlled via CSS classes)
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="dashboard-layout">
      {/* Overlay — closes the drawer when tapped outside on mobile */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="main-content">
        <Header onMenuOpen={() => setMobileOpen(true)} />
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
            <Route path="/dispositivos/:deviceId/ajustes" element={<AjustesPage />} />
            <Route path="/dispositivos/:deviceId/programas" element={<ProgramasPage />} />
            <Route path="/dispositivos/:deviceId/programas/:programaId" element={<ProgramaDetallePage />} />
            <Route path="/dispositivos/:deviceId/programas/:programaId/pasos/:pasoId" element={<PasoDetallePage />} />

            {/* Cada tipo de informe (REPORT_TYPES) navega a /informes/:tipo;
                ReportsPage lee el parámetro para decidir qué contenido
                renderizar. /informes sin tipo cae al primero por defecto. */}
            <Route path="/informes" element={<ReportsPage />} />
            <Route path="/informes/ubicacion" element={<UbicacionPage />} />
            <Route path="/informes/:tipo" element={<ReportsPage />} />

            {/* ── Módulo Administración ── */}
            <Route path="/administracion/usuarios" element={<UsersPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;