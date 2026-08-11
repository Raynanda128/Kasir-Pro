import React, { useState } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  Calendar, 
  Eye, 
  Printer, 
  FileText, 
  Download,
  CreditCard,
  Building2,
  Banknote,
  QrCode
} from 'lucide-react';
import { PaymentMethod, Transaction } from '../types';
import { formatDate, formatRupiah } from '../lib/utils';
import { exportTransactionsToCSV } from '../lib/exportCsv';
import { useToast } from '../components/Toast';

interface TransactionsViewProps {
  transactions: Transaction[];
  onViewReceipt: (transaction: Transaction) => void;
  onExportHistoryCSV?: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onViewReceipt,
  onExportHistoryCSV
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const handleDownloadCSV = () => {
    if (onExportHistoryCSV) {
      onExportHistoryCSV();
    } else {
      try {
        exportTransactionsToCSV(filtered);
        showToast('Data riwayat transaksi berhasil disimpan ke CSV!', 'success');
      } catch (err: any) {
        showToast(err.message || 'Gagal menyimpan data ke CSV', 'error');
      }
    }
  };

  const filtered = transactions.filter((t) => {
    const matchSearch = 
      t.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.userName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchMethod = selectedMethod === 'all' || t.paymentMethod === selectedMethod;
    return matchSearch && matchMethod;
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-500" />
            Riwayat Transaksi & Nota Struk
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Daftar rekaman seluruh penjualan toko, cetak ulang nota, dan ekspor struk digital</p>
        </div>

        <button
          onClick={handleDownloadCSV}
          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Simpan Data Riwayat ke CSV</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor invoice, nama kasir..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none"
          >
            <option value="all">Semua Metode Bayar</option>
            <option value="Cash">Cash</option>
            <option value="QRIS">QRIS</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Debit Card">Debit Card</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase">
                <th className="p-3.5">Nomor Invoice</th>
                <th className="p-3.5">Tanggal & Waktu</th>
                <th className="p-3.5">Kasir</th>
                <th className="p-3.5">Metode Bayar</th>
                <th className="p-3.5">Total Belanja</th>
                <th className="p-3.5 text-right">Aksi Struk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900 dark:text-white font-mono">{t.invoiceNumber}</td>
                  <td className="p-3.5 text-slate-500">{formatDate(t.createdAt)}</td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300">{t.userName}</td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px]">
                      {t.paymentMethod}
                    </span>
                  </td>
                  <td className="p-3.5 font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(t.total)}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedTx(t)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail</span>
                      </button>

                      <button
                        onClick={() => onViewReceipt(t)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Struk</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Drawer Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Detail Transaksi Penjualan</h3>
                <p className="text-xs text-slate-400">{selectedTx.invoiceNumber}</p>
              </div>
              <button onClick={() => setSelectedTx(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Tanggal:</span>
                <span className="font-semibold">{formatDate(selectedTx.createdAt)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Kasir:</span>
                <span className="font-semibold">{selectedTx.userName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Metode Bayar:</span>
                <span className="font-semibold">{selectedTx.paymentMethod}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <p className="font-bold text-xs text-slate-700 dark:text-slate-300">Item Produk Terbeli:</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedTx.details.map((d, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{d.productName}</p>
                      <p className="text-[10px] text-slate-400">{d.quantity} x {formatRupiah(d.price)}</p>
                    </div>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatRupiah(d.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formatRupiah(selectedTx.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Diskon / Potongan:</span>
                <span className={selectedTx.discount > 0 ? "font-bold text-emerald-600" : "text-slate-400"}>
                  {selectedTx.discount > 0 ? `-${formatRupiah(selectedTx.discount)}` : 'Rp 0'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Pajak:</span>
                <span className={selectedTx.tax > 0 ? "font-bold text-slate-800 dark:text-slate-200" : "text-slate-400"}>
                  {selectedTx.tax > 0 ? formatRupiah(selectedTx.tax) : 'Rp 0'}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-slate-900 dark:text-white pt-1.5 border-t border-slate-200 dark:border-slate-700">
                <span>Total Belanja:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatRupiah(selectedTx.total)}</span>
              </div>

              {/* Rincian Pembayaran */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1 text-[11px] font-sans">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Metode Bayar:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white uppercase bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">
                    {selectedTx.paymentMethod}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Nominal Diterima:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{formatRupiah(selectedTx.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Uang Kembalian:</span>
                  <span className={selectedTx.changeAmount > 0 ? "font-extrabold text-emerald-600 dark:text-emerald-400" : "font-bold text-slate-700 dark:text-slate-300"}>
                    {selectedTx.changeAmount > 0 ? formatRupiah(selectedTx.changeAmount) : 'Rp 0 (Uang Pas)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  onViewReceipt(selectedTx);
                  setSelectedTx(null);
                }}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
              >
                Cetak Struk Transaksi Ini
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
