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
  DashboardStats,
  BusinessMember,
  BusinessInvitation,
  Outlet
} from '../types';
import { initialCategories, initialProducts, initialStoreSettings } from '../data/mockSeed';
import { DEFAULT_BOTAK_AVATAR } from '../data/avatarPresets';

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
  supabaseUpdateSettings,
  ensureActiveBusinessContext,
  supabaseFetchOutlets,
  supabaseFetchTeamMembers,
  supabaseFetchInvitations,
  supabaseCreateInvitation,
  supabaseRevokeInvitation,
  supabaseDeleteInvitation,
  supabaseResendInvitation,
  supabaseUpdateMemberRoleAndOutlet,
  supabaseToggleMemberStatus,
  supabaseDeleteMember,
  supabaseAcceptInvitationByToken,
  supabaseCreateStaffAccount
} from './supabaseApi';

// In-Memory / Local Storage State for standalone/offline fallback
const LOCAL_USER_KEY = 'kasirpro_current_user';
const LOCAL_PRODUCTS_KEY = 'kasirpro_products';
const LOCAL_CATEGORIES_KEY = 'kasirpro_categories';
const LOCAL_TRANSACTIONS_KEY = 'kasirpro_transactions';
const LOCAL_STOCK_KEY = 'kasirpro_stock_history';
const LOCAL_SETTINGS_KEY = 'kasirpro_settings';
const LOCAL_INVITATIONS_KEY = 'kasirpro_business_invitations';

function getLocalInvitations(businessId?: string): BusinessInvitation[] {
  try {
    const raw = localStorage.getItem(LOCAL_INVITATIONS_KEY);
    if (!raw) return [];
    const list: BusinessInvitation[] = JSON.parse(raw);
    if (businessId) {
      return list.filter(i => i.businessId === businessId || (i as any).business_id === businessId);
    }
    return list;
  } catch {
    return [];
  }
}

function saveLocalInvitation(inv: BusinessInvitation): void {
  try {
    const list = getLocalInvitations();
    const idx = list.findIndex(i => i.id === inv.id || i.token === inv.token);
    if (idx >= 0) {
      list[idx] = inv;
    } else {
      list.unshift(inv);
    }
    localStorage.setItem(LOCAL_INVITATIONS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('Gagal menyimpan undangan ke localStorage:', e);
  }
}

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

    const handleUserContext = async (sessionUser: any) => {
      const ctx = await ensureActiveBusinessContext();

      if (ctx?.status === 'disabled') {
        await supabase.auth.signOut();
        localStorage.removeItem(LOCAL_USER_KEY);
        onChange(null, false);
        alert('Akun Anda telah nonaktif pada bisnis ini. Silakan hubungi Owner/Admin.');
        return;
      }

      const dbRole = ctx?.role || 'owner';
      const uiRole: UserRole = 
        dbRole === 'owner' ? 'Owner' :
        dbRole === 'admin' ? 'Admin' :
        dbRole === 'manager' ? 'Pengelola' : 'Kasir';

      let userName = sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Pengguna Toko';
      let userAvatar = sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.avatar || DEFAULT_BOTAK_AVATAR;

      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('name, avatar_url, avatar')
          .eq('id', sessionUser.id)
          .maybeSingle();

        if (prof) {
          if (prof.name) userName = prof.name;
          if (prof.avatar_url || prof.avatar) userAvatar = prof.avatar_url || prof.avatar;
        }
      } catch (e) {
        console.warn('Gagal membaca profil dari Supabase:', e);
      }

      const sbUser: User = {
        id: sessionUser.id,
        name: userName,
        email: sessionUser.email || '',
        avatar: userAvatar,
        role: uiRole,
        businessRole: dbRole,
        branch: 'Cabang Utama',
        businessId: ctx?.businessId,
        activeOutletId: ctx?.outletId
      };
      setLocalData(LOCAL_USER_KEY, sbUser);
      onChange(sbUser, isRecoveryUrl);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleUserContext(session.user);
      } else {
        const savedUser = getLocalData<User | null>(LOCAL_USER_KEY, null);
        if (savedUser) {
          onChange(savedUser, isRecoveryUrl);
        } else {
          onChange(null, isRecoveryUrl);
        }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const isRecoveryEvent = event === 'PASSWORD_RECOVERY' || window.location.hash.includes('type=recovery');

      if (session?.user) {
        handleUserContext(session.user);
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem(LOCAL_USER_KEY);
        onChange(null, isRecoveryEvent);
      } else {
        const savedUser = getLocalData<User | null>(LOCAL_USER_KEY, null);
        if (savedUser) {
          onChange(savedUser, isRecoveryEvent);
        } else {
          onChange(null, isRecoveryEvent);
        }
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }

  // If Supabase is not configured, require login and clear legacy demo tokens
  const savedUser = getLocalData<User | null>(LOCAL_USER_KEY, null);
  if (savedUser) {
    onChange(savedUser, false);
  } else {
    localStorage.removeItem(LOCAL_USER_KEY);
    onChange(null, false);
  }

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
  if (msg.includes('email not confirmed') || msg.includes('unconfirmed') || msg.includes('confirm')) {
    return 'Email Anda belum dikonfirmasi. Cek inbox/spam email Anda untuk klik link verifikasi, atau matikan "Confirm email" di Dashboard Supabase (Authentication > Providers > Email) agar bisa masuk langsung tanpa konfirmasi.';
  }
  return errorMsg;
}

export async function apiLogin(email: string, password?: string): Promise<{ user: User; message: string }> {
  if (!email || !password) {
    throw new Error('Email dan password wajib diisi.');
  }

  const cleanEmail = email.toLowerCase().trim();

  if (isSupabaseConfigured && supabase) {
    // Attempt 1: Standard Supabase Auth Login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (!error && data.user) {
      const ctx = await ensureActiveBusinessContext();

      if (ctx?.status === 'disabled') {
        await supabase.auth.signOut();
        throw new Error('Akun Anda telah nonaktif pada bisnis ini. Silakan hubungi Owner atau Admin.');
      }

      const dbRole = ctx?.role || 'owner';
      const uiRole: UserRole = 
        dbRole === 'owner' ? 'Owner' :
        dbRole === 'admin' ? 'Admin' :
        dbRole === 'manager' ? 'Pengelola' : 'Kasir';

      let userName = data.user.user_metadata?.full_name || cleanEmail.split('@')[0];
      let userAvatar = DEFAULT_BOTAK_AVATAR;

      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('name, avatar_url, avatar')
          .eq('id', data.user.id)
          .maybeSingle();

        if (prof) {
          if (prof.name) userName = prof.name;
          if (prof.avatar_url || prof.avatar) userAvatar = prof.avatar_url || prof.avatar;
        }
      } catch (e) {
        console.warn('Gagal membaca profile user saat login:', e);
      }

      const u: User = {
        id: data.user.id,
        name: userName,
        email: data.user.email || cleanEmail,
        avatar: userAvatar,
        role: uiRole,
        businessRole: dbRole,
        businessId: ctx?.businessId,
        activeOutletId: ctx?.outletId,
        branch: 'Cabang Utama'
      };
      setLocalData(LOCAL_USER_KEY, u);
      return { user: u, message: 'Login berhasil via Supabase!' };
    }

    // Attempt 2: Staff Account Check (for staff created directly by Owner)
    let matchedStaff: any = null;

    // Check local staff credentials saved on this browser first
    try {
      const localStaffList = JSON.parse(localStorage.getItem('kasirpro_staff_credentials') || '[]');
      matchedStaff = localStaffList.find((s: any) => s.email === cleanEmail && s.password === password);
    } catch (e) {
      console.warn('Local staff credentials check exception:', e);
    }

    // If not found locally, query Supabase business_invitations for STAFF_PWD record
    if (!matchedStaff) {
      const tokenStr = `STAFF_PWD:${password}`;
      const { data: staffInvs } = await supabase
        .from('business_invitations')
        .select('*')
        .eq('email', cleanEmail)
        .eq('token', tokenStr)
        .eq('status', 'accepted')
        .limit(1);

      if (staffInvs && staffInvs.length > 0) {
        const inv = staffInvs[0];
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('email', cleanEmail)
          .maybeSingle();

        matchedStaff = {
          userId: prof?.id || `staff-${inv.id}`,
          name: prof?.name || inv.invited_by || cleanEmail.split('@')[0],
          email: cleanEmail,
          role: inv.role || 'cashier',
          businessId: inv.business_id,
          outletId: inv.outlet_id
        };
      }
    }

    if (matchedStaff) {
      // Check if member is active in business_members table
      const { data: member } = await supabase
        .from('business_members')
        .select('*')
        .eq('business_id', matchedStaff.businessId)
        .eq('user_id', matchedStaff.userId)
        .maybeSingle();

      if (member && member.status === 'disabled') {
        throw new Error('Akun Anda telah nonaktif pada bisnis ini. Silakan hubungi Owner atau Admin.');
      }

      const dbRole = member?.role || matchedStaff.role || 'cashier';
      const uiRole: UserRole = 
        dbRole === 'owner' ? 'Owner' :
        dbRole === 'admin' ? 'Admin' :
        dbRole === 'manager' ? 'Pengelola' : 'Kasir';

      const u: User = {
        id: matchedStaff.userId,
        name: matchedStaff.name,
        email: matchedStaff.email,
        role: uiRole,
        businessRole: dbRole,
        businessId: member?.business_id || matchedStaff.businessId,
        activeOutletId: member?.outlet_id || matchedStaff.outletId,
        branch: 'Cabang Utama'
      };

      setLocalData(LOCAL_USER_KEY, u);
      return { user: u, message: 'Login staf berhasil!' };
    }

    // If all login attempts failed, throw parsed error
    throw new Error(parseAuthError(error?.message || 'Email atau kata sandi salah. Silakan periksa kembali data Anda.'));
  }

  throw new Error('Database Supabase belum terkonfigurasi. Sediakan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
}

export async function apiRegister(data: { name: string; email: string; password?: string; branch?: string; role?: string }): Promise<{ user: User; message: string }> {
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
          role: 'Owner' // Register page is exclusively for creating a new business -> role is ALWAYS Owner
        }
      }
    });

    if (error) {
      throw new Error(parseAuthError(error.message));
    }

    if (res.user) {
      const ctx = await ensureActiveBusinessContext();
      const newUser: User = {
        id: res.user.id,
        name: data.name,
        email: data.email,
        role: 'Owner',
        businessRole: 'owner',
        businessId: ctx?.businessId,
        activeOutletId: ctx?.outletId,
        branch: data.branch || 'Cabang Utama'
      };
      setLocalData(LOCAL_USER_KEY, newUser);
      return { user: newUser, message: 'Registrasi bisnis berhasil! Anda otomatis terdaftar sebagai Owner.' };
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

export async function apiChangePasswordWithOld(
  oldPassword: string,
  newPassword: string,
  currentUser: User
): Promise<{ message: string }> {
  if (!oldPassword || !newPassword) {
    throw new Error('Kata sandi lama dan kata sandi baru wajib diisi.');
  }

  if (newPassword.length < 6) {
    throw new Error('Kata sandi baru minimal 6 karakter.');
  }

  if (isSupabaseConfigured && supabase && currentUser?.email) {
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: oldPassword
    });

    if (signInErr) {
      const localStaffList = getLocalData<any[]>('kasirpro_team_members', []);
      const matched = localStaffList.find((s: any) => s.email === currentUser.email);
      if (matched && matched.password && matched.password !== oldPassword) {
        throw new Error('Kata sandi lama yang Anda masukkan salah.');
      } else if (!matched) {
        throw new Error('Kata sandi lama yang Anda masukkan salah.');
      }
    }

    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateErr) {
      throw new Error(parseAuthError(updateErr.message));
    }

    const localStaffList = getLocalData<any[]>('kasirpro_team_members', []);
    const idx = localStaffList.findIndex((s: any) => s.email === currentUser.email);
    if (idx !== -1) {
      localStaffList[idx].password = newPassword;
      setLocalData('kasirpro_team_members', localStaffList);
    }

    return { message: 'Kata sandi berhasil diperbarui!' };
  }

  const localStaffList = getLocalData<any[]>('kasirpro_team_members', []);
  const idx = localStaffList.findIndex((s: any) => s.email === currentUser.email || s.id === currentUser.id);
  if (idx !== -1) {
    if (localStaffList[idx].password && localStaffList[idx].password !== oldPassword) {
      throw new Error('Kata sandi lama yang Anda masukkan salah.');
    }
    localStaffList[idx].password = newPassword;
    setLocalData('kasirpro_team_members', localStaffList);
  }

  return { message: 'Kata sandi berhasil diperbarui!' };
}

export async function apiLogout(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
  }
  localStorage.removeItem(LOCAL_USER_KEY);
}

import { notifyDataChange, addSyncListener } from './eventBus';
export { notifyDataChange };

// ==========================================
// REALTIME LISTENERS (SUPABASE / LOCAL)
// ==========================================

export function subscribeCategories(callback: (categories: Category[]) => void) {
  if (isSupabaseConfigured) {
    return subscribeSupabaseCategories(callback);
  }

  let lastJsonStr = '';
  const reload = () => {
    const cats = getLocalData<Category[]>(LOCAL_CATEGORIES_KEY, initialCategories);
    const jsonStr = JSON.stringify(cats);
    if (jsonStr !== lastJsonStr) {
      lastJsonStr = jsonStr;
      callback(cats);
    }
  };

  reload();
  return addSyncListener((entity) => {
    if (entity === 'categories' || entity === 'all') reload();
  });
}

export function subscribeProducts(callback: (products: Product[]) => void) {
  if (isSupabaseConfigured) {
    return subscribeSupabaseProducts(callback);
  }

  let lastJsonStr = '';
  const reload = () => {
    const prods = getLocalData<Product[]>(LOCAL_PRODUCTS_KEY, initialProducts);
    const jsonStr = JSON.stringify(prods);
    if (jsonStr !== lastJsonStr) {
      lastJsonStr = jsonStr;
      callback(prods);
    }
  };

  reload();
  return addSyncListener((entity) => {
    if (entity === 'products' || entity === 'all') reload();
  });
}

export function subscribeTransactions(callback: (transactions: Transaction[]) => void) {
  if (isSupabaseConfigured) {
    return subscribeSupabaseTransactions(callback);
  }

  let lastJsonStr = '';
  const reload = () => {
    const trxs = getLocalData<Transaction[]>(LOCAL_TRANSACTIONS_KEY, []);
    const jsonStr = JSON.stringify(trxs);
    if (jsonStr !== lastJsonStr) {
      lastJsonStr = jsonStr;
      callback(trxs);
    }
  };

  reload();
  return addSyncListener((entity) => {
    if (entity === 'transactions' || entity === 'all') reload();
  });
}

export function subscribeStockHistory(callback: (history: StockHistory[]) => void) {
  if (isSupabaseConfigured) {
    return subscribeSupabaseStockHistory(callback);
  }

  let lastJsonStr = '';
  const reload = () => {
    const logs = getLocalData<StockHistory[]>(LOCAL_STOCK_KEY, []);
    const jsonStr = JSON.stringify(logs);
    if (jsonStr !== lastJsonStr) {
      lastJsonStr = jsonStr;
      callback(logs);
    }
  };

  reload();
  return addSyncListener((entity) => {
    if (entity === 'stock' || entity === 'all') reload();
  });
}

export function subscribeSettings(callback: (settings: StoreSettings) => void) {
  if (isSupabaseConfigured) {
    return subscribeSupabaseSettings(callback);
  }

  let lastJsonStr = '';
  const reload = () => {
    const setts = getLocalData<StoreSettings>(LOCAL_SETTINGS_KEY, initialStoreSettings);
    const jsonStr = JSON.stringify(setts);
    if (jsonStr !== lastJsonStr) {
      lastJsonStr = jsonStr;
      callback(setts);
    }
  };

  reload();
  return addSyncListener((entity) => {
    if (entity === 'settings' || entity === 'all') reload();
  });
}

export function subscribeTeamData(businessId: string, callback: () => void) {
  callback();
  const unsubSync = addSyncListener((entity) => {
    if (entity === 'team' || entity === 'invitations' || entity === 'all') {
      callback();
    }
  });

  const poll = setInterval(() => {
    callback();
  }, 3500);

  return () => {
    unsubSync();
    clearInterval(poll);
  };
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

// ==========================================
// TEAM & OUTLET MANAGEMENT
// ==========================================

export async function apiFetchOutlets(businessId: string): Promise<Outlet[]> {
  if (isSupabaseConfigured) {
    return supabaseFetchOutlets(businessId);
  }
  return [{
    id: 'out-main',
    businessId,
    name: 'Cabang Utama',
    address: 'Jl. Utama No. 1',
    phone: '081234567890',
    isActive: true,
    createdAt: new Date().toISOString()
  }];
}

export async function apiFetchTeamMembers(businessId: string): Promise<BusinessMember[]> {
  if (isSupabaseConfigured) {
    return supabaseFetchTeamMembers(businessId);
  }
  return [];
}

function deleteLocalInvitation(invitationId: string): void {
  try {
    const list = getLocalInvitations();
    const filtered = list.filter(i => i.id !== invitationId && i.token !== invitationId);
    localStorage.setItem(LOCAL_INVITATIONS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Gagal menghapus undangan dari localStorage:', e);
  }
}

export async function apiFetchInvitations(businessId: string): Promise<BusinessInvitation[]> {
  const localInvs = getLocalInvitations(businessId);
  if (isSupabaseConfigured) {
    try {
      const supaInvs = await supabaseFetchInvitations(businessId);
      const map = new Map<string, BusinessInvitation>();

      if (Array.isArray(supaInvs)) {
        supaInvs.forEach(i => {
          const key = i.token || i.id;
          if (key) map.set(key, i);
        });
      }

      localInvs.forEach(i => {
        const key = i.token || i.id;
        if (key && !map.has(key) && !map.has(i.id)) {
          map.set(key, i);
        }
      });

      return Array.from(map.values());
    } catch (e) {
      console.warn('Gagal mengambil undangan dari Supabase, menggunakan lokal:', e);
    }
  }
  return localInvs;
}

export async function apiDeleteInvitation(invitationId: string): Promise<void> {
  deleteLocalInvitation(invitationId);
  if (isSupabaseConfigured) {
    try {
      await supabaseDeleteInvitation(invitationId);
    } catch (e) {
      console.warn('Gagal menghapus dari Supabase:', e);
    }
  }
}

export async function apiCreateInvitation(payload: {
  businessId: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier';
  outletId?: string | null;
  invitedBy?: string;
}): Promise<BusinessInvitation> {
  const cleanEmail = payload.email.toLowerCase().trim();
  const token = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const invId = `inv_${Date.now()}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  let outletName = 'Semua Outlet';
  if (payload.outletId) {
    outletName = 'Cabang Khusus';
  }

  const localInv: BusinessInvitation = {
    id: invId,
    businessId: payload.businessId,
    email: cleanEmail,
    role: payload.role,
    outletId: payload.outletId || null,
    token,
    status: 'pending',
    invitedBy: payload.invitedBy || 'Owner',
    createdAt: now.toISOString(),
    expiresAt,
    outletName
  };

  saveLocalInvitation(localInv);

  if (isSupabaseConfigured) {
    try {
      const supaInv = await supabaseCreateInvitation(payload);
      if (supaInv) {
        saveLocalInvitation(supaInv);
        return supaInv;
      }
    } catch (err: any) {
      console.warn('Supabase create invitation warning:', err.message);
      if (err.message?.includes('sudah menjadi anggota')) {
        deleteLocalInvitation(invId);
        throw err;
      }
    }
  }

  return localInv;
}

export async function apiCreateStaffAccount(payload: {
  businessId: string;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'manager' | 'cashier';
  outletId?: string | null;
}) {
  const cleanEmail = payload.email.toLowerCase().trim();
  const rawPassword = payload.password || `Kasir_${Math.floor(100000 + Math.random() * 900000)}`;

  if (isSupabaseConfigured) {
    return supabaseCreateStaffAccount({
      ...payload,
      email: cleanEmail,
      password: rawPassword
    });
  }

  // Standalone / offline fallback
  return {
    userId: `user-local-${Date.now()}`,
    email: cleanEmail,
    name: payload.name,
    password: rawPassword,
    role: payload.role,
    outletId: payload.outletId || null
  };
}

export async function apiRevokeInvitation(invitationId: string): Promise<void> {
  const localList = getLocalInvitations();
  const target = localList.find(i => i.id === invitationId || i.token === invitationId);
  if (target) {
    target.status = 'revoked';
    saveLocalInvitation(target);
  }

  if (isSupabaseConfigured) {
    try {
      await supabaseRevokeInvitation(invitationId);
    } catch (e) {
      console.warn('Gagal membatalkan di Supabase:', e);
    }
  }
}

export async function apiResendInvitation(invitationId: string): Promise<BusinessInvitation> {
  const localList = getLocalInvitations();
  const target = localList.find(i => i.id === invitationId || i.token === invitationId);
  const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  if (target) {
    target.status = 'pending';
    target.expiresAt = newExpires;
    saveLocalInvitation(target);
  }

  if (isSupabaseConfigured) {
    try {
      const supaResult = await supabaseResendInvitation(invitationId);
      if (supaResult) {
        saveLocalInvitation(supaResult);
        return supaResult;
      }
    } catch (e) {
      console.warn('Gagal perpanjang di Supabase:', e);
    }
  }

  if (target) return target;
  throw new Error('Undangan tidak ditemukan.');
}

export async function apiUpdateMemberRoleAndOutlet(
  memberId: string,
  role: 'admin' | 'manager' | 'cashier',
  outletId?: string | null
): Promise<void> {
  if (isSupabaseConfigured) {
    return supabaseUpdateMemberRoleAndOutlet(memberId, role, outletId);
  }
}

export async function apiToggleMemberStatus(memberId: string, status: 'active' | 'disabled'): Promise<void> {
  if (isSupabaseConfigured) {
    return supabaseToggleMemberStatus(memberId, status);
  }
}

export async function apiDeleteMember(memberId: string): Promise<void> {
  if (isSupabaseConfigured) {
    await supabaseDeleteMember(memberId);
  }
  try {
    const localStaffList = getLocalData<any[]>('kasirpro_team_members', []);
    const filtered = localStaffList.filter((s: any) => s.id !== memberId && s.memberId !== memberId);
    setLocalData('kasirpro_team_members', filtered);
  } catch (e) {
    console.warn('Gagal menghapus anggota dari localStorage:', e);
  }
}

export async function apiAcceptInvitationByToken(token: string): Promise<boolean> {
  const cleanToken = token.trim();

  if (isSupabaseConfigured) {
    try {
      const res = await supabaseAcceptInvitationByToken(cleanToken);
      if (res) {
        const localList = getLocalInvitations();
        const inv = localList.find(i => i.token === cleanToken || i.id === cleanToken);
        if (inv) {
          inv.status = 'accepted';
          inv.acceptedAt = new Date().toISOString();
          saveLocalInvitation(inv);
        }
        return true;
      }
    } catch (e: any) {
      console.warn('Gagal memproses undangan di Supabase:', e);
      if (e?.message && (e.message.includes('sudah pernah digunakan') || e.message.includes('dibatalkan') || e.message.includes('kedaluwarsa'))) {
        throw e;
      }
    }
  }

  const localList = getLocalInvitations();
  const inv = localList.find(i => i.token === cleanToken || i.id === cleanToken);

  if (inv) {
    if (inv.status === 'revoked') {
      throw new Error('Undangan ini telah dibatalkan oleh pemilik toko.');
    }
    if (inv.status === 'accepted') {
      throw new Error('Undangan ini sudah pernah digunakan.');
    }
    inv.status = 'accepted';
    inv.acceptedAt = new Date().toISOString();
    saveLocalInvitation(inv);
    return true;
  }

  throw new Error('Undangan tidak ditemukan atau token tidak valid.');
}

export async function apiUpdateUserProfile(
  userId: string,
  payload: { name: string; avatar: string }
): Promise<User> {
  const localUser = getLocalData<User | null>(LOCAL_USER_KEY, null);
  let userEmail = localUser?.email || '';

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        userEmail = session.user.email;
      }
    } catch (e) {}
  }
  if (!userEmail) userEmail = `${userId}@kasirpro.app`;

  const updatedUser: User = {
    ...(localUser || {} as User),
    id: userId,
    name: payload.name,
    avatar: payload.avatar,
    email: userEmail
  };

  setLocalData(LOCAL_USER_KEY, updatedUser);

  if (isSupabaseConfigured && supabase) {
    // 1. Update Supabase Auth user_metadata so profile is synced across all devices
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: payload.name,
          avatar_url: payload.avatar,
          avatar: payload.avatar
        }
      });
    } catch (e) {
      console.warn('Supabase auth updateUser warning:', e);
    }

    // 2. Upsert profiles table in Supabase (with required NOT NULL email column)
    try {
      const profileRow: any = {
        id: userId,
        name: payload.name,
        email: userEmail,
        avatar_url: payload.avatar,
        avatar: payload.avatar,
        updated_at: new Date().toISOString()
      };

      for (let attempt = 0; attempt < 4; attempt++) {
        const { error } = await supabase.from('profiles').upsert(profileRow);
        if (!error) break;

        const match = error.message?.match(/Could not find the '([^']+)' column/i);
        if (match && match[1] && profileRow.hasOwnProperty(match[1])) {
          delete profileRow[match[1]];
        } else {
          console.warn('Supabase profile update warning:', error.message);
          break;
        }
      }
    } catch (e) {
      console.warn('Supabase profile update warning:', e);
    }
  }

  return updatedUser;
}
