// Mock data for development — ready for Express.js API replacement
// TODO: Replace each function with fetch calls to Express.js backend

export const mockUsers = [
  { id: 1, username: 'op_hadi', fullname: 'Hadi Santoso', role: 'operator', active: true, created: '2026-01-15' },
  { id: 2, username: 'op_dewi', fullname: 'Dewi Lestari', role: 'operator', active: true, created: '2026-02-01' },
  { id: 3, username: 'adm_rina', fullname: 'Rina Wijaya', role: 'admin', active: true, created: '2025-12-01' },
  { id: 4, username: 'mgr_siti', fullname: 'Siti Nurhaliza', role: 'manager', active: true, created: '2025-11-01' },
  { id: 5, username: 'aud_budi', fullname: 'Budi Prasetyo', role: 'auditor', active: false, created: '2026-01-20' },
  { id: 6, username: 'op_andi', fullname: 'Andi Firmansyah', role: 'operator', active: true, created: '2026-03-10' },
];

export const mockInspectionHistory = [
  { id: 'INS-001', partId: 'GEAR-A01', partName: 'Gear Assembly A', partCode: 'GA-001', vendor: 'Vendor-X', length: 12.45, width: 8.21, diameter: 5.03, status: 'OK', operator: 'op_hadi', timestamp: '2026-05-03 10:32:15', hash: 'a3f2b1c9', configVersion: 'v1.2.0', integrity: 'valid' },
  { id: 'INS-002', partId: 'BOLT-B12', partName: 'Bolt Standard B', partCode: 'BS-012', vendor: 'Vendor-Y', length: 15.02, width: 6.88, diameter: 3.11, status: 'NG', operator: 'op_hadi', timestamp: '2026-05-03 10:31:42', hash: 'b7e4d2a1', configVersion: 'v1.2.0', integrity: 'valid' },
  { id: 'INS-003', partId: 'GEAR-A01', partName: 'Gear Assembly A', partCode: 'GA-001', vendor: 'Vendor-X', length: 12.51, width: 8.19, diameter: 5.01, status: 'OK', operator: 'op_dewi', timestamp: '2026-05-03 10:29:33', hash: 'c1f8a3b2', configVersion: 'v1.2.0', integrity: 'valid' },
  { id: 'INS-004', partId: 'SHAFT-C05', partName: 'Shaft Precision C', partCode: 'SP-005', vendor: 'Vendor-Z', length: 25.10, width: 4.50, diameter: 4.48, status: 'OK', operator: 'op_hadi', timestamp: '2026-05-03 10:27:18', hash: 'd9a1e4c3', configVersion: 'v1.2.0', integrity: 'valid' },
  { id: 'INS-005', partId: 'BOLT-B12', partName: 'Bolt Standard B', partCode: 'BS-012', vendor: 'Vendor-Y', length: 14.98, width: 6.95, diameter: 3.15, status: 'NG', operator: 'op_dewi', timestamp: '2026-05-03 10:25:05', hash: 'e2b5f1d4', configVersion: 'v1.1.9', integrity: 'warning' },
  { id: 'INS-006', partId: 'GEAR-A02', partName: 'Gear Assembly A2', partCode: 'GA-002', vendor: 'Vendor-X', length: 11.20, width: 7.80, diameter: 4.90, status: 'OK', operator: 'op_andi', timestamp: '2026-05-03 10:22:41', hash: 'f3c6a2e5', configVersion: 'v1.2.0', integrity: 'valid' },
  { id: 'INS-007', partId: 'NUT-D03', partName: 'Nut Type D', partCode: 'ND-003', vendor: 'Vendor-Z', length: 8.55, width: 8.55, diameter: 6.02, status: 'OK', operator: 'op_hadi', timestamp: '2026-05-03 10:20:12', hash: 'a4d7b3f6', configVersion: 'v1.2.0', integrity: 'valid' },
  { id: 'INS-008', partId: 'GEAR-A01', partName: 'Gear Assembly A', partCode: 'GA-001', vendor: 'Vendor-X', length: 12.48, width: 8.22, diameter: 5.05, status: 'OK', operator: 'op_dewi', timestamp: '2026-05-03 10:18:30', hash: 'b5e8c4a7', configVersion: 'v1.2.0', integrity: 'valid' },
];

export const mockActivityLogs = [
  { id: 1, user: 'adm_rina', action: 'Tambah Pengguna', detail: 'Menambahkan pengguna op_andi', timestamp: '2026-05-03 09:15:00' },
  { id: 2, user: 'op_hadi', action: 'Login', detail: 'Login berhasil dari 192.168.1.10', timestamp: '2026-05-03 10:00:05' },
  { id: 3, user: 'mgr_siti', action: 'Export Data', detail: 'Export CSV riwayat inspeksi (01-03 Mei)', timestamp: '2026-05-03 09:45:22' },
  { id: 4, user: 'adm_rina', action: 'Edit Pengguna', detail: 'Menonaktifkan akun aud_budi', timestamp: '2026-05-02 16:30:10' },
  { id: 5, user: 'op_dewi', action: 'Login', detail: 'Login berhasil dari 192.168.1.12', timestamp: '2026-05-03 10:05:18' },
];

export const mockKpiData = {
  totalInspected: 842,
  okCount: 819,
  ngCount: 23,
  okRate: 97.3,
  ngRate: 2.7,
  throughput: 105,
};

export const mockTrendData = {
  labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
  values: [3.1, 2.8, 3.5, 2.1, 2.7, 1.9, 2.3],
};

export const mockVendorNg = [
  { name: 'Vendor-X', rate: 4.1 },
  { name: 'Vendor-Y', rate: 2.3 },
  { name: 'Vendor-Z', rate: 1.2 },
];

export const mockAlerts = [
  { id: 1, partId: 'BOLT-B12', vendor: 'Vendor-Y', dimension: 'Lebar', value: 6.95, expected: '6.80-6.90', status: 'NG', timestamp: '2026-05-03 10:25:05', operator: 'op_dewi' },
  { id: 2, partId: 'BOLT-B12', vendor: 'Vendor-Y', dimension: 'Diameter', value: 3.15, expected: '3.00-3.10', status: 'NG', timestamp: '2026-05-03 10:31:42', operator: 'op_hadi' },
  { id: 3, partId: 'SHAFT-C05', vendor: 'Vendor-Z', dimension: 'Diameter', value: 4.55, expected: '4.45-4.50', status: 'NG', timestamp: '2026-05-02 15:12:30', operator: 'op_andi' },
];

export const mockBatches = [
  { batchId: 'BATCH-2026-05-001', partName: 'Gear Assembly A', totalParts: 150, inspected: 150, passed: 147, failed: 3, verified: true, date: '2026-05-01' },
  { batchId: 'BATCH-2026-05-002', partName: 'Bolt Standard B', totalParts: 200, inspected: 200, passed: 190, failed: 10, verified: true, date: '2026-05-02' },
  { batchId: 'BATCH-2026-05-003', partName: 'Shaft Precision C', totalParts: 100, inspected: 85, passed: 84, failed: 1, verified: false, date: '2026-05-03' },
];
