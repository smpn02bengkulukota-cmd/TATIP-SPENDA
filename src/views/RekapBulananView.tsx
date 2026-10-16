import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Inbox,
  Award,
  Printer,
  FileSpreadsheet,
  Building2,
  FileDown,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Loader2,
  School,
  Eye,
  ListOrdered,
  UserCheck,
  Calendar,
  FileText
} from 'lucide-react';
import { 
  exportNeatExcel, 
  exportCleanCsv, 
  ReportExportOptions, 
  SchoolKopData, 
  RekapKelasItem, 
  RincianPelanggaranItem,
  formatTanggalIndo
} from '../utils/reportExporter';
import { ReportPrintModal } from '../components/ReportPrintModal';
import { KopSuratHeader } from '../components/KopSuratHeader';
import { generateAndDownloadPdf, downloadPrintableHtml } from '../utils/pdfGenerator';
import { getEffectivePoin, formatCleanTanggal, formatCleanJam } from '../utils/pointCalculator';

export const RekapBulananView: React.FC = () => {
  const { 
    laporan, 
    siswa, 
    kelas, 
    masterPelanggaran,
    pengaturan,
    currentUser,
    users,
    assignedKelasIds 
  } = useApp();

  const directPrintRef = useRef<HTMLDivElement>(null);

  // Periksa apakah pengguna saat ini adalah Wali Kelas
  const isWaliKelas = currentUser?.peran === 'WALI_KELAS';
  
  // Deteksi kelas binaan dari Wali Kelas yang sedang login
  const myAssignedKelas = useMemo(() => {
    if (!currentUser) return null;
    return kelas.find(k => 
      (k.wali_kelas_user_id && k.wali_kelas_user_id === currentUser.user_id) ||
      (assignedKelasIds && assignedKelasIds.includes(k.kelas_id))
    );
  }, [kelas, currentUser, assignedKelasIds]);

  // Filter Waktu Berdasarkan Tanggal Kejadian (Bukan Waktu Input)
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

  const [filterTahun, setFilterTahun] = useState<string>(currentYear);
  const [filterBulan, setFilterBulan] = useState<string>(currentMonth);
  // Default filter kelas ke kelas binaan jika user adalah wali kelas
  const [filterKelasId, setFilterKelasId] = useState<string>('ALL');
  
  // Set default kelas jika login sebagai wali kelas
  useEffect(() => {
    if (isWaliKelas && myAssignedKelas) {
      setFilterKelasId(myAssignedKelas.kelas_id);
    }
  }, [isWaliKelas, myAssignedKelas]);

  // Tab Tampilan
  const [activeTab, setActiveTab] = useState<'rekap_kelas' | 'rincian_pelanggaran'>('rekap_kelas');
  
  // Filter Tambahan untuk Rincian
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatusHasil, setFilterStatusHasil] = useState<string>('ALL');

  // Modal Cetak & Status Export
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const bulanOptions = [
    { value: 'ALL', label: 'Semua Bulan (Sepanjang Tahun)' },
    { value: '01', label: 'Januari' },
    { value: '02', label: 'Februari' },
    { value: '03', label: 'Maret' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mei' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'Agustus' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Desember' },
  ];

  // Rumus Indikator Ketertiban Transparan dari Pengaturan
  const rumusTransparan = pengaturan['RUMUS_INDIKATOR_TERTIB'] || 
    'Rasio Poin per Siswa = Total Poin Kelas / Jumlah Siswa Aktif (Semakin rendah rasio poin, semakin tertib kelas bersangkutan).';

  // Laporan Valid yang Tersaring berdasarkan Tanggal Kejadian dan Kelas
  const filteredLaporan = useMemo(() => {
    return laporan.filter(lap => {
      if (lap.status_data !== 'VALID') return false;

      const tgl = lap.tanggal_kejadian || '';
      // Format YYYY-MM-DD
      const [year, month] = tgl.split('-');

      if (filterTahun !== 'ALL' && year !== filterTahun) return false;
      if (filterBulan !== 'ALL' && month !== filterBulan) return false;

      if (filterKelasId !== 'ALL') {
        const s = siswa.find(x => x.siswa_id === lap.siswa_id);
        if (!s || s.kelas_id !== filterKelasId) return false;
      }

      return true;
    });
  }, [laporan, siswa, filterTahun, filterBulan, filterKelasId]);

  // Statistik Ringkasan Periode & Kelas yang Dipilih
  const summary = useMemo(() => {
    const totalValid = filteredLaporan.length;
    const totalPoin = filteredLaporan.reduce((acc, curr) => acc + getEffectivePoin(curr, pengaturan['SKEMA_POIN_PELANGGARAN']), 0);
    const totalBerpoin = filteredLaporan.filter(l => getEffectivePoin(l, pengaturan['SKEMA_POIN_PELANGGARAN']) > 0).length;
    const totalPembinaan = filteredLaporan.filter(l => getEffectivePoin(l, pengaturan['SKEMA_POIN_PELANGGARAN']) === 0).length;

    return {
      totalValid,
      totalPembinaan,
      totalBerpoin,
      totalPoin
    };
  }, [filteredLaporan, pengaturan]);

  // Rekap & Perbandingan Antarkelas dengan Rumus Transparan
  const rekapKelas: RekapKelasItem[] = useMemo(() => {
    const targetKelasList = filterKelasId === 'ALL' 
      ? kelas 
      : kelas.filter(k => k.kelas_id === filterKelasId);

    const list = targetKelasList.map(k => {
      const siswaDiKelas = siswa.filter(s => s.kelas_id === k.kelas_id && s.status_aktif === 'AKTIF');
      const jumlahSiswa = siswaDiKelas.length;

      const lapKelas = filteredLaporan.filter(l => {
        const s = siswa.find(x => x.siswa_id === l.siswa_id);
        return s && s.kelas_id === k.kelas_id;
      });

      const totalKejadian = lapKelas.length;
      const totalPoin = lapKelas.reduce((acc, curr) => acc + getEffectivePoin(curr, pengaturan['SKEMA_POIN_PELANGGARAN']), 0);
      const totalBerpoin = lapKelas.filter(l => getEffectivePoin(l, pengaturan['SKEMA_POIN_PELANGGARAN']) > 0).length;
      const totalPembinaan = lapKelas.filter(l => getEffectivePoin(l, pengaturan['SKEMA_POIN_PELANGGARAN']) === 0).length;

      // Rumus Transparan: Rasio poin per siswa kelas
      const rasioPoin = jumlahSiswa > 0 ? (totalPoin / jumlahSiswa) : totalPoin;

      return {
        kelas_id: k.kelas_id,
        nama_kelas: k.nama_kelas,
        jumlahSiswa,
        totalKejadian,
        totalPembinaan,
        totalBerpoin,
        totalPoin,
        rasioPoin: Number(rasioPoin.toFixed(2))
      };
    });

    // Urutkan kelas dari yang paling tertib (rasio poin terendah)
    return list.sort((a, b) => a.rasioPoin - b.rasioPoin);
  }, [kelas, siswa, filteredLaporan, filterKelasId, pengaturan]);

  // Rincian Pelanggaran Terformat Lengkap
  const rincianLaporan: RincianPelanggaranItem[] = useMemo(() => {
    return filteredLaporan.map(l => {
      const s = siswa.find(x => x.siswa_id === l.siswa_id);
      const k = s ? kelas.find(x => x.kelas_id === s.kelas_id) : null;
      const m = masterPelanggaran.find(x => x.kode_pelanggaran === l.kode_pelanggaran);
      const effectivePoin = getEffectivePoin(l, pengaturan['SKEMA_POIN_PELANGGARAN']);

      return {
        laporan_id: l.laporan_id,
        tanggal_kejadian: formatCleanTanggal(l.tanggal_kejadian),
        jam_kejadian: formatCleanJam(l.jam_kejadian) || '-',
        nisn: s ? s.nisn : '-',
        nama_siswa: s ? s.nama_lengkap : 'Siswa tidak ditemukan',
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
  }, [filteredLaporan, siswa, kelas, masterPelanggaran, pengaturan]);

  // Data Rincian yang Ditampilkan di Tab Rincian (dengan search dan filter status)
  const displayedRincian = useMemo(() => {
    return rincianLaporan.filter(item => {
      // Filter status hasil
      if (filterStatusHasil === 'PEMBINAAN' && item.poin_diberikan > 0) return false;
      if (filterStatusHasil === 'BERPOIN' && item.poin_diberikan === 0) return false;

      // Filter query pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNama = item.nama_siswa.toLowerCase().includes(q);
        const matchNisn = item.nisn.toLowerCase().includes(q);
        const matchUraian = item.uraian_pelanggaran.toLowerCase().includes(q);
        const matchKode = item.kode_pelanggaran.toLowerCase().includes(q);
        if (!matchNama && !matchNisn && !matchUraian && !matchKode) return false;
      }

      return true;
    });
  }, [rincianLaporan, filterStatusHasil, searchQuery]);

  // Data Kop Surat Resmi dari Pengaturan
  const schoolKop: SchoolKopData = useMemo(() => ({
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
  }), [pengaturan]);

  const selectedBulanLabel = bulanOptions.find(b => b.value === filterBulan)?.label || filterBulan;
  const periodeLabelText = filterBulan === 'ALL' 
    ? `Sepanjang Tahun ${filterTahun}` 
    : `${selectedBulanLabel} ${filterTahun}`;
  const selectedKelasObj = kelas.find(k => k.kelas_id === filterKelasId);
  const kelasLabelText = filterKelasId === 'ALL' ? 'Semua Kelas' : `Kelas ${selectedKelasObj?.nama_kelas || filterKelasId}`;

  // Data Wali Kelas untuk pengesahan khusus kelas
  const waliKelasPengesahan = useMemo(() => {
    if (filterKelasId === 'ALL' || !selectedKelasObj) return null;
    const waliUser = users.find(u => u.user_id === selectedKelasObj.wali_kelas_user_id) 
      || (isWaliKelas && selectedKelasObj.kelas_id === myAssignedKelas?.kelas_id ? currentUser : null);
    
    return {
      nama: waliUser?.nama || 'Wali Kelas ' + selectedKelasObj.nama_kelas,
      nip: (waliUser?.nip && waliUser.nip.trim() !== '') ? waliUser.nip : '-'
    };
  }, [filterKelasId, selectedKelasObj, users, isWaliKelas, myAssignedKelas, currentUser]);

  const reportExportOptions: ReportExportOptions = {
    title: filterKelasId === 'ALL' 
      ? 'LAPORAN REKAPITULASI PELANGGARAN TATA TERTIB SISWA' 
      : `LAPORAN KEDISIPLINAN SISWA KELAS ${selectedKelasObj?.nama_kelas || ''}`,
    periodeLabel: periodeLabelText,
    kelasLabel: kelasLabelText,
    kop: schoolKop,
    summary,
    rekapKelas,
    rincianLaporan,
    rumusIndikator: rumusTransparan,
    waliKelasName: waliKelasPengesahan?.nama,
    waliKelasNip: waliKelasPengesahan?.nip
  };

  const todayStr = formatTanggalIndo();

  // Ekspor PDF Langsung (Direct Download)
  const handleDirectExportPdf = async () => {
    if (!directPrintRef.current) return;
    if (filteredLaporan.length === 0 && rekapKelas.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'Tidak ada data pelanggaran untuk diekspor pada filter periode/kelas ini.'
      });
      return;
    }

    setIsExportingPdf(true);
    setExportProgress('Menyiapkan tata letak dokumen PDF resmi...');
    setFeedbackMessage(null);

    const cleanBulan = filterBulan === 'ALL' ? 'SemuaBulan' : (bulanOptions.find(b => b.value === filterBulan)?.label || filterBulan).replace(/\s+/g, '_');
    const cleanKelas = filterKelasId === 'ALL' ? 'SemuaKelas' : `Kelas_${(selectedKelasObj?.nama_kelas || filterKelasId).replace(/\s+/g, '_')}`;
    const filename = `Laporan_Disiplin_SMPN2_${cleanKelas}_${cleanBulan}_${filterTahun}.pdf`;

    try {
      const res = await generateAndDownloadPdf(directPrintRef.current, {
        filename,
        orientation: 'landscape',
        onProgress: (status) => setExportProgress(status)
      });

      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Berkas PDF resmi "${filename}" berhasil diunduh ke komputer Anda!`
        });
      } else {
        // Fallback jika browser sandbox membatasi canvas rendering
        downloadPrintableHtml(directPrintRef.current, filename.replace('.pdf', '_Cetak.html'));
        setFeedbackMessage({
          type: 'success',
          text: 'Dokumen cetak resmi (.html) berhasil diunduh. Anda dapat membukanya di browser untuk mencetak langsung!'
        });
      }
    } catch (err) {
      console.error('Error saat ekspor PDF:', err);
      if (directPrintRef.current) {
        downloadPrintableHtml(directPrintRef.current, filename.replace('.pdf', '_Cetak.html'));
      }
      setFeedbackMessage({
        type: 'error',
        text: 'Terjadi kendala rendering PDF. Dokumen cetak alternatif (.html) telah disiapkan.'
      });
    } finally {
      setIsExportingPdf(false);
      setExportProgress('');
    }
  };

  // Ekspor Excel Rapi (.xls)
  const handleExportNeatExcel = () => {
    if (filteredLaporan.length === 0 && rekapKelas.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'Tidak ada data yang dapat diekspor untuk periode ini.'
      });
      return;
    }
    const cleanBulan = filterBulan === 'ALL' ? 'SemuaBulan' : filterBulan;
    const cleanKelas = filterKelasId === 'ALL' ? 'SemuaKelas' : `Kelas_${selectedKelasObj?.nama_kelas || filterKelasId}`;
    const filename = `Laporan_Pelanggaran_SMPN2_${cleanKelas}_${filterTahun}_${cleanBulan}.xls`;
    exportNeatExcel(reportExportOptions, filename);
  };

  // Ekspor CSV Standar
  const handleExportCSV = () => {
    if (rincianLaporan.length === 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'Tidak ada data pelanggaran untuk diekspor ke CSV.'
      });
      return;
    }

    const headers = [
      'No', 'ID Laporan', 'Tanggal Kejadian', 'Jam Kejadian', 
      'NISN', 'Nama Siswa', 'Kelas', 'Kode Pelanggaran', 
      'Uraian Pelanggaran', 'Bobot Snapshot', 'Urutan Ke', 
      'Klasifikasi Hasil', 'Poin Diberikan', 'Petugas Input', 'Status Data'
    ];

    const rows = rincianLaporan.map((item, idx) => [
      idx + 1,
      item.laporan_id,
      item.tanggal_kejadian,
      item.jam_kejadian,
      item.nisn,
      item.nama_siswa,
      item.nama_kelas,
      item.kode_pelanggaran,
      item.uraian_pelanggaran,
      item.bobot_snapshot,
      item.urutan_ke,
      item.status_hasil,
      item.poin_diberikan,
      item.user_id_pencatat,
      item.status_data
    ]);

    const cleanBulan = filterBulan === 'ALL' ? 'SemuaBulan' : filterBulan;
    const cleanKelas = filterKelasId === 'ALL' ? 'SemuaKelas' : `Kelas_${selectedKelasObj?.nama_kelas || filterKelasId}`;
    exportCleanCsv(headers, rows, `Rekap_Pelanggaran_SMPN2_${cleanKelas}_${filterTahun}_${cleanBulan}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman & Tombol Ekspor PDF */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Rekap Bulanan & Laporan Disiplin Siswa
            </h1>
            {isWaliKelas && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                Akses Wali Kelas
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Ekspor dan cetak laporan kedisiplinan resmi SMPN 2 Kota Bengkulu lengkap dengan Kop Surat, statistik, tabel rincian, dan pengesahan.
          </p>
        </div>

        {/* Grup Tombol Ekspor & Cetak */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tombol Utama: Ekspor PDF Langsung */}
          <button
            type="button"
            onClick={handleDirectExportPdf}
            disabled={isExportingPdf}
            className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 shrink-0"
            title="Unduh langsung dokumen PDF resmi (A4 Landscape) siap cetak dan tanda tangan"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>{exportProgress || 'Menyusun PDF...'}</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-amber-400" />
                <span>Ekspor PDF Laporan</span>
              </>
            )}
          </button>

          {/* Tombol Pratinjau & Dialog Cetak Printer */}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            title="Buka pratinjau dokumen cetak resmi dan cetak ke printer"
          >
            <Printer className="w-4 h-4 text-blue-300" />
            <span>Pratinjau & Cetak</span>
          </button>

          {/* Tombol Ekspor Excel */}
          <button
            type="button"
            onClick={handleExportNeatExcel}
            className="px-3 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            title="Unduh format Microsoft Excel rapi (.xls)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Excel (.xls)</span>
          </button>

          {/* Tombol CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 border border-slate-300"
            title="Unduh data mentah format CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Banner Informasi Akses Khusus Wali Kelas */}
      {isWaliKelas && myAssignedKelas && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-blue-950">
          <div className="flex items-center gap-2.5">
            <School className="w-5 h-5 text-blue-800 shrink-0" />
            <div>
              <span className="font-bold">Kelas Binaan Anda: Kelas {myAssignedKelas.nama_kelas}</span>
              <p className="text-[11px] text-blue-900 mt-0.5">
                Gunakan tombol ekspor PDF di atas untuk mencetak rekap disiplin siswa kelas binaan Anda untuk pembinaan wali kelas atau arsip sekolah.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {filterKelasId !== myAssignedKelas.kelas_id ? (
              <button
                type="button"
                onClick={() => setFilterKelasId(myAssignedKelas.kelas_id)}
                className="px-3 py-1.5 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 text-xs transition-colors"
              >
                Tampilkan Kelas Saya ({myAssignedKelas.nama_kelas})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setFilterKelasId('ALL')}
                className="px-3 py-1.5 bg-white border border-blue-300 text-blue-900 font-semibold rounded-lg hover:bg-blue-100 text-xs transition-colors"
              >
                Lihat Semua Kelas
              </button>
            )}
          </div>
        </div>
      )}

      {/* Feedback Alert Toast */}
      {feedbackMessage && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' 
            : 'bg-red-50 border border-red-200 text-red-900'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium leading-relaxed">{feedbackMessage.text}</span>
          </div>
          <button 
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-bold hover:underline shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Info Kop Surat Aktif Banner */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Building2 className="w-4 h-4 text-blue-800 shrink-0" />
          <span className="text-slate-700">
            Kop Laporan: <strong className="text-slate-900">{schoolKop.namaSekolah}</strong> | 
            Kepala Sekolah: <strong className="text-slate-900">{schoolKop.namaKepalaSekolah}</strong> 
            <span className="text-slate-500 font-mono text-[11px] ml-1">(NIP. {schoolKop.nipKepalaSekolah})</span>
            {waliKelasPengesahan && (
              <span className="ml-2 text-blue-900 font-semibold">
                | Pengesahan: {waliKelasPengesahan.nama}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">Tahun Kejadian</label>
          <select
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
          >
            <option value="ALL">Semua Tahun</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
            <option value="2027">2027</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">Bulan Kejadian</label>
          <select
            value={filterBulan}
            onChange={(e) => setFilterBulan(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
          >
            {bulanOptions.map(b => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">Filter Kelas</label>
          <select
            value={filterKelasId}
            onChange={(e) => setFilterKelasId(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
          >
            <option value="ALL">Semua Kelas</option>
            {kelas.map(k => (
              <option key={k.kelas_id} value={k.kelas_id}>
                Kelas {k.nama_kelas} {myAssignedKelas?.kelas_id === k.kelas_id ? '(Kelas Anda)' : ''}
              </option>
            ))}
          </select>
        </div>

        {activeTab === 'rincian_pelanggaran' && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Klasifikasi Poin</label>
              <select
                value={filterStatusHasil}
                onChange={(e) => setFilterStatusHasil(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
              >
                <option value="ALL">Semua Klasifikasi</option>
                <option value="PEMBINAAN">Pembinaan Saja (0 Poin)</option>
                <option value="BERPOIN">Kasus Berpoin (&gt; 0 Poin)</option>
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Pencarian Siswa / Kasus</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa, NISN, atau uraian..."
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Kartu Ringkasan Rekap */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">Total Kejadian Sah</span>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{summary.totalValid}</div>
          <span className="text-[10px] text-slate-400">Kasus sah tercatat</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">Total Pembinaan (0 Poin)</span>
          <div className="mt-1 text-2xl font-extrabold text-blue-900">{summary.totalPembinaan}</div>
          <span className="text-[10px] text-slate-400">Tahap pembinaan 1–3</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">Total Berpoin</span>
          <div className="mt-1 text-2xl font-extrabold text-purple-900">{summary.totalBerpoin}</div>
          <span className="text-[10px] text-slate-400">Kejadian berbobot poin</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block">Akumulasi Poin</span>
          <div className="mt-1 text-2xl font-extrabold text-red-700">{summary.totalPoin}</div>
          <span className="text-[10px] text-slate-400">Total poin diberikan</span>
        </div>
      </div>

      {/* Tab Navigasi: Rekap per Kelas vs Rincian Pelanggaran Siswa */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('rekap_kelas')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'rekap_kelas'
              ? 'border-blue-900 text-blue-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Peringkat & Rekap Antarkelas ({rekapKelas.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rincian_pelanggaran')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'rincian_pelanggaran'
              ? 'border-blue-900 text-blue-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          Rincian Pelanggaran Siswa ({displayedRincian.length} Data)
        </button>
      </div>

      {/* TAB 1: Tabel Rekapitulasi & Peringkat Antarkelas */}
      {activeTab === 'rekap_kelas' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Tabel Rekap & Perbandingan Antarkelas
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Diurutkan berdasarkan rasio ketertiban (semakin kecil rasio poin/siswa, semakin tertib).
                </p>
              </div>
              <span className="text-xs text-slate-400 font-medium">Periode: {periodeLabelText}</span>
            </div>

            {rekapKelas.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Tidak ada data kelas yang cocok dengan filter yang dipilih.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4 text-center w-14">Peringkat</th>
                      <th className="py-3 px-4">Nama Kelas</th>
                      <th className="py-3 px-4 text-center">Jumlah Siswa Aktif</th>
                      <th className="py-3 px-4 text-center">Total Kejadian</th>
                      <th className="py-3 px-4 text-center">Pembinaan (0 Poin)</th>
                      <th className="py-3 px-4 text-center">Berpoin</th>
                      <th className="py-3 px-4 text-right">Total Poin</th>
                      <th className="py-3 px-4 text-right">Rasio Poin/Siswa</th>
                      <th className="py-3 px-4 text-center">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rekapKelas.map((item, idx) => {
                      const isMyClass = myAssignedKelas?.kelas_id === item.kelas_id;
                      return (
                        <tr key={item.kelas_id} className={`hover:bg-slate-50/80 ${isMyClass ? 'bg-blue-50/40' : ''}`}>
                          <td className="py-3 px-4 text-center">
                            <span className={`w-6 h-6 rounded-full font-bold inline-flex items-center justify-center text-xs ${
                              idx === 0 
                                ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              #{idx + 1}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            Kelas {item.nama_kelas}
                            {isMyClass && (
                              <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-semibold">
                                Kelas Anda
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-700">
                            {item.jumlahSiswa} siswa
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-800">
                            {item.totalKejadian}
                          </td>
                          <td className="py-3 px-4 text-center text-blue-900 font-medium">
                            {item.totalPembinaan}
                          </td>
                          <td className="py-3 px-4 text-center text-purple-900 font-medium">
                            {item.totalBerpoin}
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-red-700">
                            {item.totalPoin}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {item.rasioPoin}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setFilterKelasId(item.kelas_id);
                                setShowPrintModal(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors inline-flex items-center gap-1"
                              title={`Cetak dan Ekspor Laporan PDF khusus Kelas ${item.nama_kelas}`}
                            >
                              <FileDown className="w-3 h-3 text-blue-700" />
                              Cetak PDF Kelas
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

          {/* Penjelasan Rumus Transparan */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-3">
            <Award className="w-5 h-5 text-blue-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Rumus Transparan Indikator Ketertiban Kelas:</span>
              <p className="mt-0.5 text-blue-900 leading-relaxed">
                {rumusTransparan}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Tabel Rincian Lengkap Pelanggaran Siswa */}
      {activeTab === 'rincian_pelanggaran' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Daftar Lengkap Kejadian Pelanggaran Siswa
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Menampilkan seluruh catatan pelanggaran siswa sah pada periode dan kelas yang dipilih.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              {displayedRincian.length} Catatan
            </span>
          </div>

          {displayedRincian.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Tidak ada data pelanggaran siswa yang cocok dengan pencarian atau filter saat ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3 text-center w-10">No</th>
                    <th className="py-3 px-3 text-center">Tanggal & Jam</th>
                    <th className="py-3 px-4">Nama Siswa & NISN</th>
                    <th className="py-3 px-3 text-center">Kelas</th>
                    <th className="py-3 px-4">Kode & Pelanggaran</th>
                    <th className="py-3 px-3 text-center">Urutan</th>
                    <th className="py-3 px-3 text-center">Klasifikasi</th>
                    <th className="py-3 px-3 text-right">Poin</th>
                    <th className="py-3 px-4">Catatan</th>
                    <th className="py-3 px-3 text-center">Pencatat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedRincian.map((item, idx) => (
                    <tr key={item.laporan_id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap text-slate-700">
                        <div>{item.tanggal_kejadian}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.jam_kejadian}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900">{item.nama_siswa}</div>
                        <div className="font-mono text-slate-500 text-[10px]">{item.nisn}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-medium whitespace-nowrap text-slate-800">
                        {item.nama_kelas}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-mono font-bold text-slate-900 mr-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-[10px]">
                          {item.kode_pelanggaran}
                        </span>
                        <span className="text-slate-700">{item.uraian_pelanggaran}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap text-slate-600 font-medium">
                        Ke-{item.urutan_ke}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-semibold">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          item.poin_diberikan > 0 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {item.poin_diberikan > 0 ? 'BERPOIN' : 'PEMBINAAN'}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-extrabold ${item.poin_diberikan > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                        {item.poin_diberikan}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {item.catatan || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500 text-[11px] font-mono">
                        {item.user_id_pencatat}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Pratinjau & Cetak PDF */}
      <ReportPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        reportOptions={reportExportOptions}
        onExportExcel={handleExportNeatExcel}
      />

      {/* ========================================================================= */}
      {/* ELEMEN OFFSCREEN RESMI UNTUK RENDERING PDF RESOLUSI TINGGI (A4 LANDSCAPE)   */}
      {/* ========================================================================= */}
      <div 
        style={{ 
          position: 'fixed', 
          left: '-9999px', 
          top: '0', 
          width: '1120px', 
          zIndex: -100, 
          pointerEvents: 'none',
          backgroundColor: '#ffffff'
        }}
      >
        <div 
          ref={directPrintRef} 
          className="bg-white p-10 space-y-6 text-slate-900"
          style={{ width: '1120px', backgroundColor: '#ffffff', color: '#0f172a' }}
        >
          {/* 1. KOP SURAT SEKOLAH DINAS */}
          <KopSuratHeader kop={schoolKop} />

          {/* 2. JUDUL DOKUMEN & IDENTITAS */}
          <div className="text-center space-y-1">
            <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-slate-900">
              {reportExportOptions.title}
            </h1>
            <div className="text-xs text-slate-700">
              <span className="font-semibold">Periode:</span> {periodeLabelText} &nbsp;|&nbsp; 
              <span className="font-semibold ml-2">Kelas:</span> {kelasLabelText} &nbsp;|&nbsp; 
              <span className="font-semibold ml-2">Tanggal Cetak:</span> {todayStr}
            </div>
          </div>

          {/* 3. RINGKASAN STATISTIK (KPI BOXES) */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Kejadian Sah</span>
              <span className="text-xl font-bold text-slate-900">{summary.totalValid}</span>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-[10px] text-blue-800 uppercase block font-semibold">Pembinaan (0 Poin)</span>
              <span className="text-xl font-bold text-blue-900">{summary.totalPembinaan}</span>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="text-[10px] text-purple-800 uppercase block font-semibold">Kejadian Berpoin</span>
              <span className="text-xl font-bold text-purple-900">{summary.totalBerpoin}</span>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-[10px] text-red-800 uppercase block font-semibold">Total Poin</span>
              <span className="text-xl font-bold text-red-700">{summary.totalPoin}</span>
            </div>
          </div>

          {/* 4. TABEL REKAP ANTARKELAS (Hanya tampil jika filter Kelas = ALL) */}
          {filterKelasId === 'ALL' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  1. Rekapitulasi & Peringkat Ketertiban Antarkelas
                </h2>
                {rumusTransparan && (
                  <span className="text-[10px] text-slate-500 italic">
                    {rumusTransparan}
                  </span>
                )}
              </div>

              <div className="border border-slate-300 rounded-md overflow-hidden">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-3 text-center w-12">No</th>
                      <th className="py-2 px-3">Nama Kelas</th>
                      <th className="py-2 px-3 text-center">Siswa Aktif</th>
                      <th className="py-2 px-3 text-center">Total Kasus</th>
                      <th className="py-2 px-3 text-center">Pembinaan</th>
                      <th className="py-2 px-3 text-center">Berpoin</th>
                      <th className="py-2 px-3 text-right">Total Poin</th>
                      <th className="py-2 px-3 text-right">Rasio Poin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rekapKelas.map((k, idx) => (
                      <tr key={k.kelas_id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="py-1.5 px-3 text-center font-bold text-slate-600">#{idx + 1}</td>
                        <td className="py-1.5 px-3 font-semibold text-slate-900">Kelas {k.nama_kelas}</td>
                        <td className="py-1.5 px-3 text-center">{k.jumlahSiswa} siswa</td>
                        <td className="py-1.5 px-3 text-center font-medium">{k.totalKejadian}</td>
                        <td className="py-1.5 px-3 text-center text-blue-800 font-semibold">{k.totalPembinaan}</td>
                        <td className="py-1.5 px-3 text-center text-purple-800 font-semibold">{k.totalBerpoin}</td>
                        <td className="py-1.5 px-3 text-right font-bold text-red-700">{k.totalPoin}</td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-800">{k.rasioPoin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. TABEL RINCIAN LENGKAP KEJADIAN PELANGGARAN SISWA */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
              {filterKelasId === 'ALL' ? '2. Rincian Kejadian Pelanggaran Siswa' : 'Daftar Rincian Pelanggaran Siswa'}
            </h2>

            <div className="border border-slate-300 rounded-md overflow-hidden">
              <table className="w-full text-[10px] text-left">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-2 text-center w-8">No</th>
                    <th className="py-2 px-2 text-center">Tanggal</th>
                    <th className="py-2 px-2">NISN & Nama Siswa</th>
                    <th className="py-2 px-2 text-center">Kelas</th>
                    <th className="py-2 px-2">Kode & Pelanggaran</th>
                    <th className="py-2 px-2 text-center">Urutan</th>
                    <th className="py-2 px-2 text-center">Klasifikasi</th>
                    <th className="py-2 px-2 text-right">Poin</th>
                    <th className="py-2 px-2 text-center">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rincianLaporan.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-4 text-center text-slate-400">
                        Tidak ada data pelanggaran tercatat pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    rincianLaporan.map((item, idx) => (
                      <tr key={item.laporan_id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="py-1.5 px-2 text-center text-slate-500">{idx + 1}</td>
                        <td className="py-1.5 px-2 text-center whitespace-nowrap">
                          {item.tanggal_kejadian}
                          {item.jam_kejadian ? ` ${item.jam_kejadian}` : ''}
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="font-bold text-slate-900">{item.nama_siswa}</div>
                          <div className="font-mono text-slate-500 text-[9px]">{item.nisn}</div>
                        </td>
                        <td className="py-1.5 px-2 text-center font-medium whitespace-nowrap">
                          {item.nama_kelas}
                        </td>
                        <td className="py-1.5 px-2">
                          <span className="font-bold text-slate-800">{item.kode_pelanggaran}</span>
                          <span className="text-slate-600 block">{item.uraian_pelanggaran}</span>
                        </td>
                        <td className="py-1.5 px-2 text-center whitespace-nowrap">
                          Ke-{item.urutan_ke}
                        </td>
                        <td className="py-1.5 px-2 text-center whitespace-nowrap font-semibold">
                          <span className={item.status_hasil === 'BERPOIN' ? 'text-red-700' : 'text-blue-800'}>
                            {item.status_hasil}
                          </span>
                        </td>
                        <td className={`py-1.5 px-2 text-right font-bold ${item.poin_diberikan > 0 ? 'text-red-700' : 'text-slate-600'}`}>
                          {item.poin_diberikan}
                        </td>
                        <td className="py-1.5 px-2 text-center text-slate-600">
                          {item.user_id_pencatat}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. LEMBAR PENGESAHAN DENGAN NAMA KEPALA SEKOLAH & WALI KELAS / WAKASEK */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-slate-900 break-inside-avoid">
            <div className="text-center">
              <div>Mengetahui,</div>
              <div className="font-bold">Kepala Sekolah</div>
              <div className="h-20 flex items-center justify-center text-slate-300 text-[10px] italic">
                (Tanda tangan & Stempel Sekolah)
              </div>
              <div className="font-bold underline text-sm">
                {schoolKop.namaKepalaSekolah || 'Nama Kepala Sekolah'}
              </div>
              <div className="text-slate-700 font-mono text-[11px] mt-0.5">
                NIP. {schoolKop.nipKepalaSekolah || '-'}
              </div>
            </div>

            <div className="text-center">
              <div>{schoolKop.kotaPengesahan || 'Kota Bengkulu'}, {todayStr}</div>
              <div className="font-bold">
                {waliKelasPengesahan ? `Wali ${kelasLabelText}` : (schoolKop.jabatanPenanggungJawab2 || 'Wakil Kepala Sekolah Bid. Kesiswaan')}
              </div>
              <div className="h-20 flex items-center justify-center text-slate-300 text-[10px] italic">
                (Tanda tangan)
              </div>
              <div className="font-bold underline text-sm">
                {waliKelasPengesahan?.nama || schoolKop.namaPenanggungJawab2 || 'Nama Penanggung Jawab'}
              </div>
              <div className="text-slate-700 font-mono text-[11px] mt-0.5">
                NIP. {waliKelasPengesahan?.nip !== '-' ? waliKelasPengesahan?.nip : (schoolKop.nipPenanggungJawab2 || '-')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
