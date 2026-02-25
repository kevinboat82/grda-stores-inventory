import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import { RecordsProvider } from './context/RecordsContext';
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
import RecordsDashboard from './pages/RecordsDashboard';
import LetterUpload from './pages/LetterUpload';
import LetterView from './pages/LetterView';
import UserManagement from './pages/UserManagement';
import Unauthorized from './pages/Unauthorized';

// Home route renders different dashboards based on role
const HomeRoute = () => {
  const { userRole } = useAuth();
  if (userRole === 'audit_unit') return <AuditDashboard />;
  if (userRole === 'records_unit') return <RecordsDashboard />;
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
  const { user, userRole, loading, needsProfileSetup } = useAuth();
  const isLoginPage = location.pathname === '/login';

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (isLoginPage && user) {
    return <Navigate to="/" replace />;
  }

  if (isLoginPage || !user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (needsProfileSetup) {
    return (
      <Routes>
        <Route path="*" element={<ProfileSetup />} />
      </Routes>
    );
  }

  // Determine which provider(s) to wrap based on role
  const isRecordsUser = userRole === 'records_unit';
  const isStoresUser = ['admin', 'store_manager', 'audit_unit'].includes(userRole);

  const renderRoutes = (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          {/* Home — role-aware */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['admin', 'store_manager', 'audit_unit', 'records_unit']}>
                <HomeRoute />
              </ProtectedRoute>
            }
          />

          {/* Stores routes */}
          <Route path="/inventory" element={<ProtectedRoute allowedRoles={['admin', 'store_manager']}><Inventory /></ProtectedRoute>} />
          <Route path="/receive" element={<ProtectedRoute allowedRoles={['admin', 'store_manager']}><StockIn /></ProtectedRoute>} />
          <Route path="/issue" element={<ProtectedRoute allowedRoles={['admin', 'store_manager']}><StockOut /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute allowedRoles={['admin', 'store_manager']}><Alerts /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />

          {/* Records routes */}
          <Route path="/records" element={<ProtectedRoute allowedRoles={['admin', 'records_unit']}><RecordsDashboard /></ProtectedRoute>} />
          <Route path="/records/upload" element={<ProtectedRoute allowedRoles={['admin', 'records_unit']}><LetterUpload /></ProtectedRoute>} />
          <Route path="/records/view/:id" element={<ProtectedRoute allowedRoles={['admin', 'records_unit']}><LetterView /></ProtectedRoute>} />

          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );

  // Wrap with appropriate context providers
  if (isRecordsUser) {
    return <RecordsProvider>{renderRoutes}</RecordsProvider>;
  }

  if (isStoresUser) {
    return (
      <StoreProvider>
        <RecordsProvider>
          {renderRoutes}
        </RecordsProvider>
      </StoreProvider>
    );
  }

  // Fallback — both providers
  return (
    <StoreProvider>
      <RecordsProvider>
        {renderRoutes}
      </RecordsProvider>
    </StoreProvider>
  );
};

export default App;
