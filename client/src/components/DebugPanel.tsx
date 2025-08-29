// © 2025 Joe Pruskowski
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectGame } from '../store/gameSlice';

function isDebugOn(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem('ttt_debug') === '1';
  } catch {
    return false;
  }
}

export default function DebugPanel(): JSX.Element | null {
  const game = useSelector(selectGame);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    function onToggle() {
      setRev((v) => v + 1);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('ttt:debug-toggle', onToggle as any);
    }
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('ttt:debug-toggle', onToggle as any);
    };
  }, []);

  if (!isDebugOn()) return null;
  return (
    <pre
      data-testid="debug-panel"
      style={{
        position: 'fixed',
        left: 8,
        bottom: 8,
        maxWidth: '40vw',
        maxHeight: '30vh',
        overflow: 'auto',
        padding: 8,
        borderRadius: 6,
        background: 'rgba(0,0,0,0.7)',
        color: '#e2e8f0',
        fontSize: 12,
        zIndex: 9999,
      }}
    >
      {JSON.stringify(
        {
          gameId: game.gameId,
          currentPlayer: game.currentPlayer,
          lastMove: game.lastMove,
          board: game.board,
          pendingMoves: game.pendingMoves,
          role: game.role,
        },
        null,
        2
      )}
    </pre>
  );
}


