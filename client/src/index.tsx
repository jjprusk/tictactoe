// © 2025 Joe Pruskowski
import React from 'react';
import { createRoot } from 'react-dom/client';
import OptionsPanel from './OptionsPanel';

function App() {
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


