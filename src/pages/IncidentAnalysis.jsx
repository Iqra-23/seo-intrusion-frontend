import { useEffect, useState, useMemo } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import {
  BarChart2, FileText, Shield, Download, Trash2,
  RefreshCw, Eye, X, ClipboardList, AlertTriangle,
  CheckCircle, Activity, Ban, FileSpreadsheet,
} from "lucide-react";

const TYPE_STYLE = (t) => {
  switch (t) {
    case "daily":   return "bg-cyan-500/15 text-cyan-300 border-cyan-500/40";
    case "weekly":  return "bg-purple-500/15 text-purple-300 border-purple-500/40";
    case "monthly": return "bg-amber-500/15 text-amber-300 border-amber-500/40";
    default:        return "bg-slate-500/15 text-slate-300 border-slate-500/40";
  }
};

const CAT_COLOR = {
  DoS:       "bg-red-500",
  Injection: "bg-orange-500",
  Malware:   "bg-purple-500",
  Other:     "bg-slate-500",
};

export default function IncidentAnalysis() {
  const [reports,       setReports]       = useState([]);
  const [auditLogs,     setAuditLogs]     = useState([]);
  const [classification, setClassification] = useState({ breakdown: {}, total: 0 });
  const [view,          setView]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [generating,    setGenerating]    = useState(false);
  const [activeTab,     setActiveTab]     = useState("reports");
  const [reportType,    setReportType]    = useState("daily");
  const [typeFilter,    setTypeFilter]    = useState("all");

  /* ── fetch ── */
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [r, a, c] = await Promise.all([
        api.get("/incident-analysis"),
        api.get("/incident-analysis/audit-logs"),
        api.get("/incident-analysis/attack-classification"),
      ]);
      setReports(r.data.reports || []);
      setAuditLogs(a.data.logs || []);
      setClassification(c.data || { breakdown: {}, total: 0 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  /* ── generate ── */
  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await api.post("/incident-analysis/generate", { reportType });
      toast.success(`${reportType} report generated successfully`);
      fetchAll();
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate report");
    } finally { setGenerating(false); }
  };

  /* ── export PDF ── */
  const exportPDF = async (id) => {
    try {
      const res = await api.get(`/incident-analysis/export/pdf/${id}`, { responseType: "blob" });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `report-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF exported");
    } catch (err) { console.error(err); toast.error("Failed to export PDF"); }
  };

  /* ── export Excel ── */
  const exportExcel = async (id) => {
    try {
      const res = await api.get(`/incident-analysis/export/excel/${id}`, { responseType: "blob" });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `report-${id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Excel exported");
    } catch (err) { console.error(err); toast.error("Failed to export Excel"); }
  };

  /* ── delete ── */
  const deleteReport = async (id) => {
    try {
      await api.delete(`/incident-analysis/${id}`);
      toast.success("Report deleted");
      setReports((prev) => prev.filter((r) => r._id !== id));
      if (view?._id === id) setView(null);
    } catch (err) { console.error(err); toast.error("Failed to delete report"); }
  };

  /* ── filter ── */
  const filtered = useMemo(() =>
    reports.filter((r) => typeFilter === "all" || r.reportType === typeFilter),
    [reports, typeFilter]
  );

  /* ── stat cards ── */
  const totalReports    = reports.length;
  const totalIncidents  = reports.reduce((s, r) => s + (r.totalIncidents || 0), 0);
  const totalBlocked    = reports.reduce((s, r) => s + (r.blocked        || 0), 0);
  const totalRecovered  = reports.reduce((s, r) => s + (r.recovered      || 0), 0);

  if (loading) {
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
              <BarChart2 className="w-7 h-7 text-cyan-400" />
              Incident Analysis Reporting
            </h1>
            <p className="text-gray-400 mt-1 text-sm">Report generation, audit trail & attack classification</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}
              className="px-3 py-2 bg-slate-800/70 border border-slate-600 rounded-xl text-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button onClick={handleGenerate} disabled={generating}
              className="flex items-center gap-2 bg-purple-600/80 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl transition-all text-sm">
              {generating
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <FileText className="w-4 h-4" />}
              {generating ? "Generating..." : "Generate Report"}
            </button>
            <button onClick={fetchAll}
              className="flex items-center gap-2 bg-slate-800/70 text-gray-200 px-4 py-2 rounded-xl border border-slate-600 hover:border-cyan-500 hover:text-cyan-300 transition-all text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Reports",    value: totalReports,   color: "from-cyan-400 to-blue-500",    icon: <FileText    className="w-5 h-5" />, border: "border-cyan-500/20"    },
            { label: "Total Incidents",  value: totalIncidents, color: "from-purple-400 to-pink-500",  icon: <Activity    className="w-5 h-5" />, border: "border-purple-500/20"  },
            { label: "Total Blocked",    value: totalBlocked,   color: "from-red-400 to-rose-600",     icon: <Ban         className="w-5 h-5" />, border: "border-red-500/20"     },
            { label: "Total Recovered",  value: totalRecovered, color: "from-emerald-400 to-teal-600", icon: <CheckCircle className="w-5 h-5" />, border: "border-emerald-500/20" },
          ].map((c, i) => (
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


        {/* ── TABS ── */}
        <div className="flex gap-2 border-b border-slate-700/70 pb-0">
          {[
            { key: "reports",   label: "Reports",    icon: <FileText      className="w-4 h-4" /> },
            { key: "audit",     label: "Audit Trail", icon: <ClipboardList className="w-4 h-4" /> },
          ].map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
                activeTab === t.key
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── REPORTS TAB ── */}
        {activeTab === "reports" && (
          <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-gray-700/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/60 flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
                Generated Reports
                <span className="ml-2 text-slate-500 font-normal normal-case">({filtered.length})</span>
              </h2>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 outline-none focus:ring-2 focus:ring-cyan-500 text-sm">
                <option value="all">All Types</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <BarChart2 className="w-14 h-14 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No reports found. Generate one above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/70 border-b border-gray-700/70">
                    <tr>
                      {["Type", "Total", "Blocked", "Recovered", "Alerts", "DoS", "Injection", "Malware", "Other", "Generated", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {filtered.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs border font-semibold ${TYPE_STYLE(r.reportType)}`}>
                            {r.reportType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-200 font-semibold">{r.totalIncidents}</td>
                        <td className="px-4 py-3 text-sm text-red-300">{r.blocked}</td>
                        <td className="px-4 py-3 text-sm text-emerald-300">{r.recovered}</td>
                        <td className="px-4 py-3 text-sm text-amber-300">{r.alerts}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{r.attackBreakdown?.DoS ?? 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{r.attackBreakdown?.Injection ?? 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{r.attackBreakdown?.Malware ?? 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{r.attackBreakdown?.Other ?? 0}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(r.generatedAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setView(r)}
                              className="flex items-center gap-1 bg-cyan-600/80 hover:bg-cyan-600 text-white px-2.5 py-1.5 rounded-lg text-xs transition-all">
                              <Eye className="w-3 h-3" /> View
                            </button>
                            <button onClick={() => exportPDF(r._id)}
                              className="flex items-center gap-1 bg-red-700/80 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-lg text-xs transition-all">
                              <Download className="w-3 h-3" /> PDF
                            </button>
                            <button onClick={() => exportExcel(r._id)}
                              className="flex items-center gap-1 bg-emerald-700/80 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs transition-all">
                              <FileSpreadsheet className="w-3 h-3" /> Excel
                            </button>
                            <button onClick={() => deleteReport(r._id)}
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
        )}

        {/* ── AUDIT TRAIL TAB ── */}
        {activeTab === "audit" && (
          <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-gray-700/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-700/60">
              <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
                Audit Trail
                <span className="ml-2 text-slate-500 font-normal normal-case">({auditLogs.length} entries)</span>
              </h2>
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-center py-16">
                <ClipboardList className="w-14 h-14 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No audit logs yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900/70 border-b border-gray-700/70">
                    <tr>
                      {["Action", "Performed By", "Details", "Target ID", "Time"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-full text-xs border font-semibold bg-purple-500/15 text-purple-300 border-purple-500/40">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-200">{log.performedBy}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-[220px] truncate" title={log.details}>{log.details}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.targetId || "—"}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

          {/* ── ATTACK CLASSIFICATION ── */}
        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-slate-700/70 p-5">
          <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Attack Classification
            <span className="text-slate-500 font-normal normal-case ml-1">({classification.total} total)</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(classification.breakdown || {}).map(([cat, count]) => {
              const pct = classification.total > 0 ? Math.round((count / classification.total) * 100) : 0;
              return (
                <div key={cat} className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-200">{cat}</span>
                    <span className="text-xs text-gray-400">{count}</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${CAT_COLOR[cat] || "bg-slate-500"} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── DETAIL MODAL ── */}
      {view && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" /> Report Detail
              </h2>
              <button onClick={() => setView(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Report Type",     value: view.reportType },
                { label: "Total Incidents", value: view.totalIncidents },
                { label: "Blocked",         value: view.blocked },
                { label: "Recovered",       value: view.recovered },
                { label: "Alerts",          value: view.alerts },
                { label: "Generated At",    value: new Date(view.generatedAt).toLocaleString() },
              ].map((f, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">{f.label}</p>
                  <p className="text-sm font-semibold text-gray-100">{f.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-3 mb-4">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Attack Breakdown</p>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(view.attackBreakdown || {}).map(([cat, count]) => (
                  <div key={cat} className="text-center">
                    <p className="text-lg font-bold text-gray-100">{count}</p>
                    <p className="text-xs text-gray-400">{cat}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => exportPDF(view._id)}
                className="flex-1 flex items-center justify-center gap-2 bg-red-700/80 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm transition-all">
                <Download className="w-4 h-4" /> Export PDF
              </button>
              <button onClick={() => exportExcel(view._id)}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-700/80 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm transition-all">
                <FileSpreadsheet className="w-4 h-4" /> Export Excel
              </button>
              <button onClick={() => deleteReport(view._id)}
                className="px-4 bg-slate-700/80 hover:bg-slate-700 text-white py-2.5 rounded-xl text-sm transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}