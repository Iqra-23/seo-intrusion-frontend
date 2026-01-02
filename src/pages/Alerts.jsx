// src/pages/Alerts.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import {
  AlertTriangle,
  Bell,
  Trash2,
  Filter,
  Clock,
  Calendar,
  ShieldAlert,
  XCircle,
  Search,
  RefreshCw,
} from "lucide-react";
import { io } from "socket.io-client";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefreshing, setAutoRefreshing] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  // filters
  const [severityFilter, setSeverityFilter] = useState("all");
  const [onlyUnacknowledged, setOnlyUnacknowledged] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");

  // selection
  const [selectedIds, setSelectedIds] = useState([]);

  // refs for "real-time" popup logic
  const lastInteractionRef = useRef(Date.now());
  const previousAlertsRef = useRef([]);

  const markInteraction = () => {
    lastInteractionRef.current = Date.now();
  };

  const isIdle = () => Date.now() - lastInteractionRef.current > 8000; // 8 sec idle

  // ====== SOCKET.IO REAL-TIME LISTENER ======
  useEffect(() => {
    // Backend socket URL (change if needed)
    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("⚡ Alerts socket connected");
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("⚠️ Alerts socket disconnected");
      setSocketConnected(false);
    });

    socket.on("new-alert", (payload) => {
      console.log("📡 Real-time alert received:", payload);
      markInteraction();

      const newAlert = {
        _id: payload.id || payload._id,
        severity: payload.severity || "low",
        title: payload.title || "Security Alert",
        description: payload.description || "",
        createdAt: payload.createdAt || new Date().toISOString(),
        keywords: payload.keywords || [],
      };

      // avoid duplicates
      setAlerts((prev) => {
        if (prev.some((a) => a._id === newAlert._id)) return prev;
        return [newAlert, ...prev];
      });

      const sev = (newAlert.severity || "info").toUpperCase();
      const msg =
        newAlert.title?.length > 80
          ? newAlert.title.slice(0, 77) + "..."
          : newAlert.title;

      toast.warn(`🔔 Live ${sev} alert: ${msg}`, {
        icon: <Bell />,
        autoClose: 6000,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ====== FETCH ALERTS (with source) ======
  const fetchAlerts = async (source = "manual") => {
    try {
      if (source === "initial") setLoading(true);

      const params = {};
      if (severityFilter !== "all") params.severity = severityFilter;
      if (onlyUnacknowledged) params.acknowledged = "false";

      const res = await api.get("/logs/alerts", { params });

      // 🔧 Backend returns { alerts: [...] }, so handle both shapes safely
      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.alerts || [];

      // find newly arrived alerts (for popup)
      const prevIds = new Set(previousAlertsRef.current.map((a) => a._id));
      const newOnes = data.filter((a) => !prevIds.has(a._id));

      setAlerts(data);
      previousAlertsRef.current = data;

      // REAL-TIME popup only on auto poll + idle + new alerts
      if (source === "auto" && isIdle() && newOnes.length > 0) {
        const critical = newOnes.filter((a) => a.severity === "critical").length;
        const high = newOnes.filter((a) => a.severity === "high").length;

        const label =
          critical || high
            ? "High-risk security alerts detected"
            : "New alerts received";

        toast.info(
          `${label}: ${newOnes.length} new alert${
            newOnes.length > 1 ? "s" : ""
          }`,
          {
            icon: <Bell />,
            autoClose: 5000,
          }
        );
      }
    } catch (err) {
      console.error("Get alerts error:", err);
      if (source !== "auto") {
        toast.error("Failed to load alerts");
      }
    } finally {
      if (source === "initial") setLoading(false);
    }
  };

  // Initial load + auto polling (real-time backup)
  useEffect(() => {
    fetchAlerts("initial");

    const interval = setInterval(() => {
      if (autoRefreshing) {
        fetchAlerts("auto");
      }
    }, 15000); // every 15 sec

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefreshing]);

  // ====== CLIENT-SIDE FILTERING (date, time, search) ======
  const visibleAlerts = useMemo(() => {
    return alerts
      .filter((a) => {
        // search filter
        if (search) {
          const text = (
            (a.title || "") +
            " " +
            (a.description || "") +
            " " +
            (a.keywords || []).join(" ")
          )
            .toLowerCase()
            .trim();
          if (!text.includes(search.toLowerCase().trim())) return false;
        }

        const created = new Date(a.createdAt);

        // date range filter
        if (dateFrom) {
          const from = new Date(dateFrom + "T00:00:00");
          if (created < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo + "T23:59:59");
          if (created > to) return false;
        }

        // time-of-day filter
        const minutes = created.getHours() * 60 + created.getMinutes();
        if (timeFrom) {
          const [fh, fm] = timeFrom.split(":").map(Number);
          const minFrom = fh * 60 + fm;
          if (minutes < minFrom) return false;
        }
        if (timeTo) {
          const [th, tm] = timeTo.split(":").map(Number);
          const minTo = th * 60 + tm;
          if (minutes > minTo) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [alerts, search, dateFrom, dateTo, timeFrom, timeTo]);

  // severity counts (for cards)
  const severityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    alerts.forEach((a) => {
      if (a.severity && counts[a.severity] !== undefined) {
        counts[a.severity]++;
      }
    });
    return counts;
  }, [alerts]);

  // ====== HELPERS ======
  const getSeverityStyles = (severity) => {
    switch (severity) {
      case "critical":
        return {
          pill: "bg-red-500/15 text-red-400 border-red-500/40",
          dot: "bg-red-500",
        };
      case "high":
        return {
          pill: "bg-orange-500/15 text-orange-400 border-orange-500/40",
          dot: "bg-orange-500",
        };
      case "medium":
        return {
          pill: "bg-amber-500/15 text-amber-300 border-amber-500/40",
          dot: "bg-amber-400",
        };
      case "low":
        return {
          pill: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
          dot: "bg-emerald-400",
        };
      default:
        return {
          pill: "bg-slate-500/20 text-slate-300 border-slate-500/40",
          dot: "bg-slate-400",
        };
    }
  };

  const toggleSelectAll = () => {
    markInteraction();
    if (selectedIds.length === visibleAlerts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleAlerts.map((a) => a._id));
    }
  };

  const toggleSelectOne = (id) => {
    markInteraction();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDeleteOne = async (id) => {
    const confirmDelete = window.confirm("Delete this alert?");
    if (!confirmDelete) return;

    try {
      markInteraction();
      await api.delete(`/logs/alerts/${id}`);
      setAlerts((prev) => prev.filter((a) => a._id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      toast.success("Alert deleted");
    } catch (err) {
      console.error("Delete alert error:", err);
      toast.error("Failed to delete alert");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.info("No alerts selected");
      return;
    }

    const confirmDelete = window.confirm(
      `Delete ${selectedIds.length} selected alert(s)?`
    );
    if (!confirmDelete) return;

    try {
      markInteraction();
      // backend has only single delete → delete one by one
      await Promise.all(
        selectedIds.map((id) => api.delete(`/logs/alerts/${id}`))
      );
      setAlerts((prev) => prev.filter((a) => !selectedIds.includes(a._id)));
      setSelectedIds([]);
      toast.success("Selected alerts deleted");
    } catch (err) {
      console.error("Bulk delete error:", err);
      toast.error("Failed to delete selected alerts");
    }
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    markInteraction();
    // severity + acknowledged from backend
    fetchAlerts("filters");
  };

  const handleManualRefresh = () => {
    markInteraction();
    fetchAlerts("manual");
  };

  // ====== LOADING STATE ======
  if (loading && alerts.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-2xl bg-red-500/15 border border-red-500/40">
                <ShieldAlert className="w-6 h-6 text-red-400" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-amber-300 bg-clip-text text-transparent">
                Real-Time Alerts
              </h1>
            </div>
            <p className="text-gray-400 text-sm">
              Email + in-app alerts categorized by severity with live updates.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Socket status pill */}
            {/* <span
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
                socketConnected
                  ? "bg-emerald-500/10 border-emerald-500/60 text-emerald-300"
                  : "bg-slate-900/80 border-slate-700 text-slate-300"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  socketConnected ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                }`}
              >
              </span>
              {socketConnected ? "Live socket" : "Socket offline"}
            </span> */}

            {/* <button
              onClick={handleManualRefresh}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-gray-200 hover:border-cyan-500 hover:text-cyan-300 transition-all text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button> */}

            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/80 text-white hover:bg-red-700 transition-all text-sm shadow-lg shadow-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>

            {/* <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-600 bg-slate-900 text-cyan-500 focus:ring-2 focus:ring-cyan-500"
                checked={autoRefreshing}
                onChange={(e) => {
                  markInteraction();
                  setAutoRefreshing(e.target.checked);
                }}
              />
              Live polling
            </label> */}
          </div>
        </div>

        {/* SEVERITY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <SeverityCard
            label="Critical"
            value={severityCounts.critical}
            gradient="from-red-500 to-rose-600"
            icon={<AlertTriangle className="w-5 h-5" />}
          />
          <SeverityCard
            label="High"
            value={severityCounts.high}
            gradient="from-orange-500 to-amber-500"
            icon={<Bell className="w-5 h-5" />}
          />
          <SeverityCard
            label="Medium"
            value={severityCounts.medium}
            gradient="from-yellow-400 to-amber-400"
            icon={<Clock className="w-5 h-5" />}
          />
          <SeverityCard
            label="Low"
            value={severityCounts.low}
            gradient="from-emerald-500 to-teal-500"
            icon={<ShieldAlert className="w-5 h-5" />}
          />
        </div>

        {/* FILTERS PANEL */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 rounded-2xl border border-slate-700/70 backdrop-blur-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700">
              <Filter className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-100">
                Filter Alerts
              </h2>
              <p className="text-xs text-gray-400">
                Narrow down alerts by severity, date and time ranges.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleApplyFilters}
            className="grid grid-cols-1 md:grid-cols-4 gap-3"
          >
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  markInteraction();
                  setSearch(e.target.value);
                }}
                placeholder="Search by title, message, keyword..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Severity */}
            <select
              value={severityFilter}
              onChange={(e) => {
                markInteraction();
                setSeverityFilter(e.target.value);
              }}
              className="px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-sm text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Unacknowledged toggle (backend supported if you want later) */}
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={onlyUnacknowledged}
                onChange={(e) => {
                  markInteraction();
                  setOnlyUnacknowledged(e.target.checked);
                }}
                className="w-4 h-4 rounded border-gray-600 bg-slate-900 text-cyan-500 focus:ring-2 focus:ring-cyan-500"
              />
              Show only unacknowledged
            </label>

            {/* Date range */}
            <div className="flex flex-col md:flex-row gap-2 md:col-span-2">
              <div className="flex-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    markInteraction();
                    setDateFrom(e.target.value);
                  }}
                  className="flex-1 px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-xs text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    markInteraction();
                    setDateTo(e.target.value);
                  }}
                  className="flex-1 px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-xs text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

          {/* Time range */}
            <div className="flex flex-col md:flex-row gap-2 md:col-span-2">
              <div className="flex-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <input
                  type="time"
                  value={timeFrom}
                  onChange={(e) => {
                    markInteraction();
                    setTimeFrom(e.target.value);
                  }}
                  className="flex-1 px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-xs text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <input
                  type="time"
                  value={timeTo}
                  onChange={(e) => {
                    markInteraction();
                    setTimeTo(e.target.value);
                  }}
                  className="flex-1 px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-xl text-xs text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Apply button */}
            <div className="flex items-center gap-3 md:col-span-2">
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-cyan-500/20 hover:from-cyan-600 hover:to-blue-700 transition-all"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  markInteraction();
                  setSearch("");
                  setSeverityFilter("all");
                  setOnlyUnacknowledged(false);
                  setDateFrom("");
                  setDateTo("");
                  setTimeFrom("");
                  setTimeTo("");
                }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
              >
                <XCircle className="w-3 h-3" />
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* ALERTS TABLE */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 rounded-2xl border border-slate-700/70 backdrop-blur-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-semibold text-gray-100">
                Alerts Timeline
              </h2>
              <span className="text-xs text-gray-500">
                ({visibleAlerts.length} shown)
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Critical
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                High
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Medium
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Low
              </div>
            </div>
          </div>

          {visibleAlerts.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center">
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/70 mb-3">
                <Bell className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-300 font-medium">
                No alerts found for current filters
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Adjust date / time range or severity to see more alerts.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/80 border-b border-slate-700/70">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={
                          visibleAlerts.length > 0 &&
                          selectedIds.length === visibleAlerts.length
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-600 bg-slate-900 text-cyan-500 focus:ring-2 focus:ring-cyan-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                      Title / Message
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                      Keywords
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {visibleAlerts.map((alert) => {
                    const { pill, dot } = getSeverityStyles(alert.severity);
                    const created = new Date(alert.createdAt);
                    const dateStr = created.toLocaleDateString();
                    const timeStr = created.toLocaleTimeString();

                    return (
                      <tr
                        key={alert._id}
                        className="hover:bg-slate-800/60 transition-colors"
                      >
                        <td className="px-4 py-3 align-top">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(alert._id)}
                            onChange={() => toggleSelectOne(alert._id)}
                            className="w-4 h-4 rounded border-gray-600 bg-slate-900 text-cyan-500 focus:ring-2 focus:ring-cyan-500"
                          />
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-gray-300 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span>{dateStr}</span>
                            <span className="text-[11px] text-gray-500">
                              {timeStr}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="inline-flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${dot} shadow-sm`}
                            ></span>
                            <span
                              className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${pill}`}
                            >
                              {alert.severity
                                ? alert.severity.toUpperCase()
                                : "UNKNOWN"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-gray-100 text-sm font-medium">
                            {alert.title || "Security Alert"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {alert.description || alert.logId?.message || "-"}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-gray-400">
                          {alert.keywords && alert.keywords.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {alert.keywords.map((k, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-[11px]"
                                >
                                  {k}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-500">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <div className="flex justify-end items-center gap-2">
                            {/* Acknowledge / Resolve buttons commented for now */}
                            <button
                              onClick={() => handleDeleteOne(alert._id)}
                              className="p-1.5 rounded-lg bg-red-600/80 text-white hover:bg-red-700 transition-all shadow-md shadow-red-500/30"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SeverityCard({ label, value, gradient, icon }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-800/80 border border-slate-700/70 backdrop-blur-xl p-4 hover:border-slate-500 hover:-translate-y-1 transition-all duration-200">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-15 transition-opacity`}
      ></div>
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-gray-400">{label} Alerts</p>
          <p
            className={`text-2xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}
          >
            {value || 0}
          </p>
        </div>
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/70 text-gray-200 group-hover:border-slate-500">
          {icon}
        </div>
      </div>
    </div>
  );
}
