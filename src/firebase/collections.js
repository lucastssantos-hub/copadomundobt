import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  onSnapshot, writeBatch, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';

// ─── Collection refs ───────────────────────────────────────────────────────
const col = (name) => collection(db, name);
const ref = (name, id) => doc(db, name, id);

// ─── Seeds ─────────────────────────────────────────────────────────────────
export async function seedIfEmpty(mockData) {
  const snap = await getDocs(col('teams'));
  if (!snap.empty) return; // already seeded

  const batch = writeBatch(db);

  // event
  batch.set(ref('meta', 'event'), { ...mockData.event, seededAt: serverTimestamp() });

  // teams
  mockData.teams.forEach(t => batch.set(ref('teams', t.id), t));

  // athletes
  mockData.athletes.forEach(a => batch.set(ref('athletes', a.id), a));

  // captains
  mockData.captains.forEach(c => batch.set(ref('captains', c.id), c));

  // courts
  mockData.courts.forEach(c => batch.set(ref('courts', c.id), c));

  // groups
  mockData.groups.forEach(g => batch.set(ref('groups', g.id), g));

  // matches
  mockData.matches.forEach(m => batch.set(ref('matches', m.id), m));

  // standings
  Object.entries(mockData.standings).forEach(([groupId, rows]) => {
    batch.set(ref('standings', groupId), { rows });
  });

  await batch.commit();
  console.log('[Firebase] Seeded initial data');
}

// ─── Real-time listeners ────────────────────────────────────────────────────
export function listenCollection(name, onChange) {
  return onSnapshot(col(name), snap => {
    const data = {};
    snap.forEach(d => { data[d.id] = { id: d.id, ...d.data() }; });
    onChange(data);
  });
}

export function listenDoc(name, id, onChange) {
  return onSnapshot(ref(name, id), snap => {
    onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

// ─── Teams ─────────────────────────────────────────────────────────────────
export async function addTeamFS(team) {
  await setDoc(ref('teams', team.id), team);
}

// ─── Athletes ──────────────────────────────────────────────────────────────
export async function addAthleteFS(athlete) {
  await setDoc(ref('athletes', athlete.id), athlete);
}

// ─── Courts ────────────────────────────────────────────────────────────────
export async function addCourtFS(court) {
  await setDoc(ref('courts', court.id), court);
}

export async function updateCourtFS(id, updates) {
  await updateDoc(ref('courts', id), updates);
}

// ─── Groups ────────────────────────────────────────────────────────────────
export async function addGroupFS(group, standingsEntry) {
  const batch = writeBatch(db);
  batch.set(ref('groups', group.id), group);
  batch.set(ref('standings', group.id), { rows: standingsEntry });
  await batch.commit();
}

// ─── Matches ───────────────────────────────────────────────────────────────
export async function addMatchFS(match) {
  await setDoc(ref('matches', match.id), match);
}

export async function updateMatchFS(matchId, updater) {
  await runTransaction(db, async (tx) => {
    const matchRef = ref('matches', matchId);
    const snap = await tx.get(matchRef);
    if (!snap.exists()) throw new Error('Match not found');
    const updated = updater({ id: snap.id, ...snap.data() });
    tx.set(matchRef, updated);
  });
}

// ─── Standings ─────────────────────────────────────────────────────────────
export async function updateStandingsFS(groupId, rows) {
  await setDoc(ref('standings', groupId), { rows });
}

// ─── Specific match operations (use transactions for safety) ───────────────

export async function submitLineupFS(matchId, gameId, teamKey, playerIds) {
  await updateMatchFS(matchId, (match) => {
    const lineupKey = teamKey === 1 ? 'lineup1' : 'lineup2';
    const updatedGames = match.games.map(game => {
      if (game.id !== gameId) return game;
      const updated = { ...game, [lineupKey]: playerIds };
      const bothSent = updated.lineup1.length > 0 && updated.lineup2.length > 0;
      return { ...updated, status: bothSent ? 'lineup_sent' : game.status };
    });
    const anyLineupSent = updatedGames.some(g => g.status === 'lineup_sent');
    return {
      ...match,
      games: updatedGames,
      status: anyLineupSent ? 'lineup_sent' : match.status,
    };
  });
}

export async function releaseCourtFS(matchId, gameId) {
  const now = Date.now();
  await updateMatchFS(matchId, (match) => ({
    ...match,
    status: 'warming_up',
    games: match.games.map(g =>
      g.id === gameId ? { ...g, status: 'warming_up', warmupStartedAt: now } : g
    ),
  }));
}

export async function startGameFS(matchId, gameId) {
  await updateMatchFS(matchId, (match) => ({
    ...match,
    status: 'in_progress',
    games: match.games.map(g =>
      g.id === gameId ? { ...g, status: 'in_progress' } : g
    ),
  }));
}

export async function submitResultFS(matchId, gameId, score1, score2) {
  await updateMatchFS(matchId, (match) => ({
    ...match,
    games: match.games.map(g =>
      g.id === gameId
        ? { ...g, pendingScore1: score1, pendingScore2: score2, status: 'waiting_result' }
        : g
    ),
  }));
}

export async function validateResultFS(matchId, gameId, approved, currentStandings) {
  return await runTransaction(db, async (tx) => {
    const matchRef = ref('matches', matchId);
    const snap = await tx.get(matchRef);
    if (!snap.exists()) throw new Error('Match not found');
    const match = { id: snap.id, ...snap.data() };

    const updatedGames = match.games.map(game => {
      if (game.id !== gameId) return game;
      if (!approved) return { ...game, pendingScore1: null, pendingScore2: null, status: 'in_progress' };
      return {
        ...game,
        score1: game.pendingScore1,
        score2: game.pendingScore2,
        pendingScore1: null,
        pendingScore2: null,
        status: 'finished',
        validatedResult: true,
      };
    });

    const allFinished = updatedGames.every(g => g.status === 'finished');
    let updatedMatch = { ...match, games: updatedGames };

    let standingsUpdate = null;
    if (allFinished) {
      const team1Wins = updatedGames.filter(g => g.score1 > g.score2).length;
      const team2Wins = updatedGames.filter(g => g.score2 > g.score1).length;
      updatedMatch = {
        ...updatedMatch,
        status: 'finished',
        result: { team1Score: team1Wins, team2Score: team2Wins },
      };

      if (match.groupId && currentStandings[match.groupId]) {
        const rows = [...currentStandings[match.groupId]];
        const i1 = rows.findIndex(r => r.teamId === match.team1Id);
        const i2 = rows.findIndex(r => r.teamId === match.team2Id);
        if (i1 !== -1 && i2 !== -1) {
          const won1 = team1Wins > team2Wins;
          const won2 = team2Wins > team1Wins;
          rows[i1] = { ...rows[i1], played: rows[i1].played + 1, wins: rows[i1].wins + (won1 ? 1 : 0), losses: rows[i1].losses + (won2 ? 1 : 0), gamesWon: rows[i1].gamesWon + team1Wins, gamesLost: rows[i1].gamesLost + team2Wins, points: rows[i1].points + (won1 ? 3 : won2 ? 0 : 1) };
          rows[i2] = { ...rows[i2], played: rows[i2].played + 1, wins: rows[i2].wins + (won2 ? 1 : 0), losses: rows[i2].losses + (won1 ? 1 : 0), gamesWon: rows[i2].gamesWon + team2Wins, gamesLost: rows[i2].gamesLost + team1Wins, points: rows[i2].points + (won2 ? 3 : won1 ? 0 : 1) };
          standingsUpdate = { groupId: match.groupId, rows };
        }
      }
    }

    tx.set(matchRef, updatedMatch);
    if (standingsUpdate) {
      tx.set(ref('standings', standingsUpdate.groupId), { rows: standingsUpdate.rows });
    }
    return { standingsUpdate };
  });
}

export async function editResultFS(matchId, gameId, score1, score2) {
  await updateMatchFS(matchId, (match) => {
    const updatedGames = match.games.map(g =>
      g.id === gameId ? { ...g, score1, score2, status: 'finished', validatedResult: true } : g
    );
    const t1Wins = updatedGames.filter(g => g.score1 > g.score2).length;
    const t2Wins = updatedGames.filter(g => g.score2 > g.score1).length;
    return {
      ...match,
      games: updatedGames,
      result: { team1Score: t1Wins, team2Score: t2Wins },
      status: updatedGames.every(g => g.status === 'finished') ? 'finished' : match.status,
    };
  });
}

export async function addMixedGameFS(matchId) {
  await updateMatchFS(matchId, (match) => {
    if (match.games.some(g => g.type === 'mixed')) return match;
    return {
      ...match,
      games: [...match.games, {
        id: `${matchId}_mixed`,
        matchId,
        type: 'mixed',
        status: 'waiting_lineup',
        lineup1: [], lineup2: [],
        score1: null, score2: null,
        pendingScore1: null, pendingScore2: null,
        warmupStartedAt: null,
        courtId: match.courtId,
        validatedResult: false,
      }],
    };
  });
}

export async function assignCourtFS(matchId, gameId, courtId) {
  await updateMatchFS(matchId, (match) => ({
    ...match,
    courtId: gameId === match.games[0]?.id ? courtId : match.courtId,
    games: match.games.map(g => g.id === gameId ? { ...g, courtId } : g),
  }));
}

export async function updateEventFS(eventData) {
  await setDoc(ref('meta', 'event'), eventData);
}
