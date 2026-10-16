import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  RefreshCw, 
  LogOut, 
  Database, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  Menu
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenSetupGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onOpenSetupGuide }) => {
  const { 
    currentUser, 
    logout, 
    connectionState, 
    connectionError, 
    checkConnection, 
    refreshData, 
    isLoadingData,
    pengaturan
  } = useApp();

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrator';
      case 'WAKASEK_KESISWAAN': return 'Wakasek Kesiswaan';
      case 'GURU_BK': return 'Guru Bimbingan Konseling';
      case 'TIM_KEDISIPLINAN': return 'Tim Kedisiplinan';
      case 'KOORDINATOR_PIKET': return 'Koordinator Piket';
      case 'WALI_KELAS': return 'Wali Kelas';
      default: return role || '-';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Sisi Kiri: Tombol Menu Mobile & Identitas Sekolah */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            type="button"
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="Toggle navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-lg shadow-sm overflow-hidden shrink-0">
              {pengaturan['LOGO_SEKOLAH'] ? (
                <img
                  src={pengaturan['LOGO_SEKOLAH']}
                  alt="Logo Sekolah"
                  className="w-full h-full object-contain p-0.5 bg-white"
                />
              ) : (
                <ShieldCheck className="w-6 h-6 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base leading-tight">SIP-TATIB</span>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-semibold text-blue-900 tracking-wide uppercase">
                  {pengaturan['NAMA_SEKOLAH'] || 'SMP Negeri 2 Kota Bengkulu'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Sistem Pencatatan Pelanggaran & Pembinaan Siswa
              </p>
            </div>
          </div>
        </div>

        {/* Sisi Kanan: Status Spreadsheet, Sync Button, User Profile */}
        <div className="flex items-center gap-3">
          {/* Status Koneksi Spreadsheet */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium bg-slate-50">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>Spreadsheet:</span>
            {connectionState === 'CONNECTED' ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terhubung
              </span>
            ) : connectionState === 'CHECKING' ? (
              <span className="text-amber-600 font-semibold animate-pulse">Memeriksa...</span>
            ) : connectionState === 'UNCONFIGURED' ? (
              <button 
                onClick={onOpenSetupGuide}
                className="text-amber-700 font-semibold hover:underline flex items-center gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5" /> Belum Dikonfigurasi
              </button>
            ) : (
              <button 
                onClick={checkConnection}
                className="text-red-700 font-semibold hover:underline flex items-center gap-1"
                title={connectionError || 'Gagal terhubung'}
              >
                <AlertCircle className="w-3.5 h-3.5" /> Gagal Terhubung
              </button>
            )}
          </div>

          {/* Tombol Panduan / Pengaturan Deployment */}
          <button
            onClick={onOpenSetupGuide}
            type="button"
            className="p-2 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
            title="Panduan Deployment & Koneksi Spreadsheet"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden lg:inline">Panduan & Setup</span>
          </button>

          {/* Tombol Sinkronisasi Data Nyata */}
          {currentUser && (
            <button
              onClick={() => refreshData()}
              disabled={isLoadingData || connectionState !== 'CONNECTED'}
              type="button"
              className={`p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isLoadingData ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              title="Muat Ulang Data Nyata dari Google Spreadsheet"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden md:inline">Sinkronkan</span>
            </button>
          )}

          {/* Info Pengguna & Logout */}
          {currentUser && (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900">{currentUser.nama}</div>
                <div className="text-[11px] text-slate-500">{getRoleLabel(currentUser.peran)}</div>
              </div>
              <button
                onClick={logout}
                type="button"
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-red-600"
                title="Keluar Akun"
                aria-label="Keluar akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
