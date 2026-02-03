
import React, { useState } from 'react';
import { useStore, generateId, todayStr } from '../store';
import { Card, Button, Input, Select, EmptyState } from '../components/UI';
import { Plus, Activity, Footprints, Flame, Scale } from 'lucide-react';
import { HealthMetricType, HealthLog } from '../types';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

export const HealthScreen: React.FC = () => {
  const { data, updateData } = useStore();
  const [logType, setLogType] = useState<HealthMetricType | null>(null);

  const getLogs = (type: HealthMetricType) => data.healthLogs.filter(l => l.type === type).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const weightLogs = getLogs('Weight');
  const stepLogs = getLogs('Steps');
  const calLogs = getLogs('Calories');

  const currentWeight = weightLogs[0]?.value || 0;
  const startWeight = weightLogs[weightLogs.length - 1]?.value || 0;
  const weightChange = currentWeight - startWeight;
  
  const bmi = data.settings.heightCm > 0 && currentWeight > 0 
    ? (currentWeight / ((data.settings.heightCm / 100) ** 2)).toFixed(1) 
    : '--';
  
  const getBMICategory = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '';
    if (num < 18.5) return 'Underweight';
    if (num < 25) return 'Normal';
    if (num < 30) return 'Overweight';
    return 'Obese';
  };

  const handleLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newLog: HealthLog = {
      id: generateId(),
      date: fd.get('date') as string,
      type: logType!,
      value: parseFloat(fd.get('value') as string)
    };
    updateData({ healthLogs: [newLog, ...data.healthLogs] });
    setLogType(null);
  };

  if (logType) {
    return (
      <div className="p-4 animate-in slide-in-from-right duration-300">
        <h2 className="font-bold text-2xl text-slate-900 mb-6">Log {logType}</h2>
        <form onSubmit={handleLog} className="space-y-6">
          <Input name="value" type="number" step={logType === 'Weight' ? '0.1' : '1'} label="Value" required autoFocus className="text-lg font-mono" />
          <Input name="date" type="date" label="Date" defaultValue={todayStr()} required />
          <div className="flex gap-4"><Button variant="ghost" onClick={() => setLogType(null)} className="flex-1 bg-slate-50">Cancel</Button><Button type="submit" className="flex-1 shadow-lg">Save</Button></div>
        </form>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      <Card>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Current Weight</div>
            <div className="text-4xl font-extrabold text-slate-900">{currentWeight || '--'} <span className="text-lg font-medium text-slate-400">kg</span></div>
            {weightChange !== 0 && (
              <div className={`text-sm font-bold mt-1 ${weightChange > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg total
              </div>
            )}
            {data.settings.targetWeight && (
              <div className="text-xs font-bold text-blue-500 mt-3 bg-blue-50 px-2 py-1 rounded-md inline-block">Goal: {data.settings.targetWeight} kg 
                {data.settings.targetDate && ` by ${new Date(data.settings.targetDate).toLocaleDateString()}`}
              </div>
            )}
          </div>
          <div className="text-right flex flex-col items-end">
             <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">BMI</div>
             <div className="text-4xl font-extrabold text-blue-600">{bmi}</div>
             <div className="text-xs font-bold text-blue-400 mt-2 uppercase tracking-wide bg-blue-50 px-3 py-1 rounded-full">{getBMICategory(bmi as string)}</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setLogType('Weight')} className="flex flex-col items-center justify-center h-24 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-95">
          <div className="bg-emerald-50 p-2.5 rounded-full mb-2"><Scale size={20} className="text-emerald-600" /></div>
          <span className="text-xs font-bold text-slate-600">Weight</span>
        </button>
        <button onClick={() => setLogType('Steps')} className="flex flex-col items-center justify-center h-24 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-95">
          <div className="bg-blue-50 p-2.5 rounded-full mb-2"><Footprints size={20} className="text-blue-600" /></div>
          <span className="text-xs font-bold text-slate-600">Steps</span>
        </button>
        <button onClick={() => setLogType('Calories')} className="flex flex-col items-center justify-center h-24 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-95">
          <div className="bg-orange-50 p-2.5 rounded-full mb-2"><Flame size={20} className="text-orange-600" /></div>
          <span className="text-xs font-bold text-slate-600">Calories</span>
        </button>
      </div>

      <Section 
        title="Weight History" 
        logs={weightLogs} 
        unit="kg" 
        color="#10b981" 
        target={data.settings.targetWeight} 
      />
      <Section 
        title="Steps History" 
        logs={stepLogs} 
        unit="steps" 
        color="#3b82f6" 
        target={data.settings.stepTarget} 
      />
      <Section 
        title="Calories History" 
        logs={calLogs} 
        unit="kcal" 
        color="#f97316" 
        target={data.settings.calorieTarget} 
      />
    </div>
  );
};

const Section: React.FC<{ title: string; logs: HealthLog[]; unit: string; color: string; target?: number }> = ({ title, logs, unit, color, target }) => {
  if (logs.length === 0 && !target) return null;
  if (logs.length === 0) return (
     <div className="space-y-3">
       <div className="flex justify-between">
        <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wide px-1">{title}</h3>
       </div>
       <EmptyState message="No logs yet" />
     </div>
  );

  const chartData = [...logs].reverse().slice(-14);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wide">{title}</h3>
        {target && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Goal: {target} {unit}</span>}
      </div>
      <Card className="h-40 p-4 relative">
        <div className="absolute top-3 right-4 text-[10px] font-bold text-slate-300 uppercase">Last 14 entries</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{r: 3, fill: color, strokeWidth: 0}} activeDot={{r: 6}} />
            {target && <ReferenceLine y={target} stroke="#94a3b8" strokeDasharray="3 3" />}
            <Tooltip 
               contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <div className="space-y-2">
        {logs.slice(0, 3).map(l => (
          <div key={l.id} className="flex justify-between items-center text-sm bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
             <span className="text-slate-500 font-medium">{new Date(l.date).toLocaleDateString()}</span>
             <span className="font-bold text-slate-900">
               {l.value} {unit} 
               {target && (
                 <span className={`text-[10px] ml-2 font-bold px-2 py-0.5 rounded-full ${l.value >= target ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                   {Math.round((l.value / target) * 100)}%
                 </span>
               )}
             </span>
          </div>
        ))}
      </div>
    </div>
  );
};
