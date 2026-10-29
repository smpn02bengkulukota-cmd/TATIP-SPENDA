import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  HeartHandshake, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar,
  Save,
  Inbox
} from 'lucide-react';
import { StatusTindakLanjut, TindakLanjut } from '../types';

export const PembinaanWaliKelasView: React.FC = () => {
  const { 
    laporan, 
    siswa, 
    kelas, 
    masterPelanggaran, 
    tindakLanjut, 
    currentUser, 
    assignedKelasIds,
    refreshData 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('ALL');

  // Modal Update State
  const [editingItem, setEditingItem] = useState<{
    tindakLanjut: TindakLanjut;
    laporanId: string;
    namaSiswa: string;
    namaKelas: string;
    uraianPelanggaran: string;
    statusHasil: string;
  } | null>(null);

  const [formStatus, setFormStatus] = useState<StatusTindakLanjut>('DALAM_PROSES');
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [formCatatan, setFormCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ success: boolean; text: string } | null>(null);

  const isWaliKelas = currentUser?.peran === 'WALI_KELAS';

  // Gabungkan Data Laporan & Tindak Lanjut
  const combinedList = useMemo(() => {
    return tindakLanjut.map(tl => {
      const lap = laporan.find(l => l.laporan_id === tl.laporan_id);
      const s = lap ? siswa.find(x => x.siswa_id === lap.siswa_id) : null;
      const k = s ? kelas.find(x => x.kelas_id === s.kelas_id) : null;
      const m = lap ? masterPelanggaran.find(x => x.kode_pelanggaran === lap.kode_pelanggaran) : null;

      return {
        tindakLanjut: tl,
        laporan: lap,
        siswa: s,
        kelas: k,
        master: m
      };
    });
  }, [tindakLanjut, laporan, siswa, kelas, masterPelanggaran]);

  // Filter List Sesuai Hak Akses & Search
  const filteredList = useMemo(() => {
    return combinedList.filter(item => {
      if (!item.laporan || item.laporan.status_data !== 'VALID') return false;

      // Otorisasi: Wali kelas hanya boleh melihat kelas tanggung jawabnya
      if (isWaliKelas) {
        if (!item.siswa || !assignedKelasIds.includes(item.siswa.kelas_id)) {
          return false;
        }
      } else if (selectedKelasId !== 'ALL') {
        if (!item.siswa || item.siswa.kelas_id !== selectedKelasId) {
          return false;
        }
      }

      // Filter status tindak lanjut
      if (filterStatus !== 'ALL' && item.tindakLanjut.status !== filterStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nama = item.siswa ? String(item.siswa.nama_lengkap || '').toLowerCase() : '';
        const nisn = item.siswa ? String(item.siswa.nisn || '').toLowerCase() : '';
        const pelanggaran = item.master ? String(item.master.uraian || '').toLowerCase() : '';
        if (!nama.includes(q) && !nisn.includes(q) && !pelanggaran.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [combinedList, isWaliKelas, assignedKelasIds, selectedKelasId, filterStatus, searchQuery]);

  const handleOpenEdit = (item: any) => {
    setEditingItem({
      tindakLanjut: item.tindakLanjut,
      laporanId: item.tindakLanjut.laporan_id,
      namaSiswa: item.siswa ? item.siswa.nama_lengkap : '-',
      namaKelas: item.kelas ? item.kelas.nama_kelas : '-',
      uraianPelanggaran: item.master ? item.master.uraian : item.laporan.kode_pelanggaran,
      statusHasil: item.laporan.status_hasil
    });
    setFormStatus(item.tindakLanjut.status);
    setFormTanggal(item.tindakLanjut.tanggal_tindak_lanjut || new Date().toISOString().split('T')[0]);
    setFormCatatan(item.tindakLanjut.catatan || '');
    setFeedbackMessage(null);
  };

  const handleSaveTindakLanjut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !currentUser) return;

    setIsSubmitting(true);
    setFeedbackMessage(null);

    const res = await api.updateTindakLanjut({
      tindak_lanjut_id: editingItem.tindakLanjut.tindak_lanjut_id,
      status: formStatus,
      tanggal_tindak_lanjut: formTanggal,
      catatan: formCatatan.trim(),
      user_id: currentUser.user_id,
    });

    setIsSubmitting(false);

    if (res.success) {
      setFeedbackMessage({ success: true, text: 'Tindak lanjut pembinaan berhasil disimpan ke Google Spreadsheet!' });
      await refreshData();
      setTimeout(() => {
        setEditingItem(null);
      }, 1200);
    } else {
      setFeedbackMessage({ success: false, text: res.error || 'Gagal menyimpan pembaruan ke Google Spreadsheet.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Pembinaan Siswa oleh Wali Kelas
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Pencatatan dan pembaruan hasil pembinaan langsung ke database Google Spreadsheet.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari siswa atau pelanggaran..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {!isWaliKelas && (
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
            >
              <option value="ALL">Semua Kelas</option>
              {kelas.map(k => (
                <option key={k.kelas_id} value={k.kelas_id}>Kelas {k.nama_kelas}</option>
              ))}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
          >
            <option value="ALL">Semua Status Tindak Lanjut</option>
            <option value="BELUM">Belum Ditindaklanjuti</option>
            <option value="DALAM_PROSES">Dalam Proses</option>
            <option value="SELESAI">Selesai</option>
          </select>
        </div>
      </div>

      {/* Tabel Tindak Lanjut */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Tidak ada catatan pembinaan yang ditemukan pada Google Spreadsheet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Tanggal Kejadian</th>
                  <th className="py-3 px-4">Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Pelanggaran</th>
                  <th className="py-3 px-4">Klasifikasi</th>
                  <th className="py-3 px-4">Status Pembinaan</th>
                  <th className="py-3 px-4">Catatan Wali Kelas</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item) => {
                  const statusTL = item.tindakLanjut.status;
                  return (
                    <tr key={item.tindakLanjut.tindak_lanjut_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {item.laporan ? `${item.laporan.tanggal_kejadian} ${item.laporan.jam_kejadian}` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.siswa?.nama_lengkap || '-'}</div>
                        <div className="text-[10px] text-slate-400">NISN: {item.siswa?.nisn || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {item.kelas?.nama_kelas || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          [{item.laporan?.kode_pelanggaran}] {item.master?.uraian || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block text-[11px] font-semibold ${item.laporan?.status_hasil === 'BERPOIN' ? 'text-purple-900' : 'text-blue-900'}`}>
                          {item.laporan?.status_hasil}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block text-[11px] font-bold ${
                          statusTL === 'SELESAI' 
                            ? 'text-emerald-700' 
                            : statusTL === 'DALAM_PROSES' 
                            ? 'text-blue-700' 
                            : 'text-amber-700'
                        }`}>
                          {statusTL === 'SELESAI' ? 'Selesai' : statusTL === 'DALAM_PROSES' ? 'Dalam Proses' : 'Belum'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {item.tindakLanjut.catatan || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Tindak Lanjut
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

      {/* Modal Form Update Tindak Lanjut */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <HeartHandshake className="w-5 h-5 text-blue-900" />
                <span>Form Pembinaan Siswa</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold"
              >
                Tutup
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div><strong>Nama Siswa:</strong> {editingItem.namaSiswa} ({editingItem.namaKelas})</div>
              <div><strong>Pelanggaran:</strong> {editingItem.uraianPelanggaran}</div>
              <div><strong>Klasifikasi:</strong> {editingItem.statusHasil}</div>
            </div>

            {feedbackMessage && (
              <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${feedbackMessage.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {feedbackMessage.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                <span>{feedbackMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveTindakLanjut} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Pembinaan</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as StatusTindakLanjut)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                  required
                >
                  <option value="BELUM">BELUM (Menunggu Pembinaan)</option>
                  <option value="DALAM_PROSES">DALAM_PROSES (Sedang Dibina)</option>
                  <option value="SELESAI">SELESAI (Pembinaan Tuntas)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Tindak Lanjut</label>
                <input
                  type="date"
                  required
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Pembinaan oleh Wali Kelas</label>
                <textarea
                  rows={3}
                  required
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  placeholder="Deskripsikan bimbingan yang telah diberikan kepada siswa..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
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
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Pembinaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
