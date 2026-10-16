/**
 * =========================================================================================
 * SISTEM INFORMASI PENCATATAN PELANGGARAN TATA TERTIB SEKOLAH
 * SMP NEGERI 2 KOTA BENGKULU
 * 
 * Google Apps Script Backend (API Web App)
 * Database: Google Spreadsheet (Data Nyata - Tanpa Mock/Dummy/Seed Data)
 * =========================================================================================
 */

// Konfigurasi Header Kolom Wajib untuk 9 Tab Spreadsheet
var SCHEMAS = {
  Users: [
    'user_id', 'username', 'password_hash', 'salt', 'nama', 'peran', 
    'status_aktif', 'tanggal_dibuat', 'terakhir_login'
  ],
  Siswa: [
    'siswa_id', 'nisn', 'nama_lengkap', 'kelas_id', 'tahun_ajaran', 'status_aktif'
  ],
  Kelas: [
    'kelas_id', 'nama_kelas', 'tahun_ajaran', 'wali_kelas_user_id', 
    'nomor_wa_wali_kelas', 'status_aktif'
  ],
  MasterPelanggaran: [
    'kode_pelanggaran', 'uraian', 'bobot_poin', 'kategori', 
    'status_aktif', 'catatan_aturan', 'tanggal_mulai_berlaku'
  ],
  LaporanPelanggaran: [
    'laporan_id', 'siswa_id', 'kode_pelanggaran', 'tanggal_kejadian', 
    'jam_kejadian', 'waktu_input', 'user_id_pencatat', 'bobot_snapshot', 
    'urutan_ke', 'status_hasil', 'poin_diberikan', 'status_data', 'catatan'
  ],
  TindakLanjut: [
    'tindak_lanjut_id', 'laporan_id', 'status', 'tanggal_tindak_lanjut', 
    'catatan', 'user_id_wali_kelas', 'waktu_pembaruan'
  ],
  NotifikasiWA: [
    'notifikasi_id', 'laporan_id', 'penerima', 'nomor_tujuan', 'isi_pesan', 
    'waktu_dibuat', 'status_pengiriman', 'waktu_kirim', 'detail_kegagalan', 'jumlah_percobaan'
  ],
  AuditLog: [
    'audit_id', 'user_id', 'waktu', 'aksi', 'nama_tabel', 'record_id', 
    'nilai_sebelum', 'nilai_sesudah', 'alasan_perubahan'
  ],
  Pengaturan: [
    'kunci', 'nilai', 'waktu_pembaruan', 'user_id_pengubah'
  ]
};

// Pengaturan Default Sistem (Disimpan sebagai struktur pengaturan dasar jika kosong)
var DEFAULT_PENGATURAN_KEYS = [
  'PERIODE_PERHITUNGAN_PEMBINAAN',
  'TAHUN_AJARAN_AKTIF',
  'SEMESTER_AKTIF',
  'NAMA_SEKOLAH',
  'NOMOR_WA_KESISWAAN',
  'WA_GATEWAY_API_URL',
  'WA_GATEWAY_API_KEY',
  'RUMUS_INDIKATOR_TERTIB'
];

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
  var responseData;

  try {
    if (action === 'ping' || action === 'check_structure') {
      responseData = checkStructure();
    } else if (action === 'init_structure') {
      responseData = initStructure();
    } else if (action === 'get_data') {
      var token = e.parameter.token;
      var role = e.parameter.role;
      var userId = e.parameter.user_id;
      responseData = getAllData(role, userId);
    } else {
      responseData = { success: false, error: 'Aksi GET tidak dikenali: ' + action };
    }
  } catch (err) {
    responseData = { success: false, error: err.toString(), stack: err.stack };
  }

  return createJsonResponse(responseData);
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  var responseData;

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: 'Request body tidak boleh kosong' });
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    switch (action) {
      case 'check_structure':
        responseData = checkStructure();
        break;

      case 'init_structure':
        responseData = initStructure(payload.setup_admin);
        break;

      case 'auth_login':
        responseData = authLogin(payload.username, payload.password);
        break;

      case 'setup_initial_admin':
        responseData = setupInitialAdmin(payload.username, payload.password, payload.nama);
        break;

      case 'get_all_data':
        responseData = getAllData(payload.user_role, payload.user_id);
        break;

      case 'preview_pelanggaran':
        responseData = previewPerhitunganPelanggaran(
          payload.siswa_id, 
          payload.kode_pelanggaran, 
          payload.tanggal_kejadian, 
          payload.jam_kejadian
        );
        break;

      case 'simpan_laporan':
        responseData = simpanLaporan(payload);
        break;

      case 'batalkan_laporan':
        responseData = batalkanLaporan(payload.laporan_id, payload.alasan, payload.user_id);
        break;

      case 'update_tindak_lanjut':
        responseData = updateTindakLanjut(payload);
        break;

      case 'update_notifikasi_wa':
        responseData = updateNotifikasiWA(payload.notifikasi_id, payload.status_pengiriman, payload.detail_kegagalan);
        break;

      case 'crud_siswa':
        responseData = crudSiswa(payload);
        break;

      case 'crud_kelas':
        responseData = crudKelas(payload);
        break;

      case 'crud_master_pelanggaran':
        responseData = crudMasterPelanggaran(payload);
        break;

      case 'crud_user':
        responseData = crudUser(payload);
        break;

      case 'update_pengaturan':
        responseData = updatePengaturan(payload.pengaturan, payload.user_id);
        break;

      case 'rekalkulasi_semua_poin':
        responseData = rekalkulasiSemuaPoin(payload.user_id);
        break;

      default:
        responseData = { success: false, error: 'Aksi POST tidak dikenali: ' + action };
    }
  } catch (err) {
    responseData = { success: false, error: err.toString(), stack: err.stack };
  }

  return createJsonResponse(responseData);
}

/**
 * Buat Output JSON dengan Header yang Tepat
 */
function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Dapatkan Spreadsheet Aktif
 */
function getSpreadsheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch (e) {}

  // Script Properties fallback jika dibuat sebagai standalone script
  try {
    var ssId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (ssId) {
      return SpreadsheetApp.openById(ssId);
    }
  } catch (e) {}

  throw new Error('Google Spreadsheet tidak ditemukan. Buka Apps Script langsung dari menu Ekstensi -> Apps Script pada Google Spreadsheet Anda.');
}

/**
 * Periksa Struktur Tab & Kolom pada Spreadsheet
 * TIDAK MENGISI DATA DUMMY
 */
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
      var headerRange = sheet.getRange(1, 1, 1, lastCol).getValues();
      actualHeaders = headerRange[0].map(function(h) { return String(h).trim(); });
    }

    var expectedHeaders = SCHEMAS[name];
    var missingCols = [];
    for (var j = 0; j < expectedHeaders.length; j++) {
      if (actualHeaders.indexOf(expectedHeaders[j]) === -1) {
        missingCols.push(expectedHeaders[j]);
      }
    }

    if (missingCols.length > 0) {
      isFullyValid = false;
    }

    sheetsStatus[name] = {
      exists: true,
      missing_columns: missingCols,
      total_rows: totalRows
    };
  }

  // Hitung jumlah akun Users nyata
  var totalUsers = 0;
  var hasAdmin = false;
  var usersSheet = ss.getSheetByName('Users');
  if (usersSheet && usersSheet.getLastRow() > 1) {
    var usersData = readTableAsObjects(usersSheet);
    totalUsers = usersData.length;
    for (var u = 0; u < usersData.length; u++) {
      if (usersData[u].peran === 'ADMIN' && usersData[u].status_aktif === 'AKTIF') {
        hasAdmin = true;
        break;
      }
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

/**
 * Inisialisasi Tab dan Header Kosong Tanpa Data Contoh
 */
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
    
    // Periksa apakah baris 1 benar-benar kosong
    var isRow1Empty = (lastRow === 0 || lastCol === 0);
    if (!isRow1Empty) {
      var headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var nonEmptyCount = headerValues.filter(function(v) { return String(v).trim() !== ''; }).length;
      if (nonEmptyCount === 0) {
        isRow1Empty = true;
      }
    }

    if (isRow1Empty) {
      // Tulis seluruh header kolom mulai dari kolom 1
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f1f5f9');
      sheet.setFrozenRows(1);
    } else {
      // Pastikan semua kolom wajib ada
      var actualHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); });
      var missing = [];
      for (var j = 0; j < headers.length; j++) {
        if (actualHeaders.indexOf(headers[j]) === -1) {
          missing.push(headers[j]);
        }
      }
      if (missing.length > 0) {
        var startCol = lastCol + 1;
        sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
        sheet.getRange(1, startCol, 1, missing.length).setFontWeight('bold').setBackground('#f1f5f9');
      }
    }
  }

  // Hapus tab bawaan Sheet1 / Lembar1 jika kosong agar spreadsheet bersih
  try {
    var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Lembar1');
    if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }
  } catch (e) {}

  // Jika ada adminSetup yang disertakan saat inisialisasi akun pertama yang sah
  if (adminSetup && adminSetup.username && adminSetup.password && adminSetup.nama) {
    setupInitialAdmin(adminSetup.username, adminSetup.password, adminSetup.nama);
  }

  return {
    success: true,
    message: 'Struktur 9 tab Google Spreadsheet berhasil diinisialisasi dengan header kolom kosong tanpa data dummy.',
    created_sheets: createdSheets
  };
}

/**
 * Baca Sheet Menjadi Array of Objects
 */
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
    // Abaikan jika baris kosong sepenuhnya
    var hasContent = row.some(function(cell) { return cell !== '' && cell !== null && cell !== undefined; });
    if (!hasContent) continue;

    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var header = headers[c];
      var cellVal = row[c];
      if (cellVal instanceof Date) {
        cellVal = Utilities.formatDate(cellVal, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
      }
      obj[header] = cellVal !== undefined ? cellVal : '';
    }
    results.push(obj);
  }

  return results;
}

/**
 * Hashing Password Aman dengan SHA-256 dan Salt
 */
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

/**
 * Buat Salt Acak
 */
function generateSalt() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

/**
 * Autentikasi Pengguna dari Sheet Users
 */
function authLogin(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Username dan kata sandi wajib diisi.' };
  }

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) {
    return { success: false, error: 'Tab Users belum tersedia di Spreadsheet.' };
  }

  var users = readTableAsObjects(sheet);
  if (users.length === 0) {
    return { 
      success: false, 
      error: 'Belum ada pengguna terdaftar di Spreadsheet. Silakan lakukan setup akun Administrator resmi pertama.',
      needs_initial_setup: true 
    };
  }

  var targetUser = null;
  var userRowIndex = -1;

  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username).trim().toLowerCase() === String(username).trim().toLowerCase()) {
      targetUser = users[i];
      userRowIndex = i + 2; // +1 header, +1 1-based index
      break;
    }
  }

  if (!targetUser) {
    return { success: false, error: 'Nama pengguna atau kata sandi tidak valid.' };
  }

  if (targetUser.status_aktif !== 'AKTIF') {
    return { success: false, error: 'Akun ini dalam status nonaktif. Silakan hubungi Administrator.' };
  }

  var calculatedHash = hashPassword(password, targetUser.salt);
  if (calculatedHash !== targetUser.password_hash) {
    return { success: false, error: 'Nama pengguna atau kata sandi tidak valid.' };
  }

  // Update waktu terakhir login
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var lastLoginCol = headers.indexOf('terakhir_login') + 1;
  if (lastLoginCol > 0) {
    sheet.getRange(userRowIndex, lastLoginCol).setValue(nowStr);
  }

  // Catat AuditLog
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

/**
 * Setup Administrator Pertama Resmi (Hanya diperbolehkan jika belum ada akun aktif)
 */
function setupInitialAdmin(username, password, nama) {
  if (!username || !password || !nama) {
    return { success: false, error: 'Username, password, dan nama wajib diisi lengkap.' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Password minimal 6 karakter demi keamanan akun sekolah.' };
  }

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) {
    initStructure();
    sheet = ss.getSheetByName('Users');
  }

  var users = readTableAsObjects(sheet);
  if (users.length > 0) {
    // Periksa apakah sudah ada admin
    for (var i = 0; i < users.length; i++) {
      if (users[i].peran === 'ADMIN') {
        return { 
          success: false, 
          error: 'Administrator sudah ada dalam sistem. Pembuatan pengguna baru harus dilakukan melalui menu Manajemen Pengguna oleh Admin.' 
        };
      }
    }
  }

  var salt = generateSalt();
  var passwordHash = hashPassword(password, salt);
  var userId = 'USR-' + Utilities.getUuid().substring(0, 8).toUpperCase();
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');

  var newRow = [
    userId,
    username.trim(),
    passwordHash,
    salt,
    nama.trim(),
    'ADMIN',
    'AKTIF',
    nowStr,
    nowStr
  ];

  sheet.appendRow(newRow);

  // Inisialisasi pengaturan default jika kosong
  initDefaultSettings(userId);

  writeAuditLog(userId, 'SETUP_INITIAL_ADMIN', 'Users', userId, '', JSON.stringify({ username: username, nama: nama }), 'Pembuatan Administrator Pertama Resmi');

  return {
    success: true,
    message: 'Administrator resmi pertama berhasil dibuat.',
    data: {
      user_id: userId,
      username: username,
      nama: nama,
      peran: 'ADMIN',
      status_aktif: 'AKTIF'
    }
  };
}

/**
 * Inisialisasi Pengaturan Default Jika Belum Ada
 */
function initDefaultSettings(userId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Pengaturan');
  if (!sheet) return;

  var current = readTableAsObjects(sheet);
  var currentMap = {};
  for (var i = 0; i < current.length; i++) {
    currentMap[current[i].kunci] = current[i].nilai;
  }

  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  var defaultValues = {
    NAMA_SEKOLAH: 'SMP Negeri 2 Kota Bengkulu',
    TAHUN_AJARAN_AKTIF: '2026/2027',
    SEMESTER_AKTIF: 'Ganjil',
    PERIODE_PERHITUNGAN_PEMBINAAN: 'TAHUN_AJARAN_2026/2027',
    SKEMA_POIN_PELANGGARAN: 'LANGSUNG_BERPOIN',
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

/**
 * Ambil Semua Data Nyata dari Spreadsheet
 * Dengan Filter Otorisasi Sesuai Hak Akses Pengguna
 */
function getAllData(userRole, userId) {
  var ss = getSpreadsheet();
  var result = {};

  var sheetNames = Object.keys(SCHEMAS);
  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var sheet = ss.getSheetByName(name);
    result[name] = readTableAsObjects(sheet);
  }

  // Jika tab Users dibaca, jangan kirim password_hash dan salt ke frontend!
  if (result.Users) {
    result.Users = result.Users.map(function(u) {
      return {
        user_id: u.user_id,
        username: u.username,
        nama: u.nama,
        peran: u.peran,
        status_aktif: u.status_aktif,
        tanggal_dibuat: u.tanggal_dibuat,
        terakhir_login: u.terakhir_login
      };
    });
  }

  // Otorisasi Khusus Wali Kelas:
  // Jika perannya WALI_KELAS, identifikasi kelas tanggung jawabnya
  if (userRole === 'WALI_KELAS' && userId) {
    var kelasWaliList = [];
    if (result.Kelas) {
      for (var k = 0; k < result.Kelas.length; k++) {
        if (result.Kelas[k].wali_kelas_user_id === userId) {
          kelasWaliList.push(result.Kelas[k].kelas_id);
        }
      }
    }
    // Wali kelas tetap dapat melihat data pembinaan kelasnya dan daftar master
    result.assigned_kelas_ids = kelasWaliList;
  }

  return {
    success: true,
    data: result
  };
}

/**
 * Hitung Status dan Urutan Pelanggaran (Aturan Bagian D)
 * - Bobot 1-29: 3 kejadian sah pertama -> PEMBINAAN_1, 2, 3 (poin 0). Kejadian ke-4+ -> BERPOIN (poin = bobot)
 * - Bobot 30-100: Langsung BERPOIN (poin = bobot)
 */
function previewPerhitunganPelanggaran(siswaId, kodePelanggaran, tanggalKejadian, jamKejadian) {
  var ss = getSpreadsheet();
  
  // Baca MasterPelanggaran
  var masterSheet = ss.getSheetByName('MasterPelanggaran');
  var masters = readTableAsObjects(masterSheet);
  var targetMaster = null;
  for (var m = 0; m < masters.length; m++) {
    if (masters[m].kode_pelanggaran === kodePelanggaran && masters[m].status_aktif === 'AKTIF') {
      targetMaster = masters[m];
      break;
    }
  }

  if (!targetMaster) {
    return { success: false, error: 'Kode pelanggaran tidak ditemukan atau tidak aktif: ' + kodePelanggaran };
  }

  var bobot = Number(targetMaster.bobot_poin) || 0;

  // Baca Pengaturan Periode
  var settingsSheet = ss.getSheetByName('Pengaturan');
  var settings = readTableAsObjects(settingsSheet);
  var periodeAktif = '';
  for (var s = 0; s < settings.length; s++) {
    if (settings[s].kunci === 'PERIODE_PERHITUNGAN_PEMBINAAN') {
      periodeAktif = settings[s].nilai;
      break;
    }
  }

  if (!periodeAktif) {
    return {
      success: false,
      error: 'PERINGATAN: Periode perhitungan pembinaan belum ditetapkan pada Pengaturan. Administrator wajib menetapkan periode terlebih dahulu sebelum pencatatan dilakukan.'
    };
  }

  // Hitung riwayat kejadian sah sebelumnya untuk kombinasi (siswa_id, kode_pelanggaran)
  var laporanSheet = ss.getSheetByName('LaporanPelanggaran');
  var allLaporan = readTableAsObjects(laporanSheet);

  var riwayatSebelumnya = [];
  for (var i = 0; i < allLaporan.length; i++) {
    var lap = allLaporan[i];
    if (
      lap.siswa_id === siswaId &&
      lap.kode_pelanggaran === kodePelanggaran &&
      lap.status_data === 'VALID'
    ) {
      riwayatSebelumnya.push(lap);
    }
  }

  // Urutan kejadian baru
  var urutanKe = riwayatSebelumnya.length + 1;
  var statusHasil = '';
  var poinDiberikan = 0;

  // Baca Skema Perhitungan Poin (Default: LANGSUNG_BERPOIN)
  var skemaPoin = 'LANGSUNG_BERPOIN';
  for (var sp = 0; sp < settings.length; sp++) {
    if (settings[sp].kunci === 'SKEMA_POIN_PELANGGARAN') {
      skemaPoin = settings[sp].nilai;
      break;
    }
  }

  // Jika sekolah mengaktifkan opsi pembinaan bertahap 1-3 khusus bobot 1-29
  if (skemaPoin === 'PEMBINAAN_BERTAHAP_1_3' && bobot >= 1 && bobot <= 29) {
    if (urutanKe === 1) {
      statusHasil = 'PEMBINAAN_1';
      poinDiberikan = 0;
    } else if (urutanKe === 2) {
      statusHasil = 'PEMBINAAN_2';
      poinDiberikan = 0;
    } else if (urutanKe === 3) {
      statusHasil = 'PEMBINAAN_3';
      poinDiberikan = 0;
    } else {
      statusHasil = 'BERPOIN';
      poinDiberikan = bobot;
    }
  } else {
    // Standar Sekolah: Setiap pelanggaran langsung mendapatkan poin penuh sesuai bobot
    statusHasil = 'BERPOIN';
    poinDiberikan = bobot;
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

/**
 * Simpan Laporan Pelanggaran ke Spreadsheet
 * Dilengkapi Pengecekan Idempotensi, Validasi Data Nyata, Snapshot Bobot,
 * dan Pembuatan Entri Tindak Lanjut Serta Notifikasi WA Otomatis
 */
function simpanLaporan(payload) {
  var ss = getSpreadsheet();
  var laporanSheet = ss.getSheetByName('LaporanPelanggaran');
  var siswaSheet = ss.getSheetByName('Siswa');
  var kelasSheet = ss.getSheetByName('Kelas');
  var tindakLanjutSheet = ss.getSheetByName('TindakLanjut');
  var notifikasiSheet = ss.getSheetByName('NotifikasiWA');

  if (!laporanSheet || !siswaSheet || !kelasSheet) {
    return { success: false, error: 'Struktur Spreadsheet belum lengkap.' };
  }

  var siswaId = payload.siswa_id;
  var kodePelanggaran = payload.kode_pelanggaran;
  var tanggalKejadian = payload.tanggal_kejadian;
  var jamKejadian = payload.jam_kejadian;
  var userIdPencatat = payload.user_id_pencatat;
  var catatan = payload.catatan || '';

  if (!siswaId || !kodePelanggaran || !tanggalKejadian || !jamKejadian || !userIdPencatat) {
    return { success: false, error: 'Semua kolom wajib laporan pelanggaran harus diisi.' };
  }

  // Validasi Siswa Nyata
  var siswaList = readTableAsObjects(siswaSheet);
  var targetSiswa = null;
  for (var s = 0; s < siswaList.length; s++) {
    if (siswaList[s].siswa_id === siswaId && siswaList[s].status_aktif === 'AKTIF') {
      targetSiswa = siswaList[s];
      break;
    }
  }
  if (!targetSiswa) {
    return { success: false, error: 'Siswa tidak ditemukan atau berstatus nonaktif di Spreadsheet.' };
  }

  // Validasi Kelas & Wali Kelas
  var kelasList = readTableAsObjects(kelasSheet);
  var targetKelas = null;
  for (var k = 0; k < kelasList.length; k++) {
    if (kelasList[k].kelas_id === targetSiswa.kelas_id) {
      targetKelas = kelasList[k];
      break;
    }
  }

  // Hitung ulang dan validasi status hasil & poin di backend
  var previewResult = previewPerhitunganPelanggaran(siswaId, kodePelanggaran, tanggalKejadian, jamKejadian);
  if (!previewResult.success) {
    return previewResult;
  }

  var calc = previewResult.data;
  var now = new Date();
  var nowStr = Utilities.formatDate(now, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');

  // Idempotensi / Pencegahan Submit Ganda
  var recentLaporan = readTableAsObjects(laporanSheet);
  for (var r = recentLaporan.length - 1; r >= 0 && r >= recentLaporan.length - 10; r--) {
    var checkLap = recentLaporan[r];
    if (
      checkLap.siswa_id === siswaId &&
      checkLap.kode_pelanggaran === kodePelanggaran &&
      checkLap.tanggal_kejadian === tanggalKejadian &&
      checkLap.jam_kejadian === jamKejadian &&
      checkLap.status_data === 'VALID'
    ) {
      return { 
        success: false, 
        error: 'Peringatan: Laporan untuk siswa, kode, dan jam kejadian yang sama sudah tersimpan sebelumnya.' 
      };
    }
  }

  var laporanId = 'LAP-' + Utilities.formatDate(now, 'Asia/Jakarta', 'yyyyMMdd') + '-' + Utilities.getUuid().substring(0, 6).toUpperCase();

  // Simpan ke LaporanPelanggaran
  var rowLaporan = [
    laporanId,
    siswaId,
    kodePelanggaran,
    tanggalKejadian,
    jamKejadian,
    nowStr,
    userIdPencatat,
    calc.bobot_snapshot,
    calc.urutan_ke,
    calc.status_hasil,
    calc.poin_diberikan,
    'VALID',
    catatan
  ];
  laporanSheet.appendRow(rowLaporan);

  // Buat Catatan Tindak Lanjut untuk Wali Kelas
  var tindakLanjutId = 'TL-' + Utilities.getUuid().substring(0, 8).toUpperCase();
  var waliKelasUserId = targetKelas ? targetKelas.wali_kelas_user_id : '';
  var rowTindakLanjut = [
    tindakLanjutId,
    laporanId,
    'BELUM',
    '',
    '',
    waliKelasUserId,
    nowStr
  ];
  if (tindakLanjutSheet) {
    tindakLanjutSheet.appendRow(rowTindakLanjut);
  }

  // Siapkan Notifikasi WhatsApp untuk Wali Kelas
  var nomorWaWali = targetKelas ? targetKelas.nomor_wa_wali_kelas : '';
  var namaKelas = targetKelas ? targetKelas.nama_kelas : '-';
  var statusText = calc.status_hasil === 'BERPOIN' 
    ? 'BERPOIN (+ ' + calc.poin_diberikan + ' Poin)' 
    : 'PEMBINAAN KE-' + calc.urutan_ke + ' (0 Poin)';

  var isiPesanWA = 
    '*PEMBERITAHUAN TATA TERTIB SMP NEGERI 2 KOTA BENGKULU*\n\n' +
    'Yth. Wali Kelas ' + namaKelas + ',\n\n' +
    'Telah dicatat kejadian pelanggaran tata tertib siswa berikut:\n' +
    '• *Nama Siswa*: ' + targetSiswa.nama_lengkap + '\n' +
    '• *NISN*: ' + targetSiswa.nisn + '\n' +
    '• *Kelas*: ' + namaKelas + '\n' +
    '• *Pelanggaran*: [' + kodePelanggaran + '] ' + calc.uraian + '\n' +
    '• *Waktu Kejadian*: ' + tanggalKejadian + ' pukul ' + jamKejadian + ' WIB\n' +
    '• *Klasifikasi*: ' + statusText + '\n' +
    '• *Catatan*: ' + (catatan ? catatan : '-') + '\n\n' +
    'Mohon Bapak/Ibu Wali Kelas menindaklanjuti pembinaan siswa melalui Sistem Tata Tertib Sekolah.\n\n' +
    'Kesiswaan SMPN 2 Kota Bengkulu';

  var notifikasiId = 'NOTIF-' + Utilities.getUuid().substring(0, 8).toUpperCase();
  var rowNotifikasi = [
    notifikasiId,
    laporanId,
    'Wali Kelas ' + namaKelas,
    nomorWaWali,
    isiPesanWA,
    nowStr,
    'SIAP_KIRIM',
    '',
    '',
    0
  ];
  if (notifikasiSheet) {
    notifikasiSheet.appendRow(rowNotifikasi);
  }

  // Audit Log
  writeAuditLog(userIdPencatat, 'SIMPAN_LAPORAN', 'LaporanPelanggaran', laporanId, '', JSON.stringify({
    siswa_id: siswaId,
    kode_pelanggaran: kodePelanggaran,
    status_hasil: calc.status_hasil,
    poin_diberikan: calc.poin_diberikan
  }), 'Pencatatan pelanggaran baru');

  return {
    success: true,
    message: 'Laporan pelanggaran berhasil disimpan ke Google Spreadsheet.',
    data: {
      laporan_id: laporanId,
      siswa_id: siswaId,
      kode_pelanggaran: kodePelanggaran,
      tanggal_kejadian: tanggalKejadian,
      jam_kejadian: jamKejadian,
      bobot_snapshot: calc.bobot_snapshot,
      urutan_ke: calc.urutan_ke,
      status_hasil: calc.status_hasil,
      poin_diberikan: calc.poin_diberikan,
      status_data: 'VALID',
      catatan: catatan,
      tindak_lanjut_id: tindakLanjutId,
      notifikasi_id: notifikasiId,
      nomor_wa_wali: nomorWaWali,
      isi_pesan_wa: isiPesanWA
    }
  };
}

/**
 * Pembatalan Laporan Pelanggaran Beserta Rekalkulasi Urutan dan Poin
 */
function batalkanLaporan(laporanId, alasan, userId) {
  if (!laporanId || !alasan || !userId) {
    return { success: false, error: 'ID laporan, alasan pembatalan, dan identitas pengguna wajib diisi.' };
  }

  var ss = getSpreadsheet();
  var laporanSheet = ss.getSheetByName('LaporanPelanggaran');
  if (!laporanSheet) return { success: false, error: 'Tab LaporanPelanggaran tidak ditemukan.' };

  var records = readTableAsObjects(laporanSheet);
  var targetRowIdx = -1;
  var targetRecord = null;

  for (var i = 0; i < records.length; i++) {
    if (records[i].laporan_id === laporanId) {
      targetRecord = records[i];
      targetRowIdx = i + 2;
      break;
    }
  }

  if (!targetRecord) {
    return { success: false, error: 'Laporan dengan ID ' + laporanId + ' tidak ditemukan.' };
  }

  if (targetRecord.status_data === 'DIBATALKAN') {
    return { success: false, error: 'Laporan ini sudah dibatalkan sebelumnya.' };
  }

  var headers = laporanSheet.getRange(1, 1, 1, laporanSheet.getLastColumn()).getValues()[0];
  var colStatusData = headers.indexOf('status_data') + 1;
  var colCatatan = headers.indexOf('catatan') + 1;

  var oldStatus = targetRecord.status_data;
  laporanSheet.getRange(targetRowIdx, colStatusData).setValue('DIBATALKAN');
  
  var updatedCatatan = (targetRecord.catatan ? targetRecord.catatan + ' ' : '') + 
    '[DIBATALKAN oleh ' + userId + ' pada ' + new Date().toISOString() + ' Alasan: ' + alasan + ']';
  if (colCatatan > 0) {
    laporanSheet.getRange(targetRowIdx, colCatatan).setValue(updatedCatatan);
  }

  // Rekalkulasi Laporan Lain yang Terdampak untuk (siswa_id, kode_pelanggaran) yang sama
  rekalkulasiLaporanSiswa(targetRecord.siswa_id, targetRecord.kode_pelanggaran, userId);

  writeAuditLog(userId, 'BATALKAN_LAPORAN', 'LaporanPelanggaran', laporanId, oldStatus, 'DIBATALKAN', alasan);

  return {
    success: true,
    message: 'Laporan berhasil dibatalkan dan urutan serta poin kejadian yang terdampak telah direkalkulasi secara konsisten.'
  };
}

/**
 * Rekalkulasi Urutan dan Poin Setelah Pembatalan Laporan
 */
function rekalkulasiLaporanSiswa(siswaId, kodePelanggaran, modifierUserId) {
  var ss = getSpreadsheet();
  var laporanSheet = ss.getSheetByName('LaporanPelanggaran');
  var records = readTableAsObjects(laporanSheet);

  var relevant = [];
  for (var i = 0; i < records.length; i++) {
    if (
      records[i].siswa_id === siswaId &&
      records[i].kode_pelanggaran === kodePelanggaran &&
      records[i].status_data === 'VALID'
    ) {
      relevant.push({ record: records[i], rowIndex: i + 2 });
    }
  }

  // Urutkan berdasarkan tanggal, jam, dan waktu_input
  relevant.sort(function(a, b) {
    var dtA = (a.record.tanggal_kejadian || '') + ' ' + (a.record.jam_kejadian || '') + ' ' + (a.record.waktu_input || '');
    var dtB = (b.record.tanggal_kejadian || '') + ' ' + (b.record.jam_kejadian || '') + ' ' + (b.record.waktu_input || '');
    return dtA.localeCompare(dtB);
  });

  var headers = laporanSheet.getRange(1, 1, 1, laporanSheet.getLastColumn()).getValues()[0];
  var colUrutan = headers.indexOf('urutan_ke') + 1;
  var colStatusHasil = headers.indexOf('status_hasil') + 1;
  var colPoin = headers.indexOf('poin_diberikan') + 1;

  // Baca skema pengaturan
  var settingsSheet = ss.getSheetByName('Pengaturan');
  var settings = readTableAsObjects(settingsSheet);
  var skemaPoin = 'LANGSUNG_BERPOIN';
  for (var sp = 0; sp < settings.length; sp++) {
    if (settings[sp].kunci === 'SKEMA_POIN_PELANGGARAN') {
      skemaPoin = settings[sp].nilai;
      break;
    }
  }

  for (var j = 0; j < relevant.length; j++) {
    var item = relevant[j];
    var bobot = Number(item.record.bobot_snapshot) || 0;
    var newUrutan = j + 1;
    var newStatusHasil = '';
    var newPoin = 0;

    if (skemaPoin === 'PEMBINAAN_BERTAHAP_1_3' && bobot >= 1 && bobot <= 29) {
      if (newUrutan === 1) {
        newStatusHasil = 'PEMBINAAN_1';
        newPoin = 0;
      } else if (newUrutan === 2) {
        newStatusHasil = 'PEMBINAAN_2';
        newPoin = 0;
      } else if (newUrutan === 3) {
        newStatusHasil = 'PEMBINAAN_3';
        newPoin = 0;
      } else {
        newStatusHasil = 'BERPOIN';
        newPoin = bobot;
      }
    } else {
      newStatusHasil = 'BERPOIN';
      newPoin = bobot;
    }

    if (
      Number(item.record.urutan_ke) !== newUrutan ||
      item.record.status_hasil !== newStatusHasil ||
      Number(item.record.poin_diberikan) !== newPoin
    ) {
      laporanSheet.getRange(item.rowIndex, colUrutan).setValue(newUrutan);
      laporanSheet.getRange(item.rowIndex, colStatusHasil).setValue(newStatusHasil);
      laporanSheet.getRange(item.rowIndex, colPoin).setValue(newPoin);

      writeAuditLog(
        modifierUserId, 
        'REKALKULASI_OTOMATIS', 
        'LaporanPelanggaran', 
        item.record.laporan_id, 
        JSON.stringify({ urutan_ke: item.record.urutan_ke, status_hasil: item.record.status_hasil, poin: item.record.poin_diberikan }),
        JSON.stringify({ urutan_ke: newUrutan, status_hasil: newStatusHasil, poin: newPoin }),
        'Penyesuaian urutan pembinaan dan poin akibat pembatalan laporan terkait'
      );
    }
  }
}

/**
 * Rekalkulasi Seluruh Poin Laporan Pelanggaran Siswa
 * Mengupdate seluruh data valid di tab LaporanPelanggaran yang masih 0 poin
 * agar mendapatkan poin sesuai bobot snapshot pelanggaran.
 */
function rekalkulasiSemuaPoin(userId) {
  var ss = getSpreadsheet();
  var laporanSheet = ss.getSheetByName('LaporanPelanggaran');
  if (!laporanSheet) return { success: false, error: 'Tab LaporanPelanggaran tidak ditemukan.' };

  var records = readTableAsObjects(laporanSheet);
  var headers = laporanSheet.getRange(1, 1, 1, laporanSheet.getLastColumn()).getValues()[0];
  var colPoin = headers.indexOf('poin_diberikan') + 1;
  var colStatus = headers.indexOf('status_hasil') + 1;
  var updatedCount = 0;

  for (var i = 0; i < records.length; i++) {
    var rec = records[i];
    if (rec.status_data === 'VALID') {
      var bobot = Number(rec.bobot_snapshot) || 0;
      var currentPoin = Number(rec.poin_diberikan) || 0;
      if (currentPoin === 0 && bobot > 0) {
        var row = i + 2;
        laporanSheet.getRange(row, colPoin).setValue(bobot);
        laporanSheet.getRange(row, colStatus).setValue('BERPOIN');
        updatedCount++;
      }
    }
  }

  writeAuditLog(
    userId || 'SYSTEM', 
    'REKALKULASI_SEMUA_POIN', 
    'LaporanPelanggaran', 
    '', 
    '', 
    '', 
    'Sinkronisasi poin seluruh laporan: ' + updatedCount + ' data berhasil diperbarui ke bobot penuh'
  );

  return {
    success: true,
    message: 'Sinkronisasi berhasil! ' + updatedCount + ' laporan siswa telah diperbarui menjadi berpoin penuh sesuai bobot tata tertib.',
    updated_count: updatedCount
  };
}

/**
 * Update Tindak Lanjut oleh Wali Kelas
 */
function updateTindakLanjut(payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('TindakLanjut');
  if (!sheet) return { success: false, error: 'Tab TindakLanjut tidak ditemukan.' };

  var records = readTableAsObjects(sheet);
  var targetRow = -1;
  var oldData = null;

  for (var i = 0; i < records.length; i++) {
    if (records[i].tindak_lanjut_id === payload.tindak_lanjut_id) {
      targetRow = i + 2;
      oldData = records[i];
      break;
    }
  }

  if (targetRow === -1) {
    return { success: false, error: 'Catatan tindak lanjut tidak ditemukan.' };
  }

  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var colStatus = headers.indexOf('status') + 1;
  var colTanggal = headers.indexOf('tanggal_tindak_lanjut') + 1;
  var colCatatan = headers.indexOf('catatan') + 1;
  var colWali = headers.indexOf('user_id_wali_kelas') + 1;
  var colUpdate = headers.indexOf('waktu_pembaruan') + 1;

  if (payload.status) sheet.getRange(targetRow, colStatus).setValue(payload.status);
  if (payload.tanggal_tindak_lanjut) sheet.getRange(targetRow, colTanggal).setValue(payload.tanggal_tindak_lanjut);
  if (payload.catatan !== undefined) sheet.getRange(targetRow, colCatatan).setValue(payload.catatan);
  if (payload.user_id) sheet.getRange(targetRow, colWali).setValue(payload.user_id);
  sheet.getRange(targetRow, colUpdate).setValue(nowStr);

  writeAuditLog(
    payload.user_id || 'UNKNOWN',
    'UPDATE_TINDAK_LANJUT',
    'TindakLanjut',
    payload.tindak_lanjut_id,
    JSON.stringify(oldData),
    JSON.stringify(payload),
    'Pembaruan status pembinaan oleh wali kelas'
  );

  return { success: true, message: 'Tindak lanjut berhasil diperbarui di Google Spreadsheet.' };
}

/**
 * Update Status Notifikasi WhatsApp
 */
function updateNotifikasiWA(notifikasiId, statusPengiriman, detailKegagalan) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('NotifikasiWA');
  if (!sheet) return { success: false, error: 'Tab NotifikasiWA tidak ditemukan.' };

  var records = readTableAsObjects(sheet);
  var targetRow = -1;
  var currentRecord = null;

  for (var i = 0; i < records.length; i++) {
    if (records[i].notifikasi_id === notifikasiId) {
      targetRow = i + 2;
      currentRecord = records[i];
      break;
    }
  }

  if (targetRow === -1) {
    return { success: false, error: 'Data notifikasi tidak ditemukan.' };
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colStatus = headers.indexOf('status_pengiriman') + 1;
  var colWaktuKirim = headers.indexOf('waktu_kirim') + 1;
  var colDetail = headers.indexOf('detail_kegagalan') + 1;
  var colPercobaan = headers.indexOf('jumlah_percobaan') + 1;

  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  var percobaan = (Number(currentRecord.jumlah_percobaan) || 0) + 1;

  sheet.getRange(targetRow, colStatus).setValue(statusPengiriman);
  sheet.getRange(targetRow, colPercobaan).setValue(percobaan);

  if (statusPengiriman === 'TERKIRIM' || statusPengiriman === 'DIBUKA_MANUAL') {
    sheet.getRange(targetRow, colWaktuKirim).setValue(nowStr);
  }
  if (detailKegagalan) {
    sheet.getRange(targetRow, colDetail).setValue(detailKegagalan);
  }

  return { success: true, message: 'Status pengiriman WhatsApp berhasil diperbarui.' };
}

/**
 * CRUD Siswa
 */
function crudSiswa(payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Siswa');
  if (!sheet) return { success: false, error: 'Tab Siswa belum ada.' };

  var subAction = payload.sub_action; // 'create', 'update', 'toggle_status'
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (subAction === 'create') {
    var siswaId = 'SISWA-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    var newRow = [
      siswaId,
      String(payload.nisn).trim(),
      String(payload.nama_lengkap).trim(),
      String(payload.kelas_id).trim(),
      String(payload.tahun_ajaran).trim(),
      'AKTIF'
    ];
    sheet.appendRow(newRow);
    writeAuditLog(payload.user_id, 'CREATE_SISWA', 'Siswa', siswaId, '', JSON.stringify(payload), 'Tambah siswa baru');
    return { success: true, message: 'Data siswa berhasil disimpan.', data: { siswa_id: siswaId } };
  }

  if (subAction === 'update') {
    var records = readTableAsObjects(sheet);
    for (var i = 0; i < records.length; i++) {
      if (records[i].siswa_id === payload.siswa_id) {
        var row = i + 2;
        if (payload.nisn) sheet.getRange(row, headers.indexOf('nisn') + 1).setValue(payload.nisn);
        if (payload.nama_lengkap) sheet.getRange(row, headers.indexOf('nama_lengkap') + 1).setValue(payload.nama_lengkap);
        if (payload.kelas_id) sheet.getRange(row, headers.indexOf('kelas_id') + 1).setValue(payload.kelas_id);
        if (payload.tahun_ajaran) sheet.getRange(row, headers.indexOf('tahun_ajaran') + 1).setValue(payload.tahun_ajaran);
        if (payload.status_aktif) sheet.getRange(row, headers.indexOf('status_aktif') + 1).setValue(payload.status_aktif);

        writeAuditLog(payload.user_id, 'UPDATE_SISWA', 'Siswa', payload.siswa_id, JSON.stringify(records[i]), JSON.stringify(payload), 'Perbarui siswa');
        return { success: true, message: 'Data siswa berhasil diperbarui.' };
      }
    }
    return { success: false, error: 'Siswa tidak ditemukan.' };
  }

  return { success: false, error: 'Sub aksi siswa tidak valid.' };
}

/**
 * CRUD Kelas
 */
function crudKelas(payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Kelas');
  if (!sheet) return { success: false, error: 'Tab Kelas belum ada.' };

  var subAction = payload.sub_action;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (subAction === 'create') {
    var kelasId = String(payload.kelas_id || ('KLS-' + Utilities.getUuid().substring(0, 6).toUpperCase())).trim();
    var newRow = [
      kelasId,
      String(payload.nama_kelas).trim(),
      String(payload.tahun_ajaran).trim(),
      String(payload.wali_kelas_user_id || '').trim(),
      String(payload.nomor_wa_wali_kelas || '').trim(),
      'AKTIF'
    ];
    sheet.appendRow(newRow);
    writeAuditLog(payload.user_id, 'CREATE_KELAS', 'Kelas', kelasId, '', JSON.stringify(payload), 'Tambah kelas');
    return { success: true, message: 'Data kelas berhasil disimpan.' };
  }

  if (subAction === 'update') {
    var records = readTableAsObjects(sheet);
    for (var i = 0; i < records.length; i++) {
      if (records[i].kelas_id === payload.kelas_id) {
        var row = i + 2;
        if (payload.nama_kelas) sheet.getRange(row, headers.indexOf('nama_kelas') + 1).setValue(payload.nama_kelas);
        if (payload.tahun_ajaran) sheet.getRange(row, headers.indexOf('tahun_ajaran') + 1).setValue(payload.tahun_ajaran);
        if (payload.wali_kelas_user_id !== undefined) sheet.getRange(row, headers.indexOf('wali_kelas_user_id') + 1).setValue(payload.wali_kelas_user_id);
        if (payload.nomor_wa_wali_kelas !== undefined) sheet.getRange(row, headers.indexOf('nomor_wa_wali_kelas') + 1).setValue(payload.nomor_wa_wali_kelas);
        if (payload.status_aktif) sheet.getRange(row, headers.indexOf('status_aktif') + 1).setValue(payload.status_aktif);

        writeAuditLog(payload.user_id, 'UPDATE_KELAS', 'Kelas', payload.kelas_id, JSON.stringify(records[i]), JSON.stringify(payload), 'Perbarui kelas');
        return { success: true, message: 'Data kelas berhasil diperbarui.' };
      }
    }
    return { success: false, error: 'Kelas tidak ditemukan.' };
  }

  return { success: false, error: 'Sub aksi kelas tidak valid.' };
}

/**
 * CRUD Master Pelanggaran
 */
function crudMasterPelanggaran(payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('MasterPelanggaran');
  if (!sheet) return { success: false, error: 'Tab MasterPelanggaran belum ada.' };

  var subAction = payload.sub_action;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (subAction === 'create') {
    var kode = String(payload.kode_pelanggaran).trim().toUpperCase();
    var bobot = Number(payload.bobot_poin) || 0;
    if (bobot < 1 || bobot > 100) {
      return { success: false, error: 'Bobot poin harus antara 1 sampai 100.' };
    }

    var newRow = [
      kode,
      String(payload.uraian).trim(),
      bobot,
      String(payload.kategori).trim(),
      'AKTIF',
      String(payload.catatan_aturan || '').trim(),
      String(payload.tanggal_mulai_berlaku || Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd'))
    ];
    sheet.appendRow(newRow);
    writeAuditLog(payload.user_id, 'CREATE_MASTER_PELANGGARAN', 'MasterPelanggaran', kode, '', JSON.stringify(payload), 'Tambah master pelanggaran');
    return { success: true, message: 'Master pelanggaran berhasil ditambahkan.' };
  }

  if (subAction === 'update') {
    var records = readTableAsObjects(sheet);
    for (var i = 0; i < records.length; i++) {
      if (records[i].kode_pelanggaran === payload.kode_pelanggaran) {
        var row = i + 2;
        if (payload.uraian) sheet.getRange(row, headers.indexOf('uraian') + 1).setValue(payload.uraian);
        if (payload.bobot_poin !== undefined) sheet.getRange(row, headers.indexOf('bobot_poin') + 1).setValue(Number(payload.bobot_poin));
        if (payload.kategori) sheet.getRange(row, headers.indexOf('kategori') + 1).setValue(payload.kategori);
        if (payload.status_aktif) sheet.getRange(row, headers.indexOf('status_aktif') + 1).setValue(payload.status_aktif);
        if (payload.catatan_aturan !== undefined) sheet.getRange(row, headers.indexOf('catatan_aturan') + 1).setValue(payload.catatan_aturan);

        writeAuditLog(payload.user_id, 'UPDATE_MASTER_PELANGGARAN', 'MasterPelanggaran', payload.kode_pelanggaran, JSON.stringify(records[i]), JSON.stringify(payload), 'Perbarui master');
        return { success: true, message: 'Master pelanggaran berhasil diperbarui.' };
      }
    }
    return { success: false, error: 'Kode pelanggaran tidak ditemukan.' };
  }

  return { success: false, error: 'Sub aksi master pelanggaran tidak valid.' };
}

/**
 * CRUD User & Hak Akses
 */
function crudUser(payload) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, error: 'Tab Users belum ada.' };

  var subAction = payload.sub_action;
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (subAction === 'create') {
    if (!payload.username || !payload.password || !payload.nama || !payload.peran) {
      return { success: false, error: 'Username, password, nama, dan peran wajib diisi.' };
    }

    var users = readTableAsObjects(sheet);
    for (var u = 0; u < users.length; u++) {
      if (String(users[u].username).trim().toLowerCase() === String(payload.username).trim().toLowerCase()) {
        return { success: false, error: 'Username sudah digunakan oleh akun lain.' };
      }
    }

    var salt = generateSalt();
    var hash = hashPassword(payload.password, salt);
    var userId = 'USR-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');

    var newRow = [
      userId,
      payload.username.trim(),
      hash,
      salt,
      payload.nama.trim(),
      payload.peran,
      'AKTIF',
      nowStr,
      ''
    ];
    sheet.appendRow(newRow);
    writeAuditLog(payload.actor_id, 'CREATE_USER', 'Users', userId, '', JSON.stringify({ username: payload.username, peran: payload.peran }), 'Tambah pengguna baru');
    return { success: true, message: 'Pengguna baru berhasil didaftarkan.' };
  }

  if (subAction === 'update') {
    var userRecords = readTableAsObjects(sheet);
    for (var i = 0; i < userRecords.length; i++) {
      if (userRecords[i].user_id === payload.user_id) {
        var row = i + 2;
        if (payload.nama) sheet.getRange(row, headers.indexOf('nama') + 1).setValue(payload.nama);
        if (payload.peran) sheet.getRange(row, headers.indexOf('peran') + 1).setValue(payload.peran);
        if (payload.status_aktif) sheet.getRange(row, headers.indexOf('status_aktif') + 1).setValue(payload.status_aktif);

        // Jika reset password diminta
        if (payload.new_password) {
          var newSalt = generateSalt();
          var newHash = hashPassword(payload.new_password, newSalt);
          sheet.getRange(row, headers.indexOf('password_hash') + 1).setValue(newHash);
          sheet.getRange(row, headers.indexOf('salt') + 1).setValue(newSalt);
        }

        writeAuditLog(payload.actor_id, 'UPDATE_USER', 'Users', payload.user_id, JSON.stringify(userRecords[i]), JSON.stringify(payload), 'Perbarui data pengguna');
        return { success: true, message: 'Data pengguna berhasil diperbarui.' };
      }
    }
    return { success: false, error: 'Pengguna tidak ditemukan.' };
  }

  return { success: false, error: 'Sub aksi user tidak valid.' };
}

/**
 * Update Pengaturan Sistem
 */
function updatePengaturan(pengaturanMap, userId) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('Pengaturan');
  if (!sheet) return { success: false, error: 'Tab Pengaturan belum ada.' };

  var records = readTableAsObjects(sheet);
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  for (var key in pengaturanMap) {
    var val = String(pengaturanMap[key]);
    var found = false;

    for (var i = 0; i < records.length; i++) {
      if (records[i].kunci === key) {
        var row = i + 2;
        sheet.getRange(row, headers.indexOf('nilai') + 1).setValue(val);
        sheet.getRange(row, headers.indexOf('waktu_pembaruan') + 1).setValue(nowStr);
        sheet.getRange(row, headers.indexOf('user_id_pengubah') + 1).setValue(userId || 'ADMIN');
        found = true;
        break;
      }
    }

    if (!found) {
      sheet.appendRow([key, val, nowStr, userId || 'ADMIN']);
    }
  }

  writeAuditLog(userId || 'ADMIN', 'UPDATE_PENGATURAN', 'Pengaturan', 'ALL', '', JSON.stringify(pengaturanMap), 'Pembaruan konfigurasi sistem');
  return { success: true, message: 'Pengaturan sistem berhasil disimpan ke Spreadsheet.' };
}

/**
 * Tulis Entri Audit Log ke Tab AuditLog
 */
function writeAuditLog(userId, aksi, namaTabel, recordId, nilaiSebelum, nilaiSesudah, alasan) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('AuditLog');
    if (!sheet) return;

    var auditId = 'AUD-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');

    sheet.appendRow([
      auditId,
      userId || 'SYSTEM',
      nowStr,
      aksi,
      namaTabel,
      recordId || '',
      nilaiSebelum || '',
      nilaiSesudah || '',
      alasan || ''
    ]);
  } catch (e) {
    Logger.log('Gagal menulis AuditLog: ' + e.toString());
  }
}
