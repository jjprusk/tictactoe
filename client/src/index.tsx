// © 2025 Joe Pruskowski
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { Provider } from 'react-redux';
import { store } from './store';
import { ThemeProvider } from './theme/ThemeProvider';
import { bindSocketToStore } from './socket/socketBindings';
import { socketService } from './socket/socketService';
import { setCurrentGame } from './store/gameSlice';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  // Bind socket status to Redux and initiate connection (will show disconnected until server available)
  bindSocketToStore();
  const overrideUrl = (() => {
    try {
      return window.localStorage.getItem('ttt_socket_url') || undefined;
    } catch {
      return undefined;
    }
  })();
  socketService.connect({ url: overrideUrl });
  root.render(
    <Provider store={store}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Provider>
  );

  // Test-only utility to set current game from E2E
  try {
    (window as any).__tttSetCurrentGame = (id: string) => store.dispatch(setCurrentGame({ gameId: id }));
  } catch {}
}


