
import React from 'react';
import { LucideIcon } from 'lucide-react';

// Design System Constants
// Spacing: 16px padding (p-4), 16px radius (rounded-2xl)
// Colors: Slate-100 for borders, Slate-900 for primary text, Slate-500 for secondary.

export const Card: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  title?: string; 
  action?: React.ReactNode;
  variant?: 'primary' | 'secondary';
}> = ({ children, className = '', title, action, variant = 'secondary' }) => {
  // Primary = Dark Hero (Only for Home Net Worth)
  // Secondary = Standard Light Card (Everywhere else)
  
  const baseStyles = "rounded-2xl p-4 transition-all duration-200 relative overflow-hidden";
  const variants = {
    primary: "bg-slate-900 text-white shadow-xl shadow-slate-900/10",
    secondary: "bg-white text-slate-900 shadow-sm border border-slate-100"
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-4">
          {title && (
            <h3 className={`text-xs font-bold uppercase tracking-wide ${variant === 'primary' ? 'text-slate-400' : 'text-slate-500'}`}>
              {title}
            </h3>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export const Button: React.FC<{
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  icon?: LucideIcon;
}> = ({ onClick, variant = 'primary', children, className = '', type = "button", icon: Icon }) => {
  // Height 48px (h-12), Radius 16px (rounded-2xl)
  const baseStyles = "h-12 px-5 rounded-2xl font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm";
  
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10",
    secondary: "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900"
  };

  return (
    <button type={type} onClick={onClick} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {Icon && <Icon size={18} strokeWidth={2.5} />}
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="mb-4 w-full">
    {label && <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide ml-1">{label}</label>}
    <input 
      className={`w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400 font-medium ${className}`} 
      {...props} 
    />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, children, className = '', ...props }) => (
  <div className="mb-4 w-full">
    {label && <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide ml-1">{label}</label>}
    <div className="relative">
      <select 
        className={`w-full h-12 px-4 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none bg-white text-slate-900 font-medium appearance-none ${className}`} 
        {...props}
      >
        {children}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </div>
    </div>
  </div>
);

export const EmptyState: React.FC<{ message: string; action?: React.ReactNode }> = ({ message, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-500">
    <div className="bg-slate-50 p-4 rounded-full mb-4">
      <span className="text-2xl grayscale opacity-50">🍃</span>
    </div>
    <p className="text-slate-500 font-medium mb-4 text-sm">{message}</p>
    {action}
  </div>
);

export const formatMoney = (amount: number, currency: 'RON' | 'EUR' = 'RON', decimals: number = 2) => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(amount);
};

export const HeroNumber: React.FC<{ value: string; label?: string; subValue?: string; subColor?: string }> = ({ value, label, subValue, subColor }) => (
  <div className="flex flex-col">
    {label && <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</span>}
    <span className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</span>
    {subValue && (
      <span className={`text-xs font-bold mt-1 ${subColor || 'text-slate-500'}`}>
        {subValue}
      </span>
    )}
  </div>
);
