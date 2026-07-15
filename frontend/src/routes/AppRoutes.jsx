// Enrutamiento principal de la aplicación
// - `BrowserRouter` mantiene el historial HTML5
// - Rutas públicas/protegidas pueden manejarse aquí o dentro del layout
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import LoginPage from "../pages/auth/LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import ProgramasPage from "../pages/clients/ProgramasPage";
import ProgramaDetallePage from "../pages/clients/ProgramaDetallePage";
import PasoDetallePage from "../pages/clients/PasoDetallePage";


function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta de login pública */}
        <Route path="/login" element={<LoginPage />} />

        {/* El resto de rutas usan el `DashboardLayout`, protegido por `ProtectedRoute`:
            si no hay sesión activa, se redirige a /login antes de renderizarlo. */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;