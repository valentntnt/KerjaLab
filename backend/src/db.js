const types = require('pg').types;
types.setTypeParser(1082, (v) => v); // DATE -> string 'YYYY-MM-DD' (hindari konversi zona waktu)
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Konfigurasi dibaca dari environment (diisi docker compose dari file .env).
// DB_HOST berisi NAMA SERVICE ("db"), bukan IP/localhost.
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

module.exports = { pool, migrate };
