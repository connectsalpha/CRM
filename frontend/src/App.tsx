import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './shared/hooks/useAuthStore.js';
import DashboardLayout from './shared/layouts/DashboardLayout.js';

import LoginPage from './modules/auth/LoginPage.js';
import DashboardPage from './modules/dashboard/DashboardPage.js';
import LeadsPage from './modules/leads/LeadsPage.js';
import CustomersPage from './modules/customers/CustomersPage.js';
import CustomerDetailsPage from './modules/customers/CustomerDetailsPage.js';
import FollowupsPage from './modules/followups/FollowupsPage.js';
import QuotationsPage from './modules/quotations/QuotationsPage.js';
import ReportsPage from './modules/reports/ReportsPage.js';
import ProfilePage from './modules/auth/ProfilePage.js';
import UsersPage from './modules/users/UsersPage.js';

import ToastContainer from './shared/components/ToastContainer.js';

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}

export default function App() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute>
                <LeadsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <CustomersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute>
                <CustomerDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/followups"
            element={
              <ProtectedRoute>
                <FollowupsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quotations"
            element={
              <ProtectedRoute>
                <QuotationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </QueryClientProvider>
  );
}
