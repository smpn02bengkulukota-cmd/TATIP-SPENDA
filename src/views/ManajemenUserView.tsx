import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  UserCog, 
  UserPlus, 
  Edit, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Inbox,
  Save,
  ShieldAlert
} from 'lucide-react';
import { User, UserRole } from '../types';

export const ManajemenUserView: React.FC = () => {
  const { 
    users, 
    currentUser, 
    refreshData 
  } = useApp();

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  // Form State
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formNip, setFormNip] = useState('');
  const [formPeran, setFormPeran] = useState<UserRole>('GURU_BK');
  const [formStatusAktif, setFormStatusAktif] = useState<'AKTIF' | 'NONAKTIF'>('AKTIF');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);

  const isAdmin = currentUser?.peran === 'ADMIN';

  const roleLabels: Record<UserRole, string> = {
    ADMIN: 'Administrator',
    WAKASEK_KESISWAAN: 'Wakasek Kesiswaan',
    GURU_BK: 'Guru BK',
    TIM_KEDISIPLINAN: 'Tim Kedisiplinan',
    KOORDINATOR_PIKET: 'Koordinator Piket',
    WALI_KELAS: 'Wali Kelas'
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setActiveUser(null);
    setFormUsername('');
    setFormPassword('');
    setFormNama('');
    setFormNip('');
    setFormPeran('GURU_BK');
    setFormStatusAktif('AKTIF');
    setFeedback(null);
  };

  const handleOpenEdit = (u: User) => {
    setModalMode('edit');
    setActiveUser(u);
    setFormUsername(u.username);
    setFormPassword(''); // Dikosongkan kecuali ingin reset
    setFormNama(u.nama);
    setFormNip(u.nip || '');
    setFormPeran(u.peran);
    setFormStatusAktif(u.status_aktif);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSubmitting(true);
    setFeedback(null);

    let res;
    if (modalMode === 'create') {
      if (!formUsername.trim() || !formPassword || !formNama.trim()) {
        setFeedback({ success: false, text: 'Semua kolom wajib diisi lengkap.' });
        setIsSubmitting(false);
        return;
      }

      res = await api.crudUser({
        sub_action: 'create',
        username: formUsername.trim(),
        password: formPassword,
        nama: formNama.trim(),
        nip: formNip.trim() || '-',
        peran: formPeran,
        actor_id: currentUser.user_id,
      });
    } else if (modalMode === 'edit' && activeUser) {
      res = await api.crudUser({
        sub_action: 'update',
        user_id: activeUser.user_id,
        nama: formNama.trim(),
        nip: formNip.trim() || '-',
        peran: formPeran,
        status_aktif: formStatusAktif,
        new_password: formPassword ? formPassword : undefined,
        actor_id: currentUser.user_id,
      });
    }

    setIsSubmitting(false);

    if (res?.success) {
      setFeedback({ success: true, text: 'Data pengguna berhasil disimpan ke Google Spreadsheet!' });
      await refreshData();
      setTimeout(() => {
        setModalMode(null);
      }, 1000);
    } else {
      setFeedback({ success: false, text: res?.error || 'Gagal menyimpan data pengguna.' });
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">Akses Dibatasi</h2>
        <p className="text-xs mt-1">Menu Manajemen Pengguna hanya dapat diakses oleh Administrator resmi sekolah.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Manajemen Pengguna & Hak Akses
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan akun resmi sekolah dengan hashing kata sandi aman (SHA-256 + Salt).
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Pengguna Baru
        </button>
      </div>

      {/* Tabel Pengguna */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {users.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Belum ada akun pengguna pada tab Users Google Spreadsheet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">ID Pengguna</th>
                  <th className="py-3 px-4">Nama Lengkap & NIP</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Peran (Role)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Terakhir Login</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isAktif = u.status_aktif === 'AKTIF';

                  return (
                    <tr key={u.user_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {u.user_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{u.nama}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {u.nip && u.nip !== '-' ? `NIP. ${u.nip}` : <span className="italic text-slate-400">Non-PNS / Belum diisi</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {u.username}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-blue-950">
                          {roleLabels[u.peran] || u.peran}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block text-[10px] font-bold ${isAktif ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {u.status_aktif}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {u.terakhir_login || <span className="italic text-slate-400">Belum pernah</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-md transition-colors"
                          title="Edit Pengguna / Reset Password"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit Pengguna */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="font-bold text-sm text-slate-900">
                {modalMode === 'create' ? 'Tambah Pengguna Baru' : 'Edit Pengguna'}
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>

            {feedback && (
              <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${feedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {feedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                <span>{feedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Petugas / Guru</label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: Dra. Hj. Nurlela, M.Pd"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nomor Induk Pegawai (NIP)
                  <span className="text-slate-400 font-normal ml-1">(Terkait Tanda Tangan Laporan)</span>
                </label>
                <input
                  type="text"
                  value={formNip}
                  onChange={(e) => setFormNip(e.target.value)}
                  placeholder="Contoh: 19800512 200501 1 003 atau - (jika non-PNS)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  NIP ini akan otomatis tercantum pada bagian tanda tangan dokumen laporan disiplin wali kelas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Pengguna (Username)</label>
                <input
                  type="text"
                  required
                  disabled={modalMode === 'edit'}
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Contoh: nurlela_bk"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {modalMode === 'create' ? 'Kata Sandi Awal (Min. 6 Karakter)' : 'Reset Kata Sandi (Kosongkan jika tidak diganti)'}
                </label>
                <input
                  type="password"
                  required={modalMode === 'create'}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={modalMode === 'create' ? 'Masukkan kata sandi awal' : 'Ketik kata sandi baru untuk reset'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Peran (Role Kewenangan)</label>
                <select
                  value={formPeran}
                  onChange={(e) => setFormPeran(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                >
                  <option value="KOORDINATOR_PIKET">Koordinator Piket (Akses Input & Baca Terbatas)</option>
                  <option value="GURU_BK">Guru BK (Operasional Konseling & Rekap)</option>
                  <option value="TIM_KEDISIPLINAN">Tim Kedisiplinan (Input & Pengiriman Notifikasi WA)</option>
                  <option value="WALI_KELAS">Wali Kelas (Pembinaan Siswa Kelas Tanggung Jawab)</option>
                  <option value="WAKASEK_KESISWAAN">Wakasek Kesiswaan (Kelola Data & Rekap Kebijakan)</option>
                  <option value="ADMIN">Administrator (Hak Penuh Pengaturan & Pengguna)</option>
                </select>
              </div>

              {modalMode === 'edit' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Akun</label>
                  <select
                    value={formStatusAktif}
                    onChange={(e) => setFormStatusAktif(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                  >
                    <option value="AKTIF">AKTIF (Dapat Login)</option>
                    <option value="NONAKTIF">NONAKTIF (Diblokir)</option>
                  </select>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
