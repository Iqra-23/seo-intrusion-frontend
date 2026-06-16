import { useEffect, useState, useMemo } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import {
  Shield, ShieldAlert, Download, Trash2, Eye,
  X, CheckCircle, Activity, BellRing, Ban, FileText, Search,
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
      toast.error("Failed to load incidents");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); fetchRecords(); }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.on("incident-alert", (payload) => {
      toast.warn(
        <div>
          <p className="font-semibold">🚨 New Incident</p>
          <p className="text-xs mt-1">{payload.attackType} — {payload.severity?.toUpperCase()}</p>
          {payload.autoBlocked && <p className="text-xs text-red-300 mt-1">⛔ Auto-blocked</p>}
        </div>,
        { autoClose: 6000 }
      );
      fetchRecords();
      fetchStats();
    });
    return () => socket.disconnect();
  }, []);

  const block = async (id) => {
    try {
      const res = await api.put(`/incident-response/block/${id}`);
      toast.success(res.data.message || "IP blocked and blacklisted");
      fetchRecords(); fetchStats();
    } catch (err) { toast.error("Failed to block"); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/incident-response/${id}`);
      toast.success("Deleted");
      setRecords((p) => p.filter((r) => r._id !== id));
      setSelectedIds((p) => p.filter((x) => x !== id));
      if (view?._id === id) setView(null);
      fetchStats();
    } catch (err) { toast.error("Failed to delete"); }
  };

  const bulkDelete = async () => {
    if (!selectedIds.length) { toast.info("No incidents selected"); return; }
    try {
      await api.delete("/incident-response/bulk", { data: { ids: selectedIds } });
      toast.success(`${selectedIds.length} incidents deleted`);
      setSelectedIds([]); fetchRecords(); fetchStats();
    } catch (err) { toast.error("Failed to delete selected"); }
  };

  const exportPDF = async () => {
    try {
      const res  = await api.get("/incident-response/export/pdf", { responseType: "blob" });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `incident-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Report exported");
    } catch (err) { toast.error("Export failed"); }
  };

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map((r) => r._id));
  const toggleSelectOne = (id) =>
    setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const filtered = useMemo(() =>
    records.filter((r) => {
      const q = search.toLowerCase();
      return (
        (!q || r.attackType?.toLowerCase().includes(q) || r.ipAddress?.toLowerCase().includes(q)) &&
        (sevFilter    === "all" || r.severity?.toLowerCase() === sevFilter) &&
        (statusFilter === "all" || r.status?.toLowerCase()   === statusFilter)
      );
    }), [records, search, sevFilter, statusFilter]);

  // Recovered removed from stat cards
  const statCards = [
    { label: "Total",   value: stats.total   ?? 0, icon: <Activity className="w-5 h-5" />, color: "text-cyan-300",  border: "border-cyan-500/20",  bg: "bg-cyan-500/10"  },
    { label: "Blocked", value: stats.blocked ?? 0, icon: <Ban      className="w-5 h-5" />, color: "text-red-300",   border: "border-red-500/20",   bg: "bg-red-500/10"   },
    { label: "Alerts",  value: stats.alerts  ?? 0, icon: <BellRing className="w-5 h-5" />, color: "text-amber-300", border: "border-amber-500/20", bg: "bg-amber-500/10" },
  ];

  if (loading && records.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-7 h-7 text-cyan-400 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
      <div className="p-6 max-w-7xl mx-auto space-y-5">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
              <Shield className="w-7 h-7 text-cyan-400" />
              Incident Response
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Automatic blocking and recovery handling
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={exportPDF}
              className="flex items-center gap-2 bg-cyan-600/80 text-white px-4 py-2 rounded-xl hover:bg-cyan-700 transition-all text-sm font-medium">
              <Download className="w-4 h-4" /> Export PDF
            </button>
            <button onClick={bulkDelete} disabled={!selectedIds.length}
              className="flex items-center gap-2 bg-red-600/80 text-white px-4 py-2 rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-500/20 text-sm font-medium">
              <Trash2 className="w-4 h-4" />
              Delete Selected {selectedIds.length > 0 && `(${selectedIds.length})`}
            </button>
          </div>
        </div>

        {/* STAT CARDS — 3 cards, Recovered removed */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statCards.map((c, i) => (
            <div key={i} className={`rounded-2xl border ${c.border} bg-gradient-to-br from-slate-900/80 to-slate-800/60 px-5 py-4 backdrop-blur-xl`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">{c.label}</p>
                  <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
                </div>
                <div className={`p-2 rounded-xl ${c.bg} border ${c.border}`}>
                  <span className={c.color}>{c.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FILTER BAR */}
        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-slate-700/70 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search attack type, IP address..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950/60 border border-gray-700/60 rounded-xl text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none text-sm transition-all"
              />
            </div>
            <select value={sevFilter} onChange={(e) => setSevFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-950/60 border border-gray-700/60 rounded-xl text-gray-200 outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm transition-all">
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-950/60 border border-gray-700/60 rounded-xl text-gray-200 outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm transition-all">
              <option value="all">All Statuses</option>
              <option value="detected">Detected</option>
              <option value="blocked">Blocked</option>
              <option value="recovered">Recovered</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-gray-700/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/60 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Incident Records</h2>
              <p className="text-xs text-slate-500 mt-0.5">{filtered.length} total records</p>
            </div>
            {/* <div className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Auto-updates via socket
            </div> */}
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 mb-4">
                <ShieldAlert className="w-10 h-10 text-slate-500" />
              </div>
              <p className="text-slate-400 font-medium">No incident records found</p>
              <p className="text-slate-600 text-sm mt-1">Incidents appear automatically when attacks are detected</p>
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
                    {["Attack Type","IP Address","Severity","Status","Auto Blocked","Mitigation","Time","Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/40">
                  {filtered.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={selectedIds.includes(r._id)}
                          onChange={() => toggleSelectOne(r._id)}
                          className="w-4 h-4 accent-cyan-500"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-100 whitespace-nowrap">{r.attackType}</td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-300 font-mono bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-700/50">
                          {r.ipAddress}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs border font-semibold ${SEVERITY_STYLE(r.severity)}`}>
                          {r.severity?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs border font-semibold ${STATUS_STYLE(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {r.autoBlocked
                          ? <span className="inline-flex items-center gap-1.5 text-xs text-red-300 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full">
                              <Ban className="w-3 h-3" /> Blacklisted
                            </span>
                          : <span className="text-xs text-gray-500">No</span>}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-400 max-w-[160px] truncate" title={r.mitigationSteps}>
                        {r.mitigationSteps || "—"}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setView(r)}
                            className="flex items-center gap-1 bg-cyan-600/80 hover:bg-cyan-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all">
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button onClick={() => block(r._id)} disabled={r.autoBlocked}
                            className="flex items-center gap-1 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all">
                            <Ban className="w-3 h-3" /> {r.autoBlocked ? "Blocked" : "Block"}
                          </button>
                          <button onClick={() => remove(r._id)}
                            className="p-1.5 bg-slate-700/60 hover:bg-slate-600 text-slate-300 rounded-lg transition-all">
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

      {/* DETAIL MODAL */}
      {view && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/60">
              <h2 className="text-base font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" /> Incident Detail
              </h2>
              <button onClick={() => setView(null)} className="p-1.5 rounded-lg hover:bg-slate-700 text-gray-400 hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Attack Type", value: view.attackType },
                  { label: "IP Address",  value: view.ipAddress  },
                  { label: "Severity",    value: view.severity?.toUpperCase() },
                  { label: "Status",      value: view.status },
                ].map((f, i) => (
                  <div key={i} className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{f.label}</p>
                    <p className="text-sm font-semibold text-gray-100">{f.value}</p>
                  </div>
                ))}
              </div>
              {view.autoBlocked && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <Ban className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300">IP is blacklisted — all future requests from this IP are blocked</p>
                </div>
              )}
              <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Mitigation Steps</p>
                <p className="text-sm text-gray-300 leading-relaxed">{view.mitigationSteps || "—"}</p>
              </div>
              <div className="flex gap-2 pt-1">
                {!view.autoBlocked && (
                  <button onClick={() => { block(view._id); setView(null); }}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
                    <Ban className="w-4 h-4" /> Block & Blacklist IP
                  </button>
                )}
                <button onClick={() => { remove(view._id); }}
                  className="flex items-center gap-2 bg-slate-700/80 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl text-sm transition-all">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
              <p className="text-xs text-gray-600">Created: {new Date(view.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}