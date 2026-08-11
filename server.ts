import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initialCategories, initialProducts, initialUsers, initialStoreSettings, initialStockHistory, generateInitialTransactions } from './src/data/mockSeed.js';
import { Category, Product, StoreSettings, User, Transaction, StockHistory } from './src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// File DB Path
const DB_FILE = path.join(process.cwd(), 'kasirpro_db.json');

// Interface for DB state
interface DbSchema {
  users: User[];
  categories: Category[];
  products: Product[];
  transactions: Transaction[];
  stockHistory: StockHistory[];
  settings: StoreSettings;
}

// Function to load or initialize DB
function loadDatabase(): DbSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.products && parsed.users) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading DB file, re-initializing...', err);
  }

  // Default initial database state
  const initialDb: DbSchema = {
    users: initialUsers,
    categories: initialCategories,
    products: initialProducts,
    transactions: generateInitialTransactions(),
    stockHistory: initialStockHistory,
    settings: initialStoreSettings
  };

  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(dbData: DbSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save DB file', err);
  }
}

// Global in-memory DB reference
let db = loadDatabase();

// ==========================================
// API ROUTES
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'KasirPro POS', time: new Date().toISOString() });
});

// AUTHENTICATION ROUTES
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email dan password wajib diisi.' });
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return res.status(401).json({ message: 'Email tidak terdaftar.' });
  }

  // Simple demo password check (e.g. owner123, admin123, kasir123, or any password >= 4 chars)
  res.json({
    message: 'Login berhasil!',
    user,
    token: `token_${user.id}_${Date.now()}`
  });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, role, branch } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Nama dan email wajib diisi.' });
  }

  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ message: 'Email sudah terdaftar.' });
  }

  const newUser: User = {
    id: `usr-${Date.now()}`,
    name,
    email,
    role: role || 'Kasir',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    branch: branch || db.settings.activeBranch
  };

  db.users.push(newUser);
  saveDatabase(db);

  res.json({
    message: 'Registrasi toko / pengguna berhasil!',
    user: newUser,
    token: `token_${newUser.id}_${Date.now()}`
  });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = db.users.find(u => u.email.toLowerCase() === email?.toLowerCase());
  if (!user) {
    return res.status(404).json({ message: 'Email tidak ditemukan.' });
  }
  res.json({ message: `Instruksi reset password telah dikirimkan ke ${email}.` });
});

// CATEGORY ROUTES
app.get('/api/categories', (req, res) => {
  res.json(db.categories);
});

app.post('/api/categories', (req, res) => {
  const { name, icon } = req.body;
  if (!name) return res.status(400).json({ message: 'Nama kategori wajib.' });

  const newCat: Category = {
    id: `cat-${Date.now()}`,
    name,
    icon: icon || 'Tag'
  };

  db.categories.push(newCat);
  saveDatabase(db);
  res.json(newCat);
});

// PRODUCT ROUTES
app.get('/api/products', (req, res) => {
  res.json(db.products);
});

app.post('/api/products', (req, res) => {
  const { name, categoryId, image, description, capitalPrice, sellingPrice, stock, minStockAlert, status, barcode } = req.body;

  if (!name || !categoryId || sellingPrice === undefined) {
    return res.status(400).json({ message: 'Nama, kategori, dan harga jual wajib diisi.' });
  }

  const category = db.categories.find(c => c.id === categoryId);

  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    name,
    categoryId,
    categoryName: category ? category.name : 'Umum',
    image: image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    description: description || '',
    capitalPrice: Number(capitalPrice) || 0,
    sellingPrice: Number(sellingPrice) || 0,
    stock: Number(stock) || 0,
    minStockAlert: Number(minStockAlert) || 5,
    status: Number(stock) > 0 ? (status || 'Tersedia') : 'Habis',
    barcode: barcode || `899${Math.floor(100000 + Math.random() * 900000)}`,
    createdAt: new Date().toISOString()
  };

  db.products.unshift(newProduct);

  // Add stock history
  if (Number(stock) > 0) {
    db.stockHistory.unshift({
      id: `stk-${Date.now()}`,
      productId: newProduct.id,
      productName: newProduct.name,
      type: 'in',
      quantity: Number(stock),
      description: 'Stok awal produk baru',
      createdAt: new Date().toISOString(),
      userName: 'Admin / Owner'
    });
  }

  saveDatabase(db);
  res.status(201).json(newProduct);
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const index = db.products.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ message: 'Produk tidak ditemukan.' });
  }

  const category = db.categories.find(c => c.id === req.body.categoryId);

  const updated: Product = {
    ...db.products[index],
    ...req.body,
    categoryName: category ? category.name : db.products[index].categoryName,
    capitalPrice: Number(req.body.capitalPrice ?? db.products[index].capitalPrice),
    sellingPrice: Number(req.body.sellingPrice ?? db.products[index].sellingPrice),
    stock: Number(req.body.stock ?? db.products[index].stock),
    status: Number(req.body.stock) > 0 ? (req.body.status || 'Tersedia') : 'Habis'
  };

  db.products[index] = updated;
  saveDatabase(db);
  res.json(updated);
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const index = db.products.findIndex(p => p.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'Produk tidak ditemukan.' });
  }

  const deleted = db.products.splice(index, 1);
  saveDatabase(db);
  res.json({ message: 'Produk berhasil dihapus.', product: deleted[0] });
});

// TRANSACTIONS ROUTES
app.get('/api/transactions', (req, res) => {
  res.json(db.transactions);
});

app.post('/api/transactions', (req, res) => {
  const { items, paymentMethod, paidAmount, discount, userName, userId, branchName } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Keranjang belanja tidak boleh kosong.' });
  }

  const now = new Date();
  const taxRate = db.settings.taxRate || 0;

  let subtotal = 0;
  let totalCapital = 0;
  const details = [];

  // Verify and process stock for each item
  for (const item of items) {
    const product = db.products.find(p => p.id === item.product.id);
    if (!product) {
      return res.status(400).json({ message: `Produk ${item.product.name} tidak ditemukan.` });
    }

    if (product.stock < item.quantity) {
      return res.status(400).json({ message: `Stok ${product.name} tidak mencukupi (Tersisa: ${product.stock}).` });
    }

    const itemSubtotal = product.sellingPrice * item.quantity;
    subtotal += itemSubtotal;
    totalCapital += product.capitalPrice * item.quantity;

    // Deduct stock
    product.stock -= item.quantity;
    if (product.stock <= 0) {
      product.status = 'Habis';
    }

    details.push({
      id: `det-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      transactionId: '',
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      quantity: item.quantity,
      price: product.sellingPrice,
      capitalPrice: product.capitalPrice,
      subtotal: itemSubtotal
    });

    // Record stock out log
    db.stockHistory.unshift({
      id: `stk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      productId: product.id,
      productName: product.name,
      type: 'out',
      quantity: item.quantity,
      description: `Penjualan Kasir POS`,
      createdAt: now.toISOString(),
      userName: userName || 'Kasir'
    });
  }

  const discountAmount = Math.round(subtotal * ((discount || 0) / 100));
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = Math.round(afterDiscount * (taxRate / 100));
  const total = afterDiscount + taxAmount;
  const profit = total - totalCapital;

  const paid = Number(paidAmount) || total;
  const change = Math.max(0, paid - total);

  const prefix = db.settings.invoicePrefix || 'INV-KP';
  const timeStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const invoiceNumber = `${prefix}-${timeStr}-${randomSuffix}`;

  const transactionId = `trx-${Date.now()}`;

  details.forEach(d => d.transactionId = transactionId);

  const newTransaction: Transaction = {
    id: transactionId,
    invoiceNumber,
    userId: userId || 'usr-kasir',
    userName: userName || 'Andi Pratama (Kasir)',
    userRole: 'Kasir',
    subtotal,
    discount: discountAmount,
    tax: taxAmount,
    total,
    profit,
    paymentMethod: paymentMethod || 'Cash',
    paidAmount: paid,
    changeAmount: change,
    createdAt: now.toISOString(),
    branchName: branchName || db.settings.activeBranch,
    details
  };

  db.transactions.unshift(newTransaction);
  saveDatabase(db);

  res.status(201).json(newTransaction);
});

// INVENTORY ROUTES
app.get('/api/inventory', (req, res) => {
  res.json({
    products: db.products,
    stockHistory: db.stockHistory
  });
});

app.post('/api/inventory/adjust', (req, res) => {
  const { productId, type, quantity, description, userName } = req.body;

  const product = db.products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ message: 'Produk tidak ditemukan.' });
  }

  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ message: 'Jumlah stok harus angka lebih dari 0.' });
  }

  if (type === 'in') {
    product.stock += qty;
  } else if (type === 'out') {
    if (product.stock < qty) {
      return res.status(400).json({ message: 'Jumlah pengurangan melebihi stok yang ada.' });
    }
    product.stock -= qty;
  } else if (type === 'adjustment') {
    product.stock = qty;
  }

  product.status = product.stock > 0 ? 'Tersedia' : 'Habis';

  const log: StockHistory = {
    id: `stk-${Date.now()}`,
    productId: product.id,
    productName: product.name,
    type: type || 'adjustment',
    quantity: qty,
    description: description || 'Penyesuaian stok manual',
    createdAt: new Date().toISOString(),
    userName: userName || 'Admin / Owner'
  };

  db.stockHistory.unshift(log);
  saveDatabase(db);

  res.json({ message: 'Stok berhasil diperbarui.', product, log });
});

// STORE SETTINGS ROUTES
app.get('/api/settings', (req, res) => {
  res.json(db.settings);
});

app.put('/api/settings', (req, res) => {
  db.settings = {
    ...db.settings,
    ...req.body
  };
  saveDatabase(db);
  res.json(db.settings);
});

// REPORTS & DASHBOARD STATS ROUTE
app.get('/api/reports', (req, res) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Filter today's transactions
  const todayTrx = db.transactions.filter(t => new Date(t.createdAt).getTime() >= startOfToday);

  const todayRevenue = todayTrx.reduce((acc, t) => acc + t.total, 0);
  const todayProfit = todayTrx.reduce((acc, t) => acc + t.profit, 0);

  // Top selling products
  const productSalesMap: Record<string, { name: string; count: number; totalSales: number; image: string }> = {};

  db.transactions.forEach(t => {
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

  // Low stock products
  const lowStockProducts = db.products.filter(p => p.stock <= (p.minStockAlert || 5));

  // Daily Sales for last 7 days
  const salesByDay = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayStart = d.getTime();
    const dayEnd = dayStart + 86400000;

    const dayTrx = db.transactions.filter(t => {
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

  // Monthly Sales for last 6 months
  const salesByMonth = [];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = m.getTime();
    const nextM = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthEnd = nextM.getTime();

    const monthTrx = db.transactions.filter(t => {
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

  res.json({
    todayRevenue,
    todayTransactions: todayTrx.length,
    totalProducts: db.products.length,
    todayProfit,
    topSellingProducts,
    lowStockProducts,
    recentTransactions: db.transactions.slice(0, 8),
    salesByDay,
    salesByMonth,
    allTransactions: db.transactions
  });
});

// RESET SEED DATA
app.post('/api/reset-data', (req, res) => {
  db = {
    users: initialUsers,
    categories: initialCategories,
    products: initialProducts,
    transactions: generateInitialTransactions(),
    stockHistory: initialStockHistory,
    settings: initialStoreSettings
  };
  saveDatabase(db);
  res.json({ message: 'Database KasirPro berhasil di-reset ke data default.' });
});

// ==========================================
// VITE / STATIC SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 KasirPro Server running on http://localhost:${PORT}`);
  });
}

startServer();
