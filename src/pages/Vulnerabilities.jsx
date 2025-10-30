import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import { toast } from "react-toastify";
import {
  Shield, AlertTriangle, Search, Download, RefreshCw,
  Clock, CheckCircle, XCircle, Trash2
} from "lucide-react";

export default function Vulnerabilities() {
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [stats, setStats] = useState({});
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [showScanModal, setShowScanModal] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedVulns, setSelectedVulns] = useState([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vulnsRes, statsRes, scansRes] = await Promise.all([
        api.get("/vulnerabilities"),
        api.get("/vulnerabilities/stats"),
        api.get("/vulnerabilities/scans")
      ]);

      setVulnerabilities(vulnsRes.data.vulnerabilities || vulnsRes.data);
      setStats(statsRes.data);
      setRecentScans(scansRes.data);
    } catch (error) {
      toast.error("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!siteUrl) {
      toast.error("Please enter a site URL");
      return;
    }

    setScanning(true);
    try {
      const response = await api.post("/vulnerabilities/scan", { siteUrl });
      toast.success(
        `Scan completed! Found ${response.data.total} vulnerabilities`,
        { autoClose: 6000 }
      );
      setShowScanModal(false);
      setSiteUrl("");
      fetchData();
    } catch (error) {
      toast.error("Failed to perform scan");
    } finally {
      setScanning(false);
    }
  };

  const handleExport = async (scanId = null) => {
    try {
      const params = scanId ? `?scanId=${scanId}` : "";
      const response = await api.get(`/vulnerabilities/export${params}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `vulnerability_report_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Report exported and emailed successfully!");
    } catch (error) {
      toast.error("Failed to export report");
    }
  };

  // delete single
  const handleDelete = async (vulnId) => {
    try {
      await api.delete(`/vulnerabilities/${vulnId}`, {
        headers: { "Content-Type": "application/json" }
      });
      setDeleteConfirm(null);
      toast.success("Vulnerability deleted successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete vulnerability");
    }
  };

  // bulk delete
  const handleBulkDelete = async () => {
    if (selectedVulns.length === 0) {
      toast.error("No vulnerabilities selected");
      return;
    }

    try {
      await api.delete("/vulnerabilities/bulk", {
        data: { ids: selectedVulns },
        headers: { "Content-Type": "application/json" }
      });
      setSelectedVulns([]);
      toast.success(`${selectedVulns.length} vulnerabilities deleted successfully`);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete vulnerabilities");
    }
  };

  const toggleSelectVuln = (vulnId) => {
    setSelectedVulns((prev) =>
      prev.includes(vulnId)
        ? prev.filter(id => id !== vulnId)
        : [...prev, vulnId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedVulns.length === filteredVulns.length) {
      setSelectedVulns([]);
    } else {
      setSelectedVulns(filteredVulns.map(v => v._id));
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "Critical": return { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" };
      case "High": return { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" };
      case "Medium": return { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" };
      case "Low": return { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" };
      default: return { bg: "bg-gray-500/20", text: "text-gray-400", border: "border-gray-500/30" };
    }
  };

  // filter list
  const filteredVulns = vulnerabilities.filter(vuln => {
    const matchSeverity = filterSeverity === "all" || vuln.severity === filterSeverity;
    const matchSearch =
      vuln.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vuln.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSeverity && matchSearch;
  });

  // 🔥 ONLY THIS BLOCK CHANGED — loader now matches Dashboard
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
  // 🔥 nothing else touched

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Vulnerability Scanner
            </h1>
            <p className="text-gray-400 mt-1">Comprehensive security assessment and monitoring</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowScanModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-2 rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
            >
              <Shield className="w-4 h-4" />
              New Scan
            </button>
            {vulnerabilities.length > 0 && (
              <button
                onClick={() => handleExport()}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
            {selectedVulns.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-xl hover:from-red-600 hover:to-pink-700 transition-all shadow-lg shadow-red-500/20"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedVulns.length})
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: "Total", value: stats.total || 0, icon: Shield, gradient: "from-cyan-500 to-blue-600" },
            { label: "Critical", value: stats.severity?.critical || 0, icon: AlertTriangle, gradient: "from-red-500 to-pink-600" },
            { label: "High", value: stats.severity?.high || 0, icon: AlertTriangle, gradient: "from-orange-500 to-red-600" },
            { label: "Medium", value: stats.severity?.medium || 0, icon: AlertTriangle, gradient: "from-amber-500 to-orange-600" },
            { label: "Low", value: stats.severity?.low || 0, icon: CheckCircle, gradient: "from-emerald-500 to-teal-600" },
          ].map((stat, i) => (
            <div key={i} className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50 hover:border-gray-600 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  <p className={`text-2xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mt-1`}>
                    {stat.value}
                  </p>
                </div>
                <stat.icon className={`w-8 h-8 bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent opacity-50 group-hover:opacity-100 transition-opacity`} />
              </div>
            </div>
          ))}
        </div>

        {/* Recent Scans */}
        {/* {recentScans && recentScans.length > 0 && (
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Recent Scans
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentScans.slice(0, 3).map((scan) => (
                <div key={scan._id} className="bg-slate-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 hover:bg-slate-800 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-gray-200 truncate">{scan.siteUrl}</p>
                    <span className="text-xs text-gray-400">{scan.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{new Date(scan.startedAt).toLocaleString()}</p>
                  {scan.status === "Completed" && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-red-400 font-semibold">{scan.criticalCount} Critical</span>
                      <span className="text-orange-400">{scan.highCount} High</span>
                      <button
                        onClick={() => handleExport(scan.scanId)}
                        className="ml-auto text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )} */}

        {/* Filters */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-4 border border-gray-700/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search vulnerabilities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none"
              />
            </div>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-4 py-2 bg-slate-800/50 border border-gray-700 rounded-xl text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* Vulnerabilities List */}
        <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden">
          {filteredVulns.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-200 mb-2">No Vulnerabilities Found</h3>
              <p className="text-gray-400 mb-4">
                {vulnerabilities.length === 0
                  ? "Your system appears secure. Run your first scan."
                  : "No vulnerabilities match your filters."}
              </p>
              <button
                onClick={() => setShowScanModal(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-2 rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
              >
                Run Security Scan
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedVulns.length === filteredVulns.length && filteredVulns.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Detected</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-700/50">
                  {filteredVulns.map((vuln) => {
                    const sevColor = getSeverityColor(vuln.severity);
                    return (
                      <tr key={vuln._id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedVulns.includes(vuln._id)}
                            onChange={() => toggleSelectVuln(vuln._id)}
                            className="w-4 h-4 rounded border-gray-600 bg-slate-800 text-cyan-500 focus:ring-2 focus:ring-cyan-500"
                          />
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-200">{vuln.type}</p>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${sevColor.bg} ${sevColor.text} border ${sevColor.border}`}>
                            {vuln.severity}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-300 mb-1">{vuln.description}</p>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(vuln.detectedAt).toLocaleDateString()}
                        </td>

                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          <button
                            onClick={() => setDeleteConfirm(vuln._id)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-6 backdrop-blur-sm">
            <Shield className="w-8 h-8 text-cyan-400 mb-3" />
            <h3 className="font-semibold text-gray-200 mb-2">SSL/TLS Checks</h3>
            <p className="text-sm text-gray-400">Validates SSL certificates and security policies.</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-sm">
            <AlertTriangle className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="font-semibold text-gray-200 mb-2">Outdated Software</h3>
            <p className="text-sm text-gray-400">Detects outdated CMS, plugins, and libraries.</p>
          </div>

          <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-2xl p-6 backdrop-blur-sm">
            <XCircle className="w-8 h-8 text-red-400 mb-3" />
            <h3 className="font-semibold text-gray-200 mb-2">Password Security</h3>
            <p className="text-sm text-gray-400">Finds weak password policy and exposed admin panels.</p>
          </div>
        </div>
      </div>

      {/* Scan Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-gray-700 rounded-3xl p-8 max-w-md w-full shadow-2xl">

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-2xl">
                <Shield className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-200">Run Security Scan</h2>
                <p className="text-sm text-gray-400">Comprehensive vulnerability assessment</p>
              </div>
            </div>

            <form onSubmit={handleScan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={scanning}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg shadow-cyan-500/20"
                >
                  {scanning ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Scanning...
                    </span>
                  ) : "Start Scan"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowScanModal(false)}
                  disabled={scanning}
                  className="px-6 py-3 bg-slate-800/50 border border-gray-700 text-gray-300 rounded-xl hover:border-gray-600 hover:text-gray-200 transition-all font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-200">Delete Vulnerability</h2>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this vulnerability?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white py-3 rounded-xl hover:from-red-600 hover:to-pink-700 transition-all font-medium shadow-lg shadow-red-500/20"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-6 py-3 bg-slate-800/50 border border-gray-700 text-gray-300 rounded-xl hover:border-gray-600 hover:text-gray-200 transition-all font-medium"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
