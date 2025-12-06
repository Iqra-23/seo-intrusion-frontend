import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Shield,
  LayoutDashboard,
  FileText,
  AlertTriangle,
  Activity,
  RadioTower,
  LogOut,
} from "lucide-react";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      name: "Logs",
      path: "/logs",
      icon: <FileText className="w-5 h-5" />,
    },
    {
      name: "Vulnerabilities",
      path: "/vulnerabilities",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      name: "Alerts",
      path: "/alerts",
      icon: <RadioTower className="w-5 h-5" />,
    },
    {
      name: "Traffic",
      path: "/traffic",
      icon: <Activity className="w-5 h-5" />,
    },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Sidebar – desktop */}
      <aside className="hidden md:flex md:flex-col w-72 border-r border-slate-800 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950/98">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/70">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-cyan-500/40">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs tracking-[0.24em] text-cyan-300/80 uppercase">
              SEO Intrusion
            </p>
            <p className="text-base font-semibold text-slate-50">
              Security Console
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-colors
              ${
                isActive(item.path)
                  ? "bg-gradient-to-r from-cyan-500/30 via-sky-500/25 to-fuchsia-500/25 text-cyan-100 border border-cyan-400/50 shadow-lg shadow-cyan-500/25"
                  : "text-slate-300/80 hover:text-cyan-100 hover:bg-slate-900/70 border border-transparent hover:border-slate-700/70"
              }`}
            >
              <span
                className={`flex items-center justify-center rounded-xl px-2 py-2 ${
                  isActive(item.path)
                    ? "bg-slate-900/80 text-cyan-300"
                    : "bg-slate-900/60 text-slate-400 group-hover:text-cyan-300"
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="px-4 pb-4 pt-2 border-t border-slate-800/70 space-y-2">
          <div className="px-3 py-2.5 rounded-2xl bg-slate-900/80 border border-emerald-500/40 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-emerald-300">
                System Online
              </span>
              <span className="text-[11px] text-slate-400">
                All services operational
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-between px-3 py-2.5 rounded-2xl text-sm bg-slate-900/80 border border-slate-800/80 hover:border-rose-500/60 hover:text-rose-200 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-slate-950/90 border border-slate-700/80">
                <LogOut className="w-4 h-4" />
              </span>
              Logout
            </span>
            <span className="text-[11px] text-slate-500">⇧⌘Q</span>
          </button>
        </div>
      </aside>

      {/* Sidebar – mobile toggle button */}
      <button
        type="button"
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="md:hidden fixed top-4 left-4 z-40 rounded-xl bg-slate-900/90 border border-slate-700/80 px-2.5 py-2 flex items-center gap-2 shadow-lg shadow-slate-900/70"
      >
        <Shield className="w-5 h-5 text-cyan-400" />
        <span className="text-xs text-slate-100">Menu</span>
      </button>

      {/* Sidebar – mobile drawer */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/70">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-fuchsia-500 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-semibold">SEO Intrusion</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-slate-100 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-colors
                  ${
                    isActive(item.path)
                      ? "bg-slate-900 text-cyan-100 border border-cyan-500/50"
                      : "text-slate-300/80 hover:text-cyan-100 hover:bg-slate-900/70 border border-transparent hover:border-slate-700/70"
                  }`}
                >
                  <span className="flex items-center justify-center rounded-xl px-2 py-2 bg-slate-900/60 text-slate-400 group-hover:text-cyan-300">
                    {item.icon}
                  </span>
                  <span className="truncate">{item.name}</span>
                </Link>
              ))}
            </nav>

            <div className="px-4 pb-4 pt-2 border-t border-slate-800/70 space-y-2">
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  handleLogout();
                }}
                className="w-full inline-flex items-center justify-between px-3 py-2.5 rounded-2xl text-sm bg-slate-900/80 border border-slate-800/80 hover:border-rose-500/60 hover:text-rose-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-slate-950/90 border border-slate-700/80">
                    <LogOut className="w-4 h-4" />
                  </span>
                  Logout
                </span>
              </button>
            </div>
          </div>

          {/* overlay */}
          <div
            className="flex-1 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-h-screen bg-gradient-to-br from-black via-slate-950 to-slate-900 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
// End of DashboardLayout.jsx