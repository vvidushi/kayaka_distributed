import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { toggleSidebar, setTheme } from "../../store/slices/uiSlice";
import { FaBars, FaHotel, FaCar, FaHome, FaChartLine } from "react-icons/fa";
import AnimatedIcon from "../common/AnimatedIcon";
import BookingChatWidget from "../common/BookingChatWidget";

const Layout = ({ children }) => {
  const { isAuthenticated, logout, isAdmin, user } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { theme, sidebarOpen } = useSelector((state) => state.ui);
  
  const isOwner = user?.profileType === 'owner';

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleThemeChange = (e) => {
    dispatch(setTheme(e.target.value));
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const nextTheme = savedTheme && ["light", "cupcake", "dark"].includes(savedTheme)
      ? savedTheme
      : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
  }, [theme]);

  const profileImage =
    user?.profileImageUrl ||
    user?.profile_image_url ||
    user?.profileImage ||
    null;

  const initials = (() => {
    const first = user?.firstName?.trim()?.charAt(0) || "";
    const last = user?.lastName?.trim()?.charAt(0) || "";
    const combined = `${first}${last}` || user?.email?.charAt(0) || "U";
    return combined.toUpperCase();
  })();

  return (
    <div className="min-h-screen bg-base-100 text-base-content">
      <div className="navbar bg-base-100 border-b-2 border-base-300 shadow-md sticky top-0 z-50 backdrop-blur-sm bg-base-100/95">
        <div className="navbar-start">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <AnimatedIcon>
                <FaBars className="h-5 w-5" />
              </AnimatedIcon>
            </div>
            <div
              tabIndex={0}
              className="dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
            >
              {isAuthenticated && (
                <div className="flex flex-col gap-1">
                  {isOwner ? (
                    <>
                      <NavLink 
                        to="/owner"
                        end
                        className={({ isActive }) => 
                          `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            isActive 
                              ? 'bg-primary text-primary-content font-semibold' 
                              : 'hover:bg-base-200'
                          }`
                        }
                      >
                        <FaHome className="w-4 h-4" />
                        Owner Dashboard
                      </NavLink>
                      <NavLink 
                        to="/owner/hotels"
                        className={({ isActive }) => 
                          `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            isActive 
                              ? 'bg-primary text-primary-content font-semibold' 
                              : 'hover:bg-base-200'
                          }`
                        }
                      >
                        <FaHotel className="w-4 h-4" />
                        My Hotels
                      </NavLink>
                      <NavLink 
                        to="/owner/cars"
                        className={({ isActive }) => 
                          `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            isActive 
                              ? 'bg-primary text-primary-content font-semibold' 
                              : 'hover:bg-base-200'
                          }`
                        }
                      >
                        <FaCar className="w-4 h-4" />
                        My Cars
                      </NavLink>
                      <NavLink 
                        to="/analytics"
                        className={({ isActive }) => 
                          `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            isActive 
                              ? 'bg-primary text-primary-content font-semibold' 
                              : 'hover:bg-base-200'
                          }`
                        }
                      >
                        <FaChartLine className="w-4 h-4" />
                        Analytics
                      </NavLink>
                    </>
                  ) : (
                    <>
                      <NavLink 
                        to="/bookings"
                        className={({ isActive }) => 
                          `px-4 py-2 rounded-lg transition-colors ${
                            isActive 
                              ? 'bg-primary text-primary-content font-semibold' 
                              : 'hover:bg-base-200'
                          }`
                        }
                      >
                        Bookings
                      </NavLink>
                      <NavLink 
                        to="/payments"
                        className={({ isActive }) => 
                          `px-4 py-2 rounded-lg transition-colors ${
                            isActive 
                              ? 'bg-primary text-primary-content font-semibold' 
                              : 'hover:bg-base-200'
                          }`
                        }
                      >
                        Payments
                      </NavLink>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <Link
            to={isOwner ? "/owner" : "/"}
            className="btn btn-ghost text-2xl md:text-3xl font-bold text-primary logo-shine px-2"
          >
            Kayak
          </Link>
        </div>
        <div className="navbar-center hidden lg:flex flex-1 justify-center max-w-2xl">
          {isAuthenticated && (
            <div className="flex items-center gap-0.5">
              {isOwner ? (
                <>
                  <NavLink 
                    to="/owner" 
                    end
                    className={({ isActive }) => 
                      `relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'text-primary font-semibold' 
                          : 'text-base-content/70 hover:text-base-content hover:bg-base-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <FaHome className="w-4 h-4" />
                        <span>Dashboard</span>
                        {isActive && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-lg shadow-primary/50"></span>
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink 
                    to="/owner/hotels"
                    className={({ isActive }) => 
                      `relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'text-primary font-semibold' 
                          : 'text-base-content/70 hover:text-base-content hover:bg-base-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <FaHotel className="w-4 h-4" />
                        <span>Hotels</span>
                        {isActive && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-lg shadow-primary/50"></span>
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink 
                    to="/owner/cars"
                    className={({ isActive }) => 
                      `relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'text-primary font-semibold' 
                          : 'text-base-content/70 hover:text-base-content hover:bg-base-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <FaCar className="w-4 h-4" />
                        <span>Cars</span>
                        {isActive && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-lg shadow-primary/50"></span>
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink 
                    to="/analytics"
                    className={({ isActive }) => 
                      `relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'text-primary font-semibold' 
                          : 'text-base-content/70 hover:text-base-content hover:bg-base-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <FaChartLine className="w-4 h-4" />
                        <span>Analytics</span>
                        {isActive && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-lg shadow-primary/50"></span>
                        )}
                      </>
                    )}
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink 
                    to="/bookings"
                    className={({ isActive }) => 
                      `relative px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'text-primary font-semibold' 
                          : 'text-base-content/70 hover:text-base-content hover:bg-base-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        Bookings
                        {isActive && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-lg shadow-primary/50"></span>
                        )}
                      </>
                    )}
                  </NavLink>
                  <NavLink 
                    to="/payments"
                    className={({ isActive }) => 
                      `relative px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive 
                          ? 'text-primary font-semibold' 
                          : 'text-base-content/70 hover:text-base-content hover:bg-base-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        Payments
                        {isActive && (
                          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full shadow-lg shadow-primary/50"></span>
                        )}
                      </>
                    )}
                  </NavLink>
                </>
              )}
            </div>
          )}
        </div>
        <div className="navbar-end">
          <select
            className="select select-bordered select-sm mr-2 bg-base-100"
            value={theme}
            onChange={handleThemeChange}
          >
            <option value="light">Light</option>
            <option value="cupcake">Cupcake</option>
            <option value="dark">Dark</option>
          </select>
          {isAuthenticated ? (
            <div className="dropdown dropdown-end">
              <button
                type="button"
                tabIndex={0}
                className="btn btn-ghost btn-circle avatar"
              >
                <div className="w-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-primary text-primary-content flex items-center justify-center font-semibold text-lg uppercase">
                      {initials}
                    </div>
                  )}
                </div>
              </button>
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
              >
                <li className="menu-title">
                  <span className="text-xs font-normal text-base-content/60">
                    {user?.email}
                  </span>
                </li>
                {isOwner && (
                  <li className="menu-title">
                    <span className="badge badge-primary badge-sm">Owner Account</span>
                  </li>
                )}
                <li>
                  <Link to="/profile">Profile</Link>
                </li>
                {isOwner && (
                  <>
                    <li>
                      <Link to="/owner">Owner Dashboard</Link>
                    </li>
                    <li>
                      <Link to="/owner/hotels">My Hotels</Link>
                    </li>
                    <li>
                      <Link to="/owner/cars">My Cars</Link>
                    </li>
                    <li>
                      <Link to="/analytics">Analytics</Link>
                    </li>
                  </>
                )}
                {isAdmin() && (
                  <li>
                    <Link to="/admin">Admin</Link>
                  </li>
                )}
                <li>
                  <a onClick={handleLogout}>Logout</a>
                </li>
              </ul>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary">
              Login
            </Link>
          )}
        </div>
      </div>

      <main>{children}</main>

      <footer className="footer footer-center p-4 bg-base-200 text-base-content">
        <aside>
          <p> 2024 Kayak Simulation Platform. All rights reserved.</p>
        </aside>
      </footer>

      {/* Floating bookings chat available on all screens */}
      <BookingChatWidget />
    </div>
  );
};

export default Layout;
