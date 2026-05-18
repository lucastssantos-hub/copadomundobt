import { createContext, useContext, useState } from 'react';
import { useApp } from './AppContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const { state } = useApp();

  const loginAdmin = (password) => {
    if (password === 'admin2026') {
      setUser({ role: 'admin' });
      return true;
    }
    return false;
  };

  const loginCaptain = (code) => {
    const codigoUpper = code.trim().toUpperCase();
    const cap = (state.caps || []).find(c => c.codigo === codigoUpper);
    if (!cap) return false;
    const eq = (state.eqs || []).find(e => e.id === cap.eqId);
    if (!eq) return false;
    setUser({ role: 'captain', cap, eq });
    return true;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, loginAdmin, loginCaptain, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
