// Componente de protección de rutas
// - Verifica si hay una sesión activa (loggedIn === "true" en localStorage)
// - Si no la hay, redirige a /login y conserva la ruta de origen en `state.from`
//   para poder volver allí después de iniciar sesión.
// Nota: esto solo evita la navegación accidental dentro del SPA en el cliente.
// No sustituye una autenticación real en backend (token/sesión validada en servidor).
import { Navigate, useLocation } from "react-router-dom";
import { getRawItem } from "../services/localMock";

function ProtectedRoute({ children }) {
  const location = useLocation();
  const isLoggedIn = getRawItem("loggedIn") === "true";

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;
