import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css";
import logo from "../../assets/logo.png";
import {
  MdDashboard, MdPeople, MdDevices,
  MdDescription, MdKeyboardArrowDown,
  MdArrowForward, MdArrowBack,
} from "react-icons/md";
import { REPORT_TYPES } from "../../constants/reportTypes";

function Sidebar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active item from the current URL so refresh / direct navigation works
  const getActiveFromPath = (pathname) => {
    if (pathname.startsWith("/informes/")) {
      const slug = pathname.split("/informes/")[1].split("/")[0];
      return `informes-${slug}`;
    }
    if (pathname === "/informes") return "informes";
    if (pathname.startsWith("/dashboard/dispositivo")) return "dashboard-dispositivo";
    if (pathname === "/" || pathname.startsWith("/dashboard")) return "dashboard";
    if (pathname.startsWith("/clientes")) return "clientes";
    if (pathname.startsWith("/dispositivos")) return "dispositivos";
    return "dashboard";
  };

  const [activeItem, setActiveItem] = useState(() => getActiveFromPath(location.pathname));

  // Auto-open submenus based on current route
  const [showDashboardMenu, setShowDashboardMenu] = useState(
    () => location.pathname.startsWith("/dashboard/")
  );
  const [showInformesMenu, setShowInformesMenu] = useState(
    () => location.pathname.startsWith("/informes")
  );

  // Keep active item in sync when the URL changes (e.g. browser back/forward)
  useEffect(() => {
    const next = getActiveFromPath(location.pathname);
    setActiveItem(next);
    if (next.startsWith("informes")) setShowInformesMenu(true);
    if (next.startsWith("dashboard-")) setShowDashboardMenu(true);
  }, [location.pathname]);

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
            className={`sidebar-item ${activeItem === "dashboard" || activeItem === "dashboard-dispositivo" ? "active" : ""} ${showDashboardMenu ? "open" : ""}`}
            onClick={() => {
              if (collapsed) { navigate("/"); }
              else { setShowDashboardMenu(v => !v); }
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
                onClick={() => navigate("/dashboard/dispositivo")}
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
          onClick={() => navigate("/clientes")}
        >
          <MdPeople size={24} />
          {!collapsed && <span>Clientes</span>}
        </div>

        {/* Dispositivos */}
        <div
          className={`sidebar-item ${activeItem === "dispositivos" ? "active" : ""}`}
          onClick={() => navigate("/dispositivos")}
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
            className={`sidebar-item ${activeItem === "informes" || activeItem.startsWith("informes-") ? "active" : ""} ${showInformesMenu ? "open" : ""}`}
            onClick={() => {
              if (collapsed) { navigate("/informes"); }
              else { setShowInformesMenu(v => !v); }
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
                    onClick={() => navigate(`/informes/${report.slug}`)}
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
