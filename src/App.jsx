import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import './App.css';

import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import AuditDashboard from './pages/AuditDashboard';
import Inventory from './pages/Inventory';
import StockIn from './pages/StockIn';
import StockOut from './pages/StockOut';
import Alerts from './pages/Alerts';
import Unauthorized from './pages/Unauthorized';

// Home route renders different dashboards based on role
const HomeRoute = () => {
  const { userRole } = useAuth();
  if (userRole === 'audit_unit') {
    return <AuditDashboard />;
  }
  return <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

const AppRoutes = () => {
  const location = useLocation();
  const { user, loading, needsProfileSetup } = useAuth();
  const isLoginPage = location.pathname === '/login';

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect authenticated users away from login
  if (isLoginPage && user) {
    return <Navigate to="/" replace />;
  }

  // Show login page (no sidebar)
  if (isLoginPage || !user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // If user needs to complete profile setup (non-audit users without name/position)
  if (needsProfileSetup) {
    return (
      <Routes>
        <Route path="*" element={<ProfileSetup />} />
      </Routes>
    );
  }

  // Authenticated layout with sidebar
  return (
    <StoreProvider>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={['admin', 'storekeeper', 'audit_unit']}>
                  <HomeRoute />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute allowedRoles={['admin', 'storekeeper']}>
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/receive"
              element={
                <ProtectedRoute allowedRoles={['admin', 'storekeeper']}>
                  <StockIn />
                </ProtectedRoute>
              }
            />
            <Route
              path="/issue"
              element={
                <ProtectedRoute allowedRoles={['admin', 'storekeeper']}>
                  <StockOut />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute allowedRoles={['admin', 'storekeeper']}>
                  <Alerts />
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </StoreProvider>
  );
};

export default App;
