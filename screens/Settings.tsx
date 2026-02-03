
import React, { useState } from 'react';
import { useStore, todayStr, generateId } from '../store';
import { Card, Button, Input, Select, formatMoney } from '../components/UI';
import { Download, Upload, AlertTriangle, Activity, ChevronUp, ChevronDown, Trash2, Edit2, Plus, X, Check, Save, Wallet, FileSpreadsheet } from 'lucide-react';
import { HealthLog } from '../types';

export const SettingsScreen: React.FC = () => {
  const { data, updateData, resetData, importData } = useStore();
  const [editingCategory, setEditingCategory] = useState<{ oldName: string, newName: string } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Get current weight from logs to display as default
  const latestWeight = data.healthLogs
    .filter(l => l.type === 'Weight')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.value;

  const handleSaveSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    // Check if weight changed
    const newWeight = parseFloat(fd.get('currentWeight') as string);
    let newHealthLogs = [...data.healthLogs];
    
    if (!isNaN(newWeight) && newWeight !== latestWeight) {
       const newLog: HealthLog = {
         id: generateId(),
         date: todayStr(),
         type: 'Weight',
         value: newWeight
       };
       newHealthLogs = [newLog, ...newHealthLogs];
    }
    
    // Extract Budgets
    const newBudgets: Record<string, number> = {};
    data.settings.expenseCategories.forEach(cat => {
        const val = parseFloat(fd.get(`budget_${cat}`) as string);
        if (val > 0) newBudgets[cat] = val;
    });

    updateData({
      healthLogs: newHealthLogs,
      settings: {
        ...data.settings,
        heightCm: parseFloat(fd.get('height') as string),
        eurRate: parseFloat(fd.get('rate') as string),
        eurRateDate: todayStr(),
        emergencyTarget: parseFloat(fd.get('emergencyTarget') as string),
        categoryBudgets: newBudgets,
        // New Health Goals
        targetWeight: parseFloat(fd.get('targetWeight') as string) || undefined,
        targetDate: fd.get('targetDate') as string || undefined,
        stepTarget: parseFloat(fd.get('stepTarget') as string) || undefined,
        calorieTarget: parseFloat(fd.get('calorieTarget') as string) || undefined,
      }
    });
    alert('Settings saved!');
  };

  // --- Category Management ---
  const categories = data.settings.expenseCategories;

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categories.includes(newCategoryName.trim())) {
      alert('Category already exists');
      return;
    }
    updateData({
      settings: {
        ...data.settings,
        expenseCategories: [...categories, newCategoryName.trim()]
      }
    });
    setNewCategoryName('');
  };

  const deleteCategory = (cat: string) => {
    if (!confirm(`Delete category "${cat}"? Existing expenses will keep this name but you won't be able to select it for new ones.`)) return;
    updateData({
      settings: {
        ...data.settings,
        expenseCategories: categories.filter(c => c !== cat)
      }
    });
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCats = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCats.length) return;
    
    [newCats[index], newCats[targetIndex]] = [newCats[targetIndex], newCats[index]];
    updateData({
      settings: { ...data.settings, expenseCategories: newCats }
    });
  };

  const startRename = (cat: string) => {
    setEditingCategory({ oldName: cat, newName: cat });
  };

  const saveRename = () => {
    if (!editingCategory || !editingCategory.newName.trim()) return;
    const { oldName, newName } = editingCategory;
    const trimmedNew = newName.trim();
    
    if (trimmedNew !== oldName && categories.includes(trimmedNew)) {
      alert('Category name already taken');
      return;
    }

    // Update settings list
    const newCats = categories.map(c => c === oldName ? trimmedNew : c);
    
    // Update existing expenses
    const newExpenses = data.expenses.map(e => e.category === oldName ? { ...e, category: trimmedNew } : e);
    
    // Update budgets keys
    const newBudgets = { ...data.settings.categoryBudgets };
    if (newBudgets[oldName]) {
        newBudgets[trimmedNew] = newBudgets[oldName];
        delete newBudgets[oldName];
    }

    updateData({
      expenses: newExpenses,
      settings: { ...data.settings, expenseCategories: newCats, categoryBudgets: newBudgets }
    });
    setEditingCategory(null);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifetrack_backup_${todayStr()}.json`;
    a.click();
    updateData({ settings: { ...data.settings, lastBackupDate: todayStr() } });
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if(importData(text)) alert("Data imported successfully!");
        else alert("Invalid backup file.");
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleCSVImport = (type: 'Expenses' | 'Investments') => {
      alert(`Importing ${type} from CSV is coming soon. Format: Date, Amount, Note...`);
  };

  return (
    <div className="p-4 pb-24 space-y-6 animate-in fade-in duration-500">
      <Card title="Core Settings">
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <Input name="rate" type="number" step="0.0001" label="EUR to RON Rate" defaultValue={data.settings.eurRate} />
          <p className="text-xs text-slate-500 -mt-2 mb-2 ml-1">Last updated: {data.settings.eurRateDate}</p>
          
          <Input name="emergencyTarget" type="number" label="Emergency Fund Target (RON)" defaultValue={data.settings.emergencyTarget} />
          
          <div className="h-px bg-slate-100 my-6"></div>
          
          <div className="flex items-center gap-2 mb-4">
            <Activity className="text-blue-500" size={20} />
            <h3 className="font-semibold text-slate-700">Health Profile & Goals</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input name="height" type="number" label="Height (cm)" defaultValue={data.settings.heightCm} />
            <Input name="currentWeight" type="number" step="0.1" label="Current Weight (kg)" defaultValue={latestWeight} placeholder={latestWeight ? '' : 'Log weight'} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input name="targetWeight" type="number" step="0.1" label="Target Weight (kg)" defaultValue={data.settings.targetWeight} />
            <Input name="targetDate" type="date" label="Goal Date" defaultValue={data.settings.targetDate} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input name="stepTarget" type="number" label="Steps Target" defaultValue={data.settings.stepTarget} />
            <Input name="calorieTarget" type="number" label="Calorie Target" defaultValue={data.settings.calorieTarget} />
          </div>

          <div className="h-px bg-slate-100 my-6"></div>

          <div className="flex items-center gap-2 mb-4">
            <Wallet className="text-emerald-500" size={20} />
            <h3 className="font-semibold text-slate-700">Category Budgets (Monthly)</h3>
          </div>

          <div className="space-y-3">
             {categories.map(cat => (
                 <div key={cat} className="flex items-center gap-3">
                     <label className="text-xs font-bold text-slate-500 w-1/3 truncate">{cat}</label>
                     <input 
                       name={`budget_${cat}`}
                       type="number" 
                       placeholder="No Limit"
                       defaultValue={data.settings.categoryBudgets[cat] || ''}
                       className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
                     />
                 </div>
             ))}
          </div>
          
          <Button type="submit" className="w-full mt-6" icon={Save}>Save Changes</Button>
        </form>
      </Card>

      <Card title="Expense Categories">
        <div className="space-y-2">
           {categories.map((cat, idx) => (
             <div key={cat} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
               {editingCategory?.oldName === cat ? (
                 <div className="flex-1 flex gap-2 mr-2">
                   <input 
                      autoFocus
                      className="flex-1 p-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      value={editingCategory.newName}
                      onChange={e => setEditingCategory({...editingCategory, newName: e.target.value})}
                   />
                   <button onClick={saveRename} className="text-emerald-600 bg-emerald-100 p-2 rounded-xl"><Check size={16}/></button>
                   <button onClick={() => setEditingCategory(null)} className="text-slate-500 bg-slate-200 p-2 rounded-xl"><X size={16}/></button>
                 </div>
               ) : (
                 <>
                  <div className="flex items-center gap-1">
                    <div className="flex flex-col gap-0.5">
                       <button 
                          disabled={idx === 0}
                          onClick={() => moveCategory(idx, 'up')} 
                          className={`text-slate-400 p-1 ${idx === 0 ? 'opacity-20' : 'hover:text-blue-600'}`}>
                          <ChevronUp size={14} />
                       </button>
                       <button 
                          disabled={idx === categories.length - 1}
                          onClick={() => moveCategory(idx, 'down')} 
                          className={`text-slate-400 p-1 ${idx === categories.length - 1 ? 'opacity-20' : 'hover:text-blue-600'}`}>
                          <ChevronDown size={14} />
                       </button>
                    </div>
                    <span className="text-sm font-medium ml-2 text-slate-700">{cat}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => startRename(cat)} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={16}/></button>
                    <button onClick={() => deleteCategory(cat)} className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                  </div>
                 </>
               )}
             </div>
           ))}
           <div className="flex gap-2 mt-4">
             <input 
                placeholder="New Category" 
                className="flex-1 p-3 border border-slate-200 rounded-2xl text-sm outline-none focus:border-blue-500 transition-colors"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
             />
             <Button variant="secondary" onClick={addCategory} className="px-4 py-2"><Plus size={20}/></Button>
           </div>
        </div>
      </Card>

      <Card title="Data Management">
        <div className="space-y-3">
          {data.settings.lastBackupDate && (
              <div className="text-center text-xs text-slate-500 mb-2">
                  Last backup: <span className="font-bold text-slate-700">{data.settings.lastBackupDate}</span>
              </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={handleExport} icon={Download}>Export JSON</Button>
              <Button variant="ghost" onClick={handleImport} className="border border-slate-200" icon={Upload}>Import JSON</Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
              <Button variant="ghost" onClick={() => handleCSVImport('Expenses')} className="text-xs border border-slate-200" icon={FileSpreadsheet}>Import Expenses CSV</Button>
              <Button variant="ghost" onClick={() => handleCSVImport('Investments')} className="text-xs border border-slate-200" icon={FileSpreadsheet}>Import Inv. CSV</Button>
          </div>

          <div className="h-px bg-slate-100 my-2"></div>
          <Button variant="danger" onClick={() => { if(confirm("Are you sure? This will wipe everything.")) resetData(); }} className="w-full" icon={AlertTriangle}>Reset All Data</Button>
        </div>
      </Card>
    </div>
  );
};
