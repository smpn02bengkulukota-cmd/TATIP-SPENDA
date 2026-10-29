import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  AlertTriangle, 
  Search, 
  UserCheck, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Send,
  MessageSquare
} from 'lucide-react';
import { Siswa, MasterPelanggaran } from '../types';
import { getEffectivePoin } from '../utils/pointCalculator';

export const InputPelanggaranView: React.FC = () => {
  const { 
    siswa, 
    kelas, 
    laporan,
    masterPelanggaran, 
    currentUser, 
    refreshData,
    pengaturan 
  } = useApp();

  // Search & Selection State
  const [searchSiswaQuery, setSearchSiswaQuery] = useState('');
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [selectedKodePelanggaran, setSelectedKodePelanggaran] = useState('');
  
  // Date & Time Defaults
  const todayStr = new Date().toISOString().split('T')[0];
  const nowTimeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);
  const [tanggalKejadian, setTanggalKejadian] = useState(todayStr);
  const [jamKejadian, setJamKejadian] = useState(nowTimeStr);
  const [catatan, setCatatan] = useState('');

  // Status & Lock
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<any>(null);

  // Filter Siswa Aktif yang Cocok dengan Pencarian
  const filteredSiswa = useMemo(() => {
    if (!searchSiswaQuery.trim()) return [];
    const q = searchSiswaQuery.toLowerCase().trim();
    return siswa
      .filter(s => s.status_aktif === 'AKTIF' && (
        String(s.nama_lengkap || '').toLowerCase().includes(q) || 
        String(s.nisn || '').toLowerCase().includes(q)
      ))
      .slice(0, 8);
  }, [siswa, searchSiswaQuery]);

  // Master Pelanggaran Aktif
  const activeMasterPelanggaran = useMemo(() => {
    return masterPelanggaran.filter(m => m.status_aktif === 'AKTIF');
  }, [masterPelanggaran]);

  // Terpilih Master Pelanggaran Detail
  const selectedMaster = useMemo(() => {
    return activeMasterPelanggaran.find(m => m.kode_pelanggaran === selectedKodePelanggaran) || null;
  }, [activeMasterPelanggaran, selectedKodePelanggaran]);

  // Kelas Siswa Terpilih
  const kelasSiswa = useMemo(() => {
    if (!selectedSiswa) return null;
    return kelas.find(k => k.kelas_id === selectedSiswa.kelas_id) || null;
  }, [selectedSiswa, kelas]);

  // Riwayat Poin Siswa Terpilih Saat Ini
  const riwayatSiswa = useMemo(() => {
    if (!selectedSiswa) return { totalPoin: 0, totalKejadian: 0 };
    const valid = laporan.filter(l => l.siswa_id === selectedSiswa.siswa_id && l.status_data === 'VALID');
    const total = valid.reduce((acc, curr) => acc + getEffectivePoin(curr, pengaturan['SKEMA_POIN_PELANGGARAN']), 0);
    return { totalPoin: total, totalKejadian: valid.length };
  }, [selectedSiswa, laporan, pengaturan]);

  // Muat Preview Perhitungan dari Backend ketika Siswa dan Kode Pelanggaran Terpilih
  useEffect(() => {
    let isCancelled = false;

    async function loadPreview() {
      if (!selectedSiswa || !selectedKodePelanggaran || !tanggalKejadian || !jamKejadian) {
        setPreviewData(null);
        return;
      }

      setIsLoadingPreview(true);
      const res = await api.previewPelanggaran(
        selectedSiswa.siswa_id,
        selectedKodePelanggaran,
        tanggalKejadian,
        jamKejadian
      );
      if (!isCancelled) {
        setIsLoadingPreview(false);
        if (res.success && res.data) {
          setPreviewData(res.data);
          setErrorMessage(null);
        } else {
          setPreviewData(null);
          setErrorMessage(res.error || 'Gagal memuat kalkulasi urutan pelanggaran.');
        }
      }
    }

    loadPreview();

    return () => {
      isCancelled = true;
    };
  }, [selectedSiswa, selectedKodePelanggaran, tanggalKejadian, jamKejadian]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswa || !selectedKodePelanggaran || !currentUser) {
      setErrorMessage('Harap lengkapi pemilihan siswa dan kode pelanggaran.');
      return;
    }

    if (isSubmitting) return; // Prevent double-submit

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessReport(null);

    const res = await api.simpanLaporan({
      siswa_id: selectedSiswa.siswa_id,
      kode_pelanggaran: selectedKodePelanggaran,
      tanggal_kejadian: tanggalKejadian,
      jam_kejadian: jamKejadian,
      user_id_pencatat: currentUser.user_id,
      catatan: catatan.trim(),
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      setSuccessReport(res.data);
      // Reset form
      setSelectedSiswa(null);
      setSearchSiswaQuery('');
      setSelectedKodePelanggaran('');
      setCatatan('');
      setPreviewData(null);
      // Refresh context data
      await refreshData();
    } else {
      setErrorMessage(res.error || 'Penyimpanan laporan ke Google Spreadsheet gagal.');
    }
  };

  const periodeAktif = pengaturan['PERIODE_PERHITUNGAN_PEMBINAAN'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Form */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Form Input Pelanggaran Tata Tertib
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Pencatatan pelanggaran siswa SMP Negeri 2 Kota Bengkulu dengan validasi nyata Google Spreadsheet.
        </p>
      </div>

      {/* Peringatan Periode Belum Dikonfigurasi */}
      {!periodeAktif && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Periode Perhitungan Pembinaan Belum Ditetapkan!</div>
            <p className="mt-0.5">
              Sesuai aturan sistem, pencatatan pelanggaran memerlukan pengaturan periode perhitungan pembinaan yang valid. Silakan hubungi Administrator untuk menetapkannya di menu Pengaturan.
            </p>
          </div>
        </div>
      )}

      {/* Pesan Berhasil Disimpan */}
      {successReport && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Laporan Berhasil Disimpan ke Google Spreadsheet!
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 bg-white p-4 rounded-lg border border-emerald-100">
            <div>
              <span className="text-slate-400 block">ID Laporan:</span>
              <span className="font-mono font-bold text-slate-900">{successReport.laporan_id}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Klasifikasi / Urutan:</span>
              <span className="font-semibold text-blue-900">
                {successReport.status_hasil === 'BERPOIN' 
                  ? `Berpoin (+${successReport.poin_diberikan} Poin)` 
                  : `Pembinaan ke-${successReport.urutan_ke} (0 Poin)`}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Waktu Kejadian:</span>
              <span className="text-slate-800">{successReport.tanggal_kejadian} pukul {successReport.jam_kejadian} WIB</span>
            </div>
            <div>
              <span className="text-slate-400 block">Status Data:</span>
              <span className="font-bold text-emerald-700">VALID (Tersimpan)</span>
            </div>
          </div>

          {/* Tombol Kirim WhatsApp ke Wali Kelas */}
          {Boolean(successReport.nomor_wa_wali) && (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-slate-600">
                Nomor WA Wali Kelas: <strong className="font-mono text-slate-900">{String(successReport.nomor_wa_wali)}</strong>
              </span>
              <a
                href={`https://wa.me/${String(successReport.nomor_wa_wali).replace(/\D/g, '')}?text=${encodeURIComponent(successReport.isi_pesan_wa || '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Buka WhatsApp & Kirim Pesan
              </a>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Gagal Menyimpan:</span>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Form Input */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-6">
        
        {/* 1. Pencarian & Pemilihan Siswa Nyata */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            1. Identitas Siswa Pelanggar (Wajib)
          </label>

          {!selectedSiswa ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchSiswaQuery}
                  onChange={(e) => setSearchSiswaQuery(e.target.value)}
                  placeholder="Ketik nama lengkap atau NISN siswa dari Spreadsheet..."
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>

              {searchSiswaQuery.trim() && (
                <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
                  {filteredSiswa.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      Tidak ada siswa aktif dengan nama atau NISN &quot;{searchSiswaQuery}&quot; di Google Spreadsheet.
                    </div>
                  ) : (
                    filteredSiswa.map((s) => {
                      const k = kelas.find(x => x.kelas_id === s.kelas_id);
                      return (
                        <button
                          key={s.siswa_id}
                          type="button"
                          onClick={() => setSelectedSiswa(s)}
                          className="w-full p-2.5 text-left hover:bg-blue-50/80 flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{s.nama_lengkap}</span>
                            <span className="text-slate-500 ml-2">NISN: {s.nisn}</span>
                          </div>
                          <span className="text-slate-600 font-medium">
                            Kelas {k ? k.nama_kelas : s.kelas_id}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserCheck className="w-6 h-6 text-blue-700" />
                <div>
                  <div className="text-xs font-bold text-slate-900">{selectedSiswa.nama_lengkap}</div>
                  <div className="text-[11px] text-slate-600">
                    NISN: <span className="font-mono font-semibold">{selectedSiswa.nisn}</span> · 
                    Kelas: <span className="font-semibold">{kelasSiswa ? kelasSiswa.nama_kelas : selectedSiswa.kelas_id}</span> · 
                    Total Poin: <span className={`font-bold ${riwayatSiswa.totalPoin > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{riwayatSiswa.totalPoin} Poin</span> ({riwayatSiswa.totalKejadian} catatan)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSiswa(null)}
                className="text-xs text-blue-900 font-semibold hover:underline"
              >
                Ganti Siswa
              </button>
            </div>
          )}
        </div>

        {/* 2. Pemilihan Kode Pelanggaran */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            2. Kode & Uraian Pelanggaran (Wajib)
          </label>

          <select
            value={selectedKodePelanggaran}
            onChange={(e) => setSelectedKodePelanggaran(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-600"
            required
          >
            <option value="">-- Pilih Kode Pelanggaran dari Master --</option>
            {activeMasterPelanggaran.map((m) => (
              <option key={m.kode_pelanggaran} value={m.kode_pelanggaran}>
                [{m.kode_pelanggaran}] {m.uraian} (Bobot: {m.bobot_poin} poin · {m.kategori})
              </option>
            ))}
          </select>

          {selectedMaster && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1">
              <div><strong>Kategori</strong>: {selectedMaster.kategori}</div>
              <div><strong>Bobot Master</strong>: {selectedMaster.bobot_poin} Poin</div>
              {selectedMaster.catatan_aturan && (
                <div><strong>Catatan Aturan</strong>: {selectedMaster.catatan_aturan}</div>
              )}
            </div>
          )}
        </div>

        {/* 3. Waktu Kejadian & Petugas Pencatat */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal Kejadian
            </label>
            <input
              type="date"
              required
              value={tanggalKejadian}
              onChange={(e) => setTanggalKejadian(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Jam Kejadian (WIB)
            </label>
            <input
              type="time"
              required
              value={jamKejadian}
              onChange={(e) => setJamKejadian(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Petugas Pencatat (Akun Login)
            </label>
            <input
              type="text"
              readOnly
              value={currentUser ? `${currentUser.nama} (${currentUser.peran})` : '-'}
              className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-xs text-slate-600 cursor-not-allowed font-medium"
            />
          </div>
        </div>

        {/* 4. Catatan Tambahan */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" /> Catatan Kronologi / Keterangan Tambahan (Opsional)
          </label>
          <textarea
            rows={2}
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Tuliskan keterangan detail kejadian, tempat, atau saksi jika ada..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* 5. Live Calculation Preview */}
        {selectedSiswa && selectedMaster && (() => {
          const isProgressive = pengaturan['SKEMA_POIN_PELANGGARAN'] === 'PEMBINAAN_BERTAHAP_1_3';
          const poinDiberikan = previewData 
            ? (!isProgressive && previewData.poin_diberikan === 0 ? selectedMaster.bobot_poin : previewData.poin_diberikan)
            : selectedMaster.bobot_poin;
          const statusHasil = isProgressive && previewData ? previewData.status_hasil : 'BERPOIN';

          return (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>Preview Klasifikasi & Penghitungan Hasil:</span>
                {isLoadingPreview && <span className="text-blue-700 text-[11px] animate-pulse">Menghitung...</span>}
              </div>

              {previewData ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[11px] block">Urutan Kejadian:</span>
                    <span className="font-bold text-slate-900 text-sm">Ke-{previewData.urutan_ke}</span>
                    <span className="text-[10px] text-slate-400 block">({previewData.total_sebelumnya} kali sebelumnya)</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[11px] block">Klasifikasi Hasil:</span>
                    <span className="font-bold text-blue-900 text-sm">{statusHasil}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[11px] block">Poin Diberikan:</span>
                    <span className={`font-extrabold text-sm ${poinDiberikan > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                      +{poinDiberikan} Poin
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 text-[11px] block">Bobot Pelanggaran:</span>
                    <span className="font-semibold text-slate-800 text-sm">{selectedMaster.bobot_poin} Poin</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-1">
                  Menunggu kalkulasi dari server...
                </div>
              )}

              <p className="text-[11px] text-slate-600 font-medium pt-1 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-600"></span>
                Poin langsung ditambahkan ke siswa (+{selectedMaster.bobot_poin} Poin) sesuai bobot resmi tata tertib.
              </p>
            </div>
          );
        })()}

        {/* Tombol Simpan */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={!selectedSiswa || !selectedKodePelanggaran || isSubmitting}
            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-xs flex items-center gap-2 transition-colors"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Menyimpan ke Google Spreadsheet...' : 'Simpan Laporan Pelanggaran'}
          </button>
        </div>
      </form>
    </div>
  );
};
