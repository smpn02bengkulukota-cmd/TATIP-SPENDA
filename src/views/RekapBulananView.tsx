import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Inbox,
  Award,
  Printer,
  FileSpreadsheet,
  Building2
} from 'lucide-react';
import { 
  exportNeatExcel, 
  exportCleanCsv, 
  ReportExportOptions, 
  SchoolKopData, 
  RekapKelasItem, 
  RincianPelanggaranItem 
} from '../utils/reportExporter';
import { ReportPrintModal } from '../components/ReportPrintModal';
import { getEffectivePoin, formatCleanTanggal, formatCleanJam } from '../utils/pointCalculator';

export const RekapBulananView: React.FC = () => {
  const { 
    laporan, 
    siswa, 
    kelas, 
    masterPelanggaran,
    pengaturan,
    currentUser 
  } = useApp();

  // Filter Waktu Berdasarkan Tanggal Kejadian (Bukan Waktu Input)
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

  const [filterTahun, setFilterTahun] = useState<string>(currentYear);
  const [filterBulan, setFilterBulan] = useState<string>(currentMonth);
  const [filterKelasId, setFilterKelasId] = useState<string>('ALL');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

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

  // Laporan Valid yang Tersaring berdasarkan Tanggal Kejadian
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

  // Statistik Ringkasan
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
    const list = kelas.map(k => {
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
  }, [kelas, siswa, filteredLaporan, pengaturan]);

  // Rincian Pelanggaran Terformat
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

  const reportExportOptions: ReportExportOptions = {
    title: 'LAPORAN REKAPITULASI PELANGGARAN TATA TERTIB SISWA',
    periodeLabel: periodeLabelText,
    kelasLabel: kelasLabelText,
    kop: schoolKop,
    summary,
    rekapKelas,
    rincianLaporan,
    rumusIndikator: rumusTransparan,
  };

  // Ekspor Excel Rapi (.xls)
  const handleExportNeatExcel = () => {
    if (filteredLaporan.length === 0 && rekapKelas.length === 0) {
      alert('Tidak ada data yang dapat diekspor untuk periode ini.');
      return;
    }
    const cleanBulan = filterBulan === 'ALL' ? 'SemuaBulan' : filterBulan;
    const filename = `Laporan_Pelanggaran_SMPN2_${filterTahun}_${cleanBulan}.xls`;
    exportNeatExcel(reportExportOptions, filename);
  };

  // Ekspor CSV Standar
  const handleExportCSV = () => {
    if (rincianLaporan.length === 0) {
      alert('Tidak ada data pelanggaran untuk periode ini.');
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
    exportCleanCsv(headers, rows, `Rekap_Pelanggaran_SMPN2_${filterTahun}_${cleanBulan}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header Halaman & Tombol Ekspor */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Rekap Bulanan Pelanggaran per Kelas
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dihitung berdasarkan tanggal kejadian siswa (bukan waktu input) dengan kop surat dan lembar pengesahan resmi.
          </p>
        </div>

        {/* Grup Tombol Ekspor & Cetak */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportNeatExcel}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors shrink-0"
            title="Unduh laporan Excel rapi lengkap dengan Kop Surat, tabel berwarna, dan NIP Kepala Sekolah"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            Ekspor Excel Rapi (.xls)
          </button>

          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors shrink-0"
            title="Cetak atau simpan ke PDF lengkap dengan Kop Resmi"
          >
            <Printer className="w-4 h-4 text-blue-200" />
            Cetak / Simpan PDF
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 border border-slate-300"
            title="Unduh format data mentah CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Info Kop Surat Aktif Banner */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Building2 className="w-4 h-4 text-blue-800 shrink-0" />
          <span className="text-slate-700">
            Kop Laporan: <strong className="text-slate-900">{schoolKop.namaSekolah}</strong> | 
            Kepala Sekolah: <strong className="text-slate-900">{schoolKop.namaKepalaSekolah}</strong> 
            <span className="text-slate-500 font-mono text-[11px] ml-1">(NIP. {schoolKop.nipKepalaSekolah})</span>
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
              <option key={k.kelas_id} value={k.kelas_id}>Kelas {k.nama_kelas}</option>
            ))}
          </select>
        </div>
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

      {/* Tabel Perbandingan Antarkelas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Tabel Rekap & Perbandingan Antarkelas
          </h2>
          <span className="text-xs text-slate-400">Diurutkan berdasarkan rasio ketertiban</span>
        </div>

        {rekapKelas.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Tidak ada data kelas pada Google Spreadsheet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Peringkat Tertib</th>
                  <th className="py-3 px-4">Nama Kelas</th>
                  <th className="py-3 px-4 text-center">Jumlah Siswa Aktif</th>
                  <th className="py-3 px-4 text-center">Total Kejadian</th>
                  <th className="py-3 px-4 text-center">Pembinaan (0 Poin)</th>
                  <th className="py-3 px-4 text-center">Berpoin</th>
                  <th className="py-3 px-4 text-right">Total Poin</th>
                  <th className="py-3 px-4 text-right">Rasio Poin/Siswa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rekapKelas.map((item, idx) => (
                  <tr key={item.kelas_id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold inline-flex items-center justify-center text-xs">
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      Kelas {item.nama_kelas}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700">
                      {item.jumlahSiswa} siswa
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-800">
                      {item.totalKejadian}
                    </td>
                    <td className="py-3 px-4 text-center text-blue-900">
                      {item.totalPembinaan}
                    </td>
                    <td className="py-3 px-4 text-center text-purple-900">
                      {item.totalBerpoin}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-red-700">
                      {item.totalPoin}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {item.rasioPoin}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cetak / Print PDF Laporan Resmi */}
      <ReportPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        reportOptions={reportExportOptions}
        onExportExcel={handleExportNeatExcel}
      />
    </div>
  );
};
