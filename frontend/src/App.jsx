import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const InfluencerDetail = lazy(() => import('./pages/InfluencerDetail'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
const Influencers = lazy(() => import('./pages/Influencers'));
const SysAdmin = lazy(() => import('./pages/SysAdmin'));

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, authLoading, user } = useApp();
  if (authLoading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (requireAdmin && user?.role !== 'system_admin') {
    return <Navigate to="/" replace />;
  }
  return <Layout>{children}</Layout>;
};

const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<div className="p-6 text-sm text-gray-600 dark:text-gray-300">Carregando...</div>}>
    {children}
  </Suspense>
);

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={
        <SuspenseWrapper>
          <Login />
        </SuspenseWrapper>
      } />
      <Route path="/" element={
        <SuspenseWrapper>
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </SuspenseWrapper>
      } />
      <Route path="/influencer/:id" element={
        <SuspenseWrapper>
          <ProtectedRoute>
            <InfluencerDetail />
          </ProtectedRoute>
        </SuspenseWrapper>
      } />
      <Route path="/reports" element={
        <SuspenseWrapper>
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        </SuspenseWrapper>
      } />
      <Route path="/influencers" element={
        <SuspenseWrapper>
          <ProtectedRoute>
            <Influencers />
          </ProtectedRoute>
        </SuspenseWrapper>
      } />
      <Route path="/sysadmin" element={
        <SuspenseWrapper>
          <ProtectedRoute requireAdmin>
            <SysAdmin />
          </ProtectedRoute>
        </SuspenseWrapper>
      } />
      <Route path="/users" element={
        <SuspenseWrapper>
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        </SuspenseWrapper>
      } />
    </Routes>
  );
};

function App() {
  return (
    <AppProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppProvider>
  );
}

export default App;
