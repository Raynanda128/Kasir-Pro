import React, { useState } from 'react';
import { 
  Menu, 
  Sun, 
  Moon, 
  Bell, 
  LogOut, 
  Store, 
  UserCheck, 
  ShieldCheck, 
  FileSpreadsheet,
  Sparkles,
  AlertTriangle,
  User as UserIcon
} from 'lucide-react';
import { StoreSettings, User, UserRole } from '../types';
import { DEFAULT_BOTAK_AVATAR } from '../data/avatarPresets';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  onChangeRole: (role: UserRole) => void;
  settings: StoreSettings;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  onOpenMobileSidebar: () => void;
  lowStockCount: number;
  onQuickRestock: () => void;
  onExportHistoryCSV?: () => void;
  onOpenProfileModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onChangeRole,
  settings,
  darkMode,
  setDarkMode,
  onOpenMobileSidebar,
  lowStockCount,
  onQuickRestock,
  onExportHistoryCSV,
  onOpenProfileModal
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Store Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 items-center justify-center font-bold">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight truncate max-w-[180px] sm:max-w-none">
              {settings.storeName || 'KasirPro Cafe & Resto'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {settings.activeBranch || 'Cabang Utama'}
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Static Role Indicator Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Role: <strong className="text-emerald-600 dark:text-emerald-400">{currentUser.role}</strong></span>
        </div>

        {/* Low Stock Alert Button */}
        {lowStockCount > 0 && (
          <button
            onClick={onQuickRestock}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-all"
            title={`${lowStockCount} Produk Stok Menipis`}
          >
            <AlertTriangle className="w-4 h-4 animate-bounce shrink-0" />
            <span className="hidden sm:inline">{lowStockCount} Menipis</span>
          </button>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title={darkMode ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* User Profile / Logout */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <img 
              src={currentUser.avatar || DEFAULT_BOTAK_AVATAR} 
              alt={currentUser.name} 
              className="w-8 h-8 rounded-full object-cover border border-emerald-500/30"
            />
            <span className="hidden sm:block text-xs font-semibold text-slate-800 dark:text-slate-200">
              {currentUser.name.split(' ')[0]}
            </span>
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {currentUser.role}
                </span>
              </div>

              {onOpenProfileModal && (
                <button
                  onClick={() => { onOpenProfileModal(); setShowUserDropdown(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors mb-1"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Ubah Profil & Kata Sandi</span>
                </button>
              )}

              {onExportHistoryCSV && (
                <button
                  onClick={() => { onExportHistoryCSV(); setShowUserDropdown(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Simpan Riwayat ke CSV</span>
                </button>
              )}

              <button
                onClick={() => { onLogout(); setShowUserDropdown(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors mt-1"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar / Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
