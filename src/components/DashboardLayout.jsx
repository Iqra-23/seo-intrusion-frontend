import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  AlertTriangle,
  Shield,
  Activity,
  Bell,
  Globe2,
  Cpu,
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
      name: "Alerts",
      path: "/alerts",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      name: "Vulnerabilities",
      path: "/vulnerabilities",
      icon: <Shield className="w-5 h-5" />,
    },
    {
      name: "Traffic Monitor",
      path: "/traffic",
      icon: <Activity className="w-5 h-5" />,
    },
    {
      name: "Logs",
      path: "/logs",
      icon: <Globe2 className="w-5 h-5" />,
    },
    {
      name: "System",
      path: "/system",
      icon: <Cpu className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen flex bg-[#020617] text-gray-100">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900/80 border-r border-slate-800 p-4 transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-64"
        } md:translate-x-0`}
      >
        <h2 className="text-xl font-bold text-cyan-300 mb-6 px-2">
          SEO Intrusion Detector
        </h2>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                location.pathname === item.path
                  ? "bg-cyan-600/20 text-cyan-300 border border-cyan-500/40"
                  : "hover:bg-slate-800/60"
              }`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-6 w-full px-3 py-2 rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 text-sm hover:bg-red-600/30 transition"
        >
          Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 md:ml-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <button
            className="md:hidden p-2 rounded-lg bg-slate-800 border border-slate-700"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>

          <h1 className="text-lg font-semibold tracking-wide text-cyan-300">
            Dashboard
          </h1>
        </header>

        {/* Page Content */}
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
