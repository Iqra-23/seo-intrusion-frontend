import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import {
  ShieldAlert, Search, Download, Trash2, Eye, X,
  Activity, AlertTriangle, Mail, BarChart3, Shield,
} from "lucide-react";

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000"
).replace(/\/api$/, "");

const SEVERITY_STYLE = (value) => {
  switch (value?.toUpperCase()) {
    case "CRITICAL": return "bg-red-500/15 text-red-300 border-red-500/40";
    case "HIGH":     return "bg-orange-500/15 text-orange-300 border-orange-500/40";
    case "MEDIUM":   return "bg-amber-500/15 text-amber-300 border-amber-500/40";
    default:         return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
  }
};

const TYPE_LABELS = {
  "unusual-login":              "Unusual Login",
  "abnormal-request-frequency": "Abnormal Frequency",
  "negative-seo-traffic":       "Negative SEO",
  "normal-traffic":             "Normal Traffic",
};

export default function AnomalyDetector() {
  const [records,     setRecords]     = useState([]);
  const [stats,       setStats]       = useState({});
  const [baseline,    setBaseline]    = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewItem,    setViewItem]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [sevFilter,   setSevFilter]   = useState("all");

  const fetchStats = async () => {
    try {
      const res = await api.get("/anomaly/stats");
      setStats(res.data || {});
    } catch (err) { console.error(err); }
  };

  const fetchBaseline = async () => {
    try {
      const res = await api.get("/anomaly/baseline");
      setBaseline(res.data.baseline || {});
    } catch (err) { console.error(err); }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.get("/anomaly");
      setRecords(res.data.records || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load anomaly records");
    } finally { setLoading(false); }
  };

  const refreshAll = () => {
    setSelectedIds([]);
    fetchStats();
    fetchBaseline();
    fetchRecords();
  };

  useEffect(() => {
    fetchStats();
    fetchBaseline();
    fetchRecords();
  }, []);

  // socket — auto update jab bhi anomaly aaye
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("anomaly-alert", (payload) => {
      toast.warn(
        <div>
          <p className="font-semibold">⚠️ Anomaly Detected</p>
          <p className="text-xs mt-1">{payload.anomalyType} — {payload.severity}</p>
          <p className="text-xs text-gray-400">IP: {payload.ip}</p>
        </div>,
        { autoClose: 5000 }
      );
      fetchRecords();
      fetchStats();
    });

    return () => socket.disconnect();
  }, []);

  const deleteBulk = async () => {
    if (!selectedIds.length) { toast.info("No records selected"); return; }
    try {
      await api.delete("/anomaly/bulk", { data: { ids: selectedIds } });
      toast.success("Selected records deleted");
      setSelectedIds([]);
      fetchRecords();
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete selected records");
    }
  };

  const exportPDF = async () => {
    try {
      const res = await api.get("/anomaly/export/pdf", { responseType: "blob" });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `anomaly-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Anomaly report exported");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF");
    }
  };

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map((r) => r._id));
  const toggleSelectOne = (id) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const filtered = useMemo(() =>
    records.filter((r) => {
      const q      = search.toLowerCase();
      const matchQ = !q || r.anomalyType?.toLowerCase().includes(q) || r.ip?.toLowerCase().includes(q);
      const matchT = typeFilter === "all" || r.anomalyType === typeFilter;
      const matchS = sevFilter  === "all" || r.severity?.toUpperCase() === sevFilter;
      return matchQ && matchT && matchS;
    }), [records, search, typeFilter, sevFilter]);

  const statCards = useMemo(() => [
    { label: "Total",     value: stats.total        ?? 0, color: "from-cyan-400 to-blue-500",    icon: <Activity      className="w-5 h-5" /> },
    { label: "Login",     value: stats.unusualLogin  ?? 0, color: "from-yellow-400 to-orange-500", icon: <AlertTriangle className="w-5 h-5" /> },
    { label: "SEO",       value: stats.negativeSeo  ?? 0, color: "from-pink-400 to-rose-600",    icon: <BarChart3     className="w-5 h-5" /> },
    { label: "High Risk", value: stats.high         ?? 0, color: "from-red-400 to-red-600",      icon: <ShieldAlert   className="w-5 h-5" /> },
    { label: "Alerts",    value: stats.alerts       ?? 0, color: "from-emerald-400 to-teal-600", icon: <Mail          className="w-5 h-5" /> },
  ], [stats]);

  if (loading && records.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <Shield className="w-7 h-7 text-cyan-400" />
              Anomaly Detector
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Detect abnormal user behaviour and traffic deviations
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={exportPDF}
              className="flex items-center gap-2 bg-cyan-600/80 text-white px-4 py-2 rounded-xl hover:bg-cyan-700 transition-all text-sm">
              <Download className="w-4 h-4" /> Export PDF
            </button>
            <button onClick={deleteBulk}
              className="flex items-center gap-2 bg-red-600/80 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 text-sm">
              <Trash2 className="w-4 h-4" /> Delete Selected
            </button>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {statCards.map((c, i) => (
            <div key={i} className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 border border-slate-700/70 rounded-2xl p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{c.label}</p>
                  <p className={`text-2xl font-bold bg-gradient-to-r ${c.color} bg-clip-text text-transparent mt-1`}>
                    {c.value}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/70">{c.icon}</div>
              </div>
            </div>
          ))}
        </div>

    

        {/* FILTER BAR */}
        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-slate-700/70 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search anomaly type, IP..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
              />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm">
              <option value="all">All Attack Types</option>
              <option value="unusual-login">Unusual Login</option>
              <option value="abnormal-request-frequency">Abnormal Frequency</option>
              <option value="negative-seo-traffic">Negative SEO</option>
              <option value="normal-traffic">Normal Traffic</option>
            </select>
            <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm">
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* BASELINE */}
        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 border border-slate-700/70 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-cyan-400 mb-3 uppercase tracking-wider">
            Normal Behaviour Baseline
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Avg Request/min", value: baseline.avgRequestsPerMinute },
              { label: "Login Attempts",  value: baseline.avgLoginAttempts },
              { label: "Failed Logins",   value: baseline.avgFailedLogins },
              { label: "SEO Hits",        value: baseline.avgSeoKeywordHits },
            ].map((b, i) => (
              <div key={i} className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">{b.label}</p>
                <p className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  {b.value ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-gray-700/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
              Anomaly Records
              <span className="ml-2 text-slate-500 font-normal normal-case">({filtered.length} records)</span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live updates via socket
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <ShieldAlert className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No anomaly records found</p>
              <p className="text-gray-500 text-sm mt-1">
                Send a POST to /api/anomaly/analyze to trigger detection
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/70 border-b border-gray-700/70">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox"
                        checked={filtered.length > 0 && selectedIds.length === filtered.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 accent-cyan-500"
                      />
                    </th>
                    {["Attack Type","Severity","IP / Path","Current","Baseline","Deviation","Time","View"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {filtered.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={selectedIds.includes(r._id)}
                          onChange={() => toggleSelectOne(r._id)}
                          className="w-4 h-4 accent-cyan-500"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-200 font-medium">
                        {TYPE_LABELS[r.anomalyType] || r.anomalyType}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs border font-semibold ${SEVERITY_STYLE(r.severity)}`}>
                          {r.severity?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300 font-mono">{r.ip}</td>
                      <td className="px-4 py-4 text-sm text-gray-300">{r.currentValue}</td>
                      <td className="px-4 py-4 text-sm text-gray-400">{r.baselineValue}</td>
                      <td className="px-4 py-4 text-sm">
                        <span className={
                          r.deviation > 100 ? "text-red-400 font-semibold" :
                          r.deviation > 50  ? "text-amber-300" : "text-gray-400"
                        }>
                          {r.deviation != null ? `${r.deviation}%` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <button onClick={() => setViewItem(r)}
                          className="flex items-center gap-1 bg-cyan-600/80 hover:bg-cyan-600 text-white px-3 py-1.5 rounded-lg text-xs transition-all">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* DETAIL MODAL */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Anomaly Detail
              </h2>
              <button onClick={() => setViewItem(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Type",       value: TYPE_LABELS[viewItem.anomalyType] || viewItem.anomalyType },
                { label: "IP Address", value: viewItem.ip },
                { label: "Current",    value: viewItem.currentValue },
                { label: "Baseline",   value: viewItem.baselineValue },
                { label: "Deviation",  value: viewItem.deviation != null ? `${viewItem.deviation}%` : "—" },
                { label: "Score",      value: viewItem.score ?? "—" },
              ].map((f, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">{f.label}</p>
                  <p className="text-sm font-semibold text-gray-100">{f.value}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs border font-semibold ${SEVERITY_STYLE(viewItem.severity)}`}>
                {viewItem.severity?.toUpperCase()}
              </span>
              {viewItem.emailAlertSent && (
                <span className="text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Alert Sent
                </span>
              )}
            </div>

            {viewItem.reason && (
              <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-3 text-sm text-gray-300 leading-relaxed">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Reason</p>
                {viewItem.reason}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-3">
              {new Date(viewItem.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}