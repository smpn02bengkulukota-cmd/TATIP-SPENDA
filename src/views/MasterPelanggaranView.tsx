import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  FileCode2, 
  Plus, 
  Edit, 
  CheckCircle2, 
  AlertCircle, 
  Inbox,
  Save,
  Search
} from 'lucide-react';
import { MasterPelanggaran } from '../types';

export const MasterPelanggaranView: React.FC = () => {
  const { 
    masterPelanggaran, 
    currentUser, 
    refreshData 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [activeItem, setActiveItem] = useState<MasterPelanggaran | null>(null);

  // Form State
  const [formKode, setFormKode] = useState('');
  const [formUraian, setFormUraian] = useState('');
  const [formBobot, setFormBobot] = useState<number>(10);
  const [formKategori, setFormKategori] = useState('Kedisiplinan & Kerapian');
  const [formCatatan, setFormCatatan] = useState('');
  const [formTanggalMulai, setFormTanggalMulai] = useState(new Date().toISOString().split('T')[0]);
  const [formStatusAktif, setFormStatusAktif] = useState<'AKTIF' | 'NONAKTIF'>('AKTIF');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);

  const canManage = ['ADMIN', 'WAKASEK_KESISWAAN'].includes(currentUser?.peran || '');

  // Kategori Unik
  const kategoriList = useMemo(() => {
    const setK = new Set<string>();
    masterPelanggaran.forEach(m => {
      if (m.kategori) setK.add(m.kategori);
    });
    return Array.from(setK);
  }, [masterPelanggaran]);

  // Filter List
  const filteredList = useMemo(() => {
    return masterPelanggaran.filter(m => {
      if (filterKategori !== 'ALL' && m.kategori !== filterKategori) return false;
      if (filterStatus !== 'ALL' && m.status_aktif !== filterStatus) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!m.kode_pelanggaran.toLowerCase().includes(q) && !m.uraian.toLowerCase().includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [masterPelanggaran, filterKategori, filterStatus, searchQuery]);

  const handleOpenCreate = () => {
    setModalMode('create');
    setActiveItem(null);
    setFormKode('');
    setFormUraian('');
    setFormBobot(10);
    setFormKategori(kategoriList[0] || 'Kedisiplinan & Kerapian');
    setFormCatatan('');
    setFormTanggalMulai(new Date().toISOString().split('T')[0]);
    setFormStatusAktif('AKTIF');
    setFeedback(null);
  };

  const handleOpenEdit = (m: MasterPelanggaran) => {
    setModalMode('edit');
    setActiveItem(m);
    setFormKode(m.kode_pelanggaran);
    setFormUraian(m.uraian);
    setFormBobot(Number(m.bobot_poin) || 0);
    setFormKategori(m.kategori);
    setFormCatatan(m.catatan_aturan || '');
    setFormTanggalMulai(m.tanggal_mulai_berlaku || new Date().toISOString().split('T')[0]);
    setFormStatusAktif(m.status_aktif);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !formKode.trim() || !formUraian.trim()) return;

    if (formBobot < 1 || formBobot > 100) {
      setFeedback({ success: false, text: 'Bobot poin harus bernilai antara 1 sampai 100.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    let res;
    if (modalMode === 'create') {
      res = await api.crudMasterPelanggaran({
        sub_action: 'create',
        kode_pelanggaran: formKode.trim().toUpperCase(),
        uraian: formUraian.trim(),
        bobot_poin: formBobot,
        kategori: formKategori.trim(),
        catatan_aturan: formCatatan.trim(),
        tanggal_mulai_berlaku: formTanggalMulai,
        user_id: currentUser.user_id,
      });
    } else if (modalMode === 'edit' && activeItem) {
      res = await api.crudMasterPelanggaran({
        sub_action: 'update',
        kode_pelanggaran: activeItem.kode_pelanggaran,
        uraian: formUraian.trim(),
        bobot_poin: formBobot,
        kategori: formKategori.trim(),
        status_aktif: formStatusAktif,
        catatan_aturan: formCatatan.trim(),
        tanggal_mulai_berlaku: formTanggalMulai,
        user_id: currentUser.user_id,
      });
    }

    setIsSubmitting(false);

    if (res?.success) {
      setFeedback({ success: true, text: 'Master pelanggaran berhasil disimpan ke Google Spreadsheet!' });
      await refreshData();
      setTimeout(() => {
        setModalMode(null);
      }, 1000);
    } else {
      setFeedback({ success: false, text: res?.error || 'Gagal menyimpan master pelanggaran.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Master Kode Pelanggaran
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Daftar aturan dan pembobotan poin (1–29 pembinaan 3x, 30–100 langsung berpoin).
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Kode Pelanggaran
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
            placeholder="Cari kode atau uraian pelanggaran..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
          >
            <option value="ALL">Semua Kategori</option>
            {kategoriList.map(k => (
              <option key={k} value={k}>{k}</option>
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

      {/* Tabel Master Pelanggaran */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Tidak ada kode pelanggaran pada tab MasterPelanggaran Google Spreadsheet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Uraian Pelanggaran</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-center">Bobot</th>
                  <th className="py-3 px-4">Aturan Perhitungan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {canManage && <th className="py-3 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((m) => {
                  const bobot = Number(m.bobot_poin) || 0;
                  const isRingan = bobot >= 1 && bobot <= 29;
                  const isAktif = m.status_aktif === 'AKTIF';

                  return (
                    <tr key={m.kode_pelanggaran} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {m.kode_pelanggaran}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{m.uraian}</div>
                        {m.catatan_aturan && (
                          <div className="text-[11px] text-slate-400">{m.catatan_aturan}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {m.kategori}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold text-sm ${bobot >= 30 ? 'text-red-700' : 'text-slate-800'}`}>
                          {bobot} Poin
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {isRingan ? (
                          <span className="text-[11px] text-blue-900 font-medium">
                            Pembinaan 1–3 (0 Poin), Ke-4+ Berpoin
                          </span>
                        ) : (
                          <span className="text-[11px] text-red-900 font-medium">
                            Langsung Berpoin Sesuai Bobot
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block text-[10px] font-bold ${isAktif ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {m.status_aktif}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Edit Master"
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

      {/* Modal Tambah/Edit Master */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="font-bold text-sm text-slate-900">
                {modalMode === 'create' ? 'Tambah Kode Master Pelanggaran' : 'Edit Master Pelanggaran'}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Pelanggaran</label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    value={formKode}
                    onChange={(e) => setFormKode(e.target.value.toUpperCase())}
                    placeholder="Contoh: TATIB-01"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono disabled:bg-slate-100 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bobot Poin (1 - 100)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={formBobot}
                    onChange={(e) => setFormBobot(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Pelanggaran</label>
                <input
                  type="text"
                  required
                  value={formKategori}
                  onChange={(e) => setFormKategori(e.target.value)}
                  placeholder="Contoh: Kedisiplinan & Kerapian / Kehadiran / Sikap"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Uraian Pelanggaran</label>
                <textarea
                  rows={2}
                  required
                  value={formUraian}
                  onChange={(e) => setFormUraian(e.target.value)}
                  placeholder="Deskripsi bentuk pelanggaran..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Aturan / Dasar Hukum</label>
                <input
                  type="text"
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  placeholder="Contoh: Buku Tata Tertib Siswa Pasal 4 Ayat 2"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              {modalMode === 'edit' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Aturan</label>
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
