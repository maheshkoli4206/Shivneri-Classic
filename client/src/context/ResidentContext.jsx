import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const ResidentContext = createContext(null);

export const ResidentProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [totalResidentsCount, setTotalResidentsCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch total resident count from the API without filters
   */
  const refreshResidentCount = useCallback(async () => {
    if (!isAuthenticated) {
      setTotalResidentsCount(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/residents');
      if (res.data && res.data.success) {
        const count = res.data.count ?? (Array.isArray(res.data.residents) ? res.data.residents.length : 0);
        setTotalResidentsCount(count);
      }
    } catch (err) {
      console.warn('Failed to load resident count for sidebar/dashboard:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Automatically fetch count on authentication or login
  useEffect(() => {
    if (isAuthenticated) {
      refreshResidentCount();
    } else {
      setTotalResidentsCount(null);
    }
  }, [isAuthenticated, refreshResidentCount]);

  return (
    <ResidentContext.Provider
      value={{
        totalResidentsCount,
        setTotalResidentsCount,
        refreshResidentCount,
        loading,
        error
      }}
    >
      {children}
    </ResidentContext.Provider>
  );
};

export const useResidentContext = () => {
  const context = useContext(ResidentContext);
  if (!context) {
    throw new Error('useResidentContext must be used within a ResidentProvider');
  }
  return context;
};

export default ResidentContext;

