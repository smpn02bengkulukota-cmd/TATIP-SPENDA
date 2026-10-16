export type UserRole =
  | 'ADMIN'
  | 'WAKASEK_KESISWAAN'
  | 'GURU_BK'
  | 'TIM_KEDISIPLINAN'
  | 'KOORDINATOR_PIKET'
  | 'WALI_KELAS';

export interface User {
  user_id: string;
  username: string;
  nama: string;
  peran: UserRole;
  status_aktif: 'AKTIF' | 'NONAKTIF';
  tanggal_dibuat?: string;
  terakhir_login?: string;
}

export interface Siswa {
  siswa_id: string;
  nisn: string;
  nama_lengkap: string;
  kelas_id: string;
  tahun_ajaran: string;
  status_aktif: 'AKTIF' | 'NONAKTIF';
}

export interface Kelas {
  kelas_id: string;
  nama_kelas: string;
  tahun_ajaran: string;
  wali_kelas_user_id: string;
  nomor_wa_wali_kelas: string;
  status_aktif: 'AKTIF' | 'NONAKTIF';
}

export interface MasterPelanggaran {
  kode_pelanggaran: string;
  uraian: string;
  bobot_poin: number;
  kategori: string;
  status_aktif: 'AKTIF' | 'NONAKTIF';
  catatan_aturan: string;
  tanggal_mulai_berlaku: string;
}

export type StatusHasil = 'PEMBINAAN_1' | 'PEMBINAAN_2' | 'PEMBINAAN_3' | 'BERPOIN';
export type StatusData = 'VALID' | 'DIBATALKAN' | 'DIKOREKSI';

export interface LaporanPelanggaran {
  laporan_id: string;
  siswa_id: string;
  kode_pelanggaran: string;
  tanggal_kejadian: string;
  jam_kejadian: string;
  waktu_input: string;
  user_id_pencatat: string;
  bobot_snapshot: number;
  urutan_ke: number;
  status_hasil: StatusHasil;
  poin_diberikan: number;
  status_data: StatusData;
  catatan?: string;
}

export type StatusTindakLanjut = 'BELUM' | 'DALAM_PROSES' | 'SELESAI';

export interface TindakLanjut {
  tindak_lanjut_id: string;
  laporan_id: string;
  status: StatusTindakLanjut;
  tanggal_tindak_lanjut: string;
  catatan: string;
  user_id_wali_kelas: string;
  waktu_pembaruan: string;
}

export type StatusPengirimanWA = 'SIAP_KIRIM' | 'ANTRE' | 'TERKIRIM' | 'GAGAL' | 'DIBUKA_MANUAL';

export interface NotifikasiWA {
  notifikasi_id: string;
  laporan_id: string;
  penerima: string;
  nomor_tujuan: string;
  isi_pesan: string;
  waktu_dibuat: string;
  status_pengiriman: StatusPengirimanWA;
  waktu_kirim?: string;
  detail_kegagalan?: string;
  jumlah_percobaan: number;
}

export interface AuditLog {
  audit_id: string;
  user_id: string;
  waktu: string;
  aksi: string;
  nama_tabel: string;
  record_id: string;
  nilai_sebelum?: string;
  nilai_sesudah?: string;
  alasan_perubahan?: string;
}

export interface Pengaturan {
  [kunci: string]: string;
}

export interface StructureCheckResult {
  connected: boolean;
  spreadsheet_name?: string;
  spreadsheet_id?: string;
  sheets_status: {
    [sheetName: string]: {
      exists: boolean;
      missing_columns: string[];
      total_rows: number;
    };
  };
  is_fully_valid: boolean;
  missing_sheets: string[];
  total_users: number;
  has_admin: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}
