import React, { useState, useEffect } from 'react';
import { 
  User, 
  UserRole, 
  Product, 
  Category, 
  Transaction, 
  StoreSettings, 
  StockHistory, 
  DashboardStats,
  CartItem,
  PaymentMethod
} from './types';
import { initialStoreSettings } from './data/mockSeed';
import { 
  listenAuthState,
  subscribeProducts,
  subscribeCategories,
  subscribeTransactions,
  subscribeStockHistory,
  subscribeSettings,
  apiCreateProduct, 
  apiUpdateProduct, 
  apiDeleteProduct, 
  apiCreateTransaction, 
  apiAdjustStock, 
  apiUpdateSettings, 
  apiLogout,
  apiAcceptInvitationByToken,
  apiUpdateUserProfile,
  calculateDashboardStats
} from './lib/api';
import { exportTransactionsToCSV } from './lib/exportCsv';

import { ToastProvider, useToast } from './components/Toast';
import { Sidebar, NavTab } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ReceiptModal } from './components/ReceiptModal';
import { ProductFormModal } from './components/ProductFormModal';
import { StockModal } from './components/StockModal';
import { UserProfileModal } from './components/UserProfileModal';

import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { PosView } from './views/PosView';
import { ProductsView } from './views/ProductsView';
import { InventoryView } from './views/InventoryView';
import { TransactionsView } from './views/TransactionsView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';

function AppContent() {
  const { showToast } = useToast();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('kasirpro_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('kasirpro_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kasirpro_theme', 'light');
    }
  }, [darkMode]);

  // Listen to Realtime Supabase Auth & Local Session Fallback
  useEffect(() => {
    const unsubscribe = listenAuthState((user, isRecovery) => {
      if (isRecovery) {
        setIsRecoveryMode(true);
      }
      if (user && !isRecovery) {
        setCurrentUser(user);
        localStorage.setItem('kasirpro_user', JSON.stringify(user));
      } else if (!user) {
        const saved = localStorage.getItem('kasirpro_user');
        if (saved && !isRecovery) {
          try {
            setCurrentUser(JSON.parse(saved));
          } catch (e) {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle Invitation Tokens in URL (#invite=TOKEN or ?invite=TOKEN) or stored token
  useEffect(() => {
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    let urlToken = '';

    if (hash.includes('invite=')) {
      urlToken = hash.split('invite=')[1]?.split('&')[0];
    } else if (search.includes('invite=')) {
      urlToken = search.split('invite=')[1]?.split('&')[0];
    }

    if (urlToken) {
      try {
        localStorage.setItem('kasirpro_pending_invite_token', urlToken);
      } catch (e) {
        console.warn('Gagal menyimpan token undangan:', e);
      }
    }

    const tokenToProcess = urlToken || localStorage.getItem('kasirpro_pending_invite_token');

    if (tokenToProcess && currentUser) {
      const processInvite = async () => {
        try {
          await apiAcceptInvitationByToken(tokenToProcess);
          showToast('Selamat! Anda berhasil bergabung ke tim toko.', 'success');
        } catch (err: any) {
          // If token was already accepted or invalid, log gently
          showToast(err.message || 'Gagal menerima undangan.', 'error');
        } finally {
          localStorage.removeItem('kasirpro_pending_invite_token');
          window.history.replaceState(null, '', window.location.pathname);
        }
      };
      processInvite();
    }
  }, [currentUser]);

  // Sidebar & Layout State
  const [activeTab, setActiveTab] = useState<NavTab>('kasir');
  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState<boolean>(false);

  // App Core Data States (Realtime Supabase)
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(initialStoreSettings);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dynamic Page Title
  useEffect(() => {
    if (!currentUser) {
      document.title = 'KasirPro | Masuk ke Akun';
      return;
    }

    const tabTitles: Record<NavTab, string> = {
      kasir: 'Kasir & Transaksi POS',
      dashboard: 'Dashboard Analitik',
      produk: 'Manajemen Produk & Katalog',
      stok: 'Manajemen Stok & Inventaris',
      transaksi: 'Riwayat Transaksi',
      laporan: 'Laporan Penjualan',
      pengaturan: 'Pengaturan Toko'
    };

    const storeName = settings?.storeName || 'KasirPro';
    const pageTitle = tabTitles[activeTab] || 'KasirPro';
    document.title = `${pageTitle} - ${storeName}`;
  }, [currentUser, activeTab, settings?.storeName]);

  // Modals States
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [productModalOpen, setProductModalOpen] = useState<boolean>(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [stockModalOpen, setStockModalOpen] = useState<boolean>(false);
  const [selectedProductForStock, setSelectedProductForStock] = useState<Product | null>(null);

  // Realtime Subscriptions to Supabase Tables
  useEffect(() => {
    if (!currentUser) return;

    setIsLoading(true);

    const unsubCats = subscribeCategories((cats) => {
      setCategories(cats);
    });

    const unsubProds = subscribeProducts((prods) => {
      setProducts(prods);
      setIsLoading(false);
    });

    const unsubTxs = subscribeTransactions((txs) => {
      setTransactions(txs);
    });

    const unsubStock = subscribeStockHistory((history) => {
      setStockHistory(history);
    });

    const unsubSetts = subscribeSettings((setts) => {
      setSettings(setts);
    });

    return () => {
      unsubCats();
      unsubProds();
      unsubTxs();
      unsubStock();
      unsubSetts();
    };
  }, [currentUser]);

  // Recalculate Dashboard Analytics whenever transactions or products update
  useEffect(() => {
    if (products.length >= 0) {
      const stats = calculateDashboardStats(transactions, products);
      setDashboardStats(stats);
    }
  }, [transactions, products]);

  // Logout Handler
  const handleLogout = async () => {
    localStorage.removeItem('kasirpro_user');
    await apiLogout();
    setCurrentUser(null);
    showToast('Berhasil keluar dari akun.', 'info');
  };

  const handleUpdateProfile = async (payload: { name: string; avatar: string }) => {
    if (!currentUser) return;
    const updated = await apiUpdateUserProfile(currentUser.id, payload);
    setCurrentUser(updated);
  };

  // Role Switcher Handler (For Demo/Permission Preview)
  const handleChangeRole = (role: UserRole) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, role };
    setCurrentUser(updatedUser);
    showToast(`Beralih simulasi akses peran sebagai ${role}`, 'info');

    // Restrict access if tab not permitted for Kasir
    if (role === 'Kasir' && ['produk', 'stok', 'laporan', 'pengaturan'].includes(activeTab)) {
      setActiveTab('kasir');
    }
  };

  // Export Transaction History CSV Handler
  const handleExportHistoryCSV = () => {
    try {
      exportTransactionsToCSV(transactions);
      showToast('Data riwayat transaksi berhasil disimpan ke CSV!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan data riwayat ke CSV', 'error');
    }
  };

  // Submit Transaction Handler
  const handleCompleteTransaction = async (payload: {
    items: CartItem[];
    paymentMethod: PaymentMethod;
    paidAmount: number;
    discount: number;
    userName: string;
    userId: string;
    branchName: string;
  }) => {
    try {
      const newTx = await apiCreateTransaction(payload);
      setReceiptTx(newTx);
      showToast('Transaksi berhasil diproses & tersimpan di database!', 'success');
      return newTx;
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses transaksi', 'error');
      throw err;
    }
  };

  // Submit Add / Edit Product
  const handleSaveProduct = async (data: Partial<Product>) => {
    try {
      if (selectedProductForEdit) {
        await apiUpdateProduct(selectedProductForEdit.id, data);
        showToast('Produk berhasil diperbarui di database!', 'success');
      } else {
        await apiCreateProduct(data);
        showToast('Produk baru berhasil ditambahkan ke database!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan produk', 'error');
    }
  };

  // Submit Delete Product
  const handleDeleteProduct = async (id: string) => {
    try {
      await apiDeleteProduct(id);
      showToast('Produk berhasil dihapus!', 'info');
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus produk', 'error');
    }
  };

  // Submit Stock Adjustment
  const handleAdjustStock = async (payload: {
    productId: string;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    description: string;
  }) => {
    try {
      await apiAdjustStock({
        ...payload,
        userName: currentUser?.name
      });
      showToast('Stok produk berhasil diperbarui di database!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui stok', 'error');
    }
  };

  // Save Settings
  const handleSaveSettings = async (updated: Partial<StoreSettings>) => {
    try {
      await apiUpdateSettings(updated);
      showToast('Pengaturan toko berhasil disimpan!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan pengaturan', 'error');
    }
  };

  // Calculate low stock items count
  const lowStockCount = products.filter(p => p.stock <= (p.minStockAlert || 5)).length;

  // Checking Auth State Screen
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400">Menghubungkan ke Database Supabase...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated screen or Recovery mode
  if (!currentUser || isRecoveryMode) {
    return (
      <LoginView 
        initialMode={isRecoveryMode ? 'resetPassword' : 'login'}
        onLoginSuccess={(u) => {
          setIsRecoveryMode(false);
          localStorage.setItem('kasirpro_user', JSON.stringify(u));
          setCurrentUser(u);
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col">
      
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        isOpenMobile={isOpenMobileSidebar}
        setIsOpenMobile={setIsOpenMobileSidebar}
        lowStockCount={lowStockCount}
        onOpenProfileModal={() => setShowProfileModal(true)}
      />

      {/* Main Wrapper */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar */}
        <Navbar
          currentUser={currentUser}
          onLogout={handleLogout}
          onChangeRole={handleChangeRole}
          settings={settings}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onOpenMobileSidebar={() => setIsOpenMobileSidebar(true)}
          lowStockCount={lowStockCount}
          onQuickRestock={() => setActiveTab('stok')}
          onExportHistoryCSV={handleExportHistoryCSV}
          onOpenProfileModal={() => setShowProfileModal(true)}
        />

        {/* Tab Views Content */}
        <main className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 animate-pulse">
              Sedang sinkronisasi data KasirPro...
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  stats={dashboardStats}
                  currentUser={currentUser}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onRestockProduct={(p) => {
                    setSelectedProductForStock(p);
                    setStockModalOpen(true);
                  }}
                  onViewTransaction={(t) => setReceiptTx(t)}
                />
              )}

              {activeTab === 'kasir' && (
                <PosView
                  products={products}
                  categories={categories}
                  settings={settings}
                  currentUser={currentUser}
                  onCompleteTransaction={handleCompleteTransaction}
                />
              )}

              {activeTab === 'produk' && (
                <ProductsView
                  products={products}
                  categories={categories}
                  currentUser={currentUser}
                  onOpenAddModal={() => {
                    setSelectedProductForEdit(null);
                    setProductModalOpen(true);
                  }}
                  onOpenEditModal={(p) => {
                    setSelectedProductForEdit(p);
                    setProductModalOpen(true);
                  }}
                  onDeleteProduct={handleDeleteProduct}
                  onOpenStockModal={(p) => {
                    setSelectedProductForStock(p);
                    setStockModalOpen(true);
                  }}
                />
              )}

              {activeTab === 'stok' && (
                <InventoryView
                  products={products}
                  stockHistory={stockHistory}
                  onOpenStockModal={(p) => {
                    setSelectedProductForStock(p);
                    setStockModalOpen(true);
                  }}
                />
              )}

              {activeTab === 'transaksi' && (
                <TransactionsView
                  transactions={transactions}
                  onViewReceipt={(t) => setReceiptTx(t)}
                  onExportHistoryCSV={handleExportHistoryCSV}
                />
              )}

              {activeTab === 'laporan' && (
                <ReportsView stats={dashboardStats} />
              )}

              {activeTab === 'pengaturan' && (
                <SettingsView
                  settings={settings}
                  currentUser={currentUser}
                  onSaveSettings={handleSaveSettings}
                  onExportHistoryCSV={handleExportHistoryCSV}
                  onOpenProfileModal={() => setShowProfileModal(true)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* User Profile Editor Modal */}
      {currentUser && (
        <UserProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          currentUser={currentUser}
          onUpdateProfile={handleUpdateProfile}
        />
      )}

      {/* Digital Receipt / Struk Modal */}
      {receiptTx && (
        <ReceiptModal
          transaction={receiptTx}
          settings={settings}
          onClose={() => setReceiptTx(null)}
        />
      )}

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        product={selectedProductForEdit}
        categories={categories}
        isOpen={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setSelectedProductForEdit(null);
        }}
        onSubmit={handleSaveProduct}
      />

      {/* Stock Adjustment Modal */}
      <StockModal
        product={selectedProductForStock}
        isOpen={stockModalOpen}
        onClose={() => {
          setStockModalOpen(false);
          setSelectedProductForStock(null);
        }}
        onSubmit={handleAdjustStock}
      />

    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
