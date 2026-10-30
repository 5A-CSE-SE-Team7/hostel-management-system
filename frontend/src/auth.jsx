import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api';
const AuthContext = createContext(null);
// M1 owns authentication; generation checks only protect client state from
// stale responses after logout, a newer login, or component disposal.
export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true, error: '' });
  const generation = useRef(0);
  const active = useRef(true);
  async function refresh() {
    const current = ++generation.current;
    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      const data = await api('/api/auth/me');
      const user = data?.user ?? data;
      if (!user || !['student', 'warden', 'maintenance', 'admin'].includes(user.role)) throw new Error('The session response is invalid.');
      if (!active.current || current !== generation.current) return null;
      setState({ user, loading: false, error: '' });
      return user;
    } catch (e) {
      if (active.current && current === generation.current) setState({ user: null, loading: false, error: e.status === 401 ? '' : e.status === 404 ? 'Authentication service is not available yet.' : e.message });
      return null;
    }
  }
  useEffect(() => { active.current = true; refresh(); return () => { active.current = false; generation.current += 1; }; }, []);
  async function login(email, password) {
    const current = ++generation.current;
    await api('/api/auth/login', { method: 'POST', body: { email, password } });
    if (!active.current || current !== generation.current) return null;
    const user = await refresh();
    if (!user) throw new Error('Could not load the authenticated session. Please retry.');
    return user;
  }
  async function logout() {
    generation.current += 1;
    try {
      await api('/api/auth/logout', { method: 'POST' });
      if (active.current) setState({ user: null, loading: false, error: '' });
    } catch (e) {
      if (active.current) setState(s => ({ ...s, loading: false }));
      throw e;
    }
  }
  return <AuthContext.Provider value={{ ...state, refresh, login, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth requires AuthProvider');
  return value;
}
