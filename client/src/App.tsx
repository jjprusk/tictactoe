// © 2025 Joe Pruskowski
import React, { useEffect } from 'react';
import OptionsPanel from './OptionsPanel';
import { sendLog } from './utils/clientLogger';

const containerStyle: React.CSSProperties = {
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const mainStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: 16,
};

export default function App() {
  useEffect(() => {
    void sendLog({ level: 'info', message: 'client:boot', context: { ts: Date.now() } }).catch(() => void 0);
  }, []);

  return (
    <div style={containerStyle}>
      <h1>TicTacToe</h1>
      <OptionsPanel />
      <main style={mainStyle}>
        <section aria-label="Game Board" style={{ minHeight: 200, border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          {/* Board placeholder (S086 will replace) */}
        </section>
        <section aria-label="Insights Panel" style={{ minHeight: 120, border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          {/* Insights placeholder (S086 will replace) */}
        </section>
      </main>
    </div>
  );
}


