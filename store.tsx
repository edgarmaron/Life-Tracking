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
        setData({ ...INITIAL_DATA, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, loaded]);

  const updateData = (newData: Partial<AppData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  const resetData = () => {
    setData(INITIAL_DATA);
  };

  const importData = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      // Basic validation check
      if (parsed && typeof parsed === 'object') {
        setData({ ...INITIAL_DATA, ...parsed });
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  if (!loaded) return null;

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