import React, { useState } from 'react';
import { 
  Boxes, 
  PlusCircle, 
  MinusCircle, 
  RefreshCw, 
  Search, 
  AlertTriangle, 
  History, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { Product, StockHistory } from '../types';
import { formatDate } from '../lib/utils';

interface InventoryViewProps {
  products: Product[];
  stockHistory: StockHistory[];
  onOpenStockModal: (product: Product) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  stockHistory,
  onOpenStockModal
}) => {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'logs'>('monitoring');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockProducts = products.filter((p) => p.stock <= (p.minStockAlert || 5));

  return (
    <div className="p-4 lg:p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-500" />
            Manajemen Stok & Inventory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Monitoring sisa pasokan, penyesuaian stok opname, dan riwayat mutasi barang</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'monitoring' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500'
            }`}
          >
            Monitoring Stok ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'logs' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500'
            }`}
          >
            Riwayat Mutasi ({stockHistory.length})
          </button>
        </div>
      </div>

      {/* Low stock summary alert banner */}
      {lowStockProducts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            <span>Terdapat <strong>{lowStockProducts.length} produk</strong> dengan jumlah stok hampir habis. Harap lakukan pembelian/restok.</span>
          </div>
        </div>
      )}

      {/* MONITORING TAB */}
      {activeTab === 'monitoring' && (
        <div className="space-y-4">
          
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama barang di inventory..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase">
                    <th className="p-3.5">Produk</th>
                    <th className="p-3.5">Kategori</th>
                    <th className="p-3.5">Stok Saat Ini</th>
                    <th className="p-3.5">Minimum Alert</th>
                    <th className="p-3.5">Status Stok</th>
                    <th className="p-3.5 text-right">Kelola Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredProducts.map((p) => {
                    const isOut = p.stock <= 0;
                    const isLow = p.stock <= (p.minStockAlert || 5);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-white">{p.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300">{p.categoryName || 'Menu'}</td>
                        <td className="p-3.5 font-extrabold text-sm text-slate-900 dark:text-white">{p.stock} Unit</td>
                        <td className="p-3.5 text-slate-500">{p.minStockAlert || 5} Unit</td>
                        <td className="p-3.5">
                          {isOut ? (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px]">
                              Habis (0)
                            </span>
                          ) : isLow ? (
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px]">
                              Stok Menipis
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                              Aman / Cukup
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => onOpenStockModal(p)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
                          >
                            + Adjust Stok
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase">
                  <th className="p-3.5">Tanggal & Waktu</th>
                  <th className="p-3.5">Produk</th>
                  <th className="p-3.5">Jenis Mutasi</th>
                  <th className="p-3.5">Jumlah</th>
                  <th className="p-3.5">Keterangan</th>
                  <th className="p-3.5">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {stockHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 text-slate-500">{formatDate(log.createdAt)}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{log.productName}</td>
                    <td className="p-3.5">
                      {log.type === 'in' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                          <PlusCircle className="w-3.5 h-3.5" /> Masuk / Restok
                        </span>
                      ) : log.type === 'out' ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                          <MinusCircle className="w-3.5 h-3.5" /> Keluar / Penjualan
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-bold text-blue-600">
                          <RefreshCw className="w-3.5 h-3.5" /> Opname Fix
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-extrabold text-slate-900 dark:text-white">
                      {log.type === 'in' ? `+${log.quantity}` : log.type === 'out' ? `-${log.quantity}` : log.quantity}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">{log.description}</td>
                    <td className="p-3.5 text-slate-500">{log.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
