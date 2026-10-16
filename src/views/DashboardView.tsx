import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  AlertTriangle, 
  HeartHandshake, 
  Flame, 
  MessageSquareOff, 
  TrendingUp, 
  Users,
  Inbox
} from 'lucide-react';
import { getEffectivePoin } from '../utils/pointCalculator';

export const DashboardView: React.FC = () => {
  const { 
    laporan, 
    siswa, 
    kelas, 
    tindakLanjut, 
    notifikasi, 
    pengaturan,
    isLoadingData,
    refreshData
  } = useApp();

  const periodeAktif = pengaturan['PERIODE_PERHITUNGAN_PEMBINAAN'] || '';
  const tahunAjaranAktif = pengaturan['TAHUN_AJARAN_AKTIF'] || '2026/2027';

  const [selectedTahun, setSelectedTahun] = useState<string>(tahunAjaranAktif);

  // Filter laporan valid berdasarkan tahun / periode
  const validLaporan = useMemo(() => {
    return laporan.filter(l => l.status_data === 'VALID');
  }, [laporan]);

  // Statistik Real
  const stats = useMemo(() => {
    const totalLaporan = validLaporan.length;
    
    // Pembinaan belum ditindaklanjuti
    const belumDitindaklanjuti = tindakLanjut.filter(t => t.status === 'BELUM').length;

    // Kejadian berpoin
    const kejadianBerpoin = validLaporan.filter(l => getEffectivePoin(l, pengaturan['SKEMA_POIN_PELANGGARAN']) > 0).length;

    // Total poin
    const totalPoin = validLaporan.reduce((acc, curr) => acc + getEffectivePoin(curr, pengaturan['SKEMA_POIN_PELANGGARAN']), 0);

    // Notifikasi gagal
    const notifGagal = notifikasi.filter(n => n.status_pengiriman === 'GAGAL').length;

    return {
      totalLaporan,
      belumDitindaklanjuti,
      kejadianBerpoin,
      totalPoin,
      notifGagal
    };
  }, [validLaporan, tindakLanjut, notifikasi, pengaturan]);

  // Rekap per Kelas
  const rekapPerKelas = useMemo(() => {
    const map: Record<string, { namaKelas: string; jumlahKejadian: number; totalPoin: number }> = {};

    kelas.forEach(k => {
      map[k.kelas_id] = {
        namaKelas: k.nama_kelas,
        jumlahKejadian: 0,
        totalPoin: 0
      };
    });

    validLaporan.forEach(l => {
      const s = siswa.find(x => x.siswa_id === l.siswa_id);
      if (s && map[s.kelas_id]) {
        map[s.kelas_id].jumlahKejadian += 1;
        map[s.kelas_id].totalPoin += getEffectivePoin(l, pengaturan['SKEMA_POIN_PELANGGARAN']);
      }
    });

    return Object.values(map).sort((a, b) => b.totalPoin - a.totalPoin);
  }, [validLaporan, siswa, kelas, pengaturan]);

  // Top Siswa Berpoin
  const topSiswa = useMemo(() => {
    const map: Record<string, { siswaId: string; nama: string; nisn: string; namaKelas: string; totalPoin: number; jumlahKejadian: number }> = {};

    validLaporan.forEach(l => {
      const s = siswa.find(x => x.siswa_id === l.siswa_id);
      if (!s) return;
      const k = kelas.find(x => x.kelas_id === s.kelas_id);

      if (!map[s.siswa_id]) {
        map[s.siswa_id] = {
          siswaId: s.siswa_id,
          nama: s.nama_lengkap,
          nisn: s.nisn,
          namaKelas: k ? k.nama_kelas : '-',
          totalPoin: 0,
          jumlahKejadian: 0
        };
      }
      map[s.siswa_id].totalPoin += getEffectivePoin(l, pengaturan['SKEMA_POIN_PELANGGARAN']);
      map[s.siswa_id].jumlahKejadian += 1;
    });

    return Object.values(map)
      .filter(x => x.totalPoin > 0)
      .sort((a, b) => b.totalPoin - a.totalPoin)
      .slice(0, 5);
  }, [validLaporan, siswa, kelas, pengaturan]);

  return (
    <div className="space-y-6">
      {/* Header Halaman & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Dashboard Statistik Kedisiplinan
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Data operasional nyata dari Google Spreadsheet SMPN 2 Kota Bengkulu
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
            <span className="text-slate-500">Periode Aktif: </span>
            <strong className="text-slate-900">{periodeAktif || 'Belum Ditetapkan'}</strong>
          </div>
          <button
            onClick={() => refreshData()}
            disabled={isLoadingData}
            className="text-xs px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-700 font-semibold transition-colors"
          >
            {isLoadingData ? 'Menyinkronkan...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Peringatan jika Periode Belum Ditetapkan */}
      {!periodeAktif && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Peringatan Periode Perhitungan Pembinaan:</span>
            <p className="mt-0.5">
              Periode perhitungan pembinaan belum ditetapkan pada menu Pengaturan. Administrator wajib menetapkan periode perhitungan sebelum melakukan pencatatan pelanggaran baru.
            </p>
          </div>
        </div>
      )}

      {/* Kartu Statistik Utama (5 Cards Sesuai Spesifikasi Bagian F) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Laporan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Laporan Valid</span>
            <AlertTriangle className="w-4 h-4 text-blue-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{stats.totalLaporan}</span>
            <span className="text-xs text-slate-500">kejadian</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Tersimpan di Spreadsheet</p>
        </div>

        {/* Card 2: Pembinaan Belum Ditindaklanjuti */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Pembinaan Terbuka</span>
            <HeartHandshake className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-700">{stats.belumDitindaklanjuti}</span>
            <span className="text-xs text-slate-500">menunggu</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Belum ditindaklanjuti wali kelas</p>
        </div>

        {/* Card 3: Kejadian Berpoin */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Kejadian Berpoin</span>
            <TrendingUp className="w-4 h-4 text-purple-700" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{stats.kejadianBerpoin}</span>
            <span className="text-xs text-slate-500">kasus</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Pelanggaran menghasilkan poin</p>
        </div>

        {/* Card 4: Total Poin Diberikan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Poin</span>
            <Flame className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-red-700">{stats.totalPoin}</span>
            <span className="text-xs text-slate-500">poin</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Akumulasi seluruh siswa</p>
        </div>

        {/* Card 5: Notifikasi Gagal */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Notifikasi WA Gagal</span>
            <MessageSquareOff className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-rose-700">{stats.notifGagal}</span>
            <span className="text-xs text-slate-500">antrean</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Perlu tindak lanjut / kirim ulang</p>
        </div>
      </div>

      {/* Grid Dua Kolom: Rekap per Kelas & Daftar Siswa Poin Tertinggi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rekap per Kelas */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Rekap Pelanggaran per Kelas
            </h2>
            <span className="text-xs text-slate-400">{rekapPerKelas.length} kelas</span>
          </div>

          {rekapPerKelas.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Belum ada data kelas yang terdaftar di Spreadsheet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2 font-semibold">Nama Kelas</th>
                    <th className="pb-2 font-semibold text-right">Jumlah Laporan</th>
                    <th className="pb-2 font-semibold text-right">Total Poin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rekapPerKelas.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 font-medium text-slate-800">{item.namaKelas}</td>
                      <td className="py-2.5 text-right text-slate-600">{item.jumlahKejadian}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">{item.totalPoin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Siswa dengan Poin Tertinggi */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Siswa dengan Poin Tertinggi
            </h2>
            <span className="text-xs text-slate-400">Top 5</span>
          </div>

          {topSiswa.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Belum ada siswa dengan catatan poin pelanggaran aktif di Spreadsheet.
            </div>
          ) : (
            <div className="space-y-3">
              {topSiswa.map((item, idx) => (
                <div key={item.siswaId} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{item.nama}</div>
                      <div className="text-[11px] text-slate-500">
                        NISN: {item.nisn} · Kelas {item.namaKelas}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-red-700">{item.totalPoin}</span>
                    <span className="text-[10px] text-slate-500 block">poin ({item.jumlahKejadian} lap)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
