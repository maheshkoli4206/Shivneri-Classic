import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import ResidentList from './pages/residents/ResidentList';
import MaintenanceManagement from './pages/maintenance/MaintenanceManagement';
import PaymentManagement from './pages/payments/PaymentManagement';
import ExpenseManagement from './pages/expenses/ExpenseManagement';
import ReportsManagement from './pages/reports/ReportsManagement';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Admin Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Super Admin Dashboard Route */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected Resident Registry Route */}
            <Route
              path="/residents"
              element={
                <ProtectedRoute>
                  <ResidentList />
                </ProtectedRoute>
              }
            />

            {/* Protected Monthly Maintenance Engine Route */}
            <Route
              path="/maintenance"
              element={
                <ProtectedRoute>
                  <MaintenanceManagement />
                </ProtectedRoute>
              }
            />

            {/* Protected Manual Payment & Official Receipt Route */}
            <Route
              path="/payments"
              element={
                <ProtectedRoute>
                  <PaymentManagement />
                </ProtectedRoute>
              }
            />

            {/* Protected Expenses & Cashbook Route */}
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <ExpenseManagement />
                </ProtectedRoute>
              }
            />

            {/* Protected Reports & Analytics Route */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportsManagement />
                </ProtectedRoute>
              }
            />

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
