export const getToken = () => { try { return localStorage.getItem('kl_token'); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem('kl_token', t) : localStorage.removeItem('kl_token'); } catch {} };

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && t) { setToken(null); if (typeof window !== 'undefined') window.location.href = '/'; }
    const err = new Error((data && data.message) || `Error ${res.status}`);
    err.status = res.status; err.code = data && data.error;
    throw err;
  }
  return data;
}

export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export const fmtDuration = (s) => (s >= 3600 ? `${Math.floor(s / 3600)} j ${Math.floor((s % 3600) / 60)} m` : s >= 60 ? `${Math.floor(s / 60)} m ${s % 60} d` : `${s} d`);
export const DIFF = { 1: 'Mudah', 2: 'Menengah', 3: 'Sulit' };
