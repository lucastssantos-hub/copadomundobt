import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { INITIAL_STATE, calcResultStatus } from '../data/mockData';
import { isFirebaseConfigured, listenState, saveState, txUpdateJogo, seedIfEmpty } from '../firebase/collections';

const AppContext = createContext(null);

function checkBothEscalated(jogo) {
  const esc = jogo.esc;
  if (!esc) return false;
  return !!(
    (esc.fd1a || esc.fd1b) && (esc.fd2a || esc.fd2b) &&
    (esc.md1a || esc.md1b) && (esc.md2a || esc.md2b)
  );
}

export function AppProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    seedIfEmpty();
    const unsub = listenState(data => setState(data));
    return unsub;
  }, []);

  const saveFullState = useCallback(async (newState) => {
    setState(newState);
    if (isFirebaseConfigured) await saveState(newState);
  }, []);

  // ── Equipes ───────────────────────────────────────────────────────────────
  const addEq = useCallback(async (eq) => {
    const newState = { ...state, eqs: [...state.eqs, eq] };
    await saveFullState(newState);
  }, [state, saveFullState]);

  const updateEq = useCallback(async (eqId, updates) => {
    const newState = {
      ...state,
      eqs: state.eqs.map(e => e.id === eqId ? { ...e, ...updates } : e),
    };
    await saveFullState(newState);
  }, [state, saveFullState]);

  const removeEq = useCallback(async (eqId) => {
    const newState = {
      ...state,
      eqs: state.eqs.filter(e => e.id !== eqId),
      atls: state.atls.filter(a => a.eqId !== eqId),
      caps: state.caps.filter(c => c.eqId !== eqId),
      jogos: state.jogos.filter(j => j.e1 !== eqId && j.e2 !== eqId),
    };
    await saveFullState(newState);
  }, [state, saveFullState]);

  // ── Atletas ───────────────────────────────────────────────────────────────
  const addAtl = useCallback(async (atl) => {
    const newState = { ...state, atls: [...state.atls, atl] };
    await saveFullState(newState);
  }, [state, saveFullState]);

  const removeAtl = useCallback(async (atlId) => {
    const newState = { ...state, atls: state.atls.filter(a => a.id !== atlId) };
    await saveFullState(newState);
  }, [state, saveFullState]);

  // ── Capitães ──────────────────────────────────────────────────────────────
  const addCap = useCallback(async (cap) => {
    const newState = {
      ...state,
      caps: [...state.caps.filter(c => c.eqId !== cap.eqId), cap],
    };
    await saveFullState(newState);
  }, [state, saveFullState]);

  // ── Jogos ─────────────────────────────────────────────────────────────────
  const addJogo = useCallback(async (jogo) => {
    const newState = { ...state, jogos: [...state.jogos, jogo] };
    await saveFullState(newState);
  }, [state, saveFullState]);

  const addJogos = useCallback(async (novosJogos) => {
    const newState = { ...state, jogos: [...state.jogos, ...novosJogos] };
    await saveFullState(newState);
  }, [state, saveFullState]);

  const removeJogo = useCallback(async (jogoId) => {
    const newState = { ...state, jogos: state.jogos.filter(j => j.id !== jogoId) };
    await saveFullState(newState);
  }, [state, saveFullState]);

  // ── Quadra ────────────────────────────────────────────────────────────────
  const assignQuadra = useCallback(async (jogoId, quadra) => {
    const patch = (jogo) => {
      jogo.quadra = quadra;
      if (quadra && checkBothEscalated(jogo) && !jogo.timerInicio) {
        jogo.timerInicio = Date.now();
      }
    };
    if (isFirebaseConfigured) {
      await txUpdateJogo(jogoId, patch);
    } else {
      setState(prev => ({
        ...prev,
        jogos: prev.jogos.map(j => {
          if (j.id !== jogoId) return j;
          const updated = { ...j };
          patch(updated);
          return updated;
        }),
      }));
    }
  }, []);

  const liberarQuadra = useCallback(async (jogoId) => {
    const patch = (jogo) => { jogo.quadra = null; };
    if (isFirebaseConfigured) {
      await txUpdateJogo(jogoId, patch);
    } else {
      setState(prev => ({
        ...prev,
        jogos: prev.jogos.map(j => j.id !== jogoId ? j : { ...j, quadra: null }),
      }));
    }
  }, []);

  // ── Escalação ─────────────────────────────────────────────────────────────
  const submitEscalacao = useCallback(async (jogoId, meuSlot, fd, md, mx) => {
    const slot = String(meuSlot);
    const patch = (jogo) => {
      jogo.esc = {
        ...(jogo.esc || {}),
        [`fd${slot}a`]: fd[0] || '',
        [`fd${slot}b`]: fd[1] || '',
        [`md${slot}a`]: md[0] || '',
        [`md${slot}b`]: md[1] || '',
        [`mx${slot}a`]: (mx && mx[0]) || '',
        [`mx${slot}b`]: (mx && mx[1]) || '',
      };
      if (jogo.quadra && checkBothEscalated(jogo) && !jogo.timerInicio) {
        jogo.timerInicio = Date.now();
      }
    };
    if (isFirebaseConfigured) {
      await txUpdateJogo(jogoId, patch);
    } else {
      setState(prev => ({
        ...prev,
        jogos: prev.jogos.map(j => {
          if (j.id !== jogoId) return j;
          const updated = { ...j, esc: { ...(j.esc || {}) } };
          patch(updated);
          return updated;
        }),
      }));
    }
  }, []);

  // ── Resultado ─────────────────────────────────────────────────────────────
  const submitResultado = useCallback(async (jogoId, det) => {
    const patch = (jogo) => {
      jogo.det = det;
      const rs = calcResultStatus({ ...jogo, det });
      jogo.res = rs.res;
      jogo.venc = rs.winner;
      jogo.quadra = null;
      jogo.timerInicio = null;
    };
    if (isFirebaseConfigured) {
      await txUpdateJogo(jogoId, patch);
    } else {
      setState(prev => ({
        ...prev,
        jogos: prev.jogos.map(j => {
          if (j.id !== jogoId) return j;
          const updated = { ...j };
          patch(updated);
          return updated;
        }),
      }));
    }
  }, []);

  const editResultado = useCallback(async (jogoId) => {
    const patch = (jogo) => {
      jogo.res = null;
      jogo.det = null;
      jogo.venc = null;
    };
    if (isFirebaseConfigured) {
      await txUpdateJogo(jogoId, patch);
    } else {
      setState(prev => ({
        ...prev,
        jogos: prev.jogos.map(j => j.id !== jogoId ? j : { ...j, res: null, det: null, venc: null }),
      }));
    }
  }, []);

  // ── Bloquear/Liberar rodada ───────────────────────────────────────────────
  const toggleBloq = useCallback(async (jogoId) => {
    setState(prev => {
      const newState = {
        ...prev,
        jogos: prev.jogos.map(j => j.id !== jogoId ? j : { ...j, bloq: !j.bloq }),
      };
      if (isFirebaseConfigured) saveState(newState);
      return newState;
    });
  }, []);

  // ── Categorias ────────────────────────────────────────────────────────────
  const toggleCatAtiva = useCallback(async (catId) => {
    const newState = {
      ...state,
      cats: state.cats.map(c => c.id === catId ? { ...c, ativa: !c.ativa } : c),
    };
    await saveFullState(newState);
  }, [state, saveFullState]);

  // ── Quadras count ─────────────────────────────────────────────────────────
  const setNumQuadras = useCallback(async (n) => {
    const newState = { ...state, numQuadras: n };
    await saveFullState(newState);
  }, [state, saveFullState]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getEq = useCallback((id) => state.eqs.find(e => e.id === id), [state.eqs]);
  const getAtlsByEq = useCallback((eqId) => state.atls.filter(a => a.eqId === eqId), [state.atls]);
  const getJogosByEq = useCallback((eqId) =>
    state.jogos.filter(j => j.e1 === eqId || j.e2 === eqId),
    [state.jogos]);

  // ── Notifications (local only) ────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const addNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  }, []);

  return (
    <AppContext.Provider value={{
      state, setState, saveFullState, isFirebaseConfigured,
      // Teams
      addEq, updateEq, removeEq,
      // Athletes
      addAtl, removeAtl,
      // Captains
      addCap,
      // Matches
      addJogo, addJogos, removeJogo,
      // Court
      assignQuadra, liberarQuadra,
      // Escalation
      submitEscalacao,
      // Result
      submitResultado, editResultado,
      // Round control
      toggleBloq,
      // Categories
      toggleCatAtiva,
      // Courts count
      setNumQuadras,
      // Helpers
      getEq, getAtlsByEq, getJogosByEq,
      // Notifications
      notifications, addNotification,
      // Legacy compat
      checkBothEscalated,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export { checkBothEscalated };

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
