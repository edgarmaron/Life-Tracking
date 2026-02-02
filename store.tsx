
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppData, INITIAL_DATA } from './types';

interface StoreContextType {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  resetData: () => void;
  importData: (json: string) => boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEY = 'lifetrack_data_v1';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Defensive coding: Ensure critical arrays and objects exist even if local storage is partial/corrupt
        // This prevents "cannot read properties of undefined" (white screen) errors
        const sanitized: AppData = {
          ...INITIAL_DATA,
          ...parsed,
          settings: { 
            ...INITIAL_DATA.settings, 
            ...(parsed.settings || {}) 
          },
          assets: Array.isArray(parsed.assets) ? parsed.assets : INITIAL_DATA.assets,
          trades: Array.isArray(parsed.trades) ? parsed.trades : INITIAL_DATA.trades,
          deposits: Array.isArray(parsed.deposits) ? parsed.deposits : INITIAL_DATA.deposits,
          snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : INITIAL_DATA.snapshots,
          expenses: Array.isArray(parsed.expenses) ? parsed.expenses : INITIAL_DATA.expenses,
          savingsBuckets: Array.isArray(parsed.savingsBuckets) ? parsed.savingsBuckets : INITIAL_DATA.savingsBuckets,
          savingsTransactions: Array.isArray(parsed.savingsTransactions) ? parsed.savingsTransactions : INITIAL_DATA.savingsTransactions,
          emergencyTransactions: Array.isArray(parsed.emergencyTransactions) ? parsed.emergencyTransactions : INITIAL_DATA.emergencyTransactions,
          healthLogs: Array.isArray(parsed.healthLogs) ? parsed.healthLogs : INITIAL_DATA.healthLogs,
        };

        setData(sanitized);
      }
    } catch (e) {
      console.error("Failed to load data", e);
      // If load fails, we stay with INITIAL_DATA, which is safe.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error("Failed to save data", e);
      }
    }
  }, [data, loaded]);

  const updateData = (newData: Partial<AppData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  const resetData = () => {
    setData(INITIAL_DATA);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear storage", e);
    }
  };

  const importData = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      // Basic validation check
      if (parsed && typeof parsed === 'object') {
        // Apply same sanitization logic as load
        const sanitized: AppData = {
          ...INITIAL_DATA,
          ...parsed,
          settings: { ...INITIAL_DATA.settings, ...(parsed.settings || {}) },
          assets: Array.isArray(parsed.assets) ? parsed.assets : [],
          healthLogs: Array.isArray(parsed.healthLogs) ? parsed.healthLogs : [],
          expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
          snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
          savingsBuckets: Array.isArray(parsed.savingsBuckets) ? parsed.savingsBuckets : [],
          savingsTransactions: Array.isArray(parsed.savingsTransactions) ? parsed.savingsTransactions : [],
          emergencyTransactions: Array.isArray(parsed.emergencyTransactions) ? parsed.emergencyTransactions : [],
          trades: Array.isArray(parsed.trades) ? parsed.trades : [],
          deposits: Array.isArray(parsed.deposits) ? parsed.deposits : [],
        };
        setData(sanitized);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  if (!loaded) return null; // Or a loading spinner if preferred

  return (
    <StoreContext.Provider value={{ data, updateData, resetData, importData }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};

// Helper for unique IDs
export const generateId = () => Math.random().toString(36).substr(2, 9);
export const todayStr = () => new Date().toISOString().split('T')[0];
