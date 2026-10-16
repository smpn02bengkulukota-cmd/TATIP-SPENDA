import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { 
  MessageSquare, 
  Send, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Inbox,
  Clock,
  Phone
} from 'lucide-react';
import { NotifikasiWA, StatusPengirimanWA } from '../types';

export const NotifikasiWAView: React.FC = () => {
  const { 
    notifikasi, 
    laporan, 
    siswa, 
    kelas, 
    pengaturan, 
    currentUser, 
    refreshData 
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const nomorKesiswaan = pengaturan['NOMOR_WA_KESISWAAN'] || 'Belum Dikonfigurasi';
  const waGatewayUrl = pengaturan['WA_GATEWAY_API_URL'] || '';

  const canRetry = ['ADMIN', 'WAKASEK_KESISWAAN', 'TIM_KEDISIPLINAN'].includes(currentUser?.peran || '');

  const filteredNotifikasi = useMemo(() => {
    return notifikasi.filter(n => {
      if (filterStatus !== 'ALL' && n.status_pengiriman !== filterStatus) {
        return false;
      }
      return true;
    });
  }, [notifikasi, filterStatus]);

  // Handle Klik "Buka WhatsApp" (Catat DIBUKA_MANUAL secara sah)
  const handleOpenWhatsApp = async (item: NotifikasiWA) => {
    if (!item.nomor_tujuan) {
      return;
    }

    const cleanNum = String(item.nomor_tujuan).replace(/\D/g, '');
    const url = `https://wa.me/${cleanNum}?text=${encodeURIComponent(item.isi_pesan)}`;
    
    // Buka jendela WhatsApp
    try {
      window.open(url, '_blank');
    } catch (e) {}

    // Catat status DIBUKA_MANUAL di backend Spreadsheet
    await api.updateNotifikasiWA(item.notifikasi_id, 'DIBUKA_MANUAL');
    await refreshData();
  };

  // Handle Kirim Ulang oleh Pengguna Berwenang
  const handleKirimUlang = async (item: NotifikasiWA) => {
    if (!canRetry) return;

    setIsProcessing(item.notifikasi_id);

    // Jika ada Gateway otomatis, sistem dapat menembak endpoint gateway
    if (waGatewayUrl) {
      try {
        // Kirim via backend gateway
        await api.updateNotifikasiWA(item.notifikasi_id, 'ANTRE');
      } catch (e) {
        await api.updateNotifikasiWA(item.notifikasi_id, 'GAGAL', 'Gagal memanggil WhatsApp Gateway');
      }
    } else {
      // Buka via tautan WhatsApp langsung
      handleOpenWhatsApp(item);
    }

    setIsProcessing(null);
    await refreshData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Log Notifikasi WhatsApp Wali Kelas
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Daftar pengiriman pesan resmi tata tertib kepada wali kelas siswa yang bersangkutan.
        </p>
      </div>

      {/* Info Nomor Pengirim Sekolah */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs text-slate-400 block">Nomor WhatsApp Pengirim (Kesiswaan):</span>
          <div className="mt-1 flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-600" />
            <span className="font-mono font-bold text-slate-900 text-sm">{nomorKesiswaan}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Dapat diubah pada menu Pengaturan oleh Administrator.
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs text-slate-400 block">Metode Integrasi Aktif:</span>
          <div className="mt-1 text-sm font-bold text-slate-900">
            {waGatewayUrl ? 'WhatsApp Gateway API Resmi' : 'Tautan Langsung (wa.me) Terverifikasi'}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {waGatewayUrl ? `Endpoint: ${waGatewayUrl}` : 'Pencatatan status SIAP_KIRIM / DIBUKA_MANUAL / TERKIRIM secara sah.'}
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-700">Filter Status Pengiriman:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="SIAP_KIRIM">SIAP_KIRIM</option>
            <option value="DIBUKA_MANUAL">DIBUKA_MANUAL</option>
            <option value="TERKIRIM">TERKIRIM</option>
            <option value="GAGAL">GAGAL</option>
            <option value="ANTRE">ANTRE</option>
          </select>
        </div>

        <button
          onClick={() => refreshData()}
          className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Log
        </button>
      </div>

      {/* Tabel Notifikasi */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredNotifikasi.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Tidak ada riwayat notifikasi WhatsApp pada Google Spreadsheet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Waktu Dibuat</th>
                  <th className="py-3 px-4">Penerima</th>
                  <th className="py-3 px-4">Nomor WhatsApp</th>
                  <th className="py-3 px-4">Ringkasan Pesan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Percobaan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredNotifikasi.map((item) => {
                  const status = item.status_pengiriman;
                  const isSuccess = status === 'TERKIRIM' || status === 'DIBUKA_MANUAL';

                  return (
                    <tr key={item.notifikasi_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{item.waktu_dibuat}</div>
                        {item.waktu_kirim && (
                          <div className="text-[10px] text-slate-400">Kirim: {item.waktu_kirim}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.penerima}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800">
                        {item.nomor_tujuan || <span className="text-red-500 italic">Belum diisi</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-sm truncate" title={item.isi_pesan}>
                        {item.isi_pesan}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block text-[10px] font-bold ${
                          status === 'TERKIRIM'
                            ? 'text-emerald-700'
                            : status === 'DIBUKA_MANUAL'
                            ? 'text-blue-700'
                            : status === 'GAGAL'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 font-semibold">
                        {item.jumlah_percobaan}x
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenWhatsApp(item)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                            title="Buka WhatsApp Web / App"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Buka WA
                          </button>

                          {canRetry && (
                            <button
                              type="button"
                              onClick={() => handleKirimUlang(item)}
                              disabled={isProcessing === item.notifikasi_id}
                              className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50"
                              title="Kirim Ulang Pesan"
                            >
                              Kirim Ulang
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
