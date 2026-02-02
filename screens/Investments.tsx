import React, { useState, useMemo } from 'react';
import { useStore, generateId, todayStr } from '../store';
import { Card, Button, Input, Select, EmptyState, formatMoney, HeroNumber } from '../components/UI';
import { Plus, TrendingUp, DollarSign, Trash2, Edit2, X, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Asset, AssetType, Snapshot } from '../types';

export const InvestmentsScreen: React.FC = () => {
  const { data, updateData } = useStore();
  const [view, setView] = useState<'list' | 'add' | 'detail' | 'updatePrices'>('list');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const portfolio = useMemo(() => {
    return data.assets.map(asset => {
      const snapshots = data.snapshots
        .filter(s => s.assetId === asset.id)
        .sort((a, b) => {
          const timeA = new Date(a.date).getTime();
          const timeB = new Date(b.date).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return (a.createdAt || 0) - (b.createdAt || 0);
        });
      
      const startPrice = snapshots.length > 0 ? snapshots[0].price : 0;
      const latestPrice = snapshots.length > 0 ? snapshots[snapshots.length - 1].price : 0;
      
      const change = latestPrice - startPrice;
      const changePercent = startPrice > 0 ? (change / startPrice) * 100 : 0;

      return { ...asset, startPrice, latestPrice, change, changePercent, snapshots };
    });
  }, [data.assets, data.snapshots]);

  const portfolioValue = portfolio.reduce((acc, a) => acc + a.latestPrice, 0);
  const portfolioStart = portfolio.reduce((acc, a) => acc + a.startPrice, 0);
  const portfolioReturn = portfolioValue - portfolioStart;
  const portfolioReturnPercent = portfolioStart > 0 ? (portfolioReturn / portfolioStart) * 100 : 0;

  const handleAddAsset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newAssetId = generateId();
    
    const newAsset: Asset = {
      id: newAssetId,
      name: formData.get('name') as string,
      type: formData.get('type') as AssetType,
      notes: formData.get('notes') as string,
    };

    const priceInput = formData.get('initialPrice') as string;
    const price = priceInput ? parseFloat(priceInput) : 0;
    const dateAdded = formData.get('dateAdded') as string || todayStr();

    const newAssets = [...data.assets, newAsset];
    const newSnapshots = [...data.snapshots];

    if (price > 0) {
      newSnapshots.push({
        id: generateId(),
        assetId: newAssetId,
        date: dateAdded,
        price: price,
        createdAt: Date.now()
      });
    }

    updateData({ assets: newAssets, snapshots: newSnapshots });
    setView('list');
  };

  const handleUpdatePrices = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newSnapshots = [...data.snapshots];
    const today = todayStr();
    
    portfolio.forEach(asset => {
      const priceStr = formData.get(`price_${asset.id}`);
      if (priceStr) {
        const price = parseFloat(priceStr as string);
        if (!isNaN(price) && price > 0) {
          newSnapshots.push({
            id: generateId(),
            assetId: asset.id,
            date: today,
            price,
            createdAt: Date.now()
          });
        }
      }
    });
    updateData({ snapshots: newSnapshots });
    setView('list');
  };

  const handleDeleteAsset = (assetId: string) => {
    if (confirm("Delete this asset?")) {
      updateData({
        assets: data.assets.filter(a => a.id !== assetId),
        snapshots: data.snapshots.filter(s => s.assetId !== assetId),
        trades: data.trades.filter(t => t.assetId !== assetId), 
      });
      setView('list');
      setSelectedAssetId(null);
    }
  };

  const handleUpdateSnapshot = (id: string, newDate: string, newPrice: number) => {
    const updatedSnapshots = data.snapshots.map(s => 
      s.id === id ? { ...s, date: newDate, price: newPrice } : s
    );
    updateData({ snapshots: updatedSnapshots });
  };

  const handleDeleteSnapshot = (id: string) => {
    const updatedSnapshots = data.snapshots.filter(s => s.id !== id);
    updateData({ snapshots: updatedSnapshots });
  };

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
          
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
             <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide"><DollarSign size={16}/> Price Info</h3>
             <Input name="initialPrice" type="number" step="0.01" label="Current Price (EUR)" placeholder="e.g. 120.50" required />
             <Input name="dateAdded" type="date" label="Date Added" defaultValue={todayStr()} required />
             <p className="text-xs text-slate-400 font-medium">This will be your "Start Price" baseline.</p>
          </div>

          <Input name="notes" label="Notes (Optional)" />
          <Button type="submit" className="w-full">Save Asset</Button>
        </form>
      </div>
    );
  }

  if (view === 'updatePrices') {
    return (
      <div className="p-4 pb-24 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-50/95 backdrop-blur-sm py-4 z-10 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Update Prices</h2>
          <Button variant="ghost" onClick={() => setView('list')}>Cancel</Button>
        </div>
        <form onSubmit={handleUpdatePrices} className="space-y-4">
          {portfolio.map(asset => (
            <div key={asset.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between mb-3">
                <span className="font-bold text-slate-900 text-lg">{asset.name}</span>
                <span className="text-sm font-medium text-slate-400">Prev: €{asset.latestPrice}</span>
              </div>
              <Input 
                name={`price_${asset.id}`} 
                type="number" 
                step="0.01" 
                defaultValue={asset.latestPrice}
                placeholder="New Price EUR" 
                className="font-mono text-lg"
              />
            </div>
          ))}
          <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto">
             <Button type="submit" className="w-full shadow-2xl">Save All Prices</Button>
          </div>
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
        onDelete={() => handleDeleteAsset(asset.id)}
        onUpdateSnapshot={handleUpdateSnapshot}
        onDeleteSnapshot={handleDeleteSnapshot}
      />
    );
  }

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-500 pb-24">
      {/* Portfolio Index Card */}
      <Card variant="primary" className="relative overflow-hidden bg-slate-900">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="relative z-10">
          <HeroNumber 
              value={formatMoney(portfolioValue, 'EUR')}
              label="Portfolio Index Value"
              subValue={`${portfolioReturn >= 0 ? '+' : ''}${formatMoney(portfolioReturn, 'EUR')} (${portfolioReturn >= 0 ? '+' : ''}${portfolioReturnPercent.toFixed(1)}%)`}
              subColor={portfolioReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Button variant="secondary" onClick={() => setView('add')} icon={Plus}>Add Asset</Button>
        <Button variant="primary" onClick={() => setView('updatePrices')} icon={TrendingUp}>Update Prices</Button>
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
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-lg text-slate-900 mb-1">{asset.name}</div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wide">{asset.type}</span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="font-extrabold text-lg text-slate-900">{formatMoney(asset.latestPrice, 'EUR')}</div>
                  <div className={`text-sm font-bold ${asset.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {asset.changePercent > 0 ? '+' : ''}{asset.changePercent.toFixed(1)}%
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-medium">Start: {formatMoney(asset.startPrice, 'EUR')}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
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
}> = ({ asset, chartData, onBack, onDelete, onUpdateSnapshot, onDeleteSnapshot }) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDeleteSnap = (id: string) => {
    if (asset.snapshots.length <= 1) {
      alert("At least one price record is required.");
      return;
    }
    if (confirm("Delete this price record?")) {
      onDeleteSnapshot(id);
    }
  };

  const SnapshotRow: React.FC<{ snap: Snapshot }> = ({ snap }) => {
    const isEditing = editingId === snap.id;
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
              setEditingId(null);
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
            <button type="button" onClick={() => setEditingId(null)} className="bg-white text-slate-600 p-2 rounded-lg border"><X size={16}/></button>
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
            <button onClick={() => setEditingId(snap.id)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"><Edit2 size={16} /></button>
            <button onClick={() => handleDeleteSnap(snap.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={16} /></button>
         </div>
       </div>
    );
  };

  return (
    <div className="p-4 pb-24 min-h-screen bg-slate-50 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="w-10 h-10 p-0 rounded-full border border-slate-200 bg-white"><span className="text-xl">←</span></Button>
          <h2 className="text-2xl font-bold text-slate-900">{asset.name}</h2>
        </div>
        <Button variant="ghost" onClick={onDelete} className="text-red-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={20} /></Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Start</div>
          <div className="font-bold text-slate-900">{formatMoney(asset.startPrice, 'EUR')}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Latest</div>
          <div className="font-bold text-slate-900">{formatMoney(asset.latestPrice, 'EUR')}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Change</div>
          <div className={`font-bold ${asset.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
             {asset.change >= 0 ? '+' : ''}{asset.changePercent.toFixed(1)}%
          </div>
        </div>
      </div>

      <Card className="h-72 pt-8 mb-6 relative" title="Price History">
        <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">All Time</div>
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
        ) : <EmptyState message="No data" />}
      </Card>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 p-4 border-b border-slate-100">
           <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wide">History Log</h3>
        </div>
        <div className="divide-y divide-slate-100">
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
      </div>
    </div>
  );
};