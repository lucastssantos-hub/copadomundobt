import { Trophy, Users, MapPin, Activity, CheckCircle, Clock, Play } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardBody } from '../common/Card';

export function AdmDashboard() {
  const { state, toggleCatAtiva } = useApp();
  const eqs = state.eqs || [];
  const jogos = state.jogos || [];
  const cats = state.cats || [];
  const event = state.event || {};

  const finished = jogos.filter(j => j.res);
  const active = jogos.filter(j => j.quadra && !j.res);
  const warmingUp = active.filter(j => {
    if (!j.timerInicio) return false;
    const elapsed = Date.now() - j.timerInicio;
    return elapsed < 6 * 60 * 1000;
  });
  const pending = jogos.filter(j => !j.res && !j.quadra && (j.esc?.fd1a || j.esc?.fd1b || j.esc?.fd2a || j.esc?.fd2b));

  const activeCats = cats.filter(c => c.ativa);
  const inactiveCats = cats.filter(c => !c.ativa);

  return (
    <div className="space-y-6">
      {/* Event Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 p-2.5 rounded-xl">
            <Trophy size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">{event.nome || 'Copa do Mundo Beach Tennis 2026'}</h1>
            <p className="text-blue-200 text-sm mt-0.5">{event.subtitulo || 'Circuito de Equipes'}</p>
          </div>
        </div>
      </div>

      {/* Categorias Ativas */}
      <Card>
        <CardBody className="p-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Categorias Ativas
          </p>
          <div className="flex flex-wrap gap-2">
            {cats.map(cat => (
              <button key={cat.id} onClick={() => toggleCatAtiva(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${
                  cat.ativa ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-100 border-gray-200 text-gray-400 line-through'
                }`}>
                CAT {cat.id}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Toque para ativar/desativar • {activeCats.length} de {cats.length} ativas
          </p>
        </CardBody>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={<Users size={20} className="text-blue-600" />} label="Equipes" value={eqs.length} bg="bg-blue-50" />
        <StatCard icon={<Activity size={20} className="text-green-600" />} label="Confrontos" value={jogos.length} bg="bg-green-50" />
        <StatCard icon={<Play size={20} className="text-orange-600" />} label="Em Quadra" value={active.length} bg="bg-orange-50" />
        <StatCard icon={<Clock size={20} className="text-yellow-600" />} label="Aquecendo" value={warmingUp.length} bg="bg-yellow-50" />
        <StatCard icon={<CheckCircle size={20} className="text-emerald-600" />} label="Finalizados" value={finished.length} bg="bg-emerald-50" />
        <StatCard icon={<MapPin size={20} className="text-purple-600" />} label="Quadras" value={state.numQuadras || 0} bg="bg-purple-50" />
      </div>

      {/* Jogos ao vivo */}
      {active.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Ao Vivo ({active.length})
          </h2>
          <div className="space-y-2">
            {active.map(jogo => <JogoLiveCard key={jogo.id} jogo={jogo} eqs={eqs} />)}
          </div>
        </div>
      )}

      {/* Jogos finalizados recentes */}
      {finished.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-gray-800 mb-3">Últimos Resultados</h2>
          <div className="space-y-2">
            {[...finished].reverse().slice(0, 5).map(jogo => (
              <JogoFinishedCard key={jogo.id} jogo={jogo} eqs={eqs} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, bg }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-3 p-3">
        <div className={`${bg} p-2.5 rounded-xl`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function JogoLiveCard({ jogo, eqs }) {
  const eq1 = eqs.find(e => e.id === jogo.e1);
  const eq2 = eqs.find(e => e.id === jogo.e2);
  return (
    <Card className="border-l-4 border-l-green-500">
      <CardBody className="p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-800">
            {eq1?.bandeira} {eq1?.nome} <span className="text-gray-400 font-normal">vs</span> {eq2?.nome} {eq2?.bandeira}
          </div>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Q{jogo.quadra}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Cat {jogo.catId} · {jogo.gnome}</p>
      </CardBody>
    </Card>
  );
}

function JogoFinishedCard({ jogo, eqs }) {
  const eq1 = eqs.find(e => e.id === jogo.e1);
  const eq2 = eqs.find(e => e.id === jogo.e2);
  const det = jogo.det || {};
  const fdScore = det.fd ? `${det.fd.s1}-${det.fd.s2}` : '—';
  const mdScore = det.md ? `${det.md.s1}-${det.md.s2}` : '—';
  return (
    <Card>
      <CardBody className="p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-800">
            {eq1?.bandeira} {eq1?.nome} <span className="text-gray-400 font-normal">vs</span> {eq2?.nome} {eq2?.bandeira}
          </div>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{jogo.res || '—'}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Cat {jogo.catId} · FD: {fdScore} · MD: {mdScore}
        </p>
      </CardBody>
    </Card>
  );
}
