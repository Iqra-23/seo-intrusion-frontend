import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import { toast } from "react-toastify";
import { useGoogleLogin } from "@react-oauth/google";
import { Mail, Lock, AlertTriangle, ShieldAlert } from "lucide-react";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const preventReload = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    
    window.addEventListener('beforeunload', preventReload);
    return () => window.removeEventListener('beforeunload', preventReload);
  }, []);

  const handleLogin = async () => {
    if (loading || errorInfo?.locked) return;
    
    console.log("Login started...");
    setLoading(true);
    
    try {
      console.log("Calling API...");
      const res = await api.post("/auth/login", form);
      console.log("Login successful:", res.data);

      // ⚠️ yahan pehle direct token + dashboard tha
      // ab hum OTP page pe bhej rahe hain
      setErrorInfo(null);
      toast.success("OTP sent to your email. Please enter the code.");

      navigate("/verify-otp", {
        state: {
          email: form.email,
          token: res.data.token,
          user: res.data.user,
          from: "password",
        },
      });
    } catch (err) {
      console.log("Login failed:", err.response?.data);
      const errorData = err.response?.data;
      
      if (errorData) {
        console.log("Setting error info:", errorData);
        setErrorInfo(errorData);
        
        if (errorData.locked) {
          toast.error(errorData.message, { autoClose: 8000 });
        } else if (errorData.suggestReset) {
          toast.warning(errorData.message, { autoClose: 6000 });
        } else {
          toast.error(errorData.message);
        }
      } else {
        toast.error("Login failed. Please try again.");
        setErrorInfo(null);
      }
      
      console.log("Error info set, should be visible now");
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const userInfo = await api.get("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        
        const res = await api.post("/auth/google", {
          email: userInfo.data.email,
          name: userInfo.data.name,
          token: tokenResponse.access_token,
        });

        // ⚠️ pehle yahan direct dashboard ja rahe the
        toast.success("Login Successful");

        navigate("/dashboard")
              } catch (err) {
        console.error("Google login error:", err);
        toast.error("Google login failed");
      }
    },
    onError: () => {
      toast.error("Google login failed");
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Header with Shield Logo */}
        <div className="text-center mb-8">
          {/* Security Shield Logo - Same as Signup */}
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-3xl mb-6 shadow-2xl shadow-cyan-500/50 animate-float relative">
            {/* Shield with Checkmark Icon */}
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {/* Decorative Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-3xl blur-xl opacity-50"></div>
          </div>

          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
            Welcome Back
          </h1>
          <p className="text-slate-400 text-lg">Sign in to continue to your security dashboard</p>
        </div>

        {/* Main Card */}
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-slate-700/50">
          {/* Account Locked Warning */}
          {errorInfo?.locked && (
            <div className="mb-6 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 p-4 rounded-2xl backdrop-blur-sm">
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-semibold text-red-400 mb-1">Account Locked</p>
                  <p className="text-sm text-red-300/80 mb-3">{errorInfo.message}</p>
                  <Link 
                    to="/forgot" 
                    className="inline-block text-sm font-semibold text-red-400 hover:text-red-300 underline transition-colors"
                  >
                    Reset Password Now →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Attempts Warning */}
          {errorInfo && !errorInfo.locked && errorInfo.attemptsRemaining !== null && (
            <div className={`mb-6 border rounded-2xl p-4 backdrop-blur-sm ${
              errorInfo.attemptsRemaining === 1 
                ? 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/30' 
                : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30'
            }`}>
              <div className="flex items-start">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  errorInfo.attemptsRemaining === 1 ? 'bg-red-500/20' : 'bg-amber-500/20'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    errorInfo.attemptsRemaining === 1 ? 'text-red-400' : 'text-amber-400'
                  }`} />
                </div>
                <div className="ml-3 flex-1">
                  <p className={`text-sm font-semibold mb-1 ${
                    errorInfo.attemptsRemaining === 1 ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {errorInfo.attemptsRemaining === 1 ? "⚠️ Last Attempt!" : "Invalid Password"}
                  </p>
                  <p className={`text-sm mb-2 ${
                    errorInfo.attemptsRemaining === 1 ? 'text-red-300/80' : 'text-amber-300/80'
                  }`}>
                    {errorInfo.message}
                  </p>
                  {errorInfo.suggestReset && (
                    <Link 
                      to="/forgot" 
                      className={`inline-block text-sm font-semibold underline transition-colors ${
                        errorInfo.attemptsRemaining === 1 
                          ? 'text-red-400 hover:text-red-300' 
                          : 'text-amber-400 hover:text-amber-300'
                      }`}
                    >
                      Forgot your password? Reset it now →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onKeyPress={handleKeyPress}
                  disabled={errorInfo?.locked}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none"
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value });
                    if (errorInfo && !errorInfo.locked) {
                      setErrorInfo(null);
                    }
                  }}
                  onKeyPress={handleKeyPress}
                  disabled={errorInfo?.locked}
                />
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link to="/forgot" className="text-sm text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={loading || errorInfo?.locked}
              className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-cyan-600 hover:via-blue-600 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : errorInfo?.locked ? "Account Locked" : "Sign In"}
            </button>
          </div>

          {/* Divider */}
          {!errorInfo?.locked && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-slate-900/90 text-slate-400">Or continue with</span>
                </div>
              </div>

              {/* Google Login Button */}
              <button
                onClick={googleLogin}
                type="button"
                className="w-full flex items-center justify-center gap-3 bg-slate-800/50 border border-slate-700 text-slate-300 py-3 rounded-xl font-semibold hover:bg-slate-800 hover:border-slate-600 transform hover:scale-[1.02] transition-all duration-200"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            </>
          )}

          {/* Signup Link */}
          <p className="text-center mt-6 text-sm text-slate-400">
            Don't have an account?{" "}
            <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              Sign up for free
            </Link>
          </p>
        </div>

        {/* Security Badge */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs text-slate-500">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Secured with 256-bit encryption</span>
          </div>
        </div>
      </div>

      {/* jsx → simple style (warning fix) */}
  <style>{`
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  .animate-float {
    animation: float 3s ease-in-out infinite;
  }
`}</style>

    </div>
  );
}
