import { LaporanPelanggaran } from '../types';

/**
 * Membersihkan format tanggal dari Google Spreadsheet.
 * Menangani string seperti "2026-10-14 00:00:00", Date ISO string, dll.
 * Mengembalikan format bersih YYYY-MM-DD.
 */
export function formatCleanTanggal(val: any): string {
  if (!val) return '-';
  const str = String(val).trim();
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return str;
}

/**
 * Membersihkan format jam kejadian dari Google Spreadsheet.
 * Menangani anomali epoch Excel/Sheets seperti "1899-12-30 10:29:00" atau "10:29:00".
 * Mengembalikan format bersih HH:mm.
 */
export function formatCleanJam(val: any): string {
  if (!val) return '-';
  const str = String(val).trim();
  const match = str.match(/(\d{1,2}:\d{2})(?::\d{2})?/);
  if (match) return match[1];
  return str;
}

/**
 * Menghitung poin efektif dari sebuah laporan pelanggaran.
 * Secara standar, setiap pelanggaran tata tertib langsung menambahkan poin sesuai bobot pelanggaran.
 * Jika pada spreadsheet tersimpan poin 0 akibat aturan lama, fungsi ini secara cerdas
 * mengembalikan bobot_snapshot sehingga poin siswa langsung aktif dan akurat di seluruh modul.
 */
export function getEffectivePoin(
  laporan: LaporanPelanggaran,
  skemaPoin?: string
): number {
  if (laporan.status_data !== 'VALID') return 0;

  const savedPoin = Number(laporan.poin_diberikan) || 0;
  const bobotSnapshot = Number(laporan.bobot_snapshot) || 0;

  // Jika sekolah secara khusus memilih skema pembinaan bertahap 1-3 (kejadian 1-3 = 0 poin)
  if (skemaPoin === 'PEMBINAAN_BERTAHAP_1_3') {
    return savedPoin;
  }

  // Standar: Langsung berpoin sesuai bobot
  if (savedPoin > 0) {
    return savedPoin;
  }

  // Fallback cerdas: jika tersimpan 0 dari spreadsheet akibat aturan lama, gunakan bobot_snapshot
  return bobotSnapshot > 0 ? bobotSnapshot : 0;
}
