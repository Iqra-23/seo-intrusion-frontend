import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import api from "../api/api";
import { toast } from "react-toastify";
import { ShieldAlert } from "lucide-react";

export default function VerifyLoginOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // agar koi direct URL se /verify-otp khol le aur state na ho
  useEffect(() => {
    if (!state || !state.email || !state.token || !state.user) {
      navigate("/login");
    }
  }, [state, navigate]);

  if (!state || !state.email || !state.token || !state.user) {
    return null; // jab tak redirect ho raha
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      toast.error("Please enter 6-digit OTP code");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/login/verify-otp", {
        email: state.email,
        code,
      });

      toast.success(res.data.message || "Login successful");

      // ✅ ab login complete: token & user store karo
      localStorage.setItem("token", state.token);
      localStorage.setItem("user", JSON.stringify(state.user));

      navigate("/dashboard");
    } catch (err) {
      console.error("OTP verify error:", err);
      const msg =
        err.response?.data?.message || "Invalid or expired OTP. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-slate-700/50">
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-cyan-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-slate-100 mb-2">
          Verify Login
        </h1>
        <p className="text-sm text-center text-slate-400 mb-6">
          We sent a 6-digit verification code to{" "}
          <span className="font-semibold text-cyan-400">{state.email}</span>
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              One-Time Password (OTP)
            </label>
            <input
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-center tracking-[0.5em] text-lg text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
              placeholder="••••••"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-cyan-600 hover:via-blue-600 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>
        </form>

        <p className="text-xs text-slate-500 text-center mt-4">
          Enter the code within 5 minutes.{" "}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
