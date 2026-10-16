import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  Users, 
  Search, 
  UserPlus, 
  Edit, 
  CheckCircle2, 
  AlertCircle, 
  Inbox,
  Save
} from 'lucide-react';
import { Siswa } from '../types';
import { getEffectivePoin } from '../utils/pointCalculator';

export const DataSiswaView: React.FC = () => {
  const { 
    siswa, 
    kelas, 
    laporan,
    currentUser, 
    refreshData,
    pengaturan 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal State
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [activeSiswa, setActiveSiswa] = useState<Siswa | null>(null);

  // Form State
  const [formNisn, setFormNisn] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formKelasId, setFormKelasId] = useState('');
  const [formTahunAjaran, setFormTahunAjaran] = useState(pengaturan['TAHUN_AJARAN_AKTIF'] || '2026/2027');
  const [formStatusAktif, setFormStatusAktif] = useState<'AKTIF' | 'NONAKTIF'>('AKTIF');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);

  const canManage = ['ADMIN', 'WAKASEK_KESISWAAN'].includes(currentUser?.peran || '');

  // Filtered Siswa
  const filteredList = useMemo(() => {
    return siswa.filter(s => {
      if (filterKelas !== 'ALL' && s.kelas_id !== filterKelas) return false;
      if (filterStatus !== 'ALL' && s.status_aktif !== filterStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!s.nama_lengkap.toLowerCase().includes(q) && !s.nisn.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [siswa, filterKelas, filterStatus, searchQuery]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setActiveSiswa(null);
    setFormNisn('');
    setFormNama('');
    setFormKelasId(kelas.length > 0 ? kelas[0].kelas_id : '');
    setFormTahunAjaran(pengaturan['TAHUN_AJARAN_AKTIF'] || '2026/2027');
    setFormStatusAktif('AKTIF');
    setFeedback(null);
  };

  const handleOpenEdit = (s: Siswa) => {
    setModalMode('edit');
    setActiveSiswa(s);
    setFormNisn(s.nisn);
    setFormNama(s.nama_lengkap);
    setFormKelasId(s.kelas_id);
    setFormTahunAjaran(s.tahun_ajaran);
    setFormStatusAktif(s.status_aktif);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !formNisn.trim() || !formNama.trim() || !formKelasId) return;

    setIsSubmitting(true);
    setFeedback(null);

    let res;
    if (modalMode === 'create') {
      res = await api.crudSiswa({
        sub_action: 'create',
        nisn: formNisn.trim(),
        nama_lengkap: formNama.trim(),
        kelas_id: formKelasId,
        tahun_ajaran: formTahunAjaran.trim(),
        user_id: currentUser.user_id,
      });
    } else if (modalMode === 'edit' && activeSiswa) {
      res = await api.crudSiswa({
        sub_action: 'update',
        siswa_id: activeSiswa.siswa_id,
        nisn: formNisn.trim(),
        nama_lengkap: formNama.trim(),
        kelas_id: formKelasId,
        tahun_ajaran: formTahunAjaran.trim(),
        status_aktif: formStatusAktif,
        user_id: currentUser.user_id,
      });
    }

    setIsSubmitting(false);

    if (res?.success) {
      setFeedback({ success: true, text: 'Data siswa berhasil disimpan ke Google Spreadsheet!' });
      await refreshData();
      setTimeout(() => {
        setModalMode(null);
      }, 1000);
    } else {
      setFeedback({ success: false, text: res?.error || 'Gagal menyimpan data siswa.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Data Siswa
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar siswa aktif SMP Negeri 2 Kota Bengkulu tersimpan di Google Spreadsheet.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Siswa Baru
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari NISN atau nama siswa..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
          >
            <option value="ALL">Semua Kelas</option>
            {kelas.map(k => (
              <option key={k.kelas_id} value={k.kelas_id}>Kelas {k.nama_kelas}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="AKTIF">AKTIF</option>
            <option value="NONAKTIF">NONAKTIF</option>
          </select>
        </div>
      </div>

      {/* Tabel Data Siswa */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Tidak ada data siswa yang ditemukan pada tab Siswa Google Spreadsheet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">NISN</th>
                  <th className="py-3 px-4">Nama Lengkap Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Tahun Ajaran</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Total Kasus</th>
                  <th className="py-3 px-4 text-right">Poin Siswa</th>
                  {canManage && <th className="py-3 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((s) => {
                  const k = kelas.find(x => x.kelas_id === s.kelas_id);
                  const isAktif = s.status_aktif === 'AKTIF';
                  const siswaLaporan = laporan.filter(l => l.siswa_id === s.siswa_id && l.status_data === 'VALID');
                  const totalPoin = siswaLaporan.reduce((acc, curr) => acc + getEffectivePoin(curr, pengaturan['SKEMA_POIN_PELANGGARAN']), 0);
                  const totalKasus = siswaLaporan.length;

                  return (
                    <tr key={s.siswa_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {s.nisn}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {s.nama_lengkap}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        Kelas {k ? k.nama_kelas : s.kelas_id}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {s.tahun_ajaran}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block text-[10px] font-bold ${isAktif ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {s.status_aktif}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${totalKasus > 0 ? 'bg-amber-100 text-amber-900' : 'text-slate-400'}`}>
                          {totalKasus} kasus
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${totalPoin > 0 ? 'bg-red-100 text-red-800 font-extrabold' : 'bg-emerald-50 text-emerald-800 font-semibold'}`}>
                          {totalPoin} Poin
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit Siswa"
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

      {/* Modal Tambah/Edit Siswa */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="font-bold text-sm text-slate-900">
                {modalMode === 'create' ? 'Tambah Data Siswa Baru' : 'Edit Data Siswa'}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">NISN (Nomor Induk Siswa Nasional)</label>
                <input
                  type="text"
                  required
                  value={formNisn}
                  onChange={(e) => setFormNisn(e.target.value)}
                  placeholder="Contoh: 0081234567"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Nama lengkap sesuai data Dapodik"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kelas</label>
                <select
                  required
                  value={formKelasId}
                  onChange={(e) => setFormKelasId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {kelas.map(k => (
                    <option key={k.kelas_id} value={k.kelas_id}>Kelas {k.nama_kelas}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Ajaran</label>
                <input
                  type="text"
                  required
                  value={formTahunAjaran}
                  onChange={(e) => setFormTahunAjaran(e.target.value)}
                  placeholder="Contoh: 2026/2027"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              {modalMode === 'edit' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Siswa</label>
                  <select
                    value={formStatusAktif}
                    onChange={(e) => setFormStatusAktif(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                  >
                    <option value="AKTIF">AKTIF</option>
                    <option value="NONAKTIF">NONAKTIF (Pindah / Lulus)</option>
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
