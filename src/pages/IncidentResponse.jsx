import { useEffect, useState, useMemo } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import {
  Shield,
  ShieldAlert,
  Download,
  Trash2,
  Eye,
  AlertTriangle,
  RefreshCw,
  X,
  CheckCircle,
  Activity,
  BellRing,
  Ban,
  FileText,
  Search,
} from "lucide-react";

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000"
).replace(/\/api$/, "");

const SEVERITY_STYLE = (v) => {
  switch (v?.toLowerCase()) {
    case "critical": return "bg-red-500/15 text-red-300 border-red-500/40";
    case "high":     return "bg-orange-500/15 text-orange-300 border-orange-500/40";
    case "medium":   return "bg-amber-500/15 text-amber-300 border-amber-500/40";
    default:         return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
  }
};

const STATUS_STYLE = (v) => {
  switch (v?.toLowerCase()) {
    case "blocked":   return "bg-red-500/15 text-red-300 border-red-500/40";
    case "recovered": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
    default:          return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  }
};

export default function IncidentResponse() {
  const [records,      setRecords]      = useState([]);
  const [stats,        setStats]        = useState({});
  const [view,         setView]         = useState(null);
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [sevFilter,    setSevFilter]    = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  /* ── fetch ── */
  const fetchStats = async () => {
    try {
      const res = await api.get("/incident-response/stats");
      setStats(res.data || {});
    } catch (err) { console.error(err); }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.get("/incident-response");
      setRecords(res.data.incidents || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load incidents");
    } finally { setLoading(false); }
  };

  const refreshAll = () => { setSelectedIds([]); fetchStats(); fetchRecords(); };

  useEffect(() => { fetchStats(); fetchRecords(); }, []);

  /* ── socket ── */
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.on("incident-alert", (payload) => {
      toast.warn(
        <div>
          <p className="font-semibold">🚨 Incident Detected</p>
          <p className="text-xs mt-1">{payload.attackType} — {payload.severity?.toUpperCase()}</p>
        </div>,
        { autoClose: 6000 }
      );
      fetchRecords(); fetchStats();
    });
    return () => socket.disconnect();
  }, []);

  /* ── actions ── */
  const block = async (id) => {
    try {
      await api.put(`/incident-response/block/${id}`);
      toast.success("Attacker blocked successfully");
      refreshAll();
    } catch (err) { console.error(err); toast.error("Failed to block incident"); }
  };

  const recover = async (id) => {
    try {
      await api.put(`/incident-response/recovery/${id}`, {
        recoveryProcedure: "Threat isolated and services restored",
      });
      toast.success("Recovery procedure logged");
      refreshAll();
    } catch (err) { console.error(err); toast.error("Failed to initiate recovery"); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/incident-response/${id}`);
      toast.success("Incident deleted");
      setRecords((prev) => prev.filter((r) => r._id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      if (view?._id === id) setView(null);
      fetchStats();
    } catch (err) { console.error(err); toast.error("Failed to delete incident"); }
  };

  const bulkDelete = async () => {
    if (!selectedIds.length) { toast.info("No incidents selected"); return; }
    try {
      await api.delete("/incident-response/bulk", { data: { ids: selectedIds } });
      toast.success(`${selectedIds.length} incidents deleted`);
      setSelectedIds([]); fetchRecords(); fetchStats();
    } catch (err) { console.error(err); toast.error("Failed to delete selected incidents"); }
  };

  const exportPDF = async () => {
    try {
      const res = await api.get("/incident-response/export/pdf", { responseType: "blob" });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `incident-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Incident report exported");
    } catch (err) { console.error(err); toast.error("Failed to export PDF"); }
  };

  /* ── select ── */
  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map((r) => r._id));
  const toggleSelectOne = (id) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  /* ── filter ── */
  const filtered = useMemo(() =>
    records.filter((r) => {
      const q      = search.toLowerCase();
      const matchQ = !q || r.attackType?.toLowerCase().includes(q) || r.ipAddress?.toLowerCase().includes(q);
      const matchS = sevFilter    === "all" || r.severity?.toLowerCase() === sevFilter;
      const matchT = statusFilter === "all" || r.status?.toLowerCase()   === statusFilter;
      return matchQ && matchS && matchT;
    }), [records, search, sevFilter, statusFilter]);

  const statCards = useMemo(() => [
    { label: "Total",     value: stats.total     ?? 0, color: "from-cyan-400 to-blue-500",    icon: <Activity    className="w-5 h-5" />, border: "border-cyan-500/20"    },
    { label: "Blocked",   value: stats.blocked   ?? 0, color: "from-red-400 to-rose-600",     icon: <Ban         className="w-5 h-5" />, border: "border-red-500/20"     },
    { label: "Recovered", value: stats.recovered ?? 0, color: "from-emerald-400 to-teal-600", icon: <CheckCircle className="w-5 h-5" />, border: "border-emerald-500/20" },
    { label: "Alerts",    value: stats.alerts    ?? 0, color: "from-amber-400 to-orange-500", icon: <BellRing    className="w-5 h-5" />, border: "border-amber-500/20"   },
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
      <div className="p-6 max-w-7xl mx-auto space-y-5">

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <Shield className="w-7 h-7 text-cyan-400" />
              Incident Response
            </h1>
            <p className="text-gray-400 mt-1 text-sm">Automatic blocking and recovery handling</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={refreshAll}
              className="flex items-center gap-2 bg-slate-800/70 text-gray-200 px-4 py-2 rounded-xl border border-slate-600 hover:border-cyan-500 hover:text-cyan-300 transition-all text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-2 bg-cyan-600/80 text-white px-4 py-2 rounded-xl hover:bg-cyan-700 transition-all text-sm">
              <Download className="w-4 h-4" /> Export PDF
            </button>
            <button onClick={bulkDelete} disabled={!selectedIds.length}
              className="flex items-center gap-2 bg-red-600/80 text-white px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/20 text-sm">
              <Trash2 className="w-4 h-4" />
              Delete Selected {selectedIds.length > 0 && `(${selectedIds.length})`}
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((c, i) => (
            <div key={i} className={`bg-gradient-to-br from-slate-900/70 to-slate-800/70 border ${c.border} rounded-2xl p-4 backdrop-blur-xl`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{c.label}</p>
                  <p className={`text-3xl font-bold bg-gradient-to-r ${c.color} bg-clip-text text-transparent mt-1`}>{c.value}</p>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/70">{c.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── FILTER BAR ── */}
        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-slate-700/70 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search attack type, IP address..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
              />
            </div>
            <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm">
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm">
              <option value="all">All Statuses</option>
              <option value="detected">Detected</option>
              <option value="blocked">Blocked</option>
              <option value="recovered">Recovered</option>
            </select>
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-gray-700/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/60 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
              Incident Records
              <span className="ml-2 text-slate-500 font-normal normal-case">({filtered.length} records)</span>
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <ShieldAlert className="w-14 h-14 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No incident records found</p>
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
                    {["Attack Type", "IP Address", "Severity", "Status", "Auto Blocked", "Mitigation", "Time", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {filtered.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedIds.includes(r._id)}
                          onChange={() => toggleSelectOne(r._id)}
                          className="w-4 h-4 accent-cyan-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-200 font-medium whitespace-nowrap">{r.attackType}</td>
                      <td className="px-4 py-3 text-sm text-gray-300 font-mono">{r.ipAddress}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs border font-semibold ${SEVERITY_STYLE(r.severity)}`}>
                          {r.severity?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs border font-semibold ${STATUS_STYLE(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.autoBlocked
                          ? <span className="inline-flex items-center gap-1 text-xs text-red-300"><Ban className="w-3.5 h-3.5" /> Yes</span>
                          : <span className="text-xs text-gray-500">No</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[160px] truncate" title={r.mitigationSteps}>
                        {r.mitigationSteps || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setView(r)}
                            className="flex items-center gap-1 bg-cyan-600/80 hover:bg-cyan-600 text-white px-2.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap">
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button onClick={() => block(r._id)} disabled={r.status === "blocked"}
                            className="flex items-center gap-1 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-2.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap">
                            <Ban className="w-3 h-3" /> Block
                          </button>
                          <button onClick={() => recover(r._id)} disabled={r.status === "recovered"}
                            className="flex items-center gap-1 bg-emerald-700/80 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-2.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap">
                            <CheckCircle className="w-3 h-3" /> Recover
                          </button>
                          <button onClick={() => remove(r._id)}
                            className="bg-slate-700/80 hover:bg-slate-700 text-white p-1.5 rounded-lg transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── DETAIL MODAL ── */}
      {view && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" /> Incident Detail
              </h2>
              <button onClick={() => setView(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              {[
                { label: "Attack Type",    value: view.attackType },
                { label: "IP Address",     value: view.ipAddress },
                { label: "Severity",       value: view.severity?.toUpperCase() },
                { label: "Status",         value: view.status },
                { label: "Auto Blocked",   value: view.autoBlocked   ? "YES" : "NO" },
                { label: "Incident Alert", value: view.incidentAlert ? "YES" : "NO" },
              ].map((f, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">{f.label}</p>
                  <p className="text-sm font-semibold text-gray-100">{f.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-3 mb-3">
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Mitigation Steps</p>
              <p className="text-sm text-gray-200">{view.mitigationSteps || "—"}</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Recovery Procedure</p>
              <p className="text-sm text-gray-200">{view.recoveryProcedure || "Not yet logged"}</p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { block(view._id); setView(null); }} disabled={view.status === "blocked"}
                className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm transition-all">
                <Ban className="w-4 h-4" /> Block Attacker
              </button>
              <button onClick={() => { recover(view._id); setView(null); }} disabled={view.status === "recovered"}
                className="flex items-center gap-1.5 bg-emerald-700/80 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm transition-all">
                <CheckCircle className="w-4 h-4" /> Log Recovery
              </button>
              <button onClick={() => remove(view._id)}
                className="flex items-center gap-1.5 bg-slate-700/80 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm transition-all">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4">Created: {new Date(view.createdAt).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}