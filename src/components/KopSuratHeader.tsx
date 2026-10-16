import React from 'react';
import { SchoolKopData } from '../utils/reportExporter';
import { School } from 'lucide-react';

interface KopSuratHeaderProps {
  kop: SchoolKopData;
  className?: string;
}

export const KopSuratHeader: React.FC<KopSuratHeaderProps> = ({ kop, className = '' }) => {
  const instansiLines = (kop.instansiInduk || 'PEMERINTAH KOTA BENGKULU\nDINAS PENDIDIKAN DAN KEBUDAYAAN')
    .split('\n')
    .filter(Boolean);

  const namaSekolah = kop.namaSekolah || 'SMP NEGERI 2 KOTA BENGKULU';
  const alamat = kop.alamatSekolah || 'Jl. Prof. Dr. Hazairin No. 2, Penurunan, Kec. Ratu Samban, Kota Bengkulu';
  const telp = kop.telpSekolah ? `Telp. ${kop.telpSekolah}` : '';
  const email = kop.emailSekolah ? `Email: ${kop.emailSekolah}` : '';
  const web = kop.websiteSekolah ? `Website: ${kop.websiteSekolah}` : '';
  const kontakList = [telp, email, web].filter(Boolean).join(' | ');

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between gap-4 pb-2">
        {/* Logo Sekolah */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center p-1">
          {kop.logoSekolah ? (
            <img
              src={kop.logoSekolah}
              alt={namaSekolah}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-blue-900 flex flex-col items-center justify-center text-blue-900 bg-blue-50/50">
              <School className="w-8 h-8 text-blue-900" />
              <span className="text-[8px] font-bold tracking-tighter mt-0.5">LOGO</span>
            </div>
          )}
        </div>

        {/* Teks Kop Kedinasan */}
        <div className="flex-1 text-center px-2">
          {instansiLines.map((line, idx) => (
            <div
              key={idx}
              className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 leading-tight"
            >
              {line}
            </div>
          ))}

          <h2 className="text-base sm:text-xl font-extrabold text-blue-950 uppercase tracking-wide mt-0.5 leading-snug">
            {namaSekolah}
          </h2>

          <p className="text-[11px] sm:text-xs text-slate-700 leading-tight mt-0.5">
            {alamat}
          </p>

          {kontakList && (
            <p className="text-[10px] sm:text-[11px] text-slate-600 mt-0.5 font-medium">
              {kontakList}
            </p>
          )}
        </div>

        {/* Placeholder Seimbang di Sisi Kanan (Opsional: Logo Tut Wuri Handayani / Spacer) */}
        <div className="w-20 sm:w-24 shrink-0 hidden sm:flex items-center justify-center p-1">
          <div className="w-16 h-16 rounded-full border border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50 text-[9px] text-center p-1">
            <span className="font-bold text-slate-600">SIP-TATIB</span>
            <span>RESMI</span>
          </div>
        </div>
      </div>

      {/* Garis Ganda Standar Kop Surat Dinas Indonesia */}
      <div className="relative pt-1 pb-3">
        <div className="border-t-[3px] border-slate-900"></div>
        <div className="border-t border-slate-900 mt-[2px]"></div>
      </div>
    </div>
  );
};
