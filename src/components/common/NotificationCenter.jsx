import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const TYPE_ICONS = {
  lineup: '📋',
  result: '🏆',
  court: '📍',
  validation: '✅',
  info: 'ℹ️',
};

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function NotificationCenter({ forRole }) {
  const { alerts, markAlertRead, markAllAlertsRead, dismissAlert } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const myAlerts = alerts.filter(a => a.forRole === forRole || a.forRole === 'all');
  const unread = myAlerts.filter(a => !a.read).length;

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleOpen = () => {
    setOpen(prev => !prev);
    if (!open && unread > 0) {
      markAllAlertsRead(forRole);
      markAllAlertsRead('all');
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm">Notificações</h3>
            <div className="flex items-center gap-2">
              {myAlerts.length > 0 && (
                <button
                  onClick={() => { markAllAlertsRead(forRole); markAllAlertsRead('all'); }}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <CheckCheck size={12} /> Marcar todas
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-0.5">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {myAlerts.length === 0 ? (
              <div className="text-center py-8">
                <Bell size={28} className="text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Sem notificações</p>
              </div>
            ) : (
              myAlerts.map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${!alert.read ? 'bg-blue-50/50' : ''}`}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICONS[alert.type] || TYPE_ICONS.info}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(alert.timestamp)}</p>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5 p-0.5"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
