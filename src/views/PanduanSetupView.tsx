import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Database, 
  RefreshCw,
  TableProperties
} from 'lucide-react';

interface PanduanSetupViewProps {
  onClose?: () => void;
}

export const PanduanSetupView: React.FC<PanduanSetupViewProps> = ({ onClose }) => {
  const { 
    endpointUrl, 
    updateEndpointUrl, 
    connectionState, 
    connectionError, 
    checkConnection,
    structureInfo,
    initEmptyStructure
  } = useApp();

  const [inputUrl, setInputUrl] = useState(endpointUrl);
  const [isCopied, setIsCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initFeedback, setInitFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Ambil kode Google Apps Script untuk disalin
  const appsScriptCode = `/**
 * =========================================================================================
 * SISTEM INFORMASI PENCATATAN PELANGGARAN TATA TERTIB SEKOLAH
 * SMP NEGERI 2 KOTA BENGKULU
 * 
 * Google Apps Script Backend (API Web App)
 * =========================================================================================
 */

var SCHEMAS = {
  Users: ['user_id', 'username', 'password_hash', 'salt', 'nama', 'peran', 'status_aktif', 'tanggal_dibuat', 'terakhir_login'],
  Siswa: ['siswa_id', 'nisn', 'nama_lengkap', 'kelas_id', 'tahun_ajaran', 'status_aktif'],
  Kelas: ['kelas_id', 'nama_kelas', 'tahun_ajaran', 'wali_kelas_user_id', 'nomor_wa_wali_kelas', 'status_aktif'],
  MasterPelanggaran: ['kode_pelanggaran', 'uraian', 'bobot_poin', 'kategori', 'status_aktif', 'catatan_aturan', 'tanggal_mulai_berlaku'],
  LaporanPelanggaran: ['laporan_id', 'siswa_id', 'kode_pelanggaran', 'tanggal_kejadian', 'jam_kejadian', 'waktu_input', 'user_id_pencatat', 'bobot_snapshot', 'urutan_ke', 'status_hasil', 'poin_diberikan', 'status_data', 'catatan'],
  TindakLanjut: ['tindak_lanjut_id', 'laporan_id', 'status', 'tanggal_tindak_lanjut', 'catatan', 'user_id_wali_kelas', 'waktu_pembaruan'],
  NotifikasiWA: ['notifikasi_id', 'laporan_id', 'penerima', 'nomor_tujuan', 'isi_pesan', 'waktu_dibuat', 'status_pengiriman', 'waktu_kirim', 'detail_kegagalan', 'jumlah_percobaan'],
  AuditLog: ['audit_id', 'user_id', 'waktu', 'aksi', 'nama_tabel', 'record_id', 'nilai_sebelum', 'nilai_sesudah', 'alasan_perubahan'],
  Pengaturan: ['kunci', 'nilai', 'waktu_pembaruan', 'user_id_pengubah']
};

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
  var responseData;
  try {
    if (action === 'ping' || action === 'check_structure') {
      responseData = checkStructure();
    } else if (action === 'init_structure') {
      responseData = initStructure();
    } else if (action === 'get_data') {
      responseData = getAllData(e.parameter.role, e.parameter.user_id);
    } else {
      responseData = { success: false, error: 'Aksi GET tidak dikenali: ' + action };
    }
  } catch (err) {
    responseData = { success: false, error: err.toString() };
  }
  return createJsonResponse(responseData);
}

function doPost(e) {
  var responseData;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: 'Request body tidak boleh kosong' });
    }
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    switch (action) {
      case 'check_structure': responseData = checkStructure(); break;
      case 'init_structure': responseData = initStructure(payload.setup_admin); break;
      case 'auth_login': responseData = authLogin(payload.username, payload.password); break;
      case 'setup_initial_admin': responseData = setupInitialAdmin(payload.username, payload.password, payload.nama); break;
      case 'get_all_data': responseData = getAllData(payload.user_role, payload.user_id); break;
      case 'preview_pelanggaran': responseData = previewPerhitunganPelanggaran(payload.siswa_id, payload.kode_pelanggaran, payload.tanggal_kejadian, payload.jam_kejadian); break;
      case 'simpan_laporan': responseData = simpanLaporan(payload); break;
      case 'batalkan_laporan': responseData = batalkanLaporan(payload.laporan_id, payload.alasan, payload.user_id); break;
      case 'update_tindak_lanjut': responseData = updateTindakLanjut(payload); break;
      case 'update_notifikasi_wa': responseData = updateNotifikasiWA(payload.notifikasi_id, payload.status_pengiriman, payload.detail_kegagalan); break;
      case 'crud_siswa': responseData = crudSiswa(payload); break;
      case 'crud_kelas': responseData = crudKelas(payload); break;
      case 'crud_master_pelanggaran': responseData = crudMasterPelanggaran(payload); break;
      case 'crud_user': responseData = crudUser(payload); break;
      case 'update_pengaturan': responseData = updatePengaturan(payload.pengaturan, payload.user_id); break;
      case 'rekalkulasi_semua_poin': responseData = rekalkulasiSemuaPoin(payload.user_id); break;
      default: responseData = { success: false, error: 'Aksi POST tidak dikenali: ' + action };
    }
  } catch (err) {
    responseData = { success: false, error: err.toString() };
  }
  return createJsonResponse(responseData);
}

function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function getSpreadsheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch(e) {}
  try {
    var ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (ssId) return SpreadsheetApp.openById(ssId);
  } catch(e) {}
  throw new Error('Google Spreadsheet tidak ditemukan. Buka Apps Script dari menu Ekstensi -> Apps Script pada Google Spreadsheet Anda.');
}

function checkStructure() {
  var ss = getSpreadsheet();
  var sheetsStatus = {};
  var missingSheets = [];
  var isFullyValid = true;
  var sheetNames = Object.keys(SCHEMAS);
  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheetsStatus[name] = { exists: false, missing_columns: SCHEMAS[name], total_rows: 0 };
      missingSheets.push(name);
      isFullyValid = false;
      continue;
    }
    var lastCol = sheet.getLastColumn();
    var lastRow = sheet.getLastRow();
    var totalRows = lastRow > 1 ? lastRow - 1 : 0;
    var actualHeaders = [];
    if (lastCol > 0) {
      actualHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); });
    }
    var expectedHeaders = SCHEMAS[name];
    var missingCols = [];
    for (var j = 0; j < expectedHeaders.length; j++) {
      if (actualHeaders.indexOf(expectedHeaders[j]) === -1) missingCols.push(expectedHeaders[j]);
    }
    if (missingCols.length > 0) isFullyValid = false;
    sheetsStatus[name] = { exists: true, missing_columns: missingCols, total_rows: totalRows };
  }
  var totalUsers = 0;
  var hasAdmin = false;
  var usersSheet = ss.getSheetByName('Users');
  if (usersSheet && usersSheet.getLastRow() > 1) {
    var usersData = readTableAsObjects(usersSheet);
    totalUsers = usersData.length;
    for (var u = 0; u < usersData.length; u++) {
      if (usersData[u].peran === 'ADMIN' && usersData[u].status_aktif === 'AKTIF') { hasAdmin = true; break; }
    }
  }
  return {
    success: true,
    data: {
      connected: true,
      spreadsheet_name: ss.getName(),
      spreadsheet_id: ss.getId(),
      sheets_status: sheetsStatus,
      is_fully_valid: isFullyValid,
      missing_sheets: missingSheets,
      total_users: totalUsers,
      has_admin: hasAdmin
    }
  };
}

function initStructure(adminSetup) {
  var ss = getSpreadsheet();
  var sheetNames = Object.keys(SCHEMAS);
  var createdSheets = [];
  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var sheet = ss.getSheetByName(name);
    var headers = SCHEMAS[name];
    if (!sheet) {
      sheet = ss.insertSheet(name);
      createdSheets.push(name);
    }
    var lastCol = sheet.getLastColumn();
    var lastRow = sheet.getLastRow();
    var isRow1Empty = (lastRow === 0 || lastCol === 0);
    if (!isRow1Empty) {
      var headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var nonEmpty = headerValues.filter(function(v) { return String(v).trim() !== ''; }).length;
      if (nonEmpty === 0) isRow1Empty = true;
    }
    if (isRow1Empty) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f5f9');
      sheet.setFrozenRows(1);
    } else {
      var actualHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); });
      var missing = [];
      for (var j = 0; j < headers.length; j++) {
        if (actualHeaders.indexOf(headers[j]) === -1) missing.push(headers[j]);
      }
      if (missing.length > 0) {
        var startCol = lastCol + 1;
        sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
        sheet.getRange(1, startCol, 1, missing.length).setFontWeight('bold').setBackground('#f1f5f9');
      }
    }
  }
  try {
    var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Lembar1');
    if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }
  } catch(e) {}
  if (adminSetup && adminSetup.username && adminSetup.password && adminSetup.nama) {
    setupInitialAdmin(adminSetup.username, adminSetup.password, adminSetup.nama);
  }
  return { success: true, message: 'Header 9 tab berhasil dibuat kosong tanpa data dummy.', created_sheets: createdSheets };
}

function readTableAsObjects(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0].map(function(h) { return String(h).trim(); });
  var results = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var hasContent = row.some(function(cell) { return cell !== '' && cell !== null && cell !== undefined; });
    if (!hasContent) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var cellVal = row[c];
      if (cellVal instanceof Date) {
        cellVal = Utilities.formatDate(cellVal, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
      }
      obj[headers[c]] = cellVal !== undefined ? cellVal : '';
    }
    results.push(obj);
  }
  return results;
}

function hashPassword(password, salt) {
  var raw = salt + '::' + password;
  var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  var hash = '';
  for (var i = 0; i < signature.length; i++) {
    var byteVal = signature[i];
    if (byteVal < 0) byteVal += 256;
    var hex = byteVal.toString(16);
    if (hex.length === 1) hex = '0' + hex;
    hash += hex;
  }
  return hash;
}

function generateSalt() { return Utilities.getUuid().replace(/-/g, '').substring(0, 16); }

function authLogin(username, password) {
  if (!username || !password) return { success: false, error: 'Username dan kata sandi wajib diisi.' };
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, error: 'Tab Users belum tersedia di Spreadsheet.' };
  var users = readTableAsObjects(sheet);
  if (users.length === 0) return { success: false, error: 'Belum ada pengguna terdaftar.', needs_initial_setup: true };
  var targetUser = null;
  var userRowIndex = -1;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username).trim().toLowerCase() === String(username).trim().toLowerCase()) {
      targetUser = users[i];
      userRowIndex = i + 2;
      break;
    }
  }
  if (!targetUser || targetUser.status_aktif !== 'AKTIF') return { success: false, error: 'Nama pengguna atau kata sandi tidak valid atau nonaktif.' };
  var calculatedHash = hashPassword(password, targetUser.salt);
  if (calculatedHash !== targetUser.password_hash) return { success: false, error: 'Nama pengguna atau kata sandi tidak valid.' };
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var lastLoginCol = headers.indexOf('terakhir_login') + 1;
  if (lastLoginCol > 0) sheet.getRange(userRowIndex, lastLoginCol).setValue(nowStr);
  writeAuditLog(targetUser.user_id, 'LOGIN', 'Users', targetUser.user_id, '', '', 'Login berhasil');
  return {
    success: true,
    data: {
      user: {
        user_id: targetUser.user_id,
        username: targetUser.username,
        nama: targetUser.nama,
        peran: targetUser.peran,
        status_aktif: targetUser.status_aktif,
        terakhir_login: nowStr
      },
      token: Utilities.getUuid()
    }
  };
}

function setupInitialAdmin(username, password, nama) {
  if (!username || !password || !nama) return { success: false, error: 'Data admin wajib diisi lengkap.' };
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) { initStructure(); sheet = ss.getSheetByName('Users'); }
  var users = readTableAsObjects(sheet);
  for (var i = 0; i < users.length; i++) {
    if (users[i].peran === 'ADMIN') return { success: false, error: 'Administrator sudah ada dalam sistem.' };
  }
  var salt = generateSalt();
  var passwordHash = hashPassword(password, salt);
  var userId = 'USR-' + Utilities.getUuid().substring(0, 8).toUpperCase();
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  sheet.appendRow([userId, username.trim(), passwordHash, salt, nama.trim(), 'ADMIN', 'AKTIF', nowStr, nowStr]);
  initDefaultSettings(userId);
  writeAuditLog(userId, 'SETUP_INITIAL_ADMIN', 'Users', userId, '', '', 'Setup Administrator Pertama');
  return { success: true, message: 'Administrator berhasil dibuat.', data: { user_id: userId, username: username, nama: nama, peran: 'ADMIN', status_aktif: 'AKTIF' } };
}

function initDefaultSettings(userId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Pengaturan');
  if (!sheet) return;
  var current = readTableAsObjects(sheet);
  var currentMap = {};
  for (var i = 0; i < current.length; i++) currentMap[current[i].kunci] = current[i].nilai;
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  var defaultValues = {
    NAMA_SEKOLAH: 'SMP Negeri 2 Kota Bengkulu',
    TAHUN_AJARAN_AKTIF: '2026/2027',
    SEMESTER_AKTIF: 'Ganjil',
    PERIODE_PERHITUNGAN_PEMBINAAN: 'TAHUN_AJARAN_2026/2027',
    NOMOR_WA_KESISWAAN: '6281234567890',
    WA_GATEWAY_API_URL: '',
    WA_GATEWAY_API_KEY: '',
    RUMUS_INDIKATOR_TERTIB: 'Persentase siswa tanpa pelanggaran dan rata-rata poin pelanggaran terendah'
  };
  for (var k in defaultValues) {
    if (currentMap[k] === undefined || currentMap[k] === '') {
      sheet.appendRow([k, defaultValues[k], nowStr, userId || 'SYSTEM']);
    }
  }
}

function getAllData(userRole, userId) {
  var ss = getSpreadsheet();
  var result = {};
  var sheetNames = Object.keys(SCHEMAS);
  for (var i = 0; i < sheetNames.length; i++) {
    result[sheetNames[i]] = readTableAsObjects(ss.getSheetByName(sheetNames[i]));
  }
  if (result.Users) {
    result.Users = result.Users.map(function(u) {
      return { user_id: u.user_id, username: u.username, nama: u.nama, peran: u.peran, status_aktif: u.status_aktif, tanggal_dibuat: u.tanggal_dibuat, terakhir_login: u.terakhir_login };
    });
  }
  if (userRole === 'WALI_KELAS' && userId && result.Kelas) {
    var assigned = [];
    for (var k = 0; k < result.Kelas.length; k++) {
      if (result.Kelas[k].wali_kelas_user_id === userId) assigned.push(result.Kelas[k].kelas_id);
    }
    result.assigned_kelas_ids = assigned;
  }
  return { success: true, data: result };
}

function previewPerhitunganPelanggaran(siswaId, kodePelanggaran, tanggalKejadian, jamKejadian) {
  var ss = getSpreadsheet();
  var masters = readTableAsObjects(ss.getSheetByName('MasterPelanggaran'));
  var targetMaster = null;
  for (var m = 0; m < masters.length; m++) {
    if (masters[m].kode_pelanggaran === kodePelanggaran && masters[m].status_aktif === 'AKTIF') { targetMaster = masters[m]; break; }
  }
  if (!targetMaster) return { success: false, error: 'Kode pelanggaran tidak ditemukan: ' + kodePelanggaran };
  var bobot = Number(targetMaster.bobot_poin) || 0;
  var settings = readTableAsObjects(ss.getSheetByName('Pengaturan'));
  var periodeAktif = '';
  for (var s = 0; s < settings.length; s++) {
    if (settings[s].kunci === 'PERIODE_PERHITUNGAN_PEMBINAAN') { periodeAktif = settings[s].nilai; break; }
  }
  if (!periodeAktif) return { success: false, error: 'PERINGATAN: Periode perhitungan pembinaan belum ditetapkan pada Pengaturan.' };
  var allLaporan = readTableAsObjects(ss.getSheetByName('LaporanPelanggaran'));
  var riwayatSebelumnya = [];
  for (var i = 0; i < allLaporan.length; i++) {
    var lap = allLaporan[i];
    if (lap.siswa_id === siswaId && lap.kode_pelanggaran === kodePelanggaran && lap.status_data === 'VALID') riwayatSebelumnya.push(lap);
  }
  var urutanKe = riwayatSebelumnya.length + 1;
  var statusHasil = '';
  var poinDiberikan = 0;
  var skemaPoin = 'LANGSUNG_BERPOIN';
  for (var sp = 0; sp < settings.length; sp++) {
    if (settings[sp].kunci === 'SKEMA_POIN_PELANGGARAN') { skemaPoin = settings[sp].nilai; break; }
  }
  if (skemaPoin === 'PEMBINAAN_BERTAHAP_1_3' && bobot >= 1 && bobot <= 29) {
    if (urutanKe === 1) { statusHasil = 'PEMBINAAN_1'; poinDiberikan = 0; }
    else if (urutanKe === 2) { statusHasil = 'PEMBINAAN_2'; poinDiberikan = 0; }
    else if (urutanKe === 3) { statusHasil = 'PEMBINAAN_3'; poinDiberikan = 0; }
    else { statusHasil = 'BERPOIN'; poinDiberikan = bobot; }
  } else {
    statusHasil = 'BERPOIN'; poinDiberikan = bobot;
  }
  return {
    success: true,
    data: {
      siswa_id: siswaId,
      kode_pelanggaran: kodePelanggaran,
      uraian: targetMaster.uraian,
      bobot_snapshot: bobot,
      urutan_ke: urutanKe,
      status_hasil: statusHasil,
      poin_diberikan: poinDiberikan,
      total_sebelumnya: riwayatSebelumnya.length,
      periode_aktif: periodeAktif
    }
  };
}

function simpanLaporan(payload) {
  var ss = getSpreadsheet();
  var laporanSheet = ss.getSheetByName('LaporanPelanggaran');
  var siswaList = readTableAsObjects(ss.getSheetByName('Siswa'));
  var targetSiswa = null;
  for (var s = 0; s < siswaList.length; s++) {
    if (siswaList[s].siswa_id === payload.siswa_id && siswaList[s].status_aktif === 'AKTIF') { targetSiswa = siswaList[s]; break; }
  }
  if (!targetSiswa) return { success: false, error: 'Siswa tidak ditemukan atau nonaktif.' };
  var kelasList = readTableAsObjects(ss.getSheetByName('Kelas'));
  var targetKelas = null;
  for (var k = 0; k < kelasList.length; k++) {
    if (kelasList[k].kelas_id === targetSiswa.kelas_id) { targetKelas = kelasList[k]; break; }
  }
  var previewResult = previewPerhitunganPelanggaran(payload.siswa_id, payload.kode_pelanggaran, payload.tanggal_kejadian, payload.jam_kejadian);
  if (!previewResult.success) return previewResult;
  var calc = previewResult.data;
  var now = new Date();
  var nowStr = Utilities.formatDate(now, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  var laporanId = 'LAP-' + Utilities.formatDate(now, 'Asia/Jakarta', 'yyyyMMdd') + '-' + Utilities.getUuid().substring(0, 6).toUpperCase();
  laporanSheet.appendRow([laporanId, payload.siswa_id, payload.kode_pelanggaran, payload.tanggal_kejadian, payload.jam_kejadian, nowStr, payload.user_id_pencatat, calc.bobot_snapshot, calc.urutan_ke, calc.status_hasil, calc.poin_diberikan, 'VALID', payload.catatan || '']);
  var tindakLanjutSheet = ss.getSheetByName('TindakLanjut');
  var tlId = 'TL-' + Utilities.getUuid().substring(0, 8).toUpperCase();
  if (tindakLanjutSheet) tindakLanjutSheet.appendRow([tlId, laporanId, 'BELUM', '', '', targetKelas ? targetKelas.wali_kelas_user_id : '', nowStr]);
  var notifikasiSheet = ss.getSheetByName('NotifikasiWA');
  var notifId = 'NOTIF-' + Utilities.getUuid().substring(0, 8).toUpperCase();
  var namaKelas = targetKelas ? targetKelas.nama_kelas : '-';
  var statusText = calc.status_hasil === 'BERPOIN' ? 'BERPOIN (+ ' + calc.poin_diberikan + ' Poin)' : 'PEMBINAAN KE-' + calc.urutan_ke + ' (0 Poin)';
  var pesanWA = '*PEMBERITAHUAN TATA TERTIB SMP NEGERI 2 KOTA BENGKULU*\\n\\nYth. Wali Kelas ' + namaKelas + ',\\n\\nTelah dicatat pelanggaran tata tertib siswa:\\n• *Nama*: ' + targetSiswa.nama_lengkap + '\\n• *NISN*: ' + targetSiswa.nisn + '\\n• *Kelas*: ' + namaKelas + '\\n• *Pelanggaran*: [' + payload.kode_pelanggaran + '] ' + calc.uraian + '\\n• *Waktu*: ' + payload.tanggal_kejadian + ' pukul ' + payload.jam_kejadian + ' WIB\\n• *Klasifikasi*: ' + statusText + '\\n• *Catatan*: ' + (payload.catatan || '-') + '\\n\\nMohon menindaklanjuti pembinaan siswa melalui Sistem Tata Tertib.\\nTerima kasih.';
  if (notifikasiSheet) notifikasiSheet.appendRow([notifId, laporanId, 'Wali Kelas ' + namaKelas, targetKelas ? targetKelas.nomor_wa_wali_kelas : '', pesanWA, nowStr, 'SIAP_KIRIM', '', '', 0]);
  writeAuditLog(payload.user_id_pencatat, 'SIMPAN_LAPORAN', 'LaporanPelanggaran', laporanId, '', '', 'Input pelanggaran');
  return { success: true, message: 'Laporan berhasil disimpan.', data: { laporan_id: laporanId, status_hasil: calc.status_hasil, poin_diberikan: calc.poin_diberikan, nomor_wa_wali: targetKelas ? targetKelas.nomor_wa_wali_kelas : '', isi_pesan_wa: pesanWA } };
}

function batalkanLaporan(laporanId, alasan, userId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('LaporanPelanggaran');
  var records = readTableAsObjects(sheet);
  for (var i = 0; i < records.length; i++) {
    if (records[i].laporan_id === laporanId) {
      var row = i + 2;
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      sheet.getRange(row, headers.indexOf('status_data') + 1).setValue('DIBATALKAN');
      var oldCatatan = records[i].catatan || '';
      sheet.getRange(row, headers.indexOf('catatan') + 1).setValue(oldCatatan + ' [DIBATALKAN: ' + alasan + ' oleh ' + userId + ']');
      rekalkulasiLaporanSiswa(records[i].siswa_id, records[i].kode_pelanggaran, userId);
      writeAuditLog(userId, 'BATALKAN_LAPORAN', 'LaporanPelanggaran', laporanId, 'VALID', 'DIBATALKAN', alasan);
      return { success: true, message: 'Laporan dibatalkan dan urutan serta poin telah direkalkulasi.' };
    }
  }
  return { success: false, error: 'Laporan tidak ditemukan.' };
}

function rekalkulasiLaporanSiswa(siswaId, kodePelanggaran, userId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('LaporanPelanggaran');
  var records = readTableAsObjects(sheet);
  var validList = [];
  for (var i = 0; i < records.length; i++) {
    if (records[i].siswa_id === siswaId && records[i].kode_pelanggaran === kodePelanggaran && records[i].status_data === 'VALID') {
      validList.push({ record: records[i], row: i + 2 });
    }
  }
  validList.sort(function(a, b) {
    return ((a.record.tanggal_kejadian || '') + ' ' + (a.record.jam_kejadian || '')).localeCompare((b.record.tanggal_kejadian || '') + ' ' + (b.record.jam_kejadian || ''));
  });
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colUrutan = headers.indexOf('urutan_ke') + 1;
  var colStatus = headers.indexOf('status_hasil') + 1;
  var colPoin = headers.indexOf('poin_diberikan') + 1;
  var settings = readTableAsObjects(ss.getSheetByName('Pengaturan'));
  var skemaPoin = 'LANGSUNG_BERPOIN';
  for (var sp = 0; sp < settings.length; sp++) {
    if (settings[sp].kunci === 'SKEMA_POIN_PELANGGARAN') { skemaPoin = settings[sp].nilai; break; }
  }
  for (var j = 0; j < validList.length; j++) {
    var bobot = Number(validList[j].record.bobot_snapshot) || 0;
    var newUrutan = j + 1;
    var newStatus = '';
    var newPoin = 0;
    if (skemaPoin === 'PEMBINAAN_BERTAHAP_1_3' && bobot >= 1 && bobot <= 29) {
      if (newUrutan === 1) { newStatus = 'PEMBINAAN_1'; newPoin = 0; }
      else if (newUrutan === 2) { newStatus = 'PEMBINAAN_2'; newPoin = 0; }
      else if (newUrutan === 3) { newStatus = 'PEMBINAAN_3'; newPoin = 0; }
      else { newStatus = 'BERPOIN'; newPoin = bobot; }
    } else {
      newStatus = 'BERPOIN'; newPoin = bobot;
    }
    sheet.getRange(validList[j].row, colUrutan).setValue(newUrutan);
    sheet.getRange(validList[j].row, colStatus).setValue(newStatus);
    sheet.getRange(validList[j].row, colPoin).setValue(newPoin);
  }
}

function rekalkulasiSemuaPoin(userId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('LaporanPelanggaran');
  if (!sheet) return { success: false, error: 'Tab LaporanPelanggaran tidak ditemukan.' };
  var records = readTableAsObjects(sheet);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colPoin = headers.indexOf('poin_diberikan') + 1;
  var colStatus = headers.indexOf('status_hasil') + 1;
  var updatedCount = 0;
  for (var i = 0; i < records.length; i++) {
    if (records[i].status_data === 'VALID') {
      var bobot = Number(records[i].bobot_snapshot) || 0;
      var curPoin = Number(records[i].poin_diberikan) || 0;
      if (curPoin === 0 && bobot > 0) {
        var row = i + 2;
        sheet.getRange(row, colPoin).setValue(bobot);
        sheet.getRange(row, colStatus).setValue('BERPOIN');
        updatedCount++;
      }
    }
  }
  return { success: true, message: 'Berhasil menyinkronkan poin! ' + updatedCount + ' data telah diperbarui menjadi berpoin penuh.', updated_count: updatedCount };
}

function updateTindakLanjut(p) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('TindakLanjut');
  var records = readTableAsObjects(sheet);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = 0; i < records.length; i++) {
    if (records[i].tindak_lanjut_id === p.tindak_lanjut_id) {
      var row = i + 2;
      if (p.status) sheet.getRange(row, headers.indexOf('status') + 1).setValue(p.status);
      if (p.tanggal_tindak_lanjut) sheet.getRange(row, headers.indexOf('tanggal_tindak_lanjut') + 1).setValue(p.tanggal_tindak_lanjut);
      if (p.catatan !== undefined) sheet.getRange(row, headers.indexOf('catatan') + 1).setValue(p.catatan);
      sheet.getRange(row, headers.indexOf('waktu_pembaruan') + 1).setValue(Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'));
      writeAuditLog(p.user_id, 'UPDATE_TINDAK_LANJUT', 'TindakLanjut', p.tindak_lanjut_id, '', p.status, 'Update status pembinaan');
      return { success: true, message: 'Tindak lanjut disimpan.' };
    }
  }
  return { success: false, error: 'Data tidak ditemukan.' };
}

function updateNotifikasiWA(id, st, fail) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('NotifikasiWA');
  var records = readTableAsObjects(sheet);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  for (var i = 0; i < records.length; i++) {
    if (records[i].notifikasi_id === id) {
      var row = i + 2;
      sheet.getRange(row, headers.indexOf('status_pengiriman') + 1).setValue(st);
      var count = (Number(records[i].jumlah_percobaan) || 0) + 1;
      sheet.getRange(row, headers.indexOf('jumlah_percobaan') + 1).setValue(count);
      if (st === 'TERKIRIM' || st === 'DIBUKA_MANUAL') sheet.getRange(row, headers.indexOf('waktu_kirim') + 1).setValue(Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss'));
      if (fail) sheet.getRange(row, headers.indexOf('detail_kegagalan') + 1).setValue(fail);
      return { success: true, message: 'Status WhatsApp diperbarui.' };
    }
  }
  return { success: false, error: 'Notifikasi tidak ditemukan.' };
}

function crudSiswa(p) {
  var sheet = getSpreadsheet().getSheetByName('Siswa');
  var h = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (p.sub_action === 'create') {
    var id = 'SISWA-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    sheet.appendRow([id, String(p.nisn).trim(), String(p.nama_lengkap).trim(), String(p.kelas_id).trim(), String(p.tahun_ajaran).trim(), 'AKTIF']);
    writeAuditLog(p.user_id, 'CREATE_SISWA', 'Siswa', id, '', '', 'Tambah siswa');
    return { success: true, message: 'Siswa berhasil disimpan.' };
  }
  if (p.sub_action === 'update') {
    var recs = readTableAsObjects(sheet);
    for (var i = 0; i < recs.length; i++) {
      if (recs[i].siswa_id === p.siswa_id) {
        var row = i + 2;
        if (p.nisn) sheet.getRange(row, h.indexOf('nisn') + 1).setValue(p.nisn);
        if (p.nama_lengkap) sheet.getRange(row, h.indexOf('nama_lengkap') + 1).setValue(p.nama_lengkap);
        if (p.kelas_id) sheet.getRange(row, h.indexOf('kelas_id') + 1).setValue(p.kelas_id);
        if (p.tahun_ajaran) sheet.getRange(row, h.indexOf('tahun_ajaran') + 1).setValue(p.tahun_ajaran);
        if (p.status_aktif) sheet.getRange(row, h.indexOf('status_aktif') + 1).setValue(p.status_aktif);
        writeAuditLog(p.user_id, 'UPDATE_SISWA', 'Siswa', p.siswa_id, '', '', 'Update siswa');
        return { success: true, message: 'Siswa diperbarui.' };
      }
    }
  }
  return { success: false, error: 'Aksi siswa gagal.' };
}

function crudKelas(p) {
  var sheet = getSpreadsheet().getSheetByName('Kelas');
  var h = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (p.sub_action === 'create') {
    var id = String(p.kelas_id || ('KLS-' + Utilities.getUuid().substring(0, 6).toUpperCase())).trim();
    sheet.appendRow([id, String(p.nama_kelas).trim(), String(p.tahun_ajaran).trim(), String(p.wali_kelas_user_id || '').trim(), String(p.nomor_wa_wali_kelas || '').trim(), 'AKTIF']);
    writeAuditLog(p.user_id, 'CREATE_KELAS', 'Kelas', id, '', '', 'Tambah kelas');
    return { success: true, message: 'Kelas berhasil disimpan.' };
  }
  if (p.sub_action === 'update') {
    var recs = readTableAsObjects(sheet);
    for (var i = 0; i < recs.length; i++) {
      if (recs[i].kelas_id === p.kelas_id) {
        var row = i + 2;
        if (p.nama_kelas) sheet.getRange(row, h.indexOf('nama_kelas') + 1).setValue(p.nama_kelas);
        if (p.tahun_ajaran) sheet.getRange(row, h.indexOf('tahun_ajaran') + 1).setValue(p.tahun_ajaran);
        if (p.wali_kelas_user_id !== undefined) sheet.getRange(row, h.indexOf('wali_kelas_user_id') + 1).setValue(p.wali_kelas_user_id);
        if (p.nomor_wa_wali_kelas !== undefined) sheet.getRange(row, h.indexOf('nomor_wa_wali_kelas') + 1).setValue(p.nomor_wa_wali_kelas);
        if (p.status_aktif) sheet.getRange(row, h.indexOf('status_aktif') + 1).setValue(p.status_aktif);
        writeAuditLog(p.user_id, 'UPDATE_KELAS', 'Kelas', p.kelas_id, '', '', 'Update kelas');
        return { success: true, message: 'Kelas diperbarui.' };
      }
    }
  }
  return { success: false, error: 'Aksi kelas gagal.' };
}

function crudMasterPelanggaran(p) {
  var sheet = getSpreadsheet().getSheetByName('MasterPelanggaran');
  var h = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (p.sub_action === 'create') {
    var code = String(p.kode_pelanggaran).trim().toUpperCase();
    var bobot = Number(p.bobot_poin) || 0;
    sheet.appendRow([code, String(p.uraian).trim(), bobot, String(p.kategori).trim(), 'AKTIF', String(p.catatan_aturan || '').trim(), String(p.tanggal_mulai_berlaku || '2026-07-01')]);
    writeAuditLog(p.user_id, 'CREATE_MASTER', 'MasterPelanggaran', code, '', '', 'Tambah kode');
    return { success: true, message: 'Master pelanggaran disimpan.' };
  }
  if (p.sub_action === 'update') {
    var recs = readTableAsObjects(sheet);
    for (var i = 0; i < recs.length; i++) {
      if (recs[i].kode_pelanggaran === p.kode_pelanggaran) {
        var row = i + 2;
        if (p.uraian) sheet.getRange(row, h.indexOf('uraian') + 1).setValue(p.uraian);
        if (p.bobot_poin !== undefined) sheet.getRange(row, h.indexOf('bobot_poin') + 1).setValue(Number(p.bobot_poin));
        if (p.kategori) sheet.getRange(row, h.indexOf('kategori') + 1).setValue(p.kategori);
        if (p.status_aktif) sheet.getRange(row, h.indexOf('status_aktif') + 1).setValue(p.status_aktif);
        writeAuditLog(p.user_id, 'UPDATE_MASTER', 'MasterPelanggaran', p.kode_pelanggaran, '', '', 'Update master');
        return { success: true, message: 'Master pelanggaran diperbarui.' };
      }
    }
  }
  return { success: false, error: 'Aksi master gagal.' };
}

function crudUser(p) {
  var sheet = getSpreadsheet().getSheetByName('Users');
  var h = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (p.sub_action === 'create') {
    var salt = generateSalt();
    var hash = hashPassword(p.password, salt);
    var uid = 'USR-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([uid, p.username.trim(), hash, salt, p.nama.trim(), p.peran, 'AKTIF', nowStr, '']);
    writeAuditLog(p.actor_id, 'CREATE_USER', 'Users', uid, '', '', 'Tambah user');
    return { success: true, message: 'Pengguna baru didaftarkan.' };
  }
  if (p.sub_action === 'update') {
    var recs = readTableAsObjects(sheet);
    for (var i = 0; i < recs.length; i++) {
      if (recs[i].user_id === p.user_id) {
        var row = i + 2;
        if (p.nama) sheet.getRange(row, h.indexOf('nama') + 1).setValue(p.nama);
        if (p.peran) sheet.getRange(row, h.indexOf('peran') + 1).setValue(p.peran);
        if (p.status_aktif) sheet.getRange(row, h.indexOf('status_aktif') + 1).setValue(p.status_aktif);
        if (p.new_password) {
          var ns = generateSalt();
          sheet.getRange(row, h.indexOf('password_hash') + 1).setValue(hashPassword(p.new_password, ns));
          sheet.getRange(row, h.indexOf('salt') + 1).setValue(ns);
        }
        writeAuditLog(p.actor_id, 'UPDATE_USER', 'Users', p.user_id, '', '', 'Update user');
        return { success: true, message: 'Pengguna diperbarui.' };
      }
    }
  }
  return { success: false, error: 'Aksi pengguna gagal.' };
}

function updatePengaturan(map, uid) {
  var sheet = getSpreadsheet().getSheetByName('Pengaturan');
  var recs = readTableAsObjects(sheet);
  var h = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var now = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  for (var k in map) {
    var val = String(map[k]);
    var found = false;
    for (var i = 0; i < recs.length; i++) {
      if (recs[i].kunci === k) {
        sheet.getRange(i + 2, h.indexOf('nilai') + 1).setValue(val);
        sheet.getRange(i + 2, h.indexOf('waktu_pembaruan') + 1).setValue(now);
        sheet.getRange(i + 2, h.indexOf('user_id_pengubah') + 1).setValue(uid || 'ADMIN');
        found = true; break;
      }
    }
    if (!found) sheet.appendRow([k, val, now, uid || 'ADMIN']);
  }
  writeAuditLog(uid || 'ADMIN', 'UPDATE_PENGATURAN', 'Pengaturan', 'ALL', '', '', 'Update pengaturan');
  return { success: true, message: 'Pengaturan disimpan.' };
}

function writeAuditLog(uid, aksi, tbl, rec, bef, aft, als) {
  try {
    var sheet = getSpreadsheet().getSheetByName('AuditLog');
    if (!sheet) return;
    var id = 'AUD-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    var now = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([id, uid || 'SYSTEM', now, aksi, tbl, rec || '', bef || '', aft || '', als || '']);
  } catch(e) {}
}`;

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleTestAndSaveEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    setIsTesting(true);
    updateEndpointUrl(inputUrl.trim());
    await checkConnection();
    setIsTesting(false);
  };

  const handleInitStructure = async () => {
    setIsInitializing(true);
    setInitFeedback(null);
    const res = await initEmptyStructure();
    setIsInitializing(false);
    if (res.success) {
      setInitFeedback({ success: true, message: res.message || 'Struktur 9 tab dan header kolom kosong berhasil dibuat di Google Spreadsheet!' });
      await checkConnection();
    } else {
      setInitFeedback({ success: false, message: res.error || 'Gagal membuat struktur header tab. Pastikan Web App di-deploy dengan akses "Anyone".' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header Halaman */}
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Panduan Deployment & Koneksi Google Spreadsheet
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Arsitektur Resmi: Frontend React → Google Apps Script Web App → Google Spreadsheet SMPN 2 Kota Bengkulu.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Tutup Panduan
          </button>
        )}
      </div>

      {/* Bagian 1: Status Konektivitas & Pengujian Endpoint */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-900" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              1. Status Endpoint Google Apps Script
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Status: {connectionState === 'CONNECTED' ? (
              <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terhubung
              </span>
            ) : connectionState === 'UNCONFIGURED' ? (
              <span className="text-amber-700 font-bold">Belum Dikonfigurasi</span>
            ) : connectionState === 'CHECKING' ? (
              <span className="text-blue-700 font-bold animate-pulse">Memeriksa...</span>
            ) : (
              <span className="text-red-700 font-bold">Gagal</span>
            )}
          </span>
        </div>

        {connectionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Kesalahan Koneksi:</div>
              <div className="mt-0.5">{connectionError}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleTestAndSaveEndpoint} className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              URL Google Apps Script Web App (Exec Endpoint):
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                required
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={isTesting}
                className="px-4 py-2 bg-blue-900 text-white rounded-lg text-xs font-semibold hover:bg-blue-800 disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? 'Menguji Koneksi...' : 'Uji & Simpan Endpoint'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Untuk deployment permanen, simpan nilai ini pada variabel environment <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">VITE_APPS_SCRIPT_URL</code> di file <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">.env</code>.
            </p>
          </div>
        </form>

        {/* Card Inisialisasi Header Kolom Otomatis */}
        <div className="mt-4 p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-blue-950 text-xs block">
                Inisialisasi Header Kolom 9 Tab Spreadsheet:
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Membuat otomatis 9 tab (Users, Siswa, Kelas, MasterPelanggaran, LaporanPelanggaran, TindakLanjut, NotifikasiWA, AuditLog, Pengaturan) beserta header kolom resmi tanpa data fiktif.
              </p>
            </div>
            <button
              type="button"
              onClick={handleInitStructure}
              disabled={isInitializing || (!endpointUrl && !inputUrl.trim())}
              className="px-4 py-2 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-800 disabled:opacity-50 shrink-0 flex items-center justify-center gap-2 text-xs shadow-xs transition-colors"
            >
              <TableProperties className="w-4 h-4" />
              {isInitializing ? 'Membuat Header Tab...' : 'Inisialisasi Header Kolom Sekarang'}
            </button>
          </div>

          {!endpointUrl && !inputUrl.trim() && (
            <p className="text-[11px] text-amber-800 font-medium">
              * Harap isi URL Web App Apps Script di atas terlebih dahulu.
            </p>
          )}

          {initFeedback && (
            <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${initFeedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {initFeedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
              <span className="font-medium leading-relaxed">{initFeedback.message}</span>
            </div>
          )}
        </div>

        {structureInfo && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-800 mb-2">Informasi Spreadsheet yang Terhubung:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Nama Spreadsheet:</span>
                <span className="font-semibold text-slate-800">{structureInfo.spreadsheet_name || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Spreadsheet ID:</span>
                <span className="font-mono text-[11px] text-slate-800 truncate block">{structureInfo.spreadsheet_id || '-'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Status Pengguna:</span>
                <span className="font-semibold text-slate-800">
                  {structureInfo.total_users} pengguna ({structureInfo.has_admin ? 'Admin aktif' : 'Belum ada Admin'})
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Bagian 2: Langkah demi Langkah Deployment Google Apps Script */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          2. Petunjuk Pembuatan Google Spreadsheet & Apps Script
        </h2>

        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center shrink-0">1</span>
            <div>
              <strong className="text-slate-900">Buat Google Spreadsheet Baru:</strong>
              <p className="mt-0.5">
                Buka <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-blue-700 hover:underline inline-flex items-center gap-1">sheets.new <ExternalLink className="w-3 h-3" /></a> dengan akun Google resmi sekolah (<code className="font-mono">smpn02bengkulukota@gmail.com</code>). Beri nama dokumen: <strong className="text-slate-900">DB_TATIB_SMPN2_KOTA_BENGKULU</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center shrink-0">2</span>
            <div>
              <strong className="text-slate-900">Buka Editor Google Apps Script:</strong>
              <p className="mt-0.5">
                Di Google Spreadsheet tersebut, klik menu atas: <strong>Ekstensi (Extensions)</strong> → <strong>Apps Script</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center shrink-0">3</span>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <strong className="text-slate-900">Salin & Tempel Kode Backend:</strong>
                <button
                  onClick={copyCodeToClipboard}
                  type="button"
                  className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-800"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {isCopied ? 'Tersalin!' : 'Salin Seluruh Kode .gs'}
                </button>
              </div>
              <p className="mt-1">
                Hapus seluruh isi file <code className="font-mono">Code.gs</code> di editor Apps Script, lalu tempel kode lengkap di bawah ini:
              </p>
              <div className="mt-2 max-h-48 overflow-y-auto bg-slate-900 text-slate-200 p-3 rounded-lg font-mono text-[11px]">
                <pre>{appsScriptCode.substring(0, 1000)}... [Klik tombol Salin Seluruh Kode di atas untuk mendapatkan versi lengkap]</pre>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center shrink-0">4</span>
            <div>
              <strong className="text-slate-900">Deploy sebagai Web App:</strong>
              <ol className="list-decimal list-inside space-y-1 mt-1 pl-1">
                <li>Klik tombol biru <strong>Deploy</strong> (Terapkan) di pojok kanan atas → <strong>New deployment</strong> (Penerapan baru).</li>
                <li>Klik ikon roda gigi di sebelah kiri Select type → pilih <strong>Web app</strong>.</li>
                <li>Isi deskripsi: <code className="font-mono">SIP-TATIB v1.0</code>.</li>
                <li><strong>Execute as (Jalankan sebagai)</strong>: Pilih <strong>Me (smppn02bengkulukota@gmail.com)</strong>.</li>
                <li><strong>Who has access (Siapa yang memiliki akses)</strong>: Pilih <strong>Anyone (Siapa saja)</strong>. (Penting agar web aplikasi dapat menghubungi backend).</li>
                <li>Klik <strong>Deploy</strong>, berikan izin akses Google (Authorize Access), lalu salin <strong>Web App URL</strong> yang berakhiran <code className="font-mono">/exec</code>.</li>
              </ol>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center shrink-0">5</span>
            <div>
              <strong className="text-slate-900">Hubungkan Endpoint:</strong>
              <p className="mt-0.5">
                Tempel URL Web App ke kolom di Bagian 1 halaman ini dan klik <strong>Uji & Simpan Endpoint</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bagian 3: Spesifikasi 9 Tab Spreadsheet & Header Wajib */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          3. Struktur 9 Tab Google Spreadsheet (Tanpa Data Dummy)
        </h2>
        <p className="text-xs text-slate-600">
          Setiap tab dibuat dengan nama dan kolom berikut pada baris pertama (Row 1):
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-blue-950 block">1. Tab: Users</span>
            <code className="text-[11px] font-mono text-slate-700 block mt-1">
              user_id, username, password_hash, salt, nama, peran, status_aktif, tanggal_dibuat, terakhir_login
            </code>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-blue-950 block">2. Tab: Siswa</span>
            <code className="text-[11px] font-mono text-slate-700 block mt-1">
              siswa_id, nisn, nama_lengkap, kelas_id, tahun_ajaran, status_aktif
            </code>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-blue-950 block">3. Tab: Kelas</span>
            <code className="text-[11px] font-mono text-slate-700 block mt-1">
              kelas_id, nama_kelas, tahun_ajaran, wali_kelas_user_id, nomor_wa_wali_kelas, status_aktif
            </code>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-blue-950 block">4. Tab: MasterPelanggaran</span>
            <code className="text-[11px] font-mono text-slate-700 block mt-1">
              kode_pelanggaran, uraian, bobot_poin, kategori, status_aktif, catatan_aturan, tanggal_mulai_berlaku
            </code>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-blue-950 block">5. Tab: LaporanPelanggaran</span>
            <code className="text-[11px] font-mono text-slate-700 block mt-1">
              laporan_id, siswa_id, kode_pelanggaran, tanggal_kejadian, jam_kejadian, waktu_input, user_id_pencatat, bobot_snapshot, urutan_ke, status_hasil, poin_diberikan, status_data, catatan
            </code>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-blue-950 block">6. Tab: TindakLanjut</span>
            <code className="text-[11px] font-mono text-slate-700 block mt-1">
              tindak_lanjut_id, laporan_id, status, tanggal_tindak_lanjut, catatan, user_id_wali_kelas, waktu_pembaruan
            </code>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-blue-950 block">7. Tab: NotifikasiWA</span>
            <code className="text-[11px] font-mono text-slate-700 block mt-1">
              notifikasi_id, laporan_id, penerima, nomor_tujuan, isi_pesan, waktu_dibuat, status_pengiriman, waktu_kirim, detail_kegagalan, jumlah_percobaan
            </code>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-blue-950 block">8. Tab: AuditLog</span>
            <code className="text-[11px] font-mono text-slate-700 block mt-1">
              audit_id, user_id, waktu, aksi, nama_tabel, record_id, nilai_sebelum, nilai_sesudah, alasan_perubahan
            </code>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 md:col-span-2">
            <span className="font-bold text-blue-950 block">9. Tab: Pengaturan</span>
            <code className="text-[11px] font-mono text-slate-700 block mt-1">
              kunci, nilai, waktu_pembaruan, user_id_pengubah
            </code>
          </div>
        </div>
      </section>

      {/* Bagian 4: Integrasi WhatsApp */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          4. Ketentuan & Konfigurasi Integrasi WhatsApp
        </h2>
        <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
          <p>
            • <strong>Nomor Pengirim</strong>: Nomor WhatsApp Kesiswaan yang terdaftar pada menu Pengaturan (contoh: <code className="font-mono">6281234567890</code>).
          </p>
          <p>
            • <strong>Nomor Tujuan</strong>: Nomor WhatsApp Wali Kelas yang terdaftar pada tab Kelas sesuai kelas siswa yang melanggar.
          </p>
          <p>
            • <strong>Metode Langsung</strong>: Jika gateway otomatis belum aktif, sistem menyediakan tombol <strong>Buka WhatsApp</strong> yang langsung menyiapkan pesan di WhatsApp Web/App dengan isi lengkap dan valid.
          </p>
          <p>
            • <strong>Pencatatan Status</strong>: Status dicatat terpisah (<code className="font-mono text-slate-800">SIAP_KIRIM</code>, <code className="font-mono text-slate-800">ANTRE</code>, <code className="font-mono text-slate-800">TERKIRIM</code>, <code className="font-mono text-slate-800">DIBUKA_MANUAL</code>, <code className="font-mono text-slate-800">GAGAL</code>) untuk audit akurat.
          </p>
        </div>
      </section>
    </div>
  );
};
