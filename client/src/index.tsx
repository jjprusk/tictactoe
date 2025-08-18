// © 2025 Joe Pruskowski
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import OptionsPanel from './OptionsPanel';
import { sendLog } from './utils/clientLogger';

function App() {
  useEffect(() => {
    void sendLog({ level: 'info', message: 'client:boot', context: { ts: Date.now() } }).catch(() => void 0);
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>TicTacToe</h1>
      <OptionsPanel />
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}


