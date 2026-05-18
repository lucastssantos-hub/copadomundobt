import { useState } from 'react';
import { Plus, Users, ChevronRight, Share2, Copy, Check, Trash2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { CATEGORIES } from '../../data/mockData';
import { Card, CardBody } from '../common/Card';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

export function AdmTeams() {
  const { state, addEq, addAtl, addCap, removeAtl } = useApp();
  const [selectedEq, setSelectedEq] = useState(null);
  const [showEqModal, setShowEqModal] = useState(false);
  const [showAtlModal, setShowAtlModal] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [copied, setCopied] = useState(false);

  const [eqForm, setEqForm] = useState({ nome: '', bandeira: '', catId: 'A', grupo: 1 });
  const [atlForm, setAtlForm] = useState({ nome: '', sexo: 'M' });

  const cats = state.cats || [];
  const eqs = state.eqs || [];
  const atls = state.atls || [];
  const caps = state.caps || [];

  const filtered = filterCat === 'all' ? eqs : eqs.filter(e => e.catId === filterCat);

  const handleAddEq = () => {
    if (!eqForm.nome.trim()) return;
    const id = eqForm.nome.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const grupoCod = eqForm.catId + eqForm.grupo;
    const capCodigo = eqForm.nome.trim().toUpperCase().slice(0, 3).replace(/\s/g, '') + '-' + eqForm.catId + '-2026';
    addEq({ id, nome: eqForm.nome.trim(), bandeira: eqForm.bandeira, catId: eqForm.catId, grupo: Number(eqForm.grupo) });
    addCap({ codigo: capCodigo, eqId: id, catId: eqForm.catId });
    setEqForm({ nome: '', bandeira: '', catId: 'A', grupo: 1 });
    setShowEqModal(false);
  };

  const handleAddAtl = () => {
    if (!atlForm.nome.trim() || !selectedEq) return;
    const id = `${selectedEq.id}-${atlForm.sexo.toLowerCase()}-${Date.now()}`;
    addAtl({ id, eqId: selectedEq.id, catId: selectedEq.catId, nome: atlForm.nome.trim(), sexo: atlForm.sexo });
    setAtlForm({ nome: '', sexo: 'M' });
    setShowAtlModal(false);
  };

  const cap = selectedEq ? caps.find(c => c.eqId === selectedEq.id) : null;
  const teamAtls = selectedEq ? atls.filter(a => a.eqId === selectedEq.id) : [];

  const handleCopy = () => {
    if (!cap) return;
    navigator.clipboard.writeText(cap.codigo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWhatsApp = () => {
    if (!cap) return;
    const msg = encodeURIComponent(
      `🎾 *Copa do Mundo de Beach Tennis 2026*\n\nOlá, ${selectedEq?.nome}!\n\nSeu código de acesso ao painel do capitão é:\n\n*${cap.codigo}*\n\nAcesse o app e entre com este código para escalar sua equipe.`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const catOptions = cats.length > 0 ? cats.map(c => c.id) : CATEGORIES;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Equipes</h2>
        <Button onClick={() => setShowEqModal(true)} size="sm">
          <Plus size={16} className="mr-1" /> Nova Equipe
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', ...catOptions].map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterCat === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {cat === 'all' ? 'Todas' : `Cat ${cat}`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardBody><p className="text-center text-gray-500 py-8">Nenhuma equipe cadastrada.</p></CardBody></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map(eq => {
            const eqCap = caps.find(c => c.eqId === eq.id);
            const atlCount = atls.filter(a => a.eqId === eq.id).length;
            return (
              <Card key={eq.id} onClick={() => setSelectedEq(eq)} className="cursor-pointer active:bg-gray-50">
                <CardBody className="p-3 flex items-center gap-3">
                  <div className="text-3xl">{eq.bandeira || '🏳️'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 truncate">{eq.nome}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Cat {eq.catId}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">G{eq.grupo}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {atlCount} atleta(s) • Código: {eqCap?.codigo || '—'}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Team Detail Modal */}
      <Modal isOpen={!!selectedEq} onClose={() => setSelectedEq(null)} title={selectedEq ? `${selectedEq.bandeira || ''} ${selectedEq.nome}` : ''} size="lg">
        {selectedEq && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Cat {selectedEq.catId}</span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Grupo {selectedEq.grupo}</span>
            </div>

            {cap && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-medium text-blue-600 mb-1 flex items-center gap-1">
                  <Share2 size={12} /> Código de Acesso do Capitão
                </p>
                <p className="font-mono font-bold text-xl tracking-widest text-blue-900 mb-2">{cap.codigo}</p>
                <div className="flex gap-2">
                  <button onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors">
                    {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button onClick={handleWhatsApp}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 rounded-lg text-xs font-medium text-white hover:bg-green-600 transition-colors">
                    <Share2 size={13} /> Enviar WhatsApp
                  </button>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <Users size={16} /> Atletas ({teamAtls.length})
                </h4>
                <Button size="sm" onClick={() => setShowAtlModal(true)}>
                  <Plus size={14} className="mr-1" /> Atleta
                </Button>
              </div>
              {teamAtls.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">Nenhum atleta cadastrado</p>
              ) : (
                <div className="space-y-2">
                  {['F', 'M'].map(sexo => {
                    const grupo = teamAtls.filter(a => a.sexo === sexo);
                    if (grupo.length === 0) return null;
                    return (
                      <div key={sexo}>
                        <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                          {sexo === 'M' ? '♂ Masculino' : '♀ Feminino'}
                        </p>
                        <div className="space-y-1">
                          {grupo.map(atl => (
                            <div key={atl.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                                {sexo === 'M' ? '♂' : '♀'}
                              </span>
                              <span className="text-sm text-gray-800 flex-1">{atl.nome}</span>
                              <button onClick={() => removeAtl(atl.id)} className="text-red-400 hover:text-red-600 p-1">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Add Equipe Modal */}
      <Modal isOpen={showEqModal} onClose={() => setShowEqModal(false)} title="Nova Equipe">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Equipe / País</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Ex: Brasil" value={eqForm.nome} onChange={e => setEqForm(p => ({ ...p, nome: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bandeira (Emoji)</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Ex: 🇧🇷" value={eqForm.bandeira} onChange={e => setEqForm(p => ({ ...p, bandeira: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={eqForm.catId} onChange={e => setEqForm(p => ({ ...p, catId: e.target.value }))}>
                {catOptions.map(c => <option key={c} value={c}>Cat {c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" value={eqForm.grupo} onChange={e => setEqForm(p => ({ ...p, grupo: e.target.value }))}>
                {[1, 2, 3, 4].map(g => <option key={g} value={g}>Grupo {g}</option>)}
              </select>
            </div>
          </div>
          <Button fullWidth onClick={handleAddEq}>Cadastrar Equipe</Button>
        </div>
      </Modal>

      {/* Add Atleta Modal */}
      <Modal isOpen={showAtlModal} onClose={() => setShowAtlModal(false)} title={`Novo Atleta — ${selectedEq?.nome}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Atleta</label>
            <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" placeholder="Nome completo" value={atlForm.nome} onChange={e => setAtlForm(p => ({ ...p, nome: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gênero</label>
            <div className="flex gap-2">
              {['M', 'F'].map(s => (
                <button key={s} onClick={() => setAtlForm(p => ({ ...p, sexo: s }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${atlForm.sexo === s ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                  {s === 'M' ? '♂ Masculino' : '♀ Feminino'}
                </button>
              ))}
            </div>
          </div>
          <Button fullWidth onClick={handleAddAtl}>Cadastrar Atleta</Button>
        </div>
      </Modal>
    </div>
  );
}
