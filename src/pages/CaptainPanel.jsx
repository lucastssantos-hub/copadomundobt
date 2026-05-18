import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { CaptainTeam } from '../components/captain/CaptainTeam';
import { CaptainMatches } from '../components/captain/CaptainMatches';
import { MatchDetailModal } from '../components/captain/MatchDetailModal';
import { NotificationCenter } from '../components/common/NotificationCenter';
import { FirebaseStatus } from '../components/common/FirebaseStatus';
import { WarmupTimer } from '../components/common/Timer';
import { User, Swords, LogOut, AlertCircle } from 'lucide-react';
import { MATCH_STATUS } from '../data/mockData';

const tabs = [
  { id: 'matches', label: 'Jogos', icon: Swords },
  { id: 'team',    label: 'Equipe', icon: User },
];

export function CaptainPanel() {
  const { user, logout } = useAuth();
  const { matches } = useApp();
  const [activeTab, setActiveTab] = useState('matches');
  const [warmupModalMatch, setWarmupModalMatch] = useState(null);

  const myMatches = useMemo(
    () => matches.filter(m => m.team1Id === user.teamId || m.team2Id === user.teamId),
    [matches, user.teamId]
  );

  // Find a warming-up game to show in the sticky banner
  const warmingInfo = useMemo(() => {
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{user.team?.flag || '🏳️'}</span>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{user.team?.name}</p>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-gray-500 leading-none">Cap: {user.name}</p>
                <FirebaseStatus />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter forRole={user.teamId} />
            <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Warmup banner — tappable, opens the match modal */}
        {warmingInfo && (
          <button
            onClick={() => setWarmupModalMatch(warmingInfo.match)}
            className="w-full bg-orange-50 border-b border-orange-200 px-4 py-2 text-left hover:bg-orange-100 transition-colors"
          >
            <p className="text-xs font-semibold text-orange-700 mb-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {warmingInfo.game.type === 'male' ? '♂' : warmingInfo.game.type === 'female' ? '♀' : '⚥'}
              {' '}Aquecimento em andamento — toque para ver
            </p>
            <WarmupTimer startedAt={warmingInfo.game.warmupStartedAt} compact />
          </button>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-20 max-w-2xl mx-auto w-full">
        {activeTab === 'matches' ? <CaptainMatches /> : <CaptainTeam />}
      </main>

      {/* Bottom navigation — 2 tabs */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg">
        <div className="flex max-w-2xl mx-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-3 relative transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div className="relative">
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  {tab.id === 'matches' && hasPendingAction && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <span className={`text-xs mt-1 font-semibold ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                  {tab.label}
                </span>
                {isActive && <div className="absolute bottom-0 h-0.5 w-10 bg-blue-600 rounded-t" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Warmup modal (opened from banner) */}
      {warmupModalMatch && (
        <MatchDetailModal
          match={warmupModalMatch}
          onClose={() => setWarmupModalMatch(null)}
        />
      )}
    </div>
  );
}
