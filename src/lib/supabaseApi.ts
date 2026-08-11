import { supabase } from './supabase';
import { createClient } from '@supabase/supabase-js';
import { notifyDataChange, addSyncListener } from './eventBus';
import { 
  Category, 
  Product, 
  StoreSettings, 
  User, 
  Transaction, 
  StockHistory, 
  CartItem, 
  UserRole,
  PaymentMethod,
  BusinessMember,
  BusinessInvitation,
  Outlet
} from '../types';
import { initialCategories, initialStoreSettings } from '../data/mockSeed';

// ==========================================
// ACTIVE USER & MULTI-TENANT BUSINESS CONTEXT
// ==========================================

export async function getActiveUserId(): Promise<string | null> {
  if (!supabase) {
    try {
      const local = localStorage.getItem('kasirpro_current_user');
      if (local) {
        const parsed = JSON.parse(local);
        return parsed?.id || null;
      }
    } catch (e) {}
    return null;
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;
  } catch (e) {}

  try {
    const local = localStorage.getItem('kasirpro_current_user');
    if (local) {
      const parsed = JSON.parse(local);
      return parsed?.id || null;
    }
  } catch (e) {}

  return null;
}

export interface BusinessContext {
  businessId: string;
  outletId: string | null;
  role: 'owner' | 'admin' | 'manager' | 'cashier';
  status: 'active' | 'disabled';
  businessName?: string;
}

/**
  * Ensure user belongs to a Business & Outlet tenant.
  * Flow:
  * 1. Check if user email has a pending invitation. If found, accept invitation & create member.
  * 2. Check existing business membership for user_id.
  * 3. If no business membership exists, auto-provision new Tenant (Business + Main Outlet + Owner member).
  */
export async function ensureActiveBusinessContext(): Promise<BusinessContext | null> {
  if (!supabase) return null;

  try {
    const userId = await getActiveUserId();
    if (!userId) return null;

    let userName = 'Pemilik Toko';
    let userEmail = `${userId}@kasirpro.app`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        userName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || userName;
        userEmail = session.user.email || userEmail;
      }
    } catch (e) {}

    // 1. Ensure profile exists (do not overwrite if profile already present)
    try {
      const { data: existingProf } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
      if (!existingProf) {
        await supabase.from('profiles').insert({
          id: userId,
          name: userName,
          email: userEmail
        });
      }
    } catch (e) {}

    // 2. Check Pending Invitations for this user's email
    if (userEmail) {
      try {
        const { data: inv } = await supabase
          .from('business_invitations')
          .select('*')
          .eq('email', userEmail.toLowerCase().trim())
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (inv) {
          // Check if already a member
          const { data: existingMember } = await supabase
            .from('business_members')
            .select('id')
            .eq('business_id', inv.business_id)
            .eq('user_id', userId)
            .maybeSingle();

          if (!existingMember) {
            // Accept invitation -> Create business_members record
            await supabase.from('business_members').insert({
              id: `bm-${userId}-${Date.now().toString(36)}`,
              business_id: inv.business_id,
              user_id: userId,
              role: inv.role,
              outlet_id: inv.outlet_id || null,
              status: 'active',
              invited_by: inv.invited_by
            });
          }

          // Mark invitation as accepted
          await supabase
            .from('business_invitations')
            .update({
              status: 'accepted',
              accepted_at: new Date().toISOString()
            })
            .eq('id', inv.id);
        }
      } catch (e) {
        console.warn('Gagal memeriksa atau memproses undangan karyawan:', e);
      }
    }

    // 3. Check existing business membership
    const { data: members } = await supabase
      .from('business_members')
      .select('business_id, role, outlet_id, status')
      .eq('user_id', userId);

    if (members && members.length > 0) {
      // Prefer active member record
      const activeMember = members.find(m => m.status === 'active') || members[0];

      let outletId = activeMember.outlet_id || null;
      if (!outletId) {
        const { data: outlet } = await supabase
          .from('outlets')
          .select('id')
          .eq('business_id', activeMember.business_id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (outlet?.id) outletId = outlet.id;
      }

      return {
        businessId: activeMember.business_id,
        outletId,
        role: (activeMember.role as any) || 'owner',
        status: (activeMember.status as any) || 'active'
      };
    }

    // 4. No business found -> Auto-provision new Tenant (First-time Owner Registration)
    const newBizId = `biz-${userId}`;
    const newOutletId = `out-${userId}`;

    // Create Business
    await supabase.from('businesses').insert({
      id: newBizId,
      owner_id: userId,
      name: `KasirPro ${userName}`
    });

    // Create Business Member (Owner)
    await supabase.from('business_members').insert({
      id: `bm-${userId}`,
      business_id: newBizId,
      user_id: userId,
      role: 'owner',
      status: 'active'
    });

    // Create Main Outlet
    await supabase.from('outlets').insert({
      id: newOutletId,
      business_id: newBizId,
      name: 'Cabang Utama',
      is_active: true
    });

    // Create Store Settings
    await supabase.from('store_settings').insert({
      id: `store_settings_${newBizId}`,
      business_id: newBizId,
      store_name: `KasirPro ${userName}`,
      address: 'Jl. Utama No. 1',
      phone: '0812-3456-7890',
      tax_rate: 10,
      invoice_prefix: 'INV-KP',
      branches: ['Cabang Utama'],
      active_branch: 'Cabang Utama'
    });

    return {
      businessId: newBizId,
      outletId: newOutletId,
      role: 'owner',
      status: 'active'
    };
  } catch (err) {
    console.warn('Gagal mendapatkan / membuat konteks bisnis multi-tenant:', err);
    return null;
  }
}

// ==========================================
// MAPPERS: CONVERT BETWEEN TS & SUPABASE DB
// ==========================================

export function mapProductFromDb(row: any): Product {
  let addonsList: any[] = [];
  try {
    if (Array.isArray(row.addons)) {
      addonsList = row.addons;
    } else if (typeof row.addons === 'string' && row.addons.trim()) {
      addonsList = JSON.parse(row.addons);
    }
  } catch (e) {
    addonsList = [];
  }

  return {
    id: row.id,
    businessId: row.business_id || '',
    name: row.name,
    categoryId: row.category_id || '',
    categoryName: row.category_name || '',
    image: row.image || row.image_url || '',
    description: row.description || '',
    capitalPrice: Number(row.capital_price || row.purchase_price) || 0,
    sellingPrice: Number(row.selling_price) || 0,
    stock: Number(row.stock) || 0,
    minStockAlert: Number(row.min_stock_alert || row.min_stock) || 5,
    status: row.status || (Number(row.stock) > 0 ? 'Tersedia' : 'Habis'),
    barcode: row.barcode || '',
    addons: addonsList,
    createdAt: row.created_at || new Date().toISOString()
  };
}

export function mapProductToDb(p: Partial<Product>, businessId?: string | null, userId?: string | null): any {
  const row: any = {
    id: p.id,
    name: p.name,
    category_id: p.categoryId,
    category_name: p.categoryName,
    image: p.image,
    description: p.description,
    capital_price: p.capitalPrice,
    selling_price: p.sellingPrice,
    stock: p.stock,
    min_stock_alert: p.minStockAlert,
    status: p.status,
    barcode: p.barcode,
    addons: p.addons || []
  };
  if (businessId) row.business_id = businessId;
  if (userId) row.user_id = userId;
  return row;
}

export function mapSettingsFromDb(row: any): StoreSettings {
  if (!row) return initialStoreSettings;
  return {
    id: row.id || 'store_settings',
    businessId: row.business_id || '',
    storeName: row.store_name || initialStoreSettings.storeName,
    logo: row.logo || initialStoreSettings.logo,
    qrisImage: row.qris_image || initialStoreSettings.qrisImage,
    address: row.address || initialStoreSettings.address,
    phone: row.phone || initialStoreSettings.phone,
    taxRate: Number(row.tax_rate) ?? initialStoreSettings.taxRate,
    defaultDiscountRate: Number(row.default_discount_rate) ?? initialStoreSettings.defaultDiscountRate,
    invoicePrefix: row.invoice_prefix || initialStoreSettings.invoicePrefix,
    receiptSize: row.receipt_size || initialStoreSettings.receiptSize,
    footerText: row.footer_text || initialStoreSettings.footerText,
    enableBarcodeScanner: Boolean(row.enable_barcode_scanner),
    branches: Array.isArray(row.branches) ? row.branches : initialStoreSettings.branches,
    activeBranch: row.active_branch || initialStoreSettings.activeBranch
  };
}

export function mapSettingsToDb(s: Partial<StoreSettings>, businessId?: string | null): any {
  const row: any = {
    id: s.id || (businessId ? `store_settings_${businessId}` : 'store_settings'),
    store_name: s.storeName,
    logo: s.logo,
    qris_image: s.qrisImage,
    address: s.address,
    phone: s.phone,
    tax_rate: s.taxRate,
    default_discount_rate: s.defaultDiscountRate,
    invoice_prefix: s.invoicePrefix,
    receipt_size: s.receiptSize,
    footer_text: s.footerText,
    enable_barcode_scanner: s.enableBarcodeScanner,
    branches: s.branches,
    active_branch: s.activeBranch
  };
  if (businessId) row.business_id = businessId;
  return row;
}

function mapTransactionsFromDb(trxs: any[]): Transaction[] {
  return (trxs || []).map((t: any) => ({
    id: t.id,
    businessId: t.business_id,
    outletId: t.outlet_id,
    invoiceNumber: t.invoice_number,
    userId: t.cashier_id || t.user_id,
    userName: t.cashier_name || t.user_name,
    userRole: (t.user_role as UserRole) || 'Kasir',
    subtotal: Number(t.subtotal) || 0,
    discount: Number(t.discount) || 0,
    tax: Number(t.tax) || 0,
    total: Number(t.total) || 0,
    profit: Number(t.profit) || 0,
    paymentMethod: (t.payment_method as PaymentMethod) || 'Cash',
    paidAmount: Number(t.paid_amount) || 0,
    changeAmount: Number(t.change_amount) || 0,
    createdAt: t.created_at,
    branchName: t.branch_name,
    details: (t.transaction_details || []).map((d: any) => ({
      id: d.id,
      transactionId: d.transaction_id,
      businessId: d.business_id,
      productId: d.product_id,
      productName: d.product_name,
      productImage: d.product_image,
      quantity: Number(d.quantity) || 1,
      price: Number(d.price) || 0,
      capitalPrice: Number(d.capital_price) || 0,
      subtotal: Number(d.subtotal) || 0,
      selectedAddons: Array.isArray(d.selected_addons)
        ? d.selected_addons
        : (typeof d.selected_addons === 'string' && d.selected_addons.trim() ? JSON.parse(d.selected_addons) : []),
      notes: d.notes || ''
    }))
  }));
}

function mapStockFromDb(data: any[]): StockHistory[] {
  return (data || []).map((s: any) => ({
    id: s.id,
    businessId: s.business_id,
    outletId: s.outlet_id,
    productId: s.product_id,
    productName: s.product_name,
    type: s.type,
    quantity: Number(s.quantity) || 0,
    previousStock: Number(s.previous_stock) || 0,
    newStock: Number(s.new_stock) || 0,
    description: s.description || s.note || '',
    note: s.note || s.description || '',
    createdAt: s.created_at,
    userName: s.user_name || 'Admin'
  }));
}

// ==========================================
// REALTIME SUBSCRIBERS (SUPABASE PER BUSINESS)
// ==========================================

export function subscribeSupabaseCategories(callback: (categories: Category[]) => void) {
  if (!supabase) {
    callback(initialCategories);
    return () => {};
  }

  let lastJsonStr = '';
  const emit = (cats: Category[]) => {
    const jsonStr = JSON.stringify(cats);
    if (jsonStr !== lastJsonStr) {
      lastJsonStr = jsonStr;
      callback(cats);
    }
  };

  const fetchCats = async () => {
    try {
      const ctx = await ensureActiveBusinessContext();
      let query = supabase.from('categories').select('*');

      if (ctx?.businessId) {
        query = query.or(`business_id.eq.${ctx.businessId},business_id.is.null`);
      }

      const { data, error } = await query.order('name', { ascending: true });

      if (error) {
        const { data: fallbackCats } = await supabase.from('categories').select('*').order('name', { ascending: true });
        emit((fallbackCats && fallbackCats.length > 0) ? fallbackCats.map(c => ({ id: c.id, businessId: c.business_id, name: c.name, icon: c.icon })) : initialCategories);
        return;
      }

      if (!data || data.length === 0) {
        emit(initialCategories);
      } else {
        emit(data.map(c => ({ id: c.id, businessId: c.business_id, name: c.name, icon: c.icon })));
      }
    } catch (err) {
      console.warn('Supabase categories exception:', err);
      emit(initialCategories);
    }
  };

  fetchCats();

  const unsubSync = addSyncListener((entity) => {
    if (entity === 'categories' || entity === 'all') fetchCats();
  });

  const pollInterval = setInterval(fetchCats, 3000);

  let channel: any = null;
  try {
    channel = supabase
      .channel('public:categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchCats();
      })
      .subscribe();
  } catch (e) {}

  return () => {
    unsubSync();
    clearInterval(pollInterval);
    if (channel && supabase) supabase.removeChannel(channel);
  };
}

export function subscribeSupabaseProducts(callback: (products: Product[]) => void) {
  if (!supabase) {
    callback([]);
    return () => {};
  }

  let lastJsonStr = '';
  const emit = (prods: Product[]) => {
    const jsonStr = JSON.stringify(prods);
    if (jsonStr !== lastJsonStr) {
      lastJsonStr = jsonStr;
      callback(prods);
    }
  };

  const fetchProds = async () => {
    try {
      const ctx = await ensureActiveBusinessContext();
      let query = supabase.from('products').select('*');

      if (ctx?.businessId) {
        query = query.eq('business_id', ctx.businessId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        // Fallback for user_id column
        const userId = await getActiveUserId();
        if (userId) {
          const { data: fallbackData } = await supabase.from('products').select('*').eq('user_id', userId).order('created_at', { ascending: false });
          emit((fallbackData || []).map(mapProductFromDb));
          return;
        }
        emit([]);
        return;
      }

      // Accounts start with exact multi-tenant products
      emit((data || []).map(mapProductFromDb));
    } catch (err) {
      console.warn('Supabase products exception:', err);
      emit([]);
    }
  };

  fetchProds();

  const unsubSync = addSyncListener((entity) => {
    if (entity === 'products' || entity === 'all') fetchProds();
  });

  const pollInterval = setInterval(fetchProds, 3000);

  let channel: any = null;
  try {
    channel = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProds();
      })
      .subscribe();
  } catch (e) {}

  return () => {
    unsubSync();
    clearInterval(pollInterval);
    if (channel && supabase) supabase.removeChannel(channel);
  };
}

export function subscribeSupabaseTransactions(callback: (transactions: Transaction[]) => void) {
  if (!supabase) {
    callback([]);
    return () => {};
  }

  let lastJsonStr = '';
  const emit = (trxs: Transaction[]) => {
    const jsonStr = JSON.stringify(trxs);
    if (jsonStr !== lastJsonStr) {
      lastJsonStr = jsonStr;
      callback(trxs);
    }
  };

  const fetchTrxs = async () => {
    try {
      const ctx = await ensureActiveBusinessContext();
      let query = supabase.from('transactions').select('*, transaction_details(*)');

      if (ctx?.businessId) {
        query = query.eq('business_id', ctx.businessId);
      }

      const { data: trxs, error } = await query.order('created_at', { ascending: false });

      if (error) {
        const userId = await getActiveUserId();
        if (userId) {
          const { data: fallbackTrxs } = await supabase.from('transactions').select('*, transaction_details(*)').eq('user_id', userId).order('created_at', { ascending: false });
          emit(mapTransactionsFromDb(fallbackTrxs || []));
          return;
        }
        emit([]);
        return;
      }

      emit(mapTransactionsFromDb(trxs || []));
    } catch (err) {
      console.warn('Supabase transactions exception:', err);
      emit([]);
    }
  };

  fetchTrxs();

  const unsubSync = addSyncListener((entity) => {
    if (entity === 'transactions' || entity === 'all') fetchTrxs();
  });

  const pollInterval = setInterval(fetchTrxs, 3000);

  let channel: any = null;
  try {
    channel = supabase
      .channel('public:transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchTrxs();
      })
      .subscribe();
  } catch (e) {}

  return () => {
    unsubSync();
    clearInterval(pollInterval);
    if (channel && supabase) supabase.removeChannel(channel);
  };
}

export function subscribeSupabaseStockHistory(callback: (history: StockHistory[]) => void) {
  if (!supabase) {
    callback([]);
    return () => {};
  }

  let lastJsonStr = '';
  const emit = (history: StockHistory[]) => {
    const jsonStr = JSON.stringify(history);
    if (jsonStr !== lastJsonStr) {
      lastJsonStr = jsonStr;
      callback(history);
    }
  };

  const fetchStock = async () => {
    try {
      const ctx = await ensureActiveBusinessContext();
      let query = supabase.from('stock_history').select('*');

      if (ctx?.businessId) {
        query = query.eq('business_id', ctx.businessId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        const userId = await getActiveUserId();
        if (userId) {
          const { data: fallbackStock } = await supabase.from('stock_history').select('*').eq('user_id', userId).order('created_at', { ascending: false });
          emit(mapStockFromDb(fallbackStock || []));
          return;
        }
        emit([]);
        return;
      }

      emit(mapStockFromDb(data || []));
    } catch (err) {
      console.warn('Supabase stock history exception:', err);
      emit([]);
    }
  };

  fetchStock();

  const unsubSync = addSyncListener((entity) => {
    if (entity === 'stock' || entity === 'all') fetchStock();
  });

  const pollInterval = setInterval(fetchStock, 3000);

  let channel: any = null;
  try {
    channel = supabase
      .channel('public:stock_history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_history' }, () => {
        fetchStock();
      })
      .subscribe();
  } catch (e) {}

  return () => {
    unsubSync();
    clearInterval(pollInterval);
    if (channel && supabase) supabase.removeChannel(channel);
  };
}

export function subscribeSupabaseSettings(callback: (settings: StoreSettings) => void) {
  if (!supabase) {
    callback(initialStoreSettings);
    return () => {};
  }

  let lastJsonStr = '';
  const emit = (setts: StoreSettings) => {
    const jsonStr = JSON.stringify(setts);
    if (jsonStr !== lastJsonStr) {
      lastJsonStr = jsonStr;
      callback(setts);
    }
  };

  const fetchSettings = async () => {
    try {
      const ctx = await ensureActiveBusinessContext();
      let query = supabase.from('store_settings').select('*');

      if (ctx?.businessId) {
        query = query.or(`business_id.eq.${ctx.businessId},id.eq.store_settings_${ctx.businessId}`);
      }

      let { data } = await query.maybeSingle();

      if (!data) {
        const { data: defData } = await supabase
          .from('store_settings')
          .select('*')
          .eq('id', 'store_settings')
          .maybeSingle();
        data = defData;
      }

      if (!data) {
        emit(initialStoreSettings);
      } else {
        emit(mapSettingsFromDb(data));
      }
    } catch (err) {
      console.warn('Supabase settings exception:', err);
      emit(initialStoreSettings);
    }
  };

  fetchSettings();

  const unsubSync = addSyncListener((entity) => {
    if (entity === 'settings' || entity === 'all') fetchSettings();
  });

  const pollInterval = setInterval(fetchSettings, 3000);

  let channel: any = null;
  try {
    channel = supabase
      .channel('public:store_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, () => {
        fetchSettings();
      })
      .subscribe();
  } catch (e) {}

  return () => {
    unsubSync();
    clearInterval(pollInterval);
    if (channel && supabase) supabase.removeChannel(channel);
  };
}

// ==========================================
// SUPABASE CRUD OPERATIONS
// ==========================================

export async function supabaseCreateCategory(name: string, icon?: string): Promise<Category> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const ctx = await ensureActiveBusinessContext();
  const userId = await getActiveUserId();

  const id = `cat-${Date.now()}`;
  const newCat: any = { 
    id, 
    name, 
    icon: icon || 'Tag'
  };

  if (ctx?.businessId) newCat.business_id = ctx.businessId;
  if (userId) newCat.user_id = userId;

  const { error } = await supabase.from('categories').insert(newCat);
  if (error) throw new Error(error.message);

  return { id, businessId: ctx?.businessId, name, icon: icon || 'Tag' };
}

export async function supabaseCreateProduct(productData: Partial<Product>): Promise<Product> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const ctx = await ensureActiveBusinessContext();
  const userId = await getActiveUserId();

  const id = `prod-${Date.now()}`;
  const now = new Date().toISOString();
  const stockVal = Number(productData.stock) || 0;

  const newProduct: Product = {
    id,
    businessId: ctx?.businessId || '',
    name: productData.name || 'Produk Baru',
    categoryId: productData.categoryId || 'cat-1',
    categoryName: productData.categoryName || 'Umum',
    image: productData.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    description: productData.description || '',
    capitalPrice: Number(productData.capitalPrice) || 0,
    sellingPrice: Number(productData.sellingPrice) || 0,
    stock: stockVal,
    minStockAlert: Number(productData.minStockAlert) || 5,
    status: stockVal > 0 ? (productData.status || 'Tersedia') : 'Habis',
    barcode: productData.barcode || `899${Math.floor(100000 + Math.random() * 900000)}`,
    createdAt: now
  };

  const dbRow = mapProductToDb(newProduct, ctx?.businessId, userId);
  const { error: prodErr } = await supabase.from('products').insert(dbRow);
  if (prodErr) throw new Error(prodErr.message);

  if (stockVal > 0) {
    const stkRow: any = {
      id: `stk-${Date.now()}`,
      product_id: id,
      product_name: newProduct.name,
      type: 'in',
      quantity: stockVal,
      description: 'Stok awal produk baru',
      user_name: 'Admin / Owner',
      created_at: now
    };
    if (ctx?.businessId) stkRow.business_id = ctx.businessId;
    if (ctx?.outletId) stkRow.outlet_id = ctx.outletId;
    if (userId) stkRow.user_id = userId;

    await supabase.from('stock_history').insert(stkRow);
  }

  notifyDataChange('products');
  notifyDataChange('stock');
  return newProduct;
}

export async function supabaseUpdateProduct(id: string, productData: Partial<Product>): Promise<Product> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const ctx = await ensureActiveBusinessContext();
  const userId = await getActiveUserId();

  let currentProd: Product = {
    id,
    businessId: ctx?.businessId || '',
    name: productData.name || 'Produk',
    categoryId: productData.categoryId || 'cat-1',
    categoryName: productData.categoryName || 'Umum',
    image: productData.image || '',
    description: productData.description || '',
    capitalPrice: Number(productData.capitalPrice) || 0,
    sellingPrice: Number(productData.sellingPrice) || 0,
    stock: Number(productData.stock) || 0,
    minStockAlert: Number(productData.minStockAlert) || 5,
    status: (Number(productData.stock) || 0) > 0 ? 'Tersedia' : 'Habis',
    barcode: productData.barcode || '',
    createdAt: new Date().toISOString()
  };

  try {
    const { data: existing } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
    if (existing) {
      currentProd = mapProductFromDb(existing);
    }
  } catch (e) {}

  const stockVal = productData.stock !== undefined ? Number(productData.stock) : currentProd.stock;

  const updated: Product = {
    ...currentProd,
    ...productData,
    capitalPrice: productData.capitalPrice !== undefined ? Number(productData.capitalPrice) : currentProd.capitalPrice,
    sellingPrice: productData.sellingPrice !== undefined ? Number(productData.sellingPrice) : currentProd.sellingPrice,
    stock: stockVal,
    minStockAlert: productData.minStockAlert !== undefined ? Number(productData.minStockAlert) : currentProd.minStockAlert,
    status: stockVal > 0 ? (productData.status || 'Tersedia') : 'Habis'
  };

  const dbRow = mapProductToDb(updated, ctx?.businessId || currentProd.businessId, userId);
  const { error: updErr } = await supabase.from('products').upsert(dbRow);
  if (updErr) throw new Error(updErr.message);

  notifyDataChange('products');
  return updated;
}

export async function supabaseDeleteProduct(id: string): Promise<{ message: string }> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
  notifyDataChange('products');
  return { message: 'Produk berhasil dihapus dari Supabase.' };
}

export async function supabaseCreateTransaction(payload: {
  items: CartItem[];
  paymentMethod: string;
  paidAmount: number;
  discount: number;
  userName?: string;
  userId?: string;
  branchName?: string;
}): Promise<Transaction> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  if (!payload.items || payload.items.length === 0) {
    throw new Error('Keranjang belanja kosong.');
  }

  const ctx = await ensureActiveBusinessContext();
  const userId = await getActiveUserId() || payload.userId || 'usr-kasir';
  const now = new Date();

  // Fetch settings for tax
  let taxRate = 11;
  let invoicePrefix = 'INV-KP';

  if (ctx?.businessId) {
    const { data: setts } = await supabase
      .from('store_settings')
      .select('*')
      .or(`business_id.eq.${ctx.businessId},id.eq.store_settings_${ctx.businessId}`)
      .maybeSingle();

    if (setts) {
      taxRate = Number(setts.tax_rate) ?? 11;
      invoicePrefix = setts.invoice_prefix || 'INV-KP';
    }
  }

  let subtotal = 0;
  let totalCapital = 0;
  const details = [];

  for (const item of payload.items) {
    let prodData = null;
    
    // 1. Try finding by ID
    try {
      let q = supabase.from('products').select('*').eq('id', item.product.id);
      if (ctx?.businessId) q = q.eq('business_id', ctx.businessId);
      const { data: byId } = await q.maybeSingle();
      prodData = byId;
    } catch (e) {}

    // 2. Try finding by Name if ID didn't match
    if (!prodData && item.product.name) {
      try {
        let q = supabase.from('products').select('*').ilike('name', item.product.name);
        if (ctx?.businessId) q = q.eq('business_id', ctx.businessId);
        const { data: byName } = await q.maybeSingle();
        prodData = byName;
      } catch (e) {}
    }

    // 3. Auto-insert product to Supabase if missing
    if (!prodData) {
      try {
        const dbRow = mapProductToDb(item.product, ctx?.businessId, userId);
        await supabase.from('products').upsert(dbRow);
        prodData = dbRow;
      } catch (e) {
        console.warn('Gagal auto-seed product di Supabase:', e);
      }
    }

    const prod = prodData ? mapProductFromDb(prodData) : item.product;
    if (prod.stock < item.quantity) {
      throw new Error(`Stok ${prod.name} tidak mencukupi (Tersisa: ${prod.stock}).`);
    }

    const addonsTotalPrice = (item.selectedAddons || []).reduce((acc, a) => acc + (a.price || 0), 0);
    const unitPriceWithAddons = prod.sellingPrice + addonsTotalPrice;
    const itemSubtotal = unitPriceWithAddons * item.quantity;
    subtotal += itemSubtotal;
    totalCapital += prod.capitalPrice * item.quantity;

    // Deduct stock in Supabase
    const newStock = Math.max(0, prod.stock - item.quantity);
    try {
      await supabase.from('products').update({
        stock: newStock,
        status: newStock > 0 ? 'Tersedia' : 'Habis'
      }).eq('id', prod.id);
    } catch (e) {}

    details.push({
      id: `det-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      transaction_id: '',
      business_id: ctx?.businessId,
      product_id: prod.id,
      product_name: prod.name,
      product_image: prod.image,
      quantity: item.quantity,
      price: unitPriceWithAddons,
      capital_price: prod.capitalPrice,
      subtotal: itemSubtotal,
      selected_addons: item.selectedAddons || [],
      notes: item.notes || '',
      user_id: userId
    });

    // Log stock out
    try {
      const stkRow: any = {
        id: `stk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        product_id: prod.id,
        product_name: prod.name,
        type: 'out',
        quantity: item.quantity,
        description: 'Penjualan Kasir POS',
        user_name: payload.userName || 'Kasir',
        user_id: userId,
        created_at: now.toISOString()
      };
      if (ctx?.businessId) stkRow.business_id = ctx.businessId;
      if (ctx?.outletId) stkRow.outlet_id = ctx.outletId;

      await supabase.from('stock_history').insert(stkRow);
    } catch (e) {}
  }

  const discountAmount = Math.round(subtotal * ((payload.discount || 0) / 100));
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = Math.round(afterDiscount * (taxRate / 100));
  const total = afterDiscount + taxAmount;
  const profit = total - totalCapital;

  const paid = Number(payload.paidAmount) || total;
  const change = Math.max(0, paid - total);

  const timeStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const invoiceNumber = `${invoicePrefix}-${timeStr}-${randomSuffix}`;
  const transactionId = `trx-${Date.now()}`;

  details.forEach(d => d.transaction_id = transactionId);

  // Insert transaction row (using standard user_id and user_name columns)
  const txRow: any = {
    id: transactionId,
    invoice_number: invoiceNumber,
    user_id: userId,
    user_name: payload.userName || 'Kasir POS',
    user_role: 'Kasir',
    subtotal,
    discount: discountAmount,
    tax: taxAmount,
    total,
    profit,
    payment_method: payload.paymentMethod || 'Cash',
    paid_amount: paid,
    change_amount: change,
    branch_name: payload.branchName || 'Cabang Utama',
    created_at: now.toISOString()
  };

  if (ctx?.businessId) txRow.business_id = ctx.businessId;
  if (ctx?.outletId) txRow.outlet_id = ctx.outletId;

  // Insert transaction row with auto-recovery for unmapped schema columns
  let insertSuccess = false;
  let lastErrorMsg = '';

  for (let attempt = 0; attempt < 5; attempt++) {
    const { error: txErr } = await supabase.from('transactions').insert(txRow);
    if (!txErr) {
      insertSuccess = true;
      break;
    }

    lastErrorMsg = txErr.message || '';
    const match = lastErrorMsg.match(/Could not find the '([^']+)' column/i);
    if (match && match[1] && txRow.hasOwnProperty(match[1])) {
      console.warn(`Removing unmapped column '${match[1]}' from transactions insert row and retrying...`);
      delete txRow[match[1]];
    } else {
      break;
    }
  }

  if (!insertSuccess) {
    throw new Error(`Gagal menyimpan transaksi ke database: ${lastErrorMsg}`);
  }

  // Insert details rows
  if (details.length > 0) {
    let { error: detErr } = await supabase.from('transaction_details').insert(details);
    if (detErr && detErr.message?.includes('Could not find the')) {
      const match = detErr.message.match(/Could not find the '([^']+)' column/i);
      if (match && match[1]) {
        details.forEach(d => delete (d as any)[match[1]]);
        const retry = await supabase.from('transaction_details').insert(details);
        detErr = retry.error;
      }
    }
    if (detErr) console.error('Error inserting transaction details:', detErr);
  }

  const newTx: Transaction = {
    id: transactionId,
    businessId: ctx?.businessId,
    outletId: ctx?.outletId,
    invoiceNumber,
    userId,
    userName: payload.userName || 'Kasir POS',
    userRole: 'Kasir',
    subtotal,
    discount: discountAmount,
    tax: taxAmount,
    total,
    profit,
    paymentMethod: (payload.paymentMethod as PaymentMethod) || 'Cash',
    paidAmount: paid,
    changeAmount: change,
    createdAt: now.toISOString(),
    branchName: payload.branchName || 'Cabang Utama',
    details: details.map(d => ({
      id: d.id,
      transactionId: d.transaction_id,
      businessId: d.business_id,
      productId: d.product_id,
      productName: d.product_name,
      productImage: d.product_image,
      quantity: d.quantity,
      price: d.price,
      capitalPrice: d.capital_price,
      subtotal: d.subtotal
    }))
  };

  notifyDataChange('transactions');
  notifyDataChange('products');
  notifyDataChange('stock');

  return newTx;
}

export async function supabaseAdjustStock(payload: {
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  description: string;
  userName?: string;
}): Promise<{ message: string; log: StockHistory }> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const ctx = await ensureActiveBusinessContext();
  const userId = await getActiveUserId();

  let { data: prodData } = await supabase.from('products').select('*').eq('id', payload.productId).maybeSingle();
  if (!prodData) throw new Error('Produk tidak ditemukan di Supabase');

  const product = mapProductFromDb(prodData);
  const qty = Number(payload.quantity);
  if (isNaN(qty) || qty <= 0) throw new Error('Jumlah stok harus angka lebih dari 0.');

  let newStock = product.stock;
  if (payload.type === 'in') {
    newStock += qty;
  } else if (payload.type === 'out') {
    if (product.stock < qty) throw new Error('Jumlah pengurangan melebihi stok yang ada.');
    newStock -= qty;
  } else if (payload.type === 'adjustment') {
    newStock = qty;
  }

  await supabase.from('products').update({
    stock: newStock,
    status: newStock > 0 ? 'Tersedia' : 'Habis'
  }).eq('id', product.id);

  const logId = `stk-${Date.now()}`;
  const nowStr = new Date().toISOString();
  const logRow: any = {
    id: logId,
    product_id: product.id,
    product_name: product.name,
    type: payload.type,
    quantity: qty,
    previous_stock: product.stock,
    new_stock: newStock,
    description: payload.description || 'Penyesuaian stok manual',
    note: payload.description || 'Penyesuaian stok manual',
    user_name: payload.userName || 'Admin / Owner',
    created_at: nowStr
  };

  if (ctx?.businessId) logRow.business_id = ctx.businessId;
  if (ctx?.outletId) logRow.outlet_id = ctx.outletId;
  if (userId) logRow.user_id = userId;

  await supabase.from('stock_history').insert(logRow);

  return {
    message: 'Stok berhasil diperbarui di Supabase.',
    log: {
      id: logId,
      businessId: ctx?.businessId,
      outletId: ctx?.outletId,
      productId: product.id,
      productName: product.name,
      type: payload.type,
      quantity: qty,
      previousStock: product.stock,
      newStock: newStock,
      description: logRow.description,
      note: logRow.note,
      createdAt: nowStr,
      userName: logRow.user_name
    }
  };
}

export async function supabaseUpdateSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const ctx = await ensureActiveBusinessContext();
  const userId = await getActiveUserId();

  const settingsId = ctx?.businessId ? `store_settings_${ctx.businessId}` : (userId ? `store_settings_${userId}` : 'store_settings');

  const dbData = mapSettingsToDb({ ...settings, id: settingsId }, ctx?.businessId);
  if (userId) dbData.user_id = userId;

  let updateSuccess = false;
  let lastErrorMsg = '';

  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.from('store_settings').upsert(dbData);
    if (!error) {
      updateSuccess = true;
      break;
    }

    lastErrorMsg = error.message || '';
    const match = lastErrorMsg.match(/Could not find the '([^']+)' column/i);
    if (match && match[1] && dbData.hasOwnProperty(match[1])) {
      console.warn(`Removing unmapped column '${match[1]}' from store_settings update row and retrying...`);
      delete dbData[match[1]];
    } else {
      break;
    }
  }

  if (!updateSuccess) {
    throw new Error(`Gagal menyimpan pengaturan ke database: ${lastErrorMsg}`);
  }

  const { data } = await supabase.from('store_settings').select('*').eq('id', settingsId).maybeSingle();
  const result = mapSettingsFromDb(data || settings);
  if (settings.qrisImage) {
    result.qrisImage = settings.qrisImage;
  }
  return result;
}

// ==========================================
// TEAM MANAGEMENT & INVITATIONS API
// ==========================================

export async function supabaseFetchOutlets(businessId: string): Promise<Outlet[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('outlets')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data.map((row: any) => ({
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    address: row.address || '',
    phone: row.phone || '',
    isActive: row.is_active ?? true,
    createdAt: row.created_at
  }));
}

export async function supabaseFetchTeamMembers(businessId: string): Promise<BusinessMember[]> {
  if (!supabase) return [];
  try {
    const { data: members, error } = await supabase
      .from('business_members')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (error || !members) return [];

    // Fetch profiles & outlets for details
    const userIds = members.map((m: any) => m.user_id).filter(Boolean);
    const outletIds = members.map((m: any) => m.outlet_id).filter(Boolean);

    let profilesMap: Record<string, { name: string; email: string; avatarUrl?: string }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .in('id', userIds);

      (profiles || []).forEach((p: any) => {
        profilesMap[p.id] = { name: p.name, email: p.email, avatarUrl: p.avatar_url };
      });
    }

    let outletsMap: Record<string, string> = {};
    if (outletIds.length > 0) {
      const { data: outlets } = await supabase
        .from('outlets')
        .select('id, name')
        .in('id', outletIds);

      (outlets || []).forEach((o: any) => {
        outletsMap[o.id] = o.name;
      });
    }

    return members.map((m: any) => {
      const prof = profilesMap[m.user_id] || { name: 'Anggota Tim', email: m.user_id, avatarUrl: undefined };
      return {
        id: m.id,
        businessId: m.business_id,
        userId: m.user_id,
        role: m.role || 'cashier',
        outletId: m.outlet_id || null,
        status: m.status || 'active',
        invitedBy: m.invited_by || '',
        createdAt: m.created_at,
        profileName: prof.name,
        profileEmail: prof.email,
        profileAvatar: prof.avatarUrl,
        outletName: m.outlet_id ? (outletsMap[m.outlet_id] || 'Cabang Khusus') : 'Semua Outlet'
      };
    });
  } catch (err) {
    console.error('Error fetching team members:', err);
    return [];
  }
}

export async function supabaseFetchInvitations(businessId: string): Promise<BusinessInvitation[]> {
  if (!supabase) return [];
  try {
    const { data: invs, error } = await supabase
      .from('business_invitations')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error || !invs) return [];

    const outletIds = invs.map((i: any) => i.outlet_id).filter(Boolean);
    let outletsMap: Record<string, string> = {};

    if (outletIds.length > 0) {
      const { data: outlets } = await supabase
        .from('outlets')
        .select('id, name')
        .in('id', outletIds);

      (outlets || []).forEach((o: any) => {
        outletsMap[o.id] = o.name;
      });
    }

    return invs.map((i: any) => ({
      id: i.id,
      businessId: i.business_id,
      email: i.email,
      role: i.role,
      outletId: i.outlet_id || null,
      token: i.token,
      status: i.status || 'pending',
      invitedBy: i.invited_by,
      createdAt: i.created_at,
      expiresAt: i.expires_at,
      acceptedAt: i.accepted_at,
      outletName: i.outlet_id ? (outletsMap[i.outlet_id] || 'Cabang Khusus') : 'Semua Outlet'
    }));
  } catch (err) {
    console.error('Error fetching invitations:', err);
    return [];
  }
}

export async function supabaseCreateInvitation(payload: {
  businessId: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier';
  outletId?: string | null;
  invitedBy?: string;
}): Promise<BusinessInvitation> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const cleanEmail = payload.email.toLowerCase().trim();

  // Check if member already exists
  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('id, email')
    .ilike('email', cleanEmail);

  if (existingProfiles && existingProfiles.length > 0) {
    const existingUserId = existingProfiles[0].id;
    const { data: existingMember } = await supabase
      .from('business_members')
      .select('id, role')
      .eq('business_id', payload.businessId)
      .eq('user_id', existingUserId)
      .maybeSingle();

    if (existingMember) {
      throw new Error(`Pengguna dengan email ${cleanEmail} sudah menjadi anggota di bisnis ini.`);
    }
  }

  const token = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const invId = `inv_${Date.now()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const newInvRow: any = {
    id: invId,
    business_id: payload.businessId,
    email: cleanEmail,
    role: payload.role,
    outlet_id: payload.outletId || null,
    token,
    status: 'pending',
    invited_by: payload.invitedBy || 'Owner',
    created_at: now.toISOString(),
    expires_at: expiresAt
  };

  const { error } = await supabase.from('business_invitations').insert(newInvRow);
  if (error) throw new Error(error.message);

  let outletName = 'Semua Outlet';
  if (payload.outletId) {
    const { data: o } = await supabase.from('outlets').select('name').eq('id', payload.outletId).maybeSingle();
    if (o?.name) outletName = o.name;
  }

  return {
    id: invId,
    businessId: payload.businessId,
    email: cleanEmail,
    role: payload.role,
    outletId: payload.outletId || null,
    token,
    status: 'pending',
    invitedBy: payload.invitedBy,
    createdAt: now.toISOString(),
    expiresAt,
    outletName
  };
}

export async function supabaseRevokeInvitation(invitationId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase
    .from('business_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId);

  if (error) throw new Error(error.message);
}

export async function supabaseDeleteInvitation(invitationId: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('business_invitations')
    .delete()
    .or(`id.eq.${invitationId},token.eq.${invitationId}`);
}

export async function supabaseResendInvitation(invitationId: string): Promise<BusinessInvitation> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('business_invitations')
    .update({
      status: 'pending',
      expires_at: newExpires
    })
    .eq('id', invitationId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Gagal memperbarui undangan.');

  return {
    id: data.id,
    businessId: data.business_id,
    email: data.email,
    role: data.role,
    outletId: data.outlet_id,
    token: data.token,
    status: 'pending',
    invitedBy: data.invited_by,
    createdAt: data.created_at,
    expiresAt: newExpires
  };
}

export async function supabaseUpdateMemberRoleAndOutlet(
  memberId: string, 
  role: 'admin' | 'manager' | 'cashier', 
  outletId?: string | null
): Promise<void> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');

  // Guard: Check member role to ensure Owner cannot be edited to something else
  const { data: targetMember } = await supabase
    .from('business_members')
    .select('role')
    .eq('id', memberId)
    .maybeSingle();

  if (targetMember?.role === 'owner') {
    throw new Error('Role Owner tidak dapat diubah tanpa mekanisme transfer ownership.');
  }

  let { error } = await supabase
    .from('business_members')
    .update({
      role,
      outlet_id: outletId || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', memberId);

  if (error && (error.message?.includes('check constraint') || error.message?.includes('role_check'))) {
    // Fallback if Supabase database constraint limits role to ('owner', 'admin', 'cashier')
    const fallbackRole = role === 'manager' ? 'admin' : 'cashier';
    const retry = await supabase
      .from('business_members')
      .update({
        role: fallbackRole,
        outlet_id: outletId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId);
    error = retry.error;
  }

  if (error) throw new Error(error.message);
}

export async function supabaseToggleMemberStatus(memberId: string, status: 'active' | 'disabled'): Promise<void> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');

  const { data: targetMember } = await supabase
    .from('business_members')
    .select('role')
    .eq('id', memberId)
    .maybeSingle();

  if (targetMember?.role === 'owner') {
    throw new Error('Akun Owner tidak dapat dinonaktifkan.');
  }

  const { error } = await supabase
    .from('business_members')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', memberId);

  if (error) throw new Error(error.message);
}

export async function supabaseDeleteMember(memberId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');

  const { data: targetMember } = await supabase
    .from('business_members')
    .select('role')
    .eq('id', memberId)
    .maybeSingle();

  if (targetMember?.role === 'owner') {
    throw new Error('Akun Owner (Pemilik Utama) tidak dapat dihapus atau dipecat.');
  }

  const { error } = await supabase
    .from('business_members')
    .delete()
    .eq('id', memberId);

  if (error) throw new Error(error.message);
}

export async function supabaseAcceptInvitationByToken(token: string): Promise<boolean> {
  const userId = await getActiveUserId();
  if (!userId) return false;

  const cleanToken = token.trim();

  // 1. Fetch invitation by token or id
  let inv: any = null;
  const { data: invByToken } = await supabase
    .from('business_invitations')
    .select('*')
    .eq('token', cleanToken)
    .maybeSingle();

  if (invByToken) {
    inv = invByToken;
  } else {
    const { data: invById } = await supabase
      .from('business_invitations')
      .select('*')
      .eq('id', cleanToken)
      .maybeSingle();
    if (invById) {
      inv = invById;
    }
  }

  if (!inv) {
    // Fallback: check if logged-in user email has pending invitation
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email?.toLowerCase().trim();
      if (userEmail) {
        const { data: invByEmail } = await supabase
          .from('business_invitations')
          .select('*')
          .eq('email', userEmail)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (invByEmail) {
          inv = invByEmail;
        }
      }
    } catch (e) {
      console.warn('Fallback check pending invitation by email exception:', e);
    }
  }

  if (!inv) {
    throw new Error('Undangan tidak ditemukan atau token tidak valid.');
  }

  // 2. Check if current user is already a member of this business
  const { data: existingMember } = await supabase
    .from('business_members')
    .select('id, role, status')
    .eq('business_id', inv.business_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingMember) {
    // Current user is already a member (e.g. auto-joined by email match or previously accepted)
    if (inv.status === 'pending') {
      await supabase.from('business_invitations').update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      }).eq('id', inv.id);
    }
    return true;
  }

  // 3. Handle status checks when user is NOT yet a member
  if (inv.status === 'revoked') {
    throw new Error('Undangan ini telah dibatalkan oleh pemilik toko.');
  }

  if (inv.status === 'accepted') {
    throw new Error('Undangan ini sudah pernah digunakan oleh akun lain.');
  }

  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    await supabase.from('business_invitations').update({ status: 'expired' }).eq('id', inv.id);
    throw new Error('Masa berlaku undangan ini telah kedaluwarsa.');
  }

  // 4. Create business membership and update invitation status
  await supabase.from('business_members').insert({
    id: `bm-${userId}-${Date.now().toString(36)}`,
    business_id: inv.business_id,
    user_id: userId,
    role: inv.role,
    outlet_id: inv.outlet_id || null,
    status: 'active',
    invited_by: inv.invited_by
  });

  await supabase.from('business_invitations').update({
    status: 'accepted',
    accepted_at: new Date().toISOString()
  }).eq('id', inv.id);

  return true;
}

export async function supabaseCreateStaffAccount(payload: {
  businessId: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'manager' | 'cashier';
  outletId?: string | null;
}) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const cleanEmail = payload.email.toLowerCase().trim();
  const password = payload.password || `Kasir_${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Check if email already exists in profiles
  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('id, email')
    .ilike('email', cleanEmail);

  let userId: string | null = null;
  let isNewUserCreated = false;

  if (existingProfiles && existingProfiles.length > 0) {
    userId = existingProfiles[0].id;

    // Check if member already exists in this business
    const { data: existingMember } = await supabase
      .from('business_members')
      .select('id')
      .eq('business_id', payload.businessId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      throw new Error(`Email ${cleanEmail} sudah terdaftar sebagai anggota tim pada bisnis ini.`);
    }
  } else {
    // Register new auth user using a secondary unpersisting client so Owner session remains intact
    const supabaseUrl = (import.meta.env as any).VITE_SUPABASE_URL || 'https://tojiucixrcnpmxlshbll.supabase.co';
    const supabaseAnonKey = (import.meta.env as any).VITE_SUPABASE_ANON_KEY || 'sb_publishable_TUQ8gQHIV3f7bSajBth51Q_m7fxgdZv';

    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          full_name: payload.name,
          role: payload.role === 'admin' ? 'Admin' : payload.role === 'manager' ? 'Pengelola' : 'Kasir'
        }
      }
    });

    if (signUpError) {
      const lowerMsg = signUpError.message?.toLowerCase() || '';
      if (lowerMsg.includes('already registered') || lowerMsg.includes('already exists')) {
        throw new Error(`Email ${cleanEmail} sudah terdaftar di sistem Supabase. Staf dapat langsung diundang atau gunakan email lain.`);
      }
      throw new Error(`Gagal membuat akun staf: ${signUpError.message}`);
    }

    if (!signUpData.user?.id) {
      throw new Error('Gagal mendapatkan ID pengguna baru dari Supabase Auth.');
    }

    userId = signUpData.user.id;
    isNewUserCreated = true;

    // Try to insert profile using the newly created user's session if available
    if (signUpData.session) {
      try {
        await tempClient.from('profiles').upsert({
          id: userId,
          name: payload.name,
          email: cleanEmail
        });
      } catch (e) {
        console.warn('tempClient profiles upsert warning:', e);
      }
    }
  }

  // 2. Ensure profile is inserted into profiles table using main client
  try {
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      name: payload.name,
      email: cleanEmail
    });
    if (profileError) {
      console.warn('Supabase profile upsert warning:', profileError.message);
    }
  } catch (e) {
    console.warn('Supabase profile upsert exception:', e);
  }

  // 3. Create business member
  const memberId = `bm-${userId.substring(0, 8)}-${Date.now().toString(36)}`;
  let { error: memberError } = await supabase.from('business_members').insert({
    id: memberId,
    business_id: payload.businessId,
    user_id: userId,
    role: payload.role,
    outlet_id: payload.outletId || null,
    status: 'active'
  });

  if (memberError && (memberError.message?.includes('check constraint') || memberError.message?.includes('role_check'))) {
    // Fallback if Supabase table constraint restricts role to ('owner', 'admin', 'cashier')
    const fallbackRole = payload.role === 'manager' ? 'admin' : 'cashier';
    const retry = await supabase.from('business_members').insert({
      id: memberId,
      business_id: payload.businessId,
      user_id: userId,
      role: fallbackRole,
      outlet_id: payload.outletId || null,
      status: 'active'
    });
    memberError = retry.error;
  }

  if (memberError && !memberError.message?.includes('duplicate')) {
    throw new Error(`Gagal menambahkan staf ke bisnis: ${memberError.message}`);
  }

  // 4. Save staff credential info to business_invitations for cross-device staff authentication
  try {
    const tokenStr = `STAFF_PWD:${password}`;
    await supabase.from('business_invitations').upsert({
      id: `inv-staff-${userId.substring(0, 12)}`,
      business_id: payload.businessId,
      email: cleanEmail,
      role: payload.role,
      outlet_id: payload.outletId || null,
      invited_by: payload.name,
      token: tokenStr,
      status: 'accepted'
    });
  } catch (invErr) {
    console.warn('business_invitations staff pwd record warning:', invErr);
  }

  // 5. Store in local staff credentials array in localStorage
  try {
    const existingStaff = JSON.parse(localStorage.getItem('kasirpro_staff_credentials') || '[]');
    const updatedStaff = existingStaff.filter((s: any) => s.email !== cleanEmail);
    updatedStaff.push({
      email: cleanEmail,
      password: password,
      userId: userId,
      name: payload.name,
      role: payload.role,
      businessId: payload.businessId,
      outletId: payload.outletId || null
    });
    localStorage.setItem('kasirpro_staff_credentials', JSON.stringify(updatedStaff));
  } catch (e) {
    console.warn('Gagal menyimpan kasirpro_staff_credentials ke localStorage:', e);
  }

  notifyDataChange('team');

  return {
    userId,
    email: cleanEmail,
    name: payload.name,
    password,
    role: payload.role,
    outletId: payload.outletId || null
  };
}

