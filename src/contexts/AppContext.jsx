import { createContext, useContext, useState, useCallback } from 'react';
import {
  mockTeams, mockAthletes, mockCaptains, mockCourts,
  mockGroups, mockMatches, mockStandings, mockEvent, MATCH_STATUS,
} from '../data/mockData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [event, setEvent] = useState(mockEvent);
  const [teams, setTeams] = useState(mockTeams);
  const [athletes, setAthletes] = useState(mockAthletes);
  const [captains, setCaptains] = useState(mockCaptains);
  const [courts, setCourts] = useState(mockCourts);
  const [groups, setGroups] = useState(mockGroups);
  const [matches, setMatches] = useState(mockMatches);
  const [standings, setStandings] = useState(mockStandings);
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  }, []);

  const updateGame = useCallback((matchId, gameId, updates) => {
    setMatches(prev => prev.map(match => {
      if (match.id !== matchId) return match;
      const updatedGames = match.games.map(game =>
        game.id === gameId ? { ...game, ...updates } : game
      );
      const allFinished = updatedGames.every(g => g.status === MATCH_STATUS.FINISHED);
      const anyActive = updatedGames.some(g =>
        [MATCH_STATUS.WARMING_UP, MATCH_STATUS.IN_PROGRESS].includes(g.status)
      );
      const anyLineupSent = updatedGames.some(g => g.status === MATCH_STATUS.LINEUP_SENT);
      let matchStatus = match.status;
      if (allFinished) matchStatus = MATCH_STATUS.FINISHED;
      else if (anyActive) matchStatus = updatedGames.find(g => [MATCH_STATUS.WARMING_UP, MATCH_STATUS.IN_PROGRESS].includes(g.status))?.status || match.status;
      else if (anyLineupSent) matchStatus = MATCH_STATUS.LINEUP_SENT;
      return { ...match, games: updatedGames, status: matchStatus };
    }));
  }, []);

  const submitLineup = useCallback((matchId, gameId, teamKey, playerIds) => {
    setMatches(prev => prev.map(match => {
      if (match.id !== matchId) return match;
      const updatedGames = match.games.map(game => {
        if (game.id !== gameId) return game;
        const updated = { ...game, [teamKey === 1 ? 'lineup1' : 'lineup2']: playerIds };
        const bothSent = updated.lineup1.length > 0 && updated.lineup2.length > 0;
        return { ...updated, status: bothSent ? MATCH_STATUS.LINEUP_SENT : game.status };
      });
      return { ...match, games: updatedGames };
    }));
    addNotification('Escalação enviada com sucesso!', 'success');
  }, [addNotification]);

  const releaseCourt = useCallback((matchId, gameId) => {
    const now = Date.now();
    setMatches(prev => prev.map(match => {
      if (match.id !== matchId) return match;
      const updatedGames = match.games.map(game =>
        game.id === gameId
          ? { ...game, status: MATCH_STATUS.WARMING_UP, warmupStartedAt: now }
          : game
      );
      return { ...match, games: updatedGames, status: MATCH_STATUS.WARMING_UP };
    }));
    addNotification('Quadra liberada! Aquecimento iniciado.', 'success');
  }, [addNotification]);

  const startGame = useCallback((matchId, gameId) => {
    setMatches(prev => prev.map(match => {
      if (match.id !== matchId) return match;
      const updatedGames = match.games.map(game =>
        game.id === gameId ? { ...game, status: MATCH_STATUS.IN_PROGRESS } : game
      );
      return { ...match, games: updatedGames, status: MATCH_STATUS.IN_PROGRESS };
    }));
    addNotification('Jogo iniciado!', 'info');
  }, [addNotification]);

  const submitResult = useCallback((matchId, gameId, score1, score2) => {
    setMatches(prev => prev.map(match => {
      if (match.id !== matchId) return match;
      const updatedGames = match.games.map(game =>
        game.id === gameId
          ? { ...game, pendingScore1: score1, pendingScore2: score2, status: MATCH_STATUS.WAITING_RESULT }
          : game
      );
      return { ...match, games: updatedGames };
    }));
    addNotification('Resultado enviado para validação!', 'info');
  }, [addNotification]);

  const validateResult = useCallback((matchId, gameId, approved) => {
    setMatches(prev => prev.map(match => {
      if (match.id !== matchId) return match;
      const updatedGames = match.games.map(game => {
        if (game.id !== gameId) return game;
        if (!approved) {
          return { ...game, pendingScore1: null, pendingScore2: null, status: MATCH_STATUS.IN_PROGRESS };
        }
        return {
          ...game,
          score1: game.pendingScore1,
          score2: game.pendingScore2,
          pendingScore1: null,
          pendingScore2: null,
          status: MATCH_STATUS.FINISHED,
          validatedResult: true,
        };
      });
      const allFinished = updatedGames.every(g => g.status === MATCH_STATUS.FINISHED);
      if (allFinished) {
        const team1GameWins = updatedGames.filter(g => g.score1 > g.score2).length;
        const team2GameWins = updatedGames.filter(g => g.score2 > g.score1).length;
        const updatedMatch = {
          ...match,
          games: updatedGames,
          status: MATCH_STATUS.FINISHED,
          result: { team1Score: team1GameWins, team2Score: team2GameWins },
        };
        updateStandings(updatedMatch);
        return updatedMatch;
      }
      return { ...match, games: updatedGames };
    }));
    addNotification(approved ? 'Resultado validado!' : 'Resultado rejeitado.', approved ? 'success' : 'error');
  }, [addNotification]);

  const updateStandings = useCallback((match) => {
    const group = groups.find(g => g.id === match.groupId);
    if (!group) return;
    setStandings(prev => {
      const groupStandings = [...(prev[match.groupId] || [])];
      const team1Idx = groupStandings.findIndex(s => s.teamId === match.team1Id);
      const team2Idx = groupStandings.findIndex(s => s.teamId === match.team2Id);
      if (team1Idx === -1 || team2Idx === -1) return prev;
      const { team1Score, team2Score } = match.result;
      const won1 = team1Score > team2Score;
      const won2 = team2Score > team1Score;
      groupStandings[team1Idx] = {
        ...groupStandings[team1Idx],
        played: groupStandings[team1Idx].played + 1,
        wins: groupStandings[team1Idx].wins + (won1 ? 1 : 0),
        losses: groupStandings[team1Idx].losses + (won2 ? 1 : 0),
        gamesWon: groupStandings[team1Idx].gamesWon + team1Score,
        gamesLost: groupStandings[team1Idx].gamesLost + team2Score,
        points: groupStandings[team1Idx].points + (won1 ? 3 : won2 ? 0 : 1),
      };
      groupStandings[team2Idx] = {
        ...groupStandings[team2Idx],
        played: groupStandings[team2Idx].played + 1,
        wins: groupStandings[team2Idx].wins + (won2 ? 1 : 0),
        losses: groupStandings[team2Idx].losses + (won1 ? 1 : 0),
        gamesWon: groupStandings[team2Idx].gamesWon + team2Score,
        gamesLost: groupStandings[team2Idx].gamesLost + team1Score,
        points: groupStandings[team2Idx].points + (won2 ? 3 : won1 ? 0 : 1),
      };
      return { ...prev, [match.groupId]: groupStandings.sort((a, b) => b.points - a.points || b.wins - a.wins) };
    });
  }, [groups]);

  const addTeam = useCallback((team) => {
    const id = `t${Date.now()}`;
    setTeams(prev => [...prev, { ...team, id }]);
    addNotification('Equipe cadastrada!', 'success');
    return id;
  }, [addNotification]);

  const addAthlete = useCallback((athlete) => {
    const id = `a${Date.now()}`;
    setAthletes(prev => [...prev, { ...athlete, id }]);
    addNotification('Atleta cadastrado!', 'success');
  }, [addNotification]);

  const addGroup = useCallback((group) => {
    const id = `grp${Date.now()}`;
    setGroups(prev => [...prev, { ...group, id }]);
    const standingsEntry = group.teamIds.map(teamId => ({
      teamId, played: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, points: 0,
    }));
    setStandings(prev => ({ ...prev, [id]: standingsEntry }));
    addNotification('Grupo criado!', 'success');
  }, [addNotification]);

  const addMatch = useCallback((match) => {
    const id = `m${Date.now()}`;
    const newMatch = {
      ...match,
      id,
      games: [
        { id: `${id}_male`, matchId: id, type: 'male', status: MATCH_STATUS.WAITING_LINEUP, lineup1: [], lineup2: [], score1: null, score2: null, pendingScore1: null, pendingScore2: null, warmupStartedAt: null, courtId: match.courtId, validatedResult: false },
        { id: `${id}_female`, matchId: id, type: 'female', status: MATCH_STATUS.WAITING_LINEUP, lineup1: [], lineup2: [], score1: null, score2: null, pendingScore1: null, pendingScore2: null, warmupStartedAt: null, courtId: match.courtId, validatedResult: false },
      ],
      result: null,
      status: MATCH_STATUS.WAITING_LINEUP,
    };
    setMatches(prev => [...prev, newMatch]);
    addNotification('Confronto criado!', 'success');
  }, [addNotification]);

  const assignCourt = useCallback((matchId, gameId, courtId) => {
    setMatches(prev => prev.map(match => {
      if (match.id !== matchId) return match;
      const updatedGames = match.games.map(game =>
        game.id === gameId ? { ...game, courtId } : game
      );
      return { ...match, games: updatedGames, courtId: courtId };
    }));
    addNotification('Quadra definida!', 'success');
  }, [addNotification]);

  const editResult = useCallback((matchId, gameId, score1, score2) => {
    setMatches(prev => prev.map(match => {
      if (match.id !== matchId) return match;
      const updatedGames = match.games.map(game =>
        game.id === gameId ? { ...game, score1, score2, status: MATCH_STATUS.FINISHED, validatedResult: true } : game
      );
      const team1GameWins = updatedGames.filter(g => g.score1 > g.score2).length;
      const team2GameWins = updatedGames.filter(g => g.score2 > g.score1).length;
      return {
        ...match,
        games: updatedGames,
        result: { team1Score: team1GameWins, team2Score: team2GameWins },
        status: updatedGames.every(g => g.status === MATCH_STATUS.FINISHED) ? MATCH_STATUS.FINISHED : match.status,
      };
    }));
    addNotification('Resultado corrigido!', 'success');
  }, [addNotification]);

  const addMixedGame = useCallback((matchId) => {
    setMatches(prev => prev.map(match => {
      if (match.id !== matchId) return match;
      const alreadyHasMixed = match.games.some(g => g.type === 'mixed');
      if (alreadyHasMixed) return match;
      const newGame = {
        id: `${matchId}_mixed`,
        matchId,
        type: 'mixed',
        status: MATCH_STATUS.WAITING_LINEUP,
        lineup1: [],
        lineup2: [],
        score1: null,
        score2: null,
        pendingScore1: null,
        pendingScore2: null,
        warmupStartedAt: null,
        courtId: match.courtId,
        validatedResult: false,
      };
      return { ...match, games: [...match.games, newGame] };
    }));
  }, []);

  const getTeamById = useCallback((id) => teams.find(t => t.id === id), [teams]);
  const getAthletesByTeam = useCallback((teamId) => athletes.filter(a => a.teamId === teamId), [athletes]);
  const getGroupById = useCallback((id) => groups.find(g => g.id === id), [groups]);
  const getMatchesByGroup = useCallback((groupId) => matches.filter(m => m.groupId === groupId), [matches]);
  const getCourtById = useCallback((id) => courts.find(c => c.id === id), [courts]);
  const getCaptainByUsername = useCallback((username) => captains.find(c => c.username === username), [captains]);

  return (
    <AppContext.Provider value={{
      event, setEvent,
      teams, setTeams, addTeam,
      athletes, setAthletes, addAthlete,
      captains, setCaptains,
      courts, setCourts,
      groups, setGroups, addGroup,
      matches, setMatches, addMatch,
      standings, setStandings,
      notifications,
      addNotification,
      updateGame,
      submitLineup,
      releaseCourt,
      startGame,
      submitResult,
      validateResult,
      assignCourt,
      editResult,
      addMixedGame,
      getTeamById,
      getAthletesByTeam,
      getGroupById,
      getMatchesByGroup,
      getCourtById,
      getCaptainByUsername,
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
