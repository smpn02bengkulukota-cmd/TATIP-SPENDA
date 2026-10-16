import React, { useRef, useState } from 'react';
import { KopSuratHeader } from './KopSuratHeader';
import { ReportExportOptions, formatTanggalIndo } from '../utils/reportExporter';
import { 
  Printer, 
  X, 
  Download, 
  FileDown, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileSpreadsheet,
  Globe
} from 'lucide-react';
import { 
  generateAndDownloadPdf, 
  triggerSafePrint, 
  downloadPrintableHtml 
} from '../utils/pdfGenerator';

interface ReportPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportOptions: ReportExportOptions;
  onExportExcel: () => void;
}

export const ReportPrintModal: React.FC<ReportPrintModalProps> = ({
  isOpen,
  onClose,
  reportOptions,
  onExportExcel,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  const { kop, summary, rekapKelas, rincianLaporan, title, periodeLabel, kelasLabel, rumusIndikator } = reportOptions;
  const todayStr = formatTanggalIndo();

  // Bersihkan nama file
  const safeFilename = `Laporan_Pelanggaran_SMPN2_${Date.now()}`;

  // Penanganan Unduh PDF Langsung
  const handleSavePdf = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPdf(true);
    setFeedback(null);
    setProgressText('Menyiapkan dokumen...');

    const res = await generateAndDownloadPdf(reportRef.current, {
      filename: `${safeFilename}.pdf`,
      orientation: 'landscape',
      onProgress: (status) => setProgressText(status),
    });

    setIsGeneratingPdf(false);

    if (res.success) {
      setFeedback({
        success: true,
        text: 'Berkas PDF resmi (.pdf) berhasil diunduh ke komputer Anda!'
      });
    } else {
      // Jika pembuatan via canvas terkendala, otomatis unduh dokumen HTML siap cetak
      downloadPrintableHtml(reportRef.current, `${safeFilename}_Cetak.html`);
      setFeedback({
        success: true,
        text: 'Dokumen cetak resmi (.html) berhasil diunduh. Buka berkas ini di browser untuk mencetak langsung!'
      });
    }
  };

  // Penanganan Cetak ke Printer
  const handlePrint = async () => {
    if (!reportRef.current) return;
    setFeedback(null);

    // Coba picu cetak printer
    const printResult = triggerSafePrint(reportRef.current);
    
    // Selain memicu printer, buatkan juga berkas PDF agar pengguna langsung mendapatkan salinan dokumen
    if (!printResult.printed) {
      setFeedback({
        success: false,
        text: printResult.message || 'Dialog cetak printer dibatasi oleh browser iFrame. Sedang mengunduh file PDF...'
      });
      await handleSavePdf();
    } else {
      setFeedback({
        success: true,
        text: 'Perintah cetak telah dikirim. Jika dialog printer tidak muncul karena batasan iFrame, silakan klik tombol "Simpan File PDF" di atas.'
      });
    }
  };

  // Unduh dokumen HTML mandiri
  const handleDownloadHtml = () => {
    if (!reportRef.current) return;
    downloadPrintableHtml(reportRef.current, `${safeFilename}_Cetak.html`);
    setFeedback({
      success: true,
      text: 'Berkas dokumen cetak mandiri (.html) berhasil diunduh!'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed-none">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:rounded-none">
        {/* Modal Toolbar (Disembunyikan saat dicetak) */}
        <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 print:hidden border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold tracking-wide flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-400" />
              Pratinjau Cetak & Simpan Laporan Resmi
            </h3>
            <p className="text-[11px] text-slate-400">
              Lengkap dengan Kop Surat Sekolah & Lembar Pengesahan Kepala Sekolah
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Tombol Unduh Excel */}
            <button
              type="button"
              onClick={onExportExcel}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              title="Unduh format Microsoft Excel rapi"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Unduh Excel (.xls)</span>
            </button>

            {/* Tombol Utama: Simpan File PDF */}
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleSavePdf}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
              title="Unduh dokumen asli format PDF (A4 Landscape)"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{progressText || 'Menghasilkan PDF...'}</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Simpan File PDF</span>
                </>
              )}
            </button>

            {/* Tombol Cetak ke Printer */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Buka dialog cetak printer browser"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Cetak ke Printer</span>
            </button>

            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors ml-1"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifikasi Status Feedback */}
        {feedback && (
          <div className={`px-4 py-2.5 text-xs flex items-center justify-between gap-2 print:hidden ${
            feedback.success 
              ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200' 
              : 'bg-amber-50 text-amber-900 border-b border-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="text-[11px] underline font-semibold text-blue-900 hover:text-blue-700 ml-2"
            >
              Unduh Versi HTML Siap Cetak
            </button>
          </div>
        )}

        {/* Lembar Kertas Laporan (Bisa di-print & di-capture langsung) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:p-0 print:bg-white print:overflow-visible">
          <div 
            ref={reportRef} 
            className="bg-white p-6 sm:p-10 rounded-xl border border-slate-300 shadow-sm max-w-4xl mx-auto space-y-6 print:border-none print:shadow-none print:p-0 print:max-w-none"
            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
          >
            {/* 1. KOP SURAT SEKOLAH */}
            <KopSuratHeader kop={kop} />

            {/* 2. JUDUL DOKUMEN & METADATA */}
            <div className="text-center space-y-1">
              <h1 className="text-base sm:text-lg font-extrabold uppercase tracking-wide text-slate-900">
                {title}
              </h1>
              <div className="text-xs text-slate-700">
                <span className="font-semibold">Periode:</span> {periodeLabel} &nbsp;|&nbsp; 
                <span className="font-semibold ml-2">Kelas:</span> {kelasLabel} &nbsp;|&nbsp; 
                <span className="font-semibold ml-2">Tanggal Cetak:</span> {todayStr}
              </div>
            </div>

            {/* 3. RINGKASAN REKAPITULASI (KPI SUMMARY) */}
            <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
              <div className="p-2 sm:p-3 bg-slate-50 border border-slate-300 rounded-lg">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Kejadian Sah</span>
                <span className="text-base sm:text-xl font-bold text-slate-900">{summary.totalValid}</span>
              </div>
              <div className="p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-[10px] text-blue-800 uppercase block font-semibold">Pembinaan (0 Poin)</span>
                <span className="text-base sm:text-xl font-bold text-blue-900">{summary.totalPembinaan}</span>
              </div>
              <div className="p-2 sm:p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <span className="text-[10px] text-purple-800 uppercase block font-semibold">Kejadian Berpoin</span>
                <span className="text-base sm:text-xl font-bold text-purple-900">{summary.totalBerpoin}</span>
              </div>
              <div className="p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-[10px] text-red-800 uppercase block font-semibold">Total Poin</span>
                <span className="text-base sm:text-xl font-bold text-red-700">{summary.totalPoin}</span>
              </div>
            </div>

            {/* 4. TABEL REKAPITULASI & PERBANDINGAN TINGKAT KETERTIBAN ANTARKELAS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  1. Rekapitulasi & Peringkat Ketertiban Antarkelas
                </h2>
                {rumusIndikator && (
                  <span className="text-[10px] text-slate-500 italic hidden sm:inline">
                    {rumusIndikator}
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

            {/* 5. TABEL RINCIAN LENGKAP KEJADIAN PELANGGARAN */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                2. Rincian Kejadian Pelanggaran Siswa
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
                          Tidak ada data pelanggaran pada periode ini.
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

            {/* 6. LEMBAR PENGESAHAN DENGAN NAMA KEPALA SEKOLAH & NIP */}
            <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-slate-900 break-inside-avoid">
              <div className="text-center">
                <div>Mengetahui,</div>
                <div className="font-bold">Kepala Sekolah</div>
                <div className="h-20 flex items-center justify-center text-slate-300 text-[10px] italic">
                  (Tanda tangan & Stempel Sekolah)
                </div>
                <div className="font-bold underline text-sm">
                  {kop.namaKepalaSekolah || 'Nama Kepala Sekolah'}
                </div>
                <div className="text-slate-700 font-mono text-[11px] mt-0.5">
                  NIP. {kop.nipKepalaSekolah || '-'}
                </div>
              </div>

              <div className="text-center">
                <div>{kop.kotaPengesahan || 'Kota Bengkulu'}, {todayStr}</div>
                <div className="font-bold">
                  {kop.jabatanPenanggungJawab2 || 'Wakil Kepala Sekolah Bid. Kesiswaan'}
                </div>
                <div className="h-20 flex items-center justify-center text-slate-300 text-[10px] italic">
                  (Tanda tangan)
                </div>
                <div className="font-bold underline text-sm">
                  {kop.namaPenanggungJawab2 || 'Nama Penanggung Jawab'}
                </div>
                <div className="text-slate-700 font-mono text-[11px] mt-0.5">
                  NIP. {kop.nipPenanggungJawab2 || '-'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
