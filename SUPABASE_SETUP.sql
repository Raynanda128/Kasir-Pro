-- ====================================================================
-- KASIRPRO - MULTI-TENANT BUSINESS / STORE DATABASE INITIALIZATION SCRIPT
-- Copy dan Paste seluruh script ini ke Supabase SQL Editor Anda
-- Dashboard Supabase > SQL Editor > New Query > Run
-- ====================================================================

-- 1. TABEL PROFILES (Profil Pengguna Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY, -- Terhubung dengan auth.users.id
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  avatar TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. TABEL BUSINESSES (Perusahaan / Toko Tenant Utama)
CREATE TABLE IF NOT EXISTS public.businesses (
  id TEXT PRIMARY KEY,
  owner_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL BUSINESS_MEMBERS (Keanggotaan & Hak Akses User di Business)
CREATE TABLE IF NOT EXISTS public.business_members (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'manager', 'cashier')),
  outlet_id TEXT REFERENCES public.outlets(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  invited_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.business_members ADD COLUMN IF NOT EXISTS outlet_id TEXT REFERENCES public.outlets(id) ON DELETE SET NULL;
ALTER TABLE public.business_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled'));
ALTER TABLE public.business_members ADD COLUMN IF NOT EXISTS invited_by TEXT;
ALTER TABLE public.business_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3B. TABEL BUSINESS_INVITATIONS (Sistem Undangan Karyawan)
CREATE TABLE IF NOT EXISTS public.business_invitations (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'cashier')),
  outlet_id TEXT REFERENCES public.outlets(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ
);
ALTER TABLE public.business_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Business Member Access Invitations" ON public.business_invitations;
CREATE POLICY "Business Member Access Invitations" ON public.business_invitations FOR ALL USING (true) WITH CHECK (true);

-- 4. TABEL OUTLETS (Toko / Cabang Multi-Outlet)
CREATE TABLE IF NOT EXISTS public.outlets (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Cabang Utama',
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL CATEGORIES (Kategori Produk per Business)
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Tag',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 6. TABEL PRODUCTS (Katalog Produk per Business)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id TEXT,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name TEXT,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  purchase_price NUMERIC DEFAULT 0,
  capital_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  min_stock_alert INTEGER DEFAULT 5,
  unit TEXT DEFAULT 'Pcs',
  image_url TEXT,
  image TEXT,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'Tersedia',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '[]'::jsonb;

-- 7. TABEL INVENTORY (Stok Produk per Outlet)
CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,
  outlet_id TEXT REFERENCES public.outlets(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
  stock INTEGER DEFAULT 0,
  minimum_stock INTEGER DEFAULT 5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL CUSTOMERS (Pelanggan per Business)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABEL TRANSACTIONS (Nota Penjualan per Business & Outlet)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  outlet_id TEXT REFERENCES public.outlets(id) ON DELETE SET NULL,
  cashier_id TEXT,
  cashier_name TEXT,
  user_id TEXT,
  user_name TEXT,
  user_role TEXT DEFAULT 'Kasir',
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'Cash',
  paid_amount NUMERIC DEFAULT 0,
  change_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'completed',
  branch_name TEXT DEFAULT 'Cabang Utama',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS outlet_id TEXT REFERENCES public.outlets(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 10. TABEL TRANSACTION_DETAILS (Item Nota Rincian)
CREATE TABLE IF NOT EXISTS public.transaction_details (
  id TEXT PRIMARY KEY,
  transaction_id TEXT REFERENCES public.transactions(id) ON DELETE CASCADE,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id TEXT,
  product_id TEXT,
  product_name TEXT NOT NULL,
  product_image TEXT,
  quantity INTEGER DEFAULT 1,
  price NUMERIC DEFAULT 0,
  capital_price NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0
);
ALTER TABLE public.transaction_details ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.transaction_details ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 11. TABEL STOCK_HISTORY (Log Riwayat Stok per Business & Outlet)
CREATE TABLE IF NOT EXISTS public.stock_history (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  outlet_id TEXT REFERENCES public.outlets(id) ON DELETE SET NULL,
  product_id TEXT,
  product_name TEXT,
  user_id TEXT,
  user_name TEXT,
  type TEXT, -- 'in', 'out', 'adjustment'
  quantity INTEGER DEFAULT 0,
  previous_stock INTEGER DEFAULT 0,
  new_stock INTEGER DEFAULT 0,
  note TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.stock_history ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.stock_history ADD COLUMN IF NOT EXISTS outlet_id TEXT REFERENCES public.outlets(id) ON DELETE SET NULL;
ALTER TABLE public.stock_history ADD COLUMN IF NOT EXISTS user_id TEXT;

-- 12. TABEL STORE_SETTINGS (Pengaturan Toko per Business)
CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id TEXT,
  store_name TEXT DEFAULT 'KasirPro Store',
  logo TEXT DEFAULT '',
  qris_image TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  tax_rate NUMERIC DEFAULT 10,
  default_discount_rate NUMERIC DEFAULT 0,
  invoice_prefix TEXT DEFAULT 'INV-KP',
  receipt_size TEXT DEFAULT '58mm',
  footer_text TEXT DEFAULT 'Terima kasih telah berbelanja di KasirPro!',
  enable_barcode_scanner BOOLEAN DEFAULT true,
  branches JSONB DEFAULT '["Cabang Utama"]',
  active_branch TEXT DEFAULT 'Cabang Utama'
);
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS qris_image TEXT DEFAULT '';

-- ====================================================================
-- MIGRASI OTOMATIS DATA LAMA (MIGRATE EXISTING USER_ID TO BUSINESS_ID)
-- ====================================================================
DO $$
DECLARE
  r RECORD;
  new_biz_id TEXT;
  new_outlet_id TEXT;
BEGIN
  FOR r IN 
    SELECT DISTINCT user_id FROM (
      SELECT user_id FROM public.products WHERE user_id IS NOT NULL AND business_id IS NULL
      UNION
      SELECT user_id FROM public.transactions WHERE user_id IS NOT NULL AND business_id IS NULL
      UNION
      SELECT user_id FROM public.categories WHERE user_id IS NOT NULL AND business_id IS NULL
      UNION
      SELECT user_id FROM public.store_settings WHERE user_id IS NOT NULL AND business_id IS NULL
    ) t
  LOOP
    IF r.user_id IS NOT NULL THEN
      new_biz_id := 'biz-' || r.user_id;
      new_outlet_id := 'out-' || r.user_id;

      -- Profile
      INSERT INTO public.profiles (id, name, email)
      VALUES (r.user_id, 'Pemilik Toko', r.user_id || '@kasirpro.app')
      ON CONFLICT (id) DO NOTHING;

      -- Business
      INSERT INTO public.businesses (id, owner_id, name)
      VALUES (new_biz_id, r.user_id, 'KasirPro Store')
      ON CONFLICT (id) DO NOTHING;

      -- Member
      INSERT INTO public.business_members (id, business_id, user_id, role)
      VALUES ('bm-' || r.user_id, new_biz_id, r.user_id, 'owner')
      ON CONFLICT (id) DO NOTHING;

      -- Outlet
      INSERT INTO public.outlets (id, business_id, name)
      VALUES (new_outlet_id, new_biz_id, 'Cabang Utama')
      ON CONFLICT (id) DO NOTHING;

      -- Update relations
      UPDATE public.categories SET business_id = new_biz_id WHERE user_id = r.user_id AND business_id IS NULL;
      UPDATE public.products SET business_id = new_biz_id WHERE user_id = r.user_id AND business_id IS NULL;
      UPDATE public.transactions SET business_id = new_biz_id, outlet_id = new_outlet_id WHERE user_id = r.user_id AND business_id IS NULL;
      UPDATE public.transaction_details SET business_id = new_biz_id WHERE user_id = r.user_id AND business_id IS NULL;
      UPDATE public.stock_history SET business_id = new_biz_id, outlet_id = new_outlet_id WHERE user_id = r.user_id AND business_id IS NULL;
      UPDATE public.store_settings SET business_id = new_biz_id WHERE user_id = r.user_id AND business_id IS NULL;
    END IF;
  END LOOP;
END $$;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) HELPER & POLICIES
-- ====================================================================

-- Function to check authenticated user's active business memberships
CREATE OR REPLACE FUNCTION public.get_auth_business_ids()
RETURNS SETOF TEXT AS $$
BEGIN
  RETURN QUERY
  SELECT bm.business_id 
  FROM public.business_members bm
  WHERE (bm.user_id = auth.uid()::text OR bm.user_id = (SELECT email FROM auth.users WHERE id = auth.uid()))
    AND bm.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS across business tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policy
DROP POLICY IF EXISTS "Business Member Access Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Tenant Isolation Profiles" ON public.profiles;
CREATE POLICY "Tenant Isolation Profiles" ON public.profiles 
FOR ALL USING (true) WITH CHECK (true);

-- 2. Businesses Policy
DROP POLICY IF EXISTS "Business Member Access Businesses" ON public.businesses;
DROP POLICY IF EXISTS "Tenant Isolation Businesses" ON public.businesses;
CREATE POLICY "Tenant Isolation Businesses" ON public.businesses 
FOR ALL USING (id IN (SELECT public.get_auth_business_ids()) OR owner_id = auth.uid()::text) 
WITH CHECK (true);

-- 3. Business Members Policy
DROP POLICY IF EXISTS "Business Member Access Members" ON public.business_members;
DROP POLICY IF EXISTS "Tenant Isolation Members" ON public.business_members;
CREATE POLICY "Tenant Isolation Members" ON public.business_members 
FOR ALL USING (business_id IN (SELECT public.get_auth_business_ids()) OR user_id = auth.uid()::text) 
WITH CHECK (true);

-- 4. Business Invitations Policy
DROP POLICY IF EXISTS "Business Member Access Invitations" ON public.business_invitations;
DROP POLICY IF EXISTS "Tenant Isolation Invitations" ON public.business_invitations;
CREATE POLICY "Tenant Isolation Invitations" ON public.business_invitations 
FOR ALL USING (
  business_id IN (SELECT public.get_auth_business_ids()) 
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
) WITH CHECK (true);

-- 5. Outlets Policy
DROP POLICY IF EXISTS "Business Member Access Outlets" ON public.outlets;
DROP POLICY IF EXISTS "Tenant Isolation Outlets" ON public.outlets;
CREATE POLICY "Tenant Isolation Outlets" ON public.outlets 
FOR ALL USING (business_id IN (SELECT public.get_auth_business_ids())) WITH CHECK (true);

-- 6. Categories Policy
DROP POLICY IF EXISTS "Business Member Access Categories" ON public.categories;
DROP POLICY IF EXISTS "Tenant Isolation Categories" ON public.categories;
CREATE POLICY "Tenant Isolation Categories" ON public.categories 
FOR ALL USING (business_id IN (SELECT public.get_auth_business_ids())) WITH CHECK (true);

-- 7. Products Policy
DROP POLICY IF EXISTS "Business Member Access Products" ON public.products;
DROP POLICY IF EXISTS "Tenant Isolation Products" ON public.products;
CREATE POLICY "Tenant Isolation Products" ON public.products 
FOR ALL USING (business_id IN (SELECT public.get_auth_business_ids())) WITH CHECK (true);

-- 8. Inventory Policy
DROP POLICY IF EXISTS "Business Member Access Inventory" ON public.inventory;
DROP POLICY IF EXISTS "Tenant Isolation Inventory" ON public.inventory;
CREATE POLICY "Tenant Isolation Inventory" ON public.inventory 
FOR ALL USING (outlet_id IN (SELECT id FROM public.outlets WHERE business_id IN (SELECT public.get_auth_business_ids()))) WITH CHECK (true);

-- 9. Customers Policy
DROP POLICY IF EXISTS "Business Member Access Customers" ON public.customers;
DROP POLICY IF EXISTS "Tenant Isolation Customers" ON public.customers;
CREATE POLICY "Tenant Isolation Customers" ON public.customers 
FOR ALL USING (business_id IN (SELECT public.get_auth_business_ids())) WITH CHECK (true);

-- 10. Transactions Policy
DROP POLICY IF EXISTS "Business Member Access Transactions" ON public.transactions;
DROP POLICY IF EXISTS "Tenant Isolation Transactions" ON public.transactions;
CREATE POLICY "Tenant Isolation Transactions" ON public.transactions 
FOR ALL USING (business_id IN (SELECT public.get_auth_business_ids())) WITH CHECK (true);

-- 11. Transaction Details Policy
DROP POLICY IF EXISTS "Business Member Access Transaction Details" ON public.transaction_details;
DROP POLICY IF EXISTS "Tenant Isolation Transaction Details" ON public.transaction_details;
CREATE POLICY "Tenant Isolation Transaction Details" ON public.transaction_details 
FOR ALL USING (business_id IN (SELECT public.get_auth_business_ids())) WITH CHECK (true);

-- 12. Stock History Policy
DROP POLICY IF EXISTS "Business Member Access Stock History" ON public.stock_history;
DROP POLICY IF EXISTS "Tenant Isolation Stock History" ON public.stock_history;
CREATE POLICY "Tenant Isolation Stock History" ON public.stock_history 
FOR ALL USING (business_id IN (SELECT public.get_auth_business_ids())) WITH CHECK (true);

-- 13. Store Settings Policy
DROP POLICY IF EXISTS "Business Member Access Store Settings" ON public.store_settings;
DROP POLICY IF EXISTS "Tenant Isolation Store Settings" ON public.store_settings;
CREATE POLICY "Tenant Isolation Store Settings" ON public.store_settings 
FOR ALL USING (business_id IN (SELECT public.get_auth_business_ids())) WITH CHECK (true);

