import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { INITIAL_STATE } from '../data/mockData';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = !!(
  import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID
);

let _db = null;

if (isFirebaseConfigured) {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  _db = getFirestore(app);
}

export const db = _db;

const STATE_REF = () => doc(_db, 'torneio', 'state');

export async function getState() {
  if (!_db) return INITIAL_STATE;
  const snap = await getDoc(STATE_REF());
  return snap.exists() ? snap.data() : INITIAL_STATE;
}

export function listenState(cb) {
  if (!_db) return () => {};
  return onSnapshot(STATE_REF(), snap => {
    cb(snap.exists() ? snap.data() : INITIAL_STATE);
  });
}

export async function saveState(state) {
  if (!_db) return;
  await setDoc(STATE_REF(), state);
}

export async function txUpdateJogo(jogoId, patchFn) {
  if (!_db) return;
  await runTransaction(_db, async (tx) => {
    const snap = await tx.get(STATE_REF());
    const state = snap.exists() ? snap.data() : INITIAL_STATE;
    const idx = state.jogos.findIndex(j => j.id === jogoId);
    if (idx === -1) return;
    const jogo = { ...state.jogos[idx] };
    patchFn(jogo, state);
    const newJogos = [...state.jogos];
    newJogos[idx] = jogo;
    tx.set(STATE_REF(), { ...state, jogos: newJogos });
  });
}

export async function seedIfEmpty() {
  if (!_db) return;
  const snap = await getDoc(STATE_REF());
  if (!snap.exists()) {
    await setDoc(STATE_REF(), INITIAL_STATE);
  }
}

// ─── Legacy exports (kept for any remaining components that import them) ──────
export function listenCollection() { return () => {}; }
export function listenDoc() { return () => {}; }
export async function addTeamFS() {}
export async function addAthleteFS() {}
export async function addCourtFS() {}
export async function updateCourtFS() {}
export async function addGroupFS() {}
export async function addMatchFS() {}
export async function submitLineupFS() {}
export async function releaseCourtFS() {}
export async function startGameFS() {}
export async function submitResultFS() {}
export async function validateResultFS() {}
export async function editResultFS() {}
export async function addMixedGameFS() {}
export async function assignCourtFS() {}
export async function updateEventFS() {}
