// © 2025 Joe Pruskowski
import React, { useCallback, useMemo, useState } from 'react';
import { getStoredStrategy, setStoredStrategy, StrategyOption } from './utils/clientLogger';
import { createGame } from './socket/clientEmitters';
import { useDispatch } from 'react-redux';
import { setCurrentGame, setRole, setMyPlayer } from './store/gameSlice';

export interface OptionsPanelProps {
  onStrategyChange?: (strategy: StrategyOption) => void;
}

type StartMode = 'ai' | 'human' | 'alternate';
const START_MODE_KEY = 'ttt_start_mode';
const getStartMode = (): StartMode => {
  try {
    const v = localStorage.getItem(START_MODE_KEY) as StartMode | null;
    return v === 'ai' || v === 'alternate' || v === 'human' ? v : 'human';
  } catch {
    return 'human';
  }
};
const setStartMode = (v: StartMode): void => { try { localStorage.setItem(START_MODE_KEY, v); } catch {} };

export const OptionsPanel: React.FC<OptionsPanelProps> = ({ onStrategyChange }) => {
  const current = useMemo(() => getStoredStrategy(), []);
  const [startMode, setStartModeState] = useState<StartMode>(getStartMode());
  const dispatch = useDispatch();

  const handleStrategyChange = useCallback<React.ChangeEventHandler<HTMLSelectElement>>(
    (e) => {
      const value = (e.target.value as StrategyOption) ?? 'random';
      setStoredStrategy(value);
      onStrategyChange?.(value);
    },
    [onStrategyChange]
  );

  const handleStartModeChange = useCallback<React.ChangeEventHandler<HTMLSelectElement>>((e) => {
    const v = (e.target.value as StartMode) ?? 'human';
    setStartModeState(v);
    setStartMode(v);
  }, []);

  const handleCreate = useCallback(async () => {
    try {
      const payload: any = { strategy: getStoredStrategy(), startMode };
      // Back-compat for older servers: include aiStarts derived
      payload.aiStarts = startMode === 'ai';
      const ack = await createGame(payload);
      if ((ack as any).ok) {
        const starting = (ack as any).currentPlayer ?? (ack as any).player;
        dispatch(setCurrentGame({ gameId: (ack as any).gameId as string, startingPlayer: starting as any }));
        dispatch(setMyPlayer((ack as any).player as any));
        dispatch(setRole('player'));
      }
    } catch {}
  }, [dispatch, startMode]);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} aria-label="Options Panel">
      <label htmlFor="strategy-select">Strategy</label>
      <select id="strategy-select" data-testid="strategy-select" defaultValue={current} onChange={handleStrategyChange} aria-label="Strategy select">
        <option value="random">Random</option>
        <option value="ai">AI</option>
      </select>

      <label htmlFor="start-mode-select">Start</label>
      <select id="start-mode-select" data-testid="start-mode-select" value={startMode} onChange={handleStartModeChange} aria-label="Start mode select">
        <option value="ai">AI First</option>
        <option value="human">Human First</option>
        <option value="alternate">Alternates</option>
      </select>

      <button type="button" onClick={handleCreate} data-testid="create-game-btn" title="You must click New Game to start a match">
        New Game
      </button>
      <button
        type="button"
        onClick={async () => {
          const { sendLog } = await import('./utils/clientLogger');
          void sendLog({ level: 'info', message: 'client:button-log', context: { from: 'OptionsPanel' } }).catch(() => void 0);
        }}
      >
        Send Test Log
      </button>
    </div>
  );
};

export default OptionsPanel;


