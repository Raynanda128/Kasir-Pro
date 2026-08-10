export type UserRole = 'Owner' | 'Admin' | 'Kasir';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  branch?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  image: string;
  description: string;
  capitalPrice: number; // Harga modal
  sellingPrice: number; // Harga jual
  stock: number;
  minStockAlert?: number;
  status: 'Tersedia' | 'Habis';
  barcode?: string;
  createdAt: string;
}

export type PaymentMethod = 'Cash' | 'QRIS' | 'Bank Transfer' | 'Debit Card';

export interface TransactionDetail {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number; // selling price at time of sale
  capitalPrice: number; // capital price at time of sale
  subtotal: number;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  subtotal: number;
  discount: number; // percentage or fixed
  tax: number;
  total: number;
  profit: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  changeAmount: number;
  createdAt: string;
  branchName?: string;
  details: TransactionDetail[];
}

export type ReceiptSize = '58mm' | '80mm' | 'Full HD';

export interface StoreSettings {
  id?: string;
  storeName: string;
  logo: string;
  address: string;
  phone: string;
  taxRate: number; // e.g. 10 for 10%
  defaultDiscountRate: number; // percentage
  invoicePrefix: string; // e.g. 'INV-KP'
  receiptSize: ReceiptSize;
  footerText: string;
  enableBarcodeScanner: boolean;
  branches: string[];
  activeBranch: string;
}

export interface StockHistory {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  description: string;
  createdAt: string;
  userName: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export interface DashboardStats {
  todayRevenue: number;
  todayTransactions: number;
  totalProducts: number;
  todayProfit: number;
  topSellingProducts: { name: string; count: number; totalSales: number; image: string }[];
  lowStockProducts: Product[];
  recentTransactions: Transaction[];
  salesByDay: { label: string; revenue: number; profit: number; count: number }[];
  salesByWeek: { label: string; revenue: number; profit: number; count: number }[];
  salesByMonth: { label: string; revenue: number; profit: number; count: number }[];
}
