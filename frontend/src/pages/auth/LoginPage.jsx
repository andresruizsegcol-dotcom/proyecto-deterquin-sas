// Página de login (demo)
// - Usa un array `users` hardcodeado para autenticación local; reemplazar por API real
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import { setRawItem } from "../../services/localMock";

const users = [
  { email: "admin@deterquin.com", password: "admin123", role: "admin" },
  { email: "usuario@deterquin.com", password: "usuario123", role: "user" },
  { email: "soportetecnico@deterquin.com", password: "soporte123", role: "support", nombre: "Andres felipe ruiz" }
];

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); // 👈 NUEVO: estado de carga
  const navigate = useNavigate();

  const handleSubmit = async (e) => {  // 👈 AHORA ES ASYNC
    e.preventDefault();

    if (loading) return; // Evita doble submit

    setLoading(true);
    setError("");

    try {
      // 👇 Simula delay de API real (recomendado 800-1500ms)
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const user = users.find(u => u.email === email && u.password === password);

      if (user) {
        setRawItem("loggedIn", "true");
        setRawItem("userEmail", user.email);
        setRawItem("userRole", user.role);
        setRawItem("userName", user.nombre || "");
        navigate("/");
      } else {
        setError("Correo o contraseña incorrectos");
        setTimeout(() => setError(""), 2500);
      }
    } catch (err) {
      setError("Ocurrió un error. Intenta nuevamente.");
    } finally {
      setLoading(false); // 👈 Siempre se ejecuta
    }
  };

  return (
    <div className="container">
      <div className="left">
        <img src="/images/planeta..png" alt="Planeta sostenible" className="planet" />
      </div>

      <div className="right">
        <div className="login-box">
          <img src="/images/06e3e2e9-9165-4712-8e99-ece97588b5dc.png" alt="Logo Deterquin" className="logo" />
          <h1>Bienvenido a Deterquin</h1>
          <p className="subtitle">Inicia sesión para continuar</p>

          <form onSubmit={handleSubmit}>
            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="Ingresa tu correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading} // 👈 Deshabilitado durante carga
            />

            <label>Contraseña</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading} // 👈 Deshabilitado durante carga
            />

            {error && <p className="error-message">{error}</p>}

            <div className="options">
              <label className={loading ? "disabled" : ""}>
                <input
                  type="checkbox"
                  onChange={(e) => setShowPassword(e.target.checked)}
                  disabled={loading}
                /> Mostrar contraseña
              </label>
              <a href="#" className={loading ? "disabled" : ""}>¿Olvidaste tu contraseña?</a>
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  <span>Ingresando...</span>
                </>
              ) : (
                "Iniciar sesión"
              )}
            </button>

            <p className="terms">Al iniciar sesión aceptas nuestras políticas de uso.</p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
