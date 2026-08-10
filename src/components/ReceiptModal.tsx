import React, { useRef, useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Share2, 
  FileText, 
  CheckCircle2, 
  Copy, 
  Image as ImageIcon,
  Phone,
  Send
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { ReceiptSize, StoreSettings, Transaction } from '../types';
import { formatDate, formatRupiah } from '../lib/utils';
import { useToast } from './Toast';

interface ReceiptModalProps {
  transaction: Transaction | null;
  settings: StoreSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  settings,
  onClose
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const [size, setSize] = useState<ReceiptSize>(settings.receiptSize || '80mm');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [customerPhone, setCustomerPhone] = useState<string>('');

  useEffect(() => {
    if (transaction) {
      QRCode.toDataURL(transaction.invoiceNumber, { width: 120, margin: 1 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('QR code error', err));
    }
  }, [transaction]);

  if (!transaction) return null;

  // Format phone number to international Indonesian format (628...)
  const cleanPhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    } else if (cleaned.length > 0 && !cleaned.startsWith('62')) {
      cleaned = '62' + cleaned;
    }
    return cleaned;
  };

  // Thermal Print Handler
  const handlePrint = () => {
    try {
      const receiptEl = receiptRef.current;
      if (!receiptEl) {
        window.print();
        return;
      }

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Struk_${transaction.invoiceNumber}</title>
              <style>
                @page { margin: 0; size: auto; }
                body {
                  font-family: monospace;
                  margin: 0;
                  padding: 12px;
                  background: #fff;
                  color: #000;
                  font-size: 11px;
                }
                * { box-sizing: border-box; }
                .receipt-box {
                  width: ${size === '58mm' ? '58mm' : size === '80mm' ? '80mm' : '100%'};
                  margin: 0 auto;
                }
              </style>
            </head>
            <body>
              <div class="receipt-box">
                ${receiptEl.innerHTML}
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(function() {
                    if (window.frameElement) {
                      window.frameElement.remove();
                    }
                  }, 800);
                };
              </script>
            </body>
          </html>
        `);
        doc.close();
      } else {
        window.print();
      }
    } catch (err) {
      console.error('Print Error:', err);
      window.print();
    }
  };

  // Full Receipt Canvas Capture (Captures exact DOM receipt without cropping)
  const getReceiptCanvas = async (): Promise<HTMLCanvasElement> => {
    if (!receiptRef.current) throw new Error('Receipt element not found');

    // Pre-load all images inside the receipt (like logo & QR code)
    const images = Array.from(receiptRef.current.querySelectorAll('img')) as HTMLImageElement[];
    await Promise.all(
      images.map(img => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    const fullHeight = receiptRef.current.scrollHeight;

    // Use html2canvas to capture the full receipt element
    const canvas = await html2canvas(receiptRef.current, {
      scale: 3, // High DPI clarity
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      height: fullHeight,
      windowHeight: fullHeight + 100,
      onclone: (clonedDoc) => {
        // 1. Sanitize all style tags to replace unsupported oklch color functions with fallback rgb/hex
        const styleEls = Array.from(clonedDoc.querySelectorAll('style'));
        styleEls.forEach((style) => {
          if (style.innerHTML && style.innerHTML.includes('oklch')) {
            style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, '#0f172a');
          }
        });

        const clonedReceipt = clonedDoc.getElementById('printable-receipt');
        if (clonedReceipt) {
          clonedReceipt.style.maxHeight = 'none';
          clonedReceipt.style.overflow = 'visible';
          clonedReceipt.style.transform = 'none';
          clonedReceipt.style.boxShadow = 'none';
          clonedReceipt.style.margin = '0 auto';
          clonedReceipt.style.paddingBottom = '20px';
          clonedReceipt.style.backgroundColor = '#ffffff';

          // 2. Force computed inline RGB colors on receipt elements to prevent oklch inheritance
          const allClonedElements = [clonedReceipt, ...Array.from(clonedReceipt.querySelectorAll('*'))] as HTMLElement[];
          allClonedElements.forEach((el) => {
            try {
              const computed = window.getComputedStyle(el);
              if (computed.color) {
                el.style.color = computed.color.includes('oklch') ? '#0f172a' : computed.color;
              }
              if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                el.style.backgroundColor = computed.backgroundColor.includes('oklch') ? '#ffffff' : computed.backgroundColor;
              }
              if (computed.borderColor) {
                el.style.borderColor = computed.borderColor.includes('oklch') ? '#cbd5e1' : computed.borderColor;
              }
            } catch {
              // Ignore any element computed style read error
            }
          });
        }
      }
    });

    return canvas;
  };

  // Export as Image (PNG/JPG)
  const handleDownloadImage = async (format: 'png' | 'jpg') => {
    try {
      setIsExporting(true);
      const canvas = await getReceiptCanvas();

      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, 0.98);
      
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Struk_${transaction.invoiceNumber}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Berhasil mengunduh gambar struk lengkap (${format.toUpperCase()})`, 'success');
    } catch (err) {
      console.error('Download Image error:', err);
      showToast('Gagal mengunduh gambar struk.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Export as PDF
  const handleDownloadPDF = async () => {
    try {
      setIsExporting(true);
      const canvas = await getReceiptCanvas();

      const imgData = canvas.toDataURL('image/png', 0.98);
      const mmWidth = size === '58mm' ? 58 : size === '80mm' ? 80 : 100;
      const mmHeight = Math.round((canvas.height * mmWidth) / canvas.width);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [mmWidth, mmHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, mmWidth, mmHeight);
      pdf.save(`Struk_${transaction.invoiceNumber}.pdf`);

      showToast('Berhasil mengunduh PDF struk lengkap!', 'success');
    } catch (err) {
      console.error('Download PDF error:', err);
      showToast('Gagal mengunduh PDF struk.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Share Image to WhatsApp (Direct to wa.me/628xxx without saving contact)
  const handleShareWhatsAppImage = async () => {
    try {
      setIsExporting(true);
      const targetPhone = cleanPhoneNumber(customerPhone);
      const canvas = await getReceiptCanvas();

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png', 0.98)
      );

      if (!blob) throw new Error('Gagal membuat gambar struk');

      const file = new File([blob], `Struk_${transaction.invoiceNumber}.png`, { type: 'image/png' });

      // If user typed a target phone number, always open direct WhatsApp chat to wa.me/628xxx!
      if (targetPhone) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Struk_${transaction.invoiceNumber}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        const messageText = `Halo, berikut struk belanja *${transaction.invoiceNumber}* dari *${settings.storeName}*.\nTotal: *${formatRupiah(transaction.total)}*.\n\n*(Gambar Struk Full beserta QR Code & Footer telah terunduh di perangkat Anda. Silakan lampirkan gambar tersebut pada chat ini)*`;
        const encodedText = encodeURIComponent(messageText);

        const waUrl = `https://wa.me/${targetPhone}?text=${encodedText}`;

        setTimeout(() => {
          window.open(waUrl, '_blank');
          showToast(
            `Gambar struk terunduh! Membuka WhatsApp ke ${targetPhone}`,
            'info'
          );
        }, 350);
        return;
      }

      // Native Web Share API if supported and no specific phone was entered
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Struk_${transaction.invoiceNumber}`,
          text: `Struk Pembelian ${settings.storeName} - Total: ${formatRupiah(transaction.total)}`
        });
        showToast('Menu kirim WhatsApp dibuka!', 'success');
        return;
      }

      // Desktop/Web Fallback without specific phone number
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Struk_${transaction.invoiceNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const messageText = `Halo, berikut struk belanja *${transaction.invoiceNumber}* dari *${settings.storeName}*.\nTotal: *${formatRupiah(transaction.total)}*.\n\n*(Gambar Struk Full beserta QR Code & Footer telah terunduh di perangkat Anda. Silakan lampirkan gambar tersebut pada chat ini)*`;
      const encodedText = encodeURIComponent(messageText);

      setTimeout(() => {
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
        showToast(
          'Gambar terunduh! Masukkan nomor WA pelanggan di atas agar langsung menuju chat pelanggan.',
          'info'
        );
      }, 350);

    } catch (err) {
      console.error('WA Share error:', err);
      showToast('Gagal membagikan gambar ke WhatsApp', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Share Text via WhatsApp (Direct to wa.me/628xxx)
  const handleShareWhatsAppText = () => {
    const targetPhone = cleanPhoneNumber(customerPhone);
    const itemsList = transaction.details
      .map(d => `• *${d.productName}*\n   ${d.quantity} x ${formatRupiah(d.price)} = *${formatRupiah(d.subtotal)}*`)
      .join('\n');

    const text = `
🧾 *STRUK PEMBELIAN - KASIRPRO*
*${settings.storeName.toUpperCase()}*
${settings.address ? `📍 ${settings.address}\n` : ''}${settings.phone ? `📞 Telp: ${settings.phone}\n` : ''}------------------------------------------
📄 Invoice: *${transaction.invoiceNumber}*
📅 Tanggal: ${formatDate(transaction.createdAt)}
👤 Kasir: ${transaction.userName}
🏢 Cabang: ${transaction.branchName || settings.activeBranch || 'Cabang Utama'}

🛒 *DETAIL PESANAN:*
${itemsList}

------------------------------------------
Subtotal: ${formatRupiah(transaction.subtotal)}
${transaction.discount > 0 ? `Diskon: -${formatRupiah(transaction.discount)}\n` : ''}${transaction.tax > 0 ? `Pajak (${settings.taxRate}%): ${formatRupiah(transaction.tax)}\n` : ''}💰 *TOTAL: ${formatRupiah(transaction.total)}*

💳 Metode Bayar: *${transaction.paymentMethod}*
💵 Bayar: ${formatRupiah(transaction.paidAmount)}
🪙 Kembalian: *${formatRupiah(transaction.changeAmount)}*
------------------------------------------
🙏 _${settings.footerText || 'Terima kasih atas kunjungan Anda! Selamat menikmati hidangan.'}_

⚡ *Powered by KasirPro POS*
    `.trim();

    const encoded = encodeURIComponent(text);
    const waUrl = targetPhone 
      ? `https://wa.me/${targetPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(waUrl, '_blank');
    if (targetPhone) {
      showToast(`Membuka WhatsApp ke nomor ${targetPhone}`, 'success');
    } else {
      showToast('Membuka WhatsApp! Masukkan nomor pelanggan agar langsung ke chat tujuan.', 'info');
    }
  };

  // Copy text to clipboard
  const handleCopySummary = () => {
    navigator.clipboard.writeText(`Invoice: ${transaction.invoiceNumber}\nTotal: ${formatRupiah(transaction.total)}`);
    showToast('Info struk disalin ke clipboard!', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
      {/* Modal Container */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-auto">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-900 dark:text-white">Struk Transaksi Digital</h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Size Switcher */}
            <div className="flex bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setSize('58mm')}
                className={`px-2 py-1 rounded-md transition-all ${size === '58mm' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
              >
                58mm
              </button>
              <button
                onClick={() => setSize('80mm')}
                className={`px-2 py-1 rounded-md transition-all ${size === '80mm' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
              >
                80mm
              </button>
              <button
                onClick={() => setSize('Full HD')}
                className={`px-2 py-1 rounded-md transition-all ${size === 'Full HD' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}
              >
                Full
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WhatsApp Customer Phone Input Section */}
        <div className="px-6 py-3 bg-emerald-50/60 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 shrink-0">
            <Phone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Nomor WA Pelanggan:</span>
          </div>
          <div className="flex-1 relative">
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Contoh: 081234567890 (Opsional)"
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950 flex justify-center print:p-0 print:bg-white">
          
          {/* Printable Thermal Receipt Card */}
          <div
            id="printable-receipt"
            ref={receiptRef}
            className={`
              bg-white text-slate-900 p-6 shadow-md rounded-2xl print:shadow-none print:rounded-none font-mono text-xs leading-relaxed transition-all
              ${size === '58mm' ? 'w-[280px] text-[11px] px-3' : size === '80mm' ? 'w-[360px] text-xs' : 'w-full max-w-md'}
            `}
          >
            {/* Header / Store Info */}
            <div className="text-center mb-4 pb-3 border-b border-dashed border-slate-300">
              {settings.logo && (
                <img 
                  src={settings.logo} 
                  alt={settings.storeName} 
                  className="w-12 h-12 object-cover rounded-full mx-auto mb-2 border border-slate-200"
                />
              )}
              <h2 className="font-extrabold text-sm uppercase tracking-wide text-slate-900">{settings.storeName}</h2>
              <p className="text-[10px] text-slate-600 mt-0.5">{settings.address}</p>
              <p className="text-[10px] text-slate-600">Telp: {settings.phone}</p>
            </div>

            {/* Invoice Meta */}
            <div className="mb-3 space-y-0.5 text-[11px] border-b border-dashed border-slate-300 pb-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice:</span>
                <span className="font-bold">{transaction.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal:</span>
                <span>{formatDate(transaction.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kasir:</span>
                <span>{transaction.userName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cabang:</span>
                <span>{transaction.branchName || settings.activeBranch}</span>
              </div>
            </div>

            {/* Items Detail */}
            <div className="mb-3 border-b border-dashed border-slate-300 pb-3">
              <div className="font-bold text-slate-700 mb-2 uppercase text-[10px] tracking-wider">Detail Pembelian</div>
              <div className="space-y-2">
                {transaction.details.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-slate-900">{item.productName}</div>
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>{item.quantity} x {formatRupiah(item.price)}</span>
                      <span className="font-semibold text-slate-900">{formatRupiah(item.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Calculation */}
            <div className="space-y-1 mb-4 text-[11px] border-b border-dashed border-slate-300 pb-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatRupiah(transaction.subtotal)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(transaction.discount)}</span>
                </div>
              )}
              {transaction.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Pajak ({settings.taxRate}%):</span>
                  <span>{formatRupiah(transaction.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>{formatRupiah(transaction.total)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-1 mb-4 text-[11px] border-b border-dashed border-slate-300 pb-3">
              <div className="flex justify-between text-slate-600">
                <span>Metode Bayar:</span>
                <span className="font-semibold text-slate-800">{transaction.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Bayar:</span>
                <span>{formatRupiah(transaction.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Kembalian:</span>
                <span className="text-emerald-600">{formatRupiah(transaction.changeAmount)}</span>
              </div>
            </div>

            {/* QR Code & Footer */}
            <div className="text-center pt-1">
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-20 h-20 mx-auto my-1 border border-slate-100 p-1 rounded-lg"
                />
              )}
              <p className="text-[10px] font-semibold text-slate-600 mt-2 px-2">
                {settings.footerText || 'Terima kasih atas kunjungan Anda! Selamat menikmati hidangan.'}
              </p>
              <p className="text-[9px] text-slate-400 mt-1">Powered by KasirPro POS</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak</span>
            </button>

            <button
              onClick={() => handleDownloadImage('png')}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>PNG</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleShareWhatsAppImage}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              title="Kirim Struk Gambar ke WhatsApp Pelanggan"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Gambar WA</span>
            </button>

            <button
              onClick={handleShareWhatsAppText}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors"
              title="Kirim Teks Struk ke WhatsApp Pelanggan"
            >
              <Send className="w-4 h-4" />
              <span>Teks WA</span>
            </button>

            <button
              onClick={handleCopySummary}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Salin Rangkuman"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

