import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Strictly verify session via HttpOnly cookie (Zero tokens in localStorage/sessionStorage)
  const checkAuth = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success && response.data.admin) {
        setAdmin(response.data.admin);
      } else {
        setAdmin(null);
      }
    } catch (error) {
      // 401 unauthenticated is normal on initial load if no cookie is present
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Admin Login
   */
  const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.success && response.data.admin) {
      setAdmin(response.data.admin);
      return response.data;
    }
    throw new Error(response.data.message || 'Login failed');
  };

  /**
   * Admin Logout
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API error:', error.message);
    } finally {
      setAdmin(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        loading,
        login,
        logout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
