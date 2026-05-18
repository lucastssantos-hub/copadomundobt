import { useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileText, Upload, CheckCircle, XCircle, Loader2, Users, Shield } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { CATEGORIES } from '../../data/mockData';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;

// ── Helpers ──────────────────────────────────────────────────────────────────

function roundY(y) {
  return Math.round(y / 5) * 5;
}

const STOP_WORDS = ['JOGOS', 'DATA', 'HORÁRIO', 'HORARIO'];
const KNOWN_HEADERS = ['CATEGORIA', 'GRUPO', 'GROUP', 'CHAVE', 'BRACKET', 'FASE', 'ROUND'];
const TIME_RE = /^\d{1,2}:\d{2}$/;
const DATE_RE = /^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/;
const DIGITS_ONLY_RE = /^\d+$/;
const CATEGORY_LETTER_RE = /^[ABCDE]$/;
const CATEGORY_PLUS_RE = /^\+\d+$/;
const GROUP_HEADER_RE = /^(GRUPO|GROUP)\s*\d+$/i;

function isNoise(text) {
  const t = text.trim();
  if (!t || t.length < 3) return true;
  if (DIGITS_ONLY_RE.test(t)) return true;
  if (TIME_RE.test(t)) return true;
  if (DATE_RE.test(t)) return true;
  if (KNOWN_HEADERS.some(h => t.toUpperCase().includes(h))) return true;
  return false;
}

function detectCategory(lineText) {
  const upper = lineText.toUpperCase().trim();
  if (upper.includes('CATEGORIA')) {
    // Try to extract category after "CATEGORIA"
    const match = upper.match(/CATEGORIA\s+([ABCDE]|\+35|\+60)/);
    if (match) return match[1];
  }
  if (CATEGORY_LETTER_RE.test(upper)) return upper;
  if (CATEGORY_PLUS_RE.test(upper)) return upper;
  return null;
}

async function extractTextLines(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const allLines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Group items by rounded Y coordinate
    const byY = {};
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = roundY(item.transform[5]);
      if (!byY[y]) byY[y] = [];
      byY[y].push({ text: item.str.trim(), x: item.transform[4] });
    }

    // Sort lines top-to-bottom (higher Y = higher on page in PDF coords, so sort descending)
    const sortedYs = Object.keys(byY)
      .map(Number)
      .sort((a, b) => b - a);

    for (const y of sortedYs) {
      const items = byY[y].sort((a, b) => a.x - b.x);
      const lineText = items.map(i => i.text).join(' ').trim();
      if (lineText) allLines.push(lineText);
    }
  }

  return allLines;
}

// ── Team Parser ───────────────────────────────────────────────────────────────

function parseTeamsFromLines(lines) {
  const result = []; // [{ category, group, teams: [] }]
  let currentCategory = null;
  let currentGroup = null;
  let stopped = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Stop at schedule section
    if (STOP_WORDS.some(w => line.toUpperCase().includes(w))) {
      stopped = true;
      break;
    }
    if (stopped) break;

    // Detect category
    const cat = detectCategory(line);
    if (cat) {
      currentCategory = cat;
      currentGroup = null;
      continue;
    }

    // Detect group header
    if (GROUP_HEADER_RE.test(line.trim())) {
      const entry = { category: currentCategory || '?', group: line.trim(), teams: [] };
      result.push(entry);
      currentGroup = entry;
      continue;
    }

    // Skip noise
    if (isNoise(line)) continue;

    // If we have a current group, collect team name
    if (currentGroup) {
      currentGroup.teams.push(line);
    }
  }

  return result;
}

// ── Athlete Parser ────────────────────────────────────────────────────────────

function parseAthletesFromLines(lines, existingTeams) {
  const teamNames = existingTeams.map(t => t.name.toLowerCase());
  const result = []; // [{ athleteName, teamName, teamId }]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Look for TEL: pattern — athlete name is on previous line
    if (line.toUpperCase().startsWith('TEL:')) {
      if (i > 0) {
        const candidateName = lines[i - 1].trim();
        // The line before TEL might be the team or category, look further back
        // Try to find a team line between i-3 and i-1
        let teamId = null;
        let teamName = null;
        for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
          const tl = lines[j].trim().toLowerCase();
          const idx = teamNames.indexOf(tl);
          if (idx !== -1) {
            teamId = existingTeams[idx].id;
            teamName = existingTeams[idx].name;
            break;
          }
        }
        // Athlete name is the line right before TEL that isn't a team name
        let athleteName = null;
        for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
          const tl = lines[j].trim().toLowerCase();
          if (!teamNames.includes(tl) && !isNoise(lines[j]) && !TIME_RE.test(tl) && !DATE_RE.test(tl)) {
            athleteName = lines[j].trim();
            break;
          }
        }

        if (athleteName && teamId) {
          const alreadyAdded = result.some(r => r.athleteName === athleteName && r.teamId === teamId);
          if (!alreadyAdded) {
            result.push({ athleteName, teamName, teamId });
          }
        }
      }
      continue;
    }

    // Look for lines where next line starts with a known team name
    const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : '';
    const nextLower = nextLine.toLowerCase();
    const teamIdx = teamNames.indexOf(nextLower);
    if (teamIdx !== -1) {
      const athleteName = line;
      if (!isNoise(athleteName)) {
        const teamId = existingTeams[teamIdx].id;
        const teamName = existingTeams[teamIdx].name;
        const alreadyAdded = result.some(r => r.athleteName === athleteName && r.teamId === teamId);
        if (!alreadyAdded) {
          result.push({ athleteName, teamName, teamId });
        }
      }
    }
  }

  return result;
}

// ── Drop Zone ─────────────────────────────────────────────────────────────────

function DropZone({ onFile, loading, accept = '.pdf' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
        dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40'
      }`}
      onClick={() => !loading && inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ''; }}
      />
      {loading ? (
        <div className="flex flex-col items-center gap-2 text-blue-600">
          <Loader2 size={32} className="animate-spin" />
          <p className="text-sm font-medium">Processando PDF...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Upload size={32} className="text-gray-400" />
          <p className="text-sm font-medium">Arraste o PDF aqui ou clique para selecionar</p>
          <p className="text-xs text-gray-400">Apenas arquivos .pdf</p>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AdmPdfImport() {
  const { state, addEq, addAtl, addCap, addNotification } = useApp();
  const teams = (state.eqs || []).map(e => ({ id: e.id, name: e.nome, category: e.catId }));
  const athletes = (state.atls || []).map(a => ({ id: a.id, name: a.nome, teamId: a.eqId }));

  const [activeTab, setActiveTab] = useState('teams'); // 'teams' | 'athletes'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Teams import state
  const [parsedGroups, setParsedGroups] = useState([]); // [{ category, group, teams }]
  const [showTeamsPreview, setShowTeamsPreview] = useState(false);
  const [importingTeams, setImportingTeams] = useState(false);

  // Athletes import state
  const [parsedAthletes, setParsedAthletes] = useState([]); // [{ athleteName, teamName, teamId }]
  const [showAthletesPreview, setShowAthletesPreview] = useState(false);
  const [importingAthletes, setImportingAthletes] = useState(false);

  // ── Team PDF handling ──────────────────────────────────────────────────────

  const handleTeamPdf = async (file) => {
    setError('');
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const lines = await extractTextLines(buffer);
      const groups = parseTeamsFromLines(lines);

      if (groups.length === 0) {
        setError('Nenhuma equipe encontrada no PDF. Verifique se é um PDF do LetzPlay com grupos.');
        setLoading(false);
        return;
      }

      setParsedGroups(groups);
      setShowTeamsPreview(true);
    } catch (err) {
      console.error(err);
      setError('Erro ao processar o PDF. Verifique se o arquivo é válido.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTeams = async () => {
    setImportingTeams(true);
    let count = 0;
    const existingNames = teams.map(t => t.name.toLowerCase());

    for (const group of parsedGroups) {
      const category = CATEGORIES.includes(group.category) ? group.category : 'A';
      for (const teamName of group.teams) {
        if (!existingNames.includes(teamName.toLowerCase())) {
          const id = teamName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() + '-' + count;
          await addEq({ id, nome: teamName, bandeira: '', catId: category, grupo: 1 });
          await addCap({ codigo: teamName.toUpperCase().slice(0, 3).replace(/\s/g, '') + '-' + category + '-2026', eqId: id, catId: category });
          existingNames.push(teamName.toLowerCase());
          count++;
        }
      }
    }

    setImportingTeams(false);
    setShowTeamsPreview(false);
    setParsedGroups([]);
    addNotification(`${count} equipe(s) importada(s) com sucesso!`, 'success');
  };

  // ── Athlete PDF handling ───────────────────────────────────────────────────

  const handleAthletePdf = async (file) => {
    setError('');
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const lines = await extractTextLines(buffer);
      const parsed = parseAthletesFromLines(lines, teams);

      // Filter out already existing athletes
      const existingNames = athletes.map(a => a.name.toLowerCase());
      const filtered = parsed.filter(p => !existingNames.includes(p.athleteName.toLowerCase()));

      if (filtered.length === 0 && parsed.length === 0) {
        setError('Nenhum atleta encontrado. Verifique se é um PDF de inscrições do LetzPlay.');
        setLoading(false);
        return;
      }

      setParsedAthletes(filtered);
      setShowAthletesPreview(true);
    } catch (err) {
      console.error(err);
      setError('Erro ao processar o PDF. Verifique se o arquivo é válido.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAthletes = async () => {
    setImportingAthletes(true);
    let count = 0;

    for (const entry of parsedAthletes) {
      if (entry.teamId) {
        const eq = state.eqs?.find(e => e.id === entry.teamId);
        await addAtl({ id: `${entry.teamId}-${Date.now()}-${count}`, eqId: entry.teamId, catId: eq?.catId || 'A', nome: entry.athleteName, sexo: 'M' });
        count++;
      }
    }

    setImportingAthletes(false);
    setShowAthletesPreview(false);
    setParsedAthletes([]);
    addNotification(`${count} atleta(s) importado(s)! Atualize os gêneros manualmente.`, 'success');
  };

  // ── Total counts for preview ───────────────────────────────────────────────

  const totalTeamsInParsed = parsedGroups.reduce((sum, g) => sum + g.teams.length, 0);
  const existingTeamNames = teams.map(t => t.name.toLowerCase());
  const newTeams = parsedGroups.flatMap(g =>
    g.teams.filter(name => !existingTeamNames.includes(name.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText size={20} className="text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Importar via PDF</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => { setActiveTab('teams'); setError(''); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'teams' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Shield size={15} /> Equipes (PDF)
        </button>
        <button
          onClick={() => { setActiveTab('athletes'); setError(''); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'athletes' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={15} /> Atletas (PDF)
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <XCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === 'teams' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Importe equipes a partir do PDF de chaveamento do <strong>LetzPlay</strong>.
            O sistema detecta automaticamente categorias e grupos.
          </p>
          <DropZone onFile={handleTeamPdf} loading={loading} />
        </div>
      )}

      {/* Athletes Tab */}
      {activeTab === 'athletes' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Importe atletas a partir do PDF de inscrições do <strong>LetzPlay</strong>.
            As equipes já precisam estar cadastradas no sistema.
          </p>
          {teams.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl px-4 py-3 text-sm">
              Nenhuma equipe cadastrada. Importe as equipes primeiro.
            </div>
          )}
          <DropZone onFile={handleAthletePdf} loading={loading || teams.length === 0} />
        </div>
      )}

      {/* ── Teams Preview Modal ──────────────────────────────────────────── */}
      <Modal
        isOpen={showTeamsPreview}
        onClose={() => { if (!importingTeams) { setShowTeamsPreview(false); setParsedGroups([]); } }}
        title="Pré-visualização — Equipes"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3">
            <CheckCircle size={16} className="text-green-600" />
            <span>
              <strong>{totalTeamsInParsed}</strong> equipe(s) detectada(s) no PDF.{' '}
              <strong className="text-green-700">{newTeams.length}</strong> nova(s) serão importadas.
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {parsedGroups.map((group, gi) => {
              const validCat = CATEGORIES.includes(group.category);
              return (
                <div key={gi} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${validCat ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      Cat {group.category}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">{group.group}</span>
                    <span className="ml-auto text-xs text-gray-400">{group.teams.length} equipe(s)</span>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {group.teams.map((name, ti) => {
                      const isNew = !existingTeamNames.includes(name.toLowerCase());
                      return (
                        <li key={ti} className="flex items-center gap-2 px-4 py-2 text-sm">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isNew ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className={isNew ? 'text-gray-800' : 'text-gray-400 line-through'}>{name}</span>
                          {!isNew && <span className="text-xs text-gray-400">(já existe)</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => { setShowTeamsPreview(false); setParsedGroups([]); }}
              disabled={importingTeams}
            >
              Cancelar
            </Button>
            <Button
              fullWidth
              onClick={handleConfirmTeams}
              disabled={importingTeams || newTeams.length === 0}
            >
              {importingTeams ? (
                <><Loader2 size={15} className="animate-spin mr-1.5" /> Importando...</>
              ) : (
                `Confirmar importação (${newTeams.length})`
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Athletes Preview Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={showAthletesPreview}
        onClose={() => { if (!importingAthletes) { setShowAthletesPreview(false); setParsedAthletes([]); } }}
        title="Pré-visualização — Atletas"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <CheckCircle size={16} className="text-amber-600" />
            <span>
              <strong>{parsedAthletes.length}</strong> atleta(s) encontrado(s). O gênero será definido como
              <strong> Masculino</strong> por padrão — atualize manualmente após importar.
            </span>
          </div>

          {parsedAthletes.length === 0 ? (
            <p className="text-center text-gray-500 py-6 text-sm">
              Todos os atletas já estão cadastrados no sistema.
            </p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {parsedAthletes.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5 text-sm">
                  <span className="font-medium text-gray-800 flex-1">{entry.athleteName}</span>
                  {entry.teamId ? (
                    <span className="text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
                      {entry.teamName}
                    </span>
                  ) : (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                      Equipe não encontrada
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => { setShowAthletesPreview(false); setParsedAthletes([]); }}
              disabled={importingAthletes}
            >
              Cancelar
            </Button>
            <Button
              fullWidth
              onClick={handleConfirmAthletes}
              disabled={importingAthletes || parsedAthletes.filter(p => p.teamId).length === 0}
            >
              {importingAthletes ? (
                <><Loader2 size={15} className="animate-spin mr-1.5" /> Importando...</>
              ) : (
                `Confirmar importação (${parsedAthletes.filter(p => p.teamId).length})`
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
