// Inicialización de React y renderizado de la aplicación
// Aquí es donde se puede envolver la app con providers (Redux, React Query, Theme, etc.)
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  // `StrictMode` ayuda a detectar prácticas inseguras en desarrollo
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
