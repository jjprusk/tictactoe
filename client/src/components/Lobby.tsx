// © 2025 Joe Pruskowski
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { listGames, joinGame } from '../socket/clientEmitters';
import type { LobbyGameItem } from '../socket/contracts';
import { setCurrentGame, setRole, setMyPlayer } from '../store/gameSlice';
import { socketService } from '../socket/socketService';
import { useSelector } from 'react-redux';
import { selectGame } from '../store/gameSlice';

export default function Lobby(): JSX.Element {
  const dispatch = useDispatch();
  const { offline } = useSelector(selectGame);
  const [games, setGames] = useState<LobbyGameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const [hideCompleted, setHideCompleted] = useState<boolean>(true);
  const [visibleCount, setVisibleCount] = useState<number>(10);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    // When offline, do not fetch or subscribe
    if (offline) {
      setLoading(false);
      return () => {
        cancelled = true;
        mountedRef.current = false;
      };
    }
    const fetchOnce = async () => {
      try {
        setError(null);
        const ack = await listGames({});
        if (!cancelled && mountedRef.current && typeof window !== 'undefined' && ack.ok) setGames(ack.games);
      } catch (e: any) {
        if (!cancelled && mountedRef.current && typeof window !== 'undefined') setError('Unable to load lobby.');
      } finally {
        if (!cancelled && mountedRef.current && typeof window !== 'undefined') setLoading(false);
      }
    };
    void fetchOnce();
    const onLobbyUpdate = () => { void fetchOnce(); };
    try { socketService.on('lobby:update', onLobbyUpdate as any); } catch {}
    return () => {
      cancelled = true;
      mountedRef.current = false;
      try { socketService.off('lobby:update', onLobbyUpdate as any); } catch {}
    };
  }, [offline]);

  const handleJoin = async (gameId: string) => {
    try {
      if (mountedRef.current && typeof window !== 'undefined') setJoining(gameId);
      const ack = await joinGame({ gameId });
      if ((ack as any).ok) {
        dispatch(setCurrentGame({ gameId }));
        if ((ack as any).role === 'player' || (ack as any).role === 'observer') {
          dispatch(setRole((ack as any).role));
        }
        if ((ack as any).role === 'player' && (ack as any).player) {
          dispatch(setMyPlayer((ack as any).player));
        }
        const token = (ack as any).sessionToken as string | undefined;
        if (token && typeof window !== 'undefined') {
          try { window.localStorage.setItem(`ttt_session_${gameId}`, token); } catch {}
        }
      }
    } finally {
      if (mountedRef.current && typeof window !== 'undefined') setJoining(null);
    }
  };

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-700 p-3">
      <div className="font-medium mb-2">Active Games</div>
      {offline ? (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2" role="status">Lobby is unavailable while offline.</div>
      ) : loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : error ? (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2" role="alert">{error}</div>
      ) : games.length === 0 ? (
        <div className="text-sm text-slate-500">No active games.</div>
      ) : (
        <>
        <div className="mb-2 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300" aria-label="Hide completed games">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
              data-testid="hide-completed-toggle"
            />
            Hide completed
          </label>
        </div>
        <div className="overflow-x-auto" role="region" aria-label="Active games">
          <table className="w-full text-sm" role="table" aria-label="Lobby table">
            <thead role="rowgroup">
              <tr className="text-left text-slate-500" role="row">
                <th className="py-1 pr-2">Room</th>
                <th className="py-1 pr-2">Players</th>
                <th className="py-1 pr-2">Observers</th>
                <th className="py-1 pr-2">Status</th>
                <th className="py-1 pr-2">Last Active</th>
                <th className="py-1 pr-2">Actions</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {games
                .filter((g) => (hideCompleted ? g.status !== 'complete' : true))
                .slice(0, visibleCount)
                .map((g) => (
                <tr key={g.gameId} className="border-t border-slate-200 dark:border-slate-700" role="row">
                  <td className="py-1 pr-2 truncate" title={g.gameId} role="cell">{g.gameId}</td>
                  <td className="py-1 pr-2" role="cell">{g.hasX ? 'X' : '·'} / {g.hasO ? 'O' : '·'}</td>
                  <td className="py-1 pr-2" role="cell">{g.observerCount}</td>
                  <td className="py-1 pr-2" role="cell">{g.status === 'complete' ? 'Completed' : 'Active'}</td>
                  <td className="py-1 pr-2" role="cell">{new Date(g.lastActiveAt).toLocaleTimeString()}</td>
                  <td className="py-1 pr-2 flex items-center gap-2" role="cell">
                    {(() => {
                      const seatOpen = !(g.hasX && g.hasO);
                      return (
                        <button
                          type="button"
                          className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 hover:border-primary-500 disabled:opacity-50"
                          onClick={() => handleJoin(g.gameId)}
                          disabled={!seatOpen || joining === g.gameId}
                          data-testid={`join-${g.gameId}`}
                          title={seatOpen ? 'Join as player if a slot is open' : 'No player seats available'}
                          aria-label={seatOpen ? `Join game ${g.gameId} as player` : `Join disabled for game ${g.gameId}`}
                        >
                          {joining === g.gameId ? 'Joining…' : 'Join'}
                        </button>
                      );
                    })()}
                    <button
                      type="button"
                      className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 hover:border-primary-500"
                      onClick={async () => {
                        try {
                          if (mountedRef.current && typeof window !== 'undefined') setJoining(g.gameId);
                          const ack = await joinGame({ gameId: g.gameId, asObserver: true } as any);
                          if ((ack as any).ok) {
                            dispatch(setCurrentGame({ gameId: g.gameId }));
                            if ((ack as any).role === 'player' || (ack as any).role === 'observer') {
                              dispatch(setRole((ack as any).role));
                            }
                            if ((ack as any).role === 'player' && (ack as any).player) {
                              dispatch(setMyPlayer((ack as any).player));
                            }
                          }
                        } finally {
                          if (mountedRef.current && typeof window !== 'undefined') setJoining(null);
                        }
                      }}
                      disabled={joining === g.gameId}
                      data-testid={`watch-${g.gameId}`}
                      title="Watch as observer"
                      aria-label={`Watch game ${g.gameId}`}
                    >
                      Watch
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {games.filter((g) => (hideCompleted ? g.status !== 'complete' : true)).length > visibleCount ? (
          <div className="mt-2">
            <button
              type="button"
              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-600 hover:border-primary-500"
              onClick={() => setVisibleCount((n) => n + 10)}
              data-testid="lobby-load-more"
            >
              Load more
            </button>
          </div>
        ) : null}
        </>
      )}
    </div>
  );
}


