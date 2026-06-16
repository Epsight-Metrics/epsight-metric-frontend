// i18n - Bahasa Indonesia only
import { writable, derived } from 'svelte/store';

export const locale = writable('id');

const translations = {
  // App
  'app.title': 'EPSON QC - Sistem Inspeksi Dimensi',
  'app.company': 'PT. Indonesia Epson Industry',
  'app.version': 'v2.0',

  // Auth
  'auth.login': 'Masuk',
  'auth.logout': 'Keluar',
  'auth.username': 'Nama Pengguna',
  'auth.password': 'Kata Sandi',
  'auth.login_btn': 'MASUK',
  'auth.login_subtitle': 'Sistem Inspeksi Dimensi',
  'auth.logout_confirm': 'Apakah Anda yakin ingin keluar?',

  // Navigation
  'nav.dashboard': 'Dasbor',
  'nav.live_inspect': 'Inspeksi Langsung',
  'nav.session_history': 'Riwayat Sesi',
  'nav.users': 'Pengguna',
  'nav.logs': 'Log Aktivitas',
  'nav.config': 'Konfigurasi',
  'nav.trends': 'Grafik Tren',
  'nav.defects': 'Analisis Defek',
  'nav.history': 'Riwayat Inspeksi',
  'nav.alerts': 'Ringkasan Peringatan',
  'nav.inspection_logs': 'Log Inspeksi',
  'nav.traceability': 'Verifikasi Traceability',
  'nav.integrity': 'Integritas Data',
  'nav.profile': 'Profil',

  // Operator
  'operator.live_camera': 'Kamera Langsung',
  'operator.inspect_btn': 'INSPEKSI SEKARANG',
  'operator.inspecting': 'Memproses...',
  'operator.result': 'Hasil Inspeksi',
  'operator.length': 'Panjang',
  'operator.width': 'Lebar',
  'operator.diameter': 'Diameter',
  'operator.status_ok': 'OK',
  'operator.status_ng': 'NG',
  'operator.session_history': 'Riwayat Sesi',
  'operator.part_id': 'ID Part',
  'operator.timestamp': 'Waktu',
  'operator.status': 'Status',
  'operator.camera_connected': 'Kamera Terhubung',
  'operator.camera_disconnected': 'Kamera Terputus',
  'operator.inspected_today': 'Diinspeksi Hari Ini',
  'operator.ng_alert_title': 'PRODUK NG',
  'operator.ng_alarm': 'ALARM AKTIF - SEGERA PISAHKAN PART',
  'operator.sop_title': 'PANDUAN SOP:',
  'operator.sop_1': '1. Ambil part dari lightbox',
  'operator.sop_2': '2. Beri label HOLD pada part',
  'operator.sop_3': '3. Letakkan di area karantina',
  'operator.sop_4': '4. Laporkan ke Engineering via sistem',
  'operator.confirm_next': 'KONFIRMASI & LANJUT KE PART BERIKUTNYA',
  'operator.waiting': 'Menunggu part...',
  'operator.align_part': 'Sejajarkan part di dalam lightbox',
  'operator.start_session': 'Mulai Sesi',
  'operator.stop_session': 'Akhiri Sesi',
  'operator.no_session': 'Belum ada sesi aktif',
  'operator.select_part': 'Pilih Part',

  // Admin
  'admin.title': 'Panel Admin',
  'admin.user_management': 'Manajemen Pengguna',
  'admin.add_user': '+ Tambah Pengguna',
  'admin.edit_user': 'Edit Pengguna',
  'admin.delete_user': 'Hapus Pengguna',
  'admin.search_users': 'Cari username / nama...',
  'admin.username': 'Username',
  'admin.fullname': 'Nama Lengkap',
  'admin.role': 'Role',
  'admin.active': 'Aktif',
  'admin.created': 'Dibuat',
  'admin.actions': 'Aksi',
  'admin.activity_logs': 'Log Aktivitas',
  'admin.system_config': 'Konfigurasi Sistem',
  'admin.deactivate': 'Nonaktifkan',
  'admin.activate': 'Aktifkan',
  'admin.confirm_delete': 'Apakah Anda yakin ingin menghapus pengguna ini?',
  'admin.password': 'Kata Sandi',
  'admin.confirm_password': 'Konfirmasi Kata Sandi',
  'admin.save': 'Simpan',
  'admin.cancel': 'Batal',

  // Manager
  'manager.title': 'Dasbor Manager',
  'manager.overview': 'Ringkasan Dasbor',
  'manager.total_inspected': 'Total Diinspeksi',
  'manager.ok_rate': 'OK Rate',
  'manager.ng_rate': 'NG Rate',
  'manager.throughput': 'Throughput/Jam',
  'manager.trend_title': 'Tren NG Rate',
  'manager.defect_title': 'Analisis Pola Defek',
  'manager.top_ng_vendors': 'Vendor NG Tertinggi',
  'manager.failed_dimension': 'Dimensi Gagal Terbanyak',
  'manager.problem_parts': 'Part Bermasalah',
  'manager.inspection_history': 'Riwayat Inspeksi',
  'manager.alert_summary': 'Ringkasan Peringatan',
  'manager.export_csv': 'Export CSV',
  'manager.export_pdf': 'Export PDF',
  'manager.filter_session': 'Sesi',
  'manager.filter_day': 'Hari',
  'manager.filter_week': 'Minggu',
  'manager.filter_month': 'Bulan',
  'manager.auto_refresh': 'Auto-refresh: AKTIF',
  'manager.last_updated': 'Terakhir diperbarui',

  // Auditor
  'auditor.title': 'Panel Audit',
  'auditor.inspection_logs': 'Log Inspeksi - Tampilan Audit',
  'auditor.advanced_filter': 'Filter Lanjutan',
  'auditor.period': 'Periode',
  'auditor.to': 's/d',
  'auditor.part': 'Part',
  'auditor.vendor': 'Vendor',
  'auditor.status': 'Status',
  'auditor.operator': 'Operator',
  'auditor.search': 'Cari',
  'auditor.time': 'Waktu',
  'auditor.part_name': 'Nama Part',
  'auditor.part_code': 'Kode Part',
  'auditor.vendor_name': 'Nama Vendor',
  'auditor.dimension': 'Dimensi',
  'auditor.integrity': 'Integritas',
  'auditor.valid': 'Valid',
  'auditor.warning': 'Peringatan',
  'auditor.tampered': 'Diubah',
  'auditor.traceability': 'Verifikasi Traceability',
  'auditor.data_integrity': 'Integritas Data',
  'auditor.batch_id': 'ID Batch',
  'auditor.records': 'Rekaman',
  'auditor.verified': 'Terverifikasi',
  'auditor.export_csv': 'Export CSV',
  'auditor.export_pdf': 'Export PDF',
  'auditor.print': 'Cetak',
  'auditor.total_records': 'Total Rekaman',
  'auditor.integrity_rate': 'Integritas Terverifikasi',

  // Common
  'common.all': 'Semua',
  'common.search': 'Cari',
  'common.filter': 'Filter',
  'common.export': 'Export',
  'common.loading': 'Memuat...',
  'common.no_data': 'Tidak ada data',
  'common.showing': 'Menampilkan',
  'common.of': 'dari',
  'common.prev': 'Sebelumnya',
  'common.next': 'Selanjutnya',
  'common.close': 'Tutup',
  'common.confirm': 'Konfirmasi',
  'common.yes': 'Ya',
  'common.no': 'Tidak',
  'common.today': 'Hari Ini',
  'common.error': 'Terjadi kesalahan',
  'common.retry': 'Coba Lagi',

  // Engineer
  'nav.calibration': 'Kalibrasi Parameter CV',
  'nav.references': 'Manajemen Referensi',

  // Roles
  'role.operator': 'Operator QC',
  'role.admin': 'Admin',
  'role.manager': 'QC Manager',
  'role.auditor': 'Auditor',
};

/**
 * Translate a key. Returns the Indonesian string or the key if not found.
 */
export const t = derived(locale, () => {
  return (key) => translations[key] || key;
});

export function setLocale(lang) {
  locale.set(lang);
}

