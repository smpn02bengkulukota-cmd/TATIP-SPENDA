import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  Building2, 
  Save, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Trash2, 
  UserCheck, 
  FileSpreadsheet,
  HelpCircle,
  Image as ImageIcon
} from 'lucide-react';
import { KopSuratHeader } from '../components/KopSuratHeader';
import { SchoolKopData, formatTanggalIndo } from '../utils/reportExporter';

export const KopLaporanView: React.FC = () => {
  const { pengaturan, currentUser, refreshData } = useApp();

  const [formValues, setFormValues] = useState({
    NAMA_SEKOLAH: '',
    NAMA_INSTANSI_INDUK: '',
    ALAMAT_SEKOLAH: '',
    TELP_SEKOLAH: '',
    EMAIL_SEKOLAH: '',
    WEBSITE_SEKOLAH: '',
    LOGO_SEKOLAH: '',
    NAMA_KEPALA_SEKOLAH: '',
    NIP_KEPALA_SEKOLAH: '',
    KOTA_PENGESAHAN: '',
    JABATAN_PENANGGUNG_JAWAB_2: '',
    NAMA_PENANGGUNG_JAWAB_2: '',
    NIP_PENANGGUNG_JAWAB_2: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    setFormValues({
      NAMA_SEKOLAH: pengaturan['NAMA_SEKOLAH'] || 'SMP Negeri 2 Kota Bengkulu',
      NAMA_INSTANSI_INDUK: pengaturan['NAMA_INSTANSI_INDUK'] || 'PEMERINTAH KOTA BENGKULU\nDINAS PENDIDIKAN DAN KEBUDAYAAN',
      ALAMAT_SEKOLAH: pengaturan['ALAMAT_SEKOLAH'] || 'Jl. Prof. Dr. Hazairin No. 2, Penurunan, Kec. Ratu Samban, Kota Bengkulu, Bengkulu 38222',
      TELP_SEKOLAH: pengaturan['TELP_SEKOLAH'] || '(0736) 21123',
      EMAIL_SEKOLAH: pengaturan['EMAIL_SEKOLAH'] || 'smpn02bengkulukota@gmail.com',
      WEBSITE_SEKOLAH: pengaturan['WEBSITE_SEKOLAH'] || 'https://smpn2kotabengkulu.sch.id',
      LOGO_SEKOLAH: pengaturan['LOGO_SEKOLAH'] || '',
      NAMA_KEPALA_SEKOLAH: pengaturan['NAMA_KEPALA_SEKOLAH'] || 'Malis Hartanto, M.Pd.',
      NIP_KEPALA_SEKOLAH: pengaturan['NIP_KEPALA_SEKOLAH'] || '19700512 199503 1 003',
      KOTA_PENGESAHAN: pengaturan['KOTA_PENGESAHAN'] || 'Kota Bengkulu',
      JABATAN_PENANGGUNG_JAWAB_2: pengaturan['JABATAN_PENANGGUNG_JAWAB_2'] || 'Wakil Kepala Sekolah Bidang Kesiswaan',
      NAMA_PENANGGUNG_JAWAB_2: pengaturan['NAMA_PENANGGUNG_JAWAB_2'] || 'Drs. H. Syahril, M.Pd.',
      NIP_PENANGGUNG_JAWAB_2: pengaturan['NIP_PENANGGUNG_JAWAB_2'] || '19720815 199802 1 002',
    });
  }, [pengaturan]);

  const handleChange = (key: string, val: string) => {
    setFormValues(prev => ({ ...prev, [key]: val }));
  };

  // Penanganan Upload File Logo Sekolah (diubah jadi Data URL Base64)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      setFeedback({ success: false, text: 'Ukuran logo maksimal 1.5 MB agar penyimpanan efisien.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFormValues(prev => ({ ...prev, LOGO_SEKOLAH: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormValues(prev => ({ ...prev, LOGO_SEKOLAH: '' }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!formValues.NAMA_SEKOLAH.trim()) {
      setFeedback({ success: false, text: 'Nama sekolah wajib diisi.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const res = await api.updatePengaturan(formValues, currentUser.user_id);
    setIsSaving(false);

    if (res.success) {
      setFeedback({ 
        success: true, 
        text: 'Identitas sekolah, logo, dan data Kepala Sekolah/NIP berhasil disimpan ke Google Spreadsheet!' 
      });
      await refreshData();
    } else {
      setFeedback({ success: false, text: res.error || 'Gagal menyimpan data ke Spreadsheet.' });
    }
  };

  const kopData: SchoolKopData = {
    namaSekolah: formValues.NAMA_SEKOLAH,
    instansiInduk: formValues.NAMA_INSTANSI_INDUK,
    alamatSekolah: formValues.ALAMAT_SEKOLAH,
    telpSekolah: formValues.TELP_SEKOLAH,
    emailSekolah: formValues.EMAIL_SEKOLAH,
    websiteSekolah: formValues.WEBSITE_SEKOLAH,
    logoSekolah: formValues.LOGO_SEKOLAH,
    namaKepalaSekolah: formValues.NAMA_KEPALA_SEKOLAH,
    nipKepalaSekolah: formValues.NIP_KEPALA_SEKOLAH,
    kotaPengesahan: formValues.KOTA_PENGESAHAN,
    jabatanPenanggungJawab2: formValues.JABATAN_PENANGGUNG_JAWAB_2,
    namaPenanggungJawab2: formValues.NAMA_PENANGGUNG_JAWAB_2,
    nipPenanggungJawab2: formValues.NIP_PENANGGUNG_JAWAB_2,
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Halaman */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <Building2 className="w-6 h-6 text-blue-900" />
          Kop & Pengesahan Laporan Resmi
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Atur nama sekolah, alamat, logo sekolah, serta identitas Kepala Sekolah dan NIP untuk kop surat dan pengesahan laporan kedinasan.
        </p>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
          feedback.success 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {feedback.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Form Konfigurasi Kop Laporan */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Bagian 1: Identitas Sekolah & Logo */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-800" />
              1. Identitas Sekolah & Logo Resmi (Kop Surat)
            </h2>
            <span className="text-[11px] text-slate-400">Tersimpan di Google Spreadsheet</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Resmi Sekolah <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formValues.NAMA_SEKOLAH}
                  onChange={(e) => handleChange('NAMA_SEKOLAH', e.target.value)}
                  placeholder="SMP Negeri 2 Kota Bengkulu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Instansi Induk / Dinas Pendidikan
                </label>
                <textarea
                  rows={2}
                  value={formValues.NAMA_INSTANSI_INDUK}
                  onChange={(e) => handleChange('NAMA_INSTANSI_INDUK', e.target.value)}
                  placeholder="PEMERINTAH KOTA BENGKULU&#10;DINAS PENDIDIKAN DAN KEBUDAYAAN"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-600 font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Gunakan baris baru (Enter) jika terdiri dari 2 baris instansi.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alamat Lengkap Sekolah <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formValues.ALAMAT_SEKOLAH}
                  onChange={(e) => handleChange('ALAMAT_SEKOLAH', e.target.value)}
                  placeholder="Jl. Prof. Dr. Hazairin No. 2, Penurunan, Kec. Ratu Samban, Kota Bengkulu"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Kolom Kanan: Logo Sekolah & Kontak */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Logo Sekolah (Otomatis tampil di Kop Surat)</span>
                  {formValues.LOGO_SEKOLAH && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="text-[11px] text-red-600 hover:text-red-800 flex items-center gap-1 font-normal"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus Logo
                    </button>
                  )}
                </label>

                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    {formValues.LOGO_SEKOLAH ? (
                      <img
                        src={formValues.LOGO_SEKOLAH}
                        alt="Logo Sekolah"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Unggah File Logo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Format PNG, JPG, atau SVG (maksimal 1.5 MB).
                    </p>
                  </div>
                </div>

                <div className="mt-2">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Atau masukkan URL Logo:</span>
                  <input
                    type="url"
                    value={formValues.LOGO_SEKOLAH.startsWith('data:') ? '' : formValues.LOGO_SEKOLAH}
                    onChange={(e) => handleChange('LOGO_SEKOLAH', e.target.value)}
                    placeholder="https://domain-sekolah.sch.id/logo.png"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Telepon</label>
                  <input
                    type="text"
                    value={formValues.TELP_SEKOLAH}
                    onChange={(e) => handleChange('TELP_SEKOLAH', e.target.value)}
                    placeholder="(0736) 21123"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Email</label>
                  <input
                    type="email"
                    value={formValues.EMAIL_SEKOLAH}
                    onChange={(e) => handleChange('EMAIL_SEKOLAH', e.target.value)}
                    placeholder="smpn02@gmail.com"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Website</label>
                  <input
                    type="text"
                    value={formValues.WEBSITE_SEKOLAH}
                    onChange={(e) => handleChange('WEBSITE_SEKOLAH', e.target.value)}
                    placeholder="smpn2bengkulukota.sch.id"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bagian 2: Kepala Sekolah & Penanggung Jawab Laporan (NIP & Pengesahan) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-800" />
              2. Kepala Sekolah & Lembar Pengesahan (NIP)
            </h2>
            <span className="text-[11px] text-slate-400">Tanda Tangan Pengesahan Laporan</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sisi Kiri: Kepala Sekolah */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-900 block border-b border-slate-200 pb-1.5">
                Identitas Kepala Sekolah (Wajib di Laporan)
              </span>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kepala Sekolah (Beserta Gelar) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formValues.NAMA_KEPALA_SEKOLAH}
                  onChange={(e) => handleChange('NAMA_KEPALA_SEKOLAH', e.target.value)}
                  placeholder="Contoh: Malis Hartanto, M.Pd."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIP Kepala Sekolah <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formValues.NIP_KEPALA_SEKOLAH}
                  onChange={(e) => handleChange('NIP_KEPALA_SEKOLAH', e.target.value)}
                  placeholder="Contoh: 19700512 199503 1 003"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono bg-white"
                />
              </div>
            </div>

            {/* Sisi Kanan: Penanggung Jawab 2 (Kesiswaan / Koordinator BK) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-900 block border-b border-slate-200 pb-1.5">
                Pejabat / Penanggung Jawab Teknis Kesiswaan/BK
              </span>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jabatan Penanggung Jawab
                </label>
                <input
                  type="text"
                  value={formValues.JABATAN_PENANGGUNG_JAWAB_2}
                  onChange={(e) => handleChange('JABATAN_PENANGGUNG_JAWAB_2', e.target.value)}
                  placeholder="Contoh: Wakil Kepala Sekolah Bid. Kesiswaan"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Penanggung Jawab (Beserta Gelar)
                </label>
                <input
                  type="text"
                  value={formValues.NAMA_PENANGGUNG_JAWAB_2}
                  onChange={(e) => handleChange('NAMA_PENANGGUNG_JAWAB_2', e.target.value)}
                  placeholder="Contoh: Drs. H. Syahril, M.Pd."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-semibold bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  NIP Penanggung Jawab
                </label>
                <input
                  type="text"
                  value={formValues.NIP_PENANGGUNG_JAWAB_2}
                  onChange={(e) => handleChange('NIP_PENANGGUNG_JAWAB_2', e.target.value)}
                  placeholder="Contoh: 19720815 199802 1 002"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kota Titimangsa Tanda Tangan
            </label>
            <input
              type="text"
              value={formValues.KOTA_PENGESAHAN}
              onChange={(e) => handleChange('KOTA_PENGESAHAN', e.target.value)}
              placeholder="Kota Bengkulu"
              className="max-w-xs w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
            />
            <span className="text-[10px] text-slate-400 ml-2">Akan muncul sebagai: &quot;Kota Bengkulu, [Tanggal]&quot;</span>
          </div>

          {/* Tombol Simpan */}
          <div className="pt-3 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Menyimpan ke Google Spreadsheet...' : 'Simpan Kop & Identitas Laporan'}
            </button>
          </div>
        </div>
      </form>

      {/* Bagian 3: Pratinjau Interaktif Kop Surat & Lembar Pengesahan */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-800" />
            Pratinjau Hasil Kop & Pengesahan Laporan Resmi
          </h2>
          <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-md">
            Otomatis Tercetak pada File Excel (.xls) & Dokumen PDF
          </span>
        </div>

        {/* Kotak Simulasi Lembar Kertas Laporan */}
        <div className="border border-slate-300 p-6 sm:p-8 rounded-lg bg-white shadow-inner max-w-4xl mx-auto space-y-6">
          {/* Header Kop Surat */}
          <KopSuratHeader kop={kopData} />

          {/* Contoh Judul Laporan */}
          <div className="text-center space-y-1">
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-900">
              LAPORAN REKAPITULASI PELANGGARAN TATA TERTIB SISWA
            </h3>
            <p className="text-[11px] text-slate-600">
              Periode: Bulan Berjalan &bull; Tahun Ajaran {pengaturan['TAHUN_AJARAN_AKTIF'] || '2026/2027'} &bull; Semua Kelas
            </p>
          </div>

          {/* Simulasi Tabel Mini */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-[10px] text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2">No</th>
                  <th className="p-2">Nama Siswa</th>
                  <th className="p-2">Kelas</th>
                  <th className="p-2">Kode & Pelanggaran</th>
                  <th className="p-2 text-center">Urutan</th>
                  <th className="p-2 text-center">Klasifikasi</th>
                  <th className="p-2 text-right">Poin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr>
                  <td className="p-2 text-slate-400">1</td>
                  <td className="p-2 font-semibold text-slate-800">[Nama Siswa Contoh]</td>
                  <td className="p-2">Kelas VII A</td>
                  <td className="p-2">[Keterangan Pelanggaran Siswa Sesuai Data Nyata]</td>
                  <td className="p-2 text-center">Ke-1</td>
                  <td className="p-2 text-center text-blue-700 font-semibold">PEMBINAAN_1</td>
                  <td className="p-2 text-right font-bold">0</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Simulasi Tanda Tangan Pengesahan (Kepala Sekolah & NIP) */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-slate-800">
            <div className="text-center">
              <div>Mengetahui,</div>
              <div className="font-semibold text-slate-900">Kepala Sekolah</div>
              <div className="h-16 flex items-center justify-center text-slate-300 italic text-[10px]">
                (Tanda tangan & Stempel Sekolah)
              </div>
              <div className="font-bold underline text-slate-900">
                {formValues.NAMA_KEPALA_SEKOLAH || 'Nama Kepala Sekolah Belum Diisi'}
              </div>
              <div className="text-slate-600 font-mono text-[11px]">
                NIP. {formValues.NIP_KEPALA_SEKOLAH || '-'}
              </div>
            </div>

            <div className="text-center">
              <div>{formValues.KOTA_PENGESAHAN || 'Kota Bengkulu'}, {formatTanggalIndo()}</div>
              <div className="font-semibold text-slate-900">
                {formValues.JABATAN_PENANGGUNG_JAWAB_2 || 'Wakasek Kesiswaan'}
              </div>
              <div className="h-16 flex items-center justify-center text-slate-300 italic text-[10px]">
                (Tanda tangan)
              </div>
              <div className="font-bold underline text-slate-900">
                {formValues.NAMA_PENANGGUNG_JAWAB_2 || 'Nama Pejabat Belum Diisi'}
              </div>
              <div className="text-slate-600 font-mono text-[11px]">
                NIP. {formValues.NIP_PENANGGUNG_JAWAB_2 || '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
