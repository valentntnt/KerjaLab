'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Nav from '../../components/Nav';
import SimCard from '../../components/SimCard';
import { api } from '../../lib/api';
import { useMe } from '../../lib/useMe';

export default function Dashboard() {
  const { me } = useMe();
  const [fields, setFields] = useState([]);
  const [sims, setSims] = useState([]);
  const [daily, setDaily] = useState(null);
  const [field, setField] = useState('all');
  const [diff, setDiff] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!me) return;
    Promise.all([api('/fields'), api('/simulations'), api('/daily')])
      .then(([f, s, d]) => { setFields(f); setSims(s); setDaily(d); })
      .catch((e) => setError(e.message));
  }, [me]);

  if (!me) return null;
  const shown = sims.filter((s) => (field === 'all' || s.field_slug === field) && (diff === 'all' || s.difficulty === Number(diff)));
  const starters = sims.filter((s) => s.difficulty === 1 && !s.passed);

  return (
    <div data-theme={me.theme}>
      <Nav me={me} />
      <main className="wrap">
        <h2>Halo, {me.name.split(' ')[0]} 👋</h2>
        <p className="muted">Level total {me.total_level} · {me.stats.cleared} simulasi lulus</p>
        {error && <div className="err">{error}</div>}

        {daily && (
          <section className="card daily sec">
            <div className="row">
              <div>
                <div className="small muted">Tantangan harian · {daily.date}</div>
                <h3>{daily.simulation.field_icon} {daily.simulation.title}</h3>
                <div className="muted small">
                  {daily.completed_today ? 'Selesai hari ini! Streak kamu aman. 🔥' : `Selesaikan untuk bonus ${daily.next_bonus} koin + streak.`} Streak sekarang: {daily.streak} hari
                </div>
              </div>
              <Link className="btn" href={`/simulations/${daily.simulation.id}`}>{daily.completed_today ? 'Main lagi' : 'Kerjakan'}</Link>
            </div>
          </section>
        )}

        {starters.length > 0 && field === 'all' && diff === 'all' && (
          <section className="sec">
            <h3>Mulai dari tugas awal</h3>
            <p className="muted small">Tugas simpel untuk mengetahui skill utama yang bisa kamu asah.</p>
            <div className="grid">{starters.slice(0, 3).map((s) => <SimCard key={s.id} s={s} />)}</div>
          </section>
        )}

        <section className="sec">
          <h3>Semua simulasi</h3>
          <div className="chips">
            <button className={`chip ${field === 'all' ? 'on' : ''}`} onClick={() => setField('all')}>Semua bidang</button>
            {fields.map((f) => (
              <button key={f.slug} className={`chip ${field === f.slug ? 'on' : ''}`} onClick={() => setField(f.slug)}>{f.icon} {f.name}</button>
            ))}
          </div>
          <div className="chips">
            {[['all', 'Semua level'], [1, 'Mudah'], [2, 'Menengah'], [3, 'Sulit']].map(([v, l]) => (
              <button key={v} className={`chip ${String(diff) === String(v) ? 'on' : ''}`} onClick={() => setDiff(v)}>{l}</button>
            ))}
          </div>
          <div className="grid">{shown.map((s) => <SimCard key={s.id} s={s} />)}</div>
          {shown.length === 0 && <p className="muted">Tidak ada simulasi untuk filter ini.</p>}
        </section>
      </main>
    </div>
  );
}
