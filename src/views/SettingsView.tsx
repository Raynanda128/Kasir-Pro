import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Store, 
  Receipt, 
  FileText, 
  Building, 
  Save, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Database,
  ExternalLink,
  Code2,
  Users,
  User as UserIcon,
  Camera,
  QrCode,
  Upload,
  RotateCcw
} from 'lucide-react';
import { ReceiptSize, StoreSettings, User } from '../types';
import { useToast } from '../components/Toast';
import { isSupabaseConfigured } from '../lib/supabase';
import { SupabaseGuideModal } from '../components/SupabaseGuideModal';
import { TeamManagement } from '../components/TeamManagement';
import { DEFAULT_BOTAK_AVATAR } from '../data/avatarPresets';
import { DEFAULT_QRIS_IMAGE } from '../data/mockSeed';

interface SettingsViewProps {
  settings: StoreSettings;
  currentUser: User;
  onSaveSettings: (updated: Partial<StoreSettings>) => Promise<void>;
  onExportHistoryCSV?: () => void;
  onOpenProfileModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  currentUser,
  onSaveSettings,
  onExportHistoryCSV,
  onOpenProfileModal
}) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'team'>('profile');
  const [showSupabaseGuide, setShowSupabaseGuide] = useState(false);

  const [storeName, setStoreName] = useState(settings.storeName);
  const [logo, setLogo] = useState(settings.logo);
  const [qrisImage, setQrisImage] = useState(settings.qrisImage || DEFAULT_QRIS_IMAGE);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [taxRate, setTaxRate] = useState<number | ''>(settings.taxRate);
  const [defaultDiscountRate, setDefaultDiscountRate] = useState<number | ''>(settings.defaultDiscountRate);
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [receiptSize, setReceiptSize] = useState<ReceiptSize>(settings.receiptSize);
  const [footerText, setFooterText] = useState(settings.footerText);
  const [activeBranch, setActiveBranch] = useState(settings.activeBranch);

  const [isSaving, setIsSaving] = useState(false);
  const prevSettingsKeyRef = useRef<string>('');

  useEffect(() => {
    // Unique key representing current settings identity
    const currentKey = `${settings.id}_${settings.businessId}`;
    if (prevSettingsKeyRef.current !== currentKey) {
      prevSettingsKeyRef.current = currentKey;
      setStoreName(settings.storeName);
      setLogo(settings.logo);
      setQrisImage(settings.qrisImage || DEFAULT_QRIS_IMAGE);
      setAddress(settings.address);
      setPhone(settings.phone);
      setTaxRate(settings.taxRate);
      setDefaultDiscountRate(settings.defaultDiscountRate);
      setInvoicePrefix(settings.invoicePrefix);
      setReceiptSize(settings.receiptSize);
      setFooterText(settings.footerText);
      setActiveBranch(settings.activeBranch);
    }
  }, [settings]);

  const handleQrisImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast('Ukuran file gambar QRIS maksimal 3MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setQrisImage(event.target.result as string);
        showToast('Gambar QRIS berhasil dimuat! Klik "Simpan Semua Pengaturan" untuk menyimpan.', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onSaveSettings({
        storeName,
        logo,
        qrisImage,
        address,
        phone,
        taxRate: Number(taxRate) || 0,
        defaultDiscountRate: Number(defaultDiscountRate) || 0,
        invoicePrefix,
        receiptSize,
        footerText,
        activeBranch
      });
      showToast('Pengaturan toko berhasil diperbarui!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan pengaturan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-500" />
          Pengaturan Toko & Manajemen Tim
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Atur profil usaha, pajak, format invoice, ukuran cetak struk, dan kelola tim karyawan</p>
      </div>

      {/* Settings Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('profile')}
          className={`pb-3 px-4 font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all ${
            activeSubTab === 'profile'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Profil Toko & Struk</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('team')}
          className={`pb-3 px-4 font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all ${
            activeSubTab === 'team'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Manajemen Tim & Karyawan</span>
        </button>
      </div>

      {activeSubTab === 'team' ? (
        <TeamManagement currentUser={currentUser} />
      ) : (
        <>
          {/* User Profile Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <img
                  src={currentUser.avatar || DEFAULT_BOTAK_AVATAR}
                  alt={currentUser.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-md"
                />
                <button
                  type="button"
                  onClick={onOpenProfileModal}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-600 text-white shadow-xs hover:scale-110 transition-transform"
                  title="Ubah Foto Profil"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{currentUser.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {currentUser.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{currentUser.email}</p>
              </div>
            </div>

            {onOpenProfileModal && (
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
              >
                <UserIcon className="w-4 h-4" />
                <span>Ubah Profil & Kata Sandi</span>
              </button>
            )}
          </div>

          {/* Supabase Database Connection Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-950 text-white border border-slate-800 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white">Database Supabase (PostgreSQL)</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isSupabaseConfigured 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {isSupabaseConfigured ? 'Terhubung (Active)' : 'Perlu Setup / Env Vars'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {isSupabaseConfigured 
                      ? 'Aplikasi KasirPro menggunakan Supabase sebagai database utama.' 
                      : 'Buat tabel di Supabase SQL Editor dan salin kodenya secara otomatis.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSupabaseGuide(true)}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 shrink-0"
              >
                <Code2 className="w-4 h-4" />
                Lihat Script SQL Supabase
              </button>
            </div>
          </div>

          <SupabaseGuideModal
            isOpen={showSupabaseGuide}
            onClose={() => setShowSupabaseGuide(false)}
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Store Profile Info */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Store className="w-4 h-4 text-emerald-500" />
                Informasi Profil Toko
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Toko / Usaha *
                  </label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Alamat Toko Lengkap
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    URL Logo Toko
                  </label>
                  <input
                    type="url"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cabang Toko Aktif
                  </label>
                  <select
                    value={activeBranch}
                    onChange={(e) => setActiveBranch(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {settings.branches?.map((b, i) => (
                      <option key={i} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* QRIS & Digital Payment Settings */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <QrCode className="w-4 h-4 text-emerald-500" />
                Pengaturan Foto QRIS & Pembayaran Digital
              </h3>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Preview Box */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-44 h-44 bg-white p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center overflow-hidden">
                    <img
                      src={qrisImage || DEFAULT_QRIS_IMAGE}
                      alt="Preview QRIS Toko"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                  {qrisImage !== DEFAULT_QRIS_IMAGE && (
                    <button
                      type="button"
                      onClick={() => setQrisImage(DEFAULT_QRIS_IMAGE)}
                      className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Atur Ulang ke QRIS Default</span>
                    </button>
                  )}
                </div>

                {/* File Upload & URL Controls */}
                <div className="space-y-4 flex-1 w-full">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Unggah Gambar / Foto QRIS Toko
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-700 cursor-pointer flex items-center gap-2 transition-all shadow-xs">
                        <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Pilih File Foto QRIS (PNG/JPG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleQrisImageUpload}
                        />
                      </label>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      Pilih foto atau hasil tangkapan layar barcode QRIS dari galeri HP atau komputer Anda. Gambar ini akan langsung tampil saat pelanggan memilih pembayaran metode QRIS di kasir POS.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Atau Gunakan Tautan / URL Gambar QRIS
                    </label>
                    <input
                      type="url"
                      value={qrisImage}
                      onChange={(e) => setQrisImage(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Config */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Receipt className="w-4 h-4 text-emerald-500" />
                Pengaturan Transaksi & Pajak
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pajak Resto/PB1 (%)
                  </label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="10"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Diskon Default (%)
                  </label>
                  <input
                    type="number"
                    value={defaultDiscountRate}
                    onChange={(e) => setDefaultDiscountRate(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prefix Awalan Invoice
                  </label>
                  <input
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    placeholder="INV-KP"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Receipt Settings */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <FileText className="w-4 h-4 text-emerald-500" />
                Pengaturan Cetak Struk
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ukuran Printer Thermal Default
                  </label>
                  <select
                    value={receiptSize}
                    onChange={(e) => setReceiptSize(e.target.value as ReceiptSize)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="58mm">Thermal Printer 58mm (Kecil/Portable)</option>
                    <option value="80mm">Thermal Printer 80mm (Standar Resto)</option>
                    <option value="Full HD">Full HD Receipt Image</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Pesan Footer Struk (Catatan Bawah)
                  </label>
                  <input
                    type="text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-between pt-2">
              {onExportHistoryCSV && (
                <button
                  type="button"
                  onClick={onExportHistoryCSV}
                  className="px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-700 flex items-center gap-2 transition-all shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Simpan Data Riwayat ke CSV</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
              </button>
            </div>

          </form>
        </>
      )}

    </div>
  );
};

