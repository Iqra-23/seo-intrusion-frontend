import { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import {
  Lock,
  ShieldCheck,
  AlertTriangle,
  Search,
  RefreshCw,
  Trash2,
  FileDown,
  Eye,
  Plus,
  KeyRound,
} from "lucide-react";

const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:4000").replace(/\/api$/, "");

export default function DataEncryption() {
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tlsFilter, setTlsFilter] = useState("all");

  const [title, setTitle] = useState("");
  const [plainText, setPlainText] = useState("");
  const [showDecrypted, setShowDecrypted] = useState({});

  const fetchStats = async () => {
    try {
      const res = await api.get("/data-encryption/stats");
      setStats(res.data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load encryption stats");
    }
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await api.get("/data-encryption");
      setRecords(res.data.records || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load encrypted records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRecords();
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("encryption-failure", (payload) => {
      toast.error(`Encryption failure: ${payload.reason || payload.message}`);
      fetchStats();
      fetchRecords();
    });

    return () => socket.disconnect();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const matchesSearch =
        item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.algorithm?.toLowerCase().includes(search.toLowerCase()) ||
        item.failureReason?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ? true : item.status === statusFilter;

      const matchesTls = tlsFilter === "all" ? true : item.tlsStatus === tlsFilter;

      return matchesSearch && matchesStatus && matchesTls;
    });
  }, [records, search, statusFilter, tlsFilter]);

  const createRecord = async (e) => {
    e.preventDefault();

    if (!title || !plainText) {
      toast.info("Title and sensitive text are required");
      return;
    }

    try {
      await api.post("/data-encryption", { title, plainText });
      toast.success("Data encrypted and saved successfully");
      setTitle("");
      setPlainText("");
      fetchStats();
      fetchRecords();
    } catch (error) {
      console.error(error);
      toast.error("Failed to encrypt and save record");
    }
  };

  const decryptOne = async (id) => {
    try {
      const res = await api.get(`/data-encryption/decrypt/${id}`);
      setShowDecrypted((prev) => ({
        ...prev,
        [id]: res.data.plainText,
      }));
    } catch (error) {
      console.error(error);
      toast.error("Failed to decrypt record");
    }
  };

  const deleteOne = async (id) => {
    try {
      await api.delete(`/data-encryption/${id}`);
      toast.success("Record deleted");
      setRecords((prev) => prev.filter((x) => x._id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      fetchStats();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete record");
    }
  };

  const deleteBulk = async () => {
    if (selectedIds.length === 0) {
      toast.info("No records selected");
      return;
    }

    try {
      await api.delete("/data-encryption/bulk", {
        data: { ids: selectedIds },
      });

      toast.success("Selected records deleted");
      setRecords((prev) => prev.filter((x) => !selectedIds.includes(x._id)));
      setSelectedIds([]);
      fetchStats();
    } catch (error) {
      console.error(error);
      toast.error("Failed to bulk delete records");
    }
  };

  const exportPDF = async () => {
    try {
      const res = await api.get("/data-encryption/export/pdf", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `data-encryption-report-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Encryption report exported");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export PDF");
    }
  };

  const refreshAll = () => {
    fetchStats();
    fetchRecords();
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map((i) => i._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const statusStyle = (value) => {
    if (value === "failed") {
      return "bg-red-500/15 text-red-300 border-red-500/40";
    }
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
  };

  const tlsStyle = (value) => {
    if (value === "warning") {
      return "bg-amber-500/15 text-amber-300 border-amber-500/40";
    }
    return "bg-cyan-500/15 text-cyan-300 border-cyan-500/40";
  };

  const cards = useMemo(() => {
    if (!stats) return [];

    return [
      {
        label: "Total Records",
        value: stats.total || 0,
        icon: <Lock className="w-5 h-5" />,
        gradient: "from-cyan-500 to-blue-600",
      },
      {
        label: "Encrypted",
        value: stats.encrypted || 0,
        icon: <ShieldCheck className="w-5 h-5" />,
        gradient: "from-emerald-500 to-teal-600",
      },
      {
        label: "Failures",
        value: stats.failed || 0,
        icon: <AlertTriangle className="w-5 h-5" />,
        gradient: "from-red-500 to-pink-600",
      },
      {
        label: "TLS Secure",
        value: stats.secureTls || 0,
        icon: <KeyRound className="w-5 h-5" />,
        gradient: "from-purple-500 to-indigo-600",
      },
    ];
  }, [stats]);

  if (loading && records.length === 0) {
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
              <Lock className="w-7 h-7 text-cyan-400" />
              Data Encryption
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              Encrypts sensitive data, supports secure decryption, tracks failures, and monitors TLS security.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={refreshAll}
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-slate-700/70 p-5">
            <h2 className="text-xl font-semibold text-cyan-300 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Encrypt New Record
            </h2>

            <form onSubmit={createRecord} className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter record title"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200"
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-2">Sensitive Data</label>
                <textarea
                  rows="5"
                  value={plainText}
                  onChange={(e) => setPlainText(e.target.value)}
                  placeholder="Enter sensitive text to encrypt"
                  className="w-full px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded-xl font-medium transition-all"
              >
                Encrypt & Save
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-slate-700/70 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title, algorithm, reason..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200"
                >
                  <option value="all">All Status</option>
                  <option value="encrypted">Encrypted</option>
                  <option value="failed">Failed</option>
                </select>

                <select
                  value={tlsFilter}
                  onChange={(e) => setTlsFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-950/60 border border-gray-700 rounded-xl text-gray-200"
                >
                  <option value="all">All TLS Status</option>
                  <option value="secure">Secure</option>
                  <option value="warning">Warning</option>
                </select>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-gray-700/60 overflow-hidden">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">No encrypted records found</p>
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
                              filteredRecords.length > 0 &&
                              selectedIds.length === filteredRecords.length
                            }
                            onChange={toggleSelectAll}
                            className="w-4 h-4"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          TLS
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Algorithm
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          View
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                          Delete
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-700/50">
                      {filteredRecords.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item._id)}
                              onChange={() => toggleSelectOne(item._id)}
                              className="w-4 h-4"
                            />
                          </td>

                          <td className="px-6 py-4 text-sm text-gray-200">
                            <div className="font-medium">{item.title}</div>
                            {showDecrypted[item._id] ? (
                              <div className="text-xs text-cyan-300 mt-1 break-all">
                                {showDecrypted[item._id]}
                              </div>
                            ) : null}
                          </td>

                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs border font-semibold ${statusStyle(item.status)}`}>
                              {item.status}
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs border font-semibold ${tlsStyle(item.tlsStatus)}`}>
                              {item.tlsStatus}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-sm text-gray-300">
                            {item.algorithm}
                          </td>

                          <td className="px-6 py-4">
                            <button
                              onClick={() => decryptOne(item._id)}
                              className="text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>

                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(item.createdAt).toLocaleString()}
                          </td>

                          <td className="px-6 py-4">
                            <button
                              onClick={() => deleteOne(item._id)}
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
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FeatureBox
            title="Secure Storage"
            text="Sensitive text is encrypted using AES-256 before being stored in the database."
            icon={<Lock className="w-6 h-6 text-cyan-400" />}
          />
          <FeatureBox
            title="Decryption View"
            text="Authorized users can decrypt and view saved records directly from the module."
            icon={<Eye className="w-6 h-6 text-purple-400" />}
          />
          <FeatureBox
            title="Failure Alerts"
            text="Encryption failures are tracked and shown with warnings and real-time alerts."
            icon={<AlertTriangle className="w-6 h-6 text-red-400" />}
          />
          <FeatureBox
            title="TLS Monitoring"
            text="The module tracks secure communication status and shows TLS certificate health."
            icon={<ShieldCheck className="w-6 h-6 text-emerald-400" />}
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