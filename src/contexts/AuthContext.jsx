import { createContext, useContext, useState } from 'react';
import { useApp } from './AppContext';

const AuthContext = createContext(null);

// Generates the captain code from team name + category, e.g. "BRA-A-2026"
export function generateCaptainCode(teamName, category, year = '2026') {
  const prefix = teamName
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return `${prefix}-${category}-${year}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const { captains, teams, getCaptainByUsername, getTeamById } = useApp();

  const loginAdmin = (password) => {
    if (password === 'admin2026') {
      setUser({ role: 'admin', name: 'Administrador', id: 'admin' });
      return true;
    }
    return false;
  };

  const loginCaptain = (usernameOrCode, password) => {
    // Try username/password login
    const byUsername = getCaptainByUsername(usernameOrCode);
    if (byUsername && byUsername.password === password) {
      const team = getTeamById(byUsername.teamId);
      setUser({ role: 'captain', name: byUsername.name, id: byUsername.id, captainId: byUsername.id, teamId: byUsername.teamId, team });
      return true;
    }

    // Try code-only login (no password required)
    const code = usernameOrCode.toUpperCase().trim();
    for (const captain of captains) {
      const team = teams.find(t => t.id === captain.teamId);
      if (!team) continue;
      const expectedCode = generateCaptainCode(team.name, team.category);
      if (code === expectedCode || code === captain.code) {
        setUser({ role: 'captain', name: captain.name, id: captain.id, captainId: captain.id, teamId: captain.teamId, team });
        return true;
      }
    }

    return false;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, loginAdmin, loginCaptain, logout, generateCaptainCode }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
