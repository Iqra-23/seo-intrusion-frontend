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

const SOCKET_URL = (
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:4000"
).replace(/\/api$/, "");

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
  const [exporting, setExporting] = useState(false);

  const [widgetConfig, setWidgetConfig] = useState(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("seo_dashboard_widgets")
        : null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      showTraffic: true,
      showTimeline: true,
      showVuln: true,
      showAlerts: true,
    };
  });

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

      setLogStats(logsRes.data);
      setTrafficStats(trafficRes.data);
      setVulnStats(vulnRes.data);

      const arr = alertsRes.data?.alerts || alertsRes.data || [];
      setRecentAlerts(arr.slice(0, 8));
      setRecentScans(scansRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("new-alert", (p) => {
      setRecentAlerts((prev) => {
        const exists = prev.some((a) => a._id === p.id || a.id === p.id);
        if (exists) return prev;
        const n = {
          _id: p.id,
          severity: p.severity,
          title: p.title,
          description: p.description,
          createdAt: p.createdAt,
        };
        return [n, ...prev].slice(0, 8);
      });

      toast.info("New alert received");
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "seo_dashboard_widgets",
        JSON.stringify(widgetConfig)
      );
    }
  }, [widgetConfig]);

  const toggleWidget = (key) =>
    setWidgetConfig((prev) => ({ ...prev, [key]: !prev[key] }));

  const attackTimelineData = useMemo(() => {
    if (!trafficStats?.recentSpikes) return [];
    const m = new Map();

    trafficStats.recentSpikes.forEach((item) => {
      const ts = new Date(item.createdAt);
      if (Number.isNaN(ts.getTime())) return;

      const key = `${ts
        .getHours()
        .toString()
        .padStart(2, "0")}:${Math.floor(ts.getMinutes() / 5)
        .toString()
        .padStart(2, "0")}`;

      m.set(key, (m.get(key) || 0) + 1);
    });

    return [...m.entries()]
      .map(([time, spikes]) => ({ time, spikes }))
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

  const handleExportReport = async () => {
    try {
      setExporting(true);
      const r = await api.get("/dashboard/export", { responseType: "blob" });
      const blob = new Blob([r.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "seo-security-dashboard-report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Report downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed export");
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

  return (
    <div className="dashboard-root min-h-screen bg-gradient-to-br from-black via-slate-950 to-slate-900 text-gray-100 overflow-x-hidden">
      <div className="w-full max-w-screen-xl mx-auto px-3 sm:px-4 lg:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="inline-flex items-center gap-3 px-3 py-2 rounded-2xl bg-slate-950/80 border border-cyan-500/30 shadow">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/30 via-purple-500/40 to-fuchsia-500/20 border border-cyan-400/50">
              <LayoutDashboard className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-cyan-300/80">
                SEO Intrusion Detector
              </p>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-300 via-sky-400 to-purple-400 bg-clip-text text-transparent">
                Dashboard
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs bg-slate-900/80 border border-slate-700 hover:border-cyan-500 transition-colors"
            >
              <Activity className="w-4 h-4" />
              Refresh Data
            </button>

            <button
              onClick={handleExportReport}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-500 text-white shadow disabled:opacity-60 transition-opacity"
            >
              <Download className="w-4 h-4" />
              {exporting ? "Exporting..." : "Export PDF"}
            </button>
          </div>
        </div>

        {/* Metric cards */}
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
            label="Traffic"
            value={trafficStats?.total ?? 0}
            chip={`${trafficStats?.uniqueIps || 0} unique IPs`}
            gradient="from-purple-500/30 via-indigo-500/40 to-cyan-500/20"
            border="border-purple-500/40"
          />
          <MetricCard
            icon={<AlertOctagon className="w-4 h-4" />}
            label="Open Vulns"
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
            chip="Live updates"
            gradient="from-emerald-500/30 via-cyan-500/40 to-sky-500/20"
            border="border-emerald-500/40"
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left column */}
          <div className="space-y-4">
            <HudPanel
              logStats={logStats}
              trafficStats={trafficStats}
              vulnStats={vulnStats}
              alertsCount={recentAlerts.length}
            />

            {widgetConfig.showVuln && (
              <PanelShell
                icon={<AlertTriangle className="w-4 h-4 text-red-300" />}
                title="Vulnerability Posture"
                subtitle="Distribution by severity"
                accent="from-red-500/30 via-amber-400/30 to-emerald-500/20"
              >
                <div className="flex items-center gap-4 h-52">
                  <div className="w-1/2 h-full">
                    {vulnSeverityData.length ? (
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
                            {vulnSeverityData.map((entry, i) => (
                              <Cell
                                key={entry.name}
                                fill={
                                  SEVERITY_COLORS[entry.name] ||
                                  PIE_COLORS[i % PIE_COLORS.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#020617",
                              borderRadius: 8,
                              border:
                                "1px solid rgba(148,163,184,0.4)",
                              fontSize: 12,
                            }}
                            labelStyle={{ color: "#e5e7eb" }}
                          />
                          <Legend
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
                  </div>
                </div>
              </PanelShell>
            )}

            {widgetConfig.showTraffic && (
              <PanelShell
                icon={<LineChart className="w-4 h-4 text-cyan-300" />}
                title="Traffic Overview"
                subtitle="Requests and methods"
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
                            stroke="#1e293b"
                            strokeDasharray="3 3"
                          />
                          <XAxis
                            dataKey="label"
                            tick={{
                              fill: "#9ca3af",
                              fontSize: 11,
                            }}
                          />
                          <YAxis
                            tick={{
                              fill: "#9ca3af",
                              fontSize: 11,
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#020617",
                              borderRadius: 8,
                              border:
                                "1px solid rgba(148,163,184,0.4)",
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
                    {trafficByMethodData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trafficByMethodData}>
                          <CartesianGrid
                            stroke="#1e293b"
                            strokeDasharray="3 3"
                          />
                          <XAxis
                            dataKey="method"
                            tick={{
                              fill: "#9ca3af",
                              fontSize: 11,
                            }}
                          />
                          <YAxis
                            tick={{
                              fill: "#9ca3af",
                              fontSize: 11,
                            }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#020617",
                              borderRadius: 8,
                              border:
                                "1px solid rgba(148,163,184,0.4)",
                              fontSize: 12,
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="#38bdf8"
                            radius={[6, 6, 0, 0]}
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

          {/* Right column */}
          <div className="lg:col-span-2 space-y-4">
            <AlertStreamPanel alerts={recentAlerts} />

            {widgetConfig.showTimeline && (
              <PanelShell
                icon={<Radar className="w-4 h-4 text-amber-300" />}
                title="Attack Timeline"
                subtitle="Spike events"
                accent="from-amber-400/30 via-orange-500/30 to-rose-500/30"
              >
                <div className="h-64">
                  {attackTimelineData.length ? (
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
                          stroke="#1f2937"
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey="time"
                          tick={{
                            fill: "#9ca3af",
                            fontSize: 11,
                          }}
                        />
                        <YAxis
                          tick={{
                            fill: "#9ca3af",
                            fontSize: 11,
                          }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#020617",
                            borderRadius: 8,
                            border:
                              "1px solid rgba(148,163,184,0.4)",
                            fontSize: 12,
                          }}
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
                    <EmptyChartMessage message="No recent spike events." />
                  )}
                </div>
              </PanelShell>
            )}

            {widgetConfig.showAlerts && (
              <PanelShell
                icon={<Shield className="w-4 h-4 text-cyan-300" />}
                title="Recent Scans"
                subtitle="Scanner history"
                accent="from-cyan-500/30 via-blue-500/30 to-slate-700/30"
              >
                <div className="space-y-2 max-h-52 overflow-y-auto custom-scroll">
                  {!recentScans.length ? (
                    <p className="text-xs text-slate-500">
                      No scan history yet.
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
                              ? new Date(
                                  scan.startedAt
                                ).toLocaleString()
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

            {/* Widget toggles */}
            <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/80 via-slate-900/80 to-slate-950/80 px-4 py-3 text-[11px] text-slate-300 space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-3 h-3 text-cyan-300" />
                <span className="uppercase tracking-[0.2em] text-slate-400">
                  Widget Layout
                </span>
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

/* ---------- helper components ---------- */

function MetricCard({ icon, label, value, chip, gradient, border }) {
  return (
    <div className="relative group">
      <div className={`relative overflow-hidden rounded-2xl bg-slate-950/90 border ${border} shadow`}>
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        <div className="relative z-10 px-4 py-4 flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {label}
            </p>
            <p className="text-2xl font-semibold text-slate-50">
              {value ?? 0}
            </p>
            {chip && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-cyan-300 flex-shrink-0" />
                <span className="truncate">{chip}</span>
              </p>
            )}
          </div>
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/80 flex-shrink-0">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelShell({ icon, title, subtitle, accent, children }) {
  return (
    <div className="relative rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950/90 via-slate-900/90 to-slate-950/90 shadow overflow-hidden">
      <div
        className={`pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-gradient-to-br ${accent} blur-3xl opacity-40`}
      />
      <div className="relative z-10 px-4 pt-3 pb-1 flex items-center gap-3 border-b border-slate-800/80">
        <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80 flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-100 truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-[11px] text-slate-400 truncate">
              {subtitle}
            </p>
          )}
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
        {message || "Not enough data"}
      </p>
    </div>
  );
}

function SeverityChip({ label, value, color }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800/80">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
        <span className="text-[11px] text-slate-300 truncate">
          {label}
        </span>
      </div>
      <span className="text-[11px] text-slate-100 font-medium flex-shrink-0 ml-2">
        {value}
      </span>
    </div>
  );
}

function AlertStreamPanel({ alerts }) {
  return (
    <div className="relative rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 shadow overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800/90">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/90 flex-shrink-0">
              <Bell className="w-4 h-4 text-rose-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">
                Live Alerts Stream
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                Real-time alerts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] flex-shrink-0">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
            <span className="text-slate-500">{alerts.length} active</span>
          </div>
        </div>

        <div className="px-5 pb-4 pt-3 space-y-2 max-h-72 overflow-y-auto custom-scroll">
          {!alerts.length ? (
            <p className="text-xs text-slate-500">No active alerts.</p>
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
  const c = alert.createdAt ? new Date(alert.createdAt) : null;
  const timeStr = c ? c.toLocaleTimeString() : "";
  const dateStr = c ? c.toLocaleDateString() : "";
  const sev = (alert.severity || "").toLowerCase();

  const colorMap = {
    critical: "bg-red-500",
    high: "bg-orange-400",
    medium: "bg-amber-300",
    low: "bg-emerald-400",
  };

  const stripe = colorMap[sev] || "bg-slate-500";

  return (
    <div className="group relative flex gap-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 px-3 py-2 shadow">
      <div className="flex flex-col justify-center flex-shrink-0">
        <span className={`w-1.5 h-full rounded-full ${stripe}`} />
      </div>

      <div className="flex-1 space-y-0.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-100 truncate flex-1">
            {alert.title || "Security Alert"}
          </p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border bg-slate-800 text-slate-300 flex-shrink-0">
            <AlertTriangle className="w-3 h-3" />
            {alert.severity?.toUpperCase()}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 line-clamp-2">
          {alert.description || "-"}
        </p>
        {c && (
          <p className="text-[10px] text-slate-500 truncate">
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
  const threatScore =
    openVulns * 6 +
    alertsCount * 4 +
    (vulnStats?.severity?.critical ?? 0) * 10;

  let label = "STABLE";
  let ring = "border-cyan-400";
  let glow = "shadow-[0_0_50px_rgba(34,211,238,0.4)]";

  if (threatScore > 35) {
    label = "ACTIVE";
    ring = "border-amber-400";
    glow = "shadow-[0_0_55px_rgba(251,191,36,0.45)]";
  }
  if (threatScore > 70) {
    label = "CRITICAL";
    ring = "border-red-500";
    glow = "shadow-[0_0_60px_rgba(239,68,68,0.6)]";
  }

  return (
    <div className="relative rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow overflow-hidden">
      <div className="relative flex justify-center my-6">
        <div
          className={`relative w-48 h-48 rounded-full border-2 ${ring} ${glow} transition-all duration-500`}
        >
          <div className="absolute inset-3 rounded-full border border-slate-700" />
          <div className="absolute inset-8 rounded-full bg-cyan-500/10 blur-2xl" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/80">
              Threat Level
            </p>
            <p className="text-xl font-semibold text-slate-50">{label}</p>
            <p className="text-[11px] text-slate-400">
              {alertsCount} Alerts • {openVulns} Vulns
            </p>
          </div>
        </div>
      </div>

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
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1 rounded-md bg-slate-900/80 border border-slate-700/80 flex-shrink-0">
          {icon}
        </div>
        <span className="text-[11px] text-slate-300 truncate">
          {label}
        </span>
      </div>
      <span className="text-xs font-semibold text-cyan-300 flex-shrink-0 ml-2">
        {value ?? 0}
      </span>
    </div>
  );
}

function WidgetToggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition-colors">
      <span className="text-[11px] text-slate-200 truncate">{label}</span>
      <span className="relative inline-flex items-center flex-shrink-0">
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
