import React from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  AlertTriangle,
  HeartHandshake,
  History,
  Users,
  School,
  FileCode2,
  BarChart3,
  MessageSquare,
  UserCog,
  ScrollText,
  Building2,
  Settings,
  X
} from 'lucide-react';

interface SidebarProps {
  activeMenu: string;
  onSelectMenu: (key: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeMenu,
  onSelectMenu,
  isOpen,
  onClose
}) => {
  const { canAccess, currentUser } = useApp();

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'input_pelanggaran', label: 'Input Pelanggaran', icon: AlertTriangle },
    { key: 'pembinaan_wali_kelas', label: 'Pembinaan Wali Kelas', icon: HeartHandshake },
    { key: 'riwayat_poin', label: 'Riwayat Poin Pelanggaran', icon: History },
    { key: 'data_siswa', label: 'Data Siswa', icon: Users },
    { key: 'data_kelas', label: 'Data Kelas & Wali Kelas', icon: School },
    { key: 'master_pelanggaran', label: 'Master Kode Pelanggaran', icon: FileCode2 },
    { key: 'rekap_bulanan', label: 'Rekap Bulanan per Kelas', icon: BarChart3 },
    { key: 'notifikasi_wa', label: 'Notifikasi WhatsApp', icon: MessageSquare },
    { key: 'manajemen_user', label: 'Manajemen Pengguna', icon: UserCog },
    { key: 'audit_log', label: 'Log Aktivitas / Audit', icon: ScrollText },
    { key: 'kop_laporan', label: 'Kop & Pengesahan Laporan', icon: Building2 },
    { key: 'pengaturan', label: 'Pengaturan Sistem', icon: Settings },
  ];

  const renderNavItems = () => (
    <>
      <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
        Navigasi Operasional
      </div>

      {menuItems.map((item) => {
        const isAllowed = canAccess(item.key);
        const isActive = activeMenu === item.key;
        const Icon = item.icon;

        if (!isAllowed) {
          return null;
        }

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              onSelectMenu(item.key);
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors ${
              isActive
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </>
  );

  const renderFooter = () => (
    <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/60 shrink-0">
      <div className="truncate font-semibold text-slate-200">{currentUser?.nama || '-'}</div>
      <div className="truncate text-slate-400">{currentUser?.peran || '-'}</div>
      <div className="mt-1 text-[10px] text-slate-500">Database: Google Spreadsheet</div>
    </div>
  );

  return (
    <>
      {/* 1. Drawer Mobile (< md) dengan Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col z-50 shadow-2xl border-r border-slate-800">
            <div className="p-3.5 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                Menu Tata Tertib
              </span>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors"
                aria-label="Tutup Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {renderNavItems()}
            </nav>
            {renderFooter()}
          </aside>
        </div>
      )}

      {/* 2. Desktop In-flow Sidebar (>= md) - Berdampingan secara flexbox tanpa menutupi konten utama */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 bg-slate-900 text-slate-300 border-r border-slate-800 sticky top-16 h-[calc(100vh-4rem)] z-20">
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {renderNavItems()}
        </nav>
        {renderFooter()}
      </aside>
    </>
  );
};
