import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Check, 
  User as UserIcon, 
  Camera, 
  Link as LinkIcon, 
  Sparkles, 
  Save,
  Smile,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { User } from '../types';
import { AVATAR_PRESETS, DEFAULT_BOTAK_AVATAR } from '../data/avatarPresets';
import { useToast } from './Toast';
import { apiChangePasswordWithOld } from '../lib/api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateProfile: (updated: { name: string; avatar: string }) => Promise<void>;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Main modal tab state
  const [modalTab, setModalTab] = useState<'profile' | 'security'>('profile');

  // Profile Form state
  const [name, setName] = useState(currentUser.name || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || DEFAULT_BOTAK_AVATAR);
  const [avatarSourceTab, setAvatarSourceTab] = useState<'preset' | 'upload' | 'url'>('preset');
  const [customUrl, setCustomUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change Form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      showToast('Ukuran foto maksimal 3MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        setAvatar(dataUrl);
        showToast('Foto berhasil dimuat dari perangkat!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) return;
    setAvatar(customUrl.trim());
    showToast('URL foto berhasil diterapkan!', 'success');
  };

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Nama pengguna tidak boleh kosong', 'error');
      return;
    }

    try {
      setIsSavingProfile(true);
      await onUpdateProfile({
        name: name.trim(),
        avatar: avatar || DEFAULT_BOTAK_AVATAR
      });
      showToast('Foto profil & nama berhasil diperbarui!', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui profil', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword) {
      showToast('Harap masukkan kata sandi lama Anda', 'error');
      return;
    }

    if (!newPassword) {
      showToast('Harap masukkan kata sandi baru', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Kata sandi baru minimal 6 karakter', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi kata sandi baru tidak cocok', 'error');
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await apiChangePasswordWithOld(oldPassword, newPassword, currentUser);
      showToast(res.message || 'Kata sandi berhasil diperbarui!', 'success');
      
      // Reset form fields
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui kata sandi', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Pengaturan Akun Saya</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ubah profil, foto avatar, dan kata sandi ({currentUser.role})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs (Profile vs Password) */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={() => setModalTab('profile')}
            className={`py-3 px-4 font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all ${
              modalTab === 'profile'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Profil & Foto</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('security')}
            className={`py-3 px-4 font-extrabold text-xs flex items-center gap-2 border-b-2 transition-all ${
              modalTab === 'security'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Ganti Kata Sandi</span>
          </button>
        </div>

        {/* TAB 1: EDIT PROFILE & AVATAR */}
        {modalTab === 'profile' && (
          <form onSubmit={handleSaveProfileSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
            
            {/* Avatar Preview Section */}
            <div className="flex flex-col items-center justify-center space-y-3 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
              <div className="relative group">
                <img
                  src={avatar || DEFAULT_BOTAK_AVATAR}
                  alt="Preview Avatar"
                  className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-lg ring-4 ring-emerald-500/20 transition-all duration-300 group-hover:scale-105"
                  onError={() => setAvatar(DEFAULT_BOTAK_AVATAR)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-500 transition-transform active:scale-95"
                  title="Ganti Foto Dari HP/PC"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  <Sparkles className="w-3 h-3" /> Avatar Aktif
                </span>
              </div>
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Nama Lengkap Anda *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama Anda"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>

            {/* Avatar Source Tabs */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Pilihan Foto / Avatar Profil
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setAvatarSourceTab('preset')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    avatarSourceTab === 'preset'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Smile className="w-3.5 h-3.5" />
                  <span>Pilihan Preset</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAvatarSourceTab('upload')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    avatarSourceTab === 'upload'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Foto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAvatarSourceTab('url')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    avatarSourceTab === 'url'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>URL Gambar</span>
                </button>
              </div>

              {/* AVATAR SUB-TAB 1: PRESETS */}
              {avatarSourceTab === 'preset' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      👤 Avatar KasirPro
                    </p>
                    <div className="grid grid-cols-4 gap-2.5">
                      {AVATAR_PRESETS.filter(p => p.category === 'botak').map((preset) => {
                        const isSelected = avatar === preset.url;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setAvatar(preset.url)}
                            className={`relative rounded-2xl p-2 border-2 transition-all flex flex-col items-center gap-1 group ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.name}
                              className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                            <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 text-center line-clamp-1">
                              {preset.name}
                            </span>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-white">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      🎨 Karakter Profesional Lainnya
                    </p>
                    <div className="grid grid-cols-3 gap-2.5">
                      {AVATAR_PRESETS.filter(p => p.category === 'preset').map((preset) => {
                        const isSelected = avatar === preset.url;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setAvatar(preset.url)}
                            className={`relative rounded-2xl p-2 border-2 transition-all flex flex-col items-center gap-1 group ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <img
                              src={preset.url}
                              alt={preset.name}
                              className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                            <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 text-center line-clamp-1">
                              {preset.name}
                            </span>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 p-0.5 rounded-full bg-emerald-500 text-white">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* AVATAR SUB-TAB 2: UPLOAD */}
              {avatarSourceTab === 'upload' && (
                <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Pilih Foto Dari Galeri / PC Anda</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Mendukung format JPG, PNG, WEBP (Max 3MB)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    Pilih Berkas Foto
                  </button>
                </div>
              )}

              {/* AVATAR SUB-TAB 3: CUSTOM URL */}
              {avatarSourceTab === 'url' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://example.com/foto-anda.jpg"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomUrl}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs hover:bg-slate-800 transition-all shrink-0"
                    >
                      Terapkan
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tempelkan URL langsung gambar profil publik dari Unsplash atau internet.
                  </p>
                </div>
              )}
            </div>

            {/* Save Profile Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingProfile ? 'Menyimpan...' : 'Simpan Profil'}</span>
              </button>
            </div>

          </form>
        )}

        {/* TAB 2: CHANGE PASSWORD */}
        {modalTab === 'security' && (
          <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">Verifikasi Keamanan Akun</h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  Demi keamanan akun Anda ({currentUser.email}), masukkan <strong>kata sandi lama</strong> terlebih dahulu sebelum membuat kata sandi baru.
                </p>
              </div>
            </div>

            {/* Old Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Masukkan Kata Sandi Lama *
              </label>
              <div className="relative">
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Password lama Anda"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Masukkan Kata Sandi Baru *
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Ulangi Kata Sandi Baru *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Samakan dengan kata sandi baru"
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Save Password Buttons */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isChangingPassword ? 'Memproses...' : 'Perbarui Kata Sandi'}</span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
