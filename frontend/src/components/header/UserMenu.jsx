// Componente `UserMenu`: muestra el nombre del usuario y sus opciones
// (perfil, cambiar contraseña, cerrar sesión)
// - Recibe `userName` y `onLogout` desde el componente padre (Header), que
//   sigue siendo el dueño de la sesión (localStorage) y de la navegación
import { useState, useRef, useEffect } from "react";
import { MdPerson, MdKeyboardArrowDown } from "react-icons/md";

export default function UserMenu({ userName, onLogout }) {
  const [showUser, setShowUser] = useState(false);
  const userRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setShowUser(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="header-item" ref={userRef} onClick={() => setShowUser((v) => !v)}>
      <span className="header-username">{userName}</span>
      <MdPerson className="header-icon" />
      <MdKeyboardArrowDown className="header-arrow" />
      {showUser && (
        <div className="dropdown">
          <p>Mi perfil</p>
          <p>Cambiar contraseña</p>
          <p onClick={onLogout}>Cerrar sesión</p>
          <p>v0.1.0</p>
        </div>
      )}
    </div>
  );
}
