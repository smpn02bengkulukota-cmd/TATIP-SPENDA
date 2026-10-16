import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  School, 
  Plus, 
  Edit, 
  CheckCircle2, 
  AlertCircle, 
  Inbox,
  Save,
  Phone
} from 'lucide-react';
import { Kelas } from '../types';

export const DataKelasView: React.FC = () => {
  const { 
    kelas, 
    users, 
    currentUser, 
    refreshData,
    pengaturan 
  } = useApp();

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [activeKelas, setActiveKelas] = useState<Kelas | null>(null);

  // Form State
  const [formKelasId, setFormKelasId] = useState('');
  const [formNamaKelas, setFormNamaKelas] = useState('');
  const [formTahunAjaran, setFormTahunAjaran] = useState(pengaturan['TAHUN_AJARAN_AKTIF'] || '2026/2027');
  const [formWaliUserId, setFormWaliUserId] = useState('');
  const [formNomorWa, setFormNomorWa] = useState('');
  const [formStatusAktif, setFormStatusAktif] = useState<'AKTIF' | 'NONAKTIF'>('AKTIF');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);

  const canManage = ['ADMIN', 'WAKASEK_KESISWAAN'].includes(currentUser?.peran || '');

  // Daftar user yang berstatus WALI_KELAS atau Guru
  const waliKelasUsers = users.filter(u => u.status_aktif === 'AKTIF' && (u.peran === 'WALI_KELAS' || u.peran === 'ADMIN' || u.peran === 'GURU_BK'));

  const handleOpenCreate = () => {
    setModalMode('create');
    setActiveKelas(null);
    setFormKelasId('');
    setFormNamaKelas('');
    setFormTahunAjaran(pengaturan['TAHUN_AJARAN_AKTIF'] || '2026/2027');
    setFormWaliUserId('');
    setFormNomorWa('628');
    setFormStatusAktif('AKTIF');
    setFeedback(null);
  };

  const handleOpenEdit = (k: Kelas) => {
    setModalMode('edit');
    setActiveKelas(k);
    setFormKelasId(k.kelas_id);
    setFormNamaKelas(k.nama_kelas);
    setFormTahunAjaran(k.tahun_ajaran);
    setFormWaliUserId(k.wali_kelas_user_id || '');
    setFormNomorWa(k.nomor_wa_wali_kelas || '628');
    setFormStatusAktif(k.status_aktif);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !formNamaKelas.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    let res;
    if (modalMode === 'create') {
      res = await api.crudKelas({
        sub_action: 'create',
        kelas_id: formKelasId.trim() || undefined,
        nama_kelas: formNamaKelas.trim(),
        tahun_ajaran: formTahunAjaran.trim(),
        wali_kelas_user_id: formWaliUserId,
        nomor_wa_wali_kelas: formNomorWa.trim(),
        user_id: currentUser.user_id,
      });
    } else if (modalMode === 'edit' && activeKelas) {
      res = await api.crudKelas({
        sub_action: 'update',
        kelas_id: activeKelas.kelas_id,
        nama_kelas: formNamaKelas.trim(),
        tahun_ajaran: formTahunAjaran.trim(),
        wali_kelas_user_id: formWaliUserId,
        nomor_wa_wali_kelas: formNomorWa.trim(),
        status_aktif: formStatusAktif,
        user_id: currentUser.user_id,
      });
    }

    setIsSubmitting(false);

    if (res?.success) {
      setFeedback({ success: true, text: 'Data kelas berhasil disimpan ke Google Spreadsheet!' });
      await refreshData();
      setTimeout(() => {
        setModalMode(null);
      }, 1000);
    } else {
      setFeedback({ success: false, text: res?.error || 'Gagal menyimpan data kelas.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Data Kelas & Wali Kelas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar kelas dan nomor kontak WhatsApp wali kelas untuk notifikasi otomatis.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Kelas Baru
          </button>
        )}
      </div>

      {/* Tabel Data Kelas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {kelas.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Belum ada data kelas yang terdaftar pada Google Spreadsheet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">ID Kelas</th>
                  <th className="py-3 px-4">Nama Kelas</th>
                  <th className="py-3 px-4">Tahun Ajaran</th>
                  <th className="py-3 px-4">Wali Kelas</th>
                  <th className="py-3 px-4">Nomor WhatsApp Wali</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {canManage && <th className="py-3 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kelas.map((k) => {
                  const waliUser = users.find(u => u.user_id === k.wali_kelas_user_id);
                  const isAktif = k.status_aktif === 'AKTIF';

                  return (
                    <tr key={k.kelas_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {k.kelas_id}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        Kelas {k.nama_kelas}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {k.tahun_ajaran}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium">
                        {waliUser ? waliUser.nama : (k.wali_kelas_user_id || '-')}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {k.nomor_wa_wali_kelas ? (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            {k.nomor_wa_wali_kelas}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block text-[10px] font-bold ${isAktif ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {k.status_aktif}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(k)}
                            className="p-1.5 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit Kelas"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit Kelas */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="font-bold text-sm text-slate-900">
                {modalMode === 'create' ? 'Tambah Data Kelas Baru' : 'Edit Data Kelas'}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">ID Kelas (Opsional untuk baru)</label>
                <input
                  type="text"
                  disabled={modalMode === 'edit'}
                  value={formKelasId}
                  onChange={(e) => setFormKelasId(e.target.value)}
                  placeholder="Contoh: KLS-7A (otomatis jika kosong)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kelas</label>
                <input
                  type="text"
                  required
                  value={formNamaKelas}
                  onChange={(e) => setFormNamaKelas(e.target.value)}
                  placeholder="Contoh: VII.A / VIII.B / IX.C"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Ajaran</label>
                <input
                  type="text"
                  required
                  value={formTahunAjaran}
                  onChange={(e) => setFormTahunAjaran(e.target.value)}
                  placeholder="2026/2027"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Akun Wali Kelas Terdaftar</label>
                <select
                  value={formWaliUserId}
                  onChange={(e) => setFormWaliUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                >
                  <option value="">-- Pilih Akun Guru / Wali Kelas --</option>
                  {waliKelasUsers.map(u => (
                    <option key={u.user_id} value={u.user_id}>{u.nama} ({u.username})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp Wali Kelas</label>
                <input
                  type="text"
                  value={formNomorWa}
                  onChange={(e) => setFormNomorWa(e.target.value)}
                  placeholder="Contoh: 6281234567890"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Format internasional dengan awalan 62 (contoh: 6281234567890).
                </p>
              </div>

              {modalMode === 'edit' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Kelas</label>
                  <select
                    value={formStatusAktif}
                    onChange={(e) => setFormStatusAktif(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="NONAKTIF">NONAKTIF</option>
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
                  {isSubmitting ? 'Menyimpan...' : 'Simpan ke Spreadsheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
