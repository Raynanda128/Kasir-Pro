import { supabase } from './supabase';
import { 
  Category, 
  Product, 
  StoreSettings, 
  User, 
  Transaction, 
  StockHistory, 
  CartItem, 
  UserRole,
  PaymentMethod 
} from '../types';
import { initialCategories, initialProducts, initialStoreSettings } from '../data/mockSeed';

// ==========================================
// MAPPERS: CONVERT BETWEEN TS & SUPABASE DB
// ==========================================

export function mapProductFromDb(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id || '',
    categoryName: row.category_name || '',
    image: row.image || '',
    description: row.description || '',
    capitalPrice: Number(row.capital_price) || 0,
    sellingPrice: Number(row.selling_price) || 0,
    stock: Number(row.stock) || 0,
    minStockAlert: Number(row.min_stock_alert) || 5,
    status: row.status || (Number(row.stock) > 0 ? 'Tersedia' : 'Habis'),
    barcode: row.barcode || '',
    createdAt: row.created_at || new Date().toISOString()
  };
}

export function mapProductToDb(p: Partial<Product>): any {
  return {
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
    barcode: p.barcode
  };
}

export function mapSettingsFromDb(row: any): StoreSettings {
  if (!row) return initialStoreSettings;
  return {
    id: row.id || 'store_settings',
    storeName: row.store_name || initialStoreSettings.storeName,
    logo: row.logo || initialStoreSettings.logo,
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

export function mapSettingsToDb(s: Partial<StoreSettings>): any {
  return {
    id: 'store_settings',
    store_name: s.storeName,
    logo: s.logo,
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
}

// ==========================================
// REALTIME SUBSCRIBERS (SUPABASE)
// ==========================================

export function subscribeSupabaseCategories(callback: (categories: Category[]) => void) {
  if (!supabase) {
    callback(initialCategories);
    return () => {};
  }

  const fetchCats = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (error) {
        console.warn('Supabase categories fetch error:', error.message);
        callback(initialCategories);
        return;
      }
      if (!data || data.length === 0) {
        // Try seeding default categories
        try {
          for (const cat of initialCategories) {
            await supabase.from('categories').upsert(cat);
          }
        } catch (e) {}
        callback(initialCategories);
      } else {
        callback(data.map(c => ({ id: c.id, name: c.name, icon: c.icon })));
      }
    } catch (err) {
      console.warn('Supabase categories exception:', err);
      callback(initialCategories);
    }
  };

  fetchCats();

  try {
    const channel = supabase
      .channel('public:categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchCats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    return () => {};
  }
}

export function subscribeSupabaseProducts(callback: (products: Product[]) => void) {
  if (!supabase) {
    callback(initialProducts);
    return () => {};
  }

  const fetchProds = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) {
        console.warn('Supabase products fetch error:', error.message);
        callback(initialProducts);
        return;
      }
      if (!data || data.length === 0) {
        // Try seeding default products
        try {
          for (const p of initialProducts) {
            await supabase.from('products').upsert(mapProductToDb(p));
          }
        } catch (e) {}
        callback(initialProducts);
      } else {
        callback(data.map(mapProductFromDb));
      }
    } catch (err) {
      console.warn('Supabase products exception:', err);
      callback(initialProducts);
    }
  };

  fetchProds();

  try {
    const channel = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProds();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    return () => {};
  }
}

export function subscribeSupabaseTransactions(callback: (transactions: Transaction[]) => void) {
  if (!supabase) {
    callback([]);
    return () => {};
  }

  const fetchTrxs = async () => {
    try {
      const { data: trxs, error } = await supabase
        .from('transactions')
        .select('*, transaction_details(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase transactions fetch error:', error.message);
        callback([]);
        return;
      }

      const items: Transaction[] = (trxs || []).map((t: any) => ({
        id: t.id,
        invoiceNumber: t.invoice_number,
        userId: t.user_id,
        userName: t.user_name,
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
          productId: d.product_id,
          productName: d.product_name,
          productImage: d.product_image,
          quantity: Number(d.quantity) || 1,
          price: Number(d.price) || 0,
          capitalPrice: Number(d.capital_price) || 0,
          subtotal: Number(d.subtotal) || 0
        }))
      }));

      callback(items);
    } catch (err) {
      console.warn('Supabase transactions exception:', err);
      callback([]);
    }
  };

  fetchTrxs();

  try {
    const channel = supabase
      .channel('public:transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchTrxs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    return () => {};
  }
}

export function subscribeSupabaseStockHistory(callback: (history: StockHistory[]) => void) {
  if (!supabase) {
    callback([]);
    return () => {};
  }

  const fetchStock = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase stock history fetch error:', error.message);
        callback([]);
        return;
      }

      callback(
        (data || []).map((s: any) => ({
          id: s.id,
          productId: s.product_id,
          productName: s.product_name,
          type: s.type,
          quantity: Number(s.quantity) || 0,
          description: s.description || '',
          createdAt: s.created_at,
          userName: s.user_name || 'Admin'
        }))
      );
    } catch (err) {
      console.warn('Supabase stock history exception:', err);
      callback([]);
    }
  };

  fetchStock();

  try {
    const channel = supabase
      .channel('public:stock_history')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_history' }, () => {
        fetchStock();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    return () => {};
  }
}

export function subscribeSupabaseSettings(callback: (settings: StoreSettings) => void) {
  if (!supabase) {
    callback(initialStoreSettings);
    return () => {};
  }

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 'store_settings')
        .single();

      if (error || !data) {
        try {
          await supabase.from('store_settings').upsert(mapSettingsToDb(initialStoreSettings));
        } catch (e) {}
        callback(initialStoreSettings);
      } else {
        callback(mapSettingsFromDb(data));
      }
    } catch (err) {
      console.warn('Supabase settings exception:', err);
      callback(initialStoreSettings);
    }
  };

  fetchSettings();

  try {
    const channel = supabase
      .channel('public:store_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, () => {
        fetchSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    return () => {};
  }
}

// ==========================================
// SUPABASE CRUD OPERATIONS
// ==========================================

export async function supabaseCreateCategory(name: string, icon?: string): Promise<Category> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const id = `cat-${Date.now()}`;
  const newCat: Category = { id, name, icon: icon || 'Tag' };
  const { error } = await supabase.from('categories').insert(newCat);
  if (error) throw new Error(error.message);
  return newCat;
}

export async function supabaseCreateProduct(productData: Partial<Product>): Promise<Product> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
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

  const { error: prodErr } = await supabase.from('products').insert(mapProductToDb(newProduct));
  if (prodErr) throw new Error(prodErr.message);

  if (stockVal > 0) {
    await supabase.from('stock_history').insert({
      id: `stk-${Date.now()}`,
      product_id: id,
      product_name: newProduct.name,
      type: 'in',
      quantity: stockVal,
      description: 'Stok awal produk baru',
      user_name: 'Admin / Owner',
      created_at: now
    });
  }

  return newProduct;
}

export async function supabaseUpdateProduct(id: string, productData: Partial<Product>): Promise<Product> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');

  const { data: existing, error: getErr } = await supabase.from('products').select('*').eq('id', id).single();
  if (getErr || !existing) throw new Error('Produk tidak ditemukan di Supabase.');

  const currentProd = mapProductFromDb(existing);
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

  const { error: updErr } = await supabase.from('products').update(mapProductToDb(updated)).eq('id', id);
  if (updErr) throw new Error(updErr.message);

  return updated;
}

export async function supabaseDeleteProduct(id: string): Promise<{ message: string }> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
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

  const now = new Date();

  // Fetch settings for tax
  let taxRate = 11;
  let invoicePrefix = 'INV-KP';
  const { data: setts } = await supabase.from('store_settings').select('*').eq('id', 'store_settings').single();
  if (setts) {
    taxRate = Number(setts.tax_rate) ?? 11;
    invoicePrefix = setts.invoice_prefix || 'INV-KP';
  }

  let subtotal = 0;
  let totalCapital = 0;
  const details = [];

  for (const item of payload.items) {
    const { data: prodData } = await supabase.from('products').select('*').eq('id', item.product.id).single();
    if (!prodData) throw new Error(`Produk ${item.product.name} tidak ditemukan.`);

    const prod = mapProductFromDb(prodData);
    if (prod.stock < item.quantity) {
      throw new Error(`Stok ${prod.name} tidak mencukupi (Tersisa: ${prod.stock}).`);
    }

    const itemSubtotal = prod.sellingPrice * item.quantity;
    subtotal += itemSubtotal;
    totalCapital += prod.capitalPrice * item.quantity;

    // Deduct stock in Supabase
    const newStock = prod.stock - item.quantity;
    await supabase.from('products').update({
      stock: newStock,
      status: newStock > 0 ? 'Tersedia' : 'Habis'
    }).eq('id', prod.id);

    details.push({
      id: `det-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      transaction_id: '',
      product_id: prod.id,
      product_name: prod.name,
      product_image: prod.image,
      quantity: item.quantity,
      price: prod.sellingPrice,
      capital_price: prod.capitalPrice,
      subtotal: itemSubtotal
    });

    // Log stock out
    await supabase.from('stock_history').insert({
      id: `stk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      product_id: prod.id,
      product_name: prod.name,
      type: 'out',
      quantity: item.quantity,
      description: 'Penjualan Kasir POS',
      user_name: payload.userName || 'Kasir',
      created_at: now.toISOString()
    });
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

  // Insert transaction row
  const { error: txErr } = await supabase.from('transactions').insert({
    id: transactionId,
    invoice_number: invoiceNumber,
    user_id: payload.userId || 'usr-kasir',
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
  });

  if (txErr) throw new Error(txErr.message);

  // Insert details rows
  if (details.length > 0) {
    const { error: detErr } = await supabase.from('transaction_details').insert(details);
    if (detErr) console.error('Error inserting transaction details:', detErr);
  }

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
    details: details.map(d => ({
      id: d.id,
      transactionId: d.transaction_id,
      productId: d.product_id,
      productName: d.product_name,
      productImage: d.product_image,
      quantity: d.quantity,
      price: d.price,
      capitalPrice: d.capital_price,
      subtotal: d.subtotal
    }))
  };

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

  const { data: prodData, error: getErr } = await supabase.from('products').select('*').eq('id', payload.productId).single();
  if (getErr || !prodData) throw new Error('Produk tidak ditemukan di Supabase');

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
  const logRow = {
    id: logId,
    product_id: product.id,
    product_name: product.name,
    type: payload.type,
    quantity: qty,
    description: payload.description || 'Penyesuaian stok manual',
    user_name: payload.userName || 'Admin / Owner',
    created_at: nowStr
  };

  await supabase.from('stock_history').insert(logRow);

  return {
    message: 'Stok berhasil diperbarui di Supabase.',
    log: {
      id: logId,
      productId: product.id,
      productName: product.name,
      type: payload.type,
      quantity: qty,
      description: logRow.description,
      createdAt: nowStr,
      userName: logRow.user_name
    }
  };
}

export async function supabaseUpdateSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi');
  const dbData = mapSettingsToDb(settings);
  const { error } = await supabase.from('store_settings').upsert(dbData);
  if (error) throw new Error(error.message);

  const { data } = await supabase.from('store_settings').select('*').eq('id', 'store_settings').single();
  return mapSettingsFromDb(data);
}
