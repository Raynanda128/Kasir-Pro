import { Transaction } from '../types';

export function exportTransactionsToCSV(transactions: Transaction[], filenamePrefix = 'Riwayat_Transaksi_KasirPro'): void {
  if (!transactions || transactions.length === 0) {
    throw new Error('Tidak ada data riwayat transaksi untuk diunduh.');
  }

  // Calculate Totals for Summary Header
  const totalCount = transactions.length;
  const totalSubtotal = transactions.reduce((acc, t) => acc + (t.subtotal || 0), 0);
  const totalDiscount = transactions.reduce((acc, t) => acc + (t.discount || 0), 0);
  const totalTax = transactions.reduce((acc, t) => acc + (t.tax || 0), 0);
  const totalRevenue = transactions.reduce((acc, t) => acc + (t.total || 0), 0);
  const totalPaid = transactions.reduce((acc, t) => acc + (t.paidAmount || 0), 0);
  const totalChange = transactions.reduce((acc, t) => acc + (t.changeAmount || 0), 0);
  const totalProfit = transactions.reduce((acc, t) => acc + (t.profit || 0), 0);

  const formatCurrency = (amount: number) => {
    return 'Rp ' + amount.toLocaleString('id-ID');
  };

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const nowStr = new Date().toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  const delimiter = ';';

  // Template Banner Header
  const templateLines: string[] = [
    'sep=;',
    `"========================================================================================================================"`,
    `"LAPORAN RINGKASAN RIWAYAT TRANSAKSI PENJUALAN - KASIRPRO POS"`,
    `"========================================================================================================================"`,
    `"Tanggal & Waktu Ekspor"${delimiter}"${nowStr}"`,
    `"Total Jumlah Transaksi"${delimiter}"${totalCount} Transaksi"`,
    `"Total Omzet Penjualan"${delimiter}"${formatCurrency(totalRevenue)}"`,
    `"Total Keuntungan (Profit)"${delimiter}"${formatCurrency(totalProfit)}"`,
    `"========================================================================================================================"`,
    ''
  ];

  // Table Column Headers
  const tableHeaders = [
    'No',
    'No. Invoice / Faktur',
    'Tanggal & Waktu',
    'Kasir / Staf',
    'Cabang / Outlet',
    'Rincian Item Produk (Qty x Harga)',
    'Metode Pembayaran',
    'Subtotal (Rp)',
    'Diskon (Rp)',
    'Pajak (Rp)',
    'Total Bayar (Rp)',
    'Jumlah Diterima (Rp)',
    'Kembalian (Rp)',
    'Keuntungan / Profit (Rp)',
    'Status'
  ];

  templateLines.push(tableHeaders.map(escapeCSV).join(delimiter));

  // Table Data Rows
  transactions.forEach((t, idx) => {
    let formattedDate = t.createdAt;
    try {
      const d = new Date(t.createdAt);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleString('id-ID', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    } catch (e) {
      // fallback
    }

    const itemsSummary = (t.details || []).map((d, itemIdx) => {
      return `${itemIdx + 1}. ${d.productName} (${d.quantity}x @ ${formatCurrency(d.price)})`;
    }).join(' | ');

    const row = [
      escapeCSV(idx + 1),
      escapeCSV(t.invoiceNumber || '-'),
      escapeCSV(formattedDate),
      escapeCSV(t.cashierName || t.userName || '-'),
      escapeCSV(t.branchName || 'Utama'),
      escapeCSV(itemsSummary || '-'),
      escapeCSV(t.paymentMethod || 'Cash'),
      escapeCSV(t.subtotal || 0),
      escapeCSV(t.discount || 0),
      escapeCSV(t.tax || 0),
      escapeCSV(t.total || 0),
      escapeCSV(t.paidAmount || 0),
      escapeCSV(t.changeAmount || 0),
      escapeCSV(t.profit || 0),
      escapeCSV(t.status || 'Berhasil')
    ];

    templateLines.push(row.join(delimiter));
  });

  // Total Summary Footer Row
  const summaryFooterRow = [
    escapeCSV('TOTAL KESELURUHAN'),
    escapeCSV(''),
    escapeCSV(''),
    escapeCSV(''),
    escapeCSV(''),
    escapeCSV(''),
    escapeCSV(''),
    escapeCSV(totalSubtotal),
    escapeCSV(totalDiscount),
    escapeCSV(totalTax),
    escapeCSV(totalRevenue),
    escapeCSV(totalPaid),
    escapeCSV(totalChange),
    escapeCSV(totalProfit),
    escapeCSV('')
  ];

  templateLines.push(summaryFooterRow.join(delimiter));
  templateLines.push(`"========================================================================================================================"`);

  // UTF-8 BOM (\uFEFF) for Microsoft Excel automatic encoding recognition
  const csvContent = '\uFEFF' + templateLines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

