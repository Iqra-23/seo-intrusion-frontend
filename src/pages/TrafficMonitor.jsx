import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import {
  Activity,
  Globe,
  AlertTriangle,
  Download,
  RefreshCw,
  Search,
  Wifi,
  Trash2,
  Radar,
  Sparkles,
  ShieldAlert,
  Layers,
  Eye,
  X,
  Timer,
} from "lucide-react";

/* ================= MODULE LABEL MAP ================= */
const MODULE_LABELS = {
  Auth: "Authentication Module",
  "Log Management": "Log Management Module",
  "Vulnerability Scanner": "Vulnerability Scanner",
  Dashboard: "Dashboard Module",
  Traffic: "Traffic Monitor",
};

/* ================= MAIN ================= */
export default function TrafficMonitor() {
  const [stats, setStats] = useState({});
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [countryFilter, setCountryFilter] = useState("");
  const [spikeOnly, setSpikeOnly] = useState(false);

  const [selected, setSelected] = useState(null);

  /* ================= API ================= */
  const fetchStats = async () => {
    try {
      const res = await api.get("/traffic/stats");
      setStats(res.data || {});
    } catch {
      toast.error("Failed to load stats");
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await api.get("/traffic/alerts");
      setAlerts(res.data || []);
    } catch {}
  };

  const fetchEvents = async (reset = false) => {
    try {
      setLoading(true);
      const params = {
        page: reset ? 1 : page,
        limit: 20,
        search,
        country: countryFilter,
        spike: spikeOnly ? "true" : undefined,
        method: methodFilter !== "ALL" ? methodFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      };

      const res = await api.get("/traffic", { params });
      setEvents(res.data.events || []);
      setPagination(res.data.pagination || {});
      if (reset) setPage(1);
    } catch {
      toast.error("Failed to load traffic");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAlerts();
    fetchEvents(true);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [page]);

  /* ================= HELPERS ================= */
  const getMethodColor = (m) =>
    m === "GET"
      ? "text-emerald-400"
      : m === "POST"
      ? "text-cyan-400"
      : m === "PUT"
      ? "text-amber-400"
      : m === "DELETE"
      ? "text-red-400"
      : "text-slate-300";

  const getStatusColor = (s) =>
    s >= 500
      ? "text-red-400"
      : s >= 400
      ? "text-amber-400"
      : "text-emerald-400";

  /* ================= LOADING ================= */
  if (loading && events.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex gap-2 text-cyan-400">
          <Radar /> Traffic Monitor
        </h1>
        <div className="flex gap-2">
          <button onClick={fetchEvents} className="btn">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={() => fetchEvents(true)} className="btn-red">
            <Trash2 size={16} /> Clear
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <th className="p-3 text-left">Time</th>
              <th className="p-3 text-left">IP / Location</th>
              <th className="p-3 text-left">Path</th>
              <th className="p-3 text-left">Method</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Spike</th>
              <th className="p-3 text-left">Details</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-700">
            {events.map((ev) => (
              <tr key={ev._id} className="hover:bg-slate-800/40">
                <td className="p-3 text-xs">
                  {new Date(ev.createdAt).toLocaleString()}
                </td>
                <td className="p-3">
                  <div className="text-sm">{ev.ip}</div>
                  <div className="text-xs text-slate-400">
                    {ev.geo?.country || "N/A"}
                  </div>
                </td>
                <td className="p-3 truncate max-w-xs">{ev.path}</td>
                <td className={`p-3 font-semibold ${getMethodColor(ev.method)}`}>
                  {ev.method}
                </td>
                <td className={`p-3 ${getStatusColor(ev.status)}`}>
                  {ev.status}
                </td>
                <td className="p-3">
                  {ev.isSpike ? (
                    <span className="text-red-400 font-semibold">Spike</span>
                  ) : (
                    <span className="text-slate-400">Normal</span>
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => setSelected(ev)}
                    className="px-3 py-1 rounded bg-slate-800 border border-slate-600 hover:border-cyan-400 text-xs"
                  >
                    <Eye size={14} /> View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {selected && (
        <DetailsModal event={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

/* ================= MODAL ================= */
function DetailsModal({ event, onClose }) {
  const anomalyLabel =
    event.anomalyScore >= 70
      ? "High"
      : event.anomalyScore >= 35
      ? "Medium"
      : "Low";

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-cyan-300 flex gap-2">
            <Eye /> Request Details
          </h2>
          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <Info label="Module">
            {MODULE_LABELS[event.module] || "System / Other Module"}
          </Info>
          <Info label="IP">{event.ip}</Info>
          <Info label="Path">{event.path}</Info>
          <Info label="Method">{event.method}</Info>
          <Info label="Status">{event.status}</Info>
          <Info label="Session">{event.sessionId || "N/A"}</Info>
          <Info label="Anomaly Level">
            {anomalyLabel} ({event.anomalyScore})
          </Info>
        </div>

        <div className="mt-4">
          <p className="text-xs text-slate-400 mb-1">Anomaly Reasons</p>
          <ul className="list-disc pl-4 text-xs text-slate-300">
            {event.anomalyReasons?.length ? (
              event.anomalyReasons.map((r, i) => <li key={i}>{r}</li>)
            ) : (
              <li>No anomaly reasons</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ================= SMALL ================= */
function Info({ label, children }) {
  return (
    <div>
      <p className="text-slate-400">{label}</p>
      <p className="text-slate-200">{children}</p>
    </div>
  );
}
