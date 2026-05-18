import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AdmDashboard } from '../components/adm/AdmDashboard';
import { AdmTeams } from '../components/adm/AdmTeams';
import { AdmGroups } from '../components/adm/AdmGroups';
import { AdmMatches } from '../components/adm/AdmMatches';
import { AdmCourts } from '../components/adm/AdmCourts';
import { AdmStandings } from '../components/adm/AdmStandings';
import { AdmElimination } from '../components/adm/AdmElimination';
import { AdmPrint } from '../components/adm/AdmPrint';
import { AdmRanking } from '../components/adm/AdmRanking';
import { AdmPdfImport } from '../components/adm/AdmPdfImport';
import { CsvExport } from '../components/adm/CsvExport';
import { NotificationCenter } from '../components/common/NotificationCenter';
import { FirebaseStatus } from '../components/common/FirebaseStatus';
import {
  LayoutDashboard, Users, Grid3X3, Swords, MapPin, Trophy, Zap, Printer, LogOut,
  Monitor, FileUp, FileDown
} from 'lucide-react';

const BASE = import.meta.env.BASE_URL || '/';
const DISPLAY_URL = `${window.location.origin}${BASE}display`;

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'teams', label: 'Equipes', icon: Users },
  { id: 'groups', label: 'Grupos', icon: Grid3X3 },
  { id: 'matches', label: 'Confrontos', icon: Swords },
  { id: 'courts', label: 'Quadras', icon: MapPin },
  { id: 'standings', label: 'Classificação', icon: Trophy },
  { id: 'elimination', label: 'Eliminatórias', icon: Zap },
  { id: 'ranking', label: 'Ranking', icon: Trophy },
  { id: 'import', label: 'Importar', icon: FileUp },
  { id: 'export', label: 'Exportar', icon: FileDown },
  { id: 'print', label: 'Impressão', icon: Printer },
];

export function AdmPanel() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <AdmDashboard />;
      case 'teams': return <AdmTeams />;
      case 'groups': return <AdmGroups />;
      case 'matches': return <AdmMatches />;
      case 'courts': return <AdmCourts />;
      case 'standings': return <AdmStandings />;
      case 'elimination': return <AdmElimination />;
      case 'ranking': return <AdmRanking />;
      case 'import': return <AdmPdfImport />;
      case 'export': return <CsvExport />;
      case 'print': return <AdmPrint />;
      default: return <AdmDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎾</span>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-none">ADM</p>
              <p className="text-xs text-gray-500 leading-none">Copa do Mundo BT</p>
            </div>
            <FirebaseStatus />
          </div>
          <div className="flex items-center gap-1">
            <a
              href={DISPLAY_URL}
              target="_blank"
              rel="noreferrer"
              title="Abrir Telão"
              className="flex items-center gap-1 text-gray-500 hover:text-blue-600 text-xs font-medium transition-colors p-2"
            >
              <Monitor size={16} />
            </a>
            <NotificationCenter forRole="admin" />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 text-sm font-medium transition-colors ml-1 p-2"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 pb-24 max-w-2xl mx-auto w-full">
        {renderContent()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg print:hidden">
        <div className="flex overflow-x-auto scrollbar-none max-w-2xl mx-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex flex-col items-center justify-center px-3 py-2 min-w-[60px] relative transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-xs mt-0.5 font-medium leading-none ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
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
