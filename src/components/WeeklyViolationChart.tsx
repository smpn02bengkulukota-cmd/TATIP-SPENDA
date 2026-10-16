import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { 
  BarChart3, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  Flame, 
  Inbox,
  Filter
} from 'lucide-react';
import { LaporanPelanggaran } from '../types';
import { getEffectivePoin, formatCleanTanggal } from '../utils/pointCalculator';

interface WeeklyViolationChartProps {
  laporan: LaporanPelanggaran[];
  skemaPoin?: string;
}

interface WeeklyDataPoint {
  weekKey: string;
  label: string;
  fullDateRange: string;
  startDate: Date;
  endDate: Date;
  jumlahKasus: number;
  totalPoin: number;
  pembinaanCount: number;
  berpoinCount: number;
}

const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Dapatkan hari Senin awal minggu
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Dapatkan hari Minggu akhir minggu
function getEndOfWeek(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Format rentang tanggal pendek (cth: "6 - 12 Okt")
function formatWeekLabel(monday: Date, sunday: Date): string {
  const mDay = monday.getDate();
  const mMon = BULAN_PENDEK[monday.getMonth()];
  const sDay = sunday.getDate();
  const sMon = BULAN_PENDEK[sunday.getMonth()];

  if (mMon === sMon) {
    return `${mDay}-${sDay} ${mMon}`;
  }
  return `${mDay} ${mMon} - ${sDay} ${sMon}`;
}

// Format rentang tanggal lengkap untuk tooltip (cth: "06 Oktober 2026 - 12 Oktober 2026")
function formatFullDateRange(monday: Date, sunday: Date): string {
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  return `${monday.toLocaleDateString('id-ID', options)} - ${sunday.toLocaleDateString('id-ID', options)}`;
}

// Parse string tanggal dari spreadsheet secara aman
function parseCleanDate(val: any): Date | null {
  if (!val) return null;
  const clean = formatCleanTanggal(val);
  if (clean && clean !== '-') {
    const parts = clean.split('-');
    if (parts.length === 3) {
      const y = Number(parts[0]);
      const m = Number(parts[1]) - 1;
      const d = Number(parts[2]);
      const dt = new Date(y, m, d);
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  const fallback = new Date(val);
  return isNaN(fallback.getTime()) ? null : fallback;
}

interface WeeklyStatsSummary {
  chartData: WeeklyDataPoint[];
  peakWeek: WeeklyDataPoint | null;
  avgKasus: number;
  totalKasusPeriod: number;
  totalPoinPeriod: number;
}

export const WeeklyViolationChart: React.FC<WeeklyViolationChartProps> = ({
  laporan,
  skemaPoin
}) => {
  const [rangeFilter, setRangeFilter] = useState<'8' | '12' | 'all'>('8');
  const [metricView, setMetricView] = useState<'both' | 'kasus' | 'poin'>('both');

  // Filter hanya data valid
  const validReports = useMemo(() => {
    return (laporan || []).filter(l => l.status_data === 'VALID');
  }, [laporan]);

  // Bangun data tren mingguan
  const { chartData, peakWeek, avgKasus, totalKasusPeriod, totalPoinPeriod } = useMemo<WeeklyStatsSummary>(() => {
    if (validReports.length === 0) {
      return {
        chartData: [],
        peakWeek: null,
        avgKasus: 0,
        totalKasusPeriod: 0,
        totalPoinPeriod: 0
      };
    }

    // Identifikasi rentang tanggal laporan
    const reportDates: { report: LaporanPelanggaran; date: Date }[] = [];
    validReports.forEach(r => {
      const d = parseCleanDate(r.tanggal_kejadian);
      if (d) {
        reportDates.push({ report: r, date: d });
      }
    });

    if (reportDates.length === 0) {
      return {
        chartData: [],
        peakWeek: null,
        avgKasus: 0,
        totalKasusPeriod: 0,
        totalPoinPeriod: 0
      };
    }

    // Urutkan tanggal
    reportDates.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Tentukan minggu paling akhir (terbaru)
    const latestDate = reportDates[reportDates.length - 1].date;
    const now = new Date();
    // Gunakan tanggal terbaru dari laporan atau hari ini (mana yang lebih mutakhir)
    const anchorDate = latestDate.getTime() > now.getTime() ? latestDate : now;
    const endMonday = getStartOfWeek(anchorDate);

    // Tentukan jumlah minggu yang digenerate
    let weekCount = 8;
    if (rangeFilter === '12') weekCount = 12;
    if (rangeFilter === 'all') {
      const earliestDate = reportDates[0].date;
      const startMonday = getStartOfWeek(earliestDate);
      const diffWeeks = Math.ceil((endMonday.getTime() - startMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      weekCount = Math.max(diffWeeks, 8);
    }

    // Generate buckets mingguan (dari paling lampau ke paling baru)
    const buckets: WeeklyDataPoint[] = [];
    for (let i = weekCount - 1; i >= 0; i--) {
      const monday = new Date(endMonday);
      monday.setDate(monday.getDate() - (i * 7));
      const sunday = getEndOfWeek(monday);
      const weekKey = `${monday.getFullYear()}-W${Math.ceil((monday.getDate() + 6) / 7)}-${monday.getMonth() + 1}`;

      buckets.push({
        weekKey: `${monday.toISOString().slice(0, 10)}`,
        label: formatWeekLabel(monday, sunday),
        fullDateRange: formatFullDateRange(monday, sunday),
        startDate: monday,
        endDate: sunday,
        jumlahKasus: 0,
        totalPoin: 0,
        pembinaanCount: 0,
        berpoinCount: 0
      });
    }

    // Masukkan data laporan ke masing-masing bucket
    reportDates.forEach(({ report, date }) => {
      const bucket = buckets.find(b => date >= b.startDate && date <= b.endDate);
      if (bucket) {
        bucket.jumlahKasus += 1;
        const poin = getEffectivePoin(report, skemaPoin);
        bucket.totalPoin += poin;
        if (poin > 0) {
          bucket.berpoinCount += 1;
        } else {
          bucket.pembinaanCount += 1;
        }
      }
    });

    // Hitung ringkasan statistik
    let peak: WeeklyDataPoint | null = null;
    let sumKasus = 0;
    let sumPoin = 0;

    for (const b of buckets) {
      sumKasus += b.jumlahKasus;
      sumPoin += b.totalPoin;
      if (!peak || b.jumlahKasus > (peak?.jumlahKasus ?? 0)) {
        peak = b;
      }
    }

    const avg = buckets.length > 0 ? (sumKasus / buckets.length).toFixed(1) : '0';

    return {
      chartData: buckets,
      peakWeek: peak && (peak as WeeklyDataPoint).jumlahKasus > 0 ? peak : null,
      avgKasus: Number(avg),
      totalKasusPeriod: sumKasus,
      totalPoinPeriod: sumPoin
    };
  }, [validReports, rangeFilter, skemaPoin]);

  // Custom Tooltip Recharts
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: WeeklyDataPoint = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white text-xs p-3.5 rounded-xl shadow-xl border border-slate-700 max-w-xs z-50">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2.5">
            <Calendar className="w-4 h-4 text-blue-400" />
            <div>
              <p className="font-bold text-slate-100">{data.label}</p>
              <p className="text-[10px] text-slate-400">{data.fullDateRange}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" />
                Jumlah Kejadian:
              </span>
              <span className="font-extrabold text-blue-300 text-sm">{data.jumlahKasus} kasus</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
                Total Poin:
              </span>
              <span className="font-extrabold text-rose-300 text-sm">+{data.totalPoin} poin</span>
            </div>

            <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Kejadian Berpoin: <strong className="text-slate-200">{data.berpoinCount}</strong></span>
              <span>Pembinaan: <strong className="text-slate-200">{data.pembinaanCount}</strong></span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
      {/* Header Visualisasi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Tren Pelanggaran Mingguan
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Grafik batang dinamika kejadian dan akumulasi poin per minggu untuk memantau fluktuasi kedisiplinan
          </p>
        </div>

        {/* Filter & Metric Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tampilan Metrik */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setMetricView('both')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                metricView === 'both'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kasus & Poin
            </button>
            <button
              type="button"
              onClick={() => setMetricView('kasus')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                metricView === 'kasus'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kasus
            </button>
            <button
              type="button"
              onClick={() => setMetricView('poin')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                metricView === 'poin'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Poin
            </button>
          </div>

          {/* Rentang Minggu */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={rangeFilter}
              onChange={(e) => setRangeFilter(e.target.value as any)}
              className="bg-white border border-slate-300 text-slate-700 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="8">8 Minggu Terakhir</option>
              <option value="12">12 Minggu Terakhir</option>
              <option value="all">Semua Data Minggu</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ringkasan Indikator KPI Singkat */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] text-slate-500 block">Total Kasus Periode</span>
          <span className="text-lg font-bold text-slate-900 mt-0.5 inline-block">
            {totalKasusPeriod} <span className="text-xs font-normal text-slate-500">kejadian</span>
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] text-slate-500 block">Total Poin Akumulasi</span>
          <span className="text-lg font-bold text-rose-600 mt-0.5 inline-block">
            +{totalPoinPeriod} <span className="text-xs font-normal text-slate-500">poin</span>
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] text-slate-500 block">Rata-rata Mingguan</span>
          <span className="text-lg font-bold text-blue-600 mt-0.5 inline-block">
            {avgKasus} <span className="text-xs font-normal text-slate-500">kasus/mgg</span>
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
          <span className="text-[11px] text-slate-500 block">Puncak Pelanggaran</span>
          <span className="text-xs font-bold text-amber-700 mt-1 inline-block truncate max-w-full">
            {peakWeek ? `${peakWeek.label} (${peakWeek.jumlahKasus} kasus)` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Grafik Recharts atau Empty State */}
      {chartData.length === 0 || totalKasusPeriod === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
          <Inbox className="w-10 h-10 mx-auto mb-2.5 opacity-40 text-slate-400" />
          <p className="font-semibold text-slate-700">Belum Ada Pelanggaran pada Rentang Ini</p>
          <p className="text-slate-400 text-[11px] mt-1 max-w-md mx-auto">
            Data grafik akan otomatis terisi dan terkalkulasi saat ada laporan pelanggaran valid tercatat di Spreadsheet.
          </p>
        </div>
      ) : (
        <div className="mt-2 w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 15, right: metricView === 'both' ? 20 : 10, left: -10, bottom: 25 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                axisLine={{ stroke: '#cbd5e1' }}
                tickLine={false}
                angle={-15}
                textAnchor="end"
                interval={0}
              />
              {/* Sumbu Y Kiri untuk Jumlah Kasus */}
              {(metricView === 'both' || metricView === 'kasus') && (
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  label={{ 
                    value: 'Kasus', 
                    angle: -90, 
                    position: 'insideLeft', 
                    fill: '#2563eb',
                    fontSize: 11,
                    offset: 10
                  }}
                />
              )}
              {/* Sumbu Y Kanan untuk Total Poin (skala terpisah agar tidak jomplang) */}
              {(metricView === 'both' || metricView === 'poin') && (
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  label={{ 
                    value: 'Poin', 
                    angle: 90, 
                    position: 'insideRight', 
                    fill: '#e11d48',
                    fontSize: 11,
                    offset: 10
                  }}
                />
              )}
              <Tooltip content={<CustomChartTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
              />
              {(metricView === 'both' || metricView === 'kasus') && (
                <Bar 
                  yAxisId="left"
                  dataKey="jumlahKasus" 
                  name="Jumlah Kasus" 
                  fill="#2563eb" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              )}
              {(metricView === 'both' || metricView === 'poin') && (
                <Bar 
                  yAxisId={metricView === 'both' ? "right" : "left"}
                  dataKey="totalPoin" 
                  name="Total Poin" 
                  fill="#f43f5e" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Catatan / Keterangan Kaki */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
        <span className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          Poin dihitung otomatis berdasarkan skema aktif ({skemaPoin === 'PEMBINAAN_BERTAHAP_1_3' ? 'Pembinaan Bertahap 1-3' : 'Langsung Berpoin Sesuai Bobot'}).
        </span>
        <span className="text-slate-400">
          Siklus mingguan: Senin - Minggu
        </span>
      </div>
    </div>
  );
};
