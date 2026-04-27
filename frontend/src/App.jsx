import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx"; // Ensure this path is correct
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AppLayoutSwitcher from "./components/AppLayoutSwitcher.jsx";

// Pages
import HomePage from "./pages/HomePage";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ClassesPage from "./pages/ClassesPage.jsx";
import AttendancePage from "./pages/AttendancePage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import MessagesPage from "./pages/MessagesPage.jsx";
import MarkAttendance from "./pages/MarkAttendance";

export default function App() {
  const { user, loading } = useAuth();

  // Prevent routing logic until we know if the user is logged in
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* 🏠 HOME ROUTE LOGIC 
        If logged in, go straight to dashboard. 
        If logged out, show the public landing page.
      */}
      <Route 
        path="/" 
        element={user ? <Navigate to="/app/dashboard" replace /> : <HomePage />} 
      />

      {/* Public Auth Routes */}
      <Route 
        path="/login" 
        element={user ? <Navigate to="/app/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/signup" 
        element={user ? <Navigate to="/app/dashboard" replace /> : <Signup />} 
      />

      {/* 🛡️ Protected Layout Section */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayoutSwitcher />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="mark-attendance" element={<MarkAttendance />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}