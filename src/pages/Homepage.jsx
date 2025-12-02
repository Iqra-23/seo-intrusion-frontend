import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Shield, Lock, AlertTriangle, Activity, Bell, BarChart3, 
  Eye, FileText, Database, Zap, CheckCircle, ArrowRight,
  Menu, X, ChevronRight, Globe, Users, TrendingUp
} from "lucide-react";

export default function Homepage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: Lock,
      title: "User Authentication",
      // description: "Secure login with two-factor authentication, social media sign-in, and password recovery.",
      gradient: "from-cyan-500 to-blue-600"
    },
    {
      icon: Database,
      title: "Log Management",
      // description: "Centralized log storage with keyword-based searching, categorization, and automatic archiving.",
      gradient: "from-purple-500 to-indigo-600"
    },
    {
      icon: Shield,
      title: "Vulnerability Scanner",
      // description: "Detect outdated software, weak passwords, SSL/TLS misconfigurations with instant alerts.",
      gradient: "from-red-500 to-pink-600"
    },
    {
      icon: Activity,
      title: "Traffic Monitor",
      // description: "Real-time traffic logging with geo-location tracking and anomaly detection for suspicious activity.",
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      icon: Bell,
      title: "Real-time Alerting",
      // description: "Instant email and dashboard notifications categorized by severity levels for quick response.",
      gradient: "from-amber-500 to-orange-600"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      // description: "Customizable widgets with traffic trends, attack timelines, and exportable reports.",
      gradient: "from-violet-500 to-purple-600"
    },
    {
      icon: AlertTriangle,
      title: "Threat Detection",
      // description: "AI-powered detection of SQL injection, XSS, path traversal, and keyword spamming attempts.",
      gradient: "from-rose-500 to-red-600"
    },
    {
      icon: Eye,
      title: "Firewall Simulation",
      // description: "IP blacklisting/whitelisting, rate limiting, and automatic blocking of malicious traffic.",
      gradient: "from-sky-500 to-cyan-600"
    },
    {
      icon: Lock,
      title: "Data Encryption",
      // description: "AES-256 encryption, password hashing, HTTPS/TLS for secure communication channels.",
      gradient: "from-indigo-500 to-blue-600"
    },
    {
      icon: Zap,
      title: "Anomaly Detector",
      // description: "Baseline establishment for normal behavior with intelligent flagging of unusual patterns.",
      gradient: "from-pink-500 to-rose-600"

    },
    {
      icon: CheckCircle,
      title: "Incident Response",
      // description: "Automatic attacker blocking with detailed logging and recovery procedure documentation.",
      gradient: "from-green-500 to-emerald-600"
    },
    
    {
      icon: FileText,
      title: "Forensic Reporting",
      // description: "Daily, weekly, monthly reports with PDF/Excel export and comprehensive audit trails.",
      gradient: "from-orange-500 to-amber-600"
    }
  ];

  const stats = [
    { value: "99.9%", label: "Uptime", icon: TrendingUp },
    { value: "24/7", label: "Monitoring", icon: Eye },
    { value: "Real-time", label: "Alerts", icon: Bell },
    { value: "AI-Powered", label: "Detection", icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/50">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  SEO Intrusion
                </h1>
                <p className="text-xs text-gray-400">Detection System</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-300 hover:text-cyan-400 transition-colors">Features</a>
              <a href="#how-it-works" className="text-gray-300 hover:text-cyan-400 transition-colors">How It Works</a>
              <a href="#security" className="text-gray-300 hover:text-cyan-400 transition-colors">Security</a>
              <Link 
                to="/login"   // 🔁 yahan sirf path change
                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/20"
              >
                Sign In
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-300 hover:text-cyan-400"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-700/50 p-4 space-y-3">
            <a href="#features" className="block text-gray-300 hover:text-cyan-400 py-2">Features</a>
            <a href="#how-it-works" className="block text-gray-300 hover:text-cyan-400 py-2">How It Works</a>
            <a href="#security" className="block text-gray-300 hover:text-cyan-400 py-2">Security</a>
            <Link 
              to="/login"   // 🔁 yahan bhi sirf path change
              className="block text-center px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl"
            >
              Sign In
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-full mb-6">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-cyan-300">AI-Powered Protection</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">
              Secure Your Website
            </span>
            <br />
            <span className="text-gray-200">From Digital Threats</span>
          </h1>

          {/* <p className="text-xl text-gray-400 mb-10 max-w-3xl mx-auto">
            Real-time monitoring and AI-driven detection to protect your website from SEO attacks, 
            malware, SQL injection, and unauthorized access attempts.
          </p> */}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/signup"
              className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/30 font-semibold flex items-center justify-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="#features"
              className="px-8 py-4 bg-slate-800/50 border border-slate-700 text-gray-300 rounded-xl hover:border-slate-600 hover:text-gray-200 transition-all font-semibold"
            >
              Learn More
            </a>
          </div>

          {/* Stats */}
          {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, i) => (
              <div key={i} className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
                <stat.icon className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <p className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div> */}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Comprehensive Security Features
              </span>
            </h2>
            {/* <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              12 powerful modules working together to provide enterprise-level protection for your website
            </p> */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="group bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-slate-600 transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-200 mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 bg-gradient-to-b from-slate-900/50 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            <p className="text-xl text-gray-400">Simple, automated, and effective protection</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                step: "01", 
                title: "Continuous Monitoring", 
                desc: "24/7 traffic monitoring with real-time activity logging and geo-location tracking",
                icon: Eye
              },
              { 
  step: "02", 
  title: "Threat Analysis", 
  desc: "Detects suspicious activity and unusual behavior instantly",
  icon: Zap
},

              // { 
              //   step: "02", 
              //   title: "AI Detection", 
              //   desc: "Machine learning algorithms identify threats, anomalies, and suspicious patterns instantly",
              //   icon: Zap
              // },
              { 
                step: "03", 
                title: "Instant Response", 
                desc: "Automatic blocking, email alerts, and detailed reports for immediate action",
                icon: CheckCircle
              }
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 hover:border-cyan-500/50 transition-all">
                  <div className="text-6xl font-bold text-cyan-500/20 mb-4">{item.step}</div>
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4`}>
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-200 mb-3">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
                {i < 2 && (
                  <ChevronRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 text-cyan-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-xl rounded-3xl p-12 border border-slate-700/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    Enterprise-Grade Security
                  </span>
                </h2>
                <p className="text-gray-400 mb-6 text-lg">
                  Built with industry-standard security protocols to protect your data and ensure compliance.
                </p>
                <ul className="space-y-4">
                  {[
                    
                    "HTTPS/TLS Secure Communication",
                    "Two-Factor Authentication",
                    "Password Hashing & Salting",
                    "Role-Based Access Control",
                    "Secure Session Management"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Shield, label: "Firewall Protection" },
                  { icon: Lock, label: "Data Encryption" },
                  { icon: Eye, label: " Monitoring" },
                  { icon: AlertTriangle, label: "Threat Detection" }
                ].map((item, i) => (
                  <div 
                    key={i}
                    className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-2xl p-6 text-center hover:scale-105 transition-transform"
                  >
                    <item.icon className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                    <p className="text-gray-300 font-semibold">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-3xl p-12 backdrop-blur-xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Ready to Protect Your Website?
              </span>
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Start monitoring your website security in minutes. No credit card required.
            </p>
            <Link 
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg shadow-cyan-500/30 font-semibold text-lg"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <span className="text-lg font-bold text-gray-200">SEO Intrusion</span>
              </div>
              <p className="text-gray-400 text-sm text-center">
                Protecting websites from digital threats with AI-powered security.
              </p>
            </div>
            {/* <div>
              <h3 className="font-semibold text-gray-200 mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#features" className="hover:text-cyan-400">Features</a></li>
                <li><a href="#security" className="hover:text-cyan-400">Security</a></li>
                <li><a href="#" className="hover:text-cyan-400">Pricing</a></li>
              </ul>
            </div> */}
            {/* <div>
              <h3 className="font-semibold text-gray-200 mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-cyan-400">About</a></li>
                <li><a href="#" className="hover:text-cyan-400">Contact</a></li>
                <li><a href="#" className="hover:text-cyan-400">Support</a></li>
              </ul>
            </div> */}
            {/* <div>
              <h3 className="font-semibold text-gray-200 mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-cyan-400">Privacy</a></li>
                <li><a href="#" className="hover:text-cyan-400">Terms</a></li>
                <li><a href="#" className="hover:text-cyan-400">Security</a></li>
              </ul>
            </div> */}
          </div>
          {/* <div className="border-t border-slate-700/50 pt-8 text-center text-gray-400 text-sm">
            <p>© 2024 SEO Intrusion Detection System. All rights reserved.</p>
          </div> */}
        </div>
      </footer>
    </div>
  );
}
