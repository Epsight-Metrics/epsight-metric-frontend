# EPSight Metrics - Dimensional Inspection System

![Banner](static/images/banner.png)

## 🚀 Overview

**EPSight Metrics** adalah platform inspeksi dimensional tingkat lanjut yang dirancang untuk otomasi *Quality Control* (QC). Sistem ini mengintegrasikan *Computer Vision* dengan dashboard analitik real-time untuk memastikan presisi tinggi dan efisiensi dalam proses manufaktur.

Dibangun dengan **Svelte 5** dan **SvelteKit**, aplikasi ini menawarkan pengalaman pengguna yang responsif, modern, dan sangat cepat, yang disesuaikan untuk kebutuhan operasional pabrik.

---

## ✨ Fitur Utama

### 🛠️ Role-Based Access Control (RBAC)
Sistem memiliki 5 level akses dengan fitur yang berbeda-beda:
- **Admin**: Manajemen user, audit logs, dan kontrol sistem penuh.
- **QC Manager**: Dashboard KPI, analisis tren (NG/OK), dan export laporan lengkap.
- **Operator**: Menjalankan sesi inspeksi, input data manual/CV, dan pemantauan real-time.
- **Engineer**: Konfigurasi parameter inspeksi dan pemantauan teknis.
- **Auditor**: Akses riwayat inspeksi dan bukti audit (export PDF/CSV).

### 📊 Analitik & Reporting
- **Dashboard Real-time**: Grafik tren NG (No Good) vs OK secara hourly, weekly, atau monthly.
- **KPI Monitoring**: Pantau *throughput per hour* dan *NG rate* secara instan.
- **Export System**: Unduh laporan QC dalam format CSV atau PDF profesional.

### 🤖 Otomasi Inspeksi
- **Integrasi CV (Computer Vision)**: Menerima data inspeksi otomatis dari sistem kamera.
- **Real-time Alerts**: Notifikasi instan (via SSE) jika terdeteksi produk NG.

---

## 🛠️ Tech Stack

- **Frontend**: [Svelte 5](https://svelte.dev/) & [SvelteKit](https://kit.svelte.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: Modern CSS with CSS Variables
- **API Client**: Fetch API with custom wrappers
- **Reporting**: [jsPDF](https://github.com/parallax/jsPDF) & AutoTable
- **Testing**: [Playwright](https://playwright.dev/)

---

## 🚀 Memulai (Getting Started)

### Prasyarat
- Node.js (v18+)
- Backend API sudah berjalan
### Instalasi

1. **Clone repository:**
   ```bash
   git clone https://github.com/Epsight-Metrics/epsight-metric-frontend.git
   cd SRS-FE
   ```

2. **Install dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment:**
   Buat file `.env` di root directory:
   ```env
   PUBLIC_API_URL=http://localhost:3000
   ```

4. **Jalankan Development Server:**
   ```bash
   npm run dev
   ```
   Buka [http://localhost:5173](http://localhost:5173) di browser Anda.

---

## 📂 Struktur Proyek

```text
src/
├── lib/            # Shared components, utilities, dan API client
│   ├── api/        # Logika komunikasi backend
│   ├── components/ # UI Components (Buttons, Charts, Tables, dsb)
│   └── stores/     # Svelte stores untuk state management (Svelte 5 Runes)
├── routes/         # SvelteKit pages & layouts (RBAC structured)
│   ├── admin/      # User management & logs
│   ├── manager/    # Analytics & Reports
│   ├── operator/   # Inspection flow
│   └── auditor/    # Audit evidence
└── static/         # Assets statis (Images, Banner, dsb)
```

---

## 🧪 Pengujian (Testing)

Proyek ini menggunakan **Playwright** untuk pengujian end-to-end guna memastikan semua alur (Admin, Operator, Manager) berjalan sempurna:

```bash
# Jalankan semua test
npx playwright test

# Lihat laporan test
npx playwright show-report
```

---

## 📄 Lisensi

Hak Cipta © 2026 **Epsight Metrics Team**. Seluruh hak cipta dilindungi undang-undang.
