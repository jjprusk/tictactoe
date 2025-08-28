// © 2025 Joe Pruskowski

export interface SessionStoreApi {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const sessionStore: SessionStoreApi = {
  get: safeGet,
  set: safeSet,
  remove: safeRemove,
};


