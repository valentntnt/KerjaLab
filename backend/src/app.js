const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { pool } = require('./db');

const TZ = process.env.APP_TZ || 'Asia/Jakarta';
const PASS_SCORE = 60;          // nilai minimal lulus (%)
const GRACE_S = 5;              // toleransi latensi jaringan saat submit
const XP_PER_LEVEL = 100;

const THEMES = {
  default: { name: 'Klasik', price: 0 },
  ocean: { name: 'Samudra', price: 50 },
  sunset: { name: 'Senja', price: 75 },
  forest: { name: 'Hutan', price: 75 },
  midnight: { name: 'Tengah Malam', price: 150 },
};

const levelOf = (xp) => 1 + Math.floor(xp / XP_PER_LEVEL);
const dayStr = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
const shiftDay = (s, n) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const isHttpsUrl = (v) => { try { return new URL(v).protocol === 'https:'; } catch { return false; } };

function createApp() {
  const app = express();
  app.use(express.json({ limit: '50kb' }));

  const JWT_SECRET = process.env.JWT_SECRET;
  const AUTH_MODE = process.env.AUTH_MODE || 'google';
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
  const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

  const signToken = (u) => jwt.sign({ uid: u.id }, JWT_SECRET, { expiresIn: '7d' });

  const auth = wrap(async (req, res, next) => {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'unauthorized', message: 'Token tidak ada' });
    let payload;
    try { payload = jwt.verify(token, JWT_SECRET); }
    catch { return res.status(401).json({ error: 'unauthorized', message: 'Token tidak valid/kedaluwarsa' }); }
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [payload.uid]);
    if (!rows[0]) return res.status(401).json({ error: 'unauthorized', message: 'Pengguna tidak ditemukan' });
    req.user = rows[0];
    next();
  });

  // ---------- Health & config ----------
  app.get('/health', wrap(async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.status(200).json({ status: 'ok', db: 'up', time: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  }));

  app.get('/api/config', (_req, res) => {
    res.json({ authMode: AUTH_MODE, googleClientId: AUTH_MODE === 'google' ? GOOGLE_CLIENT_ID : null });
  });

  // ---------- Auth ----------
  async function upsertUser({ sub, email, name, picture }, consent) {
    const found = await pool.query('SELECT * FROM users WHERE google_sub=$1 OR email=$2', [sub, email]);
    if (found.rows[0]) {
      const { rows } = await pool.query(
        'UPDATE users SET name=$2, avatar_url=COALESCE($3, avatar_url) WHERE id=$1 RETURNING *',
        [found.rows[0].id, name, picture || null]
      );
      return { user: rows[0], created: false };
    }
    if (consent !== true) return { error: 'consent_required' };
    const { rows } = await pool.query(
      `INSERT INTO users (google_sub, email, name, avatar_url, consent_at) VALUES ($1,$2,$3,$4,now()) RETURNING *`,
      [sub, email, name, picture || null]
    );
    return { user: rows[0], created: true };
  }

  function sendAuth(res, result) {
    if (result.error === 'consent_required') {
      return res.status(400).json({ error: 'consent_required', message: 'Persetujuan pemrosesan data pribadi wajib dicentang untuk mendaftar.' });
    }
    res.status(result.created ? 201 : 200).json({ token: signToken(result.user), created: result.created });
  }

  app.post('/api/auth/google', wrap(async (req, res) => {
    if (AUTH_MODE !== 'google') return res.status(404).json({ error: 'not_found' });
    const { credential, consent } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'bad_request', message: 'credential wajib' });
    let p;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
      p = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: 'invalid_google_token' });
    }
    if (!p.email_verified) return res.status(401).json({ error: 'email_not_verified' });
    sendAuth(res, await upsertUser({ sub: p.sub, email: p.email.toLowerCase(), name: p.name || p.email, picture: p.picture }, consent));
  }));

  // Mode pengembangan lokal TANPA Google (AUTH_MODE=dev). Nonaktif (404) di mode google.
  app.post('/api/auth/dev', wrap(async (req, res) => {
    if (AUTH_MODE !== 'dev') return res.status(404).json({ error: 'not_found' });
    const { name, email, consent } = req.body || {};
    if (!name || !email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'bad_request', message: 'name dan email valid wajib' });
    sendAuth(res, await upsertUser({ sub: `dev:${email.toLowerCase()}`, email: email.toLowerCase(), name: String(name).slice(0, 80) }, consent));
  }));

  // ---------- Katalog ----------
  app.get('/api/fields', auth, wrap(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT f.*, count(s.id)::int AS simulation_count
       FROM fields f LEFT JOIN simulations s ON s.field_slug = f.slug
       GROUP BY f.slug ORDER BY f.name`
    );
    res.json(rows);
  }));

  const LIST_SQL = `
    SELECT s.id, s.slug, s.field_slug, f.name AS field_name, f.icon AS field_icon, s.title, s.scenario, s.skill, s.skill_kind,
           s.difficulty, s.time_limit_s, s.reward_coins, s.reward_xp,
           COALESCE(MAX(a.score), 0)::int AS best_score,
           COALESCE(bool_or(a.passed), false) AS passed,
           count(a.id)::int AS attempts
    FROM simulations s
    JOIN fields f ON f.slug = s.field_slug
    LEFT JOIN attempts a ON a.simulation_id = s.id AND a.user_id = $1 AND a.submitted_at IS NOT NULL`;

  app.get('/api/simulations', auth, wrap(async (req, res) => {
    const { field, difficulty } = req.query;
    const params = [req.user.id];
    const where = [];
    if (field) { params.push(String(field)); where.push(`s.field_slug = $${params.length}`); }
    if (difficulty) {
      const d = Number(difficulty);
      if (![1, 2, 3].includes(d)) return res.status(400).json({ error: 'bad_request', message: 'difficulty harus 1-3' });
      params.push(d); where.push(`s.difficulty = $${params.length}`);
    }
    const sql = `${LIST_SQL} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 GROUP BY s.id, f.name, f.icon ORDER BY s.field_slug, s.difficulty, s.id`;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  }));

  app.get('/api/simulations/:id', auth, wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'bad_request' });
    const { rows } = await pool.query(`${LIST_SQL} WHERE s.id = $2 GROUP BY s.id, f.name, f.icon`, [req.user.id, id]);
    if (!rows[0]) return res.status(404).json({ error: 'not_found', message: 'Simulasi tidak ditemukan' });
    res.json(rows[0]);
  }));

  // ---------- Bermain ----------
  app.post('/api/simulations/:id/start', auth, wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'bad_request' });
    const sim = (await pool.query('SELECT * FROM simulations WHERE id=$1', [id])).rows[0];
    if (!sim) return res.status(404).json({ error: 'not_found', message: 'Simulasi tidak ditemukan' });
    const questions = (await pool.query(
      'SELECT id, position, prompt, options FROM questions WHERE simulation_id=$1 ORDER BY position', [id])).rows;
    // Tanpa penalti: percobaan lama yang belum dikirim dianggap ditinggalkan.
    const att = (await pool.query(
      'INSERT INTO attempts (user_id, simulation_id) VALUES ($1,$2) RETURNING id, started_at', [req.user.id, id])).rows[0];
    res.status(201).json({
      attempt_id: att.id, started_at: att.started_at, time_limit_s: sim.time_limit_s,
      title: sim.title, scenario: sim.scenario, questions,
    });
  }));

  app.post('/api/attempts/:id/submit', auth, wrap(async (req, res) => {
    const attemptId = Number(req.params.id);
    const answers = (req.body || {}).answers;
    if (!Number.isInteger(attemptId) || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'bad_request', message: 'answers harus berupa array' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const att = (await client.query(
        'SELECT * FROM attempts WHERE id=$1 AND user_id=$2 FOR UPDATE', [attemptId, req.user.id])).rows[0];
      if (!att) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'not_found' }); }
      if (att.submitted_at) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'already_submitted' }); }

      const sim = (await client.query('SELECT * FROM simulations WHERE id=$1', [att.simulation_id])).rows[0];
      const qs = (await client.query('SELECT * FROM questions WHERE simulation_id=$1 ORDER BY position', [sim.id])).rows;
      const elapsed = Math.round((Date.now() - new Date(att.started_at).getTime()) / 1000);
      const timedOut = elapsed > sim.time_limit_s + GRACE_S;

      let correct = 0;
      const review = qs.map((q, i) => {
        const ok = answers[i] === q.answer_index;
        if (ok) correct++;
        return { question_id: q.id, your_answer: answers[i] ?? null, correct_answer: q.answer_index, correct: ok, explanation: q.explanation };
      });
      const score = Math.round((100 * correct) / qs.length);
      const passed = !timedOut && score >= PASS_SCORE;

      await client.query(
        'UPDATE attempts SET submitted_at=now(), score=$2, passed=$3, timed_out=$4, duration_s=$5 WHERE id=$1',
        [att.id, score, passed, timedOut, Math.min(elapsed, sim.time_limit_s)]);

      const rewards = { coins: 0, xp: 0, daily_bonus: 0, first_clear: false, streak: null, leveled_up: false, new_level: null };

      if (passed) {
        const prior = await client.query(
          'SELECT 1 FROM attempts WHERE user_id=$1 AND simulation_id=$2 AND passed AND id<>$3 LIMIT 1', [req.user.id, sim.id, att.id]);
        if (prior.rowCount === 0) {
          rewards.first_clear = true;
          rewards.coins = sim.reward_coins;
          rewards.xp = sim.reward_xp;
          const before = (await client.query('SELECT xp FROM user_skills WHERE user_id=$1 AND skill=$2', [req.user.id, sim.skill])).rows[0];
          const oldXp = before ? before.xp : 0;
          await client.query(
            `INSERT INTO user_skills (user_id, skill, kind, xp) VALUES ($1,$2,$3,$4)
             ON CONFLICT (user_id, skill) DO UPDATE SET xp = user_skills.xp + EXCLUDED.xp`,
            [req.user.id, sim.skill, sim.skill_kind, sim.reward_xp]);
          if (levelOf(oldXp + sim.reward_xp) > levelOf(oldXp)) { rewards.leveled_up = true; rewards.new_level = levelOf(oldXp + sim.reward_xp); }
        }

        // Tantangan harian + streak
        const daily = await dailySimulationId(client);
        const today = dayStr();
        const last = req.user.last_daily_date || null;
        if (sim.id === daily && last !== today) {
          const streak = last === shiftDay(today, -1) ? req.user.streak + 1 : 1;
          rewards.daily_bonus = 10 + 5 * (Math.min(streak, 7) - 1);
          rewards.streak = streak;
          await client.query('UPDATE users SET streak=$2, last_daily_date=$3 WHERE id=$1', [req.user.id, streak, today]);
        }
        const totalCoins = rewards.coins + rewards.daily_bonus;
        if (totalCoins > 0) await client.query('UPDATE users SET coins = coins + $2 WHERE id=$1', [req.user.id, totalCoins]);
      }
      await client.query('COMMIT');
      res.status(200).json({ score, passed, timed_out: timedOut, correct, total: qs.length, pass_score: PASS_SCORE, rewards, review });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }));

  // ---------- Tantangan harian ----------
  async function dailySimulationId(db) {
    const { rows } = await db.query('SELECT id FROM simulations ORDER BY id');
    if (!rows.length) return null;
    const dayNumber = Math.floor(new Date(`${dayStr()}T00:00:00Z`).getTime() / 86400000);
    return rows[dayNumber % rows.length].id;
  }

  app.get('/api/daily', auth, wrap(async (req, res) => {
    const id = await dailySimulationId(pool);
    const { rows } = await pool.query(`${LIST_SQL} WHERE s.id = $2 GROUP BY s.id, f.name, f.icon`, [req.user.id, id]);
    const today = dayStr();
    const last = req.user.last_daily_date || null;
    const alive = last === today || last === shiftDay(today, -1);
    res.json({
      date: today, simulation: rows[0],
      completed_today: last === today,
      streak: alive ? req.user.streak : 0,
      next_bonus: 10 + 5 * (Math.min((last === today ? req.user.streak : alive ? req.user.streak : 0) + 1, 7) - 1),
    });
  }));

  // ---------- Profil ----------
  app.get('/api/me', auth, wrap(async (req, res) => {
    const u = req.user;
    const skills = (await pool.query('SELECT skill, kind, xp FROM user_skills WHERE user_id=$1 ORDER BY xp DESC', [u.id])).rows
      .map((s) => ({ ...s, level: levelOf(s.xp), xp_in_level: s.xp % XP_PER_LEVEL, xp_per_level: XP_PER_LEVEL }));
    const stats = (await pool.query(
      `SELECT count(*)::int AS attempts,
              count(*) FILTER (WHERE passed)::int AS passed,
              COALESCE(sum(duration_s),0)::int AS total_time_s,
              count(DISTINCT simulation_id) FILTER (WHERE passed)::int AS cleared
       FROM attempts WHERE user_id=$1 AND submitted_at IS NOT NULL`, [u.id])).rows[0];
    const recent = (await pool.query(
      `SELECT a.id, s.title, s.skill, a.score, a.passed, a.timed_out, a.submitted_at
       FROM attempts a JOIN simulations s ON s.id=a.simulation_id
       WHERE a.user_id=$1 AND a.submitted_at IS NOT NULL ORDER BY a.submitted_at DESC LIMIT 8`, [u.id])).rows;
    const today = dayStr();
    const last = u.last_daily_date || null;
    const streakAlive = last === today || last === shiftDay(today, -1);
    res.json({
      id: u.id, name: u.name, email: u.email, avatar_url: u.avatar_url, coins: u.coins,
      streak: streakAlive ? u.streak : 0, linkedin_url: u.linkedin_url, github_url: u.github_url,
      share_with_companies: u.share_with_companies, theme: u.theme, owned_themes: u.owned_themes,
      themes: Object.entries(THEMES).map(([key, t]) => ({ key, ...t })),
      member_since: u.created_at, skills, stats, recent,
      total_level: levelOf(skills.reduce((a, s) => a + s.xp, 0)),
    });
  }));

  app.patch('/api/me', auth, wrap(async (req, res) => {
    const { linkedin_url, github_url, share_with_companies } = req.body || {};
    const sets = []; const vals = [req.user.id];
    const push = (col, v) => { vals.push(v); sets.push(`${col}=$${vals.length}`); };
    for (const [col, v] of [['linkedin_url', linkedin_url], ['github_url', github_url]]) {
      if (v === undefined) continue;
      if (v === '' || v === null) push(col, null);
      else if (typeof v === 'string' && v.length <= 200 && isHttpsUrl(v)) push(col, v);
      else return res.status(400).json({ error: 'bad_request', message: `${col} harus URL https yang valid` });
    }
    if (share_with_companies !== undefined) {
      if (typeof share_with_companies !== 'boolean') return res.status(400).json({ error: 'bad_request', message: 'share_with_companies harus boolean' });
      push('share_with_companies', share_with_companies);
    }
    if (!sets.length) return res.status(400).json({ error: 'bad_request', message: 'Tidak ada field yang diubah' });
    await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id=$1`, vals);
    res.status(200).json({ ok: true });
  }));

  app.post('/api/me/themes/:key/buy', auth, wrap(async (req, res) => {
    const t = THEMES[req.params.key];
    if (!t) return res.status(404).json({ error: 'not_found', message: 'Tema tidak ada' });
    const u = req.user;
    if (u.owned_themes.includes(req.params.key)) return res.status(409).json({ error: 'already_owned' });
    if (u.coins < t.price) return res.status(402).json({ error: 'insufficient_coins', message: 'Koin tidak cukup' });
    await pool.query('UPDATE users SET coins=coins-$2, owned_themes=array_append(owned_themes,$3) WHERE id=$1', [u.id, t.price, req.params.key]);
    res.status(201).json({ ok: true });
  }));

  app.put('/api/me/theme', auth, wrap(async (req, res) => {
    const key = (req.body || {}).theme;
    if (!req.user.owned_themes.includes(key)) return res.status(403).json({ error: 'forbidden', message: 'Tema belum dimiliki' });
    await pool.query('UPDATE users SET theme=$2 WHERE id=$1', [req.user.id, key]);
    res.status(200).json({ ok: true });
  }));

  // Hak penghapusan data (UU PDP Pasal 8 – hak menghapus data pribadi)
  app.delete('/api/me', auth, wrap(async (req, res) => {
    await pool.query('DELETE FROM users WHERE id=$1', [req.user.id]);
    res.status(204).end();
  }));

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  });
  return app;
}

module.exports = { createApp };
