'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, fmtDuration, setToken } from '../../lib/api';
import { useMe } from '../../lib/useMe';

export default function Profile() {
  const router = useRouter();
  const { me, refresh } = useMe();
  const [form, setForm] = useState({ linkedin_url: '', github_url: '', share_with_companies: false });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (me) setForm({ linkedin_url: me.linkedin_url || '', github_url: me.github_url || '', share_with_companies: me.share_with_companies });
  }, [me]);

  if (!me) return null;
  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
  const save = async (e) => {
    e.preventDefault();
    try { await api('/me', { method: 'PATCH', body: form }); await refresh(); flash('Profil disimpan ✓'); } catch (err) { flash(err.message); }
  };
  const buy = async (k) => { try { await api(`/me/themes/${k}/buy`, { method: 'POST' }); await refresh(); } catch (err) { flash(err.message); } };
  const use = async (k) => { await api('/me/theme', { method: 'PUT', body: { theme: k } }); await refresh(); };
  const erase = async () => {
    if (!confirm('Hapus akun dan seluruh data kamu secara permanen?')) return;
    await api('/me', { method: 'DELETE' }); setToken(null); router.push('/');
  };
  const skills = (kind) => me.skills.filter((s) => s.kind === kind);

  const SkillList = ({ title, list }) => (
    <div className="card">
      <h3>{title}</h3>
      {list.length === 0 && <p className="muted small">Belum ada. Selesaikan simulasi untuk menambah XP.</p>}
      {list.map((s) => (
        <div key={s.skill} style={{ marginBottom: '.7rem' }}>
          <div className="row small"><b>{s.skill}</b><span>Lv {s.level} · {s.xp_in_level}/{s.xp_per_level} XP</span></div>
          <div className="bar"><i style={{ width: `${(s.xp_in_level / s.xp_per_level) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );

  return (
    <div data-theme={me.theme}>
      <Nav me={me} />
      <main className="wrap">
        <div className="card row">
          <div>
            <h2>{me.name}</h2>
            <div className="muted small">{me.email} · bergabung {new Date(me.member_since).toLocaleDateString('id-ID')}</div>
            <div className="small" style={{ marginTop: '.4rem' }}>
              {me.linkedin_url && <a href={me.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn ↗ </a>}
              {me.github_url && <a href={me.github_url} target="_blank" rel="noopener noreferrer">GitHub ↗</a>}
            </div>
          </div>
          <div className="stat"><b>Lv {me.total_level}</b><span className="muted small">Level total</span></div>
        </div>

        <div className="grid sec" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
          <div className="card stat"><b>{me.stats.attempts}</b><span className="muted small">Simulasi dimainkan</span></div>
          <div className="card stat"><b>{me.stats.cleared}</b><span className="muted small">Simulasi lulus</span></div>
          <div className="card stat"><b>{fmtDuration(me.stats.total_time_s)}</b><span className="muted small">Total waktu</span></div>
          <div className="card stat"><b>🔥 {me.streak}</b><span className="muted small">Streak harian</span></div>
        </div>

        <div className="grid sec">
          <SkillList title="Hard skill" list={skills('hard')} />
          <SkillList title="Soft skill" list={skills('soft')} />
        </div>

        <section className="sec">
          <h3>Kustomisasi profil · 🪙 {me.coins}</h3>
          <div className="chips">
            {me.themes.map((t) => {
              const owned = me.owned_themes.includes(t.key);
              return owned
                ? <button key={t.key} className={`chip ${me.theme === t.key ? 'on' : ''}`} onClick={() => use(t.key)}>{t.name}</button>
                : <button key={t.key} className="chip" onClick={() => buy(t.key)} disabled={me.coins < t.price}>🔒 {t.name} · 🪙 {t.price}</button>;
            })}
          </div>
        </section>

        <section className="sec">
          <h3>Link sosial &amp; privasi</h3>
          <form className="card gap field" onSubmit={save}>
            <input type="text" placeholder="https://linkedin.com/in/…" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} />
            <input type="text" placeholder="https://github.com/…" value={form.github_url} onChange={(e) => setForm({ ...form, github_url: e.target.value })} />
            <label className="check">
              <input type="checkbox" checked={form.share_with_companies} onChange={(e) => setForm({ ...form, share_with_companies: e.target.checked })} />
              <span>Izinkan perusahaan mitra melihat profil &amp; skill saya untuk keperluan rekrutmen (opt-in, bisa dicabut kapan saja).</span>
            </label>
            <div className="row"><button className="btn" type="submit">Simpan</button><span className="ok">{msg}</span></div>
          </form>
        </section>

        <section className="sec">
          <h3>Riwayat terbaru</h3>
          <div className="card">
            {me.recent.length === 0 && <span className="muted small">Belum ada riwayat.</span>}
            {me.recent.map((r) => (
              <div key={r.id} className="row small" style={{ padding: '.25rem 0' }}>
                <span>{r.title} <span className="muted">· {r.skill}</span></span>
                <span className={r.passed ? 'ok' : 'err'}>{r.timed_out ? 'Waktu habis' : `${r.score}%`} {r.passed ? '✓' : ''}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="sec">
          <h3>Hapus data saya</h3>
          <p className="muted small">Sesuai hak penghapusan data pribadi (UU PDP), akun dan seluruh riwayat akan dihapus permanen.</p>
          <button className="btn ghost" style={{ color: 'var(--bad)' }} onClick={erase}>Hapus akun &amp; data</button>
        </section>
      </main>
    </div>
  );
}
