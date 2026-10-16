import {
  ApiResponse,
  StructureCheckResult,
  User,
  Siswa,
  Kelas,
  MasterPelanggaran,
  LaporanPelanggaran,
  TindakLanjut,
  NotifikasiWA,
  AuditLog,
  Pengaturan,
  UserRole
} from '../types';

// Ambil URL Apps Script dari konfigurasi deployment environment
const ENV_APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

// Simpan endpoint aktif (dapat diisi via deployment environment atau konfigurasi deployment)
let activeEndpointUrl: string = ENV_APPS_SCRIPT_URL;

export const getEndpointUrl = (): string => {
  return activeEndpointUrl;
};

export const setEndpointUrl = (url: string): void => {
  activeEndpointUrl = url.trim();
};

export const isEndpointConfigured = (): boolean => {
  return Boolean(activeEndpointUrl && activeEndpointUrl.startsWith('http'));
};

/**
 * Pemanggil utama Google Apps Script API
 * DILARANG menggunakan mock data atau fallback lokal jika terjadi kegagalan.
 */
async function callGasApi<T>(payload: Record<string, any>): Promise<ApiResponse<T>> {
  if (!isEndpointConfigured()) {
    return {
      success: false,
      error: 'Backend Google Apps Script belum dikonfigurasi. Harap tentukan VITE_APPS_SCRIPT_URL pada konfigurasi deployment.',
    };
  }

  try {
    const response = await fetch(activeEndpointUrl, {
      method: 'POST',
      headers: {
        // Menggunakan text/plain mencegah CORS OPTIONS preflight yang sering gagal di Google Apps Script
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Server backend merespons dengan status HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const jsonText = await response.text();
    let parsed: ApiResponse<T>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return {
        success: false,
        error: 'Respons dari Google Apps Script bukan format JSON yang valid. Pastikan Web App di-deploy dengan akses "Anyone".',
        details: jsonText.substring(0, 300),
      };
    }

    return parsed;
  } catch (err: any) {
    return {
      success: false,
      error: `Gagal terhubung ke Google Spreadsheet: ${err.message || 'Koneksi jaringan gagal atau diblokir.'}`,
    };
  }
}

export const api = {
  // 1. Pemeriksaan Struktur dan Konektivitas Spreadsheet
  async checkStructure(): Promise<ApiResponse<StructureCheckResult>> {
    return callGasApi<StructureCheckResult>({ action: 'check_structure' });
  },

  // 2. Inisialisasi Header Kolom Kosong (Tanpa Data Dummy)
  async initStructure(setupAdmin?: { username: string; password: string; nama: string }): Promise<ApiResponse<any>> {
    const postRes = await callGasApi({ action: 'init_structure', setup_admin: setupAdmin });
    if (postRes.success) {
      return postRes;
    }

    // Jika POST gagal atau terhambat CORS di browser, lakukan fallback ke GET Web App
    if (isEndpointConfigured()) {
      try {
        const url = new URL(activeEndpointUrl);
        url.searchParams.set('action', 'init_structure');
        const resp = await fetch(url.toString(), {
          method: 'GET',
          redirect: 'follow',
        });
        if (resp.ok) {
          const jsonText = await resp.text();
          const parsed = JSON.parse(jsonText);
          if (parsed && parsed.success) {
            return parsed;
          }
        }
      } catch (fallbackErr) {
        // Abaikan error fallback dan kembalikan error utama
      }
    }

    return postRes;
  },

  // 3. Autentikasi Pengguna Nyata
  async login(username: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    return callGasApi<{ user: User; token: string }>({
      action: 'auth_login',
      username,
      password,
    });
  },

  // 4. Setup Administrator Pertama Resmi
  async setupInitialAdmin(username: string, password: string, nama: string): Promise<ApiResponse<User>> {
    return callGasApi<User>({
      action: 'setup_initial_admin',
      username,
      password,
      nama,
    });
  },

  // 5. Ambil Semua Data Nyata dari Spreadsheet
  async getAllData(userRole: UserRole, userId: string): Promise<ApiResponse<{
    Users: User[];
    Siswa: Siswa[];
    Kelas: Kelas[];
    MasterPelanggaran: MasterPelanggaran[];
    LaporanPelanggaran: LaporanPelanggaran[];
    TindakLanjut: TindakLanjut[];
    NotifikasiWA: NotifikasiWA[];
    AuditLog: AuditLog[];
    Pengaturan: Array<{ kunci: string; nilai: string; waktu_pembaruan: string; user_id_pengubah: string }>;
    assigned_kelas_ids?: string[];
  }>> {
    return callGasApi({
      action: 'get_all_data',
      user_role: userRole,
      user_id: userId,
    });
  },

  // 6. Preview Perhitungan Pelanggaran Sebelum Disimpan
  async previewPelanggaran(siswaId: string, kodePelanggaran: string, tanggalKejadian: string, jamKejadian: string): Promise<ApiResponse<{
    siswa_id: string;
    kode_pelanggaran: string;
    uraian: string;
    bobot_snapshot: number;
    urutan_ke: number;
    status_hasil: 'PEMBINAAN_1' | 'PEMBINAAN_2' | 'PEMBINAAN_3' | 'BERPOIN';
    poin_diberikan: number;
    total_sebelumnya: number;
    periode_aktif: string;
  }>> {
    return callGasApi({
      action: 'preview_pelanggaran',
      siswa_id: siswaId,
      kode_pelanggaran: kodePelanggaran,
      tanggal_kejadian: tanggalKejadian,
      jam_kejadian: jamKejadian,
    });
  },

  // 7. Simpan Laporan Pelanggaran Nyata
  async simpanLaporan(data: {
    siswa_id: string;
    kode_pelanggaran: string;
    tanggal_kejadian: string;
    jam_kejadian: string;
    user_id_pencatat: string;
    catatan?: string;
  }): Promise<ApiResponse<any>> {
    return callGasApi({
      action: 'simpan_laporan',
      ...data,
    });
  },

  // 8. Batalkan Laporan dan Rekalkulasi Konsisten
  async batalkanLaporan(laporanId: string, alasan: string, userId: string): Promise<ApiResponse<any>> {
    return callGasApi({
      action: 'batalkan_laporan',
      laporan_id: laporanId,
      alasan,
      user_id: userId,
    });
  },

  // 9. Update Tindak Lanjut Wali Kelas
  async updateTindakLanjut(data: {
    tindak_lanjut_id: string;
    status: 'BELUM' | 'DALAM_PROSES' | 'SELESAI';
    tanggal_tindak_lanjut: string;
    catatan: string;
    user_id: string;
  }): Promise<ApiResponse<any>> {
    return callGasApi({
      action: 'update_tindak_lanjut',
      ...data,
    });
  },

  // 10. Update Status Pengiriman WhatsApp
  async updateNotifikasiWA(notifikasiId: string, statusPengiriman: string, detailKegagalan?: string): Promise<ApiResponse<any>> {
    return callGasApi({
      action: 'update_notifikasi_wa',
      notifikasi_id: notifikasiId,
      status_pengiriman: statusPengiriman,
      detail_kegagalan: detailKegagalan,
    });
  },

  // 11. CRUD Siswa
  async crudSiswa(payload: {
    sub_action: 'create' | 'update';
    siswa_id?: string;
    nisn?: string;
    nama_lengkap?: string;
    kelas_id?: string;
    tahun_ajaran?: string;
    status_aktif?: 'AKTIF' | 'NONAKTIF';
    user_id: string;
  }): Promise<ApiResponse<any>> {
    return callGasApi({
      action: 'crud_siswa',
      ...payload,
    });
  },

  // 12. CRUD Kelas
  async crudKelas(payload: {
    sub_action: 'create' | 'update';
    kelas_id?: string;
    nama_kelas?: string;
    tahun_ajaran?: string;
    wali_kelas_user_id?: string;
    nomor_wa_wali_kelas?: string;
    status_aktif?: 'AKTIF' | 'NONAKTIF';
    user_id: string;
  }): Promise<ApiResponse<any>> {
    return callGasApi({
      action: 'crud_kelas',
      ...payload,
    });
  },

  // 13. CRUD Master Pelanggaran
  async crudMasterPelanggaran(payload: {
    sub_action: 'create' | 'update';
    kode_pelanggaran?: string;
    uraian?: string;
    bobot_poin?: number;
    kategori?: string;
    status_aktif?: 'AKTIF' | 'NONAKTIF';
    catatan_aturan?: string;
    tanggal_mulai_berlaku?: string;
    user_id: string;
  }): Promise<ApiResponse<any>> {
    return callGasApi({
      action: 'crud_master_pelanggaran',
      ...payload,
    });
  },

  // 14. CRUD Pengguna
  async crudUser(payload: {
    sub_action: 'create' | 'update';
    user_id?: string;
    username?: string;
    password?: string;
    new_password?: string;
    nama?: string;
    peran?: UserRole;
    status_aktif?: 'AKTIF' | 'NONAKTIF';
    actor_id: string;
  }): Promise<ApiResponse<any>> {
    return callGasApi({
      action: 'crud_user',
      ...payload,
    });
  },

  // 15. Update Pengaturan
  async updatePengaturan(pengaturan: Record<string, string>, userId: string): Promise<ApiResponse<any>> {
    return callGasApi({
      action: 'update_pengaturan',
      pengaturan,
      user_id: userId,
    });
  },

  // 16. Rekalkulasi Seluruh Poin Siswa di Google Spreadsheet
  async rekalkulasiSemuaPoin(userId: string): Promise<ApiResponse<{ updated_count: number; message: string }>> {
    return callGasApi({
      action: 'rekalkulasi_semua_poin',
      user_id: userId,
    });
  },
};
