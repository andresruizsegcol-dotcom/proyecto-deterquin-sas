// Componente auxiliar para acciones del header
// - Encapsula el ícono de información y el menú de notificaciones
// - Mantiene su propio estado de apertura/cierre (incluyendo el cierre al
//   hacer clic afuera), así Header.jsx no necesita conocer estos detalles
import { useState, useRef, useEffect } from "react";
import { MdInfo, MdNotifications, MdKeyboardArrowDown } from "react-icons/md";

export default function HeaderActions() {
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <MdInfo className="header-icon" />

      <div className="header-item" ref={notifRef} onClick={() => setShowNotif((v) => !v)}>
        <MdNotifications className="header-icon" />
        <MdKeyboardArrowDown className="header-arrow" />
        {showNotif && (
          <div className="dropdown">
            <p>No hay notificaciones</p>
          </div>
        )}
      </div>
    </>
  );
}
