import { useNavigate } from "react-router-dom";
import "./Header.css";
import { getRawItem, removeRawItem } from "../../services/localMock";
import HeaderActions from "./HeaderActions";
import UserMenu from "./UserMenu";
import { MdMenu } from "react-icons/md";

function Header({ onMenuOpen }) {
  const userName = getRawItem("userName") || "Usuario";
  const navigate = useNavigate();

  function handleLogout() {
    removeRawItem("loggedIn");
    removeRawItem("userName");
    removeRawItem("userEmail");
    removeRawItem("userRole");
    navigate("/login");
  }

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-menu-toggle" onClick={onMenuOpen} aria-label="Open menu">
          <MdMenu size={24} />
        </button>
      </div>

      <div className="header-right">
        <HeaderActions />
        <UserMenu userName={userName} onLogout={handleLogout} />
      </div>
    </header>
  );
}

export default Header;
