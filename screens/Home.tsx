
import React, { useMemo, useState } from 'react';
import { useStore, todayStr } from '../store';
import { Card, Button, formatMoney, HeroNumber, ProgressBar, StatusBadge } from '../components/UI';
import { Plus, ArrowRight, Wallet, Activity, TrendingUp, X, Sparkles, History, Calendar } from 'lucide-react';
import { HealthMetricType } from '../types';

export const HomeScreen: React.FC<{ setTab: (tab: string) => void }> = ({ setTab }) => {
  const { data, triggerAction } = useStore();
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);

  const stats = useMemo(() => {
    // Investment Value Calculation (Matching Investments.tsx logic)
    const investmentValueEUR = data.assets.reduce((acc, asset) => {
        // Get snapshots sorted descending (newest first)
        const snaps = data.snapshots.filter(s => s.assetId === asset.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latestSnap = snaps[0];
        
        const assetDeposits = data.deposits.filter(d => d.assetId === asset.id);
        const investedAmount = assetDeposits.reduce((sum, d) => sum + d.amount, 0);

        let currentValue = investedAmount;
        
        if (latestSnap) {
             // Add deposits made AFTER the snapshot
             const subsequentFlow = assetDeposits
                .filter(d => d.date > latestSnap.date)
                .reduce((sum, d) => sum + d.amount, 0);
             currentValue = latestSnap.price + subsequentFlow;
        }
        
        return acc + currentValue;
    }, 0);

    const investmentValueRON = investmentValueEUR * data.settings.eurRate;
    
    const savingsRON = data.savingsBuckets.reduce((acc, b) => {
        const bucketTx = data.savingsTransactions.filter(t => t.bucketId === b.id);
        const balance = bucketTx.reduce((sum, t) => t.type === 'Add' ? sum + t.amount : sum - t.amount, 0);
        return acc + balance;
    }, 0);

    const emergencyRON = data.emergencyTransactions.reduce((acc, t) => t.type === 'Add' ? acc + t.amount : acc - t.amount, 0);
    
    // Net Worth Calculation
    const rate = data.settings.eurRate || 4.97;
    const netWorthRON = investmentValueRON + savingsRON + emergencyRON;
    const netWorthEUR = investmentValueEUR + (savingsRON / rate) + (emergencyRON / rate);

    // Monthly Expenses
    const now = new Date();
    const currentMonthExpenses = data.expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((acc, e) => acc + e.amount, 0);

    // Health
    const weightLogs = data.healthLogs.filter(l => l.type === 'Weight').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestWeight = weightLogs[0]?.value;

    // --- SYSTEM HEALTH SCORE ---
    // Money: Green if saving something or net worth growing. Simple proxy: Expense count > 0 is good usage.
    const moneyHealth = data.deposits.some(d => new Date(d.date).getMonth() === now.getMonth()) ? 'good' : 'neutral';
    
    // Health: Green if weight logged in last 7 days
    const lastWeightDate = weightLogs[0] ? new Date(weightLogs[0].date) : null;
    const daysSinceWeight = lastWeightDate ? (now.getTime() - lastWeightDate.getTime()) / (1000 * 3600 * 24) : 999;
    const healthHealth = daysSinceWeight < 7 ? 'good' : (daysSinceWeight < 14 ? 'neutral' : 'bad');

    // Habits: Consistent usage. 
    const habitHealth = 'good'; // Placeholder for consistency score

    // --- FUTURE YOU PROJECTIONS ---
    // Money: Net Worth in 3 Months (EUR)
    const projectedNetWorth3m = netWorthEUR * 1.05; // 5% growth placeholder

    // Health: Avg weight change last 4 weeks
    let weightTrend = 0;
    if (weightLogs.length >= 2) {
       const recent = weightLogs.slice(0, 4);
       if (recent.length > 1) {
         weightTrend = (recent[0].value - recent[recent.length-1].value) / recent.length; // avg change per entry approx
       }
    }
    const projectedWeight4w = latestWeight ? latestWeight + (weightTrend * 4) : 0;

    // --- COACHING ---
    let coachingMsg = null;
    if (daysSinceWeight > 5 && daysSinceWeight < 14) coachingMsg = "You haven't logged weight in a while. Consistency is key.";
    else if (currentMonthExpenses > 2000) coachingMsg = "High spending week. Check your subscriptions?";
    else coachingMsg = "You're on track! Keep going.";

    // --- LONG TERM MEMORY ---
    const memoryMsg = "3 months ago, your Net Worth was 15% lower."; // Static for now

    return {
        netWorthRON,
        netWorthEUR,
        investmentValueEUR,
        investmentValueRON,
        savingsRON,
        emergencyRON,
        moneyHealth,
        healthHealth,
        habitHealth,
        projectedNetWorth3m,
        projectedWeight4w,
        latestWeight,
        coachingMsg,
        memoryMsg,
        currentMonthExpenses
    };
  }, [data]);

  const handleQuickAction = (action: string, tab: string) => {
      triggerAction(action);
      setTab(tab);
  };

  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-500">
      {/* Header with System Health */}
      <div className="flex justify-between items-start pt-2">
        <div>
           <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">LifeTrack</h1>
           <span className="text-xs text-slate-400 font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
        <div className="flex gap-3 bg-white border border-slate-100 p-2 rounded-2xl shadow-sm">
           <StatusBadge status={stats.moneyHealth as any} label="Money" />
           <div className="w-px bg-slate-100 h-6" />
           <StatusBadge status={stats.healthHealth as any} label="Health" />
        </div>
      </div>

      {/* Hero Card */}
      <Card variant="primary">
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Net Worth</div>
          <div className="text-4xl font-extrabold mb-8 tracking-tight text-white">{formatMoney(stats.netWorthEUR, 'EUR')}</div>
          
          <div className="grid grid-cols-3 gap-4">
              <div>
                 <div className="text-slate-400 text-[10px] font-bold uppercase">Invested</div>
                 <div className="text-white font-bold">{formatMoney(stats.investmentValueEUR, 'EUR')}</div>
              </div>
              <div>
                 <div className="text-slate-400 text-[10px] font-bold uppercase">Saved</div>
                 <div className="text-white font-bold">{formatMoney(stats.savingsRON, 'RON')}</div>
              </div>
              <div>
                 <div className="text-slate-400 text-[10px] font-bold uppercase">Emergency</div>
                 <div className="text-white font-bold">{formatMoney(stats.emergencyRON, 'RON')}</div>
              </div>
          </div>
        </div>
      </Card>

      {/* Coaching / Quick Suggestion */}
      {stats.coachingMsg && (
        <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl flex items-center gap-3">
             <div className="bg-emerald-100 p-2 rounded-full text-emerald-600"><Sparkles size={16} /></div>
             <p className="text-sm font-medium text-slate-700 flex-1">{stats.coachingMsg}</p>
             <button className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
      )}

      {/* Future You (Collapsible) */}
      <Card collapsible title="Future You (Projection)">
         <div className="space-y-4 pt-2">
            <div>
               <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                  <span>Net Worth in 3 Months</span>
                  <span className="text-blue-600">{formatMoney(stats.projectedNetWorth3m, 'EUR')}</span>
               </div>
               <ProgressBar value={80} max={100} colorClass="bg-blue-500" />
            </div>
            {stats.latestWeight && (
                <div>
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                        <span>Weight in 4 Weeks</span>
                        <span className="text-emerald-600">{stats.projectedWeight4w.toFixed(1)} kg</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-1/2 rounded-full" />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 text-right">Based on recent trend</div>
                </div>
            )}
         </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
          <button onClick={() => handleQuickAction('addExpense', 'money')} className="bg-white border border-slate-200 shadow-sm p-3 rounded-2xl flex flex-col items-center gap-1 hover:bg-slate-50 active:scale-95 transition-all">
              <div className="text-orange-500 bg-orange-50 p-2 rounded-full mb-1"><Wallet size={18} /></div>
              <span className="text-[10px] font-bold text-slate-600">Add Expense</span>
          </button>
          <button onClick={() => handleQuickAction('logWeight', 'health')} className="bg-white border border-slate-200 shadow-sm p-3 rounded-2xl flex flex-col items-center gap-1 hover:bg-slate-50 active:scale-95 transition-all">
              <div className="text-emerald-500 bg-emerald-50 p-2 rounded-full mb-1"><Activity size={18} /></div>
              <span className="text-[10px] font-bold text-slate-600">Log Health</span>
          </button>
          <button onClick={() => handleQuickAction('deposit', 'investments')} className="bg-white border border-slate-200 shadow-sm p-3 rounded-2xl flex flex-col items-center gap-1 hover:bg-slate-50 active:scale-95 transition-all">
              <div className="text-blue-500 bg-blue-50 p-2 rounded-full mb-1"><TrendingUp size={18} /></div>
              <span className="text-[10px] font-bold text-slate-600">Deposit</span>
          </button>
      </div>

      {/* Weekly Review Trigger */}
      <Button variant="secondary" onClick={() => setShowWeeklyReview(true)} icon={Calendar} className="w-full">
         Weekly Review
      </Button>

      {/* Long Term Memory */}
      <Card>
         <div className="flex items-start gap-3">
            <div className="text-purple-500 bg-purple-50 p-2 rounded-full"><History size={16} /></div>
            <div>
               <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">On This Day</div>
               <p className="text-sm font-medium text-slate-700">{stats.memoryMsg}</p>
            </div>
         </div>
      </Card>

      {/* Weekly Review Modal */}
      {showWeeklyReview && (
         <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="p-4 flex justify-between items-center border-b border-slate-100">
               <h2 className="font-extrabold text-xl text-slate-900">Weekly Review</h2>
               <button onClick={() => setShowWeeklyReview(false)} className="bg-slate-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="text-center py-4">
                   <div className="inline-block bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold mb-2">Oct 23 - Oct 30</div>
                   <h3 className="text-2xl font-bold text-slate-900">A solid week for savings.</h3>
                </div>

                <Card title="Money Summary">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-slate-500 font-medium">Expenses</span>
                       <span className="font-bold text-slate-900">{formatMoney(stats.currentMonthExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-slate-500 font-medium">Saved</span>
                       <span className="font-bold text-emerald-600">{formatMoney(500)}</span>
                    </div>
                </Card>

                <Card title="Health Check">
                    <div className="flex justify-between items-center">
                       <span className="text-slate-500 font-medium">Weight Trend</span>
                       <span className="font-bold text-emerald-600">-0.5 kg</span>
                    </div>
                </Card>

                <Card title="One Win">
                    <p className="text-sm font-medium text-slate-700">You stayed under budget in "Eating Out" for the first time this month!</p>
                </Card>

                <Button onClick={() => setShowWeeklyReview(false)} className="w-full">Close Review</Button>
            </div>
         </div>
      )}

    </div>
  );
};
