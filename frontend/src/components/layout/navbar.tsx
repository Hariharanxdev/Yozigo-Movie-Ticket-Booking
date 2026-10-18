
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminApi } from "../../services/api";

function Navbar() {
  const navigate = useNavigate();

  const [isLoggedIn, setIsLoggedIn] = useState(() =>
    Boolean(localStorage.getItem("access_token"))
  );
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    const updateAuthStatus = async () => {
      const token = localStorage.getItem("access_token");
      setIsLoggedIn(Boolean(token));

      if (!token) {
        setIsAdmin(false);
        return;
      }

      try {
        const user = await adminApi.getCurrentUser();
        if (active) {
          setIsAdmin(user.is_admin);
        }
      } catch {
        if (active) {
          setIsAdmin(false);
        }
      }
    };

    updateAuthStatus();

    window.addEventListener("auth-change", updateAuthStatus);

    return () => {
      active = false;
      window.removeEventListener("auth-change", updateAuthStatus);
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("access_token");
    window.dispatchEvent(new Event("auth-change"));
    setIsLoggedIn(false);
    setIsAdmin(false);
    navigate("/", { replace: true });
  }

  return (
    <header className="navbar">
      <Link className="logo" to="/">
        yozigo<span>.</span>
      </Link>

      <nav className="navbar-links">
        <Link to="/">Movies</Link>
        <a href="/#about">About</a>

        {isLoggedIn && isAdmin && (
          <Link to="/admin">Admin Dashboard</Link>
        )}
      </nav>

      <div className="navbar-actions">
        {isLoggedIn ? (
          <>
            {!isAdmin && (
              <Link className="my-bookings-link" to="/my-bookings">
                My Bookings
              </Link>
            )}

            <button
              className="login-button"
              type="button"
              onClick={handleLogout}
            >
              Logout
            </button>
          </>
        ) : (
          <Link className="login-button" to="/login">
            Login
          </Link>
        )}
      </div>
    </header>
  );
}

export default Navbar;
