import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Building2,
  Edit2,
  UserX,
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  User,
  Trash2
} from 'lucide-react';
import { BusinessMember, Outlet, User as UserType } from '../types';
import { 
  apiFetchTeamMembers, 
  apiFetchOutlets, 
  apiCreateStaffAccount,
  apiUpdateMemberRoleAndOutlet,
  apiToggleMemberStatus,
  apiDeleteMember,
  subscribeTeamData
} from '../lib/api';
import { useToast } from './Toast';

interface TeamManagementProps {
  currentUser: UserType;
}

const generateRandomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Kasir${rand}!`;
};

export const TeamManagement: React.FC<TeamManagementProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const businessId = currentUser.businessId || `biz-${currentUser.id}`;

  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State: Create Staff Account
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState(() => generateRandomPassword());
  const [showPassword, setShowPassword] = useState(true);
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'cashier'>('cashier');
  const [inviteOutletId, setInviteOutletId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal State: Created Staff Account Info Pop-up
  const [createdAccount, setCreatedAccount] = useState<{
    name: string;
    email: string;
    password?: string;
    role: string;
    outletName?: string;
  } | null>(null);

  // Modal State: Edit Member
  const [editingMember, setEditingMember] = useState<BusinessMember | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'manager' | 'cashier'>('cashier');
  const [editOutletId, setEditOutletId] = useState<string>('');

  // Copy Feedback State
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const isOwnerOrAdmin = currentUser.businessRole === 'owner' || currentUser.businessRole === 'admin';

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersData, outletsData] = await Promise.all([
        apiFetchTeamMembers(businessId),
        apiFetchOutlets(businessId)
      ]);
      setMembers(membersData);
      setOutlets(outletsData);
    } catch (err: any) {
      console.error('Failed to load team data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeTeamData(businessId, () => {
      Promise.all([
        apiFetchTeamMembers(businessId),
        apiFetchOutlets(businessId)
      ]).then(([membersData, outletsData]) => {
        setMembers(prev => JSON.stringify(prev) === JSON.stringify(membersData) ? prev : membersData);
        setOutlets(prev => JSON.stringify(prev) === JSON.stringify(outletsData) ? prev : outletsData);
      }).catch(err => console.warn('Background team data refresh exception:', err));
    });
    return () => unsub();
  }, [businessId]);

  const handleGenerateNewPassword = () => {
    const newPwd = generateRandomPassword();
    setStaffPassword(newPwd);
    showToast('Kata sandi acak baru berhasil dibuat.', 'info');
  };

  const handleCreateDirectAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !inviteEmail.trim()) {
      showToast('Nama lengkap dan email login wajib diisi.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const pwd = staffPassword.trim() || generateRandomPassword();
      await apiCreateStaffAccount({
        businessId,
        name: staffName.trim(),
        email: inviteEmail.trim(),
        password: pwd,
        role: inviteRole,
        outletId: inviteOutletId || null
      });

      let outletName = 'Semua Outlet';
      if (inviteOutletId) {
        const o = outlets.find(item => item.id === inviteOutletId);
        if (o) outletName = o.name;
      }

      const roleText = inviteRole === 'admin' ? 'Admin' : inviteRole === 'manager' ? 'Pengelola' : 'Kasir';

      showToast(`Akun staf ${staffName} berhasil dibuat!`, 'success');
      setCreatedAccount({
        name: staffName.trim(),
        email: inviteEmail.trim(),
        password: pwd,
        role: roleText,
        outletName
      });

      setStaffName('');
      setInviteEmail('');
      setStaffPassword(generateRandomPassword());
      setShowAddStaffModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat akun staf', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`${fieldName} berhasil disalin ke clipboard!`, 'success');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleCopyAllAccountInfo = () => {
    if (!createdAccount) return;
    const infoText = `Detail Akun Login KasirPro Staf:\nNama: ${createdAccount.name}\nEmail: ${createdAccount.email}\nKata Sandi: ${createdAccount.password}\nPeran: ${createdAccount.role}\nOutlet: ${createdAccount.outletName}\n\nLogin di: ${window.location.origin}`;
    navigator.clipboard.writeText(infoText);
    setCopiedField('allInfo');
    showToast('Seluruh informasi akun staf berhasil disalin!', 'success');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleOpenEditMember = (member: BusinessMember) => {
    setEditingMember(member);
    setEditRole(member.role === 'owner' ? 'admin' : (member.role as any));
    setEditOutletId(member.outletId || '');
  };

  const handleSaveMemberUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      setIsSubmitting(true);
      await apiUpdateMemberRoleAndOutlet(editingMember.id, editRole, editOutletId || null);
      showToast('Peran dan outlet anggota berhasil diperbarui!', 'success');
      setEditingMember(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui anggota', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleMemberStatus = async (member: BusinessMember) => {
    const newStatus = member.status === 'active' ? 'disabled' : 'active';
    const actionText = newStatus === 'disabled' ? 'nonaktifkan' : 'aktifkan kembali';
    if (!confirm(`Apakah Anda yakin ingin meng-${actionText} akun ${member.profileName || member.profileEmail}?`)) return;

    try {
      await apiToggleMemberStatus(member.id, newStatus);
      showToast(`Status akun ${member.profileName} berhasil diubah ke ${newStatus}!`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah status anggota', 'error');
    }
  };

  const handleDeleteMember = async (member: BusinessMember) => {
    const name = member.profileName || member.profileEmail || 'Staf';
    if (!confirm(`⚠️ PERINGATAN: Apakah Anda YAKIN ingin MEMECAT/MENGHAPUS akun staf "${name}"?\n\nTindakan ini akan menghapus akun staf secara permanen dari tim ini.`)) {
      return;
    }

    try {
      await apiDeleteMember(member.id);
      showToast(`Akun staf "${name}" telah berhasil dipecat & dihapus dari tim!`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal memecat/menghapus akun staf', 'error');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">Owner</span>;
      case 'admin':
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">Admin</span>;
      case 'manager':
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">Pengelola</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">Kasir</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Add Staff Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>Manajemen Tim & Hak Akses Staf</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            Buat akun login staf langsung (Kasir, Pengelola, Admin) dan atur penugasan cabang outlet
          </p>
        </div>

        {isOwnerOrAdmin && (
          <button
            type="button"
            onClick={() => setShowAddStaffModal(true)}
            className="w-full sm:w-auto px-4.5 py-3 sm:py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Buat Akun Staf Baru</span>
          </button>
        )}
      </div>

      {/* TEAM MEMBERS LIST */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Daftar Akun Staf Aktif ({members.length})</span>
          </h4>
          <button
            type="button"
            onClick={loadData}
            className="p-2 sm:p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Memuat daftar akun staf...</div>
        ) : members.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">Belum ada akun staf terdaftar. Klik &quot;Buat Akun Staf Baru&quot; di atas.</div>
        ) : (
          <>
            {/* MOBILE CARD VIEW (Smartphones) */}
            <div className="block sm:hidden space-y-3">
              {members.map((member) => (
                <div 
                  key={member.id}
                  className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        {member.profileName || 'Staf KasirPro'}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{member.profileEmail || member.userId}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {getRoleBadge(member.role)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[120px]">{member.outletName || 'Semua Outlet'}</span>
                    </div>

                    <div>
                      {member.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" /> Nonaktif
                        </span>
                      )}
                    </div>
                  </div>

                  {isOwnerOrAdmin && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end gap-2">
                      {member.role !== 'owner' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEditMember(member)}
                            className="px-3 py-1.5 rounded-xl bg-slate-200/80 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Ubah</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleMemberStatus(member)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 ${
                              member.status === 'active' 
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' 
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {member.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            <span>{member.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMember(member)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Pecat</span>
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic font-medium">Pemilik Utama (Akun Utama)</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* TABLE VIEW (Tablets / iPads & PC/Laptop) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-extrabold uppercase text-slate-400">
                    <th className="py-3 px-3">Nama & Email Staf</th>
                    <th className="py-3 px-3">Peran (Role)</th>
                    <th className="py-3 px-3">Penugasan Outlet</th>
                    <th className="py-3 px-3">Status</th>
                    {isOwnerOrAdmin && <th className="py-3 px-3 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {member.profileName || 'Staf KasirPro'}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>{member.profileEmail || member.userId}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {getRoleBadge(member.role)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{member.outletName || 'Semua Outlet'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {member.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" /> Nonaktif
                          </span>
                        )}
                      </td>
                      {isOwnerOrAdmin && (
                        <td className="py-3 px-3 text-right">
                          {member.role !== 'owner' ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditMember(member)}
                                className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                title="Ubah Peran & Outlet"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleMemberStatus(member)}
                                className={`p-1.5 rounded-xl transition-all ${
                                  member.status === 'active' 
                                    ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30' 
                                    : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                }`}
                                title={member.status === 'active' ? 'Nonaktifkan Akun Sementara' : 'Aktifkan Akun'}
                              >
                                {member.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteMember(member)}
                                className="p-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-all"
                                title="Pecat / Hapus Staf Permanen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Pemilik Utama</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* MODAL: CREATE STAFF ACCOUNT DIRECTLY */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-500" />
                Buat Akun Staf Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDirectAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Staf *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Login Staf *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="budi@kasirpro.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Kata Sandi Awal *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateNewPassword}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>⚡ Acak Sandi</span>
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="Kata sandi..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Staf langsung dapat login dengan kata sandi ini dan menggantinya sendiri di profil.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Peran / Hak Akses (Role) *
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="cashier">Kasir / Cashier (Khusus Layar Transaksi POS)</option>
                  <option value="manager">Pengelola / Manager (Akses Laporan & Produk)</option>
                  <option value="admin">Admin (Akses Penuh Manajemen Toko)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Penugasan Cabang / Outlet
                </label>
                <select
                  value={inviteOutletId}
                  onChange={(e) => setInviteOutletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Semua Outlet (Akses Global)</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Buat Akun Staf Sekarang</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MEMBER ROLE & OUTLET */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-500" />
                Ubah Peran & Outlet Staf
              </h3>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMemberUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama / Email Staf
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${editingMember.profileName || 'Staf'} (${editingMember.profileEmail || editingMember.userId})`}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-xs font-bold outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Peran / Hak Akses Baru
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="cashier">Kasir / Cashier</option>
                  <option value="manager">Pengelola / Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Penugasan Cabang / Outlet
                </label>
                <select
                  value={editOutletId}
                  onChange={(e) => setEditOutletId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Semua Outlet (Akses Global)</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POP-UP MODAL: CREATED STAFF ACCOUNT INFO & WHATSAPP SHARE */}
      {createdAccount && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Informasi Akun Staf Berhasil Dibuat!
              </h3>
              <button
                type="button"
                onClick={() => setCreatedAccount(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Akun login staf untuk <strong className="text-slate-900 dark:text-white">{createdAccount.name}</strong> telah langsung aktif dan tersambung ke database toko Anda.
              </p>

              {/* Account Credential Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Nama Staf:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">{createdAccount.name}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Email Login:</div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white select-all">{createdAccount.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(createdAccount.email, 'Email')}
                    className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 shrink-0"
                  >
                    {copiedField === 'Email' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'Email' ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="space-y-0.5">
                    <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Kata Sandi Awal:</div>
                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm tracking-wider select-all">
                      {createdAccount.password}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyText(createdAccount.password || '', 'Kata Sandi')}
                    className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1 shrink-0"
                  >
                    {copiedField === 'Kata Sandi' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedField === 'Kata Sandi' ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Peran & Outlet:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {createdAccount.role} • {createdAccount.outletName}
                  </span>
                </div>
              </div>

              {/* Quick Actions: WhatsApp & Copy All */}
              <div className="space-y-2 pt-1">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Halo ${createdAccount.name}!\n\nAkun staf KasirPro Anda telah dibuat.\n\nDetail Akun Login:\n• Email: ${createdAccount.email}\n• Kata Sandi: ${createdAccount.password}\n• Peran: ${createdAccount.role}\n• Outlet: ${createdAccount.outletName}\n\nSilakan login di KasirPro: ${window.location.origin}\nAnda dapat mengganti kata sandi kapan saja setelah login.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
                >
                  <span>📱 Kirim Detail Akun via WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyAllAccountInfo}
                  className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  {copiedField === 'allInfo' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedField === 'allInfo' ? 'Seluruh Detail Akun Tersalin!' : '📋 Salin Semua Detail Akun'}</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-800 dark:text-blue-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p>
                  Staf bisa langsung menggunakan email & kata sandi tersebut untuk login ke KasirPro dan mengakses fitur sesuai peran yang diberikan.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCreatedAccount(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition-all"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

