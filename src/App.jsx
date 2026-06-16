import { Routes, Route, Navigate } from "react-router-dom";

import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyLoginOtp from "./pages/VerifyLoginOtp";

import Dashboard from "./pages/Dashboard";
import Logs from "./pages/Logs";
import Vulnerabilities from "./pages/Vulnerabilities";
import Alerts from "./pages/Alerts";
import TrafficMonitor from "./pages/TrafficMonitor";
import FirewallSimulation from "./pages/FirewallSimulation";
import ThreatDetection from "./pages/ThreatDetection";
import DataEncryption from "./pages/DataEncryption";
import AnomalyDetector from "./pages/AnomalyDetector";
import IncidentResponse from "./pages/IncidentResponse";
import IncidentAnalysis from "./pages/IncidentAnalysis";
import AdminProfile from "./pages/AdminProfile"; // NEW
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
      />

      <Routes>

        {/* Public */}
        <Route path="/"           element={<Homepage />} />
        <Route path="/home"       element={<Homepage />} />
        <Route path="/login"      element={<Login />} />
        <Route path="/signup"     element={<Signup />} />
        <Route path="/forgot"     element={<ForgotPassword />} />
        <Route path="/reset"      element={<ResetPassword />} />
        <Route path="/verify-otp" element={<VerifyLoginOtp />} />

        {/* Protected */}
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>
        }/>

        <Route path="/logs" element={
          <ProtectedRoute><DashboardLayout><Logs /></DashboardLayout></ProtectedRoute>
        }/>

        <Route path="/vulnerabilities" element={
          <ProtectedRoute><DashboardLayout><Vulnerabilities /></DashboardLayout></ProtectedRoute>
        }/>

        <Route path="/alerts" element={
          <ProtectedRoute><DashboardLayout><Alerts /></DashboardLayout></ProtectedRoute>
        }/>

        <Route path="/traffic" element={
          <ProtectedRoute><DashboardLayout><TrafficMonitor /></DashboardLayout></ProtectedRoute>
        }/>

        <Route path="/firewall" element={
          <ProtectedRoute><DashboardLayout><FirewallSimulation /></DashboardLayout></ProtectedRoute>
        }/>

        <Route path="/threats" element={
          <ProtectedRoute><DashboardLayout><ThreatDetection /></DashboardLayout></ProtectedRoute>
        }/>

        <Route path="/data-encryption" element={
          <ProtectedRoute><DashboardLayout><DataEncryption /></DashboardLayout></ProtectedRoute>
        }/>

        <Route path="/anomaly" element={
          <ProtectedRoute><DashboardLayout><AnomalyDetector /></DashboardLayout></ProtectedRoute>
        }/>

        <Route path="/incident-response" element={
          <ProtectedRoute><DashboardLayout><IncidentResponse /></DashboardLayout></ProtectedRoute>
        }/>

        {/* ✅ Incident Analysis */}
        <Route path="/incident-analysis" element={
          <ProtectedRoute><DashboardLayout><IncidentAnalysis /></DashboardLayout></ProtectedRoute>
        }/>

        {/* ✅ Admin Profile */}
        <Route path="/profile" element={
          <ProtectedRoute><DashboardLayout><AdminProfile /></DashboardLayout></ProtectedRoute>
        }/>

        {/* Catch */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </>
  );
}