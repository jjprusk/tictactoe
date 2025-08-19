// © 2025 Joe Pruskowski
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { StrategyOption } from '../utils/clientLogger';
import { getStoredStrategy } from '../utils/clientLogger';

export interface SessionState {
  strategy: StrategyOption;
}

const initialState: SessionState = {
  strategy: getStoredStrategy(),
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setStrategy(state, action: PayloadAction<StrategyOption>) {
      state.strategy = action.payload;
    },
  },
});

export const { setStrategy } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;

// Selectors
export const selectStrategy = (state: { session: SessionState }) => state.session.strategy;


