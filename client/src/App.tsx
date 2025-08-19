// © 2025 Joe Pruskowski
import React, { useEffect } from 'react';
import OptionsPanel from './OptionsPanel';
import { sendLog } from './utils/clientLogger';

export default function App() {
  useEffect(() => {
    void sendLog({ level: 'info', message: 'client:boot', context: { ts: Date.now() } }).catch(() => void 0);
  }, []);

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">TicTacToe</h1>
      <OptionsPanel />
      <main className="grid grid-cols-1 gap-4">
        <section
          aria-label="Game Board"
          className="min-h-[200px] border border-slate-200 dark:border-slate-700 rounded-md p-3"
        >
          {/* Board placeholder (S086 will replace) */}
        </section>
        <section
          aria-label="Insights Panel"
          className="min-h-[120px] border border-slate-200 dark:border-slate-700 rounded-md p-3"
        >
          {/* Insights placeholder (S086 will replace) */}
        </section>
      </main>
    </div>
  );
}

