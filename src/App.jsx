import { Routes, Route, Navigate } from "react-router-dom";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Logs from "./pages/Logs";
import Vulnerabilities from "./pages/Vulnerabilities";
import DashboardLayout from "./components/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Alerts from "./pages/Alerts";
import TrafficMonitor from "./pages/TrafficMonitor";
import VerifyLoginOtp from "./pages/VerifyLoginOtp";




// ✅ NEW MODULE
import FirewallSimulation from "./pages/FirewallSimulation";

import ThreatDetection from "./pages/ThreatDetection";

import DataEncryption from "./pages/DataEncryption";

export default function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Homepage />} />
        <Route path="/home" element={<Homepage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/verify-otp" element={<VerifyLoginOtp />} />
        <Route path="/data-encryption" element={<DataEncryption />} />
        

        {/* Protected Routes with Dashboard Layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/logs"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Logs />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/vulnerabilities"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Vulnerabilities />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Alerts />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/traffic"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TrafficMonitor />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ✅ NEW FIREWALL MODULE ROUTE */}
        <Route
          path="/firewall"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <FirewallSimulation />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/threats"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ThreatDetection />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}