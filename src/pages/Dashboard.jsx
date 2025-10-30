import { useEffect, useState } from "react";
import api from "../api/api";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import CountUp from "react-countup";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    logs: 0,
    vulns: 0,
    errors: 0,
    warnings: 0,
    suspicious: 0,
    highSeverity: 0,
    mediumSeverity: 0,
    lowSeverity: 0,
    user: "",
  });

  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState([]);
  const [recentVulns, setRecentVulns] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const token = localStorage.getItem("token");
        let decoded = {};
        if (token) {
          decoded = jwtDecode(token);
          setStats((prev) => ({ ...prev, user: decoded.email }));
        }

        const [logsRes, vulnsRes] = await Promise.all([
          api.get("/logs"),
          api.get("/vulnerabilities"),
        ]);

        console.log("Logs response:", logsRes.data);
        console.log("Vulnerabilities response:", vulnsRes.data);

        // ✅ Make sure data is always an array
        const logs = Array.isArray(logsRes.data)
          ? logsRes.data
          : logsRes.data.logs || logsRes.data.data || [];

        const vulns = Array.isArray(vulnsRes.data)
          ? vulnsRes.data
          : vulnsRes.data.vulnerabilities || vulnsRes.data.data || [];

        // 🧠 Now safe to use .filter()
        const errors = logs.filter((l) => l.level === "error").length;
        const warnings = logs.filter((l) => l.level === "warning").length;
        const suspicious = logs.filter((l) => l.level === "suspicious").length;

        const highSeverity = vulns.filter(
          (v) => v.severity?.toLowerCase() === "high"
        ).length;
        const mediumSeverity = vulns.filter(
          (v) => v.severity?.toLowerCase() === "medium"
        ).length;
        const lowSeverity = vulns.filter(
          (v) => v.severity?.toLowerCase() === "low"
        ).length;

        setStats({
          logs: logs.length,
          vulns: vulns.length,
          errors,
          warnings,
          suspicious,
          highSeverity,
          mediumSeverity,
          lowSeverity,
          user: decoded?.email || "",
        });

        setRecentLogs(logs.slice(0, 5));
        setRecentVulns(vulns.slice(0, 5));
      } catch (error) {
        toast.error("Failed to load dashboard data");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const logChartData = {
    labels: ["Errors", "Warnings", "Suspicious"],
    datasets: [
      {
        label: "Log Distribution",
        data: [stats.errors, stats.warnings, stats.suspicious],
        backgroundColor: [
          "rgba(239, 68, 68, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(168, 85, 247, 0.8)",
        ],
        borderColor: [
          "rgba(239, 68, 68, 1)",
          "rgba(251, 191, 36, 1)",
          "rgba(168, 85, 247, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const vulnChartData = {
    labels: ["High", "Medium", "Low"],
    datasets: [
      {
        label: "Vulnerabilities by Severity",
        data: [stats.highSeverity, stats.mediumSeverity, stats.lowSeverity],
        backgroundColor: [
          "rgba(220, 38, 38, 0.7)",
          "rgba(245, 158, 11, 0.7)",
          "rgba(34, 197, 94, 0.7)",
        ],
        borderColor: [
          "rgba(220, 38, 38, 1)",
          "rgba(245, 158, 11, 1)",
          "rgba(34, 197, 94, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#9ca3af',
          font: {
            size: 12
          }
        }
      }
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        },
        ticks: {
          color: '#9ca3af'
        }
      },
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        },
        ticks: {
          color: '#9ca3af'
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#9ca3af',
          font: {
            size: 12
          },
          padding: 15
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 min-h-screen p-6 space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-8 border border-cyan-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Welcome back, {stats.user || "User"} 👋
            </h1>
            <p className="text-gray-400 text-lg">
              SEO Intrusion Detection System – Real-time monitoring and protection
            </p>
          </div>
          <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 px-6 py-3 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
              <span className="text-emerald-400 font-semibold text-sm">System Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: "Total Logs", value: stats.logs, gradient: "from-cyan-500 to-blue-600", icon: "🧾" },
          { title: "Vulnerabilities", value: stats.vulns, gradient: "from-red-500 to-pink-600", icon: "⚠️" },
          { title: "Error Logs", value: stats.errors, gradient: "from-amber-500 to-orange-600", icon: "❌" },
          { title: "System Status", value: "Active", gradient: "from-emerald-500 to-teal-600", icon: "✅" },
        ].map((card, i) => (
          <div
            key={i}
            className="group relative bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}></div>
            
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex-1">
                <p className="text-gray-400 text-sm font-medium mb-2">{card.title}</p>
                <h3 className={`text-4xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}>
                  {typeof card.value === "number" ? (
                    <CountUp end={card.value} duration={1.5} />
                  ) : (
                    card.value
                  )}
                </h3>
              </div>
              <div className={`text-4xl opacity-80 group-hover:scale-110 transition-transform duration-300`}>
                {card.icon}
              </div>
            </div>
            
            <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${card.gradient} rounded-b-2xl w-full transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-200">Log Distribution</h2>
          </div>
          <div className="h-64">
            <Doughnut
              data={logChartData}
              options={doughnutOptions}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
              <span className="text-2xl">🚨</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-200">Vulnerability Severity</h2>
          </div>
          <div className="h-64">
            <Bar
              data={vulnChartData}
              options={chartOptions}
            />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Logs */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
              <span className="text-2xl">🧾</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-200">Recent Logs</h2>
          </div>
          <div className="space-y-3">
            {recentLogs.length ? (
              recentLogs.map((log) => (
                <div
                  key={log._id}
                  className="p-4 bg-slate-800/30 rounded-xl border border-gray-700/30 hover:border-gray-600/50 hover:bg-slate-800/50 transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <p className="text-gray-300 font-medium mb-1 group-hover:text-gray-200 transition-colors">
                        {log.message}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap ${
                        log.level === "error"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : log.level === "warning"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      }`}
                    >
                      {log.level}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No recent logs</p>
            )}
          </div>
        </div>

        {/* Recent Vulnerabilities */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
              <span className="text-2xl">🧩</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-200">Recent Vulnerabilities</h2>
          </div>
          <div className="space-y-3">
            {recentVulns.length ? (
              recentVulns.map((vuln) => (
                <div
                  key={vuln._id}
                  className="p-4 bg-slate-800/30 rounded-xl border border-gray-700/30 hover:border-gray-600/50 hover:bg-slate-800/50 transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1">
                      <p className="text-gray-300 font-medium mb-1 group-hover:text-gray-200 transition-colors">{vuln.type}</p>
                      <p className="text-gray-500 text-sm">{vuln.description}</p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-lg whitespace-nowrap ${
                        vuln.severity?.toLowerCase() === "high"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : vuln.severity?.toLowerCase() === "medium"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}
                    >
                      {vuln.severity}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">
                No vulnerabilities detected
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <span className="text-2xl">⚡</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-200">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { text: "View All Logs", gradient: "from-cyan-500 to-blue-600", action: "/logs", icon: "📋" },
            { text: "View Vulnerabilities", gradient: "from-red-500 to-pink-600", action: "/vulnerabilities", icon: "🛡️" },
            { text: "Run New Scan", gradient: "from-emerald-500 to-teal-600", action: "scan", icon: "🔍" },
            { text: "Generate Report", gradient: "from-purple-500 to-indigo-600", action: "report", icon: "📊" },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={() =>
                btn.action.startsWith("/")
                  ? (window.location.href = btn.action)
                  : toast.info(`${btn.text} feature coming soon!`)
              }
              className={`relative overflow-hidden py-4 px-5 bg-gradient-to-r ${btn.gradient} rounded-xl hover:shadow-2xl transition-all duration-300 font-semibold text-white group hover:scale-105`}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex flex-col items-center gap-2">
                <span className="text-2xl">{btn.icon}</span>
                <span className="text-sm">{btn.text}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}