import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  Lock, 
  User as UserIcon, 
  AlertCircle, 
  HelpCircle,
  UserPlus,
  LogIn,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface LoginViewProps {
  onOpenSetupGuide?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onOpenSetupGuide }) => {
  const { 
    login, 
    setupFirstAdmin, 
    connectionState, 
    connectionError, 
    checkConnection,
    structureInfo,
    pengaturan,
    isDatabaseSetupDone
  } = useApp();

  // Database setup dinyatakan selesai jika sudah ditandai, struktur tab valid, atau admin/pengguna sudah ada
  const isSetupCompleted = isDatabaseSetupDone || Boolean(
    connectionState === 'CONNECTED' && (
      structureInfo?.is_fully_valid ||
      structureInfo?.has_admin ||
      (structureInfo?.connected && (!structureInfo.missing_sheets || structureInfo.missing_sheets.length === 0)) ||
      ((structureInfo?.total_users ?? 0) > 0)
    )
  );

  // Mode: login biasa atau setup admin pertama resmi
  const [isSetupMode, setIsSetupMode] = useState<boolean>(false);

  // Form Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Form Setup Admin Pertama
  const [setupUsername, setSetupUsername] = useState('admin_tatib');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupNama, setSetupNama] = useState('Administrator Tatib SMPN 2');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage('Harap isi nama pengguna dan kata sandi.');
      return;
    }

    setIsLoading(true);
    const result = await login(username.trim(), password);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Autentikasi gagal.');
      if (result.needs_initial_setup) {
        setIsSetupMode(true);
      }
    }
  };

  const handleSetupAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!setupUsername.trim() || !setupPassword || !setupNama.trim()) {
      setErrorMessage('Semua data pembuatan administrator resmi wajib diisi.');
      return;
    }

    if (setupPassword.length < 6) {
      setErrorMessage('Kata sandi administrator minimal 6 karakter.');
      return;
    }

    setIsLoading(true);
    const result = await setupFirstAdmin(setupUsername.trim(), setupPassword, setupNama.trim());
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Gagal membuat administrator pertama.');
    } else {
      setSuccessMessage('Administrator resmi pertama berhasil dibuat dan sistem telah aktif!');
    }
  };

  const schoolName = pengaturan['NAMA_SEKOLAH'] || 'SMP Negeri 2 Kota Bengkulu';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-900 text-white flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-10 h-10 text-amber-400" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-extrabold text-slate-900">
          SIP-TATIB
        </h2>
        <p className="text-center text-sm font-semibold text-blue-900">
          {schoolName}
        </p>
        <p className="mt-1 text-center text-xs text-slate-500">
          Sistem Informasi Pencatatan Pelanggaran Tata Tertib Siswa
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          
          {/* Banner Status Koneksi Backend / Spreadsheet */}
          {connectionState === 'UNCONFIGURED' && (
            <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Backend Belum Dikonfigurasi</div>
                  <div className="mt-1 leading-relaxed">
                    URL Google Apps Script Web App belum dipasang di konfigurasi deployment.
                  </div>
                  <button
                    onClick={onOpenSetupGuide}
                    type="button"
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 text-white font-medium rounded-md hover:bg-amber-800 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Buka Panduan Setup & Salin Kode
                  </button>
                </div>
              </div>
            </div>
          )}

          {connectionState === 'ERROR' && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-900 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">Gagal Terhubung ke Google Spreadsheet</div>
                  <div className="mt-1 leading-relaxed">{connectionError}</div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={checkConnection}
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-700 text-white font-medium rounded-md hover:bg-red-800 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Coba Lagi
                    </button>
                    <button
                      onClick={onOpenSetupGuide}
                      type="button"
                      className="px-3 py-1.5 border border-red-300 text-red-800 font-medium rounded-md hover:bg-red-100 transition-colors"
                    >
                      Petunjuk Konfigurasi
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifikasi Error Login / Setup */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Mode 1: Login Akun Terdaftar */}
          {!isSetupMode ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Pengguna (Username)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: admin_tatib / bk_smpn2"
                    className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || connectionState !== 'CONNECTED'}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  {isLoading ? 'Memverifikasi ke Spreadsheet...' : 'Masuk ke Sistem'}
                </button>
              </div>

              {structureInfo && !structureInfo.has_admin && (
                <div className="pt-3 text-center">
                  <button
                    type="button"
                    onClick={() => setIsSetupMode(true)}
                    className="text-xs font-medium text-blue-800 hover:underline inline-flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Belum ada admin? Setup akun administrator pertama
                  </button>
                </div>
              )}
            </form>
          ) : (
            /* Mode 2: Setup Administrator Pertama Resmi */
            <form onSubmit={handleSetupAdminSubmit} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  Setup Akun Administrator Pertama
                </div>
                <p className="mt-1 text-slate-700 leading-relaxed">
                  Database Spreadsheet belum memiliki akun. Buat akun Administrator resmi pertama untuk mengelola seluruh data tata tertib.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Administrator
                </label>
                <input
                  type="text"
                  required
                  value={setupNama}
                  onChange={(e) => setSetupNama(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username Administrator
                </label>
                <input
                  type="text"
                  required
                  value={setupUsername}
                  onChange={(e) => setSetupUsername(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi Baru (Min. 6 Karakter)
                </label>
                <input
                  type="password"
                  required
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Kata sandi akan di-hash secara aman menggunakan SHA-256 + Salt di Spreadsheet.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSetupMode(false)}
                  className="w-1/3 py-2 px-3 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isLoading || connectionState !== 'CONNECTED'}
                  className="w-2/3 py-2 px-3 border border-transparent rounded-lg text-xs font-semibold text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-50"
                >
                  {isLoading ? 'Menyimpan ke Spreadsheet...' : 'Buat Akun Administrator'}
                </button>
              </div>
            </form>
          )}

          {/* Footer Card: "Bantuan Setup" ditiadakan setelah setup database dilakukan */}
          <div className={`mt-6 pt-4 border-t border-slate-100 flex items-center ${!isSetupCompleted && onOpenSetupGuide ? 'justify-between' : 'justify-center'} text-xs text-slate-500`}>
            <span>{schoolName}</span>
            {!isSetupCompleted && onOpenSetupGuide && (
              <button
                type="button"
                onClick={onOpenSetupGuide}
                className="text-blue-900 font-medium hover:underline flex items-center gap-1 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Bantuan Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
