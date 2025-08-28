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
  private pendingHandlers: Array<{ event: string; handler: (payload: unknown) => void } > = [];
  // Persist all registered handlers so we can reattach them on reconnects
  private handlerRegistry: Map<string, Set<(payload: unknown) => void>> = new Map();
  private forcedOffline = false;

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

  getForcedOffline(): boolean {
    if (typeof window !== 'undefined') {
      try {
        const v = window.localStorage.getItem('ttt_force_offline');
        this.forcedOffline = v === '1';
      } catch {}
    }
    return this.forcedOffline;
  }

  setForcedOffline(value: boolean): void {
    this.forcedOffline = value;
    if (typeof window !== 'undefined') {
      try {
        if (value) window.localStorage.setItem('ttt_force_offline', '1');
        else window.localStorage.removeItem('ttt_force_offline');
      } catch {}
    }
    if (value) {
      void this.disconnect();
      // Ensure UI reflects offline immediately
      this.setStatus('disconnected');
    }
    if (!value) {
      // Attempt to reconnect immediately when going back online
      try {
        this.connect();
      } catch {
        // ignore
      }
    }
  }

  private setStatus(next: ConnectionStatus): void {
    this.status = next;
    // In test teardown, the DOM/window may be unavailable; avoid calling React setState handlers
    if (typeof window === 'undefined') return;
    for (const s of this.statusSubscribers) s(next);
  }

  connect(options: ConnectOptions = {}): IoSocket {
    if (this.socket) {
      return this.socket;
    }

    // Respect user-forced offline mode
    if (this.getForcedOffline()) {
      this.setStatus('disconnected');
      // @ts-expect-error returning possibly undefined to satisfy callers; they should observe status
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
      // Attach any handlers registered before the socket existed
      if (this.pendingHandlers.length > 0) {
        for (const { event, handler } of this.pendingHandlers) {
          this.socket.on(event, handler as any);
        }
        this.pendingHandlers = [];
      }
      // Reattach all persisted handlers from the registry
      if (this.handlerRegistry.size > 0) {
        for (const [event, handlers] of this.handlerRegistry.entries()) {
          for (const h of handlers) {
            this.socket.on(event, h as any);
          }
        }
      }
      return socket;
    };

    if (shouldProbe) {
      void this.probeServerHealthy(target)
        .then((ok) => {
          if (ok && !this.forcedOffline) {
            startSocket();
          } else {
            this.setStatus('disconnected');
            // schedule a retry probe rather than opening a noisy WS
            if (this.reconnectTimer) (globalThis as any).clearTimeout(this.reconnectTimer);
            this.reconnectTimer = (globalThis as any).setTimeout(() => this.connect(options), 2000);
          }
        })
        .catch(() => {
          this.setStatus('disconnected');
          if (this.reconnectTimer) (globalThis as any).clearTimeout(this.reconnectTimer);
          this.reconnectTimer = (globalThis as any).setTimeout(() => this.connect(options), 2000);
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
    // Persist in registry for future reconnects
    const set = this.handlerRegistry.get(event) ?? new Set();
    set.add(handler as any);
    this.handlerRegistry.set(event, set);
    if (this.socket) this.socket.on(event, handler as any);
    else this.pendingHandlers.push({ event, handler: handler as any });
  }

  off<T = unknown>(event: string, handler: (payload: T) => void): void {
    this.socket?.off(event, handler as any);
    const set = this.handlerRegistry.get(event);
    if (set) {
      set.delete(handler as any);
      if (set.size === 0) this.handlerRegistry.delete(event);
    }
  }

  emit<T = unknown>(event: string, payload?: T): void {
    this.socket?.emit(event, payload as any);
  }

  private async probeServerHealthy(baseUrl: string, timeoutMs = 750): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const timer = (globalThis as any).setTimeout(() => ctrl.abort(), timeoutMs);
      const u = baseUrl.replace(/\/$/, '') + '/healthz';
      const res = await fetch(u, { method: 'GET', signal: ctrl.signal });
      (globalThis as any).clearTimeout(timer);
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


