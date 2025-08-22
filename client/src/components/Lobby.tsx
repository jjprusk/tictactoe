// © 2025 Joe Pruskowski
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { listGames, joinGame } from '../socket/clientEmitters';
import { setCurrentGame, setRole } from '../store/gameSlice';

export default function Lobby(): JSX.Element {
  const dispatch = useDispatch();
  const [games, setGames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ack = await listGames({});
        if (!cancelled && ack.ok) setGames(ack.games);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleJoin = async (gameId: string) => {
    try {
      setJoining(gameId);
      const ack = await joinGame({ gameId });
      if ((ack as any).ok) {
        dispatch(setCurrentGame({ gameId }));
        if ((ack as any).role === 'player' || (ack as any).role === 'observer') {
          dispatch(setRole((ack as any).role));
        }
        const token = (ack as any).sessionToken as string | undefined;
        if (token) {
          try { window.localStorage.setItem(`ttt_session_${gameId}`, token); } catch {}
        }
      }
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-700 p-3">
      <div className="font-medium mb-2">Active Games</div>
      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : games.length === 0 ? (
        <div className="text-sm text-slate-500">No active games.</div>
      ) : (
        <ul className="space-y-2">
          {games.map((g) => (
            <li key={g} className="text-sm flex items-center justify-between gap-2">
              <span className="truncate" title={g}>{g}</span>
              <button
                type="button"
                className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 hover:border-primary-500"
                onClick={() => handleJoin(g)}
                disabled={joining === g}
                data-testid={`join-${g}`}
              >
                {joining === g ? 'Joining…' : 'Join'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


