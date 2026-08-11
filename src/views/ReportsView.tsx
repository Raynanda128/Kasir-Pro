import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Award, 
  Download, 
  FileText, 
  Calendar,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  AreaChart, 
  Area 
} from 'recharts';
import { jsPDF } from 'jspdf';
import { DashboardStats } from '../types';
import { formatDate, formatRupiah } from '../lib/utils';
import { exportTransactionsToCSV } from '../lib/exportCsv';
import { useToast } from '../components/Toast';

interface ReportsViewProps {
  stats: DashboardStats | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ stats }) => {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<'daily' | 'monthly'>('daily');

  if (!stats) {
    return <div className="p-8 text-center text-slate-500">Memuat Laporan Penjualan KasirPro...</div>;
  }

  const chartData = period === 'daily' ? stats.salesByDay : stats.salesByMonth;

  // Total calculated over historical transactions
  const totalAllRevenue = stats.recentTransactions.reduce((acc, t) => acc + t.total, 0);
  const totalAllProfit = stats.recentTransactions.reduce((acc, t) => acc + t.profit, 0);

  // Export CSV
  const handleExportCSV = () => {
    try {
      exportTransactionsToCSV(stats.recentTransactions, 'Laporan_Penjualan_KasirPro');
      showToast('Laporan Excel / CSV berhasil didownload!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal mengunduh CSV', 'error');
    }
  };

  // Export PDF Report
  const handleExportPDF = () => {
    try {
      const pdf = new jsPDF();
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('LAPORAN PENJUALAN KASIRPRO', 14, 22);

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 28);
      pdf.text(`Total Omzet: ${formatRupiah(totalAllRevenue)}`, 14, 34);
      pdf.text(`Total Keuntungan: ${formatRupiah(totalAllProfit)}`, 14, 40);

      pdf.line(14, 44, 196, 44);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Daftar Transaksi Terbaru:', 14, 52);

      let y = 60;
      stats.recentTransactions.slice(0, 15).forEach((t, i) => {
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${i + 1}. ${t.invoiceNumber} | ${formatDate(t.createdAt)} | ${t.paymentMethod} | ${formatRupiah(t.total)}`, 14, y);
        y += 8;
      });

      pdf.save(`Laporan_KasirPro_${Date.now()}.pdf`);
      showToast('Laporan PDF berhasil didownload!', 'success');
    } catch (err) {
      showToast('Gagal mengunduh PDF', 'error');
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-500" />
            Laporan Penjualan & Profitabilitas Owner
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Analisis komprehensif omzet, keuntungan bersih, dan performa menu terlaris</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Ekspor Excel / CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span>Ekspor PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase">Omzet Hari Ini</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{formatRupiah(stats.todayRevenue)}</h3>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            {stats.todayTransactions} Transaksi Terproses
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase">Profit Bersih Hari Ini</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{formatRupiah(stats.todayProfit)}</h3>
          <p className="text-[11px] text-teal-600 font-semibold mt-1">
            Margin: {stats.todayRevenue > 0 ? Math.round((stats.todayProfit / stats.todayRevenue) * 100) : 0}%
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-xs font-bold text-slate-500 uppercase">Estimasi Total Omzet Terdaftar</p>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{formatRupiah(totalAllRevenue)}</h3>
          <p className="text-[11px] text-slate-400 font-semibold mt-1">Total {stats.recentTransactions.length} Rekaman Transaksi</p>
        </div>
      </div>

      {/* Bar Chart Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Grafik Penjualan Per Periode</h3>
            <p className="text-xs text-slate-500">Perbandingan pendapatan dan keuntungan</p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-3 py-1 rounded-lg transition-all ${period === 'daily' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs' : 'text-slate-500'}`}
            >
              Harian
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-3 py-1 rounded-lg transition-all ${period === 'monthly' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs' : 'text-slate-500'}`}
            >
              Bulanan
            </button>
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `Rp${val/1000}k`} />
              <Tooltip 
                formatter={(val: any) => [formatRupiah(Number(val)), '']}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Bar dataKey="revenue" name="Omzet Penjualan" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="profit" name="Keuntungan Bersih" fill="#14b8a6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
