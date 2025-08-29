// © 2025 Joe Pruskowski
import React, { useEffect, useRef, useState } from 'react';
import { createClientLogger, setStoredStartMode, setStoredStrategy } from '../utils/clientLogger';

type DebugMenuProps = {
  onSendTestLog?: () => void;
  onToggleDebugPanel?: () => void;
};

export default function DebugMenu({ onSendTestLog, onToggleDebugPanel }: DebugMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const logger = createClientLogger({ sampleRate: 1, staticContext: { feature: 'debug-menu' } });

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node | null;
      if (menuRef.current && !menuRef.current.contains(t) && buttonRef.current && !buttonRef.current.contains(t)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="debug-menu"
        className="text-sm px-2 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={() => setOpen((v) => !v)}
      >
        Debug
      </button>
      {open && (
        <div ref={menuRef} id="debug-menu" role="menu" aria-label="Debug actions" className="absolute right-0 mt-1 w-44 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow z-50">
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            data-testid="send-test-log"
            onClick={() => {
              setOpen(false);
              try { onSendTestLog?.(); } catch {}
              void logger.info('debug:test-log');
            }}
          >
            Send Test Log
          </button>
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => {
              setOpen(false);
              try {
                setStoredStrategy('ai0');
                setStoredStartMode('alternate' as any);
                if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ttt:session-change'));
              } catch {}
            }}
          >
            Reset Defaults
          </button>
          <button
            role="menuitem"
            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => {
              setOpen(false);
              try { onToggleDebugPanel?.(); } catch {}
              try {
                const key = 'ttt_debug';
                const current = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
                const next = current === '1' ? '0' : '1';
                if (typeof window !== 'undefined') window.localStorage.setItem(key, next);
                if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ttt:debug-toggle'));
              } catch {}
            }}
          >
            Toggle Debug Panel
          </button>
        </div>
      )}
    </div>
  );
}


