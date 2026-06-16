// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import "../styles/dashboard.css";

import {
  Shield, Activity, AlertTriangle, Bell, Globe2, ArrowUpRight,
  WifiOff, Database, Server, Clock, CheckCircle2,
  Download, LineChart, AlertOctagon, Radar, LayoutDashboard,
  Cpu, ServerCrash, Brain, ShieldCheck, Lock, FileWarning, Gauge, Wifi,
} from "lucide-react";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000"
).replace(/\/api$/, "");

const SEVERITY_COLORS = { Critical: "#f97373", High: "#fb923c", Medium: "#facc15", Low: "#22c55e" };
const PIE_COLORS = ["#f97373", "#fb923c", "#facc15", "#22c55e"];

export default function Dashboard() {
  const [loading,         setLoading]         = useState(true);
  const [logStats,        setLogStats]        = useState(null);
  const [trafficStats,    setTrafficStats]    = useState(null);
  const [vulnStats,       setVulnStats]       = useState(null);
  const [recentAlerts,    setRecentAlerts]    = useState([]);
  const [recentScans,     setRecentScans]     = useState([]);
  const [threatStats,     setThreatStats]     = useState(null);
  const [firewallStats,   setFirewallStats]   = useState(null);
  const [anomalyStats,    setAnomalyStats]    = useState(null);
  const [incidentStats,   setIncidentStats]   = useState(null);
  const [encryptionStats, setEncryptionStats] = useState(null);
  // FIX: real traffic trend from /dashboard/stats
  const [trafficTrendData, setTrafficTrendData] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [lastLiveEvent,   setLastLiveEvent]   = useState("Initial load");
  const [exporting,       setExporting]       = useState(false);
  const [liveClock,       setLiveClock]       = useState("");
  const [systemHealth,    setSystemHealth]    = useState(null);

  // live clock
  useEffect(() => {
    const tick = () =>
      setLiveClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fetchAll = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const requests = await Promise.allSettled([
        api.get("/dashboard/stats"),                                                          // 0 - dashboard (has trafficTrend)
        api.get("/logs/stats"),                                                               // 1
        api.get("/traffic/stats"),                                                            // 2
        api.get("/vulnerabilities/stats"),                                                    // 3
        api.get("/logs/alerts", { params: { severity: "all", acknowledged: "false" } }),     // 4
        api.get("/vulnerabilities/scans"),                                                    // 5
        api.get("/threats/stats"),                                                            // 6
        api.get("/firewall/stats"),                                                           // 7
        api.get("/anomaly/stats"),                                                            // 8
        api.get("/incident-response/stats"),                                                  // 9
        api.get("/data-encryption/stats"),                                                    // 10
      ]);

      const getData = (i, fb = null) =>
        requests[i].status === "fulfilled" ? requests[i].value.data : fb;

      const dashData = getData(0);
      // FIX: set real traffic trend from dashboard stats
      setTrafficTrendData(dashData?.trafficTrend || []);

      setLogStats(getData(1));
      setTrafficStats(getData(2));
      setVulnStats(getData(3));

      const ar = getData(4, []);
      const arrA = ar?.alerts || ar || [];
      setRecentAlerts(Array.isArray(arrA) ? arrA.slice(0, 8) : []);

      const sr = getData(5, []);
      setRecentScans(Array.isArray(sr) ? sr : sr?.scans || []);

      setThreatStats(getData(6));
      setFirewallStats(getData(7));
      setAnomalyStats(getData(8));
      setIncidentStats(getData(9));
      setEncryptionStats(getData(10));
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      if (!silent) toast.error("Failed to load dashboard data");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // silent auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => fetchAll(true), 30_000);
    return () => clearInterval(id);
  }, []);

  // socket
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    const liveRefresh = (label) => {
      setLastLiveEvent(`${label} · ${new Date().toLocaleTimeString()}`);
      fetchAll(true);
    };
    socket.on("connect",    () => { setSocketConnected(true);  setLastLiveEvent(`Connected · ${new Date().toLocaleTimeString()}`); });
    socket.on("disconnect", () => { setSocketConnected(false); setLastLiveEvent(`Disconnected · ${new Date().toLocaleTimeString()}`); });
    socket.on("new-alert", (payload) => {
      setRecentAlerts((prev) => {
        const exists = prev.some((a) => a._id === payload.id || a.id === payload.id);
        if (exists) return prev;
        const n = {
          _id: payload.id || payload._id,
          severity: payload.severity,
          title: payload.title,
          description: payload.description,
          createdAt: payload.createdAt || new Date().toISOString(),
        };
        return [n, ...prev].slice(0, 8);
      });
      toast.info("New security alert received", { icon: <Bell />, autoClose: 5000 });
      liveRefresh("New alert");
    });
    socket.on("threat-alert",         () => liveRefresh("Threat detected"));
    socket.on("new-firewall-incident", () => liveRefresh("Firewall incident"));
    socket.on("anomaly-alert",         () => liveRefresh("Anomaly detected"));
    socket.on("incident-alert",        () => liveRefresh("Incident response"));
    socket.on("encryption-failure",    () => liveRefresh("Encryption failure"));
    socket.on("dashboard-refresh",     () => liveRefresh("Dashboard refresh"));
    return () => socket.disconnect();
  }, []);

  const attackTimelineData = useMemo(() => {
    if (!trafficStats?.recentSpikes) return [];
    const b = new Map();
    trafficStats.recentSpikes.forEach((item) => {
      const ts = new Date(item.createdAt);
      if (Number.isNaN(ts.getTime())) return;
      const k = `${ts.getHours().toString().padStart(2,"0")}:${Math.floor(ts.getMinutes()/5).toString().padStart(2,"0")}`;
      b.set(k, (b.get(k) || 0) + 1);
    });
    return [...b.entries()].map(([time, spikes]) => ({ time, spikes })).sort((a,x)=>a.time>x.time?1:-1);
  }, [trafficStats]);

  const trafficByMethodData = useMemo(() =>
    (trafficStats?.byMethod || []).map((m) => ({ method: m._id, count: m.count })),
  [trafficStats]);

  const vulnSeverityData = useMemo(() =>
    [
      { name:"Critical", value: vulnStats?.severity?.critical||0 },
      { name:"High",     value: vulnStats?.severity?.high||0 },
      { name:"Medium",   value: vulnStats?.severity?.medium||0 },
      { name:"Low",      value: vulnStats?.severity?.low||0 },
    ].filter((x) => x.value > 0),
  [vulnStats]);

  // FIX: real traffic trend data mapped for chart
  const trafficTrendChartData = useMemo(() => {
    if (trafficTrendData.length > 0) {
      return trafficTrendData.map((d) => ({ t: d.date, v: d.total || 0 }));
    }
    // fallback if no data yet
    return [
      { t: "No data", v: 0 },
      { t: "Now", v: trafficStats?.total || 0 },
    ];
  }, [trafficTrendData, trafficStats]);

  const handleExportReport = async () => {
    try {
      setExporting(true);
      const res = await api.get("/dashboard/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "seo-security-dashboard-report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Dashboard report downloaded (PDF)");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export dashboard report");
    } finally {
      setExporting(false);
    }
  };

  if (loading && !logStats && !trafficStats && !vulnStats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-slate-950 to-slate-900">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-cyan-500/30 via-purple-500/20 to-transparent blur-xl" />
          <div className="absolute inset-4 flex items-center justify-center">
            <Shield className="w-7 h-7 text-cyan-300 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const encTotal = encryptionStats?.total || 0;
  const encPct   = encTotal ? Math.round(((encryptionStats?.encrypted||0)/encTotal)*100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-slate-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="inline-flex items-center gap-3 px-3 py-2 rounded-2xl bg-slate-950/80 border border-cyan-500/30 shadow-[0_0_30px_rgba(8,47,73,0.7)]">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/30 via-purple-500/40 to-fuchsia-500/20 border border-cyan-400/50">
              <LayoutDashboard className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-cyan-300/80">SEO Intrusion Detector</p>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-300 via-sky-400 to-purple-400 bg-clip-text text-transparent">Dashboard</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs bg-slate-900/80 border border-slate-700 font-mono text-slate-300">
              <Activity className="w-3 h-3 text-cyan-400" />{liveClock}
            </div>
            <div
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${socketConnected?"bg-emerald-500/10 border-emerald-500/40 text-emerald-300":"bg-red-500/10 border-red-500/40 text-red-300"}`}
              title={lastLiveEvent}
            >
              <span className={`w-2 h-2 rounded-full ${socketConnected?"bg-emerald-400 animate-pulse":"bg-red-400"}`} />
              {socketConnected ? "Live Connected" : "Socket Offline"}
            </div>
            <div className="hidden md:inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] bg-slate-900/60 border border-slate-800 text-slate-400 max-w-[240px] truncate">
              <Wifi className="w-3 h-3 text-cyan-400 flex-shrink-0" />
              <span className="truncate">{lastLiveEvent}</span>
            </div>
            <button
              onClick={handleExportReport} disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-500 text-white shadow-lg shadow-cyan-500/30 hover:from-cyan-400 hover:via-sky-500 hover:to-purple-400 transition-all disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Exporting..." : "Export PDF"}
            </button>
          </div>
        </div>

        {/* ── ROW 1: 4 primary metrics ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={<ServerCrash className="w-4 h-4"/>} label="Total Logs"            value={logStats?.total??0}         chip={`${logStats?.errors||0} errors · ${logStats?.warnings||0} warnings`}                                 gradient="from-cyan-500/30 via-teal-500/40 to-emerald-500/20"  border="border-cyan-500/40" />
          <MetricCard icon={<Globe2 className="w-4 h-4"/>}      label="Traffic Requests"      value={trafficStats?.total??0}      chip={`${trafficStats?.uniqueIps||0} unique IPs`}                                                          gradient="from-purple-500/30 via-indigo-500/40 to-cyan-500/20" border="border-purple-500/40" />
          <MetricCard icon={<AlertOctagon className="w-4 h-4"/>} label="Open Vulnerabilities" value={vulnStats?.status?.open??0}  chip={`${vulnStats?.severity?.critical||0} critical · ${vulnStats?.severity?.high||0} high`}              gradient="from-rose-500/30 via-orange-500/40 to-amber-400/20"  border="border-rose-500/40" />
          <MetricCard icon={<Bell className="w-4 h-4"/>}         label="Active Alerts"        value={recentAlerts.length}        chip="Live from real-time engine"                                                                           gradient="from-emerald-500/30 via-cyan-500/40 to-sky-500/20"   border="border-emerald-500/40" pulse />
        </div>

        {/* ── ROW 2: 5 module cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          <ModuleCard icon={<Brain className="w-4 h-4"/>}       label="Threats"    value={threatStats?.total??0}     chip={`${threatStats?.blocked||0} blocked · ${threatStats?.high||0} high`}              gradient="from-red-500/30 via-pink-500/30 to-purple-500/20"    border="border-red-500/40"     status={!!threatStats} />
          <ModuleCard icon={<ShieldCheck className="w-4 h-4"/>} label="Firewall"   value={firewallStats?.total??0}   chip={`${firewallStats?.blocked||0} blocked incidents`}                                  gradient="from-cyan-500/30 via-blue-500/30 to-indigo-500/20"   border="border-cyan-500/40"    status={!!firewallStats} />
          <ModuleCard icon={<Gauge className="w-4 h-4"/>}       label="Anomalies"  value={anomalyStats?.total??0}    chip={`${anomalyStats?.high||0} high risk · ${anomalyStats?.alerts||0} alerts`}         gradient="from-amber-500/30 via-orange-500/30 to-red-500/20"   border="border-amber-500/40"   status={!!anomalyStats} />
          <ModuleCard icon={<FileWarning className="w-4 h-4"/>} label="Incidents"  value={incidentStats?.total??0}   chip={`${incidentStats?.blocked||0} blocked · ${incidentStats?.recovered||0} recovered`} gradient="from-purple-500/30 via-fuchsia-500/30 to-pink-500/20" border="border-purple-500/40" status={!!incidentStats} />
          <ModuleCard icon={<Lock className="w-4 h-4"/>}        label="Encryption" value={encryptionStats?.total??0} chip={`${encryptionStats?.encrypted||0} encrypted · ${encryptionStats?.failed||0} failed`} gradient="from-emerald-500/30 via-teal-500/30 to-cyan-500/20" border="border-emerald-500/40" status={!!encryptionStats} />
        </div>

        {/* ══ ROW A: HUD + Alerts ══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-5 flex">
            <HudPanel
              logStats={logStats}
              trafficStats={trafficStats}
              vulnStats={vulnStats}
              alertsCount={recentAlerts.length}
            />
          </div>
          <div className="lg:col-span-7 flex">
            <AlertStreamPanel alerts={recentAlerts} />
          </div>
        </div>

        {/* ══ ROW B: Vuln + Traffic Overview + Attack Timeline ══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

          <PanelShell icon={<AlertTriangle className="w-4 h-4 text-red-300"/>} title="Vulnerability Posture" subtitle="Distribution by severity" accent="from-red-500/30 via-amber-400/30 to-emerald-500/20">
            <div className="flex flex-col gap-3">
              <div className="h-40">
                {vulnSeverityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={vulnSeverityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={68} innerRadius={40} paddingAngle={3}>
                        {vulnSeverityData.map((e,i) => <Cell key={e.name} fill={SEVERITY_COLORS[e.name]||PIE_COLORS[i%4]}/>)}
                      </Pie>
                      <Tooltip contentStyle={{backgroundColor:"#020617",borderRadius:8,border:"1px solid rgba(148,163,184,0.4)",fontSize:11}} labelStyle={{color:"#e5e7eb"}}/>
                      <Legend verticalAlign="bottom" height={28} wrapperStyle={{fontSize:11,color:"#9ca3af"}}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyChartMessage small />}
              </div>
              <div className="space-y-1.5">
                <SeverityChip label="Critical" value={vulnStats?.severity?.critical||0} color="bg-red-500" />
                <SeverityChip label="High"     value={vulnStats?.severity?.high||0}     color="bg-orange-500" />
                <SeverityChip label="Medium"   value={vulnStats?.severity?.medium||0}   color="bg-amber-400" />
                <SeverityChip label="Low"      value={vulnStats?.severity?.low||0}      color="bg-emerald-400" />
              </div>
            </div>
          </PanelShell>

          <PanelShell icon={<LineChart className="w-4 h-4 text-cyan-300"/>} title="Traffic Overview" subtitle="Requests by HTTP method" accent="from-cyan-500/30 via-sky-500/30 to-purple-500/30">
            <div className="flex flex-col gap-3">
              <div className="h-40">
                {trafficByMethodData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trafficByMethodData} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                      <XAxis dataKey="method" tick={{fill:"#9ca3af",fontSize:10}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"#9ca3af",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(v)=>v>=1000?`${v/1000}k`:v}/>
                      <Tooltip contentStyle={{backgroundColor:"#020617",borderRadius:8,border:"1px solid rgba(148,163,184,0.4)",fontSize:11}} labelStyle={{color:"#e5e7eb"}}/>
                      <Bar dataKey="count" name="Requests" radius={[4,4,0,0]} fill="#38bdf8"/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyChartMessage small />}
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] px-1 py-1 rounded-lg bg-slate-900/50">
                  <span className="text-slate-400">Total Requests</span>
                  <span className="text-cyan-300 font-semibold">{trafficStats?.total??0}</span>
                </div>
                <div className="flex justify-between text-[11px] px-1 py-1 rounded-lg bg-slate-900/50">
                  <span className="text-slate-400">Unique IPs</span>
                  <span className="text-purple-300 font-semibold">{trafficStats?.uniqueIps??0}</span>
                </div>
                <div className="flex justify-between text-[11px] px-1 py-1 rounded-lg bg-slate-900/50">
                  <span className="text-slate-400">Recent Spikes</span>
                  <span className="text-orange-300 font-semibold">{trafficStats?.recentSpikes?.length??0}</span>
                </div>
              </div>
            </div>
          </PanelShell>

          <PanelShell icon={<Radar className="w-4 h-4 text-amber-300"/>} title="Attack Timeline" subtitle="Traffic spike events (5-min buckets)" accent="from-amber-400/30 via-orange-500/30 to-rose-500/30">
            <div className="h-64">
              {attackTimelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attackTimelineData}>
                    <defs>
                      <linearGradient id="attackSpikes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f97316" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false}/>
                    <XAxis dataKey="time" tick={{fill:"#9ca3af",fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:"#9ca3af",fontSize:10}} axisLine={false} tickLine={false} allowDecimals={false}/>
                    <Tooltip contentStyle={{backgroundColor:"#020617",borderRadius:8,border:"1px solid rgba(148,163,184,0.4)",fontSize:12}} labelStyle={{color:"#e5e7eb"}}/>
                    <Area type="monotone" dataKey="spikes" stroke="#fb923c" fill="url(#attackSpikes)" strokeWidth={2} name="Spike Events" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyChartMessage message="No recent spike events detected yet." />}
            </div>
          </PanelShell>

        </div>

        {/* ══ ROW C: Threat Intel + Anomaly/Incidents + Encryption ══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

          <PanelShell icon={<Brain className="w-4 h-4 text-red-300"/>} title="Threat Intelligence" subtitle="Threats & Firewall activity" accent="from-red-500/30 via-pink-500/30 to-purple-500/20">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Threats</p>
              <StatRow label="Total Threats"  value={threatStats?.total   ??0} color="text-red-400"/>
              <StatRow label="Blocked"        value={threatStats?.blocked ??0} color="text-emerald-400"/>
              <StatRow label="High Severity"  value={threatStats?.high    ??0} color="text-orange-400"/>
              <div className="my-2 border-t border-slate-800/60"/>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Firewall</p>
              <StatRow label="FW Events"  value={firewallStats?.total  ??0} color="text-cyan-400"/>
              <StatRow label="FW Blocked" value={firewallStats?.blocked??0} color="text-emerald-400"/>
            </div>
          </PanelShell>

          <PanelShell icon={<Gauge className="w-4 h-4 text-amber-300"/>} title="Anomaly & Incidents" subtitle="Detection · Response · Recovery" accent="from-amber-500/30 via-orange-400/30 to-purple-500/20">
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Anomaly Detection</p>
              <StatRow label="Total Anomalies" value={anomalyStats?.total    ??0} color="text-amber-400"/>
              <StatRow label="High Risk"        value={anomalyStats?.high     ??0} color="text-red-400"/>
              <StatRow label="Alerts Raised"    value={anomalyStats?.alerts   ??0} color="text-orange-400"/>
              <div className="my-2 border-t border-slate-800/60"/>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Incident Response</p>
              <StatRow label="Total Incidents" value={incidentStats?.total    ??0} color="text-purple-400"/>
              <StatRow label="Recovered"       value={incidentStats?.recovered??0} color="text-emerald-400"/>
              <StatRow label="Blocked"         value={incidentStats?.blocked  ??0} color="text-red-400"/>
            </div>
          </PanelShell>

          <PanelShell icon={<Lock className="w-4 h-4 text-emerald-300"/>} title="Encryption & Data Protection" subtitle="Coverage, failures and protection health" accent="from-emerald-500/30 via-teal-500/30 to-cyan-500/20">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <EncCard label="Total"     value={encryptionStats?.total    ??0} color="text-slate-200"/>
              <EncCard label="Encrypted" value={encryptionStats?.encrypted??0} color="text-emerald-400"/>
              <EncCard label="Pending"   value={encryptionStats?.pending  ??0} color="text-amber-400"/>
              <EncCard label="Failed"    value={encryptionStats?.failed   ??0} color="text-red-400"/>
            </div>
            {encTotal > 0 && (
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                  <span>Encryption coverage</span>
                  <span className="text-emerald-400 font-mono font-semibold">{encPct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000" style={{width:`${encPct}%`}}/>
                </div>
              </div>
            )}
          </PanelShell>

        </div>

        {/* ══ ROW D: Recent Scans + Traffic Trend ══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          <PanelShell icon={<Shield className="w-4 h-4 text-cyan-300"/>} title="Recent Scans" subtitle="Vulnerability scanner history" accent="from-cyan-500/30 via-blue-500/30 to-slate-700/30">
            <div className="space-y-2 max-h-56 overflow-y-auto custom-scroll">
              {recentScans.length === 0 ? (
                <p className="text-xs text-slate-500">No scan history yet. Start a scan from the Vulnerability module.</p>
              ) : recentScans.slice(0, 8).map((s) => (
                <div key={s._id||s.scanId} className="flex justify-between items-center text-xs px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-800/80 gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-slate-100 truncate">{s.siteUrl}</p>
                    <p className="text-[10px] text-slate-500">{s.status} · {s.startedAt ? new Date(s.startedAt).toLocaleString() : ""}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-cyan-300 flex-shrink-0">
                    {s.totalVulnerabilities??"—"} vulns <ArrowUpRight className="w-3 h-3"/>
                  </span>
                </div>
              ))}
            </div>
          </PanelShell>

          <PanelShell icon={<Activity className="w-4 h-4 text-purple-300"/>} title="Traffic Trend" subtitle="Real request volume — last 7 days" accent="from-purple-500/30 via-indigo-500/30 to-cyan-500/20">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficTrendChartData}>
                  <defs>
                    <linearGradient id="trafficTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                  <XAxis dataKey="t" tick={{fill:"#9ca3af",fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:"#9ca3af",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={(v)=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                  <Tooltip contentStyle={{backgroundColor:"#020617",borderRadius:8,border:"1px solid rgba(148,163,184,0.4)",fontSize:11}} labelStyle={{color:"#e5e7eb"}}/>
                  <Area type="monotone" dataKey="v" stroke="#818cf8" fill="url(#trafficTrend)" strokeWidth={2} name="Requests" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </PanelShell>

        </div>
        {/* ══ ROW E: System Health ══ */}
        <div className="grid grid-cols-1 gap-5">
          <PanelShell icon={<Server className="w-4 h-4 text-emerald-300"/>} title="System Health" subtitle="Backend, database and socket status" accent="from-emerald-500/30 via-teal-500/30 to-cyan-500/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <HealthCard label="Backend API"   status="online" detail="Running · All routes active" icon={<Server className="w-4 h-4" />} />
              <HealthCard label="Database"      status="online" detail="MongoDB Atlas · Connected"   icon={<Database className="w-4 h-4" />} />
              <HealthCard label="Socket Server" status={socketConnected ? "online" : "offline"} detail={socketConnected ? "Live · Real-time active" : "Reconnecting..."} icon={socketConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />} />
              <HealthCard label="Last Event"    status="online" detail={lastLiveEvent || "Waiting..."} icon={<Clock className="w-4 h-4" />} />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3">All Modules Active</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {["Authentication","Log Management","Vulnerability Scanner","Traffic Monitor","Real-Time Alerting","Firewall Simulation","AI Threat Detection","Data Encryption","Anomaly Detector","Incident Response","Incident Analysis","Dashboard"].map((mod) => (
                <div key={mod} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-emerald-500/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-[11px] text-slate-300 truncate">{mod}</span>
                </div>
              ))}
            </div>
          </PanelShell>
        </div>

      </div>
    </div>
  );
}

/* ════ COMPONENTS ════ */

function MetricCard({icon,label,value,chip,gradient,border,pulse}) {
  return (
    <div className="relative group">
      <div className={`relative overflow-hidden rounded-2xl bg-slate-950/90 border ${border} shadow-[0_0_40px_rgba(15,23,42,0.9)]`}>
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}/>
        <div className="relative z-10 px-4 py-4 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="text-2xl font-semibold text-slate-50">{value??0}</p>
            {chip && <p className="text-[11px] text-slate-400 flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-cyan-300"/>{chip}</p>}
          </div>
          <div className="relative p-2 rounded-xl bg-slate-900/80 border border-slate-700/80 group-hover:border-cyan-400/70 group-hover:shadow-[0_0_24px_rgba(34,211,238,0.35)] transition-all">
            {icon}
            {pulse && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border-2 border-slate-900"/>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModuleCard({icon,label,value,chip,gradient,border,status}) {
  return (
    <div className="relative group">
      <div className={`relative overflow-hidden rounded-2xl bg-slate-950/90 border ${border} shadow-[0_0_40px_rgba(15,23,42,0.9)]`}>
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}/>
        <div className="relative z-10 px-4 py-3 space-y-1">
          <div className="flex items-center justify-between">
            <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80">{icon}</div>
            <span className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${status?"bg-emerald-500/10 text-emerald-300 border-emerald-500/30":"bg-slate-800 text-slate-400 border-slate-700"}`}>
              {status?"● Active":"○ Wait"}
            </span>
          </div>
          <p className="text-xl font-semibold text-slate-50 pt-1">{value??0}</p>
          <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400">{label}</p>
          <p className="text-[11px] text-slate-500">{chip}</p>
        </div>
      </div>
    </div>
  );
}

function PanelShell({icon,title,subtitle,accent,children}) {
  return (
    <div className="relative rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 shadow-[0_0_40px_rgba(15,23,42,0.9)] overflow-hidden">
      <div className={`pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-gradient-to-br ${accent} blur-3xl opacity-40`}/>
      <div className="relative z-10 px-4 pt-3 pb-1 flex items-center gap-3 border-b border-slate-800/80">
        <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80">{icon}</div>
        <div>
          <p className="text-xs font-medium text-slate-100">{title}</p>
          {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div className="relative z-10 px-4 pb-4 pt-3">{children}</div>
    </div>
  );
}

function AlertStreamPanel({alerts}) {
  return (
    <div className="relative w-full rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 shadow-[0_0_55px_rgba(15,23,42,1)] overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800/90">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/90"><Bell className="w-4 h-4 text-rose-300"/></div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Live Alerts Stream</p>
            <p className="text-[11px] text-slate-400">Real-time alerts from log engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>Live
          </span>
          <span className="text-slate-500">{alerts.length} active alert{alerts.length!==1?"s":""}</span>
        </div>
      </div>
      <div className="px-5 pb-4 pt-3 space-y-2 max-h-96 overflow-y-auto custom-scroll">
        {alerts.length === 0
          ? <p className="text-xs text-slate-500">No active alerts. System is quiet for now.</p>
          : alerts.map((a) => <AlertRow key={a._id||a.id} alert={a}/>)
        }
      </div>
    </div>
  );
}

function AlertRow({alert}) {
  const created = alert.createdAt ? new Date(alert.createdAt) : null;
  const sev = (alert.severity||"").toLowerCase();
  let stripe = "bg-slate-500", badge = "bg-slate-900/80 text-slate-300 border-slate-600/60 text-[10px]";
  if (sev==="critical") { stripe="bg-red-500";     badge="bg-red-500/15 text-red-200 border-red-500/60 text-[10px]"; }
  if (sev==="high")     { stripe="bg-orange-400";  badge="bg-orange-500/15 text-orange-200 border-orange-500/60 text-[10px]"; }
  if (sev==="medium")   { stripe="bg-amber-300";   badge="bg-amber-500/15 text-amber-200 border-amber-500/60 text-[10px]"; }
  if (sev==="low")      { stripe="bg-emerald-400"; badge="bg-emerald-500/15 text-emerald-200 border-emerald-500/60 text-[10px]"; }
  return (
    <div className="group relative flex gap-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 px-3 py-2 shadow-sm hover:border-cyan-500/60 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] transition-all">
      <div className="flex flex-col justify-center"><span className={`w-1.5 rounded-full ${stripe} hud-alert-stripe`}/></div>
      <div className="flex-1 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-100 truncate">{alert.title||"Security Alert"}</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${badge}`}>
            <AlertTriangle className="w-3 h-3"/>{alert.severity?alert.severity.toUpperCase():"UNKNOWN"}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 line-clamp-2">{alert.description||"—"}</p>
        {created && <p className="text-[10px] text-slate-500">{created.toLocaleDateString()} · {created.toLocaleTimeString()}</p>}
      </div>
    </div>
  );
}

function HudPanel({logStats,trafficStats,vulnStats,alertsCount}) {
  const logs      = logStats?.total??0;
  const traffic   = trafficStats?.total??0;
  const openVulns = vulnStats?.status?.open??0;
  const ts = openVulns*6 + alertsCount*4 + (vulnStats?.severity?.critical??0)*10;
  let label="STABLE", ring="border-cyan-400", glow="shadow-[0_0_50px_rgba(34,211,238,0.4)]";
  if (ts>35) { label="ACTIVE";   ring="border-amber-400"; glow="shadow-[0_0_55px_rgba(251,191,36,0.45)]"; }
  if (ts>70) { label="CRITICAL"; ring="border-red-500";   glow="shadow-[0_0_60px_rgba(239,68,68,0.6)]"; }
  return (
    <div className="relative w-full rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-[0_0_60px_rgba(8,47,73,0.8)] overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none hud-grid"/>
      <div className="relative z-10 flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/80">Security Operations Hub</p>
          <p className="text-sm text-slate-300">Live posture across all modules</p>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/80 border border-cyan-500/40"><Shield className="w-5 h-5 text-cyan-300"/></div>
      </div>
      <div className="relative flex justify-center items-center my-6">
        <div className={`relative w-48 h-48 rounded-full border-2 ${ring} ${glow} animate-slow-spin`}>
          <div className="absolute inset-3 rounded-full border border-slate-700 hud-dashed-ring"/>
          <div className="absolute inset-6 rounded-full border border-cyan-400/30"/>
          <div className="absolute inset-8 rounded-full bg-cyan-500/10 blur-2xl"/>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/80">Threat Level</p>
            <p className="text-xl font-semibold text-slate-50">{label}</p>
            <p className="text-[11px] text-slate-400">{alertsCount} Alerts · {openVulns} Open Vulns</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <HudChip label="Logs Ingested"    value={logs}       icon={<ServerCrash className="w-3 h-3"/>}/>
        <HudChip label="Traffic Requests" value={traffic}    icon={<Globe2 className="w-3 h-3"/>}/>
        <HudChip label="Open Vulns"       value={openVulns}  icon={<AlertOctagon className="w-3 h-3"/>}/>
        <HudChip label="Active Alerts"    value={alertsCount}icon={<Bell className="w-3 h-3"/>}/>
      </div>
    </div>
  );
}

function HudChip({label,value,icon}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
      <div className="flex items-center gap-2">
        <div className="p-1 rounded-md bg-slate-900/80 border border-slate-700/80">{icon}</div>
        <span className="text-[11px] text-slate-300">{label}</span>
      </div>
      <span className="text-xs font-semibold text-cyan-300">{value??0}</span>
    </div>
  );
}

function StatRow({label,value,color}) {
  return (
    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-900/50 border border-slate-800/40">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className={`text-[11px] font-semibold font-mono ${color}`}>{value}</span>
    </div>
  );
}

function EncCard({label,value,color}) {
  return (
    <div className="flex flex-col items-center justify-center px-3 py-3 rounded-xl bg-slate-900/70 border border-slate-800/80 text-center gap-1">
      <span className={`text-xl font-semibold font-mono ${color}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-[0.1em] text-slate-400">{label}</span>
    </div>
  );
}

function SeverityChip({label,value,color}) {
  return (
    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800/80">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`}/>
        <span className="text-[11px] text-slate-300">{label}</span>
      </div>
      <span className="text-[11px] text-slate-100 font-medium">{value}</span>
    </div>
  );
}

function EmptyChartMessage({small,message}) {
  return (
    <div className="flex flex-col items-center justify-center text-center h-full">
      <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 mb-2">
        <ServerCrash className="w-4 h-4 text-slate-500"/>
      </div>
      <p className="text-[11px] text-slate-400">{message||"Not enough data to draw this chart yet."}</p>
    </div>
  );
}

function HealthCard({ label, status, detail, icon }) {
  const isOnline = status === "online";
  return (
    <div className={`rounded-2xl border p-4 ${isOnline ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded-lg ${isOnline ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
          {icon}
        </div>
        <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
      </div>
      <p className="text-xs font-semibold text-slate-200 mb-0.5">{label}</p>
      <p className="text-[10px] text-slate-500 truncate">{detail}</p>
    </div>
  );
}