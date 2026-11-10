'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { setToken } from '../lib/api';

export default function Nav({ me }) {
  const router = useRouter();
  const logout = () => { setToken(null); router.push('/'); };
  return (
    <header className="nav">
      <Link href="/dashboard" className="brand">Kerja<span>Lab</span></Link>
      <nav>
        <Link href="/dashboard">Simulasi</Link>
        <Link href="/profile">Profil</Link>
      </nav>
      <div className="nav-right">
        {me && <span className="pill" title="Streak harian">🔥 {me.streak}</span>}
        {me && <span className="pill" title="Koin">🪙 {me.coins}</span>}
        <button className="btn ghost" onClick={logout}>Keluar</button>
      </div>
    </header>
  );
}
