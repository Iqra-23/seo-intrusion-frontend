import { useState, useEffect } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import { 
  Search, RefreshCw, Archive, Download, 
  AlertTriangle, Database, Trash2
} from "lucide-react";

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 50,
        archived: showArchived
      });

      if (searchQuery) params.append("q", searchQuery);
      if (levelFilter !== "all") params.append("level", levelFilter);

      const response = await api.get(`/logs?${params}`);
      setLogs(response.data.logs);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error("Error fetching logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/logs/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Stats error:", error);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, levelFilter, showArchived]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (page === 1) {
        fetchLogs();
      } else {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  const handleArchive = async (auto = false) => {
    try {
      const payload = auto 
        ? { autoArchive: true }
        : { logIds: selectedLogs };

      if (!auto && selectedLogs.length === 0) {
        toast.error("No logs selected");
        return;
      }

      await api.post("/logs/archive", payload);
      toast.success(auto ? "Old logs archived" : "Logs archived");
      setSelectedLogs([]);
      fetchLogs();
      fetchStats();
    } catch (error) {
      toast.error("Failed to archive logs");
    }
  };

  const handleRestore = async () => {
    try {
      if (selectedLogs.length === 0) {
        toast.error("No logs selected");
        return;
      }

      await api.post("/logs/restore", { logIds: selectedLogs });
      toast.success("Logs restored");
      setSelectedLogs([]);
      fetchLogs();
      fetchStats();
    } catch (error) {
      toast.error("Failed to restore logs");
    }
  };

  const handleDelete = async (logId) => {
    try {
      await api.delete(`/logs/${logId}`, {
        headers: { "Content-Type": "application/json" }
      });
      toast.success("Log deleted successfully");
      setDeleteConfirm(null);
      fetchLogs();
      fetchStats();
    } catch (error) {
      toast.error("Failed to delete log");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLogs.length === 0) {
      toast.error("No logs selected");
      return;
    }

    try {
      await api.delete("/logs/bulk", {
        data: { ids: selectedLogs },
        headers: { "Content-Type": "application/json" }
      });
      toast.success(`${selectedLogs.length} logs deleted successfully`);
      setSelectedLogs([]);
      fetchLogs();
      fetchStats();
    } catch (error) {
      toast.error("Failed to delete logs");
    }
  };

  const handleExport = () => {
    const csv = [
      ["Level", "Message", "Keywords", "Date"],
      ...logs.map(log => [
        log.level,
        log.message,
        log.keyword?.join("; ") || "",
        new Date(log.createdAt).toLocaleString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs_${new Date().toISOString()}.csv`;
    a.click();
    toast.success("Logs exported");
  };

  const toggleSelectLog = (id) => {
    setSelectedLogs(prev =>
      prev.includes(id) ? prev.filter(logId => logId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLogs.length === logs.length) {
      setSelectedLogs([]);
    } else {
      setSelectedLogs(logs.map(log => log._id));
    }
  };

  const getLevelBadgeClass = (level) => {
    switch (level?.toLowerCase()) {
      case "error":
        return "bg-red-500/20 text-red-400 border border-red-500/30";
      case "warning":
        return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
      case "suspicious":
        return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              System Logs
            </h1>
            <p className="text-gray-400 mt-1">Centralized log management</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchLogs}
              className="flex items-center gap-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-gray-700 text-gray-300 px-4 py-2 rounded-xl hover:border-cyan-500/50 hover:text-cyan-400 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            {/* Auto archive 30+ days old logs */}
            {/* <button
              onClick={() => handleArchive(true)}
              className="flex items-center gap-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/50 text-amber-300 px-4 py-2 rounded-xl hover:border-amber-400 transition-all"
            >
              <Archive className="w-4 h-4" />
              Auto Archive (30+ days)
            </button> */}

            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            {/* Archive selected (only when active logs view) */}
            {selectedLogs.length > 0 && !showArchived && (
              <button
                onClick={() => handleArchive(false)}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/20"
              >
                <Archive className="w-4 h-4" />
                Archive ({selectedLogs.length})
              </button>
            )}

            {/* Restore selected (only when archived view) */}
            {selectedLogs.length > 0 && showArchived && (
              <button
                onClick={handleRestore}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Archive className="w-4 h-4 rotate-180" />
                Restore ({selectedLogs.length})
              </button>
            )}

            {selectedLogs.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-xl hover:from-red-600 hover:to-pink-700 transition-all shadow-lg shadow-red-500/20"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedLogs.length})
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: "Total Logs", value: stats.total || 0, icon: Database, gradient: "from-cyan-500 to-blue-600" },
            { label: "Errors", value: stats.errors || 0, icon: AlertTriangle, gradient: "from-red-500 to-pink-600" },
            { label: "Warnings", value: stats.warnings || 0, icon: AlertTriangle, gradient: "from-amber-500 to-orange-600" },
            { label: "Suspicious", value: stats.suspicious || 0, icon: AlertTriangle, gradient: "from-purple-500 to-indigo-600" },
            { label: "Archived", value: stats.archived || 0, icon: Archive, gradient: "from-gray-500 to-slate-600" },
          ].map((stat, i) => (
            <div key={i} className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50 hover:border-gray-600 transition-all">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-800/50 border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
              >
                <option value="all">All Levels</option>
                <option value="error">Errors</option>
                <option value="warning">Warnings</option>
                <option value="suspicious">Suspicious</option>
                <option value="info">Info</option>
              </select>

              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`px-4 py-2 rounded-xl transition-all ${
                  showArchived
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                    : "bg-slate-800/50 text-gray-400 border border-gray-700 hover:border-cyan-500/50"
                }`}
              >
                <Archive className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Logs List Table */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No logs found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/50 border-b border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedLogs.length === logs.length && logs.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-cyan-600 focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Message</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Keywords</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">IP Address</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-700/50">
                    {logs.map((log) => (
                      <tr 
                        key={log._id} 
                        className={`hover:bg-slate-800/30 transition-colors ${
                          selectedLogs.includes(log._id) ? 'bg-cyan-500/10' : ''
                        }`}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedLogs.includes(log._id)}
                            onChange={() => toggleSelectLog(log._id)}
                            className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-cyan-600 focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                          />
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLevelBadgeClass(log.level)}`}>
                            {log.level}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-200 max-w-md truncate">{log.message}</p>
                          {log.url && <p className="text-xs text-gray-500 mt-1">{log.method} {log.url}</p>}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-400">
                          {log.keyword?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {log.keyword.slice(0, 3).map((kw, i) => (
                                <span key={i} className="px-2 py-1 bg-slate-800/50 border border-gray-700 rounded text-xs text-gray-300">
                                  {kw}
                                </span>
                              ))}
                              {log.keyword.length > 3 && (
                                <span className="px-2 py-1 bg-slate-800/50 border border-gray-700 rounded text-xs text-gray-300">
                                  +{log.keyword.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-400">
                          {log.ipAddress || <span className="text-gray-600">—</span>}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() => setDeleteConfirm(log._id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.pages > 1 && (
                <div className="bg-slate-900/50 px-6 py-4 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">
                      Page <span className="font-medium text-gray-300">{page}</span> of <span className="font-medium text-gray-300">{pagination.pages}</span>
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-slate-800/50 border border-gray-700 text-gray-300 rounded-xl hover:border-gray-600 disabled:opacity-50"
                      >
                        Previous
                      </button>

                      <button
                        onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                        disabled={page === pagination.pages}
                        className="px-4 py-2 bg-slate-800/50 border border-gray-700 text-gray-300 rounded-xl hover:border-gray-600 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>

        {/* Suspicious Alerts */}
        {/* <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-2xl p-6 backdrop-blur-xl mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Suspicious Activity Alerts
              </h3>
              <p className="text-sm text-red-300/80 mt-1">
                View and manage security alerts triggered by suspicious log entries
              </p>
            </div>
            <a
              href="/alerts"
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 transition-all font-medium shadow-lg shadow-red-500/20"
            >
              View Alerts
            </a>
          </div>
        </div> */}

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
                <h2 className="text-2xl font-bold text-gray-200">Delete Log</h2>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this log entry?
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
