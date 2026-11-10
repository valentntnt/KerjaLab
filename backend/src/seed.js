// Data awal (dummy, aman dipublikasikan): bidang + simulasi + soal.
// Seed bersifat idempoten: aman dijalankan setiap container start.
const { pool } = require('./db');

const FIELDS = [
  { slug: 'teknologi', name: 'Teknologi', icon: '💻', blurb: 'Debugging, database, dan penanganan insiden server.' },
  { slug: 'sains', name: 'Sains', icon: '🔬', blurb: 'Metode ilmiah, analisis data lab, dan validasi hasil.' },
  { slug: 'bisnis', name: 'Bisnis', icon: '📈', blurb: 'Keuangan usaha kecil, promosi, dan negosiasi.' },
  { slug: 'soft-skill', name: 'Soft Skill', icon: '🤝', blurb: 'Komunikasi, manajemen waktu, dan kerja tim.' },
];

// difficulty 1 = tugas awal (2 menit), 2 = menengah (4 menit), 3 = sulit (6 menit)
const TIERS = {
  1: { time_limit_s: 120, reward_coins: 10, reward_xp: 20 },
  2: { time_limit_s: 240, reward_coins: 25, reward_xp: 50 },
  3: { time_limit_s: 360, reward_coins: 50, reward_xp: 100 },
};

const SIMS = [
  {
    slug: 'debug-login', field: 'teknologi', title: 'Bug Halaman Login', difficulty: 1,
    skill: 'Debugging', kind: 'hard',
    scenario: 'Kamu junior developer di sebuah startup. Pengguna melapor: "Setelah klik Login, halaman hanya refresh dan tidak masuk". Tim meminta kamu menelusuri penyebabnya.',
    questions: [
      { q: 'Langkah PERTAMA yang paling tepat untuk menyelidiki bug ini?', o: ['Menulis ulang seluruh fitur login', 'Mereproduksi bug dan melihat console/network di browser', 'Menyalahkan tim QA', 'Menghapus database pengguna'], a: 1, e: 'Mereproduksi masalah dan mengamati error/respons jaringan memberi petunjuk konkret sebelum mengubah kode.' },
      { q: 'Di tab Network, request login mengembalikan status 401. Artinya?', o: ['Server error internal', 'Halaman tidak ditemukan', 'Kredensial/otorisasi tidak valid', 'Request berhasil dibuat'], a: 2, e: '401 Unauthorized berarti autentikasi gagal atau tidak valid.' },
      { q: 'Setelah menemukan akar masalah dan memperbaikinya, apa yang sebaiknya dilakukan sebelum merge?', o: ['Langsung deploy tanpa tes', 'Menambah test yang mereproduksi bug lalu meminta code review', 'Menghapus log supaya rapi', 'Menunggu pengguna melapor lagi'], a: 1, e: 'Test regresi + review mencegah bug yang sama muncul kembali.' },
    ],
  },
  {
    slug: 'sql-laporan', field: 'teknologi', title: 'Laporan Penjualan dengan SQL', difficulty: 2,
    skill: 'Basis Data', kind: 'hard',
    scenario: 'Manajer meminta laporan: total penjualan per kategori produk bulan ini, diurutkan dari yang terbesar. Tabel: orders(id, product_id, qty, created_at) dan products(id, category, price).',
    questions: [
      { q: 'Klausa yang dipakai untuk menjumlahkan penjualan per kategori adalah…', o: ['ORDER BY saja', 'GROUP BY category dengan SUM()', 'DISTINCT category', 'LIMIT 1'], a: 1, e: 'GROUP BY mengelompokkan baris per kategori, SUM() menjumlahkan nilainya.' },
      { q: 'Agar order dan produk bisa digabung, yang diperlukan adalah…', o: ['JOIN orders ke products lewat product_id', 'UNION keduanya', 'DROP TABLE products', 'TRUNCATE orders'], a: 0, e: 'JOIN pada kunci product_id = products.id menggabungkan data.' },
      { q: 'Untuk mengurutkan dari total terbesar ke terkecil digunakan…', o: ['ORDER BY total ASC', 'ORDER BY total DESC', 'GROUP BY total', 'HAVING total'], a: 1, e: 'DESC = menurun (terbesar dulu).' },
    ],
  },
  {
    slug: 'incident-server', field: 'teknologi', title: 'Insiden: Server Tiba-tiba Down', difficulty: 3,
    skill: 'Incident Response', kind: 'hard',
    scenario: 'Pukul 02.00 alert berbunyi: API production tidak merespons. Kamu on-call. Layanan dipakai ribuan pengguna.',
    questions: [
      { q: 'Prioritas pertama saat insiden berlangsung?', o: ['Mencari siapa yang salah', 'Memulihkan layanan / mitigasi dampak', 'Menulis postmortem lengkap', 'Mematikan semua monitoring'], a: 1, e: 'Mitigasi dan pemulihan layanan didahulukan; analisis akar masalah menyusul.' },
      { q: 'Container API terus restart (CrashLoop). Data pertama yang paling berguna?', o: ['Log container', 'Warna logo perusahaan', 'Jumlah pengikut media sosial', 'Harga server'], a: 0, e: 'Log menunjukkan error aplikasi yang menyebabkan crash.' },
      { q: 'Deploy terbaru dicurigai penyebabnya. Tindakan paling aman?', o: ['Rollback ke versi stabil sebelumnya', 'Deploy ulang versi yang sama berkali-kali', 'Menghapus database', 'Menunggu pagi'], a: 0, e: 'Rollback cepat memulihkan layanan; investigasi dilakukan setelahnya.' },
      { q: 'Setelah pulih, praktik terbaik yang dilakukan adalah…', o: ['Melupakan insiden', 'Blameless postmortem + action item pencegahan', 'Memecat engineer on-call', 'Menonaktifkan alert'], a: 1, e: 'Blameless postmortem fokus pada perbaikan proses, bukan menyalahkan orang.' },
    ],
  },
  {
    slug: 'desain-eksperimen', field: 'sains', title: 'Merancang Eksperimen Sederhana', difficulty: 1,
    skill: 'Metode Ilmiah', kind: 'hard',
    scenario: 'Kamu asisten lab. Dosen ingin tahu apakah pupuk A membuat tanaman tumbuh lebih tinggi dibanding tanpa pupuk.',
    questions: [
      { q: 'Variabel bebas pada eksperimen ini adalah…', o: ['Tinggi tanaman', 'Pemberian pupuk A', 'Jumlah cahaya yang dijaga sama', 'Nama dosen'], a: 1, e: 'Variabel bebas adalah yang sengaja diubah/diberi perlakuan: pupuk A.' },
      { q: 'Kelompok tanaman TANPA pupuk disebut…', o: ['Kelompok kontrol', 'Kelompok bonus', 'Variabel terikat', 'Hipotesis'], a: 0, e: 'Kelompok kontrol menjadi pembanding.' },
      { q: 'Agar hasil adil, hal yang harus dijaga sama adalah…', o: ['Jenis tanaman, cahaya, dan air', 'Hanya warna pot', 'Tidak ada yang perlu sama', 'Jumlah pupuk di kontrol'], a: 0, e: 'Variabel kontrol dijaga konstan agar perbedaan hanya berasal dari perlakuan.' },
    ],
  },
  {
    slug: 'analisis-data-lab', field: 'sains', title: 'Membaca Data Hasil Lab', difficulty: 2,
    skill: 'Analisis Data', kind: 'hard',
    scenario: 'Hasil pengukuran suhu reaksi (°C) dari 5 percobaan: 24, 25, 24, 26, 41. Kamu diminta melaporkan ringkasannya ke supervisor.',
    questions: [
      { q: 'Nilai 41 dibanding lainnya disebut…', o: ['Median', 'Outlier (pencilan)', 'Modus', 'Standar'], a: 1, e: 'Nilai yang jauh menyimpang dari pola data disebut outlier.' },
      { q: 'Ukuran pemusatan yang LEBIH tahan terhadap outlier adalah…', o: ['Rata-rata', 'Median', 'Jumlah', 'Rentang'], a: 1, e: 'Median tidak terpengaruh nilai ekstrem sebesar rata-rata.' },
      { q: 'Sikap ilmiah terhadap nilai 41 adalah…', o: ['Langsung dihapus diam-diam', 'Diselidiki penyebabnya (salah ukur?) dan didokumentasikan', 'Diganti 25 agar rapi', 'Diabaikan tanpa catatan'], a: 1, e: 'Outlier harus diselidiki dan didokumentasikan, bukan dimanipulasi.' },
    ],
  },
  {
    slug: 'validasi-penelitian', field: 'sains', title: 'Validasi Klaim Penelitian', difficulty: 3,
    skill: 'Berpikir Kritis', kind: 'hard',
    scenario: 'Sebuah artikel mengklaim "Minuman X menyembuhkan flu" berdasarkan survei 12 orang yang minum X lalu sembuh dalam seminggu.',
    questions: [
      { q: 'Kelemahan utama klaim tersebut adalah…', o: ['Tidak ada kelompok pembanding', 'Terlalu banyak peserta', 'Terlalu singkat judulnya', 'Memakai bahasa ilmiah'], a: 0, e: 'Tanpa kelompok kontrol, kesembuhan alami flu tidak bisa dipisahkan dari efek X.' },
      { q: 'Flu biasanya sembuh sendiri dalam ±1 minggu. Hal ini disebut…', o: ['Variabel pengganggu (confounding)', 'Bukti kausal', 'Replikasi', 'Peer review'], a: 0, e: 'Kesembuhan alami adalah faktor pengganggu yang menjelaskan hasil.' },
      { q: 'Desain studi yang paling kuat untuk menguji klaim ini?', o: ['Testimoni pengguna', 'Uji acak terkontrol dengan plasebo', 'Survei media sosial', 'Opini seorang ahli'], a: 1, e: 'Randomized controlled trial dengan plasebo meminimalkan bias.' },
      { q: 'Korelasi antara minum X dan sembuh…', o: ['Selalu berarti X penyebabnya', 'Tidak otomatis berarti sebab-akibat', 'Membuktikan X aman', 'Tidak berguna sama sekali'], a: 1, e: 'Korelasi tidak sama dengan kausalitas.' },
    ],
  },
  {
    slug: 'margin-warung', field: 'bisnis', title: 'Hitung Margin Warung Kopi', difficulty: 1,
    skill: 'Analisis Keuangan', kind: 'hard',
    scenario: 'Warung kopi menjual es kopi susu Rp18.000. Biaya bahan per gelas Rp8.000.',
    questions: [
      { q: 'Laba kotor per gelas?', o: ['Rp8.000', 'Rp10.000', 'Rp18.000', 'Rp26.000'], a: 1, e: '18.000 − 8.000 = 10.000.' },
      { q: 'Margin laba kotor (dalam %) sekitar…', o: ['44%', '56%', '80%', '125%'], a: 1, e: '10.000 / 18.000 ≈ 55,6% ≈ 56%.' },
      { q: 'Jika terjual 50 gelas sehari, laba kotor harian?', o: ['Rp400.000', 'Rp500.000', 'Rp900.000', 'Rp1.400.000'], a: 1, e: '50 × 10.000 = 500.000.' },
    ],
  },
  {
    slug: 'strategi-promo', field: 'bisnis', title: 'Strategi Promo Kafe Baru', difficulty: 2,
    skill: 'Pemasaran', kind: 'hard',
    scenario: 'Kafe baru dekat kampus sepi di jam 14.00–17.00. Anggaran promosi Rp500.000. Kamu diminta menyusun strategi.',
    questions: [
      { q: 'Target pasar yang paling relevan?', o: ['Mahasiswa dan pekerja remote sekitar kampus', 'Wisatawan luar negeri', 'Pensiunan di kota lain', 'Semua orang tanpa segmentasi'], a: 0, e: 'Segmentasi berdasarkan lokasi dan kebiasaan membuat promosi efisien.' },
      { q: 'Promo yang paling sesuai untuk jam sepi?', o: ['Diskon harga di jam sibuk saja', 'Happy hour: diskon/bundling khusus 14.00–17.00', 'Menaikkan harga', 'Menutup kafe lebih awal'], a: 1, e: 'Insentif waktu-spesifik memindahkan permintaan ke jam sepi.' },
      { q: 'Cara terbaik mengukur keberhasilan promo?', o: ['Perasaan pemilik', 'Membandingkan penjualan jam 14–17 sebelum vs sesudah promo', 'Jumlah stiker', 'Tidak perlu diukur'], a: 1, e: 'Metrik yang terukur dan dibandingkan dengan baseline.' },
    ],
  },
  {
    slug: 'negosiasi-vendor', field: 'bisnis', title: 'Negosiasi dengan Vendor', difficulty: 3,
    skill: 'Negosiasi', kind: 'hard',
    scenario: 'Vendor kemasan menaikkan harga 15% mendadak. Kamu perlu menegosiasikan ulang tanpa merusak hubungan jangka panjang.',
    questions: [
      { q: 'Persiapan terbaik sebelum bernegosiasi?', o: ['Menentukan BATNA (alternatif terbaik) dan batas harga', 'Datang tanpa data', 'Mengancam langsung', 'Menunggu vendor menurunkan harga sendiri'], a: 0, e: 'BATNA memberi posisi tawar yang jelas.' },
      { q: 'Pendekatan yang menjaga hubungan?', o: ['Fokus pada kepentingan bersama (volume pesanan jangka panjang)', 'Menyerang kualitas vendor', 'Mengabaikan alasan mereka', 'Membatalkan kontrak seketika'], a: 0, e: 'Negosiasi berbasis kepentingan menciptakan solusi saling menguntungkan.' },
      { q: 'Vendor menawarkan kenaikan 8% jika kontrak 1 tahun. Respons yang baik?', o: ['Langsung terima tanpa berpikir', 'Bandingkan dengan alternatif lalu counter-offer (mis. 5% untuk 1 tahun)', 'Menolak dan pergi', 'Mengulang tuntutan awal'], a: 1, e: 'Counter-offer berdasar data & alternatif adalah praktik umum.' },
      { q: 'Hasil negosiasi sebaiknya…', o: ['Hanya dikatakan lisan', 'Dituangkan tertulis dalam kesepakatan', 'Dirahasiakan dari tim', 'Dibatalkan besok'], a: 1, e: 'Kesepakatan tertulis menghindari salah paham.' },
    ],
  },
  {
    slug: 'email-profesional', field: 'soft-skill', title: 'Menulis Email Profesional', difficulty: 1,
    skill: 'Komunikasi', kind: 'soft',
    scenario: 'Kamu perlu meminta perpanjangan deadline laporan kepada atasan karena data dari divisi lain terlambat.',
    questions: [
      { q: 'Subjek email yang baik?', o: ['TOLONG!!!', 'Permohonan Perpanjangan Deadline Laporan Q3 (diminta Jumat)', 'halo', '(tanpa subjek)'], a: 1, e: 'Subjek jelas, spesifik, dan informatif.' },
      { q: 'Isi email sebaiknya…', o: ['Panjang dan emosional', 'Singkat: konteks, alasan, usulan tanggal baru', 'Hanya menyalahkan divisi lain', 'Berisi lelucon'], a: 1, e: 'Ringkas dan solutif memudahkan atasan memutuskan.' },
      { q: 'Penutup yang tepat?', o: ['Bye', 'Terima kasih atas pengertiannya. Hormat saya, [Nama]', 'Cepat balas ya!!', 'Tidak perlu penutup'], a: 1, e: 'Sopan dan profesional.' },
    ],
  },
  {
    slug: 'prioritas-deadline', field: 'soft-skill', title: 'Tiga Deadline, Satu Hari', difficulty: 2,
    skill: 'Manajemen Waktu', kind: 'soft',
    scenario: 'Hari ini kamu punya: (A) laporan klien jatuh tempo pukul 15.00, (B) rapi-rapi arsip (tidak mendesak), (C) membalas email rekan yang menunggu jawabanmu untuk lanjut bekerja.',
    questions: [
      { q: 'Dalam matriks Eisenhower, tugas A termasuk…', o: ['Penting & mendesak', 'Tidak penting & tidak mendesak', 'Tidak penting tapi mendesak', 'Dapat didelegasikan selalu'], a: 0, e: 'Deadline dekat dan dampak ke klien tinggi.' },
      { q: 'Urutan pengerjaan yang paling masuk akal?', o: ['B, C, A', 'C (cepat, 5 menit, membuka blokir), lalu A, lalu B', 'B lalu A', 'Menunda semuanya'], a: 1, e: 'Tugas kecil yang memblokir orang lain dikerjakan cepat, lalu fokus pada yang kritis.' },
      { q: 'Jika A ternyata tidak selesai tepat waktu, tindakan profesional?', o: ['Diam dan berharap', 'Segera informasikan klien dengan estimasi baru', 'Mengirim hasil asal-asalan', 'Menyalahkan rekan'], a: 1, e: 'Komunikasi proaktif menjaga kepercayaan.' },
    ],
  },
  {
    slug: 'konflik-tim', field: 'soft-skill', title: 'Konflik dalam Tim Proyek', difficulty: 3,
    skill: 'Kerja Tim', kind: 'soft',
    scenario: 'Dua anggota timmu berselisih soal pembagian tugas, dan progres proyek terhambat. Kamu adalah koordinator tim.',
    questions: [
      { q: 'Langkah awal yang tepat?', o: ['Mengabaikan sampai reda', 'Mendengar masing-masing pihak secara terpisah dan netral', 'Memihak yang lebih senior', 'Mengumumkan konflik di grup besar'], a: 1, e: 'Mendengar aktif memahami akar masalah.' },
      { q: 'Saat mempertemukan keduanya, fokus pembicaraan sebaiknya…', o: ['Pada perilaku dan tujuan proyek, bukan serangan pribadi', 'Siapa yang paling salah', 'Kenangan buruk masa lalu', 'Menghukum salah satu'], a: 0, e: 'Fokus pada masalah, bukan orang.' },
      { q: 'Solusi yang berkelanjutan adalah…', o: ['Kesepakatan peran tertulis dan check-in rutin', 'Memisahkan tim tanpa diskusi', 'Membiarkan mereka menebak-nebak', 'Mengganti salah satu orang'], a: 0, e: 'Kejelasan peran dan komunikasi rutin mencegah konflik berulang.' },
      { q: 'Sikap koordinator yang baik terhadap hasil?', o: ['Menindaklanjuti dan memantau, tanpa menyindir', 'Selesai begitu rapat bubar', 'Menyebarkan cerita ke tim lain', 'Menuntut permintaan maaf publik'], a: 0, e: 'Tindak lanjut memastikan kesepakatan berjalan.' },
    ],
  },
];

async function seed() {
  for (const f of FIELDS) {
    await pool.query(
      `INSERT INTO fields (slug, name, icon, blurb) VALUES ($1,$2,$3,$4)
       ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, icon=EXCLUDED.icon, blurb=EXCLUDED.blurb`,
      [f.slug, f.name, f.icon, f.blurb]
    );
  }
  for (const s of SIMS) {
    const t = TIERS[s.difficulty];
    const { rows } = await pool.query(
      `INSERT INTO simulations (slug, field_slug, title, scenario, skill, skill_kind, difficulty, time_limit_s, reward_coins, reward_xp)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, scenario=EXCLUDED.scenario
       RETURNING id`,
      [s.slug, s.field, s.title, s.scenario, s.skill, s.kind, s.difficulty, t.time_limit_s, t.reward_coins, t.reward_xp]
    );
    const simId = rows[0].id;
    const { rows: cnt } = await pool.query('SELECT count(*)::int AS n FROM questions WHERE simulation_id=$1', [simId]);
    if (cnt[0].n === 0) {
      for (let i = 0; i < s.questions.length; i++) {
        const q = s.questions[i];
        await pool.query(
          `INSERT INTO questions (simulation_id, position, prompt, options, answer_index, explanation)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [simId, i + 1, q.q, JSON.stringify(q.o), q.a, q.e]
        );
      }
    }
  }
}

module.exports = { seed };
