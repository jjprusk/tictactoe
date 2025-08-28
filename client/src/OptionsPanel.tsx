// © 2025 Joe Pruskowski
import React, { useCallback, useMemo, useState } from 'react';
import { getStoredStrategy, setStoredStrategy, StrategyOption } from './utils/clientLogger';
import { createGame } from './socket/clientEmitters';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentGame, setRole, setMyPlayer, applyLocalMove, selectGame } from './store/gameSlice';
import { pickRandomMove } from './game/localRules';
import { createOrResetGame } from './store/thunks';
import { socketService } from './socket/socketService';

export interface OptionsPanelProps {
  onStrategyChange?: (strategy: StrategyOption) => void;
}

type StartMode = 'ai' | 'human' | 'alternate' | '';
const START_MODE_KEY = 'ttt_start_mode';
const getStartMode = (): StartMode => {
  try {
    const v = localStorage.getItem(START_MODE_KEY) as StartMode | null;
    return v === 'ai' || v === 'alternate' || v === 'human' ? v : '';
  } catch {
    return '' as StartMode;
  }
};
const setStartMode = (v: StartMode): void => {
  try {
    if (v === '' as StartMode) {
      localStorage.removeItem(START_MODE_KEY);
    } else {
      localStorage.setItem(START_MODE_KEY, v);
    }
  } catch {}
};

export const OptionsPanel: React.FC<OptionsPanelProps> = ({ onStrategyChange }) => {
  const selectedFromStorage = useMemo(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('ttt_strategy') as string | null : null;
      if (raw === 'ai0' || raw === 'ai1' || raw === 'ai2' || raw === 'ai3') return raw as StrategyOption;
      return '' as '';
    } catch {
      return '' as '';
    }
  }, []);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyOption | ''>(selectedFromStorage);
  const [startMode, setStartModeState] = useState<StartMode>(getStartMode());
  const dispatch = useDispatch();
  const game = useSelector(selectGame);

  const handleStrategyChange = useCallback<React.ChangeEventHandler<HTMLSelectElement>>(
    (e) => {
      const value = (e.target.value as StrategyOption | '') ?? '';
      setSelectedStrategy(value);
      if (value === '') {
        try { if (typeof window !== 'undefined') window.localStorage.removeItem('ttt_strategy'); } catch {}
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ttt:session-change')); } catch {}
      } else {
        setStoredStrategy(value as StrategyOption);
        onStrategyChange?.(value as StrategyOption);
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ttt:session-change')); } catch {}
      }
    },
    [onStrategyChange]
  );

  const handleStartModeChange = useCallback<React.ChangeEventHandler<HTMLSelectElement>>((e) => {
    const v = (e.target.value as StartMode) ?? 'human';
    setStartModeState(v);
    setStartMode(v);
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ttt:session-change')); } catch {}
  }, []);

  const handleCreate = useCallback(async () => {
    try {
      await (dispatch as any)(createOrResetGame());
    } catch {}
  }, [dispatch]);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} aria-label="Options Panel">
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0,
          position: 'relative',
          border: '1px solid #CBD5E1',
          borderRadius: 8,
          paddingLeft: 10,
          paddingRight: 10,
          height: 36,
          background: '#FFFFFF',
        }}
      >
        <select
          id="strategy-select"
          data-testid="strategy-select"
          value={selectedStrategy}
          onChange={handleStrategyChange}
          aria-label="Opponent select"
          style={{
            paddingRight: 28,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            height: 24,
          }}
        >
          {selectedStrategy === '' ? (
            <option value="" disabled hidden>
              Opponent
            </option>
          ) : null}
          <option value="ai0">Basic</option>
          <option value="ai1" disabled title="Coming soon" style={{ color: '#94A3B8' }}>Average</option>
          <option value="ai2" disabled title="Coming soon" style={{ color: '#94A3B8' }}>Smart</option>
          <option value="ai3" disabled title="Coming soon" style={{ color: '#94A3B8' }}>Genius</option>
        </select>
        {selectedStrategy !== '' ? (
          <button
            type="button"
            aria-label="Clear opponent"
            title="Clear opponent"
            onClick={() => {
              setSelectedStrategy('');
              try { if (typeof window !== 'undefined') window.localStorage.removeItem('ttt_strategy'); } catch {}
              try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ttt:session-change')); } catch {}
            }}
            style={{
              position: 'absolute',
              right: 28,
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'transparent',
              padding: 0,
              width: 16,
              height: 16,
              lineHeight: '16px',
              fontSize: 13,
              cursor: 'pointer',
              color: '#64748B',
            }}
          >
            x
          </button>
        ) : null}
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0,
          position: 'relative',
          border: '1px solid #CBD5E1',
          borderRadius: 8,
          paddingLeft: 10,
          paddingRight: 10,
          height: 36,
          background: '#FFFFFF',
        }}
      >
        <select
          id="start-mode-select"
          data-testid="start-mode-select"
          value={startMode}
          onChange={handleStartModeChange}
          aria-label="Start mode select"
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            height: 24,
            paddingRight: 28,
          }}
        >
          {startMode === '' ? (
            <option value="" disabled hidden>
              Begins
            </option>
          ) : null}
          <option value="ai">AI First</option>
          <option value="human">Human First</option>
          <option value="alternate">Alternating</option>
        </select>
        {startMode !== '' ? (
          <button
            type="button"
            aria-label="Clear start mode"
            title="Clear start mode"
            onClick={() => {
              setStartModeState('');
              setStartMode('');
              try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ttt:session-change')); } catch {}
            }}
            style={{
              position: 'absolute',
              right: 28,
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'transparent',
              padding: 0,
              width: 16,
              height: 16,
              lineHeight: '16px',
              fontSize: 13,
              cursor: 'pointer',
              color: '#64748B',
            }}
          >
            x
          </button>
        ) : null}
      </div>

      {/* New Game link removed from header; use the dedicated NewGameButton below the board */}
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



