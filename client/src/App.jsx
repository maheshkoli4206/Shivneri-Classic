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

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
