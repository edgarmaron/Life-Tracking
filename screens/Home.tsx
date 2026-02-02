
import React, { useMemo } from 'react';
import { useStore } from '../store';
import { Card, Button, formatMoney, HeroNumber } from '../components/UI';
import { Plus } from 'lucide-react';

export const HomeScreen: React.FC<{ setTab: (tab: string) => void }> = ({ setTab }) => {
  const { data } = useStore();

  const stats = useMemo(() => {
    // 1. Investments Logic
    // Calculated as: For each asset, use Latest Price (Market Value) if available, otherwise Invested Amount.
    let investmentValueEUR = 0;
    
    data.assets.forEach(asset => {
        // Find latest snapshot
        const assetSnapshots = data.snapshots
            .filter(s => s.assetId === asset.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const latestSnapshot = assetSnapshots.length > 0 ? assetSnapshots[assetSnapshots.length - 1] : null;

        if (latestSnapshot) {
            investmentValueEUR += latestSnapshot.price;
        } else {
            // Fallback to deposits
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
    <div className="p-4 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-center px-1 pt-2">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">LifeTrack</h1>
        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      </div>

      {/* Net Worth Card (Primary) */}
      <Card variant="primary" className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <div className="relative z-10">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Net Worth</div>
          <div className="text-4xl font-extrabold mb-6 tracking-tight text-white">{formatMoney(stats.netWorthRON)}</div>
          
          <div className="space-y-3">
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    <span className="text-slate-300 text-sm font-medium">Investments (Est.)</span>
                  </div>
                  <span className="font-bold text-white">{formatMoney(stats.investmentValueRON)}</span>
              </div>
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                    <span className="text-slate-300 text-sm font-medium">Savings</span>
                  </div>
                  <span className="font-bold text-white">{formatMoney(stats.savingsRON)}</span>
              </div>
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                    <span className="text-slate-300 text-sm font-medium">Emergency</span>
                  </div>
                  <span className="font-bold text-white">{formatMoney(stats.emergencyRON)}</span>
              </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 text-[10px] text-slate-400 font-medium">
              1 EUR = {data.settings.eurRate} RON
          </div>
        </div>
      </Card>

      {/* Investments Summary (Primary) */}
      <Card variant="primary" className="bg-slate-800" title="Investments Index" action={<Button variant="ghost" className="text-xs px-3 py-1.5 h-auto text-blue-200 hover:text-white hover:bg-white/10" onClick={() => setTab('investments')}>View</Button>}>
        <div className="flex justify-between items-end">
             <HeroNumber 
               value={formatMoney(stats.investmentValueEUR, 'EUR')}
               label="Portfolio Value"
               subValue="Current market value"
               subColor="text-slate-400"
             />
        </div>
      </Card>

      {/* Money Summary (Secondary) */}
      <Card title="Monthly Money">
        <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                <div className="text-orange-900 font-extrabold text-lg">{formatMoney(stats.expensesRON)}</div>
                <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wide mt-1">Spent</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-emerald-900 font-extrabold text-lg">{formatMoney(stats.savingsRON)}</div>
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mt-1">Saved</div>
            </div>
            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                <div className="text-red-900 font-extrabold text-lg">{formatMoney(stats.emergencyRON)}</div>
                <div className="text-[10px] font-bold text-red-600 uppercase tracking-wide mt-1">Emerg.</div>
            </div>
        </div>
      </Card>

      {/* Current Weight + BMI Card (Secondary) */}
      <Card title="Current Weight" action={stats.hasWeightLogs ? <Button variant="ghost" className="text-xs px-3 py-1.5 h-auto" onClick={() => setTab('health')}>History</Button> : null}>
        {!stats.hasWeightLogs ? (
            <div className="flex flex-col items-center justify-center py-4">
                <div className="text-slate-400 text-sm font-medium mb-4">No weight logged yet</div>
                <Button variant="primary" onClick={() => setTab('health')} icon={Plus} className="w-full">Log Weight</Button>
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <HeroNumber 
                      value={`${stats.latestWeight} kg`} 
                      subValue={stats.weightDiff !== 0 ? `${stats.weightDiff > 0 ? '+' : ''}${stats.weightDiff.toFixed(1)} kg` : 'No change'}
                      subColor={stats.weightDiff > 0 ? 'text-red-500' : 'text-emerald-500'}
                    />
                    {data.settings.targetWeight && (
                        <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-md inline-block mt-3">
                            Goal: {data.settings.targetWeight} kg
                        </div>
                    )}
                </div>
                <div className="text-right flex flex-col items-end">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-1">BMI</span>
                    <span className="text-3xl font-extrabold text-blue-600">{stats.bmi}</span>
                    <span className="text-xs font-bold text-blue-400 mt-1 uppercase tracking-wide bg-blue-50 px-2 py-0.5 rounded-full">{stats.bmiCategory}</span>
                </div>
            </div>
        )}
      </Card>
    </div>
  );
};
