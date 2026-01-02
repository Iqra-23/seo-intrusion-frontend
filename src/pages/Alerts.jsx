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

      const data = Array.isArray(res.data)
        ? res.data
        : res.data?.alerts || [];

      const prevIds = new Set(previousAlertsRef.current.map((a) => a._id));
      const newOnes = data.filter((a) => !prevIds.has(a._id));

      setAlerts(data);
      previousAlertsRef.current = data;

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

  useEffect(() => {
    fetchAlerts("initial");

    const interval = setInterval(() => {
      if (autoRefreshing) {
        fetchAlerts("auto");
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [autoRefreshing]);

  // ====== CLIENT-SIDE FILTERING ======
  const visibleAlerts = useMemo(() => {
    return alerts
      .filter((a) => {
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

        if (dateFrom) {
          const from = new Date(dateFrom + "T00:00:00");
          if (created < from) return false;
        }
        if (dateTo) {
          const to = new Date(dateTo + "T23:59:59");
          if (created > to) return false;
        }

        const minutes = created.getHours() * 60 + created.getMinutes();
        if (timeFrom) {
          const [fh, fm] = timeFrom.split(":").map(Number);
          if (minutes < fh * 60 + fm) return false;
        }
        if (timeTo) {
          const [th, tm] = timeTo.split(":").map(Number);
          if (minutes > th * 60 + tm) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [alerts, search, dateFrom, dateTo, timeFrom, timeTo]);

  // ====== SEVERITY COUNTS ======
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
    fetchAlerts("filters");
  };

  const handleManualRefresh = () => {
    markInteraction();
    fetchAlerts("manual");
  };

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

  /* JSX RENDER CONTINUES EXACTLY AS YOU PASTED:
     HEADER, CARDS, FILTERS, TABLE, SeverityCard COMPONENT
     (NO CHANGE, SAME AS YOUR LAST MESSAGE)
  */
}
