// © 2025 Joe Pruskowski
import React, { useCallback, useMemo } from 'react';
import { getStoredStrategy, setStoredStrategy, StrategyOption } from './utils/clientLogger';

export interface OptionsPanelProps {
  onStrategyChange?: (strategy: StrategyOption) => void;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({ onStrategyChange }) => {
  const current = useMemo(() => getStoredStrategy(), []);

  const handleChange = useCallback<React.ChangeEventHandler<HTMLSelectElement>>(
    (e) => {
      const value = (e.target.value as StrategyOption) ?? 'random';
      setStoredStrategy(value);
      onStrategyChange?.(value);
    },
    [onStrategyChange]
  );

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <label htmlFor="strategy-select">Strategy</label>
      <select id="strategy-select" defaultValue={current} onChange={handleChange}>
        <option value="random">Random</option>
        <option value="ai">AI</option>
      </select>
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


