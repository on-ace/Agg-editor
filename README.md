# 🚀 Agg Editor

**Agg Editor** adalah editor kode berbasis web yang ringan, cepat, dan modern. Dirancang untuk pengembang web yang membutuhkan alat pengeditan cepat tanpa harus membuka IDE yang berat. Dibangun menggunakan teknologi web murni (HTML, CSS, dan Vanilla JavaScript) untuk performa maksimal.

---

## ✨ Fitur Unggulan

### 💻 Editor Inti
- **Multi-Language Support**: Dukungan untuk HTML, CSS, JavaScript, TypeScript, PHP, Python, Go, Rust, SQL, dan banyak lagi.
- **Smart Editing**: Autocomplete, auto-close brackets/tags, dan perataan otomatis (indentation).
- **Format Code**: Integrasi dengan **Prettier** untuk merapikan kode hanya dengan satu klik (`Alt + F`).
- **Emmet 2.0**: Penulisan HTML/CSS super cepat menggunakan singkatan Emmet (`Tab`).
- **Linter Integrations**: Deteksi kesalahan penulisan kode secara real-time untuk JavaScript dan CSS.

### 📁 Manajemen File
- **Multi-Tab Interface**: Kerjakan beberapa file sekaligus secara efisien.
- **File System API**: Simpan dan buka file atau folder proyek langsung dari sistem penyimpanan komputer Anda.
- **Export & Import**: Ekspor seluruh proyek ke dalam format **ZIP** atau impor file secara massal.
- **Persistent State**: Perubahan Anda tidak akan hilang. Data disimpan secara otomatis di penyimpanan lokal browser.

### 🛠️ Fitur Khusus: Code Changer
- **Flexible Code Manipulation**: Menambah atau mengubah blok kode di beberapa file dengan cerdas.
- **Smart Matching**: Mencari kode dengan mengabaikan perbedaan spasi, tab, maupun komentar kode.
- **Highlight Result**: Hasil perubahan kode otomatis diseleksi/diblok dan layar akan diarahkan langsung ke posisi perubahan.

### 🎨 Antarmuka (UI/UX)
- **Responsive Layout**: Sidebar dan Preview Panel yang dapat diubah ukurannya (resizable).
- **Rich Aesthetics**: Desain gelap premium dengan aksen warna modern. Tersedia juga tema terang.
- **Smart Notifications**: Sistem Toast berwarna (Hijau: Sukses, Merah: Error) di pojok kanan bawah.

---

## 📂 Struktur Proyek

Proyek ini menggunakan arsitektur modular untuk memudahkan pemeliharaan kode:

```text
agg-editor/
├── index.html            # Struktur utama UI dan modal
├── README.md             # Dokumentasi proyek
└── assets/
    ├── css/
    │   ├── main.css      # Desain sistem, layout, dan komponen UI
    │   └── custom.css    # Penyesuaian gaya kustom user
    └── js/
        ├── state.js      # Manajemen data global dan persistensi (var global)
        ├── utils.js      # Helper umum (toast, konfirmasi, deteksi bahasa)
        ├── ui.js         # Logika rendering tab, daftar file, dan sidebar
        ├── features.js   # Fitur lanjutan (Emmet, Search, Code Changer)
        └── app.js        # Entry point utama dan inisialisasi editor
```

---

## ⌨️ Shortcut Keyboard

Optimalkan produktivitas Anda dengan pintasan berikut:

| Shortcut | Aksi |
| --- | --- |
| `Ctrl + S` | Simpan file saat ini |
| `Alt + F` | Rapikan kode (Format Code) |
| `Tab` | Perluas singkatan Emmet |
| `Ctrl + B` | Buka/Tutup Sidebar Explorer |
| `Ctrl + H` | Buka panel Find & Replace |
| `Ctrl + /` | Beri/Hapus Komentar (Toggle Comment) |
| `Ctrl + + / -` | Zoom In / Zoom Out |

---

## 🛠️ Tech Stack

- **CodeMirror 5**: Mesin editor inti.
- **JSZip**: Untuk fungsionalitas ekspor proyek ke ZIP.
- **Prettier**: Mesin pemformat kode otomatis.
- **FontAwesome 6**: Ikonografi modern.
- **JSHint & CSSLint**: Validasi kode di dalam editor.

---

## 🚀 Cara Penggunaan

1. **Clone/Download** repositori ini.
2. Buka `index.html` langsung di browser favorit Anda (atau gunakan ekstensi Live Server di VS Code).
3. Anda bisa langsung membuat file baru melalui sidebar atau membuka folder proyek lokal Anda menggunakan menu **File > Open Project Folder**.

---

## 📝 Catatan Pemeliharaan

Jika Anda ingin memodifikasi folder `js/`, harap perhatikan bahwa variabel state global seperti `files`, `editor`, dan `activeFileId` berada di `state.js` dan diekspor ke objek `window`. Gunakan modifikasi array in-place (`splice`) untuk memastikan perubahan tersinkronisasi di semua modul.

---
*Dibuat dengan ❤️ untuk developer produktif.*
