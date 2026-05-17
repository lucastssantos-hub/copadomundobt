import { AppProvider } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { AdmPanel } from './pages/AdmPanel';
import { CaptainPanel } from './pages/CaptainPanel';
import { Notifications } from './components/common/Notifications';

function AppContent() {
  const { user } = useAuth();
  if (!user) return <Login />;
  if (user.role === 'admin') return <AdmPanel />;
  return <CaptainPanel />;
}

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <Notifications />
        <AppContent />
      </AuthProvider>
    </AppProvider>
  );
}
