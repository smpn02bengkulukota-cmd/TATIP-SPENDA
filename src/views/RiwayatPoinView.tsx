import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  History, 
  Search, 
  Ban, 
  AlertCircle, 
  CheckCircle2, 
  Inbox,
  FileSpreadsheet,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { LaporanPelanggaran } from '../types';
import { exportNeatExcel, SchoolKopData, RincianPelanggaranItem } from '../utils/reportExporter';
import { getEffectivePoin, formatCleanTanggal, formatCleanJam } from '../utils/pointCalculator';

export const RiwayatPoinView: React.FC = () => {
  const { 
    laporan, 
    siswa, 
    kelas, 
    masterPelanggaran, 
    currentUser, 
    refreshData,
    pengaturan
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterStatusData, setFilterStatusData] = useState('ALL');

  // Modal Pembatalan Laporan
  const [cancelModalItem, setCancelModalItem] = useState<LaporanPelanggaran | null>(null);
  const [alasanPembatalan, setAlasanPembatalan] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSyncingPoints, setIsSyncingPoints] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ success: boolean; text: string } | null>(null);

  const canManage = ['ADMIN', 'WAKASEK_KESISWAAN'].includes(currentUser?.peran || '');

  // Filter List
  const filteredList = useMemo(() => {
    return laporan.filter(lap => {
      // Filter Status Data
      if (filterStatusData !== 'ALL' && lap.status_data !== filterStatusData) {
        return false;
      }

      const s = siswa.find(x => x.siswa_id === lap.siswa_id);
      if (filterKelas !== 'ALL' && (!s || s.kelas_id !== filterKelas)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nama = s ? s.nama_lengkap.toLowerCase() : '';
        const nisn = s ? s.nisn.toLowerCase() : '';
        const kode = lap.kode_pelanggaran.toLowerCase();
        const m = masterPelanggaran.find(x => x.kode_pelanggaran === lap.kode_pelanggaran);
        const uraian = m ? m.uraian.toLowerCase() : '';

        if (!nama.includes(q) && !nisn.includes(q) && !kode.includes(q) && !uraian.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [laporan, siswa, masterPelanggaran, filterKelas, filterStatusData, searchQuery]);

  const canCancel = ['ADMIN', 'WAKASEK_KESISWAAN'].includes(currentUser?.peran || '');

  const handleOpenCancelModal = (lap: LaporanPelanggaran) => {
    setCancelModalItem(lap);
    setAlasanPembatalan('');
    setActionFeedback(null);
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalItem || !currentUser || !alasanPembatalan.trim()) return;

    setIsCancelling(true);
    setActionFeedback(null);

    const res = await api.batalkanLaporan(
      cancelModalItem.laporan_id,
      alasanPembatalan.trim(),
      currentUser.user_id
    );

    setIsCancelling(false);

    if (res.success) {
      setActionFeedback({ 
        success: true, 
        text: 'Laporan berhasil dibatalkan dan kalkulasi urutan serta poin kejadian berikutnya telah direkalkulasi secara konsisten.' 
      });
      await refreshData();
      setTimeout(() => {
        setCancelModalItem(null);
      }, 1500);
    } else {
      setActionFeedback({ success: false, text: res.error || 'Gagal membatalkan laporan.' });
    }
  };

  const handleSyncAllPoints = async () => {
    if (!currentUser) return;
    setIsSyncingPoints(true);
    setActionFeedback(null);

    const res = await api.rekalkulasiSemuaPoin(currentUser.user_id);
    setIsSyncingPoints(false);

    if (res.success) {
      setActionFeedback({
        success: true,
        text: res.data?.message || 'Sinkronisasi poin seluruh siswa berhasil disimpan ke Google Spreadsheet!'
      });
      await refreshData();
    } else {
      setActionFeedback({
        success: false,
        text: res.error || 'Gagal menyinkronkan ke Spreadsheet. Pastikan skrip Google Apps Script terbaru telah diperbarui.'
      });
    }
  };

  // Deteksi laporan yang tersimpan 0 poin dari skema lama
  const zeroPointReports = useMemo(() => {
    return laporan.filter(l => l.status_data === 'VALID' && Number(l.poin_diberikan) === 0 && Number(l.bobot_snapshot) > 0);
  }, [laporan]);

  const zeroPointCount = zeroPointReports.length;
  const zeroPointSum = zeroPointReports.reduce((acc, curr) => acc + (Number(curr.bobot_snapshot) || 0), 0);

  const handleExportExcel = () => {
    if (filteredList.length === 0) {
      alert('Tidak ada data laporan yang sesuai filter.');
      return;
    }

    const schoolKop: SchoolKopData = {
      namaSekolah: pengaturan['NAMA_SEKOLAH'] || 'SMP Negeri 2 Kota Bengkulu',
      instansiInduk: pengaturan['NAMA_INSTANSI_INDUK'] || 'PEMERINTAH KOTA BENGKULU\nDINAS PENDIDIKAN DAN KEBUDAYAAN',
      alamatSekolah: pengaturan['ALAMAT_SEKOLAH'] || 'Jl. Prof. Dr. Hazairin No. 2, Penurunan, Kec. Ratu Samban, Kota Bengkulu',
      telpSekolah: pengaturan['TELP_SEKOLAH'] || '(0736) 21123',
      emailSekolah: pengaturan['EMAIL_SEKOLAH'] || 'smpn02bengkulukota@gmail.com',
      websiteSekolah: pengaturan['WEBSITE_SEKOLAH'] || 'https://smpn2kotabengkulu.sch.id',
      logoSekolah: pengaturan['LOGO_SEKOLAH'] || '',
      namaKepalaSekolah: pengaturan['NAMA_KEPALA_SEKOLAH'] || 'Malis Hartanto, M.Pd.',
      nipKepalaSekolah: pengaturan['NIP_KEPALA_SEKOLAH'] || '19700512 199503 1 003',
      kotaPengesahan: pengaturan['KOTA_PENGESAHAN'] || 'Kota Bengkulu',
      jabatanPenanggungJawab2: pengaturan['JABATAN_PENANGGUNG_JAWAB_2'] || 'Wakil Kepala Sekolah Bid. Kesiswaan',
      namaPenanggungJawab2: pengaturan['NAMA_PENANGGUNG_JAWAB_2'] || 'Drs. H. Syahril, M.Pd.',
      nipPenanggungJawab2: pengaturan['NIP_PENANGGUNG_JAWAB_2'] || '19720815 199802 1 002',
    };

    const rincian: RincianPelanggaranItem[] = filteredList.map(l => {
      const s = siswa.find(x => x.siswa_id === l.siswa_id);
      const k = s ? kelas.find(x => x.kelas_id === s.kelas_id) : null;
      const m = masterPelanggaran.find(x => x.kode_pelanggaran === l.kode_pelanggaran);
      const effectivePoin = getEffectivePoin(l, pengaturan['SKEMA_POIN_PELANGGARAN']);

      return {
        laporan_id: l.laporan_id,
        tanggal_kejadian: formatCleanTanggal(l.tanggal_kejadian),
        jam_kejadian: formatCleanJam(l.jam_kejadian) || '-',
        nisn: s ? s.nisn : '-',
        nama_siswa: s ? s.nama_lengkap : 'Siswa',
        nama_kelas: k ? `Kelas ${k.nama_kelas}` : '-',
        kode_pelanggaran: l.kode_pelanggaran,
        uraian_pelanggaran: m ? m.uraian : '-',
        bobot_snapshot: Number(l.bobot_snapshot) || 0,
        urutan_ke: Number(l.urutan_ke) || 1,
        status_hasil: effectivePoin > 0 ? 'BERPOIN' : l.status_hasil,
        poin_diberikan: effectivePoin,
        user_id_pencatat: l.user_id_pencatat,
        status_data: l.status_data,
        catatan: l.catatan
      };
    });

    const totalValid = filteredList.filter(x => x.status_data === 'VALID').length;
    const totalPoin = filteredList.reduce((acc, curr) => acc + getEffectivePoin(curr, pengaturan['SKEMA_POIN_PELANGGARAN']), 0);
    const totalBerpoin = filteredList.filter(x => getEffectivePoin(x, pengaturan['SKEMA_POIN_PELANGGARAN']) > 0).length;
    const totalPembinaan = filteredList.filter(x => x.status_data === 'VALID' && getEffectivePoin(x, pengaturan['SKEMA_POIN_PELANGGARAN']) === 0).length;

    exportNeatExcel({
      title: 'LAPORAN HISTORI PELANGGARAN TATA TERTIB SISWA',
      periodeLabel: 'Filter Tersaring',
      kelasLabel: filterKelas === 'ALL' ? 'Semua Kelas' : `Kelas ${kelas.find(k => k.kelas_id === filterKelas)?.nama_kelas || filterKelas}`,
      kop: schoolKop,
      summary: { totalValid, totalPembinaan, totalBerpoin, totalPoin },
      rekapKelas: [],
      rincianLaporan: rincian
    }, `Histori_Pelanggaran_SMPN2_${Date.now()}.xls`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Riwayat Poin & Laporan Pelanggaran
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Histori seluruh kejadian tercatat dengan akumulasi poin siswa dan audit rekalkulasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={handleSyncAllPoints}
              disabled={isSyncingPoints}
              className="px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 disabled:opacity-50"
              title="Perbarui poin seluruh siswa di Google Spreadsheet agar sesuai bobot pelanggaran"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingPoints ? 'animate-spin' : ''}`} />
              {isSyncingPoints ? 'Menyinkronkan...' : 'Sinkronkan Poin'}
            </button>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            Ekspor Excel Rapi (.xls)
          </button>
        </div>
      </div>

      {/* Banner Penyesuaian Poin Lama */}
      {zeroPointCount > 0 && (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Penyesuaian Sistem Poin Aktif:</span>
              <p className="text-amber-800 mt-0.5">
                Ditemukan <strong>{zeroPointCount} laporan</strong> yang sebelumnya tersimpan 0 poin dari skema pembinaan lama.
                Sistem web telah otomatis mengaktifkan poin penuh (<strong>+{zeroPointSum} Poin</strong>) untuk siswa. Klik tombol sinkronisasi untuk menyimpan pembaruan poin ke Google Spreadsheet.
              </p>
            </div>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={handleSyncAllPoints}
              disabled={isSyncingPoints}
              className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-lg shrink-0 flex items-center gap-1.5 transition-colors text-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPoints ? 'animate-spin' : ''}`} />
              {isSyncingPoints ? 'Menyinkronkan...' : 'Sinkronkan ke Spreadsheet'}
            </button>
          )}
        </div>
      )}

      {/* Action Feedback */}
      {actionFeedback && (
        <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${actionFeedback.success ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'}`}>
          {actionFeedback.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{actionFeedback.text}</div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari siswa, NISN, atau kode..."
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
            value={filterStatusData}
            onChange={(e) => setFilterStatusData(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
          >
            <option value="ALL">Semua Status Data</option>
            <option value="VALID">VALID (Aktif)</option>
            <option value="DIBATALKAN">DIBATALKAN</option>
          </select>
        </div>
      </div>

      {/* Tabel Riwayat */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Tidak ada riwayat laporan yang cocok pada Google Spreadsheet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Waktu Kejadian</th>
                  <th className="py-3 px-4">Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Pelanggaran</th>
                  <th className="py-3 px-4 text-center">Urutan</th>
                  <th className="py-3 px-4">Klasifikasi</th>
                  <th className="py-3 px-4 text-right">Poin</th>
                  <th className="py-3 px-4 text-center">Status Data</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((lap) => {
                  const s = siswa.find(x => x.siswa_id === lap.siswa_id);
                  const k = s ? kelas.find(x => x.kelas_id === s.kelas_id) : null;
                  const m = masterPelanggaran.find(x => x.kode_pelanggaran === lap.kode_pelanggaran);
                  const isValid = lap.status_data === 'VALID';
                  const effectivePoin = getEffectivePoin(lap, pengaturan['SKEMA_POIN_PELANGGARAN']);
                  const cleanTanggal = formatCleanTanggal(lap.tanggal_kejadian);
                  const cleanJam = formatCleanJam(lap.jam_kejadian);

                  return (
                    <tr key={lap.laporan_id} className={`hover:bg-slate-50/80 ${!isValid ? 'opacity-60 bg-slate-50/40' : ''}`}>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{cleanTanggal}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{cleanJam} WIB</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{s?.nama_lengkap || lap.siswa_id}</div>
                        <div className="text-[10px] text-slate-400">NISN: {s?.nisn || '-'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {k?.nama_kelas || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          [{lap.kode_pelanggaran}] {m?.uraian || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400">Snapshot: {lap.bobot_snapshot} Poin</div>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        Ke-{lap.urutan_ke}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${effectivePoin > 0 ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-blue-100 text-blue-900 border border-blue-200'}`}>
                          {effectivePoin > 0 ? 'BERPOIN' : lap.status_hasil}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-extrabold text-sm ${effectivePoin > 0 ? 'text-red-700' : 'text-slate-600'}`}>
                          +{effectivePoin}
                        </span>
                        {Number(lap.poin_diberikan) === 0 && effectivePoin > 0 && (
                          <span className="block text-[9px] text-emerald-700 font-medium">aktif</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block text-[10px] font-bold ${isValid ? 'text-emerald-700' : 'text-red-700'}`}>
                          {lap.status_data}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isValid && canCancel && (
                          <button
                            type="button"
                            onClick={() => handleOpenCancelModal(lap)}
                            className="px-2.5 py-1 text-red-700 hover:bg-red-50 border border-red-200 rounded-md text-[11px] font-semibold transition-colors"
                          >
                            Batalkan
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Pembatalan Laporan */}
      {cancelModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2 text-red-700 font-bold text-sm border-b border-slate-100 pb-3">
              <Ban className="w-5 h-5 text-red-600" />
              <span>Konfirmasi Pembatalan Laporan</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan membatalkan laporan ID <code className="font-mono font-bold text-slate-900">{cancelModalItem.laporan_id}</code>. 
              Sistem akan otomatis menghitung ulang (rekalkulasi) nomor urutan dan poin kejadian berikutnya untuk siswa dan kode pelanggaran yang sama.
            </p>

            {actionFeedback && (
              <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${actionFeedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {actionFeedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                <span>{actionFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleConfirmCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Pembatalan Laporan (Wajib):
                </label>
                <textarea
                  rows={3}
                  required
                  value={alasanPembatalan}
                  onChange={(e) => setAlasanPembatalan(e.target.value)}
                  placeholder="Jelaskan alasan resmi pembatalan laporan (misal: klarifikasi saksi, salah input nama siswa, dsb)..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={isCancelling || !alasanPembatalan.trim()}
                  className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isCancelling ? 'Memproses Rekalkulasi...' : 'Ya, Batalkan Laporan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
