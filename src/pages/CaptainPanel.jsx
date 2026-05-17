import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { CaptainTeam } from '../components/captain/CaptainTeam';
import { CaptainMatches } from '../components/captain/CaptainMatches';
import { CaptainCourt } from '../components/captain/CaptainCourt';
import { CaptainStandings } from '../components/captain/CaptainStandings';
import { NotificationCenter } from '../components/common/NotificationCenter';
import { FirebaseStatus } from '../components/common/FirebaseStatus';
import { WarmupTimer } from '../components/common/Timer';
import { User, Swords, MapPin, Trophy, LogOut, AlertCircle } from 'lucide-react';
import { MATCH_STATUS } from '../data/mockData';

export function CaptainPanel() {
  const { user, logout } = useAuth();
  const { matches } = useApp();
  const [activeTab, setActiveTab] = useState('matches');

  const myMatches = useMemo(
    () => matches.filter(m => m.team1Id === user.teamId || m.team2Id === user.teamId),
    [matches, user.teamId]
  );

  const warmingGame = useMemo(() => {
    for (const m of myMatches) {
      const g = m.games.find(g => g.status === MATCH_STATUS.WARMING_UP);
      if (g) return { game: g, match: m };
    }
    return null;
  }, [myMatches]);

  const hasPendingAction = useMemo(() => myMatches.some(m => {
    const isTeam1 = m.team1Id === user.teamId;
    return m.games.some(g => {
      const myLineup = isTeam1 ? g.lineup1 : g.lineup2;
      return (myLineup.length === 0 && [MATCH_STATUS.WAITING_LINEUP, MATCH_STATUS.LINEUP_SENT].includes(g.status))
        || g.status === MATCH_STATUS.IN_PROGRESS;
    });
  }), [myMatches, user.teamId]);

  const tabs = [
    { id: 'team', label: 'Equipe', icon: User },
    { id: 'matches', label: 'Confrontos', icon: Swords, badge: hasPendingAction },
    { id: 'court', label: 'Quadra', icon: MapPin },
    { id: 'standings', label: 'Classificação', icon: Trophy },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'team': return <CaptainTeam />;
      case 'matches': return <CaptainMatches />;
      case 'court': return <CaptainCourt />;
      case 'standings': return <CaptainStandings />;
      default: return <CaptainMatches />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <span className="text-xl">{user.team?.flag || '🏳️'}</span>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">{user.team?.name}</p>
              <p className="text-xs text-gray-500 leading-none">Capitão: {user.name}</p>
              <FirebaseStatus />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter forRole={user.teamId} />
            <button onClick={logout} className="p-2 text-gray-500 hover:text-red-600 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Warmup banner — sticky below header */}
        {warmingGame && (
          <div className="bg-orange-50 border-b border-orange-200 px-4 py-2">
            <p className="text-xs font-semibold text-orange-700 mb-1 flex items-center gap-1">
              <AlertCircle size={12} /> Aquecimento em andamento — {warmingGame.game.type === 'male' ? '♂ Masculino' : warmingGame.game.type === 'female' ? '♀ Feminino' : '⚥ Misto'}
            </p>
            <WarmupTimer startedAt={warmingGame.game.warmupStartedAt} compact />
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-24 max-w-2xl mx-auto w-full">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
        <div className="flex max-w-2xl mx-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center px-2 py-2 relative transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  {tab.badge && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <span className={`text-xs mt-0.5 font-medium ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  {tab.label}
                </span>
                {isActive && <div className="absolute bottom-0 h-0.5 w-8 bg-blue-600 rounded-t" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
