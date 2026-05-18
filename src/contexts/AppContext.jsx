import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  mockTeams, mockAthletes, mockCaptains, mockCourts,
  mockGroups, mockMatches, mockStandings, mockEvent, MATCH_STATUS, CATEGORIES,
} from '../data/mockData';
import { isFirebaseConfigured, db } from '../firebase/config';
import {
  seedIfEmpty, listenCollection, listenDoc,
  addTeamFS, addAthleteFS, addCourtFS, updateCourtFS,
  addGroupFS, addMatchFS,
  submitLineupFS, releaseCourtFS, startGameFS,
  submitResultFS, validateResultFS, editResultFS,
  addMixedGameFS, assignCourtFS, updateEventFS,
} from '../firebase/collections';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [firebaseReady, setFirebaseReady] = useState(!isFirebaseConfigured);

  // ── State (initialized with mock data; overwritten by Firebase if configured) ─
  const [event, setEvent] = useState(mockEvent);
  const [teams, setTeams] = useState(mockTeams);
  const [athletes, setAthletes] = useState(mockAthletes);
  const [captains, setCaptains] = useState(mockCaptains);
  const [courts, setCourts] = useState(mockCourts);
  const [groups, setGroups] = useState(mockGroups);
  const [matches, setMatches] = useState(mockMatches);
  const [standings, setStandings] = useState(mockStandings);
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const standingsRef = useRef(standings);
  useEffect(() => { standingsRef.current = standings; }, [standings]);

  // ── Firebase listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const mock = {
      event: mockEvent, teams: mockTeams, athletes: mockAthletes,
      captains: mockCaptains, courts: mockCourts, groups: mockGroups,
      matches: mockMatches, standings: mockStandings,
    };

    seedIfEmpty(mock).then(() => {
      // Listen to all collections
      const unsubs = [
        listenCollection('teams', (data) => setTeams(Object.values(data))),
        listenCollection('athletes', (data) => setAthletes(Object.values(data))),
        listenCollection('captains', (data) => setCaptains(Object.values(data))),
        listenCollection('courts', (data) => setCourts(Object.values(data))),
        listenCollection('groups', (data) => setGroups(Object.values(data))),
        listenCollection('matches', (data) => setMatches(Object.values(data))),
        listenCollection('standings', (data) => {
          const mapped = {};
          Object.entries(data).forEach(([gid, doc]) => { mapped[gid] = doc.rows || []; });
          setStandings(mapped);
        }),
        listenDoc('meta', 'event', (data) => { if (data) setEvent(data); }),
      ];
      setFirebaseReady(true);
      return () => unsubs.forEach(u => u());
    }).catch(console.error);
  }, []);

  // ── Toast notifications ────────────────────────────────────────────────────
  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  }, []);

  // ── Persistent alerts ─────────────────────────────────────────────────────
  const addAlert = useCallback((message, type = 'info', forRole = 'admin', meta = {}) => {
    const id = `${Date.now()}-${Math.random()}`;
    setAlerts(prev => [{ id, message, type, forRole, read: false, timestamp: Date.now(), ...meta }, ...prev.slice(0, 99)]);
  }, []);

  const markAlertRead = useCallback((id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  }, []);

  const markAllAlertsRead = useCallback((forRole) => {
    setAlerts(prev => prev.map(a => a.forRole === forRole ? { ...a, read: true } : a));
  }, []);

  const dismissAlert = useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  // ── Local-only state updaters (used when Firebase is off) ──────────────────
  const updateMatchLocal = useCallback((matchId, updater) => {
    setMatches(prev => prev.map(m => m.id === matchId ? updater(m) : m));
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  const addTeam = useCallback(async (team) => {
    const id = `t${Date.now()}`;
    const newTeam = { ...team, id };
    if (isFirebaseConfigured) {
      await addTeamFS(newTeam);
    } else {
      setTeams(prev => [...prev, newTeam]);
    }
    addNotification('Equipe cadastrada!', 'success');
    return id;
  }, [addNotification]);

  const addAthlete = useCallback(async (athlete) => {
    const id = `a${Date.now()}`;
    const newAthlete = { ...athlete, id };
    if (isFirebaseConfigured) {
      await addAthleteFS(newAthlete);
    } else {
      setAthletes(prev => [...prev, newAthlete]);
    }
    addNotification('Atleta cadastrado!', 'success');
  }, [addNotification]);

  const addGroup = useCallback(async (group) => {
    const id = `grp${Date.now()}`;
    const newGroup = { ...group, id };
    const standingsEntry = group.teamIds.map(teamId => ({
      teamId, played: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0,
    }));
    if (isFirebaseConfigured) {
      await addGroupFS(newGroup, standingsEntry);
    } else {
      setGroups(prev => [...prev, newGroup]);
      setStandings(prev => ({ ...prev, [id]: standingsEntry }));
    }
    addNotification('Grupo criado!', 'success');
  }, [addNotification]);

  const addMatch = useCallback(async (match) => {
    const id = `m${Date.now()}`;
    const newMatch = {
      ...match, id,
      games: [
        { id: `${id}_male`, matchId: id, type: 'male', status: MATCH_STATUS.WAITING_LINEUP, lineup1: [], lineup2: [], score1: null, score2: null, pendingScore1: null, pendingScore2: null, warmupStartedAt: null, courtId: match.courtId || null, validatedResult: false },
        { id: `${id}_female`, matchId: id, type: 'female', status: MATCH_STATUS.WAITING_LINEUP, lineup1: [], lineup2: [], score1: null, score2: null, pendingScore1: null, pendingScore2: null, warmupStartedAt: null, courtId: match.courtId || null, validatedResult: false },
      ],
      result: null,
      status: MATCH_STATUS.WAITING_LINEUP,
    };
    if (isFirebaseConfigured) {
      await addMatchFS(newMatch);
    } else {
      setMatches(prev => [...prev, newMatch]);
    }
    addNotification('Confronto criado!', 'success');
  }, [addNotification]);

  const submitLineup = useCallback(async (matchId, gameId, teamKey, playerIds) => {
    if (isFirebaseConfigured) {
      await submitLineupFS(matchId, gameId, teamKey, playerIds);
    } else {
      setMatches(prev => prev.map(match => {
        if (match.id !== matchId) return match;
        const updatedGames = match.games.map(game => {
          if (game.id !== gameId) return game;
          const updated = { ...game, [teamKey === 1 ? 'lineup1' : 'lineup2']: playerIds };
          const bothSent = updated.lineup1.length > 0 && updated.lineup2.length > 0;
          return { ...updated, status: bothSent ? MATCH_STATUS.LINEUP_SENT : game.status };
        });
        const anyLineupSent = updatedGames.some(g => g.status === MATCH_STATUS.LINEUP_SENT);
        return { ...match, games: updatedGames, status: anyLineupSent ? MATCH_STATUS.LINEUP_SENT : match.status };
      }));
    }
    addNotification('Escalação enviada!', 'success');
  }, [addNotification]);

  const releaseCourt = useCallback(async (matchId, gameId) => {
    if (isFirebaseConfigured) {
      await releaseCourtFS(matchId, gameId);
    } else {
      const now = Date.now();
      setMatches(prev => prev.map(match => {
        if (match.id !== matchId) return match;
        return { ...match, status: MATCH_STATUS.WARMING_UP, games: match.games.map(g => g.id === gameId ? { ...g, status: MATCH_STATUS.WARMING_UP, warmupStartedAt: now } : g) };
      }));
    }
    addNotification('Quadra liberada! Aquecimento iniciado.', 'success');
  }, [addNotification]);

  const startGame = useCallback(async (matchId, gameId) => {
    if (isFirebaseConfigured) {
      await startGameFS(matchId, gameId);
    } else {
      setMatches(prev => prev.map(match => match.id !== matchId ? match : { ...match, status: MATCH_STATUS.IN_PROGRESS, games: match.games.map(g => g.id === gameId ? { ...g, status: MATCH_STATUS.IN_PROGRESS } : g) }));
    }
    addNotification('Jogo iniciado!', 'info');
  }, [addNotification]);

  const submitResult = useCallback(async (matchId, gameId, score1, score2) => {
    if (isFirebaseConfigured) {
      await submitResultFS(matchId, gameId, score1, score2);
    } else {
      setMatches(prev => prev.map(match => match.id !== matchId ? match : { ...match, games: match.games.map(g => g.id === gameId ? { ...g, pendingScore1: score1, pendingScore2: score2, status: MATCH_STATUS.WAITING_RESULT } : g) }));
    }
    addNotification('Resultado enviado para validação!', 'info');
  }, [addNotification]);

  const validateResult = useCallback(async (matchId, gameId, approved) => {
    if (isFirebaseConfigured) {
      await validateResultFS(matchId, gameId, approved, standingsRef.current);
    } else {
      setMatches(prev => prev.map(match => {
        if (match.id !== matchId) return match;
        const updatedGames = match.games.map(game => {
          if (game.id !== gameId) return game;
          if (!approved) return { ...game, pendingScore1: null, pendingScore2: null, status: MATCH_STATUS.IN_PROGRESS };
          return { ...game, score1: game.pendingScore1, score2: game.pendingScore2, pendingScore1: null, pendingScore2: null, status: MATCH_STATUS.FINISHED, validatedResult: true };
        });
        const allFinished = updatedGames.every(g => g.status === MATCH_STATUS.FINISHED);
        if (allFinished) {
          const t1Wins = updatedGames.filter(g => g.score1 > g.score2).length;
          const t2Wins = updatedGames.filter(g => g.score2 > g.score1).length;
          const updatedMatch = { ...match, games: updatedGames, status: MATCH_STATUS.FINISHED, result: { team1Score: t1Wins, team2Score: t2Wins } };
          // update standings locally
          setStandings(prev => {
            if (!match.groupId || !prev[match.groupId]) return prev;
            const rows = [...prev[match.groupId]];
            const i1 = rows.findIndex(r => r.teamId === match.team1Id);
            const i2 = rows.findIndex(r => r.teamId === match.team2Id);
            if (i1 === -1 || i2 === -1) return prev;
            const won1 = t1Wins > t2Wins; const won2 = t2Wins > t1Wins;
            rows[i1] = { ...rows[i1], played: rows[i1].played + 1, wins: rows[i1].wins + (won1 ? 1 : 0), losses: rows[i1].losses + (won2 ? 1 : 0), gamesWon: rows[i1].gamesWon + t1Wins, gamesLost: rows[i1].gamesLost + t2Wins, points: rows[i1].points + (won1 ? 3 : won2 ? 0 : 1) };
            rows[i2] = { ...rows[i2], played: rows[i2].played + 1, wins: rows[i2].wins + (won2 ? 1 : 0), losses: rows[i2].losses + (won1 ? 1 : 0), gamesWon: rows[i2].gamesWon + t2Wins, gamesLost: rows[i2].gamesLost + t1Wins, points: rows[i2].points + (won2 ? 3 : won1 ? 0 : 1) };
            return { ...prev, [match.groupId]: rows.sort((a, b) => b.points - a.points || b.wins - a.wins) };
          });
          return updatedMatch;
        }
        return { ...match, games: updatedGames };
      }));
    }
    addNotification(approved ? 'Resultado validado!' : 'Resultado rejeitado.', approved ? 'success' : 'error');
  }, [addNotification]);

  const assignCourt = useCallback(async (matchId, gameId, courtId) => {
    if (isFirebaseConfigured) {
      await assignCourtFS(matchId, gameId, courtId);
    } else {
      setMatches(prev => prev.map(match => {
        if (match.id !== matchId) return match;
        return { ...match, courtId, games: match.games.map(g => g.id === gameId ? { ...g, courtId } : g) };
      }));
    }
    addNotification('Quadra definida!', 'success');
  }, [addNotification]);

  const editResult = useCallback(async (matchId, gameId, score1, score2) => {
    if (isFirebaseConfigured) {
      await editResultFS(matchId, gameId, score1, score2);
    } else {
      setMatches(prev => prev.map(match => {
        if (match.id !== matchId) return match;
        const updatedGames = match.games.map(g => g.id === gameId ? { ...g, score1, score2, status: MATCH_STATUS.FINISHED, validatedResult: true } : g);
        const t1 = updatedGames.filter(g => g.score1 > g.score2).length;
        const t2 = updatedGames.filter(g => g.score2 > g.score1).length;
        return { ...match, games: updatedGames, result: { team1Score: t1, team2Score: t2 }, status: updatedGames.every(g => g.status === MATCH_STATUS.FINISHED) ? MATCH_STATUS.FINISHED : match.status };
      }));
    }
    addNotification('Resultado corrigido!', 'success');
  }, [addNotification]);

  const addMixedGame = useCallback(async (matchId) => {
    if (isFirebaseConfigured) {
      await addMixedGameFS(matchId);
    } else {
      setMatches(prev => prev.map(match => {
        if (match.id !== matchId || match.games.some(g => g.type === 'mixed')) return match;
        return { ...match, games: [...match.games, { id: `${matchId}_mixed`, matchId, type: 'mixed', status: MATCH_STATUS.WAITING_LINEUP, lineup1: [], lineup2: [], score1: null, score2: null, pendingScore1: null, pendingScore2: null, warmupStartedAt: null, courtId: match.courtId, validatedResult: false }] };
      }));
    }
  }, []);

  const updateCourtActive = useCallback(async (courtId, active) => {
    if (isFirebaseConfigured) {
      await updateCourtFS(courtId, { active });
    } else {
      setCourts(prev => prev.map(c => c.id === courtId ? { ...c, active } : c));
    }
  }, []);

  const addCourtToList = useCallback(async (court) => {
    if (isFirebaseConfigured) {
      await addCourtFS(court);
    } else {
      setCourts(prev => [...prev, court]);
    }
    addNotification('Quadra adicionada!', 'success');
  }, [addNotification]);

  const toggleCategoryActive = useCallback(async (category) => {
    const current = event.activeCategories ?? CATEGORIES;
    const next = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    const updatedEvent = { ...event, activeCategories: next };
    setEvent(updatedEvent);
    if (isFirebaseConfigured) {
      await updateEventFS(updatedEvent).catch(console.error);
    }
  }, [event]);

  // ── Selectors ──────────────────────────────────────────────────────────────
  const getTeamById = useCallback((id) => teams.find(t => t.id === id), [teams]);
  const getAthletesByTeam = useCallback((teamId) => athletes.filter(a => a.teamId === teamId), [athletes]);
  const getGroupById = useCallback((id) => groups.find(g => g.id === id), [groups]);
  const getMatchesByGroup = useCallback((groupId) => matches.filter(m => m.groupId === groupId), [matches]);
  const getCourtById = useCallback((id) => courts.find(c => c.id === id), [courts]);
  const getCaptainByUsername = useCallback((username) => captains.find(c => c.username === username), [captains]);

  return (
    <AppContext.Provider value={{
      firebaseReady, isFirebaseConfigured,
      event, setEvent, toggleCategoryActive,
      teams, setTeams, addTeam,
      athletes, setAthletes, addAthlete,
      captains, setCaptains,
      courts, setCourts, addCourtToList, updateCourtActive,
      groups, setGroups, addGroup,
      matches, setMatches, addMatch,
      standings, setStandings,
      notifications, addNotification,
      alerts, addAlert, markAlertRead, markAllAlertsRead, dismissAlert,
      submitLineup, releaseCourt, startGame,
      submitResult, validateResult, assignCourt, editResult, addMixedGame,
      getTeamById, getAthletesByTeam, getGroupById,
      getMatchesByGroup, getCourtById, getCaptainByUsername,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
