# Product Requirements Document (PRD) - E-Voting Web Frontend

**Aplikasi**: Frontend Web Application  
**Repositori**: `evoting-ika-smauctaf-frontend`  
**Sasaran**: Menyediakan antarmuka web yang modern, elegan, responsif, dan mudah diakses oleh seluruh alumni IKA SMAUCTAF untuk melihat profil calon ketua, memantau masa pemilihan, menyalurkan hak suara secara aman, dan mengelola pemilu bagi panitia.

---

## 1. Sasaran Produk (Product Goals)
1. **Pengalaman Pengguna Tanpa Hambatan (*Frictionless UX*)**: Alur pencoblosan yang intuitif dan cepat melalui perangkat smartphone maupun desktop.
2. **Kejelasan Informasi Pemilihan**: Menampilkan status masa pemilihan secara transparan dengan jam hitung mundur (*countdown timer*) waktu nyata.
3. **Kepastian & Bukti Suara (*Trust & Verification*)**: Menyajikan bukti tanda terima (*receipt code*) yang dapat disalin, diunduh, dan disimpan di peramban pengguna untuk verifikasi audit.
4. **Dashboard Admin Visual & Terpadu**: Memberikan visualisasi perolehan suara secara langsung melalui grafik interaktif (*charts*) dan tabel data komprehensif.

---

## 2. Persona Pengguna & Alur Perjalanan (User Journeys)

### A. Pengguna Tamu / Publik
- Membuka halaman landing (`/`).
- Melihat banner hero dan daftar pemilihan yang sedang `active` atau `upcoming`.
- Mengklik kartu calon ketua untuk membuka modal dialog rincian visi & misi.
- Melihat hitung mundur batas waktu pemilihan.
- Mengklik tombol "Masuk / Salurkan Hak Suara" untuk menuju halaman login.

### B. Pemilih Alumni (Voter)
- Mengakses halaman login (`/login`).
- Memasukkan `identifier` (alamat email atau nomor telepon) dan kata sandi.
- Diarahkan ke halaman pemungutan suara (`/vote`).
- Memilih calon ketua dengan kartu interaktif.
- Muncul dialog konfirmasi pemungutan suara ("Apakah Anda yakin dengan pilihan ini?").
- Mengonfirmasi pencoblosan; aplikasi menampilkan *loading state*.
- Browser meminta public key credential dengan JWT, memverifikasi certificate Ed25519 dan batch session, lalu membuat blind credential RSABSSA RFC 9474.
- Browser mengirim blinded request ke Registry dengan JWT. Blinding state disimpan sementara agar retry jaringan memakai request identik.
- Browser memfinalisasi credential secara lokal dan mengirim ballot ke Ballot Box tanpa JWT atau user identifier.
- Menerima modal tanda terima berisi receipt code dan waktu penerimaan hanya setelah Ballot Box menyimpan ballot secara durable.
- Receipt tersimpan di `localStorage` dan dapat diverifikasi melalui endpoint receipt publik. Karena ballot unlinkable, server tidak menampilkan status voting per voter pada perangkat lain.

### C. Administrator Panitia Pemilihan (Admin)
- Login menggunakan akun dengan role `admin`.
- Diarahkan ke dashboard overview (`/admin`).
- Melihat ringkasan metrik: Total Pemilihan, Total Kandidat, Total Pengguna Terdaftar, dan Total Suara Masuk.
- Melihat grafik perolehan suara per kandidat menggunakan diagram batang interaktif.
- Mengelola data master:
  - Manajemen Sesi Pemilihan (`/admin/elections`)
  - Manajemen Kandidat (`/admin/candidates`)
  - Manajemen Data Pemilih / Alumni (`/admin/users`)
  - Rekapitulasi Hasil Pemilihan (`/admin/results`)

---

## 3. Spesifikasi Halaman & Fitur Antarmuka

### 1. Halaman Landing (`/app/page.tsx`)
- **Hero Section**: Ilustrasi grafis, judul resmi pemilihan, dan tombol panggilan aksi (*Call-to-Action*).
- **Status Badge Pemilihan**: Badge status berwarna (`active` = hijau emerald, `upcoming` = amber, `ended` = rose, `complete` = biru).
- **Countdown Component**: Menghitung mundur hari, jam, menit, dan detik hingga masa pemilihan berakhir.
- **Candidate Dialog**: Modal dialog detail profil yang menampilkan inisial berwarna, nama lengkap, visi terstruktur, dan poin-poin misi calon.

### 2. Halaman Login (`/app/login/page.tsx`)
- Input fleksibel yang menerima email atau nomor handphone.
- Input password dengan proteksi masking.
- Ekstraksi klaim JWT ke session client (`localStorage`) dan pengalihan rute otomatis berdasarkan role (`/admin` untuk admin, `/vote` untuk voter).

### 3. Halaman Pencoblosan (`/app/vote/page.tsx`)
- **Header Voter**: Menampilkan sapaan nama alumni, angkatan (*batch*), dan cabang sekolah (`Deli Serdang` / `Sukoharjo`).
- **Pemeriksaan Hak Suara**:
  - Menampilkan receipt lokal jika ada; status tersebut adalah bukti lokal, bukan lookup status voter ke database ballot.
  - Jika belum ada receipt lokal: Menampilkan pilihan kandidat dalam format grid responsif. Server menegakkan satu credential per voter/election dan satu penggunaan per nullifier.
- **Konfirmasi Bertingkat**: Tombol pilih memicu dialog konfirmasi untuk mencegah kesalahan klik.
- **Umpan Balik Instan**: Menggunakan toast notifikasi via Sonner untuk status sukses maupun error dari server.

### 4. Halaman Dashboard Admin (`/app/admin/`)
- **Metric Cards**: Menampilkan agregat data pemilihan.
- **Grafik Batang (Recharts)**: Visualisasi perolehan suara per kandidat dengan warna representatif.
- **Tabel Data & Filter**: Tabel data angkatan, pemilih, dan sesi pemilihan dengan pencarian dan pagination.

---

## 4. Persyaratan Desain & UI/UX

1. **Tipografi**: Menggunakan kombinasi font modern *Inter* (sans-serif) untuk teks fungsional dan *Playfair Display* (serif) untuk heading judul pemilihan yang berwibawa.
2. **Skema Warna**:
   - Primary Accent: Emas / Gold (`#c9a86a`) melambangkan keunggulan yayasan alumni.
   - Background & Cards: Slate/Zinc bernuansa bersih dengan kontras tinggi.
3. **Aksesibilitas & Feedback**:
   - Komponen interaktif menggunakan Radix UI primitives yang ramah pembaca layar (*screen reader*).
   - Seluruh pemanggilan jaringan wajib menampilkan skeleton loader atau spinner animasi.
