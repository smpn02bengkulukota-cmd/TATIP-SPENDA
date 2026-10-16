import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  Settings, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Database, 
  TableProperties, 
  RefreshCw,
  HelpCircle
} from 'lucide-react';

interface PengaturanViewProps {
  onOpenSetupGuide: () => void;
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({ onOpenSetupGuide }) => {
  const { 
    pengaturan, 
    currentUser, 
    refreshData, 
    structureInfo, 
    checkConnection, 
    initEmptyStructure 
  } = useApp();

  const [formValues, setFormValues] = useState<Record<string, string>>({
    PERIODE_PERHITUNGAN_PEMBINAAN: '',
    SKEMA_POIN_PELANGGARAN: '',
    TAHUN_AJARAN_AKTIF: '',
    SEMESTER_AKTIF: '',
    NAMA_SEKOLAH: '',
    ALAMAT_SEKOLAH: '',
    NAMA_KEPALA_SEKOLAH: '',
    NIP_KEPALA_SEKOLAH: '',
    NOMOR_WA_KESISWAAN: '',
    WA_GATEWAY_API_URL: '',
    WA_GATEWAY_API_KEY: '',
    RUMUS_INDIKATOR_TERTIB: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSyncingPoints, setIsSyncingPoints] = useState(false);

  useEffect(() => {
    setFormValues({
      PERIODE_PERHITUNGAN_PEMBINAAN: pengaturan['PERIODE_PERHITUNGAN_PEMBINAAN'] || 'TAHUN_AJARAN_2026/2027',
      SKEMA_POIN_PELANGGARAN: pengaturan['SKEMA_POIN_PELANGGARAN'] || 'LANGSUNG_BERPOIN',
      TAHUN_AJARAN_AKTIF: pengaturan['TAHUN_AJARAN_AKTIF'] || '2026/2027',
      SEMESTER_AKTIF: pengaturan['SEMESTER_AKTIF'] || 'Ganjil',
      NAMA_SEKOLAH: pengaturan['NAMA_SEKOLAH'] || 'SMP Negeri 2 Kota Bengkulu',
      ALAMAT_SEKOLAH: pengaturan['ALAMAT_SEKOLAH'] || 'Jl. Prof. Dr. Hazairin No. 2, Penurunan, Kec. Ratu Samban, Kota Bengkulu',
      NAMA_KEPALA_SEKOLAH: pengaturan['NAMA_KEPALA_SEKOLAH'] || 'Malis Hartanto, M.Pd.',
      NIP_KEPALA_SEKOLAH: pengaturan['NIP_KEPALA_SEKOLAH'] || '19700512 199503 1 003',
      NOMOR_WA_KESISWAAN: pengaturan['NOMOR_WA_KESISWAAN'] || '6281234567890',
      WA_GATEWAY_API_URL: pengaturan['WA_GATEWAY_API_URL'] || '',
      WA_GATEWAY_API_KEY: pengaturan['WA_GATEWAY_API_KEY'] || '',
      RUMUS_INDIKATOR_TERTIB: pengaturan['RUMUS_INDIKATOR_TERTIB'] || 'Rasio poin per jumlah siswa aktif di kelas (Semakin rendah semakin tertib)',
    });
  }, [pengaturan]);

  const handleChange = (key: string, val: string) => {
    setFormValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSavePengaturan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!formValues.PERIODE_PERHITUNGAN_PEMBINAAN.trim()) {
      setFeedback({ success: false, text: 'Periode perhitungan pembinaan wajib diisi agar sistem dapat menghitung urutan secara valid.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const res = await api.updatePengaturan(formValues, currentUser.user_id);
    setIsSaving(false);

    if (res.success) {
      setFeedback({ success: true, text: 'Pengaturan sistem berhasil disimpan ke Google Spreadsheet!' });
      await refreshData();
    } else {
      setFeedback({ success: false, text: res.error || 'Gagal menyimpan pengaturan.' });
    }
  };

  const [initFeedback, setInitFeedback] = useState<{ success: boolean; text: string } | null>(null);

  const handleInitStructure = async () => {
    setIsInitializing(true);
    setInitFeedback(null);
    const res = await initEmptyStructure();
    setIsInitializing(false);
    if (res.success) {
      setInitFeedback({ success: true, text: res.message || 'Struktur 9 tab dan header kolom kosong berhasil dibuat di Google Spreadsheet!' });
      await checkConnection();
      await refreshData();
    } else {
      setInitFeedback({ success: false, text: res.error || 'Gagal inisialisasi tab. Pastikan Web App Apps Script di-deploy dengan akses "Anyone".' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Pengaturan Sistem & Struktur Spreadsheet
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Konfigurasi periode operasional sekolah, nomor WhatsApp resmi, dan verifikasi struktur 9 tab Google Spreadsheet.
        </p>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${feedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {feedback.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Bagian 1: Form Pengaturan Operasional */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 border-b border-slate-100 pb-3">
          Parameter Operasional Tata Tertib
        </h2>

        <form onSubmit={handleSavePengaturan} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Periode Perhitungan Pembinaan (Wajib)
              </label>
              <input
                type="text"
                required
                value={formValues.PERIODE_PERHITUNGAN_PEMBINAAN}
                onChange={(e) => handleChange('PERIODE_PERHITUNGAN_PEMBINAAN', e.target.value)}
                placeholder="Contoh: TAHUN_AJARAN_2026/2027 atau SEMESTER_GANJIL_2026"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Menjadi dasar batas periode perhitungan poin pelanggaran dan tahapan pembinaan siswa.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Skema Perhitungan Poin Pelanggaran Siswa
              </label>
              <select
                value={formValues.SKEMA_POIN_PELANGGARAN}
                onChange={(e) => handleChange('SKEMA_POIN_PELANGGARAN', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white font-medium"
              >
                <option value="LANGSUNG_BERPOIN">
                  Langsung Berpoin Setiap Kejadian (Setiap pelanggaran langsung menambahkan poin sesuai bobot - Standar Sekolah)
                </option>
                <option value="PEMBINAAN_BERTAHAP_1_3">
                  Tahap Pembinaan Khusus Bobot 1-29 (Kejadian ke-1 s.d 3 = 0 poin, kejadian ke-4+ = berpoin)
                </option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Pilih sistem pemberian poin siswa. Standar: setiap kali pelanggaran dicatat, siswa langsung memperoleh poin sesuai bobotnya.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tahun Ajaran Aktif
              </label>
              <input
                type="text"
                required
                value={formValues.TAHUN_AJARAN_AKTIF}
                onChange={(e) => handleChange('TAHUN_AJARAN_AKTIF', e.target.value)}
                placeholder="2026/2027"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Semester Aktif
              </label>
              <select
                value={formValues.SEMESTER_AKTIF}
                onChange={(e) => handleChange('SEMESTER_AKTIF', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
              >
                <option value="Ganjil">Semester Ganjil</option>
                <option value="Genap">Semester Genap</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Resmi Sekolah
              </label>
              <input
                type="text"
                required
                value={formValues.NAMA_SEKOLAH}
                onChange={(e) => handleChange('NAMA_SEKOLAH', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Alamat Lengkap Sekolah (Untuk Kop Laporan)
              </label>
              <input
                type="text"
                value={formValues.ALAMAT_SEKOLAH}
                onChange={(e) => handleChange('ALAMAT_SEKOLAH', e.target.value)}
                placeholder="Jl. Prof. Dr. Hazairin No. 2, Penurunan, Kota Bengkulu"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Kepala Sekolah (Beserta Gelar)
              </label>
              <input
                type="text"
                value={formValues.NAMA_KEPALA_SEKOLAH}
                onChange={(e) => handleChange('NAMA_KEPALA_SEKOLAH', e.target.value)}
                placeholder="Malis Hartanto, M.Pd."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                NIP Kepala Sekolah
              </label>
              <input
                type="text"
                value={formValues.NIP_KEPALA_SEKOLAH}
                onChange={(e) => handleChange('NIP_KEPALA_SEKOLAH', e.target.value)}
                placeholder="19700512 199503 1 003"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor WhatsApp Kesiswaan (Pengirim Resmi)
              </label>
              <input
                type="text"
                required
                value={formValues.NOMOR_WA_KESISWAAN}
                onChange={(e) => handleChange('NOMOR_WA_KESISWAAN', e.target.value)}
                placeholder="Contoh: 6281234567890"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Gateway API URL (Opsional)
              </label>
              <input
                type="text"
                value={formValues.WA_GATEWAY_API_URL}
                onChange={(e) => handleChange('WA_GATEWAY_API_URL', e.target.value)}
                placeholder="https://api.fonnte.com/send atau sejenisnya"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Kosongkan jika menggunakan metode kirim langsung via wa.me.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Rumus Transparan Indikator Kelas Paling Tertib
            </label>
            <textarea
              rows={2}
              value={formValues.RUMUS_INDIKATOR_TERTIB}
              onChange={(e) => handleChange('RUMUS_INDIKATOR_TERTIB', e.target.value)}
              placeholder="Deskripsi rumus perhitungan ketertiban kelas yang disetujui sekolah..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan ke Spreadsheet...' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      </div>

      {/* Bagian 2: Pemeriksaan Struktur Spreadsheet Real-time */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-900" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Pemeriksaan Struktur 9 Tab Google Spreadsheet
            </h2>
          </div>
          <button
            onClick={() => checkConnection()}
            className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Periksa Ulang
          </button>
        </div>

        {structureInfo && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-400 block">Nama Spreadsheet:</span>
                <span className="font-bold text-slate-900">{structureInfo.spreadsheet_name || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-400 block">Status Validasi Kolom:</span>
                <span className={`font-bold ${structureInfo.is_fully_valid ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {structureInfo.is_fully_valid ? 'Semua Tab & Kolom Lengkap' : 'Ada Kolom/Tab Belum Sesuai'}
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-400 block">Jumlah Akun Terdaftar:</span>
                <span className="font-bold text-slate-900">
                  {structureInfo.total_users} Akun Nyata
                </span>
              </div>
            </div>

            {/* Tabel Status 9 Sheet */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Nama Tab Wajib</th>
                    <th className="py-2.5 px-4 text-center">Status Keberadaan</th>
                    <th className="py-2.5 px-4 text-center">Jumlah Baris Nyata</th>
                    <th className="py-2.5 px-4">Kolom yang Kurang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(structureInfo.sheets_status || {}).map(([sheetName, status]) => (
                    <tr key={sheetName}>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{sheetName}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block text-[11px] font-bold ${status.exists ? 'text-emerald-700' : 'text-red-700'}`}>
                          {status.exists ? 'Ada' : 'Belum Ada'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-700 font-semibold">
                        {status.total_rows} baris
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                        {status.missing_columns.length > 0 ? (
                          <span className="text-red-600 font-semibold">{status.missing_columns.join(', ')}</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">Lengkap</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs gap-3">
              <div>
                <span className="font-bold text-slate-900 block">Inisialisasi / Lengkapi Header 9 Tab:</span>
                <p className="mt-0.5 text-slate-600">
                  Membuat seluruh header kolom resmi yang belum ada pada spreadsheet tanpa menambahkan data contoh.
                </p>
              </div>
              <button
                type="button"
                onClick={handleInitStructure}
                disabled={isInitializing}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-semibold shrink-0 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <TableProperties className="w-4 h-4" />
                {isInitializing ? 'Membuat Header Tab...' : 'Inisialisasi Header Tab'}
              </button>
            </div>

            {initFeedback && (
              <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${initFeedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                {initFeedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                <span className="font-medium leading-relaxed">{initFeedback.text}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
