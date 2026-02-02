
import React, { useState, useMemo } from 'react';
import { useStore, generateId, todayStr } from '../store';
import { Card, Button, Input, Select, EmptyState, formatMoney, HeroNumber } from '../components/UI';
import { Plus, Trash2, Edit2, X, Check, Wallet, ChevronLeft, ChevronRight, Calendar, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Asset, AssetType, Snapshot, Deposit } from '../types';

// Helper: robust date string check to avoid timezone issues with `new Date("YYYY-MM-DD")`
const matchesMonth = (dateStr: string, targetYear: number, targetMonth: number) => {
  if (!dateStr) return false;
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return y === targetYear && (m - 1) === targetMonth;
};

export const InvestmentsScreen: React.FC = () => {
  const { data, updateData } = useStore();
  
  // Views
  const [view, setView] = useState<'list' | 'add' | 'deposit' | 'detail'>('list');
  const [listTab, setListTab] = useState<'portfolio' | 'activity'>('portfolio'); // Sub-tab for list view
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  
  // Monthly View State
  const [viewDate, setViewDate] = useState(new Date());

  // Delete Modal State
  const [deleteConfirmAssetId, setDeleteConfirmAssetId] = useState<string | null>(null);

  // --- Portfolio Calculation ---
  const portfolio = useMemo(() => {
    return data.assets.map(asset => {
      // 1. Get Snapshots
      const snapshots = data.snapshots
        .filter(s => s.assetId === asset.id)
        .sort((a, b) => {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return (a.createdAt || 0) - (b.createdAt || 0);
        });
      
      const hasPrice = snapshots.length > 0;
      // Start Price = Earliest snapshot
      const startPrice = hasPrice ? snapshots[0].price : 0;
      // Latest Price = Newest snapshot (Current Market Value)
      const latestPrice = hasPrice ? snapshots[snapshots.length - 1].price : 0;
      
      // 2. Invested Amount
      const assetDeposits = data.deposits.filter(d => d.assetId === asset.id);
      const investedAmount = assetDeposits.reduce((acc, d) => acc + d.amount, 0);

      // 3. Current Valuation
      // If we have a market price, that is the current value. 
      // If not, we fall back to invested amount.
      const currentValue = hasPrice ? latestPrice : investedAmount;

      // 4. Profit/Loss Percentage
      // ((Current Value - Invested) / Invested) * 100
      let priceChangePercent = 0;
      if (investedAmount > 0) {
        priceChangePercent = ((currentValue - investedAmount) / investedAmount) * 100;
      }

      return { 
        ...asset, 
        hasPrice,
        startPrice, 
        latestPrice, 
        priceChangePercent, 
        snapshots,
        investedAmount,
        assetDeposits,
        currentValue
      };
    });
  }, [data.assets, data.snapshots, data.deposits]);

  const totalCurrentValue = portfolio.reduce((acc, a) => acc + a.currentValue, 0);
  const totalInvested = portfolio.reduce((acc, a) => acc + a.investedAmount, 0);

  // --- Monthly Activity Calculation ---
  const activityStats = useMemo(() => {
    const targetYear = viewDate.getFullYear();
    const targetMonth = viewDate.getMonth();

    // 1. Current Month Deposits/Withdrawals
    const currentMonthDeposits = data.deposits.filter(d => matchesMonth(d.date, targetYear, targetMonth));
    
    const totalDeposited = currentMonthDeposits.filter(d => d.amount > 0).reduce((a, b) => a + b.amount, 0);
    const totalWithdrawn = currentMonthDeposits.filter(d => d.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
    const netFlow = totalDeposited - totalWithdrawn;

    // 2. End of Month Value (Portfolio Value at that time)
    // Construct robust EOM date string YYYY-MM-DD
    const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    const endOfMonthStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    let endOfMonthValue = 0;
    data.assets.forEach(asset => {
        // Invested up to EOM
        const invested = data.deposits
            .filter(d => d.assetId === asset.id && d.date <= endOfMonthStr)
            .reduce((sum, d) => sum + d.amount, 0);
            
        // Latest Snapshot up to EOM
        const relevantSnapshots = data.snapshots
            .filter(s => s.assetId === asset.id && s.date <= endOfMonthStr)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
        const lastSnap = relevantSnapshots.length > 0 ? relevantSnapshots[relevantSnapshots.length - 1] : null;
        
        if (lastSnap) {
            endOfMonthValue += lastSnap.price;
        } else {
            endOfMonthValue += invested;
        }
    });

    // 3. Comparison (Prev Month)
    let prevMonth = targetMonth - 1;
    let prevYear = targetYear;
    if (prevMonth < 0) { prevMonth = 11; prevYear -= 1; }
    
    const prevMonthDeposits = data.deposits.filter(d => matchesMonth(d.date, prevYear, prevMonth));
    const prevDeposited = prevMonthDeposits.filter(d => d.amount > 0).reduce((a, b) => a + b.amount, 0);
    const prevWithdrawn = prevMonthDeposits.filter(d => d.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
    const prevNetFlow = prevDeposited - prevWithdrawn;
    
    const netFlowDiff = netFlow - prevNetFlow;
    const netFlowChangePercent = prevNetFlow !== 0 
       ? ((netFlowDiff / Math.abs(prevNetFlow)) * 100).toFixed(0) 
       : (netFlow !== 0 ? 'New' : '0');

    // 4. Trend (Last 4 Months)
    const trend = [];
    let maxTrend = 0;
    for (let i = 3; i >= 0; i--) {
        let tm = targetMonth - i;
        let ty = targetYear;
        while (tm < 0) { tm += 12; ty -= 1; }
        
        const mDeps = data.deposits.filter(d => matchesMonth(d.date, ty, tm));
        const mNet = mDeps.reduce((acc, d) => acc + d.amount, 0);
        
        if (Math.abs(mNet) > maxTrend) maxTrend = Math.abs(mNet);
        
        const dObj = new Date(ty, tm, 1);
        trend.push({
            label: dObj.toLocaleDateString('en-US', { month: 'short' }),
            value: mNet,
            isCurrent: i === 0
        });
    }

    // 5. Top Assets by Net Deposit this month
    const assetMap: Record<string, number> = {};
    currentMonthDeposits.forEach(d => {
        assetMap[d.assetId] = (assetMap[d.assetId] || 0) + d.amount;
    });
    const topAssets = Object.entries(assetMap)
        .map(([id, amount]) => {
            const asset = data.assets.find(a => a.id === id);
            return { name: asset?.name || 'Unknown', amount, id };
        })
        .sort((a, b) => b.amount - a.amount)
        .filter(a => a.amount !== 0)
        .slice(0, 5);

    return { 
        totalDeposited, 
        totalWithdrawn, 
        netFlow, 
        endOfMonthValue,
        prevNetFlow, 
        netFlowDiff, 
        netFlowChangePercent,
        trend,
        maxTrend,
        topAssets
    };

  }, [data.deposits, data.assets, viewDate, data.snapshots]);

  // --- Handlers ---

  const changeMonth = (delta: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev.getFullYear(), prev.getMonth(), 1);
      newDate.setMonth(newDate.getMonth() + delta);
      return newDate;
    });
  };

  const jumpToToday = () => setViewDate(new Date());
  const isCurrentMonth = () => {
      const now = new Date();
      return viewDate.getMonth() === now.getMonth() && viewDate.getFullYear() === now.getFullYear();
  };

  const handleAddAsset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newAssetId = generateId();
    const dateAdded = formData.get('dateAdded') as string || todayStr();
    
    const newAsset: Asset = {
      id: newAssetId,
      name: formData.get('name') as string,
      type: formData.get('type') as AssetType,
      notes: formData.get('notes') as string,
    };

    const initialHoldingsInput = formData.get('initialHoldings') as string;
    const initialHoldings = initialHoldingsInput ? parseFloat(initialHoldingsInput) : 0;
    
    const initialPriceInput = formData.get('initialPrice') as string;
    const initialPrice = initialPriceInput ? parseFloat(initialPriceInput) : 0;

    const newAssets = [...data.assets, newAsset];
    const newDeposits = [...data.deposits];
    const newSnapshots = [...data.snapshots];

    if (initialHoldings > 0) {
      newDeposits.push({
        id: generateId(),
        assetId: newAssetId,
        date: dateAdded,
        amount: initialHoldings,
        note: 'Initial Holdings'
      });
    }

    if (initialPrice > 0) {
        newSnapshots.push({
            id: generateId(),
            assetId: newAssetId,
            date: dateAdded,
            price: initialPrice,
            createdAt: Date.now()
        });
    }

    updateData({ assets: newAssets, deposits: newDeposits, snapshots: newSnapshots });
    setView('list');
  };

  const handleDeposit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const assetId = formData.get('assetId') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const date = formData.get('date') as string;
    const note = formData.get('note') as string;

    const newDeposit: Deposit = {
      id: generateId(),
      assetId,
      amount,
      date,
      note
    };

    updateData({ deposits: [...data.deposits, newDeposit] });
    setView('list');
    setSelectedAssetId(null);
  };

  // Upsert logic for updates
  const handleUpsertSnapshot = (assetId: string, price: number, date: string) => {
    const nextSnapshots = [...data.snapshots];
    const existingIndex = nextSnapshots.findIndex(s => s.assetId === assetId && s.date === date);
    
    if (existingIndex >= 0) {
        // Update existing (upsert)
        nextSnapshots[existingIndex] = {
            ...nextSnapshots[existingIndex],
            price,
            createdAt: Date.now() // Update timestamp to ensure it's latest
        };
    } else {
        // Insert new
        nextSnapshots.push({
            id: generateId(),
            assetId,
            date,
            price,
            createdAt: Date.now()
        });
    }
    // This will trigger a re-render of portfolio and detail view
    updateData({ snapshots: nextSnapshots });
  };

  // --- Delete Logic ---
  const requestDeleteAsset = (assetId: string) => {
    setDeleteConfirmAssetId(assetId);
  };

  const confirmDeleteAsset = () => {
    if (deleteConfirmAssetId) {
       updateData({
        assets: data.assets.filter(a => a.id !== deleteConfirmAssetId),
        snapshots: data.snapshots.filter(s => s.assetId !== deleteConfirmAssetId),
        trades: data.trades.filter(t => t.assetId !== deleteConfirmAssetId), 
        deposits: data.deposits.filter(d => d.assetId !== deleteConfirmAssetId),
      });
      setDeleteConfirmAssetId(null);
      setSelectedAssetId(null);
      setView('list');
    }
  };

  // --- Sub-component Handlers ---
  const handleUpdateSnapshot = (id: string, newDate: string, newPrice: number) => {
    const updatedSnapshots = data.snapshots.map(s => s.id === id ? { ...s, date: newDate, price: newPrice } : s);
    updateData({ snapshots: updatedSnapshots });
  };
  const handleDeleteSnapshot = (id: string) => {
    updateData({ snapshots: data.snapshots.filter(s => s.id !== id) });
  };
  const handleUpdateDeposit = (id: string, newDate: string, newAmount: number, newNote: string) => {
    const updated = data.deposits.map(d => d.id === id ? { ...d, date: newDate, amount: newAmount, note: newNote } : d);
    updateData({ deposits: updated });
  };
  const handleDeleteDeposit = (id: string) => {
    if(confirm("Delete this transaction?")) {
       updateData({ deposits: data.deposits.filter(d => d.id !== id) });
    }
  };


  // --- Render Views ---

  if (view === 'add') {
    return (
      <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Add Investment</h2>
          <Button variant="ghost" onClick={() => setView('list')}>Cancel</Button>
        </div>
        <form onSubmit={handleAddAsset} className="space-y-6">
          <Input name="name" label="Asset Name (e.g., VWCE, BTC)" required autoFocus />
          <Select name="type" label="Type">
            <option value="ETF">ETF</option>
            <option value="Stock">Stock</option>
            <option value="Crypto">Crypto</option>
          </Select>
          
          <div className="space-y-4">
             <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-4">
                <h3 className="font-bold text-blue-800 flex items-center gap-2 text-sm uppercase tracking-wide"><Wallet size={16}/> Initial Values (Optional)</h3>
                <Input name="initialHoldings" type="number" step="0.01" label="Initial Holdings Amount (EUR)" placeholder="e.g. 1000" />
                <Input name="initialPrice" type="number" step="0.01" label="Initial Market Price (EUR)" placeholder="e.g. 110" />
                <Input name="dateAdded" type="date" label="Date Added" defaultValue={todayStr()} required />
                <p className="text-xs text-blue-400 font-medium">Adding an initial price sets a baseline for performance tracking.</p>
             </div>
          </div>
          <Input name="notes" label="Notes (Optional)" />
          <Button type="submit" className="w-full">Save Asset</Button>
        </form>
      </div>
    );
  }

  if (view === 'deposit') {
    return (
      <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300">
         <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Add / Withdraw</h2>
          <Button variant="ghost" onClick={() => setView('list')}>Cancel</Button>
        </div>
        <form onSubmit={handleDeposit} className="space-y-6">
           <Select name="assetId" label="Asset" defaultValue={selectedAssetId || ''} required>
             {portfolio.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
           </Select>
           <Input name="amount" type="number" step="0.01" label="Amount (EUR)" placeholder="Use negative for withdrawal" autoFocus required />
           <Input name="date" type="date" label="Date" defaultValue={todayStr()} required />
           <Input name="note" label="Note (Optional)" />
           <Button type="submit" className="w-full">Save Transaction</Button>
        </form>
      </div>
    );
  }

  if (view === 'detail' && selectedAssetId) {
    const asset = portfolio.find(a => a.id === selectedAssetId);
    if (!asset) return null;

    const chartData = [...asset.snapshots]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => ({ date: s.date, price: s.price }));

    return (
      <DetailView 
        asset={asset} 
        chartData={chartData} 
        onBack={() => { setSelectedAssetId(null); setView('list'); }} 
        onDelete={() => requestDeleteAsset(asset.id)}
        onUpdateSnapshot={handleUpdateSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
        onUpdateDeposit={handleUpdateDeposit}
        onDeleteDeposit={handleDeleteDeposit}
        onUpsertSnapshot={handleUpsertSnapshot}
      />
    );
  }

  // --- Main List View with Tabs ---
  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-500 pb-24">
      {/* View Tabs */}
      <div className="flex p-1 bg-white border border-slate-200 rounded-xl mb-4 shadow-sm">
        <button onClick={() => setListTab('portfolio')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${listTab === 'portfolio' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>Portfolio</button>
        <button onClick={() => setListTab('activity')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${listTab === 'activity' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>Monthly Activity</button>
      </div>

      {listTab === 'portfolio' ? (
        <>
            {/* Portfolio Index Card */}
            <Card variant="primary" className="relative overflow-hidden bg-slate-900">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative z-10">
                <HeroNumber 
                    value={formatMoney(totalCurrentValue, 'EUR')}
                    label="Total Portfolio Value"
                    subValue={`Net Invested: ${formatMoney(totalInvested, 'EUR')}`}
                />
                </div>
            </Card>

            <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setView('add')} icon={Plus} className="px-2 text-xs">New Asset</Button>
                <Button variant="primary" onClick={() => setView('deposit')} icon={Wallet} className="px-2 text-xs">Deposit</Button>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-slate-400 uppercase text-xs tracking-wider px-1">Holdings</h3>
                {portfolio.length === 0 ? (
                <EmptyState message="No assets tracked" />
                ) : (
                portfolio.map(asset => (
                    <div 
                    key={asset.id} 
                    onClick={() => { setSelectedAssetId(asset.id); setView('detail'); }}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all cursor-pointer hover:shadow-md"
                    >
                    <div className="flex justify-between items-start">
                        <div>
                        <div className="font-bold text-lg text-slate-900 mb-1">{asset.name}</div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wide">{asset.type}</span>
                            {asset.hasPrice ? (
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${asset.priceChangePercent >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                  MARKET {asset.priceChangePercent > 0 ? '+' : ''}{asset.priceChangePercent.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide bg-slate-100 text-slate-400">
                                  No market price
                              </span>
                            )}
                        </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <div className="font-extrabold text-lg text-slate-900">
                             {formatMoney(asset.currentValue, 'EUR')}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 font-medium">
                             Invested: {formatMoney(asset.investedAmount, 'EUR')}
                          </div>
                        </div>
                    </div>
                    </div>
                ))
                )}
            </div>
        </>
      ) : (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
             {/* Month Selector */}
            <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors">
                    <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="font-bold text-slate-900 text-sm">
                    {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    {!isCurrentMonth() && (
                    <button onClick={jumpToToday} className="text-[10px] font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wide flex items-center gap-1 mt-0.5">
                        <Calendar size={10} /> Go to Today
                    </button>
                    )}
                </div>
                <button 
                onClick={() => changeMonth(1)} 
                disabled={isCurrentMonth()}
                className={`p-2 rounded-xl transition-colors ${isCurrentMonth() ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    <ChevronRight size={20} />
                </button>
            </div>
            
            {/* Monthly Stats */}
            <div className="grid grid-cols-2 gap-3">
                 <Card className="bg-white border-slate-200">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Net Flow</div>
                    <div className={`text-2xl font-extrabold ${activityStats.netFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {activityStats.netFlow > 0 ? '+' : ''}{formatMoney(activityStats.netFlow, 'EUR')}
                    </div>
                    <div className="flex gap-2 mt-2">
                        <div className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium">
                            +{formatMoney(activityStats.totalDeposited, 'EUR')}
                        </div>
                         <div className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-medium">
                            -{formatMoney(activityStats.totalWithdrawn, 'EUR')}
                        </div>
                    </div>
                 </Card>
                 <Card className="bg-white border-slate-200">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">vs Prev Month</div>
                     <div className="flex items-center gap-1">
                        <div className={`text-lg font-extrabold ${activityStats.netFlowDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                           {activityStats.netFlowDiff > 0 ? '+' : ''}{formatMoney(activityStats.netFlowDiff, 'EUR')}
                        </div>
                     </div>
                     <div className={`text-xs font-bold inline-block px-1.5 py-0.5 rounded mt-1 ${activityStats.netFlowDiff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {activityStats.netFlowChangePercent}%
                     </div>
                 </Card>
            </div>

            {/* End of Month Holdings */}
            <Card className="bg-blue-50/50 border-blue-100">
                <div className="text-blue-900/60 text-xs font-bold uppercase tracking-wider mb-1">Portfolio Value (End of Month)</div>
                <div className="text-3xl font-extrabold text-blue-900">{formatMoney(activityStats.endOfMonthValue, 'EUR')}</div>
                <div className="text-xs text-blue-400 mt-1 font-medium">Total market value at end of month</div>
            </Card>
            
            {/* Trend Chart */}
            <Card className="bg-white border-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-4">4-Month Net Flow Trend</div>
                <div className="flex items-end justify-between h-24 gap-2">
                    {activityStats.trend.map((t, i) => {
                        const height = activityStats.maxTrend > 0 ? (Math.abs(t.value) / activityStats.maxTrend) * 100 : 0;
                        const isPositive = t.value >= 0;
                        return (
                            <div key={i} className="flex flex-col items-center flex-1 group">
                                <div className="text-[10px] font-bold text-slate-400 mb-1">{formatMoney(t.value, 'EUR')}</div>
                                <div className="w-full flex-1 flex flex-col justify-end">
                                    <div 
                                        style={{ height: `${Math.max(4, height)}%` }} 
                                        className={`w-full rounded-md transition-all duration-500 ${t.isCurrent ? (isPositive ? 'bg-emerald-500' : 'bg-red-500') : (isPositive ? 'bg-emerald-200' : 'bg-red-200')}`}
                                    />
                                </div>
                                <div className={`text-[10px] font-bold mt-2 ${t.isCurrent ? 'text-slate-900' : 'text-slate-400'}`}>{t.label}</div>
                            </div>
                        );
                    })}
                </div>
            </Card>
            
            {/* Top Assets */}
            <div className="space-y-3">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">Top Movers</div>
                 {activityStats.topAssets.length === 0 ? <EmptyState message="No activity this month" /> : (
                     activityStats.topAssets.map(asset => (
                         <div key={asset.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                             <div className="font-bold text-slate-900">{asset.name}</div>
                             <div className={`font-bold ${asset.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                 {asset.amount > 0 ? '+' : ''}{formatMoney(asset.amount, 'EUR')}
                             </div>
                         </div>
                     ))
                 )}
            </div>
          </div>
      )}

      {/* Confirmation Modal */}
      {deleteConfirmAssetId && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-xs rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center">
                 <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                   <Trash2 size={24} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Asset?</h3>
                 <p className="text-slate-500 text-sm mb-6">This will remove the asset, its price history, and all deposits.</p>
                 <div className="flex gap-3 w-full">
                    <Button variant="ghost" onClick={() => setDeleteConfirmAssetId(null)} className="flex-1 bg-slate-100">Cancel</Button>
                    <Button variant="danger" onClick={confirmDeleteAsset} className="flex-1">Delete</Button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const DetailView: React.FC<{ 
  asset: any; 
  chartData: any[]; 
  onBack: () => void;
  onDelete: () => void;
  onUpdateSnapshot: (id: string, date: string, price: number) => void;
  onDeleteSnapshot: (id: string) => void;
  onUpdateDeposit: (id: string, date: string, amount: number, note: string) => void;
  onDeleteDeposit: (id: string) => void;
  onUpsertSnapshot: (id: string, price: number, date: string) => void;
}> = ({ asset, chartData, onBack, onDelete, onUpdateSnapshot, onDeleteSnapshot, onUpdateDeposit, onDeleteDeposit, onUpsertSnapshot }) => {
  const [editingSnapId, setEditingSnapId] = useState<string | null>(null);
  const [editingDepId, setEditingDepId] = useState<string | null>(null);
  const [tab, setTab] = useState<'prices' | 'deposits'>('deposits');
  const [isUpdatePriceOpen, setIsUpdatePriceOpen] = useState(false);

  const handleDeleteSnap = (id: string) => {
    if (asset.snapshots.length <= 1) {
      alert("At least one price record is required.");
      return;
    }
    if (confirm("Delete this price record?")) {
      onDeleteSnapshot(id);
    }
  };

  const handleSavePrice = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const price = parseFloat(fd.get('price') as string);
    const date = fd.get('date') as string;
    
    if (price > 0 && date) {
        onUpsertSnapshot(asset.id, price, date);
        setIsUpdatePriceOpen(false);
    }
  };

  const SnapshotRow: React.FC<{ snap: Snapshot }> = ({ snap }) => {
    const isEditing = editingSnapId === snap.id;
    if (isEditing) {
      return (
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const price = parseFloat(fd.get('price') as string);
            const date = fd.get('date') as string;
            if (price > 0 && date) {
              onUpdateSnapshot(snap.id, date, price);
              setEditingSnapId(null);
            }
          }}
          className="flex gap-2 items-center p-3 bg-blue-50/50"
        >
          <div className="flex-1 space-y-2">
            <input name="date" type="date" defaultValue={snap.date} className="w-full p-2 rounded-lg border border-blue-200 text-sm" required />
            <input name="price" type="number" step="0.01" defaultValue={snap.price} className="w-full p-2 rounded-lg border border-blue-200 text-sm font-bold" placeholder="EUR" required />
          </div>
          <div className="flex flex-col gap-2">
            <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg shadow-sm"><Check size={16}/></button>
            <button type="button" onClick={() => setEditingSnapId(null)} className="bg-white text-slate-600 p-2 rounded-lg border"><X size={16}/></button>
          </div>
        </form>
      );
    }

    return (
       <div className="flex justify-between items-center p-4 bg-white border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
         <div>
            <div className="font-bold text-slate-900">{formatMoney(snap.price, 'EUR')}</div>
            <div className="text-xs text-slate-400 font-medium">{new Date(snap.date).toLocaleDateString()}</div>
         </div>
         <div className="flex gap-1">
            <button onClick={() => setEditingSnapId(snap.id)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"><Edit2 size={16} /></button>
            <button onClick={() => handleDeleteSnap(snap.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={16} /></button>
         </div>
       </div>
    );
  };

  const DepositRow: React.FC<{ dep: Deposit }> = ({ dep }) => {
    const isEditing = editingDepId === dep.id;
    if (isEditing) {
      return (
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const amount = parseFloat(fd.get('amount') as string);
            const date = fd.get('date') as string;
            const note = fd.get('note') as string;
            if (!isNaN(amount) && date) {
              onUpdateDeposit(dep.id, date, amount, note);
              setEditingDepId(null);
            }
          }}
          className="flex gap-2 items-center p-3 bg-blue-50/50"
        >
           <div className="flex-1 space-y-2">
             <input name="amount" type="number" step="0.01" defaultValue={dep.amount} className="w-full p-2 rounded-lg border border-blue-200 text-sm font-bold" />
             <input name="date" type="date" defaultValue={dep.date} className="w-full p-2 rounded-lg border border-blue-200 text-sm" />
             <input name="note" defaultValue={dep.note} placeholder="Note" className="w-full p-2 rounded-lg border border-blue-200 text-sm" />
           </div>
           <div className="flex flex-col gap-2">
            <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg shadow-sm"><Check size={16}/></button>
            <button type="button" onClick={() => setEditingDepId(null)} className="bg-white text-slate-600 p-2 rounded-lg border"><X size={16}/></button>
          </div>
        </form>
      );
    }
    return (
      <div className="flex justify-between items-center p-4 bg-white border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
         <div>
            <div className={`font-bold ${dep.amount >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
              {dep.amount >= 0 ? '+' : ''}{formatMoney(dep.amount, 'EUR')}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {new Date(dep.date).toLocaleDateString()}
              {dep.note && <span className="ml-1 text-slate-500">• {dep.note}</span>}
            </div>
         </div>
         <div className="flex gap-1">
            <button onClick={() => setEditingDepId(dep.id)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"><Edit2 size={16} /></button>
            <button onClick={() => onDeleteDeposit(dep.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={16} /></button>
         </div>
       </div>
    );
  }

  return (
    <div className="p-4 pb-24 min-h-screen bg-slate-50 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="w-10 h-10 p-0 rounded-full border border-slate-200 bg-white"><span className="text-xl">←</span></Button>
          <h2 className="text-2xl font-bold text-slate-900">{asset.name}</h2>
        </div>
        <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              onClick={() => setIsUpdatePriceOpen(true)}
              className="h-9 px-3 text-xs flex gap-2 shadow-none border border-emerald-100"
            >
              <Edit2 size={14} /> Update Price
            </Button>
            <Button 
              variant="ghost" 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }} 
              className="w-9 h-9 p-0 rounded-full border border-red-100 bg-red-50 text-red-500 hover:bg-red-100"
            >
              <Trash2 size={16} />
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
             <div>
                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Market Value</div>
                {asset.hasPrice ? (
                    <>
                    <div className="font-extrabold text-2xl text-slate-900">{formatMoney(asset.latestPrice, 'EUR')}</div>
                    <div className={`text-xs font-bold ${asset.priceChangePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {asset.priceChangePercent >= 0 ? '+' : ''}{asset.priceChangePercent.toFixed(1)}%
                    </div>
                    </>
                ) : (
                    <>
                      <div className="font-extrabold text-2xl text-slate-900">{formatMoney(asset.investedAmount, 'EUR')}</div>
                      <div className="text-sm font-medium text-slate-400 mt-1">At Cost</div>
                    </>
                )}
             </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Invested Capital</div>
          <div className="font-extrabold text-xl text-slate-900">{formatMoney(asset.investedAmount, 'EUR')}</div>
        </div>
      </div>

      {isUpdatePriceOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSavePrice} className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
             <h3 className="text-lg font-bold text-slate-900 mb-4">Update Market Price</h3>
             <Input name="price" type="number" step="0.01" label="Total Value (EUR)" defaultValue={asset.latestPrice || ''} autoFocus required className="text-lg font-mono" />
             <Input name="date" type="date" label="Date" defaultValue={todayStr()} required />
             <div className="flex gap-3 pt-2">
               <Button variant="ghost" onClick={() => setIsUpdatePriceOpen(false)} className="flex-1 bg-slate-100">Cancel</Button>
               <Button type="submit" className="flex-1">Save Price</Button>
             </div>
          </form>
        </div>
      )}

      <Card className="h-64 pt-8 mb-6 relative" title="Price History">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" hide />
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(val: number) => [`€${val}`, 'Price']} 
              />
              <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState 
            message="No price history" 
            action={<Button onClick={() => setIsUpdatePriceOpen(true)} className="mt-2 text-xs h-8">Add Price</Button>} 
          />
        )}
      </Card>

      {/* Tabs */}
      <div className="flex p-1 bg-white border border-slate-200 rounded-xl mb-4">
        <button onClick={() => setTab('deposits')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tab === 'deposits' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Deposits & Withdrawals</button>
        <button onClick={() => setTab('prices')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tab === 'prices' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Price History</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm min-h-[200px]">
        {tab === 'prices' ? (
           <div className="divide-y divide-slate-100">
             {asset.snapshots.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No price snapshots yet.</div>}
             {[...asset.snapshots]
                 .sort((a: Snapshot, b: Snapshot) => {
                    const timeA = new Date(a.date).getTime();
                    const timeB = new Date(b.date).getTime();
                    if (timeA !== timeB) return timeB - timeA;
                    return (b.createdAt || 0) - (a.createdAt || 0);
                 })
                 .map((snap: Snapshot) => (
                   <SnapshotRow key={snap.id} snap={snap} />
             ))}
           </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {asset.assetDeposits.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No deposits yet.</div>}
            {[...asset.assetDeposits]
                .sort((a: Deposit, b: Deposit) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((dep: Deposit) => <DepositRow key={dep.id} dep={dep} />)
            }
          </div>
        )}
      </div>
    </div>
  );
};
