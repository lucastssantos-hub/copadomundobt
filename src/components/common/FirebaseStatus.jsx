import { Wifi, WifiOff, Database } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

export function FirebaseStatus() {
  const { isFirebaseConfigured, firebaseReady } = useApp();

  if (!isFirebaseConfigured) {
    return (
      <span title="Modo offline — dados locais" className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
        <WifiOff size={10} />
        <span className="hidden sm:inline">Offline</span>
      </span>
    );
  }

  if (!firebaseReady) {
    return (
      <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full animate-pulse">
        <Database size={10} />
        <span className="hidden sm:inline">Conectando...</span>
      </span>
    );
  }

  return (
    <span title="Firebase conectado — dados em tempo real" className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
      <Wifi size={10} />
      <span className="hidden sm:inline">Tempo real</span>
    </span>
  );
}
