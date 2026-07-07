
// Punto de entrada de la aplicación (componente raíz)
// Mantiene la responsabilidad mínima: renderizar el enrutador de la app.
import AppRoutes from "./routes/AppRoutes";

function App() {
  // Si más adelante se necesita contexto global (Auth, Theme, i18n), envolver aquí
  return <AppRoutes />;
}

export default App;