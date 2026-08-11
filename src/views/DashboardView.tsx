import React, { useState } from 'react';
import { 
  TrendingUp, 
  Receipt, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  ArrowUpRight, 
  Calendar, 
  ShoppingCart,
  Award,
  ChevronRight,
  Boxes
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  CartesianGrid 
} from 'recharts';
import { DashboardStats, Product, Transaction, User } from '../types';
import { formatDate, formatRupiah } from '../lib/utils';

interface DashboardViewProps {
  stats: DashboardStats | null;
  currentUser: User;
  onNavigateTab: (tab: any) => void;
  onRestockProduct: (product: Product) => void;
  onViewTransaction: (transaction: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  currentUser,
  onNavigateTab,
  onRestockProduct,
  onViewTransaction
}) => {
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'monthly'>('daily');

  if (!stats) {
    return (
      <div className="p-8 text-center text-slate-500 animate-pulse">
        Memuat data dashboard statistik KasirPro...
      </div>
    );
  }

  const chartData = chartPeriod === 'daily' ? stats.salesByDay : stats.salesByMonth;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
        
        <div className="relative z-10">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-2 border border-emerald-500/30">
            Aktivitas Toko Hari Ini
          </span>
          <h2 className="text-2xl font-black tracking-tight">
            Selamat Datang, {currentUser.name}!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Sistem KasirPro aktif. Kelola transaksi, pantau stok, dan evaluasi performa bisnis toko Anda secara real-time.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigateTab('kasir')}
            className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Mulai Transaksi Kasir</span>
          </button>
        </div>
      </div>

      {/* Top 5 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today's Revenue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pendapatan Hari Ini</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
                {formatRupiah(stats.todayRevenue)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-xs">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> Real-time
            </span>
            <span>{stats.todayTransactions} Transaksi</span>
          </div>
        </div>

        {/* Today's Transactions */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jumlah Transaksi</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
                {stats.todayTransactions} <span className="text-sm font-semibold text-slate-400">Nota</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Rata-rata: {stats.todayTransactions > 0 ? formatRupiah(Math.round(stats.todayRevenue / stats.todayTransactions)) : 'Rp 0'}</span>
            <button onClick={() => onNavigateTab('transaksi')} className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
              Lihat
            </button>
          </div>
        </div>

        {/* Today's Profit */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Keuntungan Bersih</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
                {formatRupiah(stats.todayProfit)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shadow-xs">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="text-teal-600 dark:text-teal-400 font-bold">Margin Bersih</span>
            <span>{stats.todayRevenue > 0 ? `${Math.round((stats.todayProfit / stats.todayRevenue) * 100)}%` : '0%'}</span>
          </div>
        </div>

        {/* Total Products */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Produk Aktif</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
                {stats.totalProducts} <span className="text-sm font-semibold text-slate-400">Item</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shadow-xs">
              <Package className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className={stats.lowStockProducts.length > 0 ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>
              {stats.lowStockProducts.length} Stok Menipis
            </span>
            <button onClick={() => onNavigateTab('produk')} className="text-purple-600 dark:text-purple-400 hover:underline font-semibold">
              Kelola
            </button>
          </div>
        </div>

      </div>

      {/* Main Chart Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Grafik Performa Penjualan & Keuntungan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Visualisasi tren pendapatan dan profitabilitas toko KasirPro</p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setChartPeriod('daily')}
              className={`px-3 py-1.5 rounded-lg transition-all ${chartPeriod === 'daily' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500'}`}
            >
              Harian (7 Hari)
            </button>
            <button
              onClick={() => setChartPeriod('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${chartPeriod === 'monthly' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500'}`}
            >
              Bulanan (6 Bulan)
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `Rp${val/1000}k`} />
              <Tooltip 
                formatter={(value: any) => [formatRupiah(Number(value)), '']}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="revenue" name="Omzet / Pendapatan" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="profit" name="Keuntungan / Profit" stroke="#14b8a6" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorProfit)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid: Low Stock Alert + Top Products + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Low Stock Alert */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Peringatan Stok Menipis</h3>
            </div>
            <button onClick={() => onNavigateTab('stok')} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
              Lihat Semua
            </button>
          </div>

          {stats.lowStockProducts.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Semua stok produk dalam kondisi aman (cukup).</p>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {stats.lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                        Sisa: <strong>{p.stock}</strong> unit (Batas: {p.minStockAlert || 5})
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onRestockProduct(p)}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shrink-0 transition-colors"
                  >
                    + Restok
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-500" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Top 5 Produk Terlaris</h3>
            </div>
          </div>

          <div className="space-y-2.5 max-h-64 overflow-y-auto">
            {stats.topSellingProducts.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  {item.image && <img src={item.image} alt={item.name} className="w-9 h-9 rounded-xl object-cover shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-[11px] text-slate-500">{formatRupiah(item.totalSales)}</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs shrink-0">
                  {item.count} Terjual
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-teal-500" />
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Transaksi Terbaru</h3>
            </div>
            <button onClick={() => onNavigateTab('transaksi')} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
              Lihat Semua
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {stats.recentTransactions.slice(0, 5).map((t) => (
              <div 
                key={t.id} 
                onClick={() => onViewTransaction(t)}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{t.invoiceNumber}</p>
                  <p className="text-[10px] text-slate-500">{formatDate(t.createdAt)} • {t.paymentMethod}</p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{formatRupiah(t.total)}</p>
                  <span className="text-[10px] text-slate-400 font-medium">{t.details.length} Item</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
