// © 2025 Joe Pruskowski
import React, { useEffect } from 'react';
import OptionsPanel from './OptionsPanel';
import { sendLog } from './utils/clientLogger';
import ConnectionStatus from './components/ConnectionStatus';
import { MotionConfig, motion, useReducedMotion } from 'framer-motion';
import Logo from './components/Logo';
import Board from './components/Board';

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
        <div className="hidden sm:block">
          <ConnectionStatus />
        </div>
      </header>
      <div className="flex items-center gap-4 sm:justify-between flex-wrap">
        <OptionsPanel />
        <div className="sm:hidden">
          <ConnectionStatus />
        </div>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Choose a strategy and then tap or click a square to play. The opponent will respond automatically. 
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
          <Board />
        </motion.section>
        <motion.section
          aria-label="Insights Panel"
          className="hidden sm:block md:col-span-1 min-h-[140px] border border-slate-200 dark:border-slate-700 rounded-md p-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut', delay: 0.05 }}
        >
          {/* Insights placeholder (S086 will replace) */}
          <div className="text-sm text-slate-500">Insights will appear here during play.</div>
        </motion.section>
      </main>
    </div>
    </MotionConfig>
  );
}

