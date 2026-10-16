/**
 * Report Exporter Utility
 * Menghasilkan ekspor Excel (.xls) berformat rapi lengkap dengan Kop Surat Kedinasan,
 * tabel bergaris & berwarna, ringkasan statistik, serta kolom tanda tangan Kepala Sekolah & NIP.
 */

export interface SchoolKopData {
  namaSekolah: string;
  instansiInduk?: string;
  alamatSekolah: string;
  telpSekolah?: string;
  emailSekolah?: string;
  websiteSekolah?: string;
  logoSekolah?: string;
  namaKepalaSekolah: string;
  nipKepalaSekolah: string;
  kotaPengesahan?: string;
  jabatanPenanggungJawab2?: string;
  namaPenanggungJawab2?: string;
  nipPenanggungJawab2?: string;
}

export interface RekapKelasItem {
  kelas_id: string;
  nama_kelas: string;
  jumlahSiswa: number;
  totalKejadian: number;
  totalPembinaan: number;
  totalBerpoin: number;
  totalPoin: number;
  rasioPoin: number;
}

export interface RincianPelanggaranItem {
  laporan_id: string;
  tanggal_kejadian: string;
  jam_kejadian: string;
  nisn: string;
  nama_siswa: string;
  nama_kelas: string;
  kode_pelanggaran: string;
  uraian_pelanggaran: string;
  bobot_snapshot: number;
  urutan_ke: number;
  status_hasil: string;
  poin_diberikan: number;
  user_id_pencatat: string;
  status_data: string;
  catatan?: string;
}

export interface ReportExportOptions {
  title: string;
  periodeLabel: string;
  kelasLabel: string;
  kop: SchoolKopData;
  summary: {
    totalValid: number;
    totalPembinaan: number;
    totalBerpoin: number;
    totalPoin: number;
  };
  rekapKelas: RekapKelasItem[];
  rincianLaporan: RincianPelanggaranItem[];
  rumusIndikator?: string;
}

/**
 * Format tanggal Indonesia (contoh: 14 Oktober 2026)
 */
export function formatTanggalIndo(dateStr?: string | Date): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const day = d.getDate();
  const month = bulan[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Buat dan unduh file Excel (.xls) berformat rapi dengan Kop Surat Resmi & Tanda Tangan NIP
 */
export function exportNeatExcel(options: ReportExportOptions, filename?: string) {
  const { kop, summary, rekapKelas, rincianLaporan, title, periodeLabel, kelasLabel, rumusIndikator } = options;

  const todayStr = formatTanggalIndo();
  const namaSekolah = (kop.namaSekolah || 'SMP NEGERI 2 KOTA BENGKULU').toUpperCase();
  const instansiInduk = (kop.instansiInduk || 'PEMERINTAH KOTA BENGKULU\nDINAS PENDIDIKAN DAN KEBUDAYAAN').toUpperCase();
  const alamat = kop.alamatSekolah || 'Jl. Prof. Dr. Hazairin No. 2, Penurunan, Kec. Ratu Samban, Kota Bengkulu';
  const telp = kop.telpSekolah ? `Telp. ${kop.telpSekolah}` : '';
  const email = kop.emailSekolah ? `Email: ${kop.emailSekolah}` : '';
  const web = kop.websiteSekolah ? `Website: ${kop.websiteSekolah}` : '';
  const kontakStr = [telp, email, web].filter(Boolean).join(' | ');

  const namaKepsek = kop.namaKepalaSekolah || 'Malis Hartanto, M.Pd.';
  const nipKepsek = kop.nipKepalaSekolah || '19700512 199503 1 003';
  const kota = kop.kotaPengesahan || 'Kota Bengkulu';

  const jabatanPj2 = kop.jabatanPenanggungJawab2 || 'Wakasek Kesiswaan / Koordinator BK';
  const namaPj2 = kop.namaPenanggungJawab2 || 'Drs. H. Syahril, M.Pd.';
  const nipPj2 = kop.nipPenanggungJawab2 || '19720815 199802 1 002';

  // Kolom total untuk colspan
  const maxCols = 15;

  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Rekap Pelanggaran</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
              <x:Print>
                <x:ValidPrinterInfo/>
                <x:Orientation>Landscape</x:Orientation>
              </x:Print>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <style>
      body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1e293b; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
      th, td { padding: 6px 8px; vertical-align: middle; }
      .kop-instansi { font-size: 12pt; font-weight: bold; text-align: center; color: #0f172a; }
      .kop-sekolah { font-size: 16pt; font-weight: 800; text-align: center; color: #1e3a8a; letter-spacing: 0.5px; }
      .kop-alamat { font-size: 10pt; text-align: center; color: #475569; }
      .kop-kontak { font-size: 9pt; text-align: center; color: #64748b; }
      .kop-border { border-bottom: 3px double #0f172a; }
      .title-doc { font-size: 14pt; font-weight: bold; text-align: center; color: #0f172a; text-transform: uppercase; }
      .subtitle-doc { font-size: 10.5pt; text-align: center; color: #334155; }
      .meta-box { background-color: #f1f5f9; font-size: 10pt; font-weight: bold; color: #1e293b; border: 1px solid #cbd5e1; }
      
      .table-data { border: 1px solid #94a3b8; }
      .table-data th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; font-size: 10pt; border: 1px solid #64748b; text-align: center; }
      .table-data th.th-green { background-color: #065f46; }
      .table-data td { border: 1px solid #cbd5e1; font-size: 10pt; }
      .tr-even { background-color: #f8fafc; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-left { text-align: left; }
      .font-bold { font-weight: bold; }
      .badge-pembinaan { color: #1d4ed8; font-weight: bold; }
      .badge-berpoin { color: #b91c1c; font-weight: bold; }
      .badge-valid { color: #047857; font-weight: bold; }
      .section-heading { font-size: 11pt; font-weight: bold; color: #0f172a; background-color: #e2e8f0; border-left: 4px solid #1e3a8a; padding: 6px 10px; }
      .sign-title { font-size: 10.5pt; text-align: center; }
      .sign-space { height: 70px; }
      .sign-name { font-size: 11pt; font-weight: bold; text-align: center; text-decoration: underline; }
      .sign-nip { font-size: 10pt; text-align: center; color: #334155; }
    </style>
  </head>
  <body>
    <table>
      <!-- KOP SURAT SEKOLAH -->
      <tr>
        <td colspan="${maxCols}" class="kop-instansi">
          ${instansiInduk.replace(/\n/g, '<br/>')}
        </td>
      </tr>
      <tr>
        <td colspan="${maxCols}" class="kop-sekolah">
          ${namaSekolah}
        </td>
      </tr>
      <tr>
        <td colspan="${maxCols}" class="kop-alamat">
          ${alamat}
        </td>
      </tr>
      ${kontakStr ? `
      <tr>
        <td colspan="${maxCols}" class="kop-kontak">
          ${kontakStr}
        </td>
      </tr>` : ''}
      <tr>
        <td colspan="${maxCols}" class="kop-border" style="height: 4px;"></td>
      </tr>
      <tr><td colspan="${maxCols}" style="height: 12px;"></td></tr>

      <!-- JUDUL LAPORAN -->
      <tr>
        <td colspan="${maxCols}" class="title-doc">
          ${title}
        </td>
      </tr>
      <tr>
        <td colspan="${maxCols}" class="subtitle-doc">
          <strong>Periode:</strong> ${periodeLabel} &nbsp;|&nbsp; <strong>Kelas:</strong> ${kelasLabel} &nbsp;|&nbsp; <strong>Tanggal Unduh:</strong> ${todayStr}
        </td>
      </tr>
      <tr><td colspan="${maxCols}" style="height: 10px;"></td></tr>

      <!-- RINGKASAN REKAPITULASI (KPI SUMMARY) -->
      <tr>
        <td colspan="${maxCols}" class="section-heading">
          RINGKASAN REKAPITULASI KETERTIBAN
        </td>
      </tr>
    </table>

    <table class="table-data" style="margin-bottom: 20px;">
      <thead>
        <tr>
          <th>Total Kejadian Sah</th>
          <th>Pembinaan Tahap 1–3 (0 Poin)</th>
          <th>Kejadian Berbobot Poin</th>
          <th>Akumulasi Poin Pelanggaran</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-center font-bold" style="font-size: 13pt; color: #0f172a;">${summary.totalValid} Kasus</td>
          <td class="text-center font-bold" style="font-size: 13pt; color: #1d4ed8;">${summary.totalPembinaan} Pembinaan</td>
          <td class="text-center font-bold" style="font-size: 13pt; color: #7e22ce;">${summary.totalBerpoin} Kasus</td>
          <td class="text-center font-bold" style="font-size: 13pt; color: #b91c1c;">${summary.totalPoin} Poin</td>
        </tr>
      </tbody>
    </table>

    <!-- TABEL 1: REKAPITULASI & PERBANDINGAN TINGKAT KETERTIBAN ANTARKELAS -->
    <table>
      <tr>
        <td colspan="${maxCols}" class="section-heading">
          1. REKAPITULASI & PERINGKAT KETERTIBAN ANTARKELAS
        </td>
      </tr>
      ${rumusIndikator ? `
      <tr>
        <td colspan="${maxCols}" style="font-size: 9.5pt; color: #475569; font-style: italic;">
          * Rumus Indikator Ketertiban: ${rumusIndikator}
        </td>
      </tr>` : ''}
    </table>

    <table class="table-data" style="margin-bottom: 24px;">
      <thead>
        <tr>
          <th style="width: 70px;">Peringkat</th>
          <th>Nama Kelas</th>
          <th style="width: 130px;">Jumlah Siswa Aktif</th>
          <th style="width: 110px;">Total Kasus</th>
          <th style="width: 140px;">Pembinaan (0 Poin)</th>
          <th style="width: 110px;">Berpoin</th>
          <th style="width: 120px;">Total Poin</th>
          <th style="width: 140px;">Rasio Poin/Siswa</th>
        </tr>
      </thead>
      <tbody>
        ${rekapKelas.length === 0 ? `
          <tr>
            <td colspan="8" class="text-center" style="padding: 16px; color: #94a3b8;">Tidak ada data kelas pada sistem.</td>
          </tr>
        ` : rekapKelas.map((k, idx) => `
          <tr class="${idx % 2 === 1 ? 'tr-even' : ''}">
            <td class="text-center font-bold">#${idx + 1}</td>
            <td class="font-bold">Kelas ${k.nama_kelas}</td>
            <td class="text-center">${k.jumlahSiswa} siswa</td>
            <td class="text-center font-bold">${k.totalKejadian}</td>
            <td class="text-center badge-pembinaan">${k.totalPembinaan}</td>
            <td class="text-center badge-berpoin">${k.totalBerpoin}</td>
            <td class="text-right font-bold" style="color: #b91c1c;">${k.totalPoin}</td>
            <td class="text-right font-bold" style="font-family: monospace;">${k.rasioPoin}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- TABEL 2: RINCIAN LENGKAP KEJADIAN PELANGGARAN -->
    <table>
      <tr>
        <td colspan="${maxCols}" class="section-heading">
          2. RINCIAN LENGKAP KEJADIAN PELANGGARAN SISWA
        </td>
      </tr>
    </table>

    <table class="table-data" style="margin-bottom: 30px;">
      <thead>
        <tr>
          <th class="th-green" style="width: 40px;">No</th>
          <th class="th-green" style="width: 100px;">ID Laporan</th>
          <th class="th-green" style="width: 90px;">Tanggal</th>
          <th class="th-green" style="width: 60px;">Jam</th>
          <th class="th-green" style="width: 100px;">NISN</th>
          <th class="th-green">Nama Lengkap Siswa</th>
          <th class="th-green" style="width: 80px;">Kelas</th>
          <th class="th-green" style="width: 80px;">Kode</th>
          <th class="th-green">Uraian Pelanggaran</th>
          <th class="th-green" style="width: 60px;">Bobot</th>
          <th class="th-green" style="width: 65px;">Urutan</th>
          <th class="th-green" style="width: 120px;">Klasifikasi</th>
          <th class="th-green" style="width: 70px;">Poin</th>
          <th class="th-green" style="width: 100px;">Petugas</th>
          <th class="th-green" style="width: 80px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rincianLaporan.length === 0 ? `
          <tr>
            <td colspan="${maxCols}" class="text-center" style="padding: 16px; color: #94a3b8;">
              Tidak ada data pelanggaran pada periode ini.
            </td>
          </tr>
        ` : rincianLaporan.map((item, idx) => `
          <tr class="${idx % 2 === 1 ? 'tr-even' : ''}">
            <td class="text-center">${idx + 1}</td>
            <td class="text-center" style="font-family: monospace; font-size: 9pt;">${item.laporan_id}</td>
            <td class="text-center">${item.tanggal_kejadian}</td>
            <td class="text-center">${item.jam_kejadian || '-'}</td>
            <td class="text-center" style="font-family: monospace;">'${item.nisn}</td>
            <td class="font-bold">${item.nama_siswa}</td>
            <td class="text-center">${item.nama_kelas}</td>
            <td class="text-center font-bold">${item.kode_pelanggaran}</td>
            <td>${item.uraian_pelanggaran}</td>
            <td class="text-center">${item.bobot_snapshot}</td>
            <td class="text-center">Ke-${item.urutan_ke}</td>
            <td class="text-center ${item.status_hasil === 'BERPOIN' ? 'badge-berpoin' : 'badge-pembinaan'}">
              ${item.status_hasil}
            </td>
            <td class="text-right font-bold ${item.poin_diberikan > 0 ? 'badge-berpoin' : ''}">
              ${item.poin_diberikan}
            </td>
            <td class="text-center">${item.user_id_pencatat}</td>
            <td class="text-center badge-valid">${item.status_data}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- LEMBAR PENGESAHAN / TANDA TANGAN (KOP LAPORAN DENGAN NIP) -->
    <table>
      <tr>
        <td colspan="5" class="sign-title">
          Mengetahui,<br/>
          Kepala Sekolah
        </td>
        <td colspan="5"></td>
        <td colspan="5" class="sign-title">
          ${kota}, ${todayStr}<br/>
          ${jabatanPj2}
        </td>
      </tr>
      <tr>
        <td colspan="5" class="sign-space"></td>
        <td colspan="5"></td>
        <td colspan="5" class="sign-space"></td>
      </tr>
      <tr>
        <td colspan="5" class="sign-name">
          ${namaKepsek}
        </td>
        <td colspan="5"></td>
        <td colspan="5" class="sign-name">
          ${namaPj2}
        </td>
      </tr>
      <tr>
        <td colspan="5" class="sign-nip">
          NIP. ${nipKepsek}
        </td>
        <td colspan="5"></td>
        <td colspan="5" class="sign-nip">
          NIP. ${nipPj2}
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `Laporan_Pelanggaran_SMPN2_${Date.now()}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Unduh CSV bersih dan rapi dengan UTF-8 BOM
 */
export function exportCleanCsv(
  headers: string[],
  rows: (string | number)[][],
  filename: string
) {
  const csvRows = [
    headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
    ...rows.map(row => 
      row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    )
  ];

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
