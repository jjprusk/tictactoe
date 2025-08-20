// © 2025 Joe Pruskowski
import React, { useEffect, useState } from 'react';
import { socketService, type ConnectionStatus } from '../socket/socketService';

const colorByStatus: Record<ConnectionStatus, string> = {
  connected: 'bg-emerald-500',
  connecting: 'bg-amber-500',
  disconnected: 'bg-rose-500',
};

const labelByStatus: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  disconnected: 'Disconnected',
};

export const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus>(socketService.getStatus());

  useEffect(() => {
    return socketService.subscribeStatus(setStatus);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 text-sm" aria-live="polite" aria-atomic="true">
      <span
        aria-hidden="true"
        data-testid="status-dot"
        className={`inline-block h-2.5 w-2.5 rounded-full ${colorByStatus[status]}`}
      />
      <span data-testid="status-text" className="text-slate-700 dark:text-slate-300">
        {labelByStatus[status]}
      </span>
    </div>
  );
};

export default ConnectionStatus;


