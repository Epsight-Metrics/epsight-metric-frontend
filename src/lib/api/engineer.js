// Engineer API — kalibrasi parameter CV
import { api } from './client.js';

/**
 * Ambil konfigurasi kalibrasi CV terkini dari database.
 */
export async function getCalibration() {
  return api.get('/engineer/calibration');
}

/**
 * Simpan konfigurasi kalibrasi CV ke database.
 * @param {object} data - Parameter kalibrasi
 */
export async function saveCalibration(data) {
  return api.put('/engineer/calibration', data);
}