// © 2025 Joe Pruskowski
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ConnectionStatus } from '../socket/socketService';

export interface SocketState {
  status: ConnectionStatus;
  lastError: string | null;
}

const initialState: SocketState = {
  status: 'disconnected',
  lastError: null,
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    setSocketStatus(state, action: PayloadAction<ConnectionStatus>) {
      state.status = action.payload;
    },
    setSocketError(state, action: PayloadAction<string | null>) {
      state.lastError = action.payload;
    },
  },
});

export const { setSocketStatus, setSocketError } = socketSlice.actions;
export const socketReducer = socketSlice.reducer;

export const selectSocketStatus = (state: { socket: SocketState }) => state.socket.status;
export const selectSocketError = (state: { socket: SocketState }) => state.socket.lastError;


