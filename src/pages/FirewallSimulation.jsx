import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import {
  Shield,
  ShieldAlert,
  Search,
  RefreshCw,
  Trash2,
  Ban,
  AlertTriangle,
  FileWarning,
  Bug,
  FolderX,
  BellRing,
  FileDown,
} from "lucide-react";

const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:4000").replace(/\/api$/, "");

export default function FirewallSimulation() {
  const [stats, setStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
    limit: 20,
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [attackType, setAttackType] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [blockedOnly, setBlockedOnly] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get("/firewall/stats");
      setStats(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load firewall stats");
    }
  };

  const fetchIncidents = async (reset = false) => {
    try {
      setLoading(true);

      const currentPage = reset ? 1 : page;
      const params = {
        page: currentPage,
        limit: 20,
      };

      if (search) params.search = search;
      if (attackType !== "all") params.attackType = attackType;
      if (severity !== "all") params.severity = severity;
      if (blockedOnly) params.blocked = true;

      const res = await api.get("/firewall", { params });

      setIncidents(res.data.incidents || []);
      setPagination(
        res.data.pagination || { total: 0, pages: 1, limit: 20 }
      );

      if (reset) setPage(1);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load firewall incidents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchIncidents(true);
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [page]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      console.log("⚡ Firewall socket connected");
    });

    socket.on("new-firewall-incident", (payload) => {
      toast.warn(`Firewall Alert: ${payload.attackType} detected`, {
        autoClose: 5000,
      });

      setIncidents((prev) =>
        [
          {
            _id: payload.id || payload._id,
            attackType: payload.attackType,
            severity: payload.severity,
            path: payload.path,
            ip: payload.ip,
            sourceType: payload.sourceType,
            suspiciousValue: payload.suspiciousValue,
            keywordDensity: payload.keywordDensity,
            repeatedKeyword: payload.repeatedKeyword,
            simulatedAction: payload.simulatedAction,
            createdAt: payload.createdAt,
          },
          ...prev,
        ].slice(0, 20)
      );

      fetchStats();
    });

    socket.on("disconnect", () => {
      console.log("⚠️ Firewall socket disconnected");
    });

    return () => socket.disconnect();
  }, []);

  const applyFilters = (e) => {
    e.preventDefault();
    setSelectedIds([]);
    fetchIncidents(true);
  };

  const refreshAll = () => {
    setSelectedIds([]);
    fetchStats();
    fetchIncidents();
  };

  const deleteOne = async (id) => {
    try {
      await api.delete(`/firewall/${id}`);
      toast.success("Incident deleted");
      setIncidents((prev) => prev.filter((x) => x._id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      fetchStats();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete incident");
    }
  };

  const deleteBulk = async () => {
    if (selectedIds.length === 0) {
      toast.info("No incidents selected");
      return;
    }

    try {
      await api.delete("/firewall/bulk", {
        data: { ids: selectedIds },
      });

      toast.success("Selected incidents deleted");
      setIncidents((prev) => prev.filter((x) => !selectedIds.includes(x._id)));
      setSelectedIds([]);
      fetchStats();
    } catch (error) {
      console.error(error);
      toast.error("Failed to bulk delete incidents");
    }
  };

  const exportPDF = async () => {
    try {
      const res = await api.get("/firewall/export/pdf", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `firewall-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Firewall report exported");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export firewall PDF");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === incidents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(incidents.map((i) => i._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const severityStyle = (value) => {
    switch (value) {
      case "critical":
        return "bg-red-500/15 text-red-300 border-red-500/40";
      case "high":
        return "bg-orange-500/15 text-orange-300 border-orange-500/40";
      case "medium":
        return "bg-amber-500/15 text-amber-300 border-amber-500/40";
      default:
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
    }
  };

  const attackLabel = (value) => {
    if (value === "sql-injection") return "SQL Injection";
    if (value === "xss") return "XSS";
    if (value === "path-traversal") return "Path Traversal";
    return "Keyword Spam";
  };

  const cards = useMemo(() => {
    if (!stats) return [];

    return [
      {
        label: "SQL Injection",
        value: stats.byType?.sqlInjection || 0,
        icon: <Bug className="w-5 h-5" />,
        gradient: "from-red-500 to-pink-600",
      },
      {
        label: "XSS Attempts",
        value: stats.byType?.xss || 0,
        icon: <FileWarning className="w-5 h-5" />,
        gradient: "from-orange-500 to-amber-600",
      },
      {
        label: "Path Traversal",
        value: stats.byType?.pathTraversal || 0,
        icon: <FolderX className="w-5 h-5" />,
        gradient: "from-purple-500 to-indigo-600",
      },
      {
        label: "Keyword Spam",
        value: stats.byType?.keywordSpam || 0,
        icon: <BellRing className="w-5 h-5" />,
        gradient: "from-cyan-500 to-blue-600",
      },
      {
        label: "Blocked (Simulated)",
        value: stats.blocked || 0,
        icon: <Ban className="w-5 h-5" />,
        gradient: "from-emerald-500 to-teal-600",
      },
    ];
  }, [stats]);

  if (loading && incidents.length === 0) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <Shield className="w-7 h-7 text-cyan-400" />
              Access Control & Firewall Simulation
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Detects SQL injection, XSS, path traversal, keyword spamming and
              supports PDF export plus delete actions.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={refreshAll}
              className="flex items-center gap-2 bg-slate-800/70 text-gray-200 px-4 py-2 rounded-xl border border-slate-600 hover:border-cyan-500 hover:text-cyan-300 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            <button
              onClick={exportPDF}
              className="flex items-center gap-2 bg-cyan-600/80 text-white px-4 py-2 rounded-xl hover:bg-cyan-700 transition-all"
            >
              <FileDown className="w-4 h-4" />
              Export PDF
            </button>

            <button
              onClick={deleteBulk}
              className="flex items-center gap-2 bg-red-600/80 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {cards.map((card, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 border border-slate-700/70 rounded-2xl p-4 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{card.label}</p>
                  <p
                    className={`text-2xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent mt-1`}
                  >
                    {card.value}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/70">
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-slate-700/70 p-4">
          <form
            onSubmit={applyFilters}
            className="grid grid-cols-1 md:grid-cols-5 gap-3"
          >
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by IP, path, suspicious value..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>

            <select
              value={attackType}
              onChange={(e) => setAttackType(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200"
            >
              <option value="all">All Attack Types</option>
              <option value="sql-injection">SQL Injection</option>
              <option value="xss">XSS</option>
              <option value="path-traversal">Path Traversal</option>
              <option value="keyword-spam">Keyword Spam</option>
            </select>

            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-300 px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl">
              <input
                type="checkbox"
                checked={blockedOnly}
                onChange={(e) => setBlockedOnly(e.target.checked)}
                className="w-4 h-4"
              />
              Simulated blocked only
            </label>
          </form>
        </div>

        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-gray-700/60 overflow-hidden">
          {incidents.length === 0 ? (
            <div className="text-center py-12">
              <ShieldAlert className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                No firewall incidents found
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/70 border-b border-gray-700/70">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={
                            selectedIds.length === incidents.length &&
                            incidents.length > 0
                          }
                          onChange={toggleSelectAll}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Attack Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        IP / Path
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Source
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Delete
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-700/50">
                    {incidents.map((item) => (
                      <tr
                        key={item._id}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item._id)}
                            onChange={() => toggleSelectOne(item._id)}
                            className="w-4 h-4"
                          />
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-200 font-medium">
                          {attackLabel(item.attackType)}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs border font-semibold ${severityStyle(
                              item.severity
                            )}`}
                          >
                            {item.severity?.toUpperCase()}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-200">{item.ip}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">
                            {item.path}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-400">
                          {item.sourceType || "N/A"}
                          {item.keywordDensity ? (
                            <p className="text-xs text-amber-300 mt-1">
                              Density: {item.keywordDensity}%{" "}
                              {item.repeatedKeyword
                                ? `(${item.repeatedKeyword})`
                                : ""}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                              item.simulatedAction === "block"
                                ? "bg-red-500/20 text-red-300 border-red-500/40"
                                : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                            }`}
                          >
                            {item.simulatedAction}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() => deleteOne(item._id)}
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
                <div className="px-6 py-4 flex items-center justify-between border-t border-gray-700/60 text-sm text-gray-400">
                  <span>
                    Page {page} of {pagination.pages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-4 py-2 bg-slate-800/50 border border-gray-700 rounded-xl disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page >= pagination.pages}
                      onClick={() =>
                        setPage((p) => Math.min(pagination.pages, p + 1))
                      }
                      className="px-4 py-2 bg-slate-800/50 border border-gray-700 rounded-xl disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <FeatureBox
            title="SQL Injection"
            text="Regex patterns like OR 1=1, UNION SELECT and DROP TABLE are used to detect SQL injection attempts."
            icon={<Bug className="w-6 h-6 text-red-400" />}
          />
          <FeatureBox
            title="XSS Detection"
            text="Script tags, javascript payloads and event handlers like onerror and onload are scanned."
            icon={<FileWarning className="w-6 h-6 text-orange-400" />}
          />
          <FeatureBox
            title="Path Traversal"
            text="The module checks ../ and encoded traversal attempts to detect unauthorized file path access."
            icon={<FolderX className="w-6 h-6 text-purple-400" />}
          />
          <FeatureBox
            title="PDF Export"
            text="The module can generate downloadable PDF reports for firewall incidents."
            icon={<FileDown className="w-6 h-6 text-cyan-400" />}
          />
          <FeatureBox
            title="Delete Actions"
            text="Supports both single delete and bulk delete for incident management."
            icon={<AlertTriangle className="w-6 h-6 text-emerald-400" />}
          />
        </div>
      </div>
    </div>
  );
}

function FeatureBox({ title, text, icon }) {
  return (
    <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 border border-slate-700/70 rounded-2xl p-5">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-200 mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}