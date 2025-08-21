// © 2025 Joe Pruskowski
import type { ManagerOptions, Socket as IoSocket, SocketOptions } from 'socket.io-client';
import { io } from 'socket.io-client';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface ConnectOptions extends Partial<ManagerOptions & SocketOptions> {
  url?: string;
}

export class SocketService {
  private socket?: IoSocket;
  private status: ConnectionStatus = 'disconnected';
  private statusSubscribers: Array<(status: ConnectionStatus) => void> = [];
  private reconnectTimer?: number | undefined;
  private probeOverride?: boolean;

  getStatus(): ConnectionStatus {
    return this.status;
  }

  isConnected(): boolean {
    return !!this.socket?.connected;
  }

  subscribeStatus(subscriber: (status: ConnectionStatus) => void): () => void {
    this.statusSubscribers.push(subscriber);
    // Emit current status immediately
    subscriber(this.status);
    return () => {
      this.statusSubscribers = this.statusSubscribers.filter((s) => s !== subscriber);
    };
  }

  private setStatus(next: ConnectionStatus): void {
    this.status = next;
    for (const s of this.statusSubscribers) s(next);
  }

  connect(options: ConnectOptions = {}): IoSocket {
    if (this.socket) {
      return this.socket;
    }

    const { url, ...rest } = options;
    const target = (() => {
      if (url) return url;
      if (typeof window === 'undefined') return 'http://localhost:3001';
      const envUrl = (import.meta as any)?.env?.VITE_SERVER_URL as string | undefined;
      const lsUrl = (() => { try { return window.localStorage.getItem('ttt_socket_url') || undefined; } catch { return undefined; } })();
      const preferred = lsUrl ?? envUrl;
      return preferred ?? window.location.origin;
    })();

    this.setStatus('connecting');

    const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
    const shouldProbe = this.probeOverride ?? (((import.meta as any)?.env?.DEV) && !isTest && ((import.meta as any)?.env?.VITE_SOCKET_PRECONNECT_PROBE !== '0'));

    const buildSocket = () => io(target, {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: (import.meta as any)?.env?.VITE_SOCKET_RECONNECT_ATTEMPTS ? Number((import.meta as any).env.VITE_SOCKET_RECONNECT_ATTEMPTS) : 5,
      reconnectionDelay: (import.meta as any)?.env?.VITE_SOCKET_RECONNECT_DELAY ? Number((import.meta as any).env.VITE_SOCKET_RECONNECT_DELAY) : 500,
      reconnectionDelayMax: (import.meta as any)?.env?.VITE_SOCKET_RECONNECT_DELAY_MAX ? Number((import.meta as any).env.VITE_SOCKET_RECONNECT_DELAY_MAX) : 2000,
      randomizationFactor: (import.meta as any)?.env?.VITE_SOCKET_RANDOMIZATION_FACTOR ? Number((import.meta as any).env.VITE_SOCKET_RANDOMIZATION_FACTOR) : 0.5,
      ...rest,
    });

    const startSocket = () => {
      const socket = buildSocket();
      socket.on('connect', () => this.setStatus('connected'));
      socket.on('disconnect', () => this.setStatus('disconnected'));
      socket.on('reconnect_attempt', () => this.setStatus('connecting'));
      socket.on('reconnect', () => this.setStatus('connected'));
      socket.on('reconnect_error', () => this.setStatus('connecting'));
      socket.on('reconnect_failed', () => this.setStatus('disconnected'));
      this.socket = socket;
      return socket;
    };

    if (shouldProbe) {
      void this.probeServerHealthy(target)
        .then((ok) => {
          if (ok) {
            startSocket();
          } else {
            this.setStatus('disconnected');
            // schedule a retry probe rather than opening a noisy WS
            if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
            this.reconnectTimer = window.setTimeout(() => this.connect(options), 2000);
          }
        })
        .catch(() => {
          this.setStatus('disconnected');
          if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
          this.reconnectTimer = window.setTimeout(() => this.connect(options), 2000);
        });
      // Return a dummy-like socket reference for callers that ignore it
      // Consumers should rely on subscribeStatus to react to connectivity
      // In tests, shouldProbe is false so actual socket is returned
      // @ts-expect-error returning possibly undefined until probe completes
      return this.socket;
    }

    const socket = startSocket();
    return socket;
  }

  async disconnect(): Promise<void> {
    if (!this.socket) return;
    try {
      this.socket.disconnect();
    } finally {
      this.socket = undefined;
      this.setStatus('disconnected');
    }
  }

  on<T = unknown>(event: string, handler: (payload: T) => void): void {
    this.socket?.on(event, handler as any);
  }

  off<T = unknown>(event: string, handler: (payload: T) => void): void {
    this.socket?.off(event, handler as any);
  }

  emit<T = unknown>(event: string, payload?: T): void {
    this.socket?.emit(event, payload as any);
  }

  private async probeServerHealthy(baseUrl: string, timeoutMs = 750): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
      const u = baseUrl.replace(/\/$/, '') + '/healthz';
      const res = await fetch(u, { method: 'GET', signal: ctrl.signal });
      window.clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  // Test helper to force-enable or disable the probe path
  /* @__TEST_ONLY__ */ setProbeOverrideForTest(value: boolean | undefined): void {
    this.probeOverride = value;
  }
}

export const socketService = new SocketService();


