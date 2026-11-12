import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { ResidentProvider } from './context/ResidentContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import ResidentList from './pages/residents/ResidentList';
import MaintenanceManagement from './pages/maintenance/MaintenanceManagement';
import PaymentManagement from './pages/payments/PaymentManagement';
import ExpenseManagement from './pages/expenses/ExpenseManagement';
import ReportsManagement from './pages/reports/ReportsManagement';
import AdminSettings from './pages/settings/AdminSettings';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ResidentProvider>
          <ErrorBoundary>
            <BrowserRouter>
            <Routes>
              {/* Public Admin Login Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes wrapped in SaaS AppLayout */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route
                  path="/"
                  element={
                    <ErrorBoundary>
                      <Dashboard />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/residents"
                  element={
                    <ErrorBoundary>
                      <ResidentList />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/maintenance"
                  element={
                    <ErrorBoundary>
                      <MaintenanceManagement />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/payments"
                  element={
                    <ErrorBoundary>
                      <PaymentManagement />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/expenses"
                  element={
                    <ErrorBoundary>
                      <ExpenseManagement />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ErrorBoundary>
                      <ReportsManagement />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ErrorBoundary>
                      <AdminSettings />
                    </ErrorBoundary>
                  }
                />
              </Route>

              {/* Fallback redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ErrorBoundary>
        </ResidentProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
