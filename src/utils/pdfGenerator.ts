/**
 * PDF Generator & Safe Printing Utility
 * Menghasilkan dokumen PDF resolusi tinggi (A4 landscape) lengkap dengan Kop Surat,
 * tabel pelanggaran, dan lembar pengesahan Kepala Sekolah & NIP.
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface GeneratePdfOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  onProgress?: (status: string) => void;
}

/**
 * Buat dan unduh file PDF langsung dari elemen HTML laporan
 */
export async function generateAndDownloadPdf(
  element: HTMLElement,
  options?: GeneratePdfOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!element) {
      throw new Error('Elemen dokumen laporan tidak ditemukan.');
    }

    if (options?.onProgress) {
      options.onProgress('Menyiapkan tata letak dan gaya cetak dokumen...');
    }

    // Render elemen HTML menjadi kanvas gambar resolusi tinggi
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        // Netralkan fungsi warna modern CSS (seperti oklch) pada stylesheet agar didukung penuh oleh html2canvas
        const styleElements = clonedDoc.querySelectorAll('style');
        styleElements.forEach((styleTag) => {
          if (styleTag.textContent && styleTag.textContent.includes('oklch')) {
            styleTag.textContent = styleTag.textContent.replace(/oklch\([^)]+\)/gi, '#1e293b');
          }
        });
      },
    });

    if (options?.onProgress) {
      options.onProgress('Menyusun berkas PDF A4...');
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const orientation = options?.orientation || 'landscape';
    
    // Dimensi halaman A4 dalam milimeter (Landscape: 297mm x 210mm)
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = orientation === 'landscape' ? 297 : 210;
    const pageHeight = orientation === 'landscape' ? 210 : 297;
    const margin = 8; // margin 8mm
    const printableWidth = pageWidth - (margin * 2);
    const printableHeight = pageHeight - (margin * 2);

    const imgHeight = (canvas.height * printableWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;
    let pageNum = 1;

    // Halaman Pertama
    pdf.addImage(imgData, 'JPEG', margin, position, printableWidth, imgHeight, undefined, 'FAST');
    heightLeft -= printableHeight;

    // Jika konten lebih panjang dari 1 halaman A4, tambahkan halaman berikutnya
    while (heightLeft > 5) {
      position = margin - (pageNum * printableHeight);
      pdf.addPage('a4', orientation);
      pdf.addImage(imgData, 'JPEG', margin, position, printableWidth, imgHeight, undefined, 'FAST');
      heightLeft -= printableHeight;
      pageNum++;
    }

    const filename = options?.filename || `Laporan_Pelanggaran_SMPN2_${Date.now()}.pdf`;
    pdf.save(filename);

    return { success: true };
  } catch (err: unknown) {
    console.error('Gagal generate PDF via html2canvas:', err);
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Memicu cetak dokumen melalui iframe terisolasi yang aman dari batasan parent window
 */
export function triggerSafePrint(element: HTMLElement): { printed: boolean; message?: string } {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return { printed: true };
    }

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(node => node.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!doctype html>
      <html>
        <head>
          <title>Cetak Laporan Tata Tertib SMPN 2 Kota Bengkulu</title>
          <meta charset="utf-8">
          ${styles}
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            body {
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          <div style="padding: 10px;">
            ${element.outerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print dibatasi sandbox browser:', e);
        try {
          window.print();
        } catch (we) {
          console.warn('window.print dibatasi:', we);
        }
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 400);

    return { printed: true };
  } catch (err) {
    console.warn('Gagal memicu print iframe:', err);
    try {
      window.print();
      return { printed: true };
    } catch (e) {
      return { 
        printed: false, 
        message: 'Dialog cetak printer dibatasi oleh browser iFrame. Silakan gunakan tombol Simpan/Unduh PDF.' 
      };
    }
  }
}

/**
 * Unduh berkas HTML siap cetak jika pengguna ingin membuka dan mencetak langsung di tab/jendela mandiri
 */
export function downloadPrintableHtml(element: HTMLElement, filename?: string) {
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(node => node.outerHTML)
    .join('\n');

  const fullHtml = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Laporan Resmi Pelanggaran SMPN 2 Kota Bengkulu</title>
  ${styles}
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { background: #ffffff; color: #0f172a; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; padding: 20px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; padding: 12px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
    <div><strong>Dokumen Resmi Siap Cetak</strong> - SMP Negeri 2 Kota Bengkulu</div>
    <button onclick="window.print()" style="padding: 8px 16px; background: #1e3a8a; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Cetak Dokumen (Ctrl + P)</button>
  </div>
  ${element.outerHTML}
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 600);
    });
  </script>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `Dokumen_Cetak_Laporan_${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
