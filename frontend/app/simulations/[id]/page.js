'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Nav from '../../../components/Nav';
import { api, DIFF, fmtTime } from '../../../lib/api';
import { useMe } from '../../../lib/useMe';

export default function Simulation() {
  const { id } = useParams();
  const { me, refresh } = useMe();
  const [sim, setSim] = useState(null);
  const [run, setRun] = useState(null);      // data dari /start
  const [answers, setAnswers] = useState([]);
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitted = useRef(false);

  useEffect(() => { if (me) api(`/simulations/${id}`).then(setSim).catch((e) => setError(e.message)); }, [me, id]);

  const start = async () => {
    setError(''); setResult(null); submitted.current = false;
    try {
      const r = await api(`/simulations/${id}/start`, { method: 'POST' });
      setRun(r); setAnswers(new Array(r.questions.length).fill(null)); setLeft(r.time_limit_s);
    } catch (e) { setError(e.message); }
  };

  const submit = useCallback(async (ans) => {
    if (submitted.current || !run) return;
    submitted.current = true; setBusy(true);
    try {
      const r = await api(`/attempts/${run.attempt_id}/submit`, { method: 'POST', body: { answers: ans } });
      setResult(r); setRun(null); refresh();
      api(`/simulations/${id}`).then(setSim).catch(() => {});
    } catch (e) { setError(e.message); submitted.current = false; }
    setBusy(false);
  }, [run, id, refresh]);

  // Hitung mundur; kirim otomatis saat waktu habis
  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [run]);
  useEffect(() => { if (run && left <= 0) submit(answers); }, [left, run, answers, submit]);

  if (!me) return null;
  const q = run && run.questions;

  return (
    <div data-theme={me.theme}>
      <Nav me={me} />
      <main className="wrap" style={{ maxWidth: 760 }}>
        <Link href="/dashboard" className="muted small">← Kembali</Link>
        {error && <div className="err" style={{ margin: '1rem 0' }}>{error}</div>}

        {sim && !run && !result && (
          <section className="card sec">
            <span className={`badge d${sim.difficulty}`}>{DIFF[sim.difficulty]}</span>
            <span className="badge">{sim.field_name}</span>
            <h2 style={{ marginTop: '.5rem' }}>{sim.title}</h2>
            <p>{sim.scenario}</p>
            <p className="muted small">Skill: {sim.skill} · Batas waktu {fmtTime(sim.time_limit_s)} · Hadiah pertama kali lulus: 🪙 {sim.reward_coins} + ✨ {sim.reward_xp} XP · Nilai lulus 60%. Gagal? Coba ulang kapan saja tanpa pinalti.</p>
            <button className="btn" onClick={start}>{sim.attempts ? 'Mulai lagi' : 'Mulai simulasi'}</button>
          </section>
        )}

        {run && (
          <section className="sec">
            <div className="row">
              <h2>{run.title}</h2>
              <div className={`timer ${left <= 15 ? 'low' : ''}`}>⏱ {fmtTime(Math.max(left, 0))}</div>
            </div>
            <p className="muted">{run.scenario}</p>
            {q.map((qq, i) => (
              <div className="card" key={qq.id} style={{ marginBottom: '1rem' }}>
                <b>{i + 1}. {qq.prompt}</b>
                {qq.options.map((o, j) => (
                  <button key={j} className={`opt ${answers[i] === j ? 'sel' : ''}`} onClick={() => setAnswers((a) => a.map((v, k) => (k === i ? j : v)))}>{o}</button>
                ))}
              </div>
            ))}
            <button className="btn" disabled={busy} onClick={() => submit(answers)}>Kirim jawaban</button>
          </section>
        )}

        {result && (
          <section className="sec">
            <div className="card" style={{ textAlign: 'center' }}>
              <h2>{result.passed ? '🎉 Lulus!' : result.timed_out ? '⏰ Waktu habis' : 'Belum lulus'}</h2>
              <p>Skor {result.score}% ({result.correct}/{result.total} benar)</p>
              {result.passed && result.rewards.first_clear && <p className="ok">+{result.rewards.coins} koin · +{result.rewards.xp} XP{result.rewards.leveled_up ? ` · Naik ke level ${result.rewards.new_level}!` : ''}</p>}
              {result.passed && !result.rewards.first_clear && <p className="muted">Sudah pernah lulus — hadiah dasar hanya diberikan sekali.</p>}
              {result.rewards.daily_bonus > 0 && <p className="ok">🔥 Bonus harian +{result.rewards.daily_bonus} koin · streak {result.rewards.streak} hari</p>}
              {!result.passed && <p className="muted">Tidak ada pinalti. Pelajari pembahasan di bawah lalu coba lagi.</p>}
              <button className="btn" onClick={start}>Coba lagi</button>{' '}
              <Link className="btn ghost" href="/dashboard">Simulasi lain</Link>
            </div>
            <h3 className="sec">Pembahasan</h3>
            {result.review.map((r, i) => (
              <div key={r.question_id} className="card" style={{ marginBottom: '.75rem' }}>
                <b className={r.correct ? 'ok' : 'err'}>Soal {i + 1}: {r.correct ? 'Benar' : r.your_answer === null ? 'Tidak dijawab' : 'Salah'}</b>
                <div className="small muted">{r.explanation}</div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
