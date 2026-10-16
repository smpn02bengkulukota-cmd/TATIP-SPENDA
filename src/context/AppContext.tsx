import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  User,
  Siswa,
  Kelas,
  MasterPelanggaran,
  LaporanPelanggaran,
  TindakLanjut,
  NotifikasiWA,
  AuditLog,
  StructureCheckResult,
  UserRole
} from '../types';
import { api, isEndpointConfigured, getEndpointUrl, setEndpointUrl } from '../services/api';

type ConnectionState = 'UNCONFIGURED' | 'CHECKING' | 'CONNECTED' | 'ERROR';

interface AppContextType {
  // Autentikasi
  currentUser: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; needs_initial_setup?: boolean }>;
  logout: () => void;
  setupFirstAdmin: (username: string, password: string, nama: string) => Promise<{ success: boolean; error?: string }>;

  // Status Koneksi
  connectionState: ConnectionState;
  connectionError: string | null;
  endpointUrl: string;
  updateEndpointUrl: (url: string) => void;
  checkConnection: () => Promise<void>;
  structureInfo: StructureCheckResult | null;
  initEmptyStructure: (adminData?: { username: string; password: string; nama: string }) => Promise<{ success: boolean; message?: string; error?: string }>;
  isDatabaseSetupDone: boolean;

  // Data Nyata dari Spreadsheet
  isLoadingData: boolean;
  dataError: string | null;
  refreshData: () => Promise<void>;

  users: User[];
  siswa: Siswa[];
  kelas: Kelas[];
  masterPelanggaran: MasterPelanggaran[];
  laporan: LaporanPelanggaran[];
  tindakLanjut: TindakLanjut[];
  notifikasi: NotifikasiWA[];
  auditLog: AuditLog[];
  pengaturan: Record<string, string>;
  assignedKelasIds: string[];

  // Hak Akses Helper
  canAccess: (menuKey: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('CHECKING');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [endpointUrl, setEndpointState] = useState<string>(getEndpointUrl());
  const [structureInfo, setStructureInfo] = useState<StructureCheckResult | null>(null);
  const [isDatabaseSetupDone, setIsDatabaseSetupDone] = useState<boolean>(() => {
    try {
      return localStorage.getItem('SIP_TATIB_DB_SETUP_DONE') === 'true';
    } catch {
      return false;
    }
  });

  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // State Data Nyata
  const [users, setUsers] = useState<User[]>([]);
  const [siswa, setSiswa] = useState<Siswa[]>([]);
  const [kelas, setKelas] = useState<Kelas[]>([]);
  const [masterPelanggaran, setMasterPelanggaran] = useState<MasterPelanggaran[]>([]);
  const [laporan, setLaporan] = useState<LaporanPelanggaran[]>([]);
  const [tindakLanjut, setTindakLanjut] = useState<TindakLanjut[]>([]);
  const [notifikasi, setNotifikasi] = useState<NotifikasiWA[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [pengaturan, setPengaturan] = useState<Record<string, string>>({});
  const [assignedKelasIds, setAssignedKelasIds] = useState<string[]>([]);

  const updateEndpointUrl = (url: string) => {
    setEndpointUrl(url);
    setEndpointState(url);
    // Simpan ke sessionStorage sesi peramban semata untuk pengujian deploy
    try {
      sessionStorage.setItem('SIP_TATIB_ENDPOINT', url);
    } catch {}
  };

  // Cek koneksi ke Google Spreadsheet via GAS API
  const checkConnection = useCallback(async () => {
    if (!isEndpointConfigured()) {
      setConnectionState('UNCONFIGURED');
      setConnectionError('Backend Google Apps Script belum dikonfigurasi. Harap tentukan VITE_APPS_SCRIPT_URL pada konfigurasi deployment atau masukkan endpoint Web App.');
      setStructureInfo(null);
      return;
    }

    setConnectionState('CHECKING');
    setConnectionError(null);

    const res = await api.checkStructure();
    if (res.success && res.data) {
      setStructureInfo(res.data);
      const isDbReady = Boolean(
        res.data.is_fully_valid ||
        res.data.has_admin ||
        (res.data.sheets_status && (!res.data.missing_sheets || res.data.missing_sheets.length === 0)) ||
        (res.data.total_users && res.data.total_users > 0)
      );
      if (isDbReady) {
        setIsDatabaseSetupDone(true);
        try {
          localStorage.setItem('SIP_TATIB_DB_SETUP_DONE', 'true');
        } catch {}
      }
      setConnectionState('CONNECTED');
    } else {
      setConnectionState('ERROR');
      setConnectionError(res.error || 'Gagal terhubung ke Google Spreadsheet.');
      setStructureInfo(null);
    }
  }, []);

  // Muat ulang semua data nyata dari Spreadsheet
  const refreshData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingData(true);
    setDataError(null);

    const res = await api.getAllData(currentUser.peran, currentUser.user_id);
    if (res.success && res.data) {
      setUsers(res.data.Users || []);
      setSiswa(res.data.Siswa || []);
      setKelas(res.data.Kelas || []);
      setMasterPelanggaran(res.data.MasterPelanggaran || []);
      setLaporan(res.data.LaporanPelanggaran || []);
      setTindakLanjut(res.data.TindakLanjut || []);
      setNotifikasi(res.data.NotifikasiWA || []);
      setAuditLog(res.data.AuditLog || []);
      setAssignedKelasIds(res.data.assigned_kelas_ids || []);

      const pMap: Record<string, string> = {};
      if (Array.isArray(res.data.Pengaturan)) {
        res.data.Pengaturan.forEach((item) => {
          pMap[item.kunci] = item.nilai;
        });
      }
      setPengaturan(pMap);
    } else {
      setDataError(res.error || 'Gagal memuat data nyata dari Google Spreadsheet.');
    }
    setIsLoadingData(false);
  }, [currentUser]);

  // Cek koneksi awal saat mount
  useEffect(() => {
    try {
      const savedEndpoint = sessionStorage.getItem('SIP_TATIB_ENDPOINT');
      if (savedEndpoint && !getEndpointUrl()) {
        setEndpointUrl(savedEndpoint);
        setEndpointState(savedEndpoint);
      }
    } catch {}

    checkConnection();
  }, [checkConnection]);

  // Ambil data ketika user login
  useEffect(() => {
    if (currentUser && connectionState === 'CONNECTED') {
      refreshData();
    }
  }, [currentUser, connectionState, refreshData]);

  // Login handler
  const login = async (username: string, password: string) => {
    const res = await api.login(username, password);
    if (res.success && res.data?.user) {
      setCurrentUser(res.data.user);
      return { success: true };
    }
    return {
      success: false,
      error: res.error || 'Autentikasi gagal.',
      needs_initial_setup: res.details?.needs_initial_setup || res.error?.includes('Belum ada pengguna'),
    };
  };

  const logout = () => {
    setCurrentUser(null);
    setUsers([]);
    setSiswa([]);
    setKelas([]);
    setMasterPelanggaran([]);
    setLaporan([]);
    setTindakLanjut([]);
    setNotifikasi([]);
    setAuditLog([]);
  };

  const setupFirstAdmin = async (username: string, password: string, nama: string) => {
    const res = await api.setupInitialAdmin(username, password, nama);
    if (res.success && res.data) {
      setIsDatabaseSetupDone(true);
      try {
        localStorage.setItem('SIP_TATIB_DB_SETUP_DONE', 'true');
      } catch {}
      setCurrentUser(res.data);
      await checkConnection();
      return { success: true };
    }
    return { success: false, error: res.error || 'Gagal membuat akun Administrator pertama.' };
  };

  const initEmptyStructure = async (adminData?: { username: string; password: string; nama: string }) => {
    const res = await api.initStructure(adminData);
    if (res.success) {
      setIsDatabaseSetupDone(true);
      try {
        localStorage.setItem('SIP_TATIB_DB_SETUP_DONE', 'true');
      } catch {}
      await checkConnection();
      if (currentUser) {
        await refreshData();
      }
      return { success: true, message: res.message };
    }
    return { success: false, error: res.error || 'Gagal inisialisasi struktur tab.' };
  };

  // Pemeriksaan Hak Akses berdasarkan Peran Resmi
  const canAccess = (menuKey: string): boolean => {
    if (!currentUser) return false;
    const role: UserRole = currentUser.peran;

    if (role === 'ADMIN') return true;

    switch (menuKey) {
      case 'dashboard':
        return ['ADMIN', 'WAKASEK_KESISWAAN', 'GURU_BK', 'TIM_KEDISIPLINAN'].includes(role);
      case 'input_pelanggaran':
        return ['ADMIN', 'WAKASEK_KESISWAAN', 'GURU_BK', 'TIM_KEDISIPLINAN', 'KOORDINATOR_PIKET'].includes(role);
      case 'pembinaan_wali_kelas':
        return ['ADMIN', 'WAKASEK_KESISWAAN', 'GURU_BK', 'WALI_KELAS'].includes(role);
      case 'riwayat_poin':
        return ['ADMIN', 'WAKASEK_KESISWAAN', 'GURU_BK', 'TIM_KEDISIPLINAN', 'KOORDINATOR_PIKET', 'WALI_KELAS'].includes(role);
      case 'data_siswa':
        return ['ADMIN', 'WAKASEK_KESISWAAN', 'GURU_BK', 'TIM_KEDISIPLINAN', 'WALI_KELAS'].includes(role);
      case 'data_kelas':
        return ['ADMIN', 'WAKASEK_KESISWAAN'].includes(role);
      case 'master_pelanggaran':
        return ['ADMIN', 'WAKASEK_KESISWAAN'].includes(role);
      case 'rekap_bulanan':
        return ['ADMIN', 'WAKASEK_KESISWAAN', 'GURU_BK', 'TIM_KEDISIPLINAN', 'WALI_KELAS', 'KOORDINATOR_PIKET'].includes(role);
      case 'notifikasi_wa':
        return ['ADMIN', 'WAKASEK_KESISWAAN', 'TIM_KEDISIPLINAN'].includes(role);
      case 'manajemen_user':
        return false; // Hanya ADMIN (sudah diizinkan di atas)
      case 'audit_log':
        return ['ADMIN', 'WAKASEK_KESISWAAN'].includes(role);
      case 'kop_laporan':
        return ['ADMIN', 'WAKASEK_KESISWAAN', 'GURU_BK'].includes(role);
      case 'pengaturan':
        return ['ADMIN', 'WAKASEK_KESISWAAN'].includes(role);
      default:
        return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        login,
        logout,
        setupFirstAdmin,
        connectionState,
        connectionError,
        endpointUrl,
        updateEndpointUrl,
        checkConnection,
        structureInfo,
        initEmptyStructure,
        isDatabaseSetupDone,
        isLoadingData,
        dataError,
        refreshData,
        users,
        siswa,
        kelas,
        masterPelanggaran,
        laporan,
        tindakLanjut,
        notifikasi,
        auditLog,
        pengaturan,
        assignedKelasIds,
        canAccess,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
