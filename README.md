# 🎲 Ular Tangga Modern

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla%20ES2020-f7df1e?logo=javascript&logoColor=black)](#-teknologi)
[![No Build](https://img.shields.io/badge/build-tanpa%20bundler-brightgreen)](#-menjalankan)

Permainan papan Ular Tangga yang berjalan langsung di browser. Papan 10×10 diacak ulang setiap permainan, ada lawan AI, sistem kartu skill, dan mode cepat. Tanpa framework, tanpa bundler, tanpa instalasi.

**[Mainkan sekarang](https://fawwaz1st.github.io/ulartangga/)** (GitHub Pages).

---

## 🪵 Konsep desain

Projek ini tidak memakai gaya "SaaS ungu" yang seragam. Arah visualnya satu kalimat:

> **Papan ular tangga kayu warung yang sudah dimainkan bertahun-tahun.**

Semua keputusan mengikuti itu:

| Bagian | Metafora | Wujud |
| --- | --- | --- |
| Latar | Meja kayu | Serat kayu berlapis, cahaya dari atas, vignette di tepi |
| Papan | Papan cat di atas meja | Kertas manila, kotak cetakan tinta, jalur digambar tangan |
| Panel | Papan yang dipaku | Sudut paku, bayangan keras ke kanan bawah |
| Menu | Kotak permainan | Tutup berengsel, label kertas miring, segel stempel |
| Statistik | Slip kertas | Selotip di atas, tiap slip miring ke arah berbeda |
| Kartu skill | Kartu remi | Kertas, tepi warna kelangkaan, kartu miring sedikit |
| Teks | Ukiran & cat | Teks ukir untuk papan, teks cat untuk label |

Konsekuensi teknis:
- Warna didefinisikan di ruang **OKLCH** supaya variasi terang-gelap tetap seragam secara persepsi.
- Bayangan selalu **dua lapis**: satu offset keras (kesan cetak) + satu sebaran halus (kesan fisik).
- **Radius sudut berbeda per komponen** (4 / 7 / 10 / 11 px), bukan satu nilai seragam.
- **Tanpa emoji sebagai ikon fungsional.** Semua ikon adalah SVG garis di `icons.js`, bisa diwarnai lewat CSS.
- Gerakan selalu punya sebab: dadu memipih saat mendarat, pion melompat antar petak, papan bergetar saat kena ular.

---

## ✨ Fitur

| Fitur | Keterangan |
| --- | --- |
| 🎲 Papan acak | 10×10 dengan 7 tangga dan 7 ular, posisi baru tiap permainan |
| 🐍 Aturan klasik | Lemparan yang melewati petak 100 memantul kembali |
| 🤖 Lawan AI | Hingga 3 AI yang juga memainkan kartu skill |
| 🃏 10 kartu skill | Dadu Ganda, Pacu Tangga, Perisai Ular, Teleportasi, Tukar Posisi, dan lainnya, dengan cooldown |
| ⚡ Mode Cepat | Seluruh animasi dipersingkat kurang lebih dua kali |
| 💾 Lanjutkan permainan | Permainan tersimpan otomatis; bila tab tertutup, tawaran lanjut muncul saat dibuka lagi |
| 🔊 Suara & musik | Disintesis dengan Web Audio API, tanpa berkas audio |
| 📊 Statistik | Total main, pemenang terakhir, kemenanganmu, dan rekor giliran terpanjang |
| 📱 Responsif | Tiga zona asimetris di desktop, bertumpuk di layar sempit |
| ♿ Aksesibilitas | Kontras WCAG AA terverifikasi, navigasi Spasi/Escape, dukungan reduced-motion |

---

## 🚀 Menjalankan

Buka `index.html` di browser. Tidak ada langkah build.

Karena font diambil dari CDN, disarankan memakai server statis lokal:

```bash
python -m http.server 8000
# lalu buka http://localhost:8000
```

---

## 🎮 Cara Bermain

1. Pilih **Mulai Permainan**, atur jumlah pemain dan mode di **Pengaturan**.
2. Klik dadu atau tekan **Spasi** saat giliranmu.
3. Petak **tangga** menaikkan pion, petak **ular** menurunkannya.
4. Mainkan **kartu skill** saat giliranmu. Satu efek aktif per waktu.
5. Pemain pertama yang mencapai **petak 100** menang.

---

## 📂 Struktur Proyek

```
.
├── index.html              # Perantara, mengalihkan ke menu
├── views/
│   ├── menu.html           # Kotak permainan: mulai, tutorial, pengaturan, statistik
│   └── game.html           # Meja permainan
├── assets/
│   ├── css/
│   │   ├── base.css        # Token OKLCH, tekstur kayu & kertas, tombol, modal, toast
│   │   ├── menu.css        # Kotak kayu, label kertas, slip statistik
│   │   └── game.css        # Meja, papan, dadu, kartu skill, papan skor
│   ├── js/
│   │   ├── core.js         # Utilitas, penyimpanan (pengaturan, statistik, simpanan), toast
│   │   ├── icons.js        # Sprite ikon SVG, tanpa emoji fungsional
│   │   ├── audio.js        # Suara kayu & kertas disintesis (Web Audio API)
│   │   ├── skills.js       # Katalog skill, cooldown, efek. Logika murni tanpa DOM
│   │   ├── game.js         # Mesin permainan: papan, giliran, animasi, AI, simpanan
│   │   └── menu.js         # Logika halaman menu
│   └── images/
│       ├── favicon.ico     # Dibuat oleh scripts/make-favicon.py
│       └── favicon.svg
├── scripts/
│   └── make-favicon.py     # Gambar ulang favicon (PIL, 7 ukuran)
├── LICENSE
└── README.md
```

Urutan pemuatan: `core.js` → `icons.js` → `audio.js` → (`skills.js`) → `game.js` atau `menu.js`.
Semua modul berbagi satu namespace `window.UT`; tidak ada variabel global yang bocor.

---

## 🛠️ Teknologi

- **Vanilla JavaScript (ES2020)** dengan pola IIFE, tanpa dependensi runtime.
- **OKLCH** untuk seluruh token warna (Baseline, didukung semua browser modern).
- **CSS Grid** dengan area bernama untuk tata letak asimetris.
- **Web Audio API** untuk seluruh suara.
- **SVG inline** untuk ikon dan jalur ular/tangga.
- **Google Fonts**: Fraunces (judul), Karla (teks), Space Mono (label).

---

## 🗺️ Roadmap

- [ ] Multiplayer online lewat WebSocket atau WebRTC
- [ ] Tema papan dan pion yang bisa dipilih
- [ ] Tingkat kesulitan AI
- [ ] Dukungan PWA agar bisa dimainkan offline
- [ ] Mode turnamen dengan bagan pertandingan

---

## 🤝 Kontribusi

1. Fork repositori ini.
2. Buat branch baru: `git checkout -b feat/nama-fitur`.
3. Commit: `git commit -m 'feat: menambahkan fitur X'`.
4. Push dan buka Pull Request.

Buka **Issue** untuk melaporkan bug atau mengusulkan fitur.

---

## 📜 Lisensi

Dirilis di bawah **MIT License**. Lihat berkas [`LICENSE`](LICENSE).
