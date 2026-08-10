-- ====================================================================
-- KASIRPRO - SUPABASE DATABASE INITIALIZATION SCRIPT
-- Copy dan Paste seluruh script ini ke Supabase SQL Editor Anda
-- Dashboard Supabase > SQL Editor > New Query > Run
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
  type TEXT, -- 'in', 'out', 'adjustment'
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

-- ====================================================================
-- DISABLE RLS FOR ANONYMOUS APP ACCESS (Agar POS langsung dapat dipakai)
-- ====================================================================
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_details DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings DISABLE ROW LEVEL SECURITY;

-- ====================================================================
-- SEED DATA AWAL (Kategori & Produk Demo)
-- ====================================================================
INSERT INTO public.categories (id, name, icon) VALUES
  ('cat-1', 'Makanan & Snack', 'Utensils'),
  ('cat-2', 'Minuman', 'Coffee'),
  ('cat-3', 'Sembako', 'ShoppingBag'),
  ('cat-4', 'Perawatan Diri', 'Sparkles')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, name, category_id, category_name, image, description, capital_price, selling_price, stock, min_stock_alert, status, barcode) VALUES
  ('prod-1', 'Indomie Goreng Original 85g', 'cat-1', 'Makanan & Snack', 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80', 'Mie instan rasa goreng spesial', 2800, 3500, 120, 10, 'Tersedia', '899100100101'),
  ('prod-2', 'Kopi Kapal Api Special 165g', 'cat-2', 'Minuman', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=600&q=80', 'Kopi bubuk murni aroma mantap', 12000, 15000, 45, 5, 'Tersedia', '899100100102'),
  ('prod-3', 'Minyak Goreng Bimoli 2L', 'cat-3', 'Sembako', 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80', 'Minyak goreng kelapa sawit murni', 31000, 36000, 25, 5, 'Tersedia', '899100100103'),
  ('prod-4', 'Susu UHT Ultra Milk Cokelat 1L', 'cat-2', 'Minuman', 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80', 'Susu segar UHT rasa cokelat lezat', 16000, 19500, 30, 5, 'Tersedia', '899100100104'),
  ('prod-5', 'Sabun Lifebuoy Total 10 110g', 'cat-4', 'Perawatan Diri', 'https://images.unsplash.com/photo-1607006344380-b6775a0824a7?auto=format&fit=crop&w=600&q=80', 'Sabun batang perlindungan kuman', 3800, 5000, 60, 8, 'Tersedia', '899100100105')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.store_settings (id, store_name, address, phone, tax_rate, invoice_prefix) VALUES
  ('store_settings', 'KasirPro Supermarket', 'Jl. M.H. Thamrin No. 12, Jakarta Pusat', '0812-3456-7890', 11, 'INV-KP')
ON CONFLICT (id) DO NOTHING;
