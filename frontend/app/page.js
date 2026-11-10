'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, setToken } from '../lib/api';

export default function Home() {
  const router = useRouter();
  const [cfg, setCfg] = useState(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const consentRef = useRef(false);
  consentRef.current = consent;

  const finish = (r) => { setToken(r.token); router.push('/dashboard'); };
  const fail = (e) => setError(e.code === 'consent_required' ? 'Centang persetujuan data pribadi terlebih dahulu untuk mendaftar.' : e.message);

  useEffect(() => {
    if (getToken()) { router.replace('/dashboard'); return; }
    api('/config').then(setCfg).catch(() => setError('Backend belum dapat dihubungi.'));
  }, [router]);

  // Google Identity Services (hanya bila AUTH_MODE=google)
  useEffect(() => {
    if (!cfg || cfg.authMode !== 'google' || !cfg.googleClientId) return;
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
    s.onload = () => {
      window.google.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: (resp) => api('/auth/google', { method: 'POST', body: { credential: resp.credential, consent: consentRef.current } }).then(finish).catch(fail),
      });
      window.google.accounts.id.renderButton(document.getElementById('gbtn'), { theme: 'outline', size: 'large', text: 'continue_with', width: 300 });
    };
    document.body.appendChild(s);
    return () => { s.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg]);

  const devLogin = (e) => {
    e.preventDefault(); setError('');
    api('/auth/dev', { method: 'POST', body: { name, email, consent } }).then(finish).catch(fail);
  };

  return (
    <main className="hero">
      <h1>Coba dulu pekerjaan impianmu. <br />Tanpa penalti.</h1>
      <p>KerjaLab adalah simulasi kerja di bidang teknologi, sains, bisnis, dan soft skill. Selesaikan misi, kumpulkan koin &amp; XP, dan bangun profil skill-mu.</p>

      <div className="card login">
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>Saya menyetujui pemrosesan data pribadi (nama, email, riwayat simulasi) sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi. Data hanya dibagikan ke perusahaan bila saya memberi izin, dan dapat saya hapus kapan saja.</span>
        </label>

        {cfg && cfg.authMode === 'google' && <div id="gbtn" style={{ display: 'flex', justifyContent: 'center' }} />}

        {cfg && cfg.authMode === 'dev' && (
          <form onSubmit={devLogin} className="gap">
            <div className="small muted">Mode pengembangan lokal (tanpa Google). Gunakan data dummy.</div>
            <input type="text" placeholder="Nama" value={name} onChange={(e) => setName(e.target.value)} required />
            <input type="email" placeholder="email@contoh.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button className="btn" type="submit">Masuk / Daftar</button>
          </form>
        )}
        {error && <div className="err">{error}</div>}
      </div>
    </main>
  );
}
