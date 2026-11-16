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
- Panggilan Registry memakai `/api/be/*` dan `apiFetch`; Ballot Box memakai `/api/bb/*`.
- **Jangan pernah mengirim JWT, `user_id`, email, atau nomor HP ke `POST /api/bb/ballots`.** Gunakan `ballotFetch` tanpa Authorization.
- **Autentikasi**: Token JWT disimpan di `localStorage` dengan key `evoting_token` dan diekstrak via helper `getToken()`, `setToken()`, `clearToken()`, dan `getSession()`.
- Selalu sesuaikan payload request dan struktur response dengan backend standard format (`status`, `code`, `message`, `data`, `errors`).

### B. Komponen & Styling
- Gunakan Tailwind CSS utility classes. Gabungkan class kondisional dengan utility `cn(...)` dari `@/lib/utils`.
- Manfaatkan komponen dari `@/components/ui/*` (shadcn/ui style) untuk konsistensi desain UI, aksesibilitas (*a11y*), dan interaksi modal/dialog/form.
- Pisahkan komponen *Client* (`'use client'`) dan *Server Component* sesuai kebutuhan rendering Next.js.
- Berikan feedback interaksi yang jelas kepada pengguna (loading skeleton, disabled state pada tombol saat submit, dan feedback toast via `sonner`).

### C. Alur Voting & Keamanan
- Gunakan `@cloudflare/blindrsa-ts` RSABSSA randomized melalui `lib/blind-vote.ts`; jangan menulis primitive kriptografi sendiri.
- Verifikasi Ed25519 certificate terhadap `NEXT_PUBLIC_CREDENTIAL_DIRECTORY_PUBLIC_KEY` dan pastikan election/batch sama dengan session sebelum blind signing.
- Simpan pending blinded state ke localStorage **sebelum** meminta signature agar retry memakai blinded request yang sama; larang perubahan candidate selama ballot pending.
- Finalize dan verifikasi blind signature di browser, kemudian kirim hanya certificate, prepared message, credential signature, dan candidate ID ke Ballot Box tanpa JWT.
- Receipt diberikan hanya setelah Ballot Box menjawab HTTP 201 durable. Simpan receipt di `evoting_receipts` dan bersihkan pending state setelah berhasil.
- Jangan menganggap local receipt sebagai status voter global; server tidak dapat menautkan ballot anonim kembali ke voter.

---

## 4. Perintah Operasional Penting

| Perintah | Deskripsi |
| :--- | :--- |
| `yarn dev` atau `npm run dev` | Menjalankan Next.js development server (port 3000) |
| `yarn build` atau `npm run build` | Menjalankan build production (konfigurasi saat ini melewati type validation) |
| `npx tsc --noEmit` | Type-check frontend; perbaiki diagnostic baru pada file yang disentuh dan catat baseline existing |
| `yarn start` atau `npm run start` | Menjalankan server Next.js production |

---

## 5. Instruksi Khusus untuk AI Agent Saat Melakukan Task
1. **Verifikasi Tipe Data**:
   - Periksa diagnostic TypeScript pada helper/komponen yang disentuh; `next.config.js` mengatur `ignoreBuildErrors: true`, jadi build tidak menjadi type-check gate.
2. **Konsistensi UI/UX**:
   - Pertahankan tema warna gold/navy khas IKA SMAUCTAF dan tipografi (Inter & Playfair Display).
   - Pastikan layout responsif (mobile-first dan desktop friendly).
3. **Pemisahan Logika**:
   - Jangan menaruh logika bisnis yang rumit langsung di dalam render JSX; ekstrak ke custom hooks atau utility function di `lib/`.
