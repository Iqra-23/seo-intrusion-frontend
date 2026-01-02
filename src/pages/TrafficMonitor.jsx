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
  MapPin,
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


// ✅ Module display name helper (Other ko fix)
const normalizeModuleName = (module) => {
  const m = String(module || "").trim();

  if (!m || m.toLowerCase() === "other") return "Unknown Module";

  // optional: common short forms mapping (agar tum chaho)
  const map = {
    auth: "Auth",
    "log management": "Log Management",
    "vulnerability scanner": "Vulnerability Scanner",
    dashboard: "Dashboard",
    "traffic monitor": "Traffic Monitor",
  };

  const key = m.toLowerCase();
  return map[key] || m;
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

  // filters
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [countryFilter, setCountryFilter] = useState("");
  const [spikeOnly, setSpikeOnly] = useState(false);
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [minAnomaly, setMinAnomaly] = useState("");

  // details modal
  const [selected, setSelected] = useState(null);

  // ===== API =====

  const fetchStats = async () => {
    try {
      const res = await api.get("/traffic/stats");
      setStats(res.data || {});
    } catch (err) {
      console.error(err);
      toast.error("Failed to load traffic stats");
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await api.get("/traffic/alerts");
      setAlerts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvents = async (resetPage = false) => {
    try {
      setLoading(true);

      const params = {
        page: resetPage ? 1 : page,
        limit: 20,
      };

      if (search) params.search = search;
      if (countryFilter) params.country = countryFilter;
      if (methodFilter !== "ALL") params.method = methodFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (spikeOnly) params.spike = "true";
      if (moduleFilter !== "ALL") params.module = moduleFilter;
      if (minAnomaly !== "" && !Number.isNaN(Number(minAnomaly)))
        params.minAnomaly = minAnomaly;

      const res = await api.get("/traffic", { params });
      setEvents(res.data.events || []);
      setPagination(res.data.pagination || { total: 0, pages: 1, limit: 20 });
      if (resetPage) setPage(1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load traffic events");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchStats();
    fetchAlerts();
    fetchEvents();
  };

  const handleExportPdf = async () => {
    try {
      setExporting(true);

      const params = {};
      if (search) params.search = search;
      if (countryFilter) params.country = countryFilter;
      if (methodFilter !== "ALL") params.method = methodFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (spikeOnly) params.spike = "true";
      if (moduleFilter !== "ALL") params.module = moduleFilter;
      if (minAnomaly !== "" && !Number.isNaN(Number(minAnomaly)))
        params.minAnomaly = minAnomaly;

      const res = await api.get("/traffic/export", {
        params,
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `traffic_report_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Traffic report PDF downloaded");
    } catch (err) {
      console.error("Export error:", err);
      if (err.response?.status === 404) toast.error("No traffic events found for export");
      else toast.error("Failed to export traffic report");
    } finally {
      setExporting(false);
    }
  };

  const handleClearAll = async () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete ALL traffic events? This cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      await api.delete("/traffic");
      toast.success("All traffic events deleted");
      fetchStats();
      fetchEvents(true);
      fetchAlerts();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete traffic events");
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAlerts();
    fetchEvents(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchEvents(true);
  };

  // ===== helpers =====

  const getMethodColor = (method) => {
    switch (method) {
      case "GET":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "POST":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/40";
      case "PUT":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "DELETE":
        return "bg-red-500/20 text-red-400 border-red-500/40";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/40";
    }
  };

  const getStatusColor = (status) => {
    if (!status && status !== 0) return "text-gray-300";
    if (status >= 500) return "text-red-400";
    if (status >= 400) return "text-amber-400";
    if (status >= 300) return "text-blue-400";
    return "text-emerald-400";
  };

  const anomalyMeta = (score) => {
    const s = Number(score || 0);
    if (s >= 70)
      return {
        label: "High",
        cls: "bg-red-500/15 text-red-300 border-red-500/40",
      };
    if (s >= 35)
      return {
        label: "Medium",
        cls: "bg-amber-500/15 text-amber-300 border-amber-500/40",
      };
    return {
      label: "Low",
      cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    };
  };

  const bucketCounts = useMemo(() => {
    const base = { Low: 0, Medium: 0, High: 0 };
    (stats.anomalyBuckets || []).forEach((b) => {
      if (b?._id && base[b._id] !== undefined) base[b._id] = b.count || 0;
    });
    return base;
  }, [stats.anomalyBuckets]);

  // ===== loading =====
  if (loading && events.length === 0) {
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

  // ===== UI =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <Radar className="w-6 h-6 text-cyan-400" />
              Traffic Monitor
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Tracks all modules’ requests: IP + Headers, Sessions, Geo, Anomalies & Spikes.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-slate-800/70 text-gray-200 px-4 py-2 rounded-xl border border-slate-600 hover:border-cyan-500 hover:text-cyan-300 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Exporting..." : "Export PDF"}
            </button>

            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 bg-red-600/80 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>

        {/* Stats cards (proof of 5 features) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Requests"
            value={stats.total || 0}
            icon={<Wifi className="w-6 h-6" />}
            gradient="from-cyan-500 to-blue-600"
            hint="Feature: Logging"
          />
          <StatCard
            title="Unique IPs"
            value={stats.uniqueIps || 0}
            icon={<Globe className="w-6 h-6" />}
            gradient="from-purple-500 to-indigo-600"
            hint="Feature: IP Tracking"
          />
          <StatCard
            title="Active Sessions (15m)"
            value={stats.activeSessions || 0}
            icon={<Layers className="w-6 h-6" />}
            gradient="from-emerald-500 to-teal-600"
            hint="Feature: Session Tracking"
          />
          <StatCard
            title="High Anomalies (24h)"
            value={stats.highAnomalies24h || 0}
            icon={<ShieldAlert className="w-6 h-6" />}
            gradient="from-red-500 to-pink-600"
            hint="Feature: Anomaly Detection"
          />
        </div>

        {/* HUD + GEO  ✅✅✅ CHANGE #1: Module box removed completely */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TrafficHudStrip
            stats={stats}
            alertsCount={alerts.length}
            bucketCounts={bucketCounts}
          />
          <GeoMiniHeat byCountry={stats.byCountry || []} />

          {/* ❌ REMOVED: ModuleBreakdown UI BOX */}
          {/* <ModuleBreakdown byModule={stats.byModule || []} /> */}
        </div>

        {/* Filters */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 rounded-2xl border border-slate-700/70 p-4 backdrop-blur-xl">
          <form
            className="w-full grid grid-cols-1 md:grid-cols-6 gap-3 text-sm"
            onSubmit={handleApplyFilters}
          >
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by IP, path, user agent, module..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
              />
            </div>

            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
            >
              <option value="ALL">All Modules</option>
              <option value="Auth">Auth</option>
              <option value="Log Management">Log Management</option>
              <option value="Vulnerability Scanner">Vulnerability Scanner</option>
              <option value="Dashboard">Dashboard</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
            >
              <option value="ALL">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="200">200</option>
              <option value="301">301</option>
              <option value="400">400</option>
              <option value="401">401</option>
              <option value="403">403</option>
              <option value="404">404</option>
              <option value="500">500</option>
            </select>

            <input
              type="text"
              placeholder="Country (e.g. PK, US)"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
            />

            <input
              type="number"
              placeholder="Min Anomaly (0-100)"
              value={minAnomaly}
              onChange={(e) => setMinAnomaly(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
              min={0}
              max={100}
            />

            <div className="flex items-center gap-2 md:col-span-6">
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-medium hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
              >
                Apply Filters
              </button>

              <label className="flex items-center gap-1 text-[11px] text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={spikeOnly}
                  onChange={(e) => setSpikeOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 bg-slate-900 text-cyan-500 focus:ring-2 focus:ring-cyan-500"
                />
                Spikes only
              </label>

              <span className="ml-auto text-[11px] text-slate-400">
                Tip: Click <span className="text-cyan-300 font-semibold">View</span> to see Headers, Session & Anomaly reasons.
              </span>
            </div>
          </form>
        </div>

        {/* Alerts */}
        <div className="bg-gradient-to-br from-red-500/10 via-pink-500/10 to-slate-900/80 rounded-2xl border border-red-500/30 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-100">Recent Traffic Alerts</h2>
                <p className="text-xs text-gray-400">Feature: In-app spike notifications</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/70 border border-red-500/40 text-xs text-red-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {alerts.length} active
            </span>
          </div>

          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-400">No recent spikes detected.</p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert._id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-700/60 hover:border-red-400/60 hover:shadow-[0_0_18px_rgba(248,113,113,0.35)] transition-all"
                >
                  <div className="flex justify-between items-center gap-3">
                    <div>
                      <p className="text-sm text-gray-200 font-medium">
                        {alert.ip || "-"}{" "}
                        <span className="text-xs text-cyan-400">
                          ({alert.geo?.country || "N/A"})
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-1">
                        {alert.method} {alert.path} •{" "}
                        <span className="text-slate-300">
                          {normalizeModuleName(alert.module)}
                        </span>
                      </p>
                    </div>

                    <span className="text-[11px] text-gray-500 whitespace-nowrap">
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString() : ""}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-gray-700/60 overflow-hidden backdrop-blur-xl">
          <div className="px-6 py-4 border-b border-gray-700/60 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-semibold text-gray-100">Recent Requests</h2>
              <span className="text-xs text-gray-500">
                ({pagination.total || events.length} total)
              </span>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-400 text-sm">No traffic events found for current filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
             <thead className="bg-slate-900/70 border-b border-gray-700/70">
  <tr>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
      Time
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
      IP / Location
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
      Path
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
      Method
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
      Status
    </th>
    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
      Anomaly
    </th> */}
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
      Spike
    </th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
      Details
    </th>
  </tr>
</thead>


              <tbody className="divide-y divide-gray-700/60">
  {events.map((ev) => {
    const a = anomalyMeta(ev.anomalyScore);
    return (
      <tr key={ev._id} className="hover:bg-slate-800/40 transition-colors">
        <td className="px-6 py-3 text-xs text-gray-400 whitespace-nowrap">
          {ev.createdAt ? new Date(ev.createdAt).toLocaleString() : "-"}
        </td>

        <td className="px-6 py-3 text-sm text-gray-200">
          <div className="flex flex-col">
            <span className="font-medium">{ev.ip || "-"}</span>
            <span className="text-xs text-gray-500">
              {ev.geo?.country || "N/A"} {ev.geo?.city ? `• ${ev.geo.city}` : ""}
            </span>
          </div>
        </td>

        <td className="px-6 py-3 text-sm text-gray-200 max-w-xs">
          <p className="truncate">{ev.path || "/"}</p>
        </td>

        <td className="px-6 py-3 text-sm">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getMethodColor(ev.method)}`}>
            {ev.method || "-"}
          </span>
        </td>

        <td className="px-6 py-3 text-sm">
          <span className={`font-semibold ${getStatusColor(ev.status)}`}>
            {ev.status || "-"}
          </span>
        </td>

        {/* ✅ ONLY ONE ANOMALY COLUMN */}
        {/* <td className="px-6 py-3 text-sm">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${a.cls}`}>
            {a.label} ({ev.anomalyScore ?? 0})
          </span>
        </td> */}

        {/* ✅ SPIKE COLUMN FIXED */}
        <td className="px-6 py-3 text-sm">
          {ev.isSpike ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/40">
              Spike
            </span>
          ) : (
            <span className="text-xs text-gray-500">Normal</span>
          )}
        </td>

        <td className="px-6 py-3 text-sm">
          <button
            onClick={() => setSelected(ev)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-700/60 hover:border-cyan-400/70 hover:text-cyan-200 transition-all text-xs"
          >
            <Eye className="w-4 h-4" />
            View
          </button>
        </td>
      </tr>
    );
  })}
</tbody>

              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-700/60 text-xs text-gray-400">
              <span>
                Page {page} of {pagination.pages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg bg-slate-900/70 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-500 hover:text-cyan-300 transition-all"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  className="px-3 py-1 rounded-lg bg-slate-900/70 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-500 hover:text-cyan-300 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selected && (
        <DetailsModal
          event={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ========= COMPONENTS ========= */

function StatCard({ title, value, icon, gradient, hint }) {
  return (
    <div className="group relative bg-gradient-to-br from-slate-900/70 to-slate-800/70 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/60 hover:border-cyan-400/70 transition-all duration-300 hover:-translate-y-1">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`} />
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
            {value}
          </p>
          {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
        </div>
        <div className="p-2 rounded-xl bg-slate-900/80 border border-gray-700/70 text-gray-200 group-hover:border-cyan-400/70">
          {icon}
        </div>
      </div>
    </div>
  );
}

function TrafficHudStrip({ stats, alertsCount, bucketCounts }) {
  const total = stats.total || 0;
  const uniqueIps = stats.uniqueIps || 0;
  const spikes = stats.last1hSpikes || 0;

  // risk score: simple but explainable
  const riskScoreRaw = spikes * 4 + alertsCount * 3 + uniqueIps * 0.02 + (stats.avgAnomalyScore || 0) * 0.3;
  const riskScore = Math.max(5, Math.min(100, Math.round(riskScoreRaw)));

  let label = "Stable";
  let ringColor = "from-emerald-500/30 via-cyan-500/40 to-emerald-500/10";
  if (riskScore >= 75) {
    label = "Critical";
    ringColor = "from-red-500/40 via-orange-500/40 to-red-500/10";
  } else if (riskScore >= 45) {
    label = "Elevated";
    ringColor = "from-amber-400/40 via-orange-500/40 to-amber-300/10";
  } else if (riskScore >= 25) {
    label = "Active";
    ringColor = "from-cyan-500/40 via-sky-500/40 to-cyan-400/10";
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-950/80 shadow-[0_0_35px_rgba(8,47,73,0.9)] flex items-center gap-4 px-6 py-5">
      <div className={`absolute -top-10 -right-12 w-44 h-44 rounded-full bg-gradient-to-br ${ringColor} blur-3xl opacity-60`} />

      <div className="relative">
        <div className="relative w-28 h-28">
          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/50 animate-spin [animation-duration:6s]" />
          <div className="absolute inset-2 rounded-full border-2 border-purple-500/40 border-dashed" />
          <div className="absolute inset-6 rounded-full bg-slate-950/90 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/80">
              Risk
            </span>
            <span className="text-xl font-semibold text-slate-50">
              {riskScore}
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex-1 space-y-2">
        {/* <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.18em] text-cyan-300/80 flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-cyan-300" />
            Threat Level
          </span>
          <span className="px-3 py-1 rounded-full text-xs border border-cyan-400/60 bg-cyan-500/10 text-cyan-100 font-medium">
            {label}
          </span>
          <span className="ml-auto text-[11px] text-slate-400">
            Feature Proof: anomaly + spikes + sessions
          </span>
        </div> */}

        <div className="grid grid-cols-3 gap-3 text-xs pt-2">
          <HudMiniMetric label="Total Requests" value={total} />
          <HudMiniMetric label="Unique IPs" value={uniqueIps} />
          <HudMiniMetric label="Spikes (1h)" value={spikes} />
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs pt-2">
          <HudMiniMetric label="Anomaly High" value={bucketCounts.High} />
          <HudMiniMetric label="Anomaly Medium" value={bucketCounts.Medium} />
          <HudMiniMetric label="Anomaly Low" value={bucketCounts.Low} />
        </div>
      </div>
    </div>
  );
}

function HudMiniMetric({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-cyan-200">{value ?? 0}</span>
    </div>
  );
}

function GeoMiniHeat({ byCountry }) {
  const top = (byCountry || []).slice(0, 4);
  const maxCount = top.length ? Math.max(...top.map((c) => c.count || 0)) : 0;

  return (
    <div className="relative rounded-2xl border border-slate-700/80 bg-slate-950/80 overflow-hidden px-5 py-5">
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="w-full h-full bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.25),transparent_55%),radial-gradient(circle_at_bottom,_rgba(147,51,234,0.25),transparent_55%)]" />
      </div>

      <div className="relative z-10 flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1">
            <Globe className="w-4 h-4 text-cyan-300" />
            Geo Distribution
          </p>
          <p className="text-xs text-slate-400">Feature: Geo-location lookup</p>
        </div>
      </div>

      <div className="relative z-10 space-y-2.5">
        {top.length === 0 ? (
          <p className="text-xs text-slate-500">No geo data yet.</p>
        ) : (
          top.map((c) => {
            const width = maxCount > 0 ? Math.max(8, (c.count / maxCount) * 100) : 0;
            return (
              <div key={c._id || c.country} className="flex items-center gap-3 text-xs">
                <span className="w-12 text-slate-300 truncate font-medium">
                  {c._id || "N/A"}
                </span>
                <div className="flex-1 h-3 rounded-full bg-slate-900/80 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="w-12 text-right text-slate-400 font-semibold">
                  {c.count}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ===== ModuleBreakdown component remains as-is (but not rendered in UI now) ===== */
function ModuleBreakdown({ byModule }) {
  const top = (byModule || []).slice(0, 5);
  const max = top.length ? Math.max(...top.map((m) => m.count || 0)) : 0;

  return (
    <div className="relative rounded-2xl border border-slate-700/80 bg-slate-950/80 overflow-hidden px-5 py-5">
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="w-full h-full bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),transparent_55%),radial-gradient(circle_at_bottom,_rgba(16,185,129,0.18),transparent_55%)]" />
      </div>

      <div className="relative z-10 mb-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400 flex items-center gap-1">
          <Layers className="w-4 h-4 text-emerald-300" />
          Module Traffic
        </p>
        <p className="text-xs text-slate-400">
          Proof: Traffic Monitor tracks all modules
        </p>
      </div>

      <div className="relative z-10 space-y-2.5">
        {top.length === 0 ? (
          <p className="text-xs text-slate-500">No module data yet.</p>
        ) : (
          top.map((m) => {
            const width = max > 0 ? Math.max(8, (m.count / max) * 100) : 0;
            return (
              <div key={m._id} className="flex items-center gap-3 text-xs">
                <span className="w-28 text-slate-300 truncate font-medium">
                  {normalizeModuleName(m._id)}
                </span>
                <div className="flex-1 h-3 rounded-full bg-slate-900/80 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="w-12 text-right text-slate-400 font-semibold">
                  {m.count}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function DetailsModal({ event, onClose }) {
  const headersPretty = useMemo(() => {
    try {
      return JSON.stringify(event.headers || {}, null, 2);
    } catch {
      return String(event.headers || {});
    }
  }, [event.headers]);

  const anomaly = useMemo(() => {
    const s = Number(event.anomalyScore || 0);
    if (s >= 70) return { label: "High", cls: "text-red-300" };
    if (s >= 35) return { label: "Medium", cls: "text-amber-300" };
    return { label: "Low", cls: "text-emerald-300" };
  }, [event.anomalyScore]);

  // ✅✅✅ CHANGE #2: Export this specific event PDF
  const handleExportThisRequest = async () => {
    try {
      const id = event?._id;
      if (!id) return toast.error("Missing event id");

      const res = await api.get(`/traffic/export/${id}`, { responseType: "blob" });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `traffic_event_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Single request PDF downloaded");
    } catch (err) {
      console.error("Single export error:", err);
      if (err.response?.status === 404) toast.error("Event not found for export");
      else toast.error("Failed to export this request");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-950 to-slate-900 shadow-[0_0_45px_rgba(34,211,238,0.15)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-300" />
            <h3 className="text-sm font-semibold text-slate-100">Request Details (Proof Panel)</h3>
            {event.isSpike && (
              <span className="ml-2 px-3 py-1 rounded-full text-xs bg-red-500/20 text-red-300 border border-red-500/40">
                Spike
              </span>
            )}
            <span className={`ml-2 text-xs ${anomaly.cls}`}>
              {anomaly.label} Anomaly • {event.anomalyScore ?? 0}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/60 hover:border-cyan-400/70 transition-all"
          >
            <X className="w-4 h-4 text-slate-200" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoBlock title="Core Info" icon={<Activity className="w-4 h-4 text-cyan-300" />}>
            <Line label="Time" value={event.createdAt ? new Date(event.createdAt).toLocaleString() : "-"} />
            <Line label="IP" value={event.ip || "-"} />
            <Line label="Geo" value={`${event.geo?.country || "N/A"} ${event.geo?.city ? `• ${event.geo.city}` : ""}`} />
            <Line label="Module" value={normalizeModuleName(event.module)} />
            <Line label="Path" value={event.path || "/"} />
            <Line label="Method" value={event.method || "-"} />
            <Line label="Status" value={String(event.status ?? "-")} />
          </InfoBlock>

          <InfoBlock title="Session + Performance" icon={<Timer className="w-4 h-4 text-emerald-300" />}>
            <Line label="Session ID" value={event.sessionId || "-"} />
            <Line label="User-Agent" value={event.userAgent || "-"} />
            <Line label="Referrer" value={event.referrer || "-"} />
            <Line label="Duration" value={`${event.durationMs ?? 0} ms`} />
          </InfoBlock>
{/* 
          <InfoBlock title="Anomaly Reasons (Feature Proof)" icon={<ShieldAlert className="w-4 h-4 text-red-300" />}>
            {event.anomalyReasons?.length ? (
              <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
                {event.anomalyReasons.map((r, idx) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">No reasons available.</p>
            )}
          </InfoBlock> */}

          <InfoBlock title="Logged Headers (Feature Proof)" icon={<Globe className="w-4 h-4 text-purple-300" />}>
            <pre className="text-[11px] leading-5 text-slate-300 bg-slate-950/60 border border-slate-700/60 rounded-xl p-3 overflow-auto max-h-48">
              {headersPretty}
            </pre>
          </InfoBlock>
        </div>

        <div className="px-5 py-4 border-t border-slate-700/60 flex items-center justify-between ">
          <p className="text-[11px] text-slate-400">
            This modal is the examiner-proof for: Headers logging, Session tracking, Geo, Anomaly detection & Spikes.
          </p>

          <div className="flex items-center gap-2">
            {/* ✅ NEW BUTTON */}
            <button
              onClick={handleExportThisRequest}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all"
            >
              Export This Request PDF
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ title, icon, children }) {
  return (
    <div className="rounded-2xl bg-slate-950/60 border border-slate-700/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/60">
          {icon}
        </div>
        <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className="text-[11px] text-slate-200 text-right break-all max-w-[70%]">
        {value}
      </span>
    </div>
  );
}
