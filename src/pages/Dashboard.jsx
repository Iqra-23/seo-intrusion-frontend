// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import "../styles/dashboard.css";

import {
  Shield,
  Activity,
  AlertTriangle,
  Bell,
  Globe2,
  ArrowUpRight,
  Download,
  LineChart,
  AlertOctagon,
  Radar,
  LayoutDashboard,
  Cpu,
  ServerCrash,
} from "lucide-react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// 🔹 Same socket base style as Alerts.jsx
const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000"
).replace(/\/api$/, "");

// Colors for charts
const SEVERITY_COLORS = {
  Critical: "#f97373",
  High: "#fb923c",
  Medium: "#facc15",
  Low: "#22c55e",
};

const PIE_COLORS = ["#f97373", "#fb923c", "#facc15", "#22c55e"];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  const [logStats, setLogStats] = useState(null);
  const [trafficStats, setTrafficStats] = useState(null);
  const [vulnStats, setVulnStats] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [recentScans, setRecentScans] = useState([]);

  const [widgetConfig, setWidgetConfig] = useState(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("seo_dashboard_widgets")
        : null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {
          showTraffic: true,
          showTimeline: true,
          showVuln: true,
          showAlerts: true,
        };
      }
    }
    return {
      showTraffic: true,
      showTimeline: true,
      showVuln: true,
      showAlerts: true,
    };
  });

  const [exporting, setExporting] = useState(false);

  // ====== FETCH DATA FROM EXISTING MODULE APIs ======
  const fetchAll = async () => {
    try {
      setLoading(true);
      const [logsRes, trafficRes, vulnRes, alertsRes, scansRes] =
        await Promise.all([
          api.get("/logs/stats"),
          api.get("/traffic/stats"),
          api.get("/vulnerabilities/stats"),
          api.get("/logs/alerts", {
            params: { severity: "all", acknowledged: "false" },
          }),
          api.get("/vulnerabilities/scans"),
        ]);

      setLogStats(logsRes.data || null);
      setTrafficStats(trafficRes.data || null);
      setVulnStats(vulnRes.data || null);

      const alertsArray = alertsRes.data?.alerts || alertsRes.data || [];
      setRecentAlerts(alertsArray.slice(0, 8));

      setRecentScans(scansRes.data || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ====== REAL-TIME ALERT SOCKET ======
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("⚡ Dashboard socket connected");
    });

    socket.on("new-alert", (payload) => {
      setRecentAlerts((prev) => {
        const exists = prev.some(
          (a) => a._id === payload.id || a.id === payload.id
        );
        if (exists) return prev;

        const normalized = {
          _id: payload.id,
          severity: payload.severity,
          title: payload.title,
          description: payload.description,
          createdAt: payload.createdAt,
        };
        return [normalized, ...prev].slice(0, 8);
      });

      const label =
        payload.severity === "critical" || payload.severity === "high"
          ? "New HIGH-RISK security alert"
          : "New security alert";

      toast.info(`${label} received in Dashboard`, {
        icon: <Bell />,
        autoClose: 5000,
      });
    });

    socket.on("disconnect", () => {
      console.log("⚠️ Dashboard socket disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ====== WIDGET CONFIG PERSISTENCE ======
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "seo_dashboard_widgets",
        JSON.stringify(widgetConfig)
      );
    }
  }, [widgetConfig]);

  const toggleWidget = (key) => {
    setWidgetConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ====== TRANSFORM DATA FOR CHARTS ======

  const attackTimelineData = useMemo(() => {
    if (!trafficStats?.recentSpikes) return [];
    const buckets = new Map();
    trafficStats.recentSpikes.forEach((item) => {
      const ts = new Date(item.createdAt);
      if (Number.isNaN(ts.getTime())) return;
      const key = `${ts.getHours().toString().padStart(2, "0")}:${Math.floor(
        ts.getMinutes() / 5
      )
        .toString()
        .padStart(2, "0")}`;
      const existing = buckets.get(key) || 0;
      buckets.set(key, existing + 1);
    });

    return Array.from(buckets.entries())
      .map(([time, count]) => ({ time, spikes: count }))
      .sort((a, b) => (a.time > b.time ? 1 : -1));
  }, [trafficStats]);

  const trafficByMethodData = useMemo(() => {
    if (!trafficStats?.byMethod) return [];
    return trafficStats.byMethod.map((m) => ({
      method: m._id,
      count: m.count,
    }));
  }, [trafficStats]);

  const vulnSeverityData = useMemo(() => {
    if (!vulnStats?.severity) return [];
    return [
      { name: "Critical", value: vulnStats.severity.critical || 0 },
      { name: "High", value: vulnStats.severity.high || 0 },
      { name: "Medium", value: vulnStats.severity.medium || 0 },
      { name: "Low", value: vulnStats.severity.low || 0 },
    ].filter((x) => x.value > 0);
  }, [vulnStats]);

  // ====== EXPORT DASHBOARD REPORT (PDF) ======
  const handleExportReport = async () => {
    try {
      setExporting(true);
      const res = await api.get("/dashboard/export", {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `seo-security-dashboard-report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Dashboard report downloaded (PDF)");
    } catch (err) {
      console.error("Dashboard export error:", err);
      toast.error("Failed to export dashboard report");
    } finally {
      setExporting(false);
    }
  };

  // ====== LOADING STATE ======
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-950 to-slate-900 text-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ========= HEADER ========= */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
           
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/30 via-purple-500/40 to-fuchsia-500/20 border border-cyan-400/50">
                <LayoutDashboard className="w-5 h-5 text-cyan-300" />
              </div>
             <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-300 via-sky-400 to-purple-400 bg-clip-text text-transparent">
                  Dashboard
                </h1>
           
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm bg-slate-900/80 border border-slate-700 hover:border-cyan-500/70 hover:text-cyan-200 transition-all"
            >
              <Activity className="w-4 h-4" />
              Refresh Data
            </button>

            <button
              onClick={handleExportReport}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-500 text-white shadow-lg shadow-cyan-500/30 hover:from-cyan-400 hover:via-sky-500 hover:to-purple-400 transition-all disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Exporting..." : "Export PDF"}
            </button>
          </div>
        </div>

        {/* ========= TOP METRICS ========= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<ServerCrash className="w-4 h-4" />}
            label="Total Logs"
            value={logStats?.total ?? 0}
            chip={`${logStats?.errors || 0} errors • ${
              logStats?.warnings || 0
            } warnings`}
            gradient="from-cyan-500/30 via-teal-500/40 to-emerald-500/20"
            border="border-cyan-500/40"
          />
          <MetricCard
            icon={<Globe2 className="w-4 h-4" />}
            label="Traffic (Requests)"
            value={trafficStats?.total ?? 0}
            chip={`${trafficStats?.uniqueIps || 0} unique IPs`}
            gradient="from-purple-500/30 via-indigo-500/40 to-cyan-500/20"
            border="border-purple-500/40"
          />
          <MetricCard
            icon={<AlertOctagon className="w-4 h-4" />}
            label="Open Vulnerabilities"
            value={vulnStats?.status?.open ?? 0}
            chip={`${vulnStats?.severity?.critical || 0} critical • ${
              vulnStats?.severity?.high || 0
            } high`}
            gradient="from-rose-500/30 via-orange-500/40 to-amber-400/20"
            border="border-rose-500/40"
          />
          <MetricCard
            icon={<Bell className="w-4 h-4" />}
            label="Active Alerts"
            value={recentAlerts.length}
            chip="Live from real-time engine"
            gradient="from-emerald-500/30 via-cyan-500/40 to-sky-500/20"
            border="border-emerald-500/40"
          />
        </div>

        {/* ========= MAIN LAYOUT (O-2) ========= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* LEFT COLUMN: HUD + widget toggles + Vuln + Traffic */}
          <div className="space-y-4">
            <HudPanel
              logStats={logStats}
              trafficStats={trafficStats}
              vulnStats={vulnStats}
              alertsCount={recentAlerts.length}
            />

            {/* Vulnerability Posture - MOVED BELOW HUD */}
            {widgetConfig.showVuln && (
              <PanelShell
                icon={<AlertTriangle className="w-4 h-4 text-red-300" />}
                title="Vulnerability Posture"
                subtitle="Current distribution by severity"
                accent="from-red-500/30 via-amber-400/30 to-emerald-500/20"
              >
                <div className="flex items-center gap-4 h-52">
                  <div className="w-1/2 h-full">
                    {vulnSeverityData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={vulnSeverityData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            innerRadius={40}
                            paddingAngle={3}
                          >
                            {vulnSeverityData.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={
                                  SEVERITY_COLORS[entry.name] ||
                                  PIE_COLORS[index % PIE_COLORS.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#020617",
                              borderRadius: 8,
                              border: "1px solid rgba(148,163,184,0.4)",
                              fontSize: 12,
                            }}
                            labelStyle={{ color: "#e5e7eb" }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={32}
                            wrapperStyle={{
                              fontSize: 11,
                              color: "#9ca3af",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChartMessage small />
                    )}
                  </div>
                  <div className="flex-1 space-y-2 text-xs">
                    <SeverityChip
                      label="Critical"
                      value={vulnStats?.severity?.critical || 0}
                      color="bg-red-500"
                    />
                    <SeverityChip
                      label="High"
                      value={vulnStats?.severity?.high || 0}
                      color="bg-orange-500"
                    />
                    <SeverityChip
                      label="Medium"
                      value={vulnStats?.severity?.medium || 0}
                      color="bg-amber-400"
                    />
                    <SeverityChip
                      label="Low"
                      value={vulnStats?.severity?.low || 0}
                      color="bg-emerald-400"
                    />
                    <div className="pt-1 text-[11px] text-slate-400 flex items-center gap-1">
                      <Cpu className="w-3 h-3" />
                      Based on latest scan results.
                    </div>
                  </div>
                </div>
              </PanelShell>
            )}

            {/* Traffic Overview - MOVED BELOW HUD */}
            {widgetConfig.showTraffic && (
              <PanelShell
                icon={<LineChart className="w-4 h-4 text-cyan-300" />}
                title="Traffic Overview"
                subtitle="Total requests, unique IPs and HTTP methods"
                accent="from-cyan-500/30 via-sky-500/30 to-purple-500/30"
              >
                <div className="grid grid-cols-1 gap-3 h-64">
                  <div className="h-32">
                    {trafficStats ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={[
                            {
                              label: "Now",
                              requests: trafficStats.total || 0,
                              uniqueIps: trafficStats.uniqueIps || 0,
                            },
                          ]}
                        >
                          <defs>
                            <linearGradient
                              id="trafficRequests"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#22d3ee"
                                stopOpacity={0.8}
                              />
                              <stop
                                offset="95%"
                                stopColor="#22d3ee"
                                stopOpacity={0.1}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1e293b"
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fill: "#9ca3af", fontSize: 11 }}
                          />
                          <YAxis
                            tick={{ fill: "#9ca3af", fontSize: 11 }}
                            tickFormatter={(v) =>
                              v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v
                            }
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#020617",
                              borderRadius: 8,
                              border: "1px solid rgba(148,163,184,0.4)",
                              fontSize: 12,
                            }}
                            labelStyle={{ color: "#e5e7eb" }}
                          />
                          <Area
                            type="monotone"
                            dataKey="requests"
                            stroke="#22d3ee"
                            fill="url(#trafficRequests)"
                            strokeWidth={2}
                            name="Total Requests"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChartMessage small />
                    )}
                  </div>

                  <div className="h-24">
                    {trafficByMethodData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trafficByMethodData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#1e293b"
                          />
                          <XAxis
                            dataKey="method"
                            tick={{ fill: "#9ca3af", fontSize: 11 }}
                          />
                          <YAxis
                            tick={{ fill: "#9ca3af", fontSize: 11 }}
                            tickFormatter={(v) =>
                              v >= 1000 ? `${v / 1000}k` : v
                            }
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#020617",
                              borderRadius: 8,
                              border: "1px solid rgba(148,163,184,0.4)",
                              fontSize: 12,
                            }}
                            labelStyle={{ color: "#e5e7eb" }}
                          />
                          <Bar
                            dataKey="count"
                            name="Requests"
                            radius={[6, 6, 0, 0]}
                            fill="#38bdf8"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChartMessage small />
                    )}
                  </div>
                </div>
              </PanelShell>
            )}
          </div>

          {/* RIGHT COLUMN: Alerts + Timeline + Scans */}
          <div className="lg:col-span-2 space-y-4">
            <AlertStreamPanel alerts={recentAlerts} />

            {widgetConfig.showTimeline && (
              <PanelShell
                icon={<Radar className="w-4 h-4 text-amber-300" />}
                title="Attack Timeline"
                subtitle="Recent spike events (5-minute buckets)"
                accent="from-amber-400/30 via-orange-500/30 to-rose-500/30"
              >
                <div className="h-64">
                  {attackTimelineData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={attackTimelineData}>
                        <defs>
                          <linearGradient
                            id="attackSpikes"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#f97316"
                              stopOpacity={0.9}
                            />
                            <stop
                              offset="95%"
                              stopColor="#f97316"
                              stopOpacity={0.1}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#1f2937"
                        />
                        <XAxis
                          dataKey="time"
                          tick={{ fill: "#9ca3af", fontSize: 11 }}
                        />
                        <YAxis
                          tick={{ fill: "#9ca3af", fontSize: 11 }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#020617",
                            borderRadius: 8,
                            border: "1px solid rgba(148,163,184,0.4)",
                            fontSize: 12,
                          }}
                          labelStyle={{ color: "#e5e7eb" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="spikes"
                          stroke="#fb923c"
                          fill="url(#attackSpikes)"
                          strokeWidth={2}
                          name="Spike Events"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyChartMessage message="No recent spike events detected yet." />
                  )}
                </div>
              </PanelShell>
            )}

            {widgetConfig.showAlerts && (
              <PanelShell
                icon={<Shield className="w-4 h-4 text-cyan-300" />}
                title="Recent Scans"
                subtitle="History from vulnerability scanner"
                accent="from-cyan-500/30 via-blue-500/30 to-slate-700/30"
              >
                <div className="space-y-2 max-h-52 overflow-y-auto custom-scroll">
                  {recentScans.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No scan history yet. Start a scan from the Vulnerability
                      module.
                    </p>
                  ) : (
                    recentScans.slice(0, 6).map((scan) => (
                      <div
                        key={scan._id || scan.scanId}
                        className="flex justify-between items-center text-xs px-2 py-2 rounded-lg bg-slate-900/70 border border-slate-800/80"
                      >
                        <div className="space-y-0.5">
                          <p className="text-slate-100 truncate max-w-[170px]">
                            {scan.siteUrl}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {scan.status} •{" "}
                            {scan.startedAt
                              ? new Date(scan.startedAt).toLocaleString()
                              : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] text-cyan-300">
                            {scan.totalVulnerabilities ?? "-"} vulns
                            <ArrowUpRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PanelShell>
            )}

            {/* Widget Layout - MOVED BELOW RECENT SCANS */}
            <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-slate-950/80 px-4 py-3 text-[11px] text-slate-300 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3 h-3 text-cyan-300" />
                  <span className="uppercase tracking-[0.2em] text-slate-400">
                    Widget Layout
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <WidgetToggle
                  label="Traffic"
                  checked={widgetConfig.showTraffic}
                  onChange={() => toggleWidget("showTraffic")}
                />
                <WidgetToggle
                  label="Timeline"
                  checked={widgetConfig.showTimeline}
                  onChange={() => toggleWidget("showTimeline")}
                />
                <WidgetToggle
                  label="Vulnerabilities"
                  checked={widgetConfig.showVuln}
                  onChange={() => toggleWidget("showVuln")}
                />
                <WidgetToggle
                  label="Scan History"
                  checked={widgetConfig.showAlerts}
                  onChange={() => toggleWidget("showAlerts")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========= SMALL COMPONENTS ========= */

function MetricCard({ icon, label, value, chip, gradient, border }) {
  return (
    <div className="relative group">
      <div
        className={`relative overflow-hidden rounded-2xl bg-slate-950/90 border ${border} shadow-[0_0_40px_rgba(15,23,42,0.9)]`}
      >
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
        />
        <div className="relative z-10 px-4 py-4 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {label}
            </p>
            <p className="text-2xl font-semibold text-slate-50">
              {value ?? 0}
            </p>
            {chip && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-cyan-300" />
                {chip}
              </p>
            )}
          </div>
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/80 group-hover:border-cyan-400/70 group-hover:shadow-[0_0_24px_rgba(34,211,238,0.35)] transition-all">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelShell({ icon, title, subtitle, accent, children }) {
  return (
    <div className="relative rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 shadow-[0_0_40px_rgba(15,23,42,0.9)] overflow-hidden">
      <div
        className={`pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-gradient-to-br ${accent} blur-3xl opacity-40`}
      />
      <div className="relative z-10 px-4 pt-3 pb-1 flex items-center justify-between gap-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80">
            {icon}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-100 flex items-center gap-1">
              {title}
            </p>
            {subtitle && (
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
      <div className="relative z-10 px-4 pb-4 pt-3">{children}</div>
    </div>
  );
}

function EmptyChartMessage({ small, message }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        small ? "h-full" : "h-full"
      }`}
    >
      <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 mb-2">
        <ServerCrash className="w-4 h-4 text-slate-500" />
      </div>
      <p className="text-[11px] text-slate-400">
        {message || "Not enough data to draw this chart yet."}
      </p>
    </div>
  );
}

function SeverityChip({ label, value, color }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800/80">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-[11px] text-slate-300">{label}</span>
      </div>
      <span className="text-[11px] text-slate-100 font-medium">{value}</span>
    </div>
  );
}

function AlertStreamPanel({ alerts }) {
  return (
    <div className="relative rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 shadow-[0_0_55px_rgba(15,23,42,1)] overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800/90">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/90">
              <Bell className="w-4 h-4 text-rose-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">
                Live Alerts Stream
              </p>
              <p className="text-[11px] text-slate-400">
                Real-time alerts from log engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
            <span className="text-slate-500">
              {alerts.length} active alert{alerts.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="px-5 pb-4 pt-3 space-y-2 max-h-72 overflow-y-auto custom-scroll">
          {alerts.length === 0 ? (
            <p className="text-xs text-slate-500">
              No active alerts. System is quiet for now.
            </p>
          ) : (
            alerts.map((alert) => (
              <AlertRow key={alert._id || alert.id} alert={alert} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AlertRow({ alert }) {
  const created = alert.createdAt ? new Date(alert.createdAt) : null;
  const timeStr = created ? created.toLocaleTimeString() : "";
  const dateStr = created ? created.toLocaleDateString() : "";

  const sev = (alert.severity || "").toLowerCase();

  let stripeColor = "bg-slate-500";
  let badgeClass =
    "bg-slate-900/80 text-slate-300 border-slate-600/60 text-[10px]";

  if (sev === "critical") {
    stripeColor = "bg-red-500";
    badgeClass = "bg-red-500/15 text-red-200 border-red-500/60 text-[10px]";
  } else if (sev === "high") {
    stripeColor = "bg-orange-400";
    badgeClass =
      "bg-orange-500/15 text-orange-200 border-orange-500/60 text-[10px]";
  } else if (sev === "medium") {
    stripeColor = "bg-amber-300";
    badgeClass =
      "bg-amber-500/15 text-amber-200 border-amber-500/60 text-[10px]";
  } else if (sev === "low") {
    stripeColor = "bg-emerald-400";
    badgeClass =
      "bg-emerald-500/15 text-emerald-200 border-emerald-500/60 text-[10px]";
  }

  return (
    <div className="group relative flex gap-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 px-3 py-2 shadow-sm hover:border-cyan-500/60 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] transition-all">
      <div className="flex flex-col justify-center">
        <span
          className={`w-1.5 rounded-full ${stripeColor} hud-alert-stripe`}
        />
      </div>

      <div className="flex-1 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-100 truncate">
            {alert.title || "Security Alert"}
          </p>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${badgeClass}`}
          >
            <AlertTriangle className="w-3 h-3" />
            {alert.severity ? alert.severity.toUpperCase() : "UNKNOWN"}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 line-clamp-2">
          {alert.description || "-"}
        </p>
        {created && (
          <p className="text-[10px] text-slate-500">
            {dateStr} • {timeStr}
          </p>
        )}
      </div>
    </div>
  );
}

function HudPanel({ logStats, trafficStats, vulnStats, alertsCount }) {
  const logs = logStats?.total ?? 0;
  const traffic = trafficStats?.total ?? 0;
  const openVulns = vulnStats?.status?.open ?? 0;

  // Threat level calculation (simple readable logic)
  const threatScore =
    (openVulns * 6) + 
    (alertsCount * 4) + 
    (vulnStats?.severity?.critical ?? 0) * 10;

  let threatLabel = "STABLE";
  let ringColor = "border-cyan-400";
  let glowColor = "shadow-[0_0_50px_rgba(34,211,238,0.4)]";

  if (threatScore > 35) {
    threatLabel = "ACTIVE";
    ringColor = "border-amber-400";
    glowColor = "shadow-[0_0_55px_rgba(251,191,36,0.45)]";
  }
  if (threatScore > 70) {
    threatLabel = "CRITICAL";
    ringColor = "border-red-500";
    glowColor = "shadow-[0_0_60px_rgba(239,68,68,0.6)]";
  }

  return (
    <div className="relative rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-[0_0_60px_rgba(8,47,73,0.8)] overflow-hidden">

      {/* HUD Grid Lines */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none hud-grid"></div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/80">
            Security Operations Hub
          </p>
          <p className="text-sm text-slate-300">
            Live posture across logs, traffic & vulnerabilities
          </p>
        </div>

        <div className="p-2 rounded-xl bg-slate-950/80 border border-cyan-500/40">
          <Shield className="w-5 h-5 text-cyan-300" />
        </div>
      </div>

      {/* HUD Circle */}
      <div className="relative flex justify-center items-center my-6">
        <div className={`relative w-48 h-48 rounded-full border-2 ${ringColor} ${glowColor} animate-slow-spin`}>
          
          {/* Orbit rings */}
          <div className="absolute inset-3 rounded-full border border-slate-700 hud-dashed-ring"></div>
          <div className="absolute inset-6 rounded-full border border-cyan-400/30"></div>

          {/* Inner glow */}
          <div className="absolute inset-8 rounded-full bg-cyan-500/10 blur-2xl"></div>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/80">
              Threat Level
            </p>
            <p className="text-xl font-semibold text-slate-50">
              {threatLabel}
            </p>
            <p className="text-[11px] text-slate-400">
              {alertsCount} Alerts • {openVulns} Open Vulns
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <HudChip
          label="Logs Ingested"
          value={logs}
          icon={<ServerCrash className="w-3 h-3" />}
        />
        <HudChip
          label="Traffic Requests"
          value={traffic}
          icon={<Globe2 className="w-3 h-3" />}
        />
        <HudChip
          label="Open Vulns"
          value={openVulns}
          icon={<AlertOctagon className="w-3 h-3" />}
        />
        <HudChip
          label="Active Alerts"
          value={alertsCount}
          icon={<Bell className="w-3 h-3" />}
        />
      </div>
    </div>
  );
}


function HudChip({ label, value, icon }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
      <div className="flex items-center gap-2">
        <div className="p-1 rounded-md bg-slate-900/80 border border-slate-700/80">
          {icon}
        </div>
        <span className="text-[11px] text-slate-300">{label}</span>
      </div>
      <span className="text-xs font-semibold text-cyan-300">{value ?? 0}</span>
    </div>
  );
}

function WidgetToggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 cursor-pointer hover:border-cyan-500/50 transition-colors">
      <span className="text-[11px] text-slate-200">{label}</span>
      <span className="relative inline-flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <span
          className={`w-7 h-3.5 rounded-full transition-colors ${
            checked ? "bg-cyan-500/60" : "bg-slate-700"
          }`}
        />
        <span
          className={`absolute left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
            checked ? "translate-x-3.5" : "translate-x-0"
          }`}
        />
      </span>
    </label>
  );
}