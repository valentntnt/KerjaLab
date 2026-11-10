const { pool, migrate } = require('./db');
const { seed } = require('./seed');
const { createApp } = require('./app');

async function waitForDb(retries = 20) {
  for (let i = 1; i <= retries; i++) {
    try { await pool.query('SELECT 1'); return; }
    catch (e) { console.log(`[db] belum siap (${i}/${retries}): ${e.message}`); await new Promise((r) => setTimeout(r, 1500)); }
  }
  throw new Error('Database tidak dapat dihubungi');
}

(async () => {
  if (!process.env.JWT_SECRET) { console.error('JWT_SECRET wajib diisi (lihat .env.example)'); process.exit(1); }
  await waitForDb();
  await migrate();
  await seed();
  const port = Number(process.env.PORT || 4000);
  createApp().listen(port, '0.0.0.0', () => console.log(`KerjaLab API listening on :${port}`));
})().catch((e) => { console.error(e); process.exit(1); });
