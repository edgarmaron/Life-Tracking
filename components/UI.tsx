
import React from 'react';
import { LucideIcon } from 'lucide-react';

export const Card: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  title?: string; 
  action?: React.ReactNode;
  variant?: 'primary' | 'secondary';
}> = ({ children, className = '', title, action, variant = 'secondary' }) => {
  const baseStyles = "rounded-2xl p-5 transition-all duration-200";
  const variants = {
    primary: "bg-slate-900 text-white shadow-lg shadow-slate-900/10",
    secondary: "bg-white text-slate-900 shadow-sm border border-slate-100"
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-4">
          {title && (
            <h3 className={`text-sm font-bold uppercase tracking-wide ${variant === 'primary' ? 'text-slate-400' : 'text-slate-500'}`}>
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
  const baseStyles = "h-12 px-6 rounded-xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 text-sm";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200",
    secondary: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
    {label && <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>}
    <input className={`w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white text-slate-900 placeholder:text-slate-400 ${className}`} {...props} />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, children, className = '', ...props }) => (
  <div className="mb-4 w-full">
    {label && <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>}
    <select className={`w-full h-12 px-4 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none bg-white text-slate-900 ${className}`} {...props}>
      {children}
    </select>
  </div>
);

export const EmptyState: React.FC<{ message: string; action?: React.ReactNode }> = ({ message, action }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-500">
    <div className="bg-slate-50 p-4 rounded-full mb-4">
      <div className="text-3xl">🍃</div>
    </div>
    <p className="text-slate-500 font-medium mb-6">{message}</p>
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
    {label && <span className="text-sm font-medium text-slate-400 mb-1">{label}</span>}
    <span className="text-4xl font-extrabold tracking-tight">{value}</span>
    {subValue && (
      <span className={`text-sm font-bold mt-1 ${subColor || 'text-slate-500'}`}>
        {subValue}
      </span>
    )}
  </div>
);
