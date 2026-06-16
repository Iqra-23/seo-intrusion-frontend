import { useEffect, useState } from "react";
import api from "../api/api";
import { toast } from "react-toastify";
import {
  User, Mail, Shield, Clock, Calendar, AlertTriangle,
  Activity, ShieldAlert, FileWarning, CheckCircle,
  Edit2, Save, X, Lock,
} from "lucide-react";

const LEVEL_STYLE = (level) => {
  switch (level) {
    case "suspicious": return "bg-purple-500/15 text-purple-300 border-purple-500/30";
    case "warning":    return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "error":      return "bg-red-500/15 text-red-300 border-red-500/30";
    default:           return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
  }
};

export default function AdminProfile() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name,    setName]    = useState("");
  const [saving,  setSaving]  = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/profile");
      setData(res.data);
      setName(res.data.user?.name || "");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSave = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Name must be at least 2 characters");
      return;
    }
    try {
      setSaving(true);
      await api.put("/profile/update", { name: name.trim() });
      toast.success("Profile updated");
      setEditing(false);
      fetchProfile();
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <User className="w-7 h-7 text-cyan-400 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const user    = data?.user    || {};
  const stats   = data?.stats   || {};
  const recent  = data?.recentActivity || [];

  const statCards = [
    { label: "Total Logs",      value: stats.totalLogs      ?? 0, icon: <Activity    className="w-5 h-5" />, color: "text-cyan-300",    border: "border-cyan-500/20"    },
    { label: "Suspicious",      value: stats.suspiciousLogs ?? 0, icon: <AlertTriangle className="w-5 h-5" />, color: "text-purple-300", border: "border-purple-500/20"  },
    { label: "Threats",         value: stats.totalThreats   ?? 0, icon: <ShieldAlert  className="w-5 h-5" />, color: "text-red-300",     border: "border-red-500/20"     },
    { label: "Anomalies",       value: stats.totalAnomalies ?? 0, icon: <FileWarning  className="w-5 h-5" />, color: "text-amber-300",   border: "border-amber-500/20"   },
    { label: "Incidents",       value: stats.totalIncidents ?? 0, icon: <Shield       className="w-5 h-5" />, color: "text-emerald-300", border: "border-emerald-500/20" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-gray-100">
      <div className="p-6 max-w-5xl mx-auto space-y-6">

        {/* ── HEADER ── */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
            <User className="w-7 h-7 text-cyan-400" />
            Admin Profile
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Account details and system activity overview</p>
        </div>

        {/* ── PROFILE CARD ── */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 rounded-2xl border border-slate-700/60 overflow-hidden">

          {/* Top banner */}
          <div className="h-24 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10" />
          </div>

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center border-4 border-slate-900 shadow-xl shadow-cyan-500/20">
                <span className="text-2xl font-bold text-white">
                  {user.name?.charAt(0)?.toUpperCase() || "A"}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                {!editing ? (
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-2 bg-slate-700/80 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-sm transition-all border border-slate-600/60">
                    <Edit2 className="w-4 h-4" /> Edit Name
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="px-3 py-2 bg-slate-950/60 border border-cyan-500/50 rounded-xl text-slate-200 text-sm outline-none focus:ring-2 focus:ring-cyan-500/40 w-40"
                      placeholder="Enter name"
                    />
                    <button onClick={handleSave} disabled={saving}
                      className="flex items-center gap-1 bg-cyan-600/80 hover:bg-cyan-600 text-white px-3 py-2 rounded-xl text-sm transition-all disabled:opacity-50">
                      <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={() => { setEditing(false); setName(user.name || ""); }}
                      className="p-2 bg-slate-700/80 hover:bg-slate-700 text-slate-300 rounded-xl transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Name + Email */}
            <div className="mb-5">
              <h2 className="text-xl font-bold text-slate-100">{user.name}</h2>
              <p className="text-slate-400 text-sm mt-0.5">System Administrator</p>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={<Mail className="w-4 h-4 text-cyan-400" />}   label="Email"        value={user.email} />
              <InfoRow icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} label="Email Verified" value={user.emailVerified ? "Verified ✓" : "Not Verified"} valueColor={user.emailVerified ? "text-emerald-400" : "text-red-400"} />
              <InfoRow icon={<Clock className="w-4 h-4 text-purple-400" />} label="Last Login"  value={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "First session"} />
              <InfoRow icon={<Calendar className="w-4 h-4 text-amber-400" />} label="Member Since" value={new Date(user.createdAt).toLocaleDateString()} />
              <InfoRow icon={<Lock className="w-4 h-4 text-slate-400" />}   label="2FA"          value={user.twoFactorEnabled ? "Enabled" : "Disabled"} />
              <InfoRow icon={<Shield className="w-4 h-4 text-cyan-400" />}  label="Role"         value="Administrator" valueColor="text-cyan-300" />
            </div>
          </div>
        </div>

        {/* ── STATS ── */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">System Activity Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {statCards.map((c, i) => (
              <div key={i} className={`rounded-2xl border ${c.border} bg-gradient-to-br from-slate-900/80 to-slate-800/60 px-4 py-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={c.color}>{c.icon}</span>
                </div>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-slate-500 mt-1">{c.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── RECENT ACTIVITY ── */}
        <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/60 rounded-2xl border border-slate-700/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/60">
            <h2 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Recent System Activity</h2>
            <p className="text-xs text-slate-500 mt-0.5">Last 5 log entries</p>
          </div>
          <div className="divide-y divide-slate-800/60">
            {recent.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-500 text-sm">No activity yet</div>
            ) : recent.map((log, i) => (
              <div key={i} className="px-5 py-3 flex items-start justify-between gap-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] border font-semibold flex-shrink-0 ${LEVEL_STYLE(log.level)}`}>
                    {log.level?.toUpperCase()}
                  </span>
                  <p className="text-sm text-slate-300 truncate">{log.message}</p>
                </div>
                <p className="text-xs text-slate-500 flex-shrink-0">{new Date(log.createdAt).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, valueColor = "text-slate-200" }) {
  return (
    <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/60 rounded-xl px-4 py-3">
      <div className="flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-medium truncate ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}