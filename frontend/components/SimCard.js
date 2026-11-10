import Link from 'next/link';
import { DIFF, fmtTime } from '../lib/api';

export default function SimCard({ s, highlight }) {
  return (
    <Link href={`/simulations/${s.id}`} className="card" style={{ display: 'block' }}>
      <div className="row">
        <div>
          <span className={`badge d${s.difficulty}`}>{DIFF[s.difficulty]}</span>
          <span className="badge">{s.skill_kind === 'hard' ? 'Hard skill' : 'Soft skill'}</span>
        </div>
        {s.passed && <span className="ok" title="Sudah lulus">✓ {s.best_score}%</span>}
      </div>
      <h3 style={{ marginTop: '.5rem' }}>{s.field_icon} {s.title}</h3>
      <div className="muted small">{s.skill} · ⏱ {fmtTime(s.time_limit_s)} · 🪙 {s.reward_coins} · ✨ {s.reward_xp} XP{highlight ? '' : ''}</div>
      {s.difficulty === 1 && !s.passed && <div className="small" style={{ marginTop: '.4rem' }}>Tugas awal — cocok untuk memulai</div>}
      {s.attempts > 0 && !s.passed && <div className="small muted" style={{ marginTop: '.4rem' }}>{s.attempts}× dicoba · skor terbaik {s.best_score}%</div>}
    </Link>
  );
}
