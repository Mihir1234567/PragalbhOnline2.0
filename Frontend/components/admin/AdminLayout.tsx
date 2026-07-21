import React from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Briefcase,
  LogOut,
  Sun,
  Moon,
  MessageSquare,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useAdminProfile } from "../../context/AdminProfileContext";
import { useTheme } from "../../context/ThemeContext";

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();
  const { profile } = useAdminProfile();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Force Admin to English
  React.useEffect(() => {
    if (language !== "EN") {
      setLanguage("EN");
    }
  }, [language, setLanguage]);

  const navItems = [
    { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/admin/services", label: "Apply Services", icon: Briefcase },
    {
      path: "/admin/reviews",
      label: "Reviews & Feedbacks",
      icon: MessageSquare,
    },
    {
      path: "/admin/whatsapp",
      label: "WhatsApp CRM",
      icon: MessageSquare,
    },
  ];

  const getPageTitle = () => {
    if (location.pathname.includes("services")) return "Apply for Services";
    return "Admin Dashboard";
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 font-sans flex-col lg:flex-row">
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 text-slate-600 dark:text-slate-400"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-40 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center px-4 lg:px-6 border-b border-slate-200 dark:border-slate-700">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg mr-3">
            PA
          </div>
          <span className="text-lg lg:text-xl font-heading font-bold text-slate-800 dark:text-white">
            Admin Panel
          </span>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200"
                }`
              }
            >
              <item.icon size={20} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-slate-200 dark:border-slate-700 lg:hidden">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold">
                {profile.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {profile.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Administrator
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={toggleTheme}
                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-500 transition-colors text-xs font-medium"
              >
                {theme === "dark" ? (
                  <>
                    <Sun size={14} /> Light
                  </>
                ) : (
                  <>
                    <Moon size={14} /> Dark
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("pragalbh_admin_auth");
                  navigate("/admin/login");
                }}
                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 shadow-sm border border-red-100 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors text-xs font-medium"
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 hidden lg:block">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Pragalbh Admin v1.0
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 lg:h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-8">
          <h1 className="text-lg lg:text-xl font-bold text-slate-800 dark:text-white truncate">
            {getPageTitle()}
          </h1>
          <div className="hidden lg:flex items-center gap-3 lg:gap-4">
            <span className="text-sm font-semibold text-slate-800 dark:text-white truncate">
              {profile.name}
            </span>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("pragalbh_admin_auth");
                navigate("/admin/login");
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-red-600 dark:text-red-400"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900/50 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
