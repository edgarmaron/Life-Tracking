
import React, { useState, useMemo } from 'react';
import { useStore, generateId, todayStr } from '../store';
import { Card, Button, Input, Select, EmptyState } from '../components/UI';
import { Plus, Activity, Footprints, Flame, Scale, Trash2, Edit2, X, Check } from 'lucide-react';
import { HealthMetricType, HealthLog } from '../types';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

export const HealthScreen: React.FC = () => {
  const { data, updateData } = useStore();
  const [logType, setLogType] = useState<HealthMetricType | null>(null);
  const [editingLog, setEditingLog] = useState<HealthLog | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getLogs = (type: HealthMetricType) => data.healthLogs.filter(l => l.type === type).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const weightLogs = getLogs('Weight');
  const stepLogs = getLogs('Steps');
  const calLogs = getLogs('Calories');

  const currentWeight = weightLogs[0]?.value || 0;
  const previousWeight = weightLogs[1]?.value || currentWeight;
  const weightChange = currentWeight - previousWeight;
  const totalChange = weightLogs.length > 0 ? currentWeight - weightLogs[weightLogs.length - 1].value : 0;
  
  const bmiValue = data.settings.heightCm > 0 && currentWeight > 0 
    ? (currentWeight / ((data.settings.heightCm / 100) ** 2))
    : 0;
  
  const bmiFormatted = bmiValue > 0 ? bmiValue.toFixed(1) : '--';
  
  const getBMICategory = (val: number) => {
    if (val === 0) return '';
    if (val < 18.5) return 'Underweight';
    if (val < 25) return 'Normal';
    if (val < 30) return 'Overweight';
    return 'Obese';
  };

  const handleSaveLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const date = fd.get('date') as string;
    const value = parseFloat(fd.get('value') as string);

    if (editingLog) {
        const updatedLogs = data.healthLogs.map(l => l.id === editingLog.id ? { ...l, date, value } : l);
        updateData({ healthLogs: updatedLogs });
        setEditingLog(null);
    } else {
        const newLog: HealthLog = {
            id: generateId(),
            date,
            type: logType!,
            value
        };
        updateData({ healthLogs: [newLog, ...data.healthLogs] });
        setLogType(null);
    }
  };

  const requestDelete = (id: string) => {
      setDeleteId(id);
  };

  const confirmDelete = () => {
      if (deleteId) {
          const updatedLogs = data.healthLogs.filter(l => l.id !== deleteId);
          updateData({ healthLogs: updatedLogs });
          setDeleteId(null);
          if (editingLog?.id === deleteId) {
              setEditingLog(null);
          }
      }
  };

  const startEdit = (log: HealthLog) => {
      setEditingLog(log);
  };

  // Render Form (Add or Edit)
  if (logType || editingLog) {
    const isEdit = !!editingLog;
    const type = isEdit ? editingLog.type : logType!;
    
    return (
      <div className="p-4 animate-in slide-in-from-right duration-300">
        <h2 className="font-bold text-2xl text-slate-900 mb-6">{isEdit ? 'Edit Entry' : `Log ${type}`}</h2>
        <form onSubmit={handleSaveLog} className="space-y-6">
          <Input 
            name="value" 
            type="number" 
            step={type === 'Weight' ? '0.1' : '1'} 
            label={type === 'Weight' ? 'Weight (kg)' : (type === 'Steps' ? 'Count' : 'Calories (kcal)')} 
            defaultValue={editingLog?.value}
            required 
            autoFocus 
            className="text-lg font-mono" 
          />
          <Input name="date" type="date" label="Date" defaultValue={editingLog?.date || todayStr()} required />
          <div className="flex gap-4">
              <Button variant="ghost" onClick={() => { setLogType(null); setEditingLog(null); }} className="flex-1 bg-slate-50">Cancel</Button>
              <Button type="submit" className="flex-1 shadow-lg">Save</Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Weight Summary Card */}
      <Card>
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Current Weight</div>
            <div className="flex items-baseline gap-2">
                <div className="text-4xl font-extrabold text-slate-900">{currentWeight || '--'} <span className="text-lg font-medium text-slate-400">kg</span></div>
            </div>
            
            {weightLogs.length > 1 && (
              <div className="flex gap-3 mt-2">
                  <div className={`text-xs font-bold px-2 py-1 rounded-lg ${weightChange <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg (Latest)
                  </div>
                  {totalChange !== 0 && (
                      <div className={`text-xs font-bold px-2 py-1 rounded-lg ${totalChange <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)} kg (Total)
                      </div>
                  )}
              </div>
            )}

            {data.settings.targetWeight && (
              <div className="text-xs font-bold text-slate-400 mt-3 flex items-center gap-1">
                 Goal: <span className="text-slate-700">{data.settings.targetWeight} kg</span>
                 {data.settings.targetDate && <span className="text-slate-300">• {new Date(data.settings.targetDate).toLocaleDateString()}</span>}
              </div>
            )}
          </div>
          <div className="text-right">
             <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">BMI</div>
             <div className="text-3xl font-extrabold text-blue-600">{bmiFormatted}</div>
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">{getBMICategory(bmiValue)}</div>
          </div>
        </div>

        {/* BMI Bar */}
        {bmiValue > 0 && (
            <div className="relative pt-2 pb-4">
                <div className="h-3 w-full rounded-full flex overflow-hidden">
                    <div className="h-full bg-sky-300" style={{ width: '14%' }} title="Underweight" />
                    <div className="h-full bg-emerald-400" style={{ width: '26%' }} title="Normal" />
                    <div className="h-full bg-amber-400" style={{ width: '20%' }} title="Overweight" />
                    <div className="h-full bg-red-400" style={{ flex: 1 }} title="Obese" />
                </div>
                {/* Marker */}
                <div 
                    className="absolute top-0 w-1 h-full flex flex-col items-center justify-center transition-all duration-500"
                    style={{ 
                        left: `${Math.min(100, Math.max(0, ((bmiValue - 15) / 25) * 100))}%` 
                    }}
                >
                    <div className="w-0.5 h-7 bg-slate-900/80 rounded-full -mt-2"></div>
                </div>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1 uppercase px-0.5">
                    <span>15</span>
                    <span className="pl-4">18.5</span>
                    <span className="pl-6">25</span>
                    <span className="pl-4">30</span>
                    <span>40+</span>
                </div>
            </div>
        )}
      </Card>

      {/* Quick Add Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setLogType('Weight')} className="flex flex-col items-center justify-center h-20 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-95">
          <div className="bg-emerald-50 p-2 rounded-full mb-1"><Scale size={18} className="text-emerald-600" /></div>
          <span className="text-[10px] font-bold text-slate-600">Weight</span>
        </button>
        <button onClick={() => setLogType('Steps')} className="flex flex-col items-center justify-center h-20 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-95">
          <div className="bg-blue-50 p-2 rounded-full mb-1"><Footprints size={18} className="text-blue-600" /></div>
          <span className="text-[10px] font-bold text-slate-600">Steps</span>
        </button>
        <button onClick={() => setLogType('Calories')} className="flex flex-col items-center justify-center h-20 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-95">
          <div className="bg-orange-50 p-2 rounded-full mb-1"><Flame size={18} className="text-orange-600" /></div>
          <span className="text-[10px] font-bold text-slate-600">Calories</span>
        </button>
      </div>

      <HealthSection 
        title="Weight History" 
        logs={weightLogs} 
        unit="kg" 
        color="#10b981" 
        target={data.settings.targetWeight}
        onEdit={startEdit}
        onDelete={requestDelete}
      />
      <HealthSection 
        title="Steps History" 
        logs={stepLogs} 
        unit="steps" 
        color="#3b82f6" 
        target={data.settings.stepTarget}
        onEdit={startEdit}
        onDelete={requestDelete}
      />
      <HealthSection 
        title="Calories History" 
        logs={calLogs} 
        unit="kcal" 
        color="#f97316" 
        target={data.settings.calorieTarget}
        onEdit={startEdit}
        onDelete={requestDelete}
      />

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center">
                 <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-500">
                   <Trash2 size={24} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Entry?</h3>
                 <p className="text-slate-500 text-sm mb-6">This cannot be undone.</p>
                 <div className="flex gap-3 w-full">
                    <Button variant="ghost" onClick={() => setDeleteId(null)} className="flex-1 bg-slate-50">Cancel</Button>
                    <Button variant="danger" onClick={confirmDelete} className="flex-1">Delete</Button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const HealthSection: React.FC<{ 
    title: string; 
    logs: HealthLog[]; 
    unit: string; 
    color: string; 
    target?: number;
    onEdit: (log: HealthLog) => void;
    onDelete: (id: string) => void;
}> = ({ title, logs, unit, color, target, onEdit, onDelete }) => {
  const [showAll, setShowAll] = useState(false);

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
  const displayLogs = showAll ? logs : logs.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-1">
        <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wide">{title}</h3>
        {target && <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Goal: {target} {unit}</span>}
      </div>
      
      {!showAll && (
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
      )}

      <div className="space-y-2">
        {displayLogs.map(l => (
          <div key={l.id} className="flex justify-between items-center text-sm bg-white p-3 rounded-2xl border border-slate-100 shadow-sm group">
             <div className="flex flex-col">
                 <span className="font-bold text-slate-900">
                    {l.value} <span className="text-xs font-normal text-slate-500">{unit}</span>
                 </span>
                 <span className="text-xs text-slate-400 font-medium">{new Date(l.date).toLocaleDateString()}</span>
             </div>
             
             <div className="flex items-center gap-2">
                {target && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${l.value >= target ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                    {Math.round((l.value / target) * 100)}%
                    </span>
                )}
                <div className="flex gap-1 ml-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(l);
                      }} 
                      className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit2 size={16}/>
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(l.id);
                      }} 
                      className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16}/>
                    </button>
                </div>
             </div>
          </div>
        ))}
      </div>
      
      {logs.length > 3 && (
          <Button variant="ghost" onClick={() => setShowAll(!showAll)} className="w-full text-xs h-8">
              {showAll ? 'Show Less' : `View All History (${logs.length})`}
          </Button>
      )}
    </div>
  );
};
