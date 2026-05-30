import { useEffect, useState } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import {
  Brain,
  ShieldAlert,
  Activity,
  AlertTriangle,
  Ban,
  Search,
  Trash2,
  ShieldCheck,
  Eye,
  X,
  Mail,
  Filter,
  Gauge,
  Lock,
  Download,
  FileDown,
} from "lucide-react";

const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:4000").replace(/\/api$/, "");

export default function ThreatDetection() {
  const [threats, setThreats] = useState([]);
  const [lists, setLists] = useState([]);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    blocked: 0,
    monitored: 0,
    blacklisted: 0,
    whitelisted: 0,
  });

  const fetchThreats = async () => {
    try {
      const res = await api.get("/threats");
      setThreats(res.data || []);
    } catch {
      toast.error("Failed to load AI threats");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/threats/stats");
      setStats((prev) => ({ ...prev, ...(res.data || {}) }));
    } catch {
      toast.error("Failed to load threat stats");
    }
  };

  const fetchLists = async () => {
    try {
      const res = await api.get("/threats/ip-list");
      setLists(res.data || []);
    } catch {
      toast.error("Failed to load IP list");
    }
  };

  const refreshAll = () => {
    fetchThreats();
    fetchStats();
    fetchLists();
  };

  useEffect(() => {
    refreshAll();

    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("threat-alert", (data) => {
      toast.error(`AI blocked IP ${data.ip} due to ${data.attackType}`);
      setThreats((prev) => [data, ...prev]);
      fetchStats();
      fetchLists();
    });

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getIpListStatus = (ip) => {
    const found = lists.find((item) => item.ip === ip);

    if (!found) {
      return {
        status: "Not Listed",
        listType: "none",
        reason: "No record exists in blacklist/whitelist collection.",
        createdAt: "-",
      };
    }

    return {
      status: found.listType === "blacklist" ? "Blacklisted" : "Whitelisted",
      listType: found.listType,
      reason: found.reason || "No reason stored",
      createdAt: found.createdAt
        ? new Date(found.createdAt).toLocaleString()
        : "-",
    };
  };

  const deleteIp = async (id) => {
    try {
      await api.delete(`/threats/ip-list/${id}`);
      toast.success("IP removed / unblocked");
      refreshAll();
    } catch {
      toast.error("Failed to remove IP");
    }
  };

  const deleteOneThreat = async (id) => {
    try {
      await api.delete(`/threats/${id}`);
      toast.success("Threat deleted");
      setThreats((prev) => prev.filter((t) => t._id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      fetchStats();
    } catch {
      toast.error("Failed to delete threat");
    }
  };

  const bulkDeleteThreats = async () => {
    if (selectedIds.length === 0) {
      toast.info("Select threats first");
      return;
    }

    try {
      await api.delete("/threats/bulk", {
        data: { ids: selectedIds },
      });

      toast.success("Selected threats deleted");
      setThreats((prev) => prev.filter((t) => !selectedIds.includes(t._id)));
      setSelectedIds([]);
      fetchStats();
    } catch {
      toast.error("Failed to delete selected threats");
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === threats.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(threats.map((t) => t._id));
    }
  };

  const downloadBlob = (blob, fileName) => {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadOverallPdf = async () => {
    try {
      const res = await api.get("/threats/export", {
        responseType: "blob",
      });
      downloadBlob(res.data, "ai-threat-analysis-report.pdf");
    } catch {
      toast.error("Failed to download overall PDF");
    }
  };

  const downloadSinglePdf = async (threat) => {
    try {
      const res = await api.get(`/threats/export/${threat._id}`, {
        responseType: "blob",
      });
      downloadBlob(res.data, `threat-${threat.ip || "record"}.pdf`);
    } catch {
      toast.error("Failed to download single PDF");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <Brain className="w-7 h-7 text-cyan-400" />
              
              Threat Detection
            </h1>
            {/* <p className="text-gray-400 mt-1 text-sm">
              AI analyzes incoming traffic, filters suspicious requests, blocks malicious IPs and generates analysis reports.
            </p> */}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadOverallPdf}
              className="flex items-center gap-2 bg-slate-800/70 text-gray-200 px-4 py-2 rounded-xl border border-cyan-500/40 hover:text-cyan-300 transition-all"
            >
              <FileDown className="w-4 h-4" />
              Export PDF
            </button>

            <button
              onClick={bulkDeleteThreats}
              className="flex items-center gap-2 bg-red-600/80 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card title="Total Threats" value={stats.total || 0} icon={<Activity />} />
          <Card title="High Threats" value={stats.high || 0} icon={<ShieldAlert />} />
          <Card title="Blocked Actions" value={stats.blocked || 0} icon={<Ban />} />
          <Card title="Blacklisted IPs" value={stats.blacklisted || 0} icon={<AlertTriangle />} />
        </div>

        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 border border-slate-700/70 rounded-2xl p-5">
          <h2 className="text-xl font-semibold text-cyan-300 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            IP Blacklist / Whitelist for Access Control
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lists.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No blocked or allowed IP records found.
              </p>
            ) : (
              lists.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between bg-slate-950/50 border border-slate-700 rounded-xl p-3"
                >
                  <div>
                    <p className="text-sm text-gray-200 font-semibold">{item.ip}</p>
                    <p
                      className={`text-xs font-semibold ${
                        item.listType === "blacklist"
                          ? "text-red-300"
                          : "text-emerald-300"
                      }`}
                    >
                      {item.listType?.toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.reason || "Automatically managed by AI"}
                    </p>
                  </div>

                  <button
                    onClick={() => deleteIp(item._id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                    title="Remove / unblock"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-gray-700/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700/60 flex justify-between items-center gap-3">
            <div>
              <h2 className="text-xl font-semibold text-cyan-300 flex items-center gap-2">
                <Eye className="w-5 h-5" />
                AI Detected Threats
              </h2>
              {/* <p className="text-sm text-gray-500 mt-1">
                Select threats for bulk delete, or export single IP/threat report.
              </p> */}
            </div>

            {threats.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={selectedIds.length === threats.length}
                  onChange={toggleSelectAll}
                />
                Select All
              </label>
            )}
          </div>

          {threats.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              No AI threat records found
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {threats.map((t) => (
                <div key={t._id} className="p-5 hover:bg-slate-800/30 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(t._id)}
                          onChange={() => toggleSelectOne(t._id)}
                        />

                        <span className="text-sm text-gray-400">IP:</span>
                        <span className="text-sm font-semibold text-gray-100">
                          {t.ip}
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full text-xs border font-semibold ${
                            t.threatLevel === "HIGH"
                              ? "bg-red-500/15 text-red-300 border-red-500/40"
                              : t.threatLevel === "MEDIUM"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                          }`}
                        >
                          {t.threatLevel || "LOW"}
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full text-xs border font-semibold ${
                            t.action === "block"
                              ? "bg-red-500/15 text-red-300 border-red-500/40"
                              : t.action === "monitor"
                              ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                              : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                          }`}
                        >
                          {t.action || "allow"}
                        </span>
                      </div>

                      <p className="text-sm text-cyan-300 font-medium">
                        {t.attackType || "normal"}
                      </p>

                      <p className="text-xs text-gray-400 break-all">
                        <span className="text-gray-500">URL:</span>{" "}
                        {t.url || "-"}
                      </p>

                      <p className="text-xs text-gray-400">
                        <span className="text-gray-500">Reason:</span>{" "}
                        {t.reason || "AI analyzed this request"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedThreat(t)}
                        className="p-2 rounded-xl bg-slate-950/70 border border-slate-700 text-gray-300 hover:text-cyan-300 hover:border-cyan-500 transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => downloadSinglePdf(t)}
                        className="p-2 rounded-xl bg-slate-950/70 border border-slate-700 text-gray-300 hover:text-purple-300 hover:border-purple-500 transition-all"
                        title="Download Single PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => deleteOneThreat(t._id)}
                        className="p-2 rounded-xl bg-slate-950/70 border border-slate-700 text-gray-300 hover:text-red-300 hover:border-red-500 transition-all"
                        title="Delete Threat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <FeatureBox icon={<ShieldCheck />} title="IP Blacklist / Whitelist" text="Access control is applied using blacklisted and whitelisted IPs." />
          <FeatureBox icon={<Filter />} title="Packet Filtering" text="Incoming traffic is filtered using stored request data and AI classification." />
          <FeatureBox icon={<Lock />} title="Auto Blocking" text="Malicious IPs are automatically blocked after detected threats." />
          <FeatureBox icon={<Gauge />} title="Rate Limiting" text="Suspicious high-frequency traffic and SEO spam behavior are detected." />
          <FeatureBox icon={<Mail />} title="Email Alerts" text="Blocked IPs trigger email and in-app alert notifications." />
        </div>
      </div>

      {selectedThreat && (
        <ThreatDetailsModal
          threat={selectedThreat}
          ipStatus={getIpListStatus(selectedThreat.ip)}
          onClose={() => setSelectedThreat(null)}
        />
      )}
    </div>
  );
}

function ThreatDetailsModal({ threat, ipStatus, onClose }) {
  const emailTriggered = threat.action === "block" || threat.threatLevel === "HIGH";
  const packetFiltered = threat.attackType && threat.attackType !== "normal";
  const rateLimited = threat.attackType === "rate-limit" || Number(threat.requestCount || 0) >= 30;
  const autoBlocked = threat.action === "block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-cyan-300">Threat Detail View</h2>
            <p className="text-sm text-gray-500">
              Actual stored record details mapped to the five Threat Detection features.
            </p>
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-red-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SmallInfo title="IP Address" value={threat.ip || "-"} />
            <SmallInfo title="Threat Type" value={threat.attackType || "normal"} />
            <SmallInfo title="Action" value={threat.action || "allow"} />
          </div>

          <div className="bg-slate-950/50 border border-slate-700 rounded-2xl p-4">
            <p className="text-sm text-gray-500 mb-1">Request URL</p>
            <p className="text-sm text-gray-200 break-all">{threat.url || "-"}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailFeature
              icon={<ShieldCheck />}
              title="1. IP Blacklisting / Whitelisting"
              rows={[
                ["IP Status", ipStatus.status],
                ["List Type", ipStatus.listType],
                ["Stored Reason", ipStatus.reason],
                ["Added At", ipStatus.createdAt],
              ]}
            />

            <DetailFeature
              icon={<Filter />}
              title="2. Rule-Based Packet Filtering"
              rows={[
                ["Filtered", packetFiltered ? "Yes" : "No"],
                ["Attack Type", threat.attackType || "normal"],
                ["HTTP Method", threat.method || "-"],
                ["URL", threat.url || "-"],
              ]}
            />

            <DetailFeature
              icon={<Lock />}
              title="3. Automatic Blocking of Malicious IPs"
              rows={[
                ["Auto Blocked", autoBlocked ? "Yes" : "No"],
                ["Action", threat.action || "allow"],
                ["Threat Level", threat.threatLevel || "LOW"],
                ["Block Reason", threat.reason || "-"],
              ]}
            />

            <DetailFeature
              icon={<Gauge />}
              title="4. Rate Limiting / SEO Spamming"
              rows={[
                ["Rate Limited", rateLimited ? "Yes" : "No"],
                ["Request Count", threat.requestCount ?? 0],
                ["Failed Attempts", threat.failedAttempts ?? 0],
                ["Detected Type", threat.attackType || "-"],
              ]}
            />

            <DetailFeature
              icon={<Mail />}
              title="5. Email Alerts for Blocked IPs"
              rows={[
                ["Email Triggered", emailTriggered ? "Yes" : "No"],
                ["Alert Condition", emailTriggered ? "Blocked or HIGH threat" : "Low/allowed traffic"],
                ["In-App Alert", emailTriggered ? "Triggered" : "Not triggered"],
                ["Recipient", "Admin email from backend configuration"],
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, icon }) {
  return (
    <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 border border-slate-700/70 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-cyan-300 mt-1">{value}</p>
        </div>
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/70 text-cyan-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

function FeatureBox({ icon, title, text }) {
  return (
    <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl p-5 border border-slate-700/70">
      <div className="w-7 h-7 text-cyan-400 mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-200 mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

function SmallInfo({ title, value }) {
  return (
    <div className="bg-slate-950/50 border border-slate-700 rounded-xl p-4">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-sm text-cyan-300 font-semibold mt-1">{value}</p>
    </div>
  );
}

function DetailFeature({ icon, title, rows }) {
  return (
    <div className="bg-slate-950/50 border border-slate-700 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-cyan-400 w-5 h-5">{icon}</div>
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
      </div>

      <div className="space-y-2">
        {rows.map(([label, value], index) => (
          <div
            key={index}
            className="flex justify-between gap-4 border-b border-slate-800 pb-2 last:border-b-0"
          >
            <span className="text-xs text-gray-500">{label}</span>
            <span className="text-xs text-cyan-300 text-right break-all">
              {String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}