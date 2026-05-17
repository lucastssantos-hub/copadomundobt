import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CaptainTeam } from '../components/captain/CaptainTeam';
import { CaptainMatches } from '../components/captain/CaptainMatches';
import { CaptainCourt } from '../components/captain/CaptainCourt';
import { CaptainStandings } from '../components/captain/CaptainStandings';
import { NotificationCenter } from '../components/common/NotificationCenter';
import { User, Swords, MapPin, Trophy, LogOut } from 'lucide-react';

const tabs = [
  { id: 'team', label: 'Equipe', icon: User },
  { id: 'matches', label: 'Confrontos', icon: Swords },
  { id: 'court', label: 'Quadra', icon: MapPin },
  { id: 'standings', label: 'Classificação', icon: Trophy },
];

export function CaptainPanel() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('matches');

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
            </div>
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter forRole={user.teamId} />
            <button onClick={logout} className="p-2 text-gray-500 hover:text-red-600 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
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
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
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
