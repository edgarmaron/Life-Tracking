
export type AssetType = 'ETF' | 'Stock' | 'Crypto';
export type TradeType = 'Buy' | 'Sell';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  notes?: string;
}

export interface Deposit {
  id: string;
  assetId: string;
  date: string;
  amount: number; // EUR
  note?: string;
}

export interface Trade {
  id: string;
  assetId: string;
  date: string;
  type: TradeType;
  units: number;
  price: number;
  fees?: number;
  notes?: string;
}

export interface Snapshot {
  id: string;
  assetId: string;
  date: string;
  price: number;
  createdAt?: number;
}

export interface Expense {
  id: string;
  amount: number;
  date: string;
  category: string;
  merchant: string;
  paymentMethod?: string;
  notes?: string;
}

export interface SavingsBucket {
  id: string;
  name: string;
  target?: number;
}

export interface SavingsTransaction {
  id: string;
  bucketId: string;
  amount: number;
  date: string;
  type: 'Add' | 'Withdraw';
  notes?: string;
}

export interface EmergencyTransaction {
  id: string;
  amount: number;
  date: string;
  type: 'Add' | 'Withdraw';
  notes?: string;
  target?: number; // Only stored in settings/meta really, but for tx we just track movement
}

export type HealthMetricType = 'Weight' | 'Steps' | 'Calories';

export interface HealthLog {
  id: string;
  date: string;
  type: HealthMetricType;
  value: number;
}

export interface Settings {
  heightCm: number;
  eurRate: number;
  eurRateDate: string;
  expenseCategories: string[];
  emergencyTarget: number;
  // Health Goals
  targetWeight?: number;
  targetDate?: string;
  stepTarget?: number;
  calorieTarget?: number;
}

export interface AppData {
  assets: Asset[];
  trades: Trade[];
  deposits: Deposit[];
  snapshots: Snapshot[];
  expenses: Expense[];
  savingsBuckets: SavingsBucket[];
  savingsTransactions: SavingsTransaction[];
  emergencyTransactions: EmergencyTransaction[];
  healthLogs: HealthLog[];
  settings: Settings;
}

export const DEFAULT_CATEGORIES = [
  'Groceries',
  'Eating Out',
  'Car',
  'Transport',
  'Rent / Mortgage',
  'Utilities',
  'Health & Pharmacy',
  'Insurance',
  'Subscriptions',
  'Shopping',
  'Kids',
  'Gifts & Giving',
  'Travel',
  'Personal',
  'Education',
  'Charity',
  'Other'
];

export const INITIAL_DATA: AppData = {
  assets: [],
  trades: [],
  deposits: [],
  snapshots: [],
  expenses: [],
  savingsBuckets: [],
  savingsTransactions: [],
  emergencyTransactions: [],
  healthLogs: [],
  settings: {
    heightCm: 0,
    eurRate: 4.97, // Example default
    eurRateDate: new Date().toISOString(),
    expenseCategories: DEFAULT_CATEGORIES,
    emergencyTarget: 0,
    stepTarget: 10000,
    calorieTarget: 2000,
  }
};
