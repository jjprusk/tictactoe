// © 2025 Joe Pruskowski
import React from 'react';
import { useSelector } from 'react-redux';
import { selectGame } from '../store/gameSlice';
import { motion } from 'framer-motion';

export default function ResultBanner(): JSX.Element | null {
  const { winner, draw, gameId } = useSelector(selectGame);
  if (!gameId) return null;
  if (!winner && !draw) return null;

  const text = winner ? `${winner} wins!` : 'It\'s a draw.';
  const tone = winner ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200' : 'bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200';

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`rounded-md px-3 py-2 mb-2 text-sm font-semibold ${tone} border border-current/20`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      data-testid="result-banner"
    >
      {text}
    </motion.div>
  );
}


