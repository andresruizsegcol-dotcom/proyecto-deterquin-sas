// Página de login (demo)
// - Usa un array `users` hardcodeado para autenticación local; reemplazar por API real
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import { setRawItem } from "../../services/localMock";

const users = [
  
  { email: "admin@deterquin.com", password: "admin123", role: "admin" },
  { email: "usuario@deterquin.com", password: "usuario123", role: "user" },
  { email: "soportetecnico@deterquin.com", password: "soporte123", role: "support",nombre:"Andres felipe ruiz" }
];

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setRawItem("loggedIn", "true");
      setRawItem("userEmail", user.email);
      setRawItem("userRole", user.role);
      setRawItem("userName", user.nombre || "");
      navigate("/");
    } else {
      setError("Correo o contraseña incorrectos");
      setTimeout(() => setError(""), 2000);
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
            />

            <label>Contraseña</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p style={{ color: "#ff4d4d", textAlign: "center", marginTop: "10px" }}>{error}</p>}

            <div className="options">
              <label>
                <input
                  type="checkbox"
                  onChange={(e) => setShowPassword(e.target.checked)}
                /> Mostrar contraseña
              </label>
              <a href="#">¿Olvidaste tu contraseña?</a>
            </div>

            <button type="submit" className="btn">Iniciar sesión</button>

            
            <p className="terms">Al iniciar sesión aceptas nuestras políticas de uso.</p>
          </form>
        </div>
      </div>

    </div>
  );
}

export default LoginPage;
