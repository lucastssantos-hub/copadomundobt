import { Component } from 'react';
import { AppProvider } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { AdmPanel } from './pages/AdmPanel';
import { CaptainPanel } from './pages/CaptainPanel';
import { Notifications } from './components/common/Notifications';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow p-6 max-w-sm w-full">
            <p className="text-red-600 font-bold text-sm mb-2">Erro na aplicação</p>
            <pre className="text-xs text-gray-700 bg-gray-50 rounded p-3 overflow-x-auto whitespace-pre-wrap">
              {this.state.error.message}
              {'\n\n'}
              {this.state.error.stack?.split('\n').slice(0, 6).join('\n')}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              className="mt-4 w-full bg-blue-600 text-white rounded-xl py-2 text-sm font-semibold"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { user } = useAuth();
  if (!user) return <Login />;
  if (user.role === 'admin') return <AdmPanel />;
  return <CaptainPanel />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthProvider>
          <Notifications />
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </AuthProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}
