// © 2025 Joe Pruskowski
import React, { useCallback, useMemo } from 'react';
import { getStoredStrategy, setStoredStrategy, StrategyOption } from './utils/clientLogger';
import { createGame } from './socket/clientEmitters';
import { useDispatch } from 'react-redux';
import { setCurrentGame } from './store/gameSlice';

export interface OptionsPanelProps {
  onStrategyChange?: (strategy: StrategyOption) => void;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({ onStrategyChange }) => {
  const current = useMemo(() => getStoredStrategy(), []);
  const dispatch = useDispatch();

  const handleChange = useCallback<React.ChangeEventHandler<HTMLSelectElement>>(
    (e) => {
      const value = (e.target.value as StrategyOption) ?? 'random';
      setStoredStrategy(value);
      onStrategyChange?.(value);
    },
    [onStrategyChange]
  );

  const handleCreate = useCallback(async () => {
    try {
      const ack = await createGame({});
      if ((ack as any).ok) {
        dispatch(setCurrentGame({ gameId: (ack as any).gameId as string }));
      }
    } catch {}
  }, [dispatch]);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} aria-label="Options Panel">
      <label htmlFor="strategy-select">Strategy</label>
      <select id="strategy-select" data-testid="strategy-select" defaultValue={current} onChange={handleChange} aria-label="Strategy select">
        <option value="random">Random</option>
        <option value="ai">AI</option>
      </select>
      <button type="button" onClick={handleCreate} data-testid="create-game-btn">
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


