
import React, { useMemo } from 'react';
import { useStore } from '../store';
import { Card, Button, formatMoney, HeroNumber } from '../components/UI';
import { Plus, ArrowRight } from 'lucide-react';

export const HomeScreen: React.FC<{ setTab: (tab: string) => void }> = ({ setTab }) => {
  const { data } = useStore();

  const stats = useMemo(() => {
    // 1. Investments Logic
    let investmentValueEUR = 0;
    
    data.assets.forEach(asset => {
        const assetSnapshots = data.snapshots
            .filter(s => s.assetId === asset.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const latestSnapshot = assetSnapshots.length > 0 ? assetSnapshots[assetSnapshots.length - 1] : null;

        if (latestSnapshot) {
            investmentValueEUR += latestSnapshot.price;
        } else {
            const assetDeposits = data.deposits.filter(d => d.assetId === asset.id);
            const invested = assetDeposits.reduce((acc, d) => acc + d.amount, 0);
            investmentValueEUR += invested;
        }
    });

    const investmentValueRON = investmentValueEUR * data.settings.eurRate;
    
    // 2. Savings
    const savingsRON = data.savingsBuckets.reduce((acc, b) => {
        const bucketTx = data.savingsTransactions.filter(t => t.bucketId === b.id);
        const balance = bucketTx.reduce((sum, t) => t.type === 'Add' ? sum + t.amount : sum - t.amount, 0);
        return acc + balance;
    }, 0);

    // 3. Emergency
    const emergencyRON = data.emergencyTransactions.reduce((acc, t) => t.type === 'Add' ? acc + t.amount : acc - t.amount, 0);

    // 4. Net Worth
    const netWorthRON = investmentValueRON + savingsRON + emergencyRON;

    // 5. Monthly Expenses
    const currentMonth = new Date().getMonth();
    const expensesRON = data.expenses
        .filter(e => new Date(e.date).getMonth() === currentMonth)
        .reduce((acc, e) => acc + e.amount, 0);

    // 6. Health
    const weightLogs = data.healthLogs.filter(l => l.type === 'Weight').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latestWeight = weightLogs[0]?.value;
    const startWeight = weightLogs[weightLogs.length-1]?.value;
    const weightDiff = (latestWeight && startWeight) ? latestWeight - startWeight : 0;
    const hasWeightLogs = weightLogs.length > 0;

    // BMI
    const heightM = data.settings.heightCm > 0 ? data.settings.heightCm / 100 : 0;
    const bmi = (heightM > 0 && latestWeight) ? (latestWeight / (heightM * heightM)).toFixed(1) : '--';
    
    const getBMICategory = (val: string) => {
        const num = parseFloat(val);
        if (isNaN(num)) return '';
        if (num < 18.5) return 'Underweight';
        if (num < 25) return 'Normal';
        if (num < 30) return 'Overweight';
        return 'Obese';
    };
    const bmiCategory = getBMICategory(bmi);

    return {
        netWorthRON,
        investmentValueEUR,
        investmentValueRON,
        savingsRON,
        emergencyRON,
        expensesRON,
        latestWeight,
        weightDiff,
        bmi,
        bmiCategory,
        hasWeightLogs
    };
  }, [data]);

  return (
    <div className="p-4 space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center px-1 pt-2 pb-2">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">LifeTrack</h1>
        <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-full">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>

      {/* Net Worth Card (The Only Primary Dark Card) */}
      <Card variant="primary">
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Net Worth</div>
          <div className="text-4xl font-extrabold mb-8 tracking-tight text-white">{formatMoney(stats.netWorthRON)}</div>
          
          <div className="space-y-3">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-slate-300 text-sm font-medium">Investments</span>
                  </div>
                  <span className="font-bold text-white tabular-nums">{formatMoney(stats.investmentValueRON)}</span>
              </div>
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-300 text-sm font-medium">Savings</span>
                  </div>
                  <span className="font-bold text-white tabular-nums">{formatMoney(stats.savingsRON)}</span>
              </div>
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-slate-300 text-sm font-medium">Emergency</span>
                  </div>
                  <span className="font-bold text-white tabular-nums">{formatMoney(stats.emergencyRON)}</span>
              </div>
          </div>
        </div>
      </Card>

      {/* Investments Summary (Light) */}
      <Card title="Investments Index" action={<Button variant="ghost" className="h-8 px-3 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setTab('investments')}>View <ArrowRight size={12} /></Button>}>
         <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{formatMoney(stats.investmentValueEUR, 'EUR')}</span>
            <span className="text-xs font-bold text-slate-400">Portfolio Value</span>
         </div>
      </Card>

      {/* Money Summary (Light) */}
      <Card title="Monthly Money">
        <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col items-center text-center">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wide mb-1">Spent</span>
                <span className="text-orange-900 font-bold text-sm">{formatMoney(stats.expensesRON)}</span>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1">Saved</span>
                <span className="text-emerald-900 font-bold text-sm">{formatMoney(stats.savingsRON)}</span>
            </div>
            <div className="p-3 bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center text-center">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide mb-1">Emergency</span>
                <span className="text-red-900 font-bold text-sm">{formatMoney(stats.emergencyRON)}</span>
            </div>
        </div>
      </Card>

      {/* Current Weight + BMI Card (Light) */}
      <Card title="Health" action={stats.hasWeightLogs ? <Button variant="ghost" className="h-8 px-3 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setTab('health')}>History <ArrowRight size={12} /></Button> : null}>
        {!stats.hasWeightLogs ? (
            <div className="flex flex-col items-center justify-center py-2">
                <Button variant="secondary" onClick={() => setTab('health')} icon={Plus} className="w-full">Log First Weight</Button>
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-6 items-end">
                <div>
                   <div className="text-2xl font-extrabold text-slate-900 mb-1">{stats.latestWeight} <span className="text-sm font-medium text-slate-400">kg</span></div>
                   <div className={`text-xs font-bold flex items-center gap-1 ${stats.weightDiff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {stats.weightDiff > 0 ? '+' : ''}{stats.weightDiff.toFixed(1)} kg
                      <span className="text-slate-400 font-medium">total change</span>
                   </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-2xl font-extrabold text-blue-600">{stats.bmi}</span>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide bg-blue-50 px-2 py-1 rounded-full mt-1">{stats.bmiCategory}</span>
                </div>
            </div>
        )}
      </Card>
    </div>
  );
};
