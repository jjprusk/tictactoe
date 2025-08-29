// © 2025 Joe Pruskowski
import React, { useEffect } from 'react';
import OptionsPanel from './OptionsPanel';
import { sendLog } from './utils/clientLogger';
import ConnectionStatus from './components/ConnectionStatus';
import { MotionConfig, motion, useReducedMotion } from 'framer-motion';
import Logo from './components/Logo';
import Board from './components/Board';
import CurrentPlayer from './components/CurrentPlayer';
import ResultBanner from './components/ResultBanner';
import ResetButton from './components/ResetButton';
import NewGameButton from './components/NewGameButton';
import ObserverNotice from './components/ObserverNotice';
import Lobby from './components/Lobby';
import DebugPanel from './components/DebugPanel';
import NoGameNotice from './components/NoGameNotice';
import OfflineBanner from './components/OfflineBanner';
import AIFirstBadge from './components/AIFirstBadge';
import GameRoomBadge from './components/GameRoomBadge';
import DebugMenu from './components/DebugMenu';

export default function App() {
  useEffect(() => {
    void sendLog({ level: 'info', message: 'client:boot', context: { ts: Date.now() } }).catch(() => void 0);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <div className="p-4 flex flex-col gap-4 max-w-5xl mx-auto">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <h1 data-testid="app-title" className="text-2xl font-semibold text-primary-700 dark:text-primary-300">TicTacToe</h1>
        </div>
        <div className="block flex items-center gap-2">
          <DebugMenu />
          <ConnectionStatus />
        </div>
      </header>
      <div className="flex items-center gap-4 sm:justify-between flex-wrap">
        <OptionsPanel />
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Choose a strategy and beginning player then select New Game. Tap or click a square to play. The opponent will respond automatically. 
        You can switch strategies at any time from the options.
      </p>
      <main className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.section
          aria-label="Game Board"
          className="md:col-span-2 min-h-[260px] border border-slate-200 dark:border-slate-700 rounded-md p-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div className="mb-2">
            <OfflineBanner />
          </div>
          <div className="mb-2">
            <NoGameNotice />
          </div>
          <div className="mb-2">
            <ObserverNotice />
          </div>
          <div className="mb-2 flex items-center justify-between">
            <CurrentPlayer />
            <AIFirstBadge />
          </div>
          <div className="flex items-center justify-between mb-2">
            <ResultBanner />
          </div>
          <Board />
          <div className="mt-2 flex items-center justify-center">
            <GameRoomBadge />
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <NewGameButton />
            <ResetButton />
          </div>
        </motion.section>
        <motion.section
          aria-label="Insights Panel"
          className="hidden sm:block md:col-span-1 min-h-[140px] border border-slate-200 dark:border-slate-700 rounded-md p-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay: 0.05 }}
        >
          <Lobby />
        </motion.section>
      </main>
      <DebugPanel />
    </div>
    </MotionConfig>
  );
}

