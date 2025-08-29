// © 2025 Joe Pruskowski
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getStoredStrategy, setStoredStrategy, StrategyOption, getStoredStartMode, setStoredStartMode } from './utils/clientLogger';
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
  const [startMode, setStartModeState] = useState<StartMode>(() => {
    try { return getStoredStartMode() as StartMode; } catch { return 'alternate' as StartMode; }
  });
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
    const v = (e.target.value as StartMode) ?? '';
    setStartModeState(v);
    try {
      if (v === '') {
        if (typeof window !== 'undefined') window.localStorage.removeItem('ttt_start_mode');
      } else {
        setStoredStartMode(v as any);
      }
    } catch {}
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ttt:session-change')); } catch {}
  }, []);

  // Reflect external changes (e.g., Debug Menu "Reset Defaults") into dropdowns
  useEffect(() => {
    function onSessionChange() {
      try {
        const rawStart = typeof window !== 'undefined' ? (window.localStorage.getItem('ttt_start_mode') as StartMode | null) : null;
        if (rawStart === 'ai' || rawStart === 'human' || rawStart === 'alternate') {
          setStartModeState(rawStart);
        } else {
          // No stored value -> show placeholder
          setStartModeState('');
        }
        const raw = typeof window !== 'undefined' ? (window.localStorage.getItem('ttt_strategy') as string | null) : null;
        const s = raw === 'ai0' || raw === 'ai1' || raw === 'ai2' || raw === 'ai3' ? (raw as StrategyOption) : ('' as '');
        setSelectedStrategy(s);
      } catch {}
    }
    if (typeof window !== 'undefined') window.addEventListener('ttt:session-change' as any, onSessionChange as any);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('ttt:session-change' as any, onSessionChange as any); };
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
              try { if (typeof window !== 'undefined') window.localStorage.removeItem('ttt_start_mode'); } catch {}
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

      {/* Debug/test actions should live only in the Debug menu */}
    </div>
  );
};

export default OptionsPanel;



