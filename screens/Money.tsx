import React, { useState, useMemo } from 'react';
import { useStore, generateId, todayStr } from '../store';
import { Card, Button, Input, Select, EmptyState, formatMoney, HeroNumber } from '../components/UI';
import { Plus, Trash2, Edit2, ArrowLeft, X, Search, ChevronDown, PieChart, ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Expense, SavingsBucket, SavingsTransaction, EmergencyTransaction } from '../types';

// Helper: robust date string check to avoid timezone issues with `new Date("YYYY-MM-DD")`
// dateStr is "YYYY-MM-DD". targetMonth is 0-indexed (0=Jan).
const matchesMonth = (dateStr: string, targetYear: number, targetMonth: number) => {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return y === targetYear && (m - 1) === targetMonth;
};

export const MoneyScreen: React.FC = () => {
  const [tab, setTab] = useState<'expenses' | 'savings' | 'emergency'>('expenses');

  return (
    <div className="p-4 pb-24 animate-in fade-in duration-500">
      <div className="flex p-1.5 bg-white border border-slate-200 rounded-2xl mb-8 shadow-sm">
        {[
          { id: 'expenses', label: 'Expenses' },
          { id: 'savings', label: 'Savings' },
          { id: 'emergency', label: 'Emergency' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              tab === t.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-in slide-in-from-bottom-2 duration-300">
        {tab === 'expenses' && <ExpensesView />}
        {tab === 'savings' && <SavingsView />}
        {tab === 'emergency' && <EmergencyView />}
      </div>
    </div>
  );
};

const CategoryPicker: React.FC<{
  categories: string[];
  expenses: Expense[];
  selected: string;
  onSelect: (cat: string) => void;
}> = ({ categories, expenses, selected, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const topCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    expenses.forEach(e => {
      counts[e.category] = (counts[e.category] || 0) + 1;
    });
    return [...categories]
      .sort((a, b) => (counts[b] || 0) - (counts[a] || 0))
      .slice(0, 5)
      .filter(c => (counts[c] || 0) > 0);
  }, [categories, expenses]);

  const filteredCategories = categories.filter(c => 
    c.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Category</label>
      <button 
        type="button" 
        onClick={() => setIsOpen(true)}
        className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-left flex justify-between items-center active:bg-slate-50 transition-colors"
      >
        <span className={selected ? 'text-slate-900 font-medium' : 'text-slate-400'}>
          {selected || 'Select Category'}
        </span>
        <ChevronDown size={16} className="text-slate-400" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
           <div 
             className="bg-white w-full max-w-sm rounded-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
             onClick={(e) => e.stopPropagation()}
           >
              <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                 <Search size={20} className="text-slate-400" />
                 <input 
                   autoFocus
                   placeholder="Search..." 
                   className="flex-1 outline-none text-lg font-medium placeholder:text-slate-300"
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                 />
                 <button onClick={() => setIsOpen(false)} className="bg-slate-100 text-slate-500 p-2 rounded-full hover:bg-slate-200"><X size={20}/></button>
              </div>
              
              <div className="overflow-y-auto p-2 flex-1 space-y-4">
                 {!search && topCategories.length > 0 && (
                   <div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-3 py-2">Frequently Used</div>
                     <div className="grid grid-cols-2 gap-2 px-1">
                        {topCategories.map(cat => (
                          <button 
                            key={cat} 
                            type="button"
                            onClick={() => { onSelect(cat); setIsOpen(false); }}
                            className="text-left p-3 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm hover:bg-blue-100 transition-colors"
                          >
                            {cat}
                          </button>
                        ))}
                     </div>
                   </div>
                 )}

                 <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-3 py-2">All Categories</div>
                    <div className="space-y-1">
                        {filteredCategories.map(cat => (
                          <button 
                            key={cat} 
                            type="button"
                            onClick={() => { onSelect(cat); setIsOpen(false); }}
                            className={`w-full text-left p-3.5 rounded-xl transition-all font-medium text-sm ${selected === cat ? 'bg-slate-900 text-white shadow-md' : 'text-slate-700 hover:bg-slate-50'}`}
                          >
                            {cat}
                          </button>
                        ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const ExpensesView: React.FC = () => {
  const { data, updateData } = useStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  
  // Month Navigation State
  const [viewDate, setViewDate] = useState(new Date());

  const currentMonthExpenses = useMemo(() => {
     const targetYear = viewDate.getFullYear();
     const targetMonth = viewDate.getMonth();
     
     // Filter using strict string comparison to avoid timezone shifts
     return data.expenses.filter(ex => matchesMonth(ex.date, targetYear, targetMonth));
  }, [data.expenses, viewDate]);

  const thisMonthTotal = currentMonthExpenses.reduce((acc, ex) => acc + ex.amount, 0);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    currentMonthExpenses.forEach(ex => {
      stats[ex.category] = (stats[ex.category] || 0) + ex.amount;
    });
    return Object.entries(stats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [currentMonthExpenses]);

  // Comparison Logic
  const comparison = useMemo(() => {
    const targetYear = viewDate.getFullYear();
    const targetMonth = viewDate.getMonth();

    // 1. Prev Month Calculation (Explicit math, no date overflow)
    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }
    
    const prevExpenses = data.expenses.filter(ex => matchesMonth(ex.date, prevYear, prevMonth));
    const prevTotal = prevExpenses.reduce((acc, e) => acc + e.amount, 0);

    // 2. Diff
    const diff = thisMonthTotal - prevTotal;
    let percentStr = '';
    if (prevTotal === 0) {
      percentStr = thisMonthTotal > 0 ? 'New spend' : '0%';
    } else {
      const p = (diff / prevTotal) * 100;
      percentStr = `${p > 0 ? '+' : ''}${p.toFixed(0)}%`;
    }

    // 3. Trend (Last 4 months)
    const trend = [];
    let maxTrend = 1;
    for(let i=3; i>=0; i--) {
      // Calculate month/year for this step
      let trendMonth = targetMonth - i;
      let trendYear = targetYear;
      while (trendMonth < 0) {
        trendMonth += 12;
        trendYear -= 1;
      }
      
      const total = data.expenses
        .filter(ex => matchesMonth(ex.date, trendYear, trendMonth))
        .reduce((acc, e) => acc + e.amount, 0);
      
      if(total > maxTrend) maxTrend = total;

      // Construct date object strictly for formatting label
      const d = new Date(trendYear, trendMonth, 1); 
      trend.push({
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        total,
        isCurrent: i === 0
      });
    }

    return { prevTotal, diff, percentStr, trend, maxTrend };
  }, [data.expenses, viewDate, thisMonthTotal]);

  // Navigation Logic
  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return viewDate.getMonth() === now.getMonth() && viewDate.getFullYear() === now.getFullYear();
  }, [viewDate]);

  const changeMonth = (delta: number) => {
    setViewDate(prev => {
      // Always reset to 1st of the month before shifting to prevent overflow 
      // (e.g., Jan 31 + 1 month -> Mar 3)
      const newDate = new Date(prev.getFullYear(), prev.getMonth(), 1);
      newDate.setMonth(newDate.getMonth() + delta);
      return newDate;
    });
  };

  const jumpToToday = () => setViewDate(new Date());

  const startAdd = () => {
    setEditingExpense(null);
    setSelectedCategory(data.settings.expenseCategories[0] || '');
    setIsFormOpen(true);
  };

  const startEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setSelectedCategory(expense.category);
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const cat = selectedCategory;
    
    if (!cat) {
      alert("Please select a category");
      return;
    }

    const amount = parseFloat(formData.get('amount') as string);
    const merchant = formData.get('merchant') as string;
    const date = formData.get('date') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const notes = formData.get('notes') as string;

    if (editingExpense) {
      // Edit existing
      const updatedExpenses = data.expenses.map(ex => 
        ex.id === editingExpense.id 
          ? { ...ex, amount, merchant, date, category: cat, paymentMethod, notes } 
          : ex
      );
      updateData({ expenses: updatedExpenses });
    } else {
      // Add new
      const newExpense: Expense = {
        id: generateId(),
        amount,
        date,
        category: cat,
        merchant,
        paymentMethod,
        notes,
      };
      updateData({ expenses: [newExpense, ...data.expenses] });
    }
    
    setIsFormOpen(false);
    setEditingExpense(null);
  };

  const requestDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDeleteConfirmationId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmationId) {
      updateData({ expenses: data.expenses.filter(e => e.id !== deleteConfirmationId) });
      if (editingExpense?.id === deleteConfirmationId) {
        setIsFormOpen(false);
        setEditingExpense(null);
      }
      setDeleteConfirmationId(null);
    }
  };

  if (isFormOpen) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <h2 className="font-bold text-2xl text-slate-900">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <Input 
             name="amount" 
             type="number" 
             step="0.01" 
             label="Amount (RON)" 
             required 
             autoFocus 
             className="font-mono text-lg" 
             defaultValue={editingExpense?.amount}
          />
          <Input 
             name="merchant" 
             label="Merchant / Description" 
             required 
             defaultValue={editingExpense?.merchant}
          />
          <CategoryPicker 
            categories={data.settings.expenseCategories} 
            expenses={data.expenses}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
          <Input 
             name="date" 
             type="date" 
             label="Date" 
             defaultValue={editingExpense?.date || todayStr()} 
             required 
          />
          <Input 
             name="paymentMethod" 
             label="Payment Method (Optional)" 
             placeholder="Card, Cash..." 
             defaultValue={editingExpense?.paymentMethod}
          />
          <Input 
             name="notes" 
             label="Notes (Optional)" 
             defaultValue={editingExpense?.notes}
          />
          <div className="flex gap-4 pt-4">
            <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1 shadow-lg">{editingExpense ? 'Save Changes' : 'Save'}</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
         <button onClick={() => changeMonth(-1)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors">
            <ChevronLeft size={20} />
         </button>
         <div className="flex flex-col items-center">
            <span className="font-bold text-slate-900 text-sm">
               {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            {!isCurrentMonth && (
               <button onClick={jumpToToday} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wide flex items-center gap-1 mt-0.5">
                  <Calendar size={10} /> Go to Today
               </button>
            )}
         </div>
         <button 
           onClick={() => changeMonth(1)} 
           disabled={isCurrentMonth}
           className={`p-2 rounded-xl transition-colors ${isCurrentMonth ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
         >
            <ChevronRight size={20} />
         </button>
      </div>

      <Card className="bg-orange-50/50 border-orange-100">
        <div className="flex justify-between items-start mb-6">
           <div>
             <div className="text-orange-900/60 text-xs font-bold uppercase tracking-wider mb-1">
               Spent in {viewDate.toLocaleDateString('en-US', { month: 'short' })}
             </div>
             <HeroNumber value={formatMoney(thisMonthTotal)} subColor="text-orange-900" />
           </div>
           <div className="p-3 bg-orange-100 rounded-2xl text-orange-500">
             <PieChart size={32} />
           </div>
        </div>
        
        {categoryStats.length > 0 && (
          <div className="space-y-3 border-t border-orange-100 pt-4">
             <div className="text-[10px] font-bold text-orange-900/50 uppercase tracking-wide">Top Categories</div>
             {categoryStats.map(([cat, amount]) => (
               <div key={cat} className="flex justify-between items-center text-sm">
                  <span className="font-bold text-orange-900">{cat}</span>
                  <span className="font-medium text-orange-800 bg-orange-100 px-2 py-0.5 rounded-lg">{formatMoney(amount)}</span>
               </div>
             ))}
          </div>
        )}
      </Card>

      {/* Comparison Card */}
      <Card title="Monthly Comparison" className="bg-white border-slate-200">
         <div className="flex justify-between items-center mb-6">
            <div>
               <div className="text-xs text-slate-400 font-medium mb-1">vs Previous Month</div>
               <div className="flex items-center gap-2">
                 <span className="font-bold text-slate-900 text-lg">
                    {comparison.diff > 0 ? '+' : ''}{formatMoney(comparison.diff)}
                 </span>
                 <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${comparison.diff > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {comparison.percentStr}
                 </span>
               </div>
            </div>
            <div className={`p-2 rounded-xl ${comparison.diff > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
               {comparison.diff > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
         </div>
         
         <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">4-Month Trend</div>
            <div className="flex items-end justify-between h-20 gap-2">
               {comparison.trend.map((t, i) => {
                  const height = comparison.maxTrend > 0 ? (t.total / comparison.maxTrend) * 100 : 0;
                  return (
                     <div key={i} className="flex flex-col items-center flex-1 group">
                        <div className="text-[10px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -mt-5">{formatMoney(t.total)}</div>
                        <div 
                           style={{ height: `${Math.max(10, height)}%` }} 
                           className={`w-full rounded-t-lg transition-all duration-500 ${t.isCurrent ? 'bg-orange-400' : 'bg-slate-100'}`}
                        />
                        <div className={`text-[10px] font-bold mt-2 ${t.isCurrent ? 'text-orange-600' : 'text-slate-400'}`}>{t.label}</div>
                     </div>
                  );
               })}
            </div>
         </div>
      </Card>

      <Button className="w-full" onClick={startAdd} icon={Plus}>Add Expense</Button>

      <div className="space-y-4">
        {currentMonthExpenses.slice(0, 50).map(expense => (
          <div 
             key={expense.id} 
             onClick={() => startEdit(expense)}
             className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center active:scale-[0.99] transition-transform cursor-pointer hover:shadow-md"
          >
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-base mb-0.5">{expense.merchant}</span>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wide">{expense.category}</span>
                 <span className="text-xs text-slate-400">{new Date(expense.date).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-bold text-slate-900 text-lg">{formatMoney(expense.amount)}</span>
              <button 
                 type="button"
                 onClick={(e) => requestDelete(e, expense.id)} 
                 className="z-10 p-3 -mr-3 text-slate-300 hover:text-red-500 active:text-red-600 rounded-full transition-all"
                 title="Delete Expense"
              >
                <Trash2 size={20}/>
              </button>
            </div>
          </div>
        ))}
        {currentMonthExpenses.length === 0 && <EmptyState message={`No expenses in ${viewDate.toLocaleDateString('en-US', { month: 'long' })}`} />}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmationId && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center">
                 <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                   <Trash2 size={24} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Expense?</h3>
                 <p className="text-slate-500 text-sm mb-6">This cannot be undone.</p>
                 <div className="flex gap-3 w-full">
                    <Button variant="ghost" onClick={() => setDeleteConfirmationId(null)} className="flex-1 bg-slate-100">Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete} className="flex-1">Delete</Button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const SavingsView: React.FC = () => {
  const { data, updateData } = useStore();
  const [editingBucket, setEditingBucket] = useState<boolean>(false);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);

  const bucketBalances = useMemo(() => {
    return data.savingsBuckets.map(b => {
      const total = data.savingsTransactions
        .filter(t => t.bucketId === b.id)
        .reduce((acc, t) => t.type === 'Add' ? acc + t.amount : acc - t.amount, 0);
      return { ...b, balance: total };
    });
  }, [data.savingsBuckets, data.savingsTransactions]);

  const totalSavings = bucketBalances.reduce((acc, b) => acc + b.balance, 0);

  const handleAddBucket = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newBucket: SavingsBucket = {
      id: generateId(),
      name: fd.get('name') as string,
      target: parseFloat(fd.get('target') as string) || undefined
    };
    updateData({ savingsBuckets: [...data.savingsBuckets, newBucket] });
    setEditingBucket(false);
  };

  if (selectedBucketId) {
    const bucket = bucketBalances.find(b => b.id === selectedBucketId);
    if (!bucket) return null;
    return <BucketDetailView bucket={bucket} onBack={() => setSelectedBucketId(null)} />;
  }

  if (editingBucket) {
    return (
      <form onSubmit={handleAddBucket} className="space-y-6 animate-in slide-in-from-right duration-300">
        <h2 className="font-bold text-2xl text-slate-900">New Savings Bucket</h2>
        <Input name="name" label="Bucket Name" required autoFocus />
        <Input name="target" type="number" label="Target Amount (Optional)" />
        <div className="flex gap-4"><Button variant="ghost" onClick={() => setEditingBucket(false)} className="flex-1">Cancel</Button><Button type="submit" className="flex-1">Create</Button></div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-emerald-50/50 border-emerald-100">
        <div className="text-emerald-900/60 text-xs font-bold uppercase tracking-wider mb-2">Total Savings</div>
        <HeroNumber value={formatMoney(totalSavings)} />
      </Card>
      
      <Button variant="secondary" onClick={() => setEditingBucket(true)} className="w-full" icon={Plus}>New Bucket</Button>

      <div className="space-y-4">
        {bucketBalances.map(b => (
          <div 
            key={b.id} 
            onClick={() => setSelectedBucketId(b.id)}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 active:scale-[0.98] transition-all cursor-pointer hover:shadow-md"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-lg text-slate-900">{b.name}</span>
              <span className="font-extrabold text-lg text-emerald-600">{formatMoney(b.balance)}</span>
            </div>
            {b.target && (
              <div className="space-y-2">
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (b.balance / b.target) * 100)}%` }}></div>
                </div>
                <div className="text-xs font-bold text-slate-400 text-right">
                  Target: {formatMoney(b.target)}
                </div>
              </div>
            )}
            {!b.target && <div className="text-xs text-slate-400 text-right font-medium">No target set</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

const BucketDetailView: React.FC<{ bucket: SavingsBucket & { balance: number }; onBack: () => void }> = ({ bucket, onBack }) => {
  const { data, updateData } = useStore();
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [editingTx, setEditingTx] = useState<SavingsTransaction | null>(null);

  const transactions = data.savingsTransactions
    .filter(t => t.bucketId === bucket.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSaveTx = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = parseFloat(fd.get('amount') as string);
    const date = fd.get('date') as string;
    const type = fd.get('type') as 'Add' | 'Withdraw';
    const notes = fd.get('notes') as string;

    if (formMode === 'add') {
      const newTx: SavingsTransaction = {
        id: generateId(),
        bucketId: bucket.id,
        amount, date, type, notes
      };
      updateData({ savingsTransactions: [newTx, ...data.savingsTransactions] });
    } else if (formMode === 'edit' && editingTx) {
      const updatedTxList = data.savingsTransactions.map(t => 
        t.id === editingTx.id ? { ...t, amount, date, type, notes } : t
      );
      updateData({ savingsTransactions: updatedTxList });
    }
    setFormMode(null);
    setEditingTx(null);
  };

  const handleDeleteTx = (id: string) => {
    if (confirm("Delete this transaction?")) {
      updateData({ savingsTransactions: data.savingsTransactions.filter(t => t.id !== id) });
    }
  };

  if (formMode) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setFormMode(null)} className="w-10 h-10 p-0 rounded-full bg-white border border-slate-200"><ArrowLeft size={20}/></Button>
          <h2 className="font-bold text-xl text-slate-900">{formMode === 'add' ? 'Add Transaction' : 'Edit'}</h2>
        </div>
        <form onSubmit={handleSaveTx} className="space-y-4">
           <Select name="type" label="Type" defaultValue={editingTx?.type || 'Add'}>
            <option value="Add">Deposit (+)</option>
            <option value="Withdraw">Withdraw (-)</option>
          </Select>
          <Input name="amount" type="number" step="0.01" label="Amount" defaultValue={editingTx?.amount} required autoFocus />
          <Input name="date" type="date" label="Date" defaultValue={editingTx?.date || todayStr()} required />
          <Input name="notes" label="Notes" defaultValue={editingTx?.notes} />
          <Button type="submit" className="w-full shadow-lg">Save Transaction</Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack} className="w-10 h-10 p-0 rounded-full bg-white border border-slate-200"><ArrowLeft size={20}/></Button>
        <div>
          <h2 className="font-bold text-xl text-slate-900 leading-tight">{bucket.name}</h2>
          <div className="text-emerald-600 font-bold text-sm">{formatMoney(bucket.balance)}</div>
        </div>
      </div>

      <Button onClick={() => setFormMode('add')} className="w-full" icon={Plus}>Add Transaction</Button>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wide">History</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {transactions.length === 0 ? <div className="p-8 text-center text-slate-400">No transactions</div> : (
            transactions.map(tx => (
              <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-bold text-lg ${tx.type === 'Add' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.type === 'Add' ? '+' : '-'}{formatMoney(tx.amount)}
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs text-slate-400 font-medium">
                     <span>{new Date(tx.date).toLocaleDateString()}</span>
                     {tx.notes && <span>• {tx.notes}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingTx(tx); setFormMode('edit'); }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit2 size={16}/></button>
                  <button onClick={() => handleDeleteTx(tx.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const EmergencyView: React.FC = () => {
  const { data, updateData } = useStore();
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [editingTx, setEditingTx] = useState<EmergencyTransaction | null>(null);

  const balance = data.emergencyTransactions.reduce((acc, t) => t.type === 'Add' ? acc + t.amount : acc - t.amount, 0);
  const history = [...data.emergencyTransactions].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSaveTx = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const amount = parseFloat(fd.get('amount') as string);
    const date = fd.get('date') as string;
    const type = fd.get('type') as 'Add' | 'Withdraw';
    const notes = fd.get('notes') as string;

    if (formMode === 'add') {
      const newTx: EmergencyTransaction = {
        id: generateId(),
        amount, date, type, notes
      };
      updateData({ emergencyTransactions: [newTx, ...data.emergencyTransactions] });
    } else if (formMode === 'edit' && editingTx) {
      const updatedList = data.emergencyTransactions.map(t => 
        t.id === editingTx.id ? { ...t, amount, date, type, notes } : t
      );
      updateData({ emergencyTransactions: updatedList });
    }
    setFormMode(null);
    setEditingTx(null);
  };

  const handleDeleteTx = (id: string) => {
    if (confirm("Delete this entry?")) {
      updateData({ emergencyTransactions: data.emergencyTransactions.filter(t => t.id !== id) });
    }
  };

  if (formMode) {
    return (
      <form onSubmit={handleSaveTx} className="space-y-6 animate-in slide-in-from-right duration-300">
        <h2 className="font-bold text-2xl text-slate-900">{formMode === 'add' ? 'Update Fund' : 'Edit'}</h2>
        <Select name="type" label="Action" defaultValue={editingTx?.type || 'Add'}>
          <option value="Add">Deposit (+)</option>
          <option value="Withdraw">Use Funds (-)</option>
        </Select>
        <Input name="amount" type="number" step="0.01" label="Amount" defaultValue={editingTx?.amount} required autoFocus />
        <Input name="date" type="date" label="Date" defaultValue={editingTx?.date || todayStr()} required />
        <Input name="notes" label="Notes" defaultValue={editingTx?.notes} />
        <div className="flex gap-4">
            <Button variant="ghost" onClick={() => { setFormMode(null); setEditingTx(null); }} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1 shadow-lg">Save</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-red-50/50 border-red-100 text-center py-10">
        <div className="text-red-900/60 text-xs font-bold uppercase tracking-wider mb-2">Emergency Fund</div>
        <div className="text-4xl font-extrabold text-red-600 mb-2 tracking-tight">{formatMoney(balance)}</div>
        {data.settings.emergencyTarget > 0 && (
          <div className="inline-block bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
            Target: {formatMoney(data.settings.emergencyTarget)}
          </div>
        )}
      </Card>

      <Button variant="danger" className="w-full" onClick={() => setFormMode('add')}>Add / Withdraw</Button>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 p-4 border-b border-slate-100">
           <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wide">History</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {history.length === 0 ? <div className="p-8 text-center text-slate-400">No history</div> : (
            history.map(t => (
            <div key={t.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold text-lg ${t.type === 'Add' ? 'text-emerald-600' : 'text-red-600'}`}>{t.type === 'Add' ? '+' : '-'}{formatMoney(t.amount)}</span>
                    </div>
                    <div className="text-xs text-slate-400 font-medium">
                       {new Date(t.date).toLocaleDateString()}
                       {t.notes && <span className="ml-1">• {t.notes}</span>}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setEditingTx(t); setFormMode('edit'); }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit2 size={16}/></button>
                    <button onClick={() => handleDeleteTx(t.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                </div>
            </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};