import React, { useState } from 'react';
import { Database, Check, Copy, ExternalLink, ShieldCheck, Terminal, X, AlertTriangle } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from './Toast';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPABASE_SQL_SCRIPT = `-- ====================================================================
-- KASIRPRO - SUPABASE DATABASE INITIALIZATION SCRIPT
-- Paste seluruh script ini ke Supabase SQL Editor Anda
-- Supabase Dashboard > SQL Editor > New Query > Run
-- ====================================================================

-- 1. TABEL CATEGORIES (Kategori Produk)
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Tag'
);

-- 2. TABEL PRODUCTS (Produk & Inventaris)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name TEXT,
  image TEXT,
  description TEXT,
  capital_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  stock INTEGER DEFAULT 0,
  min_stock_alert INTEGER DEFAULT 5,
  status TEXT DEFAULT 'Tersedia',
  barcode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL USERS (Pengguna & Hak Akses)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'Owner',
  avatar TEXT,
  branch TEXT DEFAULT 'Cabang Utama',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL TRANSACTIONS (Riwayat Penjualan POS)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  user_id TEXT,
  user_name TEXT,
  user_role TEXT DEFAULT 'Kasir',
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash',
  paid_amount NUMERIC DEFAULT 0,
  change_amount NUMERIC DEFAULT 0,
  branch_name TEXT DEFAULT 'Cabang Utama',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL TRANSACTION_DETAILS (Item Rincian Nota Penjualan)
CREATE TABLE IF NOT EXISTS public.transaction_details (
  id TEXT PRIMARY KEY,
  transaction_id TEXT REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT,
  product_image TEXT,
  quantity INTEGER DEFAULT 1,
  price NUMERIC DEFAULT 0,
  capital_price NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0
);

-- 6. TABEL STOCK_HISTORY (Log Perubahan Stok)
CREATE TABLE IF NOT EXISTS public.stock_history (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  product_name TEXT,
  type TEXT,
  quantity INTEGER DEFAULT 0,
  description TEXT,
  user_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL STORE_SETTINGS (Pengaturan Toko)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY DEFAULT 'store_settings',
  store_name TEXT DEFAULT 'KasirPro Supermarket',
  logo TEXT DEFAULT '',
  address TEXT DEFAULT 'Jl. M.H. Thamrin No. 12, Jakarta Pusat',
  phone TEXT DEFAULT '0812-3456-7890',
  tax_rate NUMERIC DEFAULT 11,
  default_discount_rate NUMERIC DEFAULT 0,
  invoice_prefix TEXT DEFAULT 'INV-KP',
  receipt_size TEXT DEFAULT '58mm',
  footer_text TEXT DEFAULT 'Terima kasih telah berbelanja di KasirPro!',
  enable_barcode_scanner BOOLEAN DEFAULT true,
  branches JSONB DEFAULT '["Cabang Utama", "Cabang Jakarta Barat"]',
  active_branch TEXT DEFAULT 'Cabang Utama'
);

-- DISABLE RLS UNTUK AKSES APLIKASI ANONYMOUS
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings DISABLE ROW LEVEL SECURITY;

-- SEED DATA AWAL
INSERT INTO public.categories (id, name, icon) VALUES
  ('cat-1', 'Makanan & Snack', 'Utensils'),
  ('cat-2', 'Minuman', 'Coffee'),
  ('cat-3', 'Sembako', 'ShoppingBag'),
  ('cat-4', 'Perawatan Diri', 'Sparkles')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, name, category_id, category_name, image, description, capital_price, selling_price, stock, min_stock_alert, status, barcode) VALUES
  ('prod-1', 'Indomie Goreng Original 85g', 'cat-1', 'Makanan & Snack', 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80', 'Mie instan rasa goreng spesial', 2800, 3500, 120, 10, 'Tersedia', '899100100101'),
  ('prod-2', 'Kopi Kapal Api Special 165g', 'cat-2', 'Minuman', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80', 'Kopi bubuk murni aroma mantap', 12000, 15000, 45, 5, 'Tersedia', '899100100102')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.store_settings (id, store_name, address, phone, tax_rate, invoice_prefix) VALUES
  ('store_settings', 'KasirPro Supermarket', 'Jl. M.H. Thamrin No. 12, Jakarta Pusat', '0812-3456-7890', 11, 'INV-KP')
ON CONFLICT (id) DO NOTHING;`;

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopied(true);
    showToast('Script SQL Supabase berhasil disalin ke Clipboard!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs">
              <Database className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold">Panduan Menghubungkan Supabase Database</h3>
              <p className="text-xs text-emerald-100/90">Langkah mudah mengkonfigurasi PostgreSQL Supabase untuk KasirPro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Status Indicator */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${
            isSupabaseConfigured
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
          }`}>
            <div className="flex items-center gap-3">
              {isSupabaseConfigured ? (
                <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
              )}
              <div>
                <p className="font-bold text-sm">
                  {isSupabaseConfigured
                    ? 'Status: Terhubung ke Supabase Database!'
                    : 'Status: Belum Ada Kredensial Supabase'}
                </p>
                <p className="text-xs opacity-90">
                  {isSupabaseConfigured
                    ? 'Aplikasi KasirPro menggunakan Supabase secara langsung.'
                    : 'Aplikasi saat ini berjalan dalam mode Standalone Database. Masukkan kredensial Supabase untuk mengaktifkan.'}
                </p>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-500" />
              Langkah 1: Buat Tabel Database di Supabase
            </h4>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              1. Buka <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-600 dark:text-emerald-400 font-bold underline inline-flex items-center gap-1">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a> dan buat project baru.<br />
              2. Buka menu <b>SQL Editor</b> &gt; <b>New Query</b>.<br />
              3. Salin tombol script SQL di bawah ini dan paste ke SQL Editor, lalu klik <b>RUN</b>.
            </p>

            <div className="relative">
              <button
                onClick={handleCopySql}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Berhasil Disalin!' : 'Salin Script SQL'}
              </button>
              <pre className="p-4 rounded-2xl bg-slate-950 text-slate-300 text-xs font-mono max-h-48 overflow-y-auto border border-slate-800 leading-relaxed">
                {SUPABASE_SQL_SCRIPT}
              </pre>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
              Langkah 2: Dapatkan URL & Anon Key
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Di Supabase, buka <b>Project Settings</b> &gt; <b>API</b>. Salin <b>Project URL</b> dan <b>anon public key</b>.
            </p>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
              Langkah 3: Tambahkan ke Environment Variables (Netlify / Vercel / Local)
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Di Netlify Site Settings &gt; Environment variables, Anda dapat memasukkan nama variabel berikut:
            </p>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs space-y-2">
              <div>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">VITE_SUPABASE_URL</span> (atau <span className="text-teal-500 font-bold">NEXT_PUBLIC_SUPABASE_URL</span>) = <span className="text-slate-500 dark:text-slate-400">https://tojiucixrcnpmxlshbll.supabase.co</span>
              </div>
              <div>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">VITE_SUPABASE_ANON_KEY</span> (atau <span className="text-teal-500 font-bold">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</span>) = <span className="text-slate-500 dark:text-slate-400">sb_publishable_TUQ8gQHIV3f7bSajBth51Q_m7fxgdZv</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <p className="text-xs text-slate-500">Script SQL DDL juga dapat diunduh di file workspace: <code className="text-emerald-600 dark:text-emerald-400 font-bold">/SUPABASE_SETUP.sql</code></p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            Tutup Panduan
          </button>
        </div>

      </div>
    </div>
  );
};
