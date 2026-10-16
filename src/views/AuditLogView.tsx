import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ScrollText, 
  Search, 
  RefreshCw, 
  Inbox,
  Clock,
  UserCheck
} from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const { auditLog, users, refreshData } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTabel, setFilterTabel] = useState('ALL');

  // Daftar tabel unik di log
  const tabelList = useMemo(() => {
    const setT = new Set<string>();
    auditLog.forEach(l => {
      if (l.nama_tabel) setT.add(l.nama_tabel);
    });
    return Array.from(setT);
  }, [auditLog]);

  // Log yang difilter dan diurutkan terbalik (terbaru di atas)
  const filteredLogs = useMemo(() => {
    const list = [...auditLog].reverse();
    return list.filter(item => {
      if (filterTabel !== 'ALL' && item.nama_tabel !== filterTabel) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const user = item.user_id.toLowerCase();
        const aksi = item.aksi.toLowerCase();
        const alasan = (item.alasan_perubahan || '').toLowerCase();
        const rec = item.record_id.toLowerCase();

        if (!user.includes(q) && !aksi.includes(q) && !alasan.includes(q) && !rec.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [auditLog, filterTabel, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Log Aktivitas & Jejak Audit (Audit Trail)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Rekaman kronologis setiap perubahan data, pembatalan laporan, dan otentikasi pada Google Spreadsheet.
          </p>
        </div>

        <button
          onClick={() => refreshData()}
          className="text-xs px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5 transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Log
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari user, aksi, ID record..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <label className="text-xs font-semibold text-slate-600">Filter Tabel:</label>
          <select
            value={filterTabel}
            onChange={(e) => setFilterTabel(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white"
          >
            <option value="ALL">Semua Tabel</option>
            {tabelList.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabel Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Belum ada aktivitas tercatat pada tab AuditLog Google Spreadsheet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Waktu Kejadian</th>
                  <th className="py-3 px-4">Pengguna (Actor)</th>
                  <th className="py-3 px-4">Aksi</th>
                  <th className="py-3 px-4">Tabel / Record ID</th>
                  <th className="py-3 px-4">Nilai Sebelum</th>
                  <th className="py-3 px-4">Nilai Sesudah</th>
                  <th className="py-3 px-4">Alasan Perubahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const actor = users.find(u => u.user_id === log.user_id);

                  return (
                    <tr key={log.audit_id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {log.waktu}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{actor ? actor.nama : log.user_id}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.user_id}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-950">
                        {log.aksi}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{log.nama_tabel}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.record_id}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate" title={log.nilai_sebelum}>
                        {log.nilai_sebelum || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-medium max-w-xs truncate" title={log.nilai_sesudah}>
                        {log.nilai_sesudah || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {log.alasan_perubahan || '-'}
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
