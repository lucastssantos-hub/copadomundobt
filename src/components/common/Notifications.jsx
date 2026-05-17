import { useApp } from '../../contexts/AppContext';
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

const icons = {
  success: <CheckCircle size={18} className="text-green-600" />,
  error: <XCircle size={18} className="text-red-600" />,
  warning: <AlertCircle size={18} className="text-yellow-600" />,
  info: <Info size={18} className="text-blue-600" />,
};

const colors = {
  success: 'bg-green-50 border-green-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-yellow-50 border-yellow-200',
  info: 'bg-blue-50 border-blue-200',
};

export function Notifications() {
  const { notifications } = useApp();
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {notifications.map(n => (
        <div key={n.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg animate-in slide-in-from-right-4 ${colors[n.type] || colors.info}`}>
          {icons[n.type] || icons.info}
          <p className="text-sm font-medium text-gray-800 flex-1">{n.message}</p>
        </div>
      ))}
    </div>
  );
}
