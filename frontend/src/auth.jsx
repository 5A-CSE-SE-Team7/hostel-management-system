import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';
const AuthContext = createContext(null);
// Integration contract only: M1 owns these endpoints and all server authorization.
export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true, error: '' });
  async function refresh() {
    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      const data = await api('/api/auth/me');
      const user = data.user;
      if (!user || !['student', 'warden', 'maintenance', 'admin'].includes(user.role)) throw new Error('The session response is invalid.');
      setState({ user, loading: false, error: '' });
    } catch (e) {
      setState({ user: null, loading: false, error: e.status === 401 ? '' : e.status === 404 ? 'Authentication service is not available yet.' : e.message });
    }
  }
  useEffect(() => { refresh(); }, []);
  async function login(email, password) {
    await api('/api/auth/login', { method: 'POST', body: { email, password } });
    await refresh();
  }
  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    setState({ user: null, loading: false, error: '' });
  }
  return <AuthContext.Provider value={{ ...state, refresh, login, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth requires AuthProvider');
  return value;
}
