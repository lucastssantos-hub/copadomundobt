import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/common/Button';
import { Trophy, Lock, User, ChevronRight } from 'lucide-react';

export function Login() {
  const { loginAdmin, loginCaptain } = useAuth();
  const [mode, setMode] = useState(null);
  const [adminPass, setAdminPass] = useState('');
  const [captainUser, setCaptainUser] = useState('');
  const [captainPass, setCaptainPass] = useState('');
  const [error, setError] = useState('');

  const handleAdmin = () => {
    if (loginAdmin(adminPass)) {
      setError('');
    } else {
      setError('Senha incorreta');
    }
  };

  const handleCaptain = () => {
    if (loginCaptain(captainUser, captainPass)) {
      setError('');
    } else {
      setError('Usuário ou senha incorretos');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-3xl mb-4 backdrop-blur-sm">
            <Trophy size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white leading-tight">Copa do Mundo</h1>
          <p className="text-blue-200 mt-1">Beach Tennis — Circuito de Equipes</p>
        </div>

        {!mode ? (
          <div className="space-y-3">
            <p className="text-blue-200 text-center text-sm mb-4">Selecione seu tipo de acesso</p>
            <button
              onClick={() => { setMode('admin'); setError(''); }}
              className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-98 text-left"
            >
              <div className="bg-yellow-400/20 p-3 rounded-xl">
                <Lock size={22} className="text-yellow-300" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">Painel ADM</p>
                <p className="text-blue-300 text-sm">Organização / Árbitro</p>
              </div>
              <ChevronRight size={18} className="text-white/60" />
            </button>
            <button
              onClick={() => { setMode('captain'); setError(''); }}
              className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-98 text-left"
            >
              <div className="bg-green-400/20 p-3 rounded-xl">
                <User size={22} className="text-green-300" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white">Painel do Capitão</p>
                <p className="text-blue-300 text-sm">Gerenciar sua equipe</p>
              </div>
              <ChevronRight size={18} className="text-white/60" />
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => { setMode(null); setError(''); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                ← Voltar
              </button>
              <h2 className="text-xl font-bold text-gray-900 flex-1">
                {mode === 'admin' ? '🔐 Acesso ADM' : '👤 Acesso Capitão'}
              </h2>
            </div>

            {mode === 'admin' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha ADM</label>
                  <input
                    type="password"
                    value={adminPass}
                    onChange={e => setAdminPass(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdmin()}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-gray-400 mt-1">Demo: admin2026</p>
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button fullWidth size="lg" onClick={handleAdmin}>Entrar como ADM</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-blue-700 font-medium">Entre com seu código de equipe</p>
                  <p className="text-xs text-blue-500 mt-0.5">Ex: BRA-A-2026 · ARG-A-2026 · POR-A-2026</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Código da Equipe</label>
                  <input
                    type="text"
                    value={captainUser}
                    onChange={e => setCaptainUser(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleCaptain()}
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none uppercase tracking-widest font-mono"
                    placeholder="BRA-A-2026"
                    autoCapitalize="characters"
                  />
                </div>
                <details className="text-xs text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-600">Acesso alternativo (usuário + senha)</summary>
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={captainUser}
                      onChange={e => setCaptainUser(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                      placeholder="usuário (ex: brasil_cap)"
                    />
                    <input
                      type="password"
                      value={captainPass}
                      onChange={e => setCaptainPass(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCaptain()}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                      placeholder="senha"
                    />
                    <p className="text-gray-400">Demo: brasil_cap / 1234</p>
                  </div>
                </details>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button fullWidth size="lg" onClick={handleCaptain}>Entrar</Button>
              </div>
            )}
          </div>
        )}

        <p className="text-center text-blue-300 text-xs mt-6">
          🎾 Copa do Mundo de Beach Tennis 2026
        </p>
      </div>
    </div>
  );
}
