// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import http from 'http';
import { app } from './app';

describe('server bootstrap', () => {
  it('creates an HTTP server without throwing', () => {
    const server = http.createServer(app);
    expect(server).toBeDefined();
    server.close();
  });
});


