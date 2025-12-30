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
  Cpu,
} from "lucide-react";

/* ================= HELPERS ================= */

// ❗ ONLY DISPLAY FIX – backend untouched
const normalizeModuleName = (module) => {
  const m = String(module || "").trim();
  if (!m || m.toLowerCase() === "other") return "Unknown Module";
  return m;
};

export default function TrafficMonitor() {
  const [stats, setStats] = useState({
    total: 0,
    uniqueIps: 0,
    byCountry: [],
    byMethod: [],
    byModule: [],
    last1hSpikes: 0,
    recentSpikes: [],
    activeSessions: 0,
    avgRequestsPerSession: 0,
    highAnomalies24h: 0,
    avgAnomalyScore: 0,
    anomalyBuckets: [],
  });

  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 20 });

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [countryFilter, setCountryFilter] = useState("");
  const [spikeOnly, setSpikeOnly] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [minAnomaly, setMinAnomaly] = useState("");

  const [selected, setSelected] = useState(null);

  /* ================= API ================= */

  const fetchStats = async () => {
    try {
      const res = await api.get("/traffic/stats");
      setStats(res.data || {});
    } catch {
      toast.error("Failed to load traffic stats");
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
      const params = { page: reset ? 1 : page, limit: 20 };
      if (search) params.search = search;
      if (countryFilter) params.country = countryFilter;
      if (methodFilter !== "ALL") params.method = methodFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (spikeOnly) params.spike = "true";
      if (moduleFilter !== "ALL") params.module = moduleFilter;
      if (minAnomaly !== "") params.minAnomaly = minAnomaly;

      const res = await api.get("/traffic", { params });
      setEvents(res.data.events || []);
      setPagination(res.data.pagination || {});
      if (reset) setPage(1);
    } catch {
      toast.error("Failed to load traffic events");
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

  const anomalyMeta = (score) => {
    const s = Number(score || 0);
    if (s >= 70) return { label: "High", cls: "bg-red-500/15 text-red-300 border-red-500/40" };
    if (s >= 35) return { label: "Medium", cls: "bg-amber-500/15 text-amber-300 border-amber-500/40" };
    return { label: "Low", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" };
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* ================= HEADER ================= */}
        <h1 className="text-3xl font-bold flex items-center gap-2 text-cyan-400">
          <Radar /> Traffic Monitor
        </h1>

        {/* ================= TABLE ================= */}
        <div className="bg-slate-900/70 rounded-2xl border border-gray-700/60 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-400">Time</th>
                <th className="px-6 py-3 text-left text-xs text-gray-400">IP / Location</th>

                {/* ❌ HIDDEN – Module */}
                <th className="hidden px-6 py-3 text-left text-xs text-gray-400">Module</th>

                <th className="px-6 py-3 text-left text-xs text-gray-400">Path</th>
                <th className="px-6 py-3 text-left text-xs text-gray-400">Method</th>
                <th className="px-6 py-3 text-left text-xs text-gray-400">Status</th>

                {/* ❌ HIDDEN – Anomaly */}
                <th className="hidden px-6 py-3 text-left text-xs text-gray-400">Anomaly</th>

                <th className="px-6 py-3 text-left text-xs text-gray-400">Spike</th>
                <th className="px-6 py-3 text-left text-xs text-gray-400">Details</th>
              </tr>
            </thead>

            <tbody>
              {events.map((ev) => {
                const a = anomalyMeta(ev.anomalyScore);
                return (
                  <tr key={ev._id} className="border-t border-gray-700/60 hover:bg-slate-800/40">

                    <td className="px-6 py-3 text-xs text-gray-400">
                      {new Date(ev.createdAt).toLocaleString()}
                    </td>

                    <td className="px-6 py-3">
                      <div>
                        <div>{ev.ip}</div>
                        <div className="text-xs text-gray-500">
                          {ev.geo?.country || "N/A"}
                        </div>
                      </div>
                    </td>

                    {/* ❌ HIDDEN – Module */}
                    <td className="hidden px-6 py-3">
                      {normalizeModuleName(ev.module)}
                    </td>

                    <td className="px-6 py-3">{ev.path}</td>
                    <td className="px-6 py-3">{ev.method}</td>
                    <td className="px-6 py-3">{ev.status}</td>

                    {/* ❌ HIDDEN – Anomaly */}
                    <td className="hidden px-6 py-3">
                      {a.label} ({ev.anomalyScore})
                    </td>

                    <td className="px-6 py-3">
                      {ev.isSpike ? "Spike" : "Normal"}
                    </td>

                    <td className="px-6 py-3">
                      <button
                        onClick={() => setSelected(ev)}
                        className="flex items-center gap-1 text-cyan-400"
                      >
                        <Eye size={16} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= DETAILS MODAL ================= */}
      {selected && (
        <DetailsModal
          event={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ================= DETAILS MODAL ================= */

function DetailsModal({ event, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-3xl">
        <div className="flex justify-between mb-4">
          <h3 className="text-cyan-400 font-semibold">Request Details</h3>
          <button onClick={onClose}><X /></button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>Module: {normalizeModuleName(event.module)}</div>
          <div>IP: {event.ip}</div>
          <div>Geo: {event.geo?.country}</div>
          <div>Status: {event.status}</div>
          <div>Anomaly Score: {event.anomalyScore}</div>
        </div>

        <pre className="mt-4 text-[11px] bg-black/40 p-3 rounded">
          {JSON.stringify(event.headers, null, 2)}
        </pre>
      </div>
    </div>
  );
}
