// © 2025 Joe Pruskowski
import React from 'react';
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
  if (!isDebugOn()) return null;
  const game = useSelector(selectGame);
  return (
    <pre
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


