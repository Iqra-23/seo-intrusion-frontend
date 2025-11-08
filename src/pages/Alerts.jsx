import { useState, useEffect } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import { 
  AlertTriangle, Shield, CheckCircle, Clock, 
  Bell, Home, FileText, AlertCircle, LogOut,
  Trash2, RefreshCw
} from "lucide-react";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null); // delete modal state

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filter === "acknowledged") params.append("acknowledged", "true");
      if (filter === "unacknowledged") params.append("acknowledged", "false");
      if (severityFilter !== "all") params.append("severity", severityFilter);

      const response = await api.get(`/logs/alerts?${params}`);
      setAlerts(response.data || []);
    } catch (error) {
      toast.error("Error fetching alerts");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [filter, severityFilter]);

  const handleAcknowledge = async (alertId) => {
    try {
      await api.patch(`/logs/alerts/${alertId}/acknowledge`);
      toast.success("Alert acknowledged");
      fetchAlerts();
    } catch (error) {
      toast.error("Failed to acknowledge alert");
      console.error(error);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      await api.patch(`/logs/alerts/${alertId}/resolve`);
      toast.success("Alert resolved");
      fetchAlerts();
    } catch (error) {
      toast.error("Failed to resolve alert");
      console.error(error);
    }
  };

  const handleDelete = async (alertId) => {
    try {
      await api.delete(`/logs/alerts/${alertId}`, {
        headers: { "Content-Type": "application/json" }
      });
      toast.success("Alert deleted successfully");
      setDeleteConfirm(null);
      fetchAlerts();
    } catch (error) {
      toast.error("Failed to delete alert");
      console.error("Delete alert error:", error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return { gradient: "from-red-500 to-pink-600", bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" };
      case "high":
        return { gradient: "from-orange-500 to-red-600", bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" };
      case "medium":
        return { gradient: "from-amber-500 to-orange-600", bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" };
      case "low":
        return { gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" };
      default:
        return { gradient: "from-gray-500 to-slate-600", bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/30" };
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
      case "high":
        return <AlertTriangle className="w-5 h-5" />;
      case "medium":
        return <Shield className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === "critical").length,
    high: alerts.filter(a => a.severity === "high").length,
    unacknowledged: alerts.filter(a => !a.acknowledged).length,
    resolved: alerts.filter(a => a.resolved).length,
  };

  // 🔁 Loader: EXACT same animation as Vulnerability Scanner
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
    <div className="flex h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
      {/* Sidebar */}
      <div className="w-72 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-gray-700 flex flex-col">
        {/* Logo Header */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-lg flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-lg font-bold text-cyan-400">SEO Intrusion</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-cyan-400 hover:bg-slate-800 transition-all">
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </a>
          <a href="/logs" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-cyan-400 hover:bg-slate-800 transition-all">
            <FileText className="w-5 h-5" />
            <span>Logs</span>
          </a>
          <a href="/alerts" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 text-cyan-400 border border-cyan-500/50">
            <AlertCircle className="w-5 h-5" />
            <span>Alerts</span>
          </a>
          <a href="/vulnerabilities" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-cyan-400 hover:bg-slate-800 transition-all">
            <AlertTriangle className="w-5 h-5" />
            <span>Vulnerabilities</span>
          </a>
        </nav>

        {/* Status */}
        <div className="px-4 py-4 border-t border-gray-700/50">
          <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 border border-emerald-500/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-emerald-400">SYSTEM ONLINE</span>
            </div>
            <p className="text-xs text-emerald-300">All services operational</p>
          </div>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-gray-700/50">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-all">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Security Alerts
              </h1>
              <p className="text-gray-400 mt-1">Suspicious activity detection and monitoring</p>
            </div>

            <button
              onClick={fetchAlerts}
              className="flex items-center gap-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-gray-700 text-gray-300 px-4 py-2 rounded-xl hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { label: "Total Alerts", value: stats.total, icon: Bell, gradient: "from-cyan-500 to-blue-600" },
              { label: "Critical", value: stats.critical, icon: AlertTriangle, gradient: "from-red-500 to-pink-600" },
              { label: "High", value: stats.high, icon: Shield, gradient: "from-orange-500 to-red-600" },
              { label: "Unacknowledged", value: stats.unacknowledged, icon: Clock, gradient: "from-amber-500 to-orange-600" },
              { label: "Resolved", value: stats.resolved, icon: CheckCircle, gradient: "from-emerald-500 to-teal-600" },
            ].map((stat, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50 hover:border-gray-600 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                    <p className={`text-2xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mt-1`}>
                      {stat.value}
                    </p>
                  </div>
                  <stat.icon className={`w-8 h-8 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent opacity-50`} />
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-300 mb-2">Status Filter</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                >
                  <option value="all">All Alerts</option>
                  <option value="unacknowledged">Unacknowledged</option>
                  <option value="acknowledged">Acknowledged</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-300 mb-2">Severity Filter</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>

          {/* Alerts List */}
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-12 text-center">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-200 mb-2">No Alerts</h3>
                <p className="text-gray-400">
                  {filter === "all"
                    ? "No security alerts detected"
                    : `No ${filter} alerts found`}
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                const color = getSeverityColor(alert.severity);
                return (
                  <div
                    key={alert._id}
                    className={`bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl border-l-4 ${color.border} p-6 border border-gray-700/50 hover:border-gray-600 transition-all duration-300 transform hover:-translate-y-0.5`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${color.bg} ${color.text} border ${color.border}`}
                          >
                            {getSeverityIcon(alert.severity)}
                            {alert.severity?.toUpperCase()}
                          </span>
                          {alert.acknowledged && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle className="w-3 h-3" />
                              Acknowledged
                            </span>
                          )}
                          {alert.resolved && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                              <CheckCircle className="w-3 h-3" />
                              Resolved
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold text-gray-200 mb-2">
                          {alert.title}
                        </h3>
                        <p className="text-gray-300 mb-3">
                          {alert.description}
                        </p>

                        {alert.keywords && alert.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {alert.keywords.map((keyword, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-slate-800/50 border border-gray-700 text-gray-300 text-xs rounded"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {new Date(alert.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 ml-4 min-w-[150px]">
                        {/* {!alert.acknowledged && (
                          <button
                            onClick={() => handleAcknowledge(alert._id)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all text-sm whitespace-nowrap"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Acknowledge
                          </button>
                        )}
                        {alert.acknowledged && !alert.resolved && (
                          <button
                            onClick={() => handleResolve(alert._id)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all text-sm whitespace-nowrap"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Resolve
                          </button>
                        )} */}
                        <button
                          onClick={() => setDeleteConfirm(alert._id)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800/50 border border-red-500/50 text-red-400 rounded-xl hover:bg-red-500/10 hover:text-red-300 transition-all text-sm whitespace-nowrap"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-200">Delete Alert</h2>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this alert?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 rounded-xl hover:from-red-600 hover:to-pink-700 transition-all font-medium shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-6 py-3 bg-slate-800/50 border border-gray-700 text-gray-300 rounded-xl hover:border-gray-600 hover:text-gray-200 transition-all font-medium"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
