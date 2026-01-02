import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Bell,
  Trash2,
  Filter,
  Clock,
  Calendar,
  ShieldAlert,
  XCircle,
  Search,
} from "lucide-react";
import { io } from "socket.io-client";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔒 UI toggle hidden, but polling ALWAYS ON
  const autoRefreshing = true;

  // filters
  const [severityFilter, setSeverityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");

  // selection
  const [selectedIds, setSelectedIds] = useState([]);

  // ================= SOCKET (REAL-TIME + POPUP) =================
  useEffect(() => {
    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("new-alert", (payload) => {
      const sev = (payload.severity || "low").toUpperCase();

      // 🔔 POPUP ALERT (REQUIRED)
      toast.warn(`🔔 ${sev} Alert: ${payload.title}`, {
        autoClose: 6000,
      });

      // Add to table
      setAlerts((prev) => {
        if (prev.some((a) => a._id === payload.id)) return prev;
        return [
          {
            _id: payload.id,
            severity: payload.severity,
            title: payload.title,
            description: payload.description,
            createdAt: payload.createdAt,
            keywords: payload.keywords || [],
          },
          ...prev,
        ];
      });
    });

    return () => socket.disconnect();
  }, []);

  // ================= FETCH ALERTS =================
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/logs/alerts");
      setAlerts(res.data.alerts || []);
    } catch {
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  // initial + polling
  useEffect(() => {
    fetchAlerts();

    const interval = setInterval(() => {
      if (autoRefreshing) fetchAlerts();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // ================= FILTERING =================
  const visibleAlerts = useMemo(() => {
    return alerts
      .filter((a) => {
        if (severityFilter !== "all" && a.severity !== severityFilter)
          return false;

        if (search) {
          const text = (
            (a.title || "") +
            " " +
            (a.description || "") +
            " " +
            (a.keywords || []).join(" ")
          ).toLowerCase();
          if (!text.includes(search.toLowerCase())) return false;
        }

        const created = new Date(a.createdAt);

        if (dateFrom && created < new Date(dateFrom)) return false;
        if (dateTo && created > new Date(dateTo + "T23:59:59")) return false;

        const mins = created.getHours() * 60 + created.getMinutes();
        if (timeFrom) {
          const [h, m] = timeFrom.split(":").map(Number);
          if (mins < h * 60 + m) return false;
        }
        if (timeTo) {
          const [h, m] = timeTo.split(":").map(Number);
          if (mins > h * 60 + m) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [alerts, severityFilter, search, dateFrom, dateTo, timeFrom, timeTo]);

  // ================= HELPERS =================
  const getSeverityStyles = (severity) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/40";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/40";
      case "medium":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === visibleAlerts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleAlerts.map((a) => a._id));
    }
  };

  const handleDeleteOne = async (id) => {
    if (!window.confirm("Delete this alert?")) return;
    await api.delete(`/logs/alerts/${id}`);
    setAlerts((prev) => prev.filter((a) => a._id !== id));
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm("Delete selected alerts?")) return;

    await Promise.all(
      selectedIds.map((id) => api.delete(`/logs/alerts/${id}`))
    );
    setAlerts((prev) => prev.filter((a) => !selectedIds.includes(a._id)));
    setSelectedIds([]);
  };

  // ================= UI =================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-14 h-14 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-red-400" />
            <h1 className="text-2xl font-bold text-gray-100">
              Real-Time Alerts
            </h1>
          </div>

          {/* ❌ Socket / Refresh / Live polling REMOVED */}
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
          >
            <Trash2 size={16} />
            Delete Selected
          </button>
        </div>

        {/* FILTERS */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              placeholder="Search alerts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 bg-slate-800 rounded text-gray-200"
            />

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-800 rounded text-gray-200"
            >
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 bg-slate-800 rounded text-gray-200"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 bg-slate-800 rounded text-gray-200"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800">
              <tr>
                <th className="p-3">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={
                      visibleAlerts.length > 0 &&
                      selectedIds.length === visibleAlerts.length
                    }
                  />
                </th>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">Severity</th>
                <th className="p-3 text-left">Message</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleAlerts.map((a) => (
                <tr key={a._id} className="border-t border-slate-700">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(a._id)}
                      onChange={() =>
                        setSelectedIds((prev) =>
                          prev.includes(a._id)
                            ? prev.filter((x) => x !== a._id)
                            : [...prev, a._id]
                        )
                      }
                    />
                  </td>
                  <td className="p-3 text-gray-300">
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full border text-xs ${getSeverityStyles(
                        a.severity
                      )}`}
                    >
                      {a.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-gray-200">{a.title}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDeleteOne(a._id)}
                      className="text-red-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
