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
  DashboardStats 
} from '../types';
import { initialCategories, initialProducts, initialStoreSettings } from '../data/mockSeed';

import { isSupabaseConfigured, supabase } from './supabase';
import {
  subscribeSupabaseCategories,
  subscribeSupabaseProducts,
  subscribeSupabaseTransactions,
  subscribeSupabaseStockHistory,
  subscribeSupabaseSettings,
  supabaseCreateCategory,
  supabaseCreateProduct,
  supabaseUpdateProduct,
  supabaseDeleteProduct,
  supabaseCreateTransaction,
  supabaseAdjustStock,
  supabaseUpdateSettings
} from './supabaseApi';

// In-Memory / Local Storage State for standalone/offline fallback
const LOCAL_USER_KEY = 'kasirpro_current_user';
const LOCAL_PRODUCTS_KEY = 'kasirpro_products';
const LOCAL_CATEGORIES_KEY = 'kasirpro_categories';
const LOCAL_TRANSACTIONS_KEY = 'kasirpro_transactions';
const LOCAL_STOCK_KEY = 'kasirpro_stock_history';
const LOCAL_SETTINGS_KEY = 'kasirpro_settings';

function getLocalData<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setLocalData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Gagal menyimpan ke localStorage:', e);
  }
}

// ==========================================
// REALTIME AUTHENTICATION & USER PROFILE
// ==========================================

export function listenAuthState(onChange: (user: User | null, isRecovery?: boolean) => void) {
  if (isSupabaseConfigured && supabase) {
    const isRecoveryUrl = window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const sbUser: User = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Pengguna Toko',
          email: session.user.email || '',
          role: (session.user.user_metadata?.role as UserRole) || 'Owner',
          branch: 'Cabang Utama'
        };
        setLocalData(LOCAL_USER_KEY, sbUser);
        onChange(sbUser, isRecoveryUrl);
      } else {
        localStorage.removeItem(LOCAL_USER_KEY);
        onChange(null, isRecoveryUrl);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const isRecoveryEvent = event === 'PASSWORD_RECOVERY' || window.location.hash.includes('type=recovery');

      if (session?.user) {
        const sbUser: User = {
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Pengguna Toko',
          email: session.user.email || '',
          role: (session.user.user_metadata?.role as UserRole) || 'Owner',
          branch: 'Cabang Utama'
        };
        setLocalData(LOCAL_USER_KEY, sbUser);
        onChange(sbUser, isRecoveryEvent);
      } else {
        localStorage.removeItem(LOCAL_USER_KEY);
        onChange(null, isRecoveryEvent);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }

  // If Supabase is not configured, require login and clear legacy demo tokens
  localStorage.removeItem(LOCAL_USER_KEY);
  onChange(null, false);

  return () => {};
}

function parseAuthError(errorMsg: string): string {
  const msg = errorMsg.toLowerCase();
  if (msg.includes('rate limit') || msg.includes('email rate limit exceeded')) {
    return 'Batas pengiriman email Supabase tercapai (layanan email bawaan Supabase dibatasi maks. 3-4 email/jam). Silakan tunggu ~1 jam, atau tingkatkan Rate Limit/pasang Custom SMTP (seperti Resend/Brevo) di Dashboard Supabase (Project Settings > Authentication > Email Settings).';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Email atau kata sandi salah. Silakan periksa kembali data Anda.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists')) {
    return 'Email ini sudah terdaftar. Silakan langsung login atau gunakan fitur Lupa Password.';
  }
  return errorMsg;
}

export async function apiLogin(email: string, password?: string): Promise<{ user: User; message: string }> {
  if (!email || !password) {
    throw new Error('Email dan password wajib diisi.');
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(parseAuthError(error.message));
    }

    if (data.user) {
      const u: User = {
        id: data.user.id,
        name: data.user.user_metadata?.full_name || email.split('@')[0],
        email: data.user.email || email,
        role: (data.user.user_metadata?.role as UserRole) || 'Owner',
        branch: 'Cabang Utama'
      };
      setLocalData(LOCAL_USER_KEY, u);
      return { user: u, message: 'Login berhasil via Supabase!' };
    }
  }

  throw new Error('Database Supabase belum terkonfigurasi. Sediakan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
}

export async function apiRegister(data: { name: string; email: string; password?: string; role: UserRole; branch?: string }): Promise<{ user: User; message: string }> {
  if (!data.email || !data.password) {
    throw new Error('Email dan password wajib diisi untuk membuat akun.');
  }

  if (isSupabaseConfigured && supabase) {
    const { data: res, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.name,
          role: data.role || 'Owner'
        }
      }
    });

    if (error) {
      throw new Error(parseAuthError(error.message));
    }

    if (res.user) {
      const newUser: User = {
        id: res.user.id,
        name: data.name,
        email: data.email,
        role: data.role || 'Owner',
        branch: data.branch || 'Cabang Utama'
      };
      setLocalData(LOCAL_USER_KEY, newUser);
      return { user: newUser, message: 'Registrasi akun berhasil di Supabase! Silakan cek email Anda.' };
    }
  }

  throw new Error('Database Supabase belum terkonfigurasi.');
}

export async function apiGoogleLogin(): Promise<{ user: User; message: string }> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      throw new Error(parseAuthError(error.message));
    }

    return { 
      user: null as any, 
      message: 'Mengarahkan ke Google Sign-In Supabase...' 
    };
  }

  throw new Error('Database Supabase belum terkonfigurasi untuk Google Sign-In.');
}

export async function apiForgotPassword(email: string): Promise<{ message: string }> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}`
    });
    if (error) {
      throw new Error(parseAuthError(error.message));
    }
    return { message: `Petunjuk pemulihan password telah dikirim ke ${email}. Cek inbox atau folder spam email Anda.` };
  }
  throw new Error('Database Supabase belum terkonfigurasi.');
}

export async function apiUpdatePassword(newPassword: string): Promise<{ message: string }> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) {
      throw new Error(parseAuthError(error.message));
    }
    await supabase.auth.signOut();
    return { message: 'Kata sandi Anda berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.' };
  }
  throw new Error('Database Supabase belum terkonfigurasi.');
}

export async function apiLogout(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
  }
  localStorage.removeItem(LOCAL_USER_KEY);
}

// ==========================================
// REALTIME LISTENERS (SUPABASE / LOCAL)
// ==========================================

export function subscribeCategories(callback: (categories: Category[]) => void) {
  if (isSupabaseConfigured) {
    return subscribeSupabaseCategories(callback);
  }

  const cats = getLocalData<Category[]>(LOCAL_CATEGORIES_KEY, initialCategories);
  callback(cats);
  return () => {};
}

export function subscribeProducts(callback: (products: Product[]) => void) {
  if (isSupabaseConfigured) {
    return subscribeSupabaseProducts(callback);
  }

  const prods = getLocalData<Product[]>(LOCAL_PRODUCTS_KEY, initialProducts);
  callback(prods);
  return () => {};
}

export function subscribeTransactions(callback: (transactions: Transaction[]) => void) {
  if (isSupabaseConfigured) {
    return subscribeSupabaseTransactions(callback);
  }

  const trxs = getLocalData<Transaction[]>(LOCAL_TRANSACTIONS_KEY, []);
  callback(trxs);
  return () => {};
}

export function subscribeStockHistory(callback: (history: StockHistory[]) => void) {
  if (isSupabaseConfigured) {
    return subscribeSupabaseStockHistory(callback);
  }

  const logs = getLocalData<StockHistory[]>(LOCAL_STOCK_KEY, []);
  callback(logs);
  return () => {};
}

export function subscribeSettings(callback: (settings: StoreSettings) => void) {
  if (isSupabaseConfigured) {
    return subscribeSupabaseSettings(callback);
  }

  const setts = getLocalData<StoreSettings>(LOCAL_SETTINGS_KEY, initialStoreSettings);
  callback(setts);
  return () => {};
}

// ==========================================
// CRUD OPERATIONS (SUPABASE / LOCAL)
// ==========================================

export async function apiCreateCategory(name: string, icon?: string): Promise<Category> {
  if (isSupabaseConfigured) {
    return supabaseCreateCategory(name, icon);
  }

  const cats = getLocalData<Category[]>(LOCAL_CATEGORIES_KEY, initialCategories);
  const id = `cat-${Date.now()}`;
  const newCat: Category = { id, name, icon: icon || 'Tag' };
  const updated = [...cats, newCat];
  setLocalData(LOCAL_CATEGORIES_KEY, updated);
  return newCat;
}

export async function apiCreateProduct(productData: Partial<Product>): Promise<Product> {
  if (isSupabaseConfigured) {
    return supabaseCreateProduct(productData);
  }

  const prods = getLocalData<Product[]>(LOCAL_PRODUCTS_KEY, initialProducts);
  const id = `prod-${Date.now()}`;
  const now = new Date().toISOString();
  const stockVal = Number(productData.stock) || 0;

  const newProduct: Product = {
    id,
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

  const updatedProds = [newProduct, ...prods];
  setLocalData(LOCAL_PRODUCTS_KEY, updatedProds);

  if (stockVal > 0) {
    const logs = getLocalData<StockHistory[]>(LOCAL_STOCK_KEY, []);
    const newLog: StockHistory = {
      id: `stk-${Date.now()}`,
      productId: id,
      productName: newProduct.name,
      type: 'in',
      quantity: stockVal,
      description: 'Stok awal produk baru',
      createdAt: now,
      userName: 'Admin / Owner'
    };
    setLocalData(LOCAL_STOCK_KEY, [newLog, ...logs]);
  }

  return newProduct;
}

export async function apiUpdateProduct(id: string, productData: Partial<Product>): Promise<Product> {
  if (isSupabaseConfigured) {
    return supabaseUpdateProduct(id, productData);
  }

  const prods = getLocalData<Product[]>(LOCAL_PRODUCTS_KEY, initialProducts);
  const idx = prods.findIndex(p => p.id === id);
  if (idx === -1) {
    throw new Error('Produk tidak ditemukan');
  }

  const existing = prods[idx];
  const stockVal = productData.stock !== undefined ? Number(productData.stock) : existing.stock;

  const updated: Product = {
    ...existing,
    ...productData,
    capitalPrice: productData.capitalPrice !== undefined ? Number(productData.capitalPrice) : existing.capitalPrice,
    sellingPrice: productData.sellingPrice !== undefined ? Number(productData.sellingPrice) : existing.sellingPrice,
    stock: stockVal,
    minStockAlert: productData.minStockAlert !== undefined ? Number(productData.minStockAlert) : existing.minStockAlert,
    status: stockVal > 0 ? (productData.status || 'Tersedia') : 'Habis'
  };

  prods[idx] = updated;
  setLocalData(LOCAL_PRODUCTS_KEY, prods);
  return updated;
}

export async function apiDeleteProduct(id: string): Promise<{ message: string }> {
  if (isSupabaseConfigured) {
    return supabaseDeleteProduct(id);
  }

  const prods = getLocalData<Product[]>(LOCAL_PRODUCTS_KEY, initialProducts);
  const filtered = prods.filter(p => p.id !== id);
  setLocalData(LOCAL_PRODUCTS_KEY, filtered);
  return { message: 'Produk berhasil dihapus.' };
}

export async function apiCreateTransaction(payload: {
  items: CartItem[];
  paymentMethod: string;
  paidAmount: number;
  discount: number;
  userName?: string;
  userId?: string;
  branchName?: string;
}): Promise<Transaction> {
  if (isSupabaseConfigured) {
    return supabaseCreateTransaction(payload);
  }

  if (!payload.items || payload.items.length === 0) {
    throw new Error('Keranjang belanja kosong.');
  }

  const prods = getLocalData<Product[]>(LOCAL_PRODUCTS_KEY, initialProducts);
  const settings = getLocalData<StoreSettings>(LOCAL_SETTINGS_KEY, initialStoreSettings);

  const now = new Date();
  let subtotal = 0;
  let totalCapital = 0;
  const details = [];

  for (const item of payload.items) {
    const prod = prods.find(p => p.id === item.product.id);
    if (!prod) {
      throw new Error(`Produk ${item.product.name} tidak ditemukan.`);
    }

    if (prod.stock < item.quantity) {
      throw new Error(`Stok ${prod.name} tidak mencukupi (Tersisa: ${prod.stock}).`);
    }

    const itemSubtotal = prod.sellingPrice * item.quantity;
    subtotal += itemSubtotal;
    totalCapital += prod.capitalPrice * item.quantity;

    prod.stock -= item.quantity;
    prod.status = prod.stock > 0 ? 'Tersedia' : 'Habis';

    details.push({
      id: `det-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      transactionId: '',
      productId: prod.id,
      productName: prod.name,
      productImage: prod.image,
      quantity: item.quantity,
      price: prod.sellingPrice,
      capitalPrice: prod.capitalPrice,
      subtotal: itemSubtotal
    });
  }

  setLocalData(LOCAL_PRODUCTS_KEY, prods);

  const discountAmount = Math.round(subtotal * ((payload.discount || 0) / 100));
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = Math.round(afterDiscount * ((settings.taxRate || 0) / 100));
  const total = afterDiscount + taxAmount;
  const profit = total - totalCapital;

  const paid = Number(payload.paidAmount) || total;
  const change = Math.max(0, paid - total);

  const timeStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const invoicePrefix = settings.invoicePrefix || 'INV-KP';
  const invoiceNumber = `${invoicePrefix}-${timeStr}-${randomSuffix}`;
  const transactionId = `trx-${Date.now()}`;

  details.forEach(d => d.transactionId = transactionId);

  const newTx: Transaction = {
    id: transactionId,
    invoiceNumber,
    userId: payload.userId || 'usr-kasir',
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
    details
  };

  const trxs = getLocalData<Transaction[]>(LOCAL_TRANSACTIONS_KEY, []);
  setLocalData(LOCAL_TRANSACTIONS_KEY, [newTx, ...trxs]);

  return newTx;
}

export async function apiAdjustStock(payload: {
  productId: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  description: string;
  userName?: string;
}): Promise<{ message: string; log: StockHistory }> {
  if (isSupabaseConfigured) {
    return supabaseAdjustStock(payload);
  }

  const prods = getLocalData<Product[]>(LOCAL_PRODUCTS_KEY, initialProducts);
  const prod = prods.find(p => p.id === payload.productId);
  if (!prod) {
    throw new Error('Produk tidak ditemukan');
  }

  const qty = Number(payload.quantity);
  if (isNaN(qty) || qty <= 0) {
    throw new Error('Jumlah stok harus angka lebih dari 0.');
  }

  if (payload.type === 'in') {
    prod.stock += qty;
  } else if (payload.type === 'out') {
    if (prod.stock < qty) throw new Error('Jumlah pengurangan melebihi stok yang ada.');
    prod.stock -= qty;
  } else if (payload.type === 'adjustment') {
    prod.stock = qty;
  }

  prod.status = prod.stock > 0 ? 'Tersedia' : 'Habis';
  setLocalData(LOCAL_PRODUCTS_KEY, prods);

  const log: StockHistory = {
    id: `stk-${Date.now()}`,
    productId: prod.id,
    productName: prod.name,
    type: payload.type,
    quantity: qty,
    description: payload.description || 'Penyesuaian stok manual',
    createdAt: new Date().toISOString(),
    userName: payload.userName || 'Admin / Owner'
  };

  const logs = getLocalData<StockHistory[]>(LOCAL_STOCK_KEY, []);
  setLocalData(LOCAL_STOCK_KEY, [log, ...logs]);

  return { message: 'Stok berhasil diperbarui.', log };
}

export async function apiUpdateSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  if (isSupabaseConfigured) {
    return supabaseUpdateSettings(settings);
  }

  const existing = getLocalData<StoreSettings>(LOCAL_SETTINGS_KEY, initialStoreSettings);
  const updated = { ...existing, ...settings };
  setLocalData(LOCAL_SETTINGS_KEY, updated);
  return updated;
}

export function calculateDashboardStats(transactions: Transaction[], products: Product[]): DashboardStats {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const todayTrx = transactions.filter(t => new Date(t.createdAt).getTime() >= startOfToday);
  const todayRevenue = todayTrx.reduce((acc, t) => acc + t.total, 0);
  const todayProfit = todayTrx.reduce((acc, t) => acc + t.profit, 0);

  const productSalesMap: Record<string, { name: string; count: number; totalSales: number; image: string }> = {};

  transactions.forEach(t => {
    t.details.forEach(d => {
      if (!productSalesMap[d.productId]) {
        productSalesMap[d.productId] = {
          name: d.productName,
          count: 0,
          totalSales: 0,
          image: d.productImage || ''
        };
      }
      productSalesMap[d.productId].count += d.quantity;
      productSalesMap[d.productId].totalSales += d.subtotal;
    });
  });

  const topSellingProducts = Object.values(productSalesMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const lowStockProducts = products.filter(p => p.stock <= (p.minStockAlert || 5));

  const salesByDay = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 86400000;

    const dayTrx = transactions.filter(t => {
      const time = new Date(t.createdAt).getTime();
      return time >= dayStart && time < dayEnd;
    });

    const dayName = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
    salesByDay.push({
      label: dayName,
      revenue: dayTrx.reduce((acc, t) => acc + t.total, 0),
      profit: dayTrx.reduce((acc, t) => acc + t.profit, 0),
      count: dayTrx.length
    });
  }

  const salesByMonth = [];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = m.getTime();
    const nextM = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthEnd = nextM.getTime();

    const monthTrx = transactions.filter(t => {
      const time = new Date(t.createdAt).getTime();
      return time >= monthStart && time < monthEnd;
    });

    const monthName = m.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
    salesByMonth.push({
      label: monthName,
      revenue: monthTrx.reduce((acc, t) => acc + t.total, 0),
      profit: monthTrx.reduce((acc, t) => acc + t.profit, 0),
      count: monthTrx.length
    });
  }

  return {
    todayRevenue,
    todayTransactions: todayTrx.length,
    totalProducts: products.length,
    todayProfit,
    topSellingProducts,
    lowStockProducts,
    recentTransactions: transactions.slice(0, 8),
    salesByDay,
    salesByWeek: [],
    salesByMonth
  };
}

export async function apiResetData(): Promise<{ message: string }> {
  localStorage.removeItem(LOCAL_PRODUCTS_KEY);
  localStorage.removeItem(LOCAL_CATEGORIES_KEY);
  localStorage.removeItem(LOCAL_TRANSACTIONS_KEY);
  localStorage.removeItem(LOCAL_STOCK_KEY);
  localStorage.removeItem(LOCAL_SETTINGS_KEY);
  return { message: 'Database lokal KasirPro berhasil di-reset ke data awal!' };
}
