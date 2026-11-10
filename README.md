# KerjaLab — Simulasi Kerja Berbasis Web

> Coba pekerjaan impianmu lewat simulasi, **tanpa penalti**. Aplikasi multi-tier (Next.js + Express + PostgreSQL) yang berjalan penuh di Docker Compose pada localhost.

## Deskripsi & alasan projek
Banyak job hunter (terutama mahasiswa/fresh graduate) bingung dengan ekspektasi dunia kerja nyata, dan perusahaan sulit menilai kompetensi hard/soft skill hanya dari CV. KerjaLab memberi ruang aman untuk berlatih: pengguna memilih bidang (Teknologi, Sains, Bisnis, Soft Skill), mengerjakan simulasi bertingkat dengan batas waktu, lalu mendapat **koin** (kustomisasi profil) dan **XP** (level skill yang tampil di profil).

Fitur yang sudah ada:
- Login Google (OAuth) **atau** mode dev lokal tanpa Google, dengan persetujuan data pribadi eksplisit (UU No. 27/2022)
- 12 simulasi di 4 bidang, 3 tingkat kesulitan (makin sulit → hadiah makin besar), batas waktu per simulasi
- Gagal boleh coba ulang tanpa penalti; hadiah dasar diberikan saat pertama kali lulus
- Tantangan harian + streak (bonus koin harian)
- Profil: level hard/soft skill, jumlah & total waktu simulasi, link LinkedIn/GitHub, opt-in berbagi ke perusahaan, toko tema (koin), hapus akun & data (Right to Erasure)

## Arsitektur
```mermaid
flowchart LR
  B[Browser] -->|http://localhost:3000| F[frontend<br/>Next.js :3000]
  B -.->|curl/Postman :4000| A
  F -->|/api/* rewrite<br/>http://backend:4000| A[backend<br/>Express :4000]
  A -->|db:5432| D[(db<br/>PostgreSQL 16)]
  D --- V[(volume<br/>kerjalab_pgdata)]
  AD[adminer :8080<br/>profile: tools] --> D
  subgraph N[network: kerjalab-net]
    F
    A
    D
    AD
  end
```
Hanya `frontend` (3000), `backend` (4000, untuk uji curl) dan `adminer` (8080, profile `tools`) yang dibuka ke localhost. Database **tidak** dipublikasikan.

## Cara menjalankan
Prasyarat: Docker + Docker Compose v2.
```bash
git clone <URL-REPO-ANDA>
cd kerjalab
cp .env.example .env          # lalu ganti password & JWT_SECRET
docker compose up -d --build
```
Buka <http://localhost:3000>. Dengan `AUTH_MODE=dev` (default), login memakai nama + email dummy.

Perintah berguna:
```bash
docker compose ps                         # status service (db harus healthy)
curl -i http://localhost:4000/health      # 200 {"status":"ok"}
docker compose --profile tools up -d      # + Adminer di http://localhost:8080 (server: db)
docker compose down                       # hentikan, DATA TETAP ADA
docker compose down -v                    # hentikan + HAPUS volume (data hilang)
```

### Login Google (opsional)
1. Google Cloud Console → APIs & Services → Credentials → *OAuth client ID* (Web application), Authorized JavaScript origins: `http://localhost:3000`.
2. Di `.env`: `AUTH_MODE=google` dan `GOOGLE_CLIENT_ID=<client id>` lalu `docker compose up -d --build`.

## Endpoint utama
| Method | Path | Keterangan | Status |
|---|---|---|---|
| GET | `/health` | health check + cek DB | 200 / 503 |
| GET | `/api/simulations` | daftar simulasi (baca) | 200 |
| POST | `/api/simulations/:id/start` | mulai percobaan (tulis ke DB) | 201 |
| POST | `/api/attempts/:id/submit` | kirim jawaban, hitung skor & hadiah | 200 / 409 |
| GET | `/api/daily` | tantangan harian + streak | 200 |
| GET/PATCH/DELETE | `/api/me` | profil, ubah profil, hapus data | 200 / 204 |

Semua `/api/*` selain `/api/config` dan `/api/auth/*` memerlukan header `Authorization: Bearer <token>`.

## Struktur
```
backend/   Express + pg (Dockerfile multi-stage, .dockerignore)
frontend/  Next.js standalone (Dockerfile 3 stage, .dockerignore)
docker-compose.yml   .env.example   docs/
```

## Screenshot
1) Uji docker compose ps
<img width="1206" height="112" alt="image" src="https://github.com/user-attachments/assets/3a644dda-9ad3-4106-bd65-30eaa28b364e" />


2) Uji endpoint dengan curl
  - curl -i http://localhost:4000/health

    <img width="450" height="205" alt="image" src="https://github.com/user-attachments/assets/a7ae2349-49c6-4af3-8c75-902275743569" />
  - curl -i http://localhost:4000/api/config

    <img width="443" height="208" alt="image" src="https://github.com/user-attachments/assets/f3d1c95f-03ca-488d-a828-6f4fb087bb6a" />
  - curl -i http://localhost:4000/api/simulations

    <img width="442" height="206" alt="image" src="https://github.com/user-attachments/assets/4b976409-98d5-49ec-ad5f-dc269dc006a0" />


3) Uji persistensi
   - Akun dengan data lvl, skill, koin

     <img width="1919" height="1032" alt="Screenshot 2026-11-10 092116" src="https://github.com/user-attachments/assets/4f9e6714-df66-4032-a9d6-84cf30196d00" />
   - Menghapus & jalan ulang kontainer

     <img width="442" height="207" alt="image" src="https://github.com/user-attachments/assets/06bbd891-fa8b-4592-bda1-61e4e1c0c500" />
   - Persistensi volume terbukti

     <img width="1583" height="791" alt="Screenshot 2026-11-10 092309" src="https://github.com/user-attachments/assets/475c7df3-f56a-4d86-9a12-d0765950abe7" />

## Tautan
- Artikel: https://dev.to/valent_steveasman_0111b6/kerjalab-simulasi-kerja-multi-tier-dengan-docker-compose-di-localhost-1k2a
- Video YouTube: _(isi)_

## Sumber & atribusi
Next.js, React, Express, node-postgres, google-auth-library, jsonwebtoken (open-source, lisensi MIT/Apache). Starter: `npm init` / struktur `app/` Next.js standar. Gambar Docker resmi: `node`, `postgres`, `adminer`.
