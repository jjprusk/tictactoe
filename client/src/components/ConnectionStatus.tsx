// © 2025 Joe Pruskowski
import React, { useEffect, useState } from 'react';
import { socketService, type ConnectionStatus } from '../socket/socketService';
import { useDispatch } from 'react-redux';
import { resetGameState } from '../store/gameSlice';

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
  const [forced, setForced] = useState<boolean>(socketService.getForcedOffline());
  const dispatch = useDispatch();

  useEffect(() => {
    return socketService.subscribeStatus(setStatus);
  }, []);

  const effective: ConnectionStatus = forced ? 'disconnected' : status;
  const bgClass = effective === 'connected' ? 'bg-emerald-500' : effective === 'connecting' ? 'bg-amber-500' : 'bg-rose-500';
  const label = forced ? 'Offline' : (effective === 'connected' ? 'Online' : labelByStatus[status]);
  // Knob on the right when online, left otherwise (offline/connecting)
  const knobClass = effective === 'connected' && !forced ? 'right-0.5' : 'left-0.5';
  // Keep the control compact, but add equal space on both sides of the label
  const textPadClass = 'pl-3 pr-3 text-center';

  return (
    <div className="inline-flex items-center text-[11px]" aria-live="polite" aria-atomic="true">
      <label className={`relative inline-flex items-center cursor-pointer select-none rounded-full px-1 py-0 text-white min-w-[56px] ${bgClass}`} title="Toggle online/offline" aria-label="Online status toggle">
        <input
          type="checkbox"
          className="sr-only"
          role="switch"
          aria-checked={forced}
          checked={forced}
          onChange={(e) => {
            const v = e.currentTarget.checked;
            setForced(v);
            // Reset local game state when toggling modes (offline/online)
            dispatch(resetGameState());
            socketService.setForcedOffline(v);
          }}
        />
        <span data-testid="status-text" className={`whitespace-nowrap ${textPadClass}`}>{label}</span>
        <span aria-hidden="true" className={`absolute top-0.5 h-3 w-3 rounded-full border border-white bg-transparent transition-all ${knobClass}`} />
      </label>
    </div>
  );
};

export default ConnectionStatus;


