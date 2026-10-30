import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { get, post } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    get('/auth/me')
      .then((currentUser) => { if (active) setUser(currentUser); })
      .catch((err) => {
        if (!active) return;
        if (err.status !== 401) setError('Could not check your session. Please try again.');
        setUser(null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    setError('');
    await post('/auth/login', { email, password });
    const currentUser = await get('/auth/me');
    setUser(currentUser);
    return currentUser;
  }, []);

  const logout = useCallback(async () => {
    setError('');
    try {
      await post('/auth/logout', {});
      setUser(null);
    } catch (err) {
      setError(err.message || 'Could not sign out. Please try again.');
    }
  }, []);

  const value = useMemo(() => ({ user, loading, error, login, logout }), [user, loading, error, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
