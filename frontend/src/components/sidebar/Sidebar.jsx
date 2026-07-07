import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Sidebar.css";
import logo from "../../assets/logo.png";
import {
  MdDashboard, MdPeople, MdDevices,
  MdDescription, MdKeyboardArrowDown,
  MdArrowForward, MdArrowBack,
} from "react-icons/md";
import { REPORT_TYPES } from "../../constants/reportTypes";

function Sidebar({ collapsed, setCollapsed }) {
  const [activeItem, setActiveItem] = useState("dashboard");
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const [showInformesMenu, setShowInformesMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>

      <div className="sidebar-top">
        <div className="sidebar-logo">
          <img src={logo} alt="Logo Deterquin" />
        </div>
        <button className="menu-button" onClick={() => setCollapsed(v => !v)}>
          {collapsed ? <MdArrowForward size={22} /> : <MdArrowBack size={22} />}
        </button>
      </div>

      <nav className="sidebar-menu">
        {!collapsed && <div className="sidebar-section">General</div>}

        {/* Dashboard */}
        <div>
          <button
            type="button"
            className={`sidebar-item ${activeItem === "dashboard" ? "active" : ""} ${showDashboardMenu ? "open" : ""}`}
            onClick={() => {
              if (collapsed) { setActiveItem("dashboard"); navigate("/"); }
              else { setShowDashboardMenu(v => !v); setActiveItem("dashboard"); }
            }}
          >
            <MdDashboard size={20} />
            {!collapsed && (
              <>
                <span style={{ flex: 1 }}>Dashboard</span>
                <MdKeyboardArrowDown className={`submenu-arrow ${showDashboardMenu ? "open" : ""}`} size={18} />
              </>
            )}
          </button>
          {!collapsed && showDashboardMenu && (
            <div className="submenu">
              <button
                type="button"
                className={`submenu-item ${activeItem === "dashboard-dispositivo" ? "active" : ""}`}
                onClick={() => { setActiveItem("dashboard-dispositivo"); navigate("/dashboard/dispositivo"); }}
              >
                <MdDashboard size={16} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <strong style={{ display: "block" }}>Dashboard</strong>
                  <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>del dispositivo</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Clientes */}
        <div
          className={`sidebar-item ${activeItem === "clientes" ? "active" : ""}`}
          onClick={() => { setActiveItem("clientes"); navigate("/clientes"); }}
        >
          <MdPeople size={24} />
          {!collapsed && <span>Clientes</span>}
        </div>

        {/* Dispositivos */}
        <div
          className={`sidebar-item ${activeItem === "dispositivos" ? "active" : ""}`}
          onClick={() => { setActiveItem("dispositivos"); navigate("/dispositivos"); }}
        >
          <MdDevices size={24} />
          {!collapsed && <span>Dispositivos</span>}
        </div>

        {/* Informes: un ítem de submenú por cada tipo en REPORT_TYPES, así
            Sidebar.jsx y Reportspage.jsx siempre quedan sincronizados. Con
            10 tipos, el submenú puede ser más alto que el resto del
            sidebar, así que permite scroll interno (.submenu-scroll). */}
        <div>
          <button
            type="button"
            className={`sidebar-item ${activeItem === "informes" ? "active" : ""} ${showInformesMenu ? "open" : ""}`}
            onClick={() => {
              if (collapsed) { setActiveItem("informes"); navigate("/informes"); }
              else { setShowInformesMenu(v => !v); setActiveItem("informes"); }
            }}
          >
            <MdDescription size={24} />
            {!collapsed && (
              <>
                <span style={{ flex: 1 }}>Informes</span>
                <MdKeyboardArrowDown className={`submenu-arrow ${showInformesMenu ? "open" : ""}`} size={20} />
              </>
            )}
          </button>
          {!collapsed && showInformesMenu && (
            <div className="submenu submenu-scroll">
              {REPORT_TYPES.map((report) => {
                const Icon = report.icon;
                const itemKey = `informes-${report.slug}`;
                return (
                  <button
                    key={report.slug}
                    type="button"
                    className={`submenu-item ${activeItem === itemKey ? "active" : ""}`}
                    onClick={() => { setActiveItem(itemKey); navigate(`/informes/${report.slug}`); }}
                  >
                    <Icon size={16} />
                    <span style={{ fontWeight: 500 }}>{report.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </nav>
    </aside>
  );
}

export default Sidebar;
