// © 2025 Joe Pruskowski
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { sessionReducer } from './store/sessionSlice';
import { socketReducer } from './store/socketSlice';
import { gameReducer } from './store/gameSlice';

// Root reducer with session slice
const rootReducer = combineReducers({
  session: sessionReducer,
  socket: socketReducer,
  game: gameReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  // Keep defaults; we can tune middleware (serializableCheck, etc.) later if needed
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


