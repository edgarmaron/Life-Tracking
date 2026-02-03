
import React from 'react';
import { Home, TrendingUp, Heart, Wallet, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'investments', icon: TrendingUp, label: 'Invest' },
    { id: 'health', icon: Heart, label: 'Health' },
    { id: 'money', icon: Wallet, label: 'Money' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      <main className="max-w-md mx-auto min-h-screen relative bg-slate-50 shadow-2xl shadow-slate-200 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
          {children}
        </div>
        
        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto">
          <div className="absolute inset-0 bg-white/95 backdrop-blur-md border-t border-slate-100" />
          <div className="relative flex justify-around items-center h-[72px] pb-[max(16px,env(safe-area-inset-bottom))] px-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className="relative flex flex-col items-center justify-center w-full h-full group"
                >
                  <div className={`transition-all duration-300 mb-1 ${isActive ? 'text-blue-600 -translate-y-0.5' : 'text-slate-400 group-hover:text-slate-600'}`}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] font-bold transition-all duration-300 ${isActive ? 'text-blue-600' : 'text-slate-400 opacity-80'}`}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-2 w-1 h-1 bg-blue-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
};
