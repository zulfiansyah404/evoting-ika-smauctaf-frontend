# AI Agent Guidelines - E-Voting IKA SMAUCTAF Frontend

Dokumen ini berisi konteks arsitektur, panduan teknis, dan aturan konvensi untuk AI Coding Assistant saat mengembangkan kode di repositori frontend ini.

---

## 1. Ringkasan Proyek & Tech Stack
Frontend web application untuk sistem pemilihan umum online Ikatan Alumni SMA Unggulan CT Foundation (IKA SMAUCTAF).

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Bahasa**: TypeScript / React 18
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State & Data Fetching**: TanStack React Query / SWR / Custom `apiFetch` proxy
- **Form & Validation**: React Hook Form + Zod
- **Notifications / Toast**: Sonner

---

## 2. Struktur Direktori & Konvensi
```
├── app/                  # Next.js App Router (pages, layouts, route handlers)
│   ├── api/              # Route handlers (termasuk reverse proxy ke backend)
│   ├── layout.tsx        # Root layout, font providers, Toaster
│   └── globals.css       # Tailwind base styles & CSS variables
├── components/           # Komponen UI Reusable
│   ├── ui/               # shadcn / Radix primitives (Button, Dialog, Switch, dll.)
│   └── ...               # Komponen domain spesifik (Countdown, Card, Navbar, dll.)
├── lib/                  # Helper utilities, API clients, constants
│   ├── api.ts            # Client-side API fetcher (`apiFetch`, auth token helpers)
│   └── utils.ts          # Utility functions (`cn` classnames merger, dll.)
├── public/               # Asset statis (logo, favicon, images)
└── package.json          # Dependency manifest & scripts
```

---

## 3. Konvensi Kode & Standar Pengembangan

### A. Komunikasi API ke Backend
- Seluruh panggilan API ke backend REST diarahkan melalui proxy Next.js internal (contoh: `/api/be/*`) atau menggunakan helper [lib/api.ts](file:///home/zoel/workspaces/evoting-ika-smauctaf/evoting-ika-smauctaf-frontend/lib/api.ts) (`apiFetch`).
- **Autentikasi**: Token JWT disimpan di `localStorage` dengan key `evoting_token` dan diekstrak via helper `getToken()`, `setToken()`, `clearToken()`, dan `getSession()`.
- Selalu sesuaikan payload request dan struktur response dengan backend standard format (`status`, `code`, `message`, `data`, `errors`).

### B. Komponen & Styling
- Gunakan Tailwind CSS utility classes. Gabungkan class kondisional dengan utility `cn(...)` dari `@/lib/utils`.
- Manfaatkan komponen dari `@/components/ui/*` (shadcn/ui style) untuk konsistensi desain UI, aksesibilitas (*a11y*), dan interaksi modal/dialog/form.
- Pisahkan komponen *Client* (`'use client'`) dan *Server Component* sesuai kebutuhan rendering Next.js.
- Berikan feedback interaksi yang jelas kepada pengguna (loading skeleton, disabled state pada tombol saat submit, dan feedback toast via `sonner`).

### C. Alur Voting & Keamanan
- Halaman voting harus memvalidasi status pemilihan (aktif/belum dimulai/berakhir) dan status hak suara pengguna sebelum mengizinkan pengiriman suara (*ballot*).
- Simpan bukti / receipt vote di `localStorage` menggunakan `evoting_receipts` untuk verifikasi pengguna setelah berhasil melakukan vote.

---

## 4. Perintah Operasional Penting

| Perintah | Deskripsi |
| :--- | :--- |
| `yarn dev` atau `npm run dev` | Menjalankan Next.js development server (port 3000) |
| `yarn build` atau `npm run build` | Menjalankan build production & type-checking TypeScript |
| `yarn start` atau `npm run start` | Menjalankan server Next.js production |

---

## 5. Instruksi Khusus untuk AI Agent Saat Melakukan Task
1. **Verifikasi Tipe Data**:
   - Selalu periksa tipe data TypeScript di `lib/` atau komponen terkait agar tidak terjadi error kompilasi saat `yarn build`.
2. **Konsistensi UI/UX**:
   - Pertahankan tema warna gold/navy khas IKA SMAUCTAF dan tipografi (Inter & Playfair Display).
   - Pastikan layout responsif (mobile-first dan desktop friendly).
3. **Pemisahan Logika**:
   - Jangan menaruh logika bisnis yang rumit langsung di dalam render JSX; ekstrak ke custom hooks atau utility function di `lib/`.
