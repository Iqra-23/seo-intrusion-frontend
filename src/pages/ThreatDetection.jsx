import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import {
  ShieldAlert,
  AlertTriangle,
  Search,
  RefreshCw,
  Activity,
  Globe,
  Siren,
  ShieldCheck,
  Trash2,
  FileDown,
} from "lucide-react";

const API_BASE = "http://localhost:4000/api";
const SOCKET_URL = "http://localhost:4000";

export default function ThreatDetection() {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const fetchThreats = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/threats`);

      if (Array.isArray(res.data)) {
        setThreats(res.data);
      } else if (Array.isArray(res.data.threats)) {
        setThreats(res.data.threats);
      } else if (Array.isArray(res.data.data)) {
        setThreats(res.data.data);
      } else {
        setThreats([]);
      }
    } catch (error) {
      console.error("Threat fetch error:", error.response?.data || error.message);
      toast.error("Failed to load threat data");
      setThreats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreats();
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("threat-alert", (newThreat) => {
      toast.warn(`High threat detected from ${newThreat.ip}`, {
        autoClose: 5000,
      });
      setThreats((prev) => [newThreat, ...prev]);
    });

    return () => socket.disconnect();
  }, []);

  const filteredThreats = useMemo(() => {
    return threats.filter((threat) => {
      const matchesSearch =
        threat.ip?.toLowerCase().includes(search.toLowerCase()) ||
        threat.url?.toLowerCase().includes(search.toLowerCase()) ||
        threat.reason?.toLowerCase().includes(search.toLowerCase());

      const matchesLevel =
        levelFilter === "all" ? true : threat.threatLevel === levelFilter;

      const matchesMethod =
        methodFilter === "all" ? true : threat.method === methodFilter;

      return matchesSearch && matchesLevel && matchesMethod;
    });
  }, [threats, search, levelFilter, methodFilter]);

  const stats = useMemo(() => {
    const total = threats.length;
    const high = threats.filter((t) => t.threatLevel === "HIGH").length;
    const medium = threats.filter((t) => t.threatLevel === "MEDIUM").length;
    const low = threats.filter((t) => t.threatLevel === "LOW").length;
    const postRequests = threats.filter((t) => t.method === "POST").length;

    return { total, high, medium, low, postRequests };
  }, [threats]);

  const levelStyle = (level) => {
    switch (level) {
      case "HIGH":
        return "bg-red-500/15 text-red-300 border-red-500/40";
      case "MEDIUM":
        return "bg-amber-500/15 text-amber-300 border-amber-500/40";
      default:
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredThreats.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredThreats.map((t) => t._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const deleteOne = async (id) => {
    try {
      await axios.delete(`${API_BASE}/threats/${id}`);
      toast.success("Threat deleted successfully");
      setThreats((prev) => prev.filter((t) => t._id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete threat");
    }
  };

  const deleteBulk = async () => {
    if (selectedIds.length === 0) {
      toast.info("No threats selected");
      return;
    }

    try {
      await axios.delete(`${API_BASE}/threats/bulk`, {
        data: { ids: selectedIds },
      });

      toast.success("Selected threats deleted successfully");
      setThreats((prev) => prev.filter((t) => !selectedIds.includes(t._id)));
      setSelectedIds([]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to bulk delete threats");
    }
  };

  const exportPDF = async () => {
    try {
      const res = await axios.get(`${API_BASE}/threats/export/pdf`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `threat-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Threat report exported");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export PDF");
    }
  };

  const cards = [
    {
      label: "Total Threats",
      value: stats.total,
      icon: <ShieldAlert className="w-5 h-5" />,
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      label: "High Threats",
      value: stats.high,
      icon: <Siren className="w-5 h-5" />,
      gradient: "from-red-500 to-pink-600",
    },
    {
      label: "Medium Threats",
      value: stats.medium,
      icon: <AlertTriangle className="w-5 h-5" />,
      gradient: "from-orange-500 to-amber-600",
    },
    {
      label: "Low Threats",
      value: stats.low,
      icon: <ShieldCheck className="w-5 h-5" />,
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      label: "POST Requests",
      value: stats.postRequests,
      icon: <Activity className="w-5 h-5" />,
      gradient: "from-purple-500 to-indigo-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-cyan-400" />
              Threat Detection
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Detects suspicious requests, assigns scores, filters results, exports reports, and supports delete actions.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={fetchThreats}
              className="flex items-center gap-2 bg-slate-800/70 text-gray-200 px-4 py-2 rounded-xl border border-slate-600 hover:border-cyan-500 hover:text-cyan-300 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            <button
              onClick={exportPDF}
              className="flex items-center gap-2 bg-cyan-600/80 text-white px-4 py-2 rounded-xl hover:bg-cyan-700 transition-all"
            >
              <FileDown className="w-4 h-4" />
              Export PDF
            </button>

            <button
              onClick={deleteBulk}
              className="flex items-center gap-2 bg-red-600/80 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {cards.map((card, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 border border-slate-700/70 rounded-2xl p-4 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{card.label}</p>
                  <p className={`text-2xl font-bold bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent mt-1`}>
                    {card.value}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/70">
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-slate-700/70 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by IP, URL or reason..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200"
            >
              <option value="all">All Threat Levels</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200"
            >
              <option value="all">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-gray-700/60 overflow-hidden">
          {filteredThreats.length === 0 ? (
            <div className="text-center py-12">
              <ShieldAlert className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No threats found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/70 border-b border-gray-700/70">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          filteredThreats.length > 0 &&
                          selectedIds.length === filteredThreats.length
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Threat Level</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">URL</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Delete</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-700/50">
                  {filteredThreats.map((threat) => (
                    <tr key={threat._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(threat._id)}
                          onChange={() => toggleSelectOne(threat._id)}
                          className="w-4 h-4"
                        />
                      </td>

                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs border font-semibold ${levelStyle(threat.threatLevel)}`}>
                          {threat.threatLevel}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-200">{threat.ip}</td>

                      <td className="px-6 py-4 text-sm text-cyan-300 max-w-xs truncate">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-cyan-400" />
                          <span className="truncate">{threat.url}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-300">{threat.method}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-white">{threat.threatScore}</td>
                      <td className="px-6 py-4 text-sm text-gray-400 max-w-md">{threat.reason || "No reason"}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(threat.createdAt).toLocaleString()}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          onClick={() => deleteOne(threat._id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <FeatureBox
            title="Threat Scoring"
            text="Each suspicious request gets a score based on threat patterns."
            icon={<Activity className="w-6 h-6 text-cyan-400" />}
          />
          <FeatureBox
            title="Threat Levels"
            text="Requests are labeled as LOW, MEDIUM, or HIGH."
            icon={<AlertTriangle className="w-6 h-6 text-orange-400" />}
          />
          <FeatureBox
            title="PDF Export"
            text="Generate downloadable PDF reports of detected threats."
            icon={<FileDown className="w-6 h-6 text-purple-400" />}
          />
          <FeatureBox
            title="Delete Options"
            text="Supports both single delete and bulk delete operations."
            icon={<Trash2 className="w-6 h-6 text-red-400" />}
          />
          <FeatureBox
            title="Live Alerts"
            text="High severity threats appear instantly through real-time updates."
            icon={<Siren className="w-6 h-6 text-emerald-400" />}
          />
        </div>
      </div>
    </div>
  );
}

function FeatureBox({ title, text, icon }) {
  return (
    <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 border border-slate-700/70 rounded-2xl p-5">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-200 mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}