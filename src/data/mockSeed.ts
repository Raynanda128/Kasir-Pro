import { Category, Product, StoreSettings, User, Transaction, StockHistory } from '../types';

export const initialCategories: Category[] = [
  { id: 'cat-1', name: 'Makanan', icon: 'Utensils' },
  { id: 'cat-2', name: 'Minuman', icon: 'Coffee' },
  { id: 'cat-3', name: 'Snack', icon: 'Cookie' },
  { id: 'cat-4', name: 'Dessert', icon: 'IceCream' },
  { id: 'cat-5', name: 'Paket Hemat', icon: 'Package' },
];

export const presetProductImages = [
  { label: 'Nasi Goreng Spesial', url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80' },
  { label: 'Mie Goreng Seafood', url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80' },
  { label: 'Ayam Bakar Madu', url: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80' },
  { label: 'Es Kopi Susu Aren', url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80' },
  { label: 'Es Teh Manis Solo', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80' },
  { label: 'Matcha Latte Ice', url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80' },
  { label: 'Kentang Goreng Keju', url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80' },
  { label: 'Dimsum Ayam Crab', url: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80' },
  { label: 'Croissant Butter', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80' },
  { label: 'Croffle Maple Syrup', url: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80' },
  { label: 'Paket Bento Rice', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' },
  { label: 'Burger Sapi Keju', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80' }
];

export const initialProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Nasi Goreng Spesial KasirPro',
    categoryId: 'cat-1',
    categoryName: 'Makanan',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80',
    description: 'Nasi goreng dengan telor mata sapi, sosis, dan kerupuk renyah khas Nusantara',
    capitalPrice: 15000,
    sellingPrice: 28000,
    stock: 45,
    minStockAlert: 10,
    status: 'Tersedia',
    barcode: '899000101',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-2',
    name: 'Es Kopi Susu Aren Top',
    categoryId: 'cat-2',
    categoryName: 'Minuman',
    image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
    description: 'Espresso arabika dipadu dengan susu segar dan gula aren asli',
    capitalPrice: 8000,
    sellingPrice: 22000,
    stock: 80,
    minStockAlert: 15,
    status: 'Tersedia',
    barcode: '899000102',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-3',
    name: 'Ayam Bakar Madu Pedas',
    categoryId: 'cat-1',
    categoryName: 'Makanan',
    image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80',
    description: 'Paha/dada ayam bumbu madu gurih manis dipanggang empuk',
    capitalPrice: 18000,
    sellingPrice: 32000,
    stock: 25,
    minStockAlert: 5,
    status: 'Tersedia',
    barcode: '899000103',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-4',
    name: 'Es Teh Manis Jumbo',
    categoryId: 'cat-2',
    categoryName: 'Minuman',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80',
    description: 'Teh melati manis segar dingin racikan khas Solo',
    capitalPrice: 2000,
    sellingPrice: 8000,
    stock: 120,
    minStockAlert: 20,
    status: 'Tersedia',
    barcode: '899000104',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-5',
    name: 'Kentang Goreng Keju Mayo',
    categoryId: 'cat-3',
    categoryName: 'Snack',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
    description: 'French fries garing ditaburi bubuk keju dan saus mayonaise premium',
    capitalPrice: 10000,
    sellingPrice: 20000,
    stock: 30,
    minStockAlert: 8,
    status: 'Tersedia',
    barcode: '899000105',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-6',
    name: 'Dimsum Ayam Crab (4 Pcs)',
    categoryId: 'cat-3',
    categoryName: 'Snack',
    image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80',
    description: 'Dimsum olahan daging ayam dan toping stik kepiting lembut gurih',
    capitalPrice: 12000,
    sellingPrice: 24000,
    stock: 4, // Low stock alert demo
    minStockAlert: 10,
    status: 'Tersedia',
    barcode: '899000106',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-7',
    name: 'Croffle Syrup Maple Soft',
    categoryId: 'cat-4',
    categoryName: 'Dessert',
    image: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80',
    description: 'Croissant wafel renyah disiram sirup maple dan whipped cream',
    capitalPrice: 12000,
    sellingPrice: 25000,
    stock: 18,
    minStockAlert: 5,
    status: 'Tersedia',
    barcode: '899000107',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-8',
    name: 'Paket Bento Rice & Chicken',
    categoryId: 'cat-5',
    categoryName: 'Paket Hemat',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    description: 'Nasi hangat + Chicken Katsu + Salad Wijen + Es Teh Manis',
    capitalPrice: 22000,
    sellingPrice: 38000,
    stock: 2, // Low stock alert demo
    minStockAlert: 5,
    status: 'Tersedia',
    barcode: '899000108',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prod-9',
    name: 'Matcha Latte Ice Blend',
    categoryId: 'cat-2',
    categoryName: 'Minuman',
    image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
    description: 'Bubuk matcha Uji Jepang asli dengan susu creamy dingin',
    capitalPrice: 10000,
    sellingPrice: 26000,
    stock: 50,
    minStockAlert: 10,
    status: 'Tersedia',
    barcode: '899000109',
    createdAt: new Date().toISOString(),
  }
];

export const initialUsers: User[] = [
  {
    id: 'usr-owner',
    name: 'Budi Santoso (Owner)',
    email: 'owner@kasirpro.id',
    role: 'Owner',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    branch: 'Cabang Utama - Jakarta Pusat'
  },
  {
    id: 'usr-admin',
    name: 'Siti Rahma (Admin)',
    email: 'admin@kasirpro.id',
    role: 'Admin',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    branch: 'Cabang Utama - Jakarta Pusat'
  },
  {
    id: 'usr-kasir',
    name: 'Andi Pratama (Kasir)',
    email: 'kasir@kasirpro.id',
    role: 'Kasir',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    branch: 'Cabang Utama - Jakarta Pusat'
  }
];

export const initialStoreSettings: StoreSettings = {
  storeName: 'KasirPro Cafe & Resto',
  logo: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=300&q=80',
  address: 'Jl. Jendral Sudirman No. 45, Kebayoran Baru, Jakarta Selatan',
  phone: '0812-3456-7890',
  taxRate: 10, // 10%
  defaultDiscountRate: 0,
  invoicePrefix: 'INV-KP',
  receiptSize: '80mm',
  footerText: 'Terima kasih atas kunjungan Anda! Selamat menikmati hidangan.',
  enableBarcodeScanner: true,
  branches: ['Cabang Utama - Jakarta Pusat', 'Cabang 2 - Bandung', 'Cabang 3 - Surabaya'],
  activeBranch: 'Cabang Utama - Jakarta Pusat'
};

export const initialStockHistory: StockHistory[] = [
  {
    id: 'stk-1',
    productId: 'prod-1',
    productName: 'Nasi Goreng Spesial KasirPro',
    type: 'in',
    quantity: 50,
    description: 'Stok awal bahan baku nasi goreng',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    userName: 'Siti Rahma (Admin)'
  },
  {
    id: 'stk-2',
    productId: 'prod-2',
    productName: 'Es Kopi Susu Aren Top',
    type: 'in',
    quantity: 100,
    description: 'Pengadaan biji kopi espresso & gula aren',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    userName: 'Siti Rahma (Admin)'
  },
  {
    id: 'stk-3',
    productId: 'prod-6',
    productName: 'Dimsum Ayam Crab (4 Pcs)',
    type: 'out',
    quantity: 10,
    description: 'Penyesuaian stok bahan rusak/expired',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    userName: 'Budi Santoso (Owner)'
  }
];

// Helper to generate realistic historical transactions for charts & reporting
export const generateInitialTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const now = new Date();
  
  // Create 25 realistic sample transactions across recent days
  const sampleData = [
    { daysAgo: 0, hoursAgo: 1, count: 1, pId: 'prod-1', qty: 2, p2Id: 'prod-2', q2: 2, method: 'QRIS' as const, paid: 100000 },
    { daysAgo: 0, hoursAgo: 2, count: 1, pId: 'prod-8', qty: 1, p2Id: 'prod-4', q2: 1, method: 'Cash' as const, paid: 50000 },
    { daysAgo: 0, hoursAgo: 4, count: 1, pId: 'prod-3', qty: 2, p2Id: 'prod-9', q2: 2, method: 'Bank Transfer' as const, paid: 116000 },
    { daysAgo: 0, hoursAgo: 5, count: 1, pId: 'prod-5', qty: 3, p2Id: 'prod-2', q2: 3, method: 'Debit Card' as const, paid: 150000 },
    { daysAgo: 0, hoursAgo: 6, count: 1, pId: 'prod-7', qty: 2, p2Id: 'prod-4', q2: 2, method: 'QRIS' as const, paid: 70000 },
    
    { daysAgo: 1, hoursAgo: 10, count: 1, pId: 'prod-1', qty: 3, p2Id: 'prod-2', q2: 3, method: 'Cash' as const, paid: 200000 },
    { daysAgo: 1, hoursAgo: 14, count: 1, pId: 'prod-3', qty: 1, p2Id: 'prod-6', q2: 2, method: 'QRIS' as const, paid: 80000 },
    { daysAgo: 1, hoursAgo: 18, count: 1, pId: 'prod-8', qty: 2, p2Id: 'prod-9', q2: 2, method: 'Debit Card' as const, paid: 130000 },

    { daysAgo: 2, hoursAgo: 12, count: 1, pId: 'prod-1', qty: 4, p2Id: 'prod-4', q2: 4, method: 'QRIS' as const, paid: 150000 },
    { daysAgo: 2, hoursAgo: 16, count: 1, pId: 'prod-5', qty: 2, p2Id: 'prod-2', q2: 2, method: 'Cash' as const, paid: 100000 },

    { daysAgo: 3, hoursAgo: 11, count: 1, pId: 'prod-3', qty: 3, p2Id: 'prod-7', q2: 2, method: 'Bank Transfer' as const, paid: 160000 },
    { daysAgo: 4, hoursAgo: 13, count: 1, pId: 'prod-8', qty: 3, p2Id: 'prod-2', q2: 3, method: 'QRIS' as const, paid: 200000 },
    { daysAgo: 5, hoursAgo: 15, count: 1, pId: 'prod-1', qty: 5, p2Id: 'prod-9', q2: 5, method: 'Debit Card' as const, paid: 300000 },
    { daysAgo: 6, hoursAgo: 17, count: 1, pId: 'prod-6', qty: 4, p2Id: 'prod-4', q2: 4, method: 'Cash' as const, paid: 150000 }
  ];

  sampleData.forEach((item, index) => {
    const tDate = new Date(now.getTime() - item.daysAgo * 86400000 - item.hoursAgo * 3600000);
    const p1 = initialProducts.find(p => p.id === item.pId) || initialProducts[0];
    const p2 = initialProducts.find(p => p.id === item.p2Id) || initialProducts[1];

    const subtotal = (p1.sellingPrice * item.qty) + (p2.sellingPrice * item.q2);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;
    const totalCapital = (p1.capitalPrice * item.qty) + (p2.capitalPrice * item.q2);
    const profit = total - totalCapital;

    const invNum = `INV-KP-${tDate.getFullYear()}${(tDate.getMonth()+1).toString().padStart(2, '0')}${tDate.getDate().toString().padStart(2, '0')}-${(100 + index).toString()}`;

    transactions.push({
      id: `trx-${index + 1}`,
      invoiceNumber: invNum,
      userId: 'usr-kasir',
      userName: 'Andi Pratama (Kasir)',
      userRole: 'Kasir',
      subtotal,
      discount: 0,
      tax,
      total,
      profit,
      paymentMethod: item.method,
      paidAmount: item.paid,
      changeAmount: item.paid - total,
      createdAt: tDate.toISOString(),
      branchName: 'Cabang Utama - Jakarta Pusat',
      details: [
        {
          id: `det-${index}-1`,
          transactionId: `trx-${index + 1}`,
          productId: p1.id,
          productName: p1.name,
          productImage: p1.image,
          quantity: item.qty,
          price: p1.sellingPrice,
          capitalPrice: p1.capitalPrice,
          subtotal: p1.sellingPrice * item.qty
        },
        {
          id: `det-${index}-2`,
          transactionId: `trx-${index + 1}`,
          productId: p2.id,
          productName: p2.name,
          productImage: p2.image,
          quantity: item.q2,
          price: p2.sellingPrice,
          capitalPrice: p2.capitalPrice,
          subtotal: p2.sellingPrice * item.q2
        }
      ]
    });
  });

  return transactions;
};
