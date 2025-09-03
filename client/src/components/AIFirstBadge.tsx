// © 2025 Joe Pruskowski
import React from 'react';
import { useSelector } from 'react-redux';
import { selectGame } from '../store/gameSlice';

export default function AIFirstBadge(): JSX.Element | null {
  const game = useSelector(selectGame);
  const [h2h, setH2h] = React.useState<boolean>(false);
  React.useEffect(() => {
    function onMode(payload: any) {
      if (payload && typeof payload.h2h === 'boolean') setH2h(!!payload.h2h);
    }
    // Lazy import to avoid cyclic dep
    import('../socket/socketService').then((m) => {
      m.socketService.on('room:mode', onMode as any);
    });
    return () => {
      import('../socket/socketService').then((m) => {
        m.socketService.off('room:mode', onMode as any);
      });
    };
  }, []);
  // Show while AI is expected to make the opening move
  if (
    !game.gameId ||
    game.winner ||
    game.draw ||
    h2h ||
    game.myPlayer !== 'O' ||
    game.currentPlayer !== 'X'
  ) {
    return null;
  }
  return (
    <span
      className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-2 py-0.5 text-[11px] font-medium"
      title="AI will make the first move as X"
    >
      AI First
    </span>
  );
}


