import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Boxes, 
  Receipt, 
  BarChart3, 
  Settings, 
  Store,
  X,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { User, UserRole } from '../types';

export type NavTab = 
  | 'dashboard' 
  | 'kasir' 
  | 'produk' 
  | 'stok' 
  | 'transaksi' 
  | 'laporan' 
  | 'pengaturan';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentUser: User;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  lowStockCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  isOpenMobile,
  setIsOpenMobile,
  lowStockCount
}) => {
  const role = currentUser.role;

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['Owner', 'Admin', 'Kasir'] as UserRole[],
      badge: null
    },
    {
      id: 'kasir' as NavTab,
      label: 'Kasir POS',
      icon: ShoppingCart,
      roles: ['Owner', 'Admin', 'Kasir'] as UserRole[],
      badge: 'Utama',
      badgeColor: 'bg-emerald-500 text-white dark:bg-emerald-600'
    },
    {
      id: 'produk' as NavTab,
      label: 'Manajemen Produk',
      icon: Package,
      roles: ['Owner', 'Admin'] as UserRole[],
      badge: null
    },
    {
      id: 'stok' as NavTab,
      label: 'Stok Inventory',
      icon: Boxes,
      roles: ['Owner', 'Admin'] as UserRole[],
      badge: lowStockCount > 0 ? `${lowStockCount} Menipis` : null,
      badgeColor: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
    },
    {
      id: 'transaksi' as NavTab,
      label: 'Riwayat Transaksi',
      icon: Receipt,
      roles: ['Owner', 'Admin', 'Kasir'] as UserRole[],
      badge: null
    },
    {
      id: 'laporan' as NavTab,
      label: 'Laporan Penjualan',
      icon: BarChart3,
      roles: ['Owner'] as UserRole[],
      badge: 'Owner'
    },
    {
      id: 'pengaturan' as NavTab,
      label: 'Pengaturan Toko',
      icon: Settings,
      roles: ['Owner'] as UserRole[],
      badge: null
    }
  ];

  const allowedItems = navItems.filter(item => item.roles.includes(role));

  const handleSelect = (tab: NavTab) => {
    setActiveTab(tab);
    setIsOpenMobile(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div 
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 font-bold text-xl">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-0.5">
                Kasir<span className="text-emerald-500">Pro</span>
              </h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Sistem Kasir Modern</p>
            </div>
          </div>

          <button 
            onClick={() => setIsOpenMobile(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role Card */}
        <div className="p-3.5 mx-4 my-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
          <img 
            src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'} 
            alt={currentUser.name}
            className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-emerald-500/30"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{currentUser.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                role === 'Owner' 
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' 
                  : role === 'Admin'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {role === 'Owner' ? <ShieldCheck className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                Role: {role}
              </span>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Menu Utama
          </div>

          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`
                  w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-colors group
                  ${isActive 
                    ? 'bg-emerald-50 text-emerald-600 font-semibold dark:bg-emerald-950/60 dark:text-emerald-400' 
                    : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300'
                  }
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 group-hover:text-emerald-500'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500">
          <p className="font-semibold text-slate-600 dark:text-slate-400 truncate">{currentUser.branch || 'Cabang Utama'}</p>
          <p className="mt-0.5">KasirPro POS v2.5 • Ready</p>
        </div>
      </aside>
    </>
  );
};
