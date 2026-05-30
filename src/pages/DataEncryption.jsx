import { useEffect, useState } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import {
  ShieldCheck,
  KeyRound,
  Lock,
  Bell,
  GlobeLock,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Download,
  FileText,
  X,
} from "lucide-react";

const SOCKET_URL =
  (import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:4000").replace(/\/api$/, "");

export default function DataEncryption() {
  const [records, setRecords] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [decryptedText, setDecryptedText] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    encrypted: 0,
    failed: 0,
    secureTls: 0,
    warningTls: 0,
  });

  const fetchRecords = async () => {
    try {
      const res = await api.get("/data-encryption");
      setRecords(res.data.records || []);
    } catch {
      toast.error("Failed to load encryption records");
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/data-encryption/stats");
      setStats(res.data || {});
    } catch {
      toast.error("Failed to load encryption stats");
    }
  };

  const refreshAll = () => {
    fetchRecords();
    fetchStats();
  };

  useEffect(() => {
    refreshAll();

    const socket = io(SOCKET_URL, { transports: ["websocket"] });

    socket.on("encryption-failure", (payload) => {
      toast.error(payload.message || "Encryption failure detected");
      refreshAll();
    });

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRecordDetails = (record) => {
    setSelectedRecord(record);
    setDecryptedText("");
  };

  const canDecrypt = (record) => {
    if (!record) return false;
    if (record.status === "failed") return false;
    if (record.algorithm?.startsWith("bcrypt")) return false;
    if (record.algorithm === "HTTPS/TLS") return false;
    if (!record.encryptedData || record.encryptedData === "FAILED") return false;
    return true;
  };

  const getViewMessage = (record) => {
    if (!record) return "";

    if (record.status === "failed") {
      return "Encryption failed. This record is stored only as failure proof and cannot be decrypted.";
    }

    if (record.algorithm?.startsWith("bcrypt")) {
      return "This is a password hashing record. Bcrypt is one-way security, so it cannot be decrypted.";
    }

    if (record.algorithm === "HTTPS/TLS") {
      return "This is a HTTPS/TLS verification record. It proves communication security status and does not contain decryptable data.";
    }

    return "This is an AES encrypted record. It can be decrypted using backend encryption key.";
  };

  const decryptRecord = async (id) => {
    try {
      const res = await api.get(`/data-encryption/decrypt/${id}`);
      setDecryptedText(res.data.plainText);
      toast.success("Record decrypted successfully");
    } catch {
      toast.error("Unable to decrypt this record");
    }
  };

  const deleteOne = async (id) => {
    try {
      await api.delete(`/data-encryption/${id}`);
      toast.success("Record deleted");
      setRecords((prev) => prev.filter((r) => r._id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      if (selectedRecord?._id === id) setSelectedRecord(null);
      fetchStats();
    } catch {
      toast.error("Failed to delete record");
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.info("Select records first");
      return;
    }

    try {
      await api.delete("/data-encryption/bulk", {
        data: { ids: selectedIds },
      });

      toast.success("Selected records deleted");
      setRecords((prev) => prev.filter((r) => !selectedIds.includes(r._id)));
      setSelectedIds([]);
      fetchStats();
    } catch {
      toast.error("Bulk delete failed");
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(records.map((r) => r._id));
    }
  };

  const downloadPdf = async () => {
    try {
      const res = await api.get("/data-encryption/export/pdf", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "data-encryption-report.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast.error("PDF export failed");
    }
  };

  const statusBadge = (status) => {
    if (status === "encrypted") {
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
    }

    if (status === "failed") {
      return "bg-red-500/15 text-red-300 border-red-500/40";
    }

    return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  };

  const tlsBadge = (tlsStatus) => {
    if (tlsStatus === "secure") {
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
    }

    return "bg-amber-500/15 text-amber-300 border-amber-500/40";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-cyan-400" />
              Data Encryption
            </h1>

            <p className="text-gray-400 mt-1 text-sm">
              Backend security records for encrypted sessions, password hashing,
              failure alerts and HTTPS/TLS checks.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={downloadPdf}
              className="flex items-center gap-2 bg-slate-800/70 text-gray-200 px-4 py-2 rounded-xl border border-cyan-500/40 hover:text-cyan-300 transition-all"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>

            <button
              onClick={bulkDelete}
              className="flex items-center gap-2 bg-red-600/80 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card title="Total Records" value={stats.total || 0} icon={<Activity />} />
          <Card title="Encrypted" value={stats.encrypted || 0} icon={<CheckCircle />} />
          <Card title="Failures" value={stats.failed || 0} icon={<XCircle />} />
          <Card title="Secure TLS" value={stats.secureTls || 0} icon={<GlobeLock />} />
          <Card title="TLS Warnings" value={stats.warningTls || 0} icon={<AlertTriangle />} />
        </div>

        {/* Records */}
        <div className="bg-gradient-to-br from-slate-900/70 to-slate-800/70 rounded-2xl border border-gray-700/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700/60 flex justify-between items-center gap-3">
            <div>
              <h2 className="text-xl font-semibold text-cyan-300 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Data Encryption Records
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                These records are generated by backend security operations and
                can be verified through detail view.
              </p>
            </div>

            {records.length > 0 && (
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={selectedIds.length === records.length}
                  onChange={toggleSelectAll}
                />
                Select All
              </label>
            )}
          </div>

          {records.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              No encryption records found. Create records from backend flow or
              Postman testing.
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {records.map((record) => (
                <div
                  key={record._id}
                  className="p-5 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(record._id)}
                          onChange={() => toggleSelectOne(record._id)}
                        />

                        <span className="text-sm font-semibold text-gray-100">
                          {record.title}
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full text-xs border font-semibold ${statusBadge(
                            record.status
                          )}`}
                        >
                          {record.status}
                        </span>

                        <span
                          className={`px-3 py-1 rounded-full text-xs border font-semibold ${tlsBadge(
                            record.tlsStatus
                          )}`}
                        >
                          TLS: {record.tlsStatus}
                        </span>
                      </div>

                      <p className="text-sm text-cyan-300">
                        Algorithm: {record.algorithm || "-"}
                      </p>

                      <p className="text-xs text-gray-400 break-all">
                        Encrypted Preview:{" "}
                        {record.encryptedData
                          ? record.encryptedData.slice(0, 80) + "..."
                          : "-"}
                      </p>

                      {record.failureReason && (
                        <p className="text-xs text-red-300">
                          Failure Reason: {record.failureReason}
                        </p>
                      )}

                      <p className="text-xs text-gray-500">
                        Created: {new Date(record.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openRecordDetails(record)}
                        className="p-2 rounded-xl bg-slate-950/70 border border-slate-700 text-gray-300 hover:text-cyan-300 hover:border-cyan-500 transition-all"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => deleteOne(record._id)}
                        className="p-2 rounded-xl bg-slate-950/70 border border-slate-700 text-gray-300 hover:text-red-300 hover:border-red-500 transition-all"
                        title="Delete"
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

        {/* Feature Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FeatureBox
            icon={<Lock />}
            title="Secure Cookies"
            text="Session records prove encrypted HTTP-only cookie/session storage."
          />

          <FeatureBox
            icon={<KeyRound />}
            title="Hashing + Salting"
            text="Password records prove one-way bcrypt hashing and salting."
          />

          <FeatureBox
            icon={<Bell />}
            title="Failure Alerts"
            text="Failed records prove real-time encryption failure alert handling."
          />

          <FeatureBox
            icon={<GlobeLock />}
            title="HTTPS / TLS"
            text="TLS records prove secure communication status checking."
          />
        </div>
      </div>

      {selectedRecord && (
        <RecordDetailsModal
          record={selectedRecord}
          decryptedText={decryptedText}
          canDecrypt={canDecrypt(selectedRecord)}
          message={getViewMessage(selectedRecord)}
          onDecrypt={() => decryptRecord(selectedRecord._id)}
          onClose={() => {
            setSelectedRecord(null);
            setDecryptedText("");
          }}
        />
      )}
    </div>
  );
}

function RecordDetailsModal({
  record,
  decryptedText,
  canDecrypt,
  message,
  onDecrypt,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-cyan-300">
              Encryption Record Details
            </h2>
            <p className="text-sm text-gray-500">
              Actual backend record mapped to the four Data Encryption features.
            </p>
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-red-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SmallInfo title="Title" value={record.title || "-"} />
            <SmallInfo title="Status" value={record.status || "-"} />
            <SmallInfo title="TLS Status" value={record.tlsStatus || "-"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailBox
              title="1. Secure Cookies / Session Storage"
              rows={[
                ["Session Record", record.title?.toLowerCase().includes("session") ? "Yes" : "No"],
                ["Encrypted Storage", record.status === "encrypted" ? "Yes" : "No"],
                ["Algorithm", record.algorithm || "-"],
              ]}
            />

            <DetailBox
              title="2. Password Hashing / Salting"
              rows={[
                ["Hash Record", record.algorithm?.startsWith("bcrypt") ? "Yes" : "No"],
                ["One-way Protection", record.algorithm?.startsWith("bcrypt") ? "Yes" : "No"],
                ["Algorithm", record.algorithm || "-"],
              ]}
            />

            <DetailBox
              title="3. In-App Alerts for Failures"
              rows={[
                ["Failure Status", record.status === "failed" ? "Failed" : "No failure"],
                ["Alert Triggered", record.status === "failed" ? "Yes" : "No"],
                ["Reason", record.failureReason || "-"],
              ]}
            />

            <DetailBox
              title="4. HTTPS / TLS Communication"
              rows={[
                ["TLS Status", record.tlsStatus || "-"],
                ["Secure Communication", record.tlsStatus === "secure" ? "Yes" : "Warning/Localhost"],
                ["Created At", record.createdAt ? new Date(record.createdAt).toLocaleString() : "-"],
              ]}
            />
          </div>
{/* 
          <div className="bg-slate-950/50 border border-slate-700 rounded-2xl p-4">
            <p className="text-sm text-cyan-300 font-semibold mb-2">
              View Result
            </p>
            <p className="text-sm text-gray-400 mb-4">{message}</p>

            <p className="text-xs text-gray-500 mb-1">Stored Data Preview</p>
            <p className="text-xs text-gray-300 break-all mb-4">
              {record.encryptedData || "-"}
            </p>

            {canDecrypt && (
              <button
                onClick={onDecrypt}
                className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-5 py-2 rounded-xl font-semibold hover:opacity-90"
              >
                Decrypt Record
              </button>
            )}

            {decryptedText && (
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <p className="text-sm text-emerald-300 font-semibold mb-1">
                  Decrypted Output
                </p>
                <p className="text-sm text-gray-200 break-all">
                  {decryptedText}
                </p>
              </div>
            )}
          </div> */}
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

function DetailBox({ title, rows }) {
  return (
    <div className="bg-slate-950/50 border border-slate-700 rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">{title}</h3>

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