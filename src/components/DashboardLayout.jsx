import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

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
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: "Logs",
      path: "/logs",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: "Vulnerabilities",
      path: "/vulnerabilities",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      name: "Alerts",
      path: "/alerts",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      name: "Traffic",
      path: "/traffic",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h4l3 8 4-16 3 8h4" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
      
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-cyan-500/20 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        
        {/* Logo */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/50">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>

            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              SEO Intrusion
            </h1>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-cyan-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              className={`flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200 group relative overflow-hidden ${
                location.pathname === item.path
                  ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 shadow-lg shadow-cyan-500/20 border border-cyan-500/30"
                  : "text-gray-400 hover:text-cyan-300 hover:bg-slate-800/50"
              }`}
            >
              {location.pathname === item.path && (
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-cyan-400 to-purple-500 rounded-r"></div>
              )}
              
              <div
                className={`${
                  location.pathname === item.path
                    ? "text-cyan-400"
                    : "text-gray-500 group-hover:text-cyan-400"
                } transition-colors`}
              >
                {item.icon}
              </div>

              <span className="ml-3">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* System Status */}
        <div className="px-4 pb-4">
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
              <span className="text-xs font-semibold text-emerald-400">SYSTEM ONLINE</span>
            </div>
            <p className="text-xs text-gray-400">All services operational</p>
          </div>
        </div>

        {/* Logout */}
        <div className="px-4 py-6 border-t border-cyan-500/20">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-400 rounded-xl hover:bg-gradient-to-r hover:from-red-500/20 hover:to-pink-500/20 hover:text-red-400 transition-all duration-200 border border-transparent hover:border-red-500/30 group"
          >
            <svg className="w-6 h-6 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>

            <span className="ml-3">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 min-h-screen overflow-x-hidden bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
          {children}
        </main>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Floating Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-30 w-14 h-14 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full shadow-2xl shadow-cyan-500/50 flex items-center justify-center text-white hover:scale-110 transition-transform"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  );
}
