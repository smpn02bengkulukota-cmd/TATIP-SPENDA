/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { InputPelanggaranView } from './views/InputPelanggaranView';
import { PembinaanWaliKelasView } from './views/PembinaanWaliKelasView';
import { RiwayatPoinView } from './views/RiwayatPoinView';
import { DataSiswaView } from './views/DataSiswaView';
import { DataKelasView } from './views/DataKelasView';
import { MasterPelanggaranView } from './views/MasterPelanggaranView';
import { RekapBulananView } from './views/RekapBulananView';
import { NotifikasiWAView } from './views/NotifikasiWAView';
import { ManajemenUserView } from './views/ManajemenUserView';
import { AuditLogView } from './views/AuditLogView';
import { KopLaporanView } from './views/KopLaporanView';
import { PengaturanView } from './views/PengaturanView';
import { PanduanSetupView } from './views/PanduanSetupView';
import { AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';

const AppContent: React.FC = () => {
  const { 
    currentUser, 
    connectionState, 
    connectionError, 
    checkConnection, 
    canAccess 
  } = useApp();

  const [activeMenu, setActiveMenu] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showSetupGuide, setShowSetupGuide] = useState<boolean>(false);

  // Jika belum login, tampilkan layar login resmi
  if (!currentUser) {
    return (
      <>
        <LoginView onOpenSetupGuide={() => setShowSetupGuide(true)} />
        {showSetupGuide && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8">
              <PanduanSetupView onClose={() => setShowSetupGuide(false)} />
            </div>
          </div>
        )}
      </>
    );
  }

  // Tentukan komponen tampilan berdasarkan menu aktif
  const renderActiveView = () => {
    // Verifikasi otorisasi hak akses menu
    if (!canAccess(activeMenu) && activeMenu !== 'dashboard') {
      return (
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-900">Akses Tidak Diizinkan</h2>
          <p className="text-xs mt-1">Peran akun Anda tidak memiliki kewenangan untuk mengakses menu ini.</p>
        </div>
      );
    }

    switch (activeMenu) {
      case 'dashboard':
        return <DashboardView />;
      case 'input_pelanggaran':
        return <InputPelanggaranView />;
      case 'pembinaan_wali_kelas':
        return <PembinaanWaliKelasView />;
      case 'riwayat_poin':
        return <RiwayatPoinView />;
      case 'data_siswa':
        return <DataSiswaView />;
      case 'data_kelas':
        return <DataKelasView />;
      case 'master_pelanggaran':
        return <MasterPelanggaranView />;
      case 'rekap_bulanan':
        return <RekapBulananView />;
      case 'notifikasi_wa':
        return <NotifikasiWAView />;
      case 'manajemen_user':
        return <ManajemenUserView />;
      case 'audit_log':
        return <AuditLogView />;
      case 'kop_laporan':
        return <KopLaporanView />;
      case 'pengaturan':
        return <PengaturanView onOpenSetupGuide={() => setShowSetupGuide(true)} />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header Utama */}
      <Navbar
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        onOpenSetupGuide={() => setShowSetupGuide(true)}
      />

      <div className="flex-1 flex min-w-0">
        {/* Sidebar Navigasi Menu */}
        <Sidebar
          activeMenu={activeMenu}
          onSelectMenu={(menu) => setActiveMenu(menu)}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Konten Utama */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {/* Banner Peringatan jika Spreadsheet Gagal Terhubung */}
          {connectionState === 'ERROR' && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <span className="font-bold block">Gagal Terhubung ke Google Spreadsheet:</span>
                  <span className="text-red-800">{connectionError}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => checkConnection()}
                  className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Coba Lagi
                </button>
                <button
                  type="button"
                  onClick={() => setShowSetupGuide(true)}
                  className="px-3 py-1.5 bg-white border border-red-300 text-red-800 rounded-lg font-semibold hover:bg-red-50 transition-colors"
                >
                  Panduan Setup
                </button>
              </div>
            </div>
          )}

          {renderActiveView()}
        </main>
      </div>

      {/* Modal Panduan Deployment & Setup */}
      {showSetupGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8 shadow-2xl">
            <PanduanSetupView onClose={() => setShowSetupGuide(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
