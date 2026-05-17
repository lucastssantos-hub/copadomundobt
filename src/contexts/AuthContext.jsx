import { createContext, useContext, useState } from 'react';
import { useApp } from './AppContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const { getCaptainByUsername, getTeamById } = useApp();

  const loginAdmin = (password) => {
    if (password === 'admin2026') {
      setUser({ role: 'admin', name: 'Administrador', id: 'admin' });
      return true;
    }
    return false;
  };

  const loginCaptain = (username, password) => {
    const captain = getCaptainByUsername(username);
    if (captain && captain.password === password) {
      const team = getTeamById(captain.teamId);
      setUser({ role: 'captain', name: captain.name, id: captain.id, captainId: captain.id, teamId: captain.teamId, team });
      return true;
    }
    return false;
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
