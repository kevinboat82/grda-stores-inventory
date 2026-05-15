import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import { RecordsProvider } from './context/RecordsContext';
import { DEPARTMENT_ROLE_IDS } from './constants/departmentWorkflow';
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
import CorrespondenceInbox from './pages/CorrespondenceInbox';
import CorrespondenceArchive from './pages/CorrespondenceArchive';
import DepartmentInbox from './pages/DepartmentInbox';
import RaiseMemo from './pages/RaiseMemo';
import AccountNeedsRole from './pages/AccountNeedsRole';
import UserManagement from './pages/UserManagement';
import ActivityLog from './pages/ActivityLog';
import Unauthorized from './pages/Unauthorized';
import ChangePassword from './pages/ChangePassword';

// Home route renders different dashboards based on role
const HomeRoute = () => {
  const { userRole } = useAuth();
  if (!userRole || userRole === 'none') {
    return <AccountNeedsRole />;
  }
  if (userRole === 'audit_unit') return <AuditDashboard />;
  if (userRole === 'records_unit') return <RecordsDashboard />;
  if (userRole === 'ceo_office' || userRole === 'ceo') return <CorrespondenceInbox />;
  if (DEPARTMENT_ROLE_IDS.includes(userRole)) return <DepartmentInbox />;
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
  const { user, userRole, loading, needsProfileSetup, mustChangePassword } = useAuth();
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

  if (mustChangePassword) {
    return (
      <Routes>
        <Route path="*" element={<ChangePassword />} />
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
  const isExecutiveCorrespondence = userRole === 'ceo_office' || userRole === 'ceo';
  const isDepartmentUser = DEPARTMENT_ROLE_IDS.includes(userRole);
  const isStoresUser = ['admin', 'store_manager', 'audit_unit'].includes(userRole);

  const letterViewRoles = ['admin', 'records_unit', 'ceo_office', 'ceo', ...DEPARTMENT_ROLE_IDS];
  const memoCreatorRoles = ['admin', 'records_unit', 'ceo_office', 'ceo', ...DEPARTMENT_ROLE_IDS];

  const renderRoutes = (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          {/* Home — role-aware */}
          <Route
            path="/"
            element={
              <ProtectedRoute
                allowedRoles={['admin', 'store_manager', 'audit_unit', 'records_unit', 'ceo_office', 'ceo', 'none', ...DEPARTMENT_ROLE_IDS]}
              >
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
          <Route path="/activity-log" element={<ProtectedRoute allowedRoles={['admin']}><ActivityLog /></ProtectedRoute>} />

          {/* Records routes */}
          <Route path="/records" element={<ProtectedRoute allowedRoles={['admin', 'records_unit']}><RecordsDashboard /></ProtectedRoute>} />
          <Route path="/records/upload" element={<ProtectedRoute allowedRoles={['admin', 'records_unit']}><LetterUpload /></ProtectedRoute>} />
          <Route path="/records/view/:id" element={<ProtectedRoute allowedRoles={letterViewRoles}><LetterView /></ProtectedRoute>} />
          <Route path="/correspondence/raise-memo" element={<ProtectedRoute allowedRoles={memoCreatorRoles}><RaiseMemo /></ProtectedRoute>} />

          <Route
            path="/correspondence/archive"
            element={
              <ProtectedRoute allowedRoles={['admin', 'ceo_office', 'ceo']}>
                <CorrespondenceArchive />
              </ProtectedRoute>
            }
          />

          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );

  // Wrap with appropriate context providers
  if (isRecordsUser || isExecutiveCorrespondence || isDepartmentUser) {
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
