import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Lock, 
  Mail, 
  ArrowRight, 
  Building, 
  AlertCircle,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { User, UserRole } from '../types';
import { apiLogin, apiRegister, apiForgotPassword, apiGoogleLogin, apiUpdatePassword } from '../lib/api';
import { useToast } from '../components/Toast';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  initialMode?: 'login' | 'register' | 'forgot' | 'resetPassword';
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, initialMode }) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'resetPassword'>(() => {
    if (initialMode) return initialMode;
    if (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')) {
      return 'resetPassword';
    }
    return 'login';
  });

  useEffect(() => {
    if (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')) {
      setMode('resetPassword');
    }
  }, []);
  
  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBranch, setRegBranch] = useState('Cabang Utama');
  const [regRole, setRegRole] = useState<UserRole>('Owner');
  
  // Forgot password form
  const [forgotEmail, setForgotEmail] = useState('');

  // Reset password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await apiLogin(email, password);
      showToast(res.message, 'success');
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login gagal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      setErrorMsg('Harap lengkapi nama, email, dan kata sandi.');
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }
    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await apiRegister({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
        branch: regBranch
      });
      showToast('Pendaftaran akun toko berhasil!', 'success');
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Pendaftaran gagal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await apiForgotPassword(forgotEmail);
      showToast(res.message, 'info');
      setMode('login');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mereset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await apiUpdatePassword(newPassword);
      showToast(res.message, 'success');
      // Clean up hash/search parameters from recovery link
      window.history.replaceState(null, '', window.location.pathname);
      setNewPassword('');
      setConfirmPassword('');
      setMode('login');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memperbarui kata sandi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await apiGoogleLogin();
      showToast(res.message, 'success');
      onLoginSuccess(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login dengan Google gagal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 mx-auto flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 mb-3">
            <Store className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Kasir<span className="text-emerald-400">Pro</span>
          </h1>
          <p className="text-sm font-medium text-slate-400 mt-1">
            Sistem Kasir POS Modern UMKM, Cafe & Retail
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800/90 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/80 shadow-2xl">
          
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-rose-950/80 border border-rose-800 text-rose-200 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* LOGIN MODE */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-xl font-bold text-white">Masuk ke Akun Toko</h2>
                <p className="text-xs text-slate-400">Silakan masukkan email dan kata sandi Anda</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Pengguna</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@tokomu.id"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-300">Kata Sandi</label>
                  <button
                    type="button"
                    onClick={() => { setErrorMsg(''); setMode('forgot'); }}
                    className="text-xs text-emerald-400 hover:underline"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all mt-2"
              >
                <span>{isLoading ? 'Memproses...' : 'Masuk ke Aplikasi'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="relative my-3 flex items-center justify-center">
                <div className="border-t border-slate-700/80 w-full" />
                <span className="bg-slate-800 px-3 text-[11px] text-slate-400 font-semibold uppercase absolute">atau</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Masuk Cepat dengan Google</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setErrorMsg(''); setMode('register'); }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Belum punya toko? <strong className="text-emerald-400">Daftar Toko Baru</strong>
                </button>
              </div>
            </form>
          )}

          {/* REGISTER MODE */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-xl font-bold text-white">Registrasi Toko Baru</h2>
                <p className="text-xs text-slate-400">Buat akun bisnis dan cabang toko Anda</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Pengguna / Pemilik</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Budi Santoso"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Toko</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="pemilik@tokobaru.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Kata Sandi Akun</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Cabang Toko</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={regBranch}
                    onChange={(e) => setRegBranch(e.target.value)}
                    placeholder="Cabang Utama - Jakarta"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Role Utama Akun</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-500 outline-none"
                >
                  <option value="Owner">Owner (Pemilik Usaha)</option>
                  <option value="Admin">Admin (Pengelola)</option>
                  <option value="Kasir">Kasir (Operator Transaksi)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all mt-2"
              >
                {isLoading ? 'Mendaftarkan...' : 'Daftar & Mulai Kasir'}
              </button>

              <div className="relative my-3 flex items-center justify-center">
                <div className="border-t border-slate-700/80 w-full" />
                <span className="bg-slate-800 px-3 text-[11px] text-slate-400 font-semibold uppercase absolute">atau</span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Daftar / Masuk Langsung dengan Google</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setErrorMsg(''); setMode('login'); }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Sudah punya akun? <strong className="text-emerald-400">Kembali ke Login</strong>
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD MODE */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-xl font-bold text-white">Lupa Kata Sandi?</h2>
                <p className="text-xs text-slate-400">Masukkan email Anda untuk reset password</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Pengguna</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="owner@kasirpro.id"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-500 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all"
              >
                {isLoading ? 'Kirim...' : 'Kirim Instruksi Reset'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setErrorMsg(''); setMode('login'); }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Kembali ke <strong className="text-emerald-400">Halaman Login</strong>
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD MODE (LINK RECOVERY) */}
          {mode === 'resetPassword' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl mx-auto flex items-center justify-center mb-2">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white">Atur Kata Sandi Baru</h2>
                <p className="text-xs text-slate-400">Masukkan kata sandi baru untuk akun Supabase Anda</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Kata Sandi Baru</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-500 outline-none"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Konfirmasi Kata Sandi Baru</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-emerald-500 outline-none"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all mt-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isLoading ? 'Memperbarui...' : 'Simpan Kata Sandi Baru'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setErrorMsg(''); setMode('login'); }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Batal, <strong className="text-emerald-400">Kembali ke Halaman Login</strong>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          KasirPro POS • Aplikasi Kasir Terpercaya untuk Bisnis Indonesia
        </p>

      </div>
    </div>
  );
};
