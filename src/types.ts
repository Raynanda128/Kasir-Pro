export type UserRole = 'Owner' | 'Admin' | 'Pengelola' | 'Kasir' | 'owner' | 'admin' | 'manager' | 'cashier';

export interface Profile {
  id: string; // Linked to auth.users.id
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  logoUrl?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessMember {
  id: string;
  businessId: string;
  userId: string;
  role: 'owner' | 'admin' | 'manager' | 'cashier';
  outletId?: string | null;
  status: 'active' | 'disabled';
  invitedBy?: string;
  createdAt?: string;
  // Joined display attributes
  profileName?: string;
  profileEmail?: string;
  profileAvatar?: string;
  outletName?: string;
}

export interface BusinessInvitation {
  id: string;
  businessId: string;
  email: string;
  role: 'admin' | 'manager' | 'cashier';
  outletId?: string | null;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitedBy?: string;
  createdAt?: string;
  expiresAt?: string;
  acceptedAt?: string;
  outletName?: string;
  inviterName?: string;
}

export interface Outlet {
  id: string;
  businessId: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Inventory {
  id: string;
  outletId: string;
  productId: string;
  stock: number;
  minimumStock: number;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  businessRole?: 'owner' | 'admin' | 'manager' | 'cashier';
  avatar?: string;
  branch?: string;
  businessId?: string;
  activeOutletId?: string | null;
}

export interface Category {
  id: string;
  businessId?: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
}

export interface SelectedAddon {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  businessId?: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  image: string;
  description: string;
  sku?: string;
  purchasePrice?: number;
  capitalPrice: number; // Harga modal
  sellingPrice: number; // Harga jual
  stock: number;
  minStockAlert?: number;
  minStock?: number;
  unit?: string;
  status: 'Tersedia' | 'Habis';
  barcode?: string;
  addons?: ProductAddon[];
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentMethod = 'Cash' | 'QRIS' | 'Bank Transfer' | 'Debit Card';

export interface TransactionDetail {
  id: string;
  transactionId: string;
  businessId?: string;
  productId: string;
  productName: string;
  productImage?: string;
  quantity: number;
  price: number; // selling price at time of sale
  capitalPrice: number; // capital price at time of sale
  discount?: number;
  subtotal: number;
  selectedAddons?: SelectedAddon[];
  notes?: string;
}

export interface Transaction {
  id: string;
  businessId?: string;
  outletId?: string;
  invoiceNumber: string;
  userId: string;
  userName: string;
  cashierId?: string;
  cashierName?: string;
  customerId?: string;
  userRole: UserRole;
  subtotal: number;
  discount: number; // percentage or fixed
  tax: number;
  total: number;
  profit: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  changeAmount: number;
  status?: string;
  createdAt: string;
  branchName?: string;
  details: TransactionDetail[];
}

export type ReceiptSize = '58mm' | '80mm' | 'Full HD';

export interface StoreSettings {
  id?: string;
  businessId?: string;
  storeName: string;
  logo: string;
  qrisImage?: string;
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
  businessId?: string;
  outletId?: string;
  productId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previousStock?: number;
  newStock?: number;
  description: string;
  note?: string;
  createdAt: string;
  userName: string;
  userId?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedAddons?: SelectedAddon[];
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
