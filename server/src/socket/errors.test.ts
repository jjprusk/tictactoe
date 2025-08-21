// © 2025 Joe Pruskowski
import { describe, it, expect, vi } from 'vitest';
import type { Socket } from 'socket.io';
import { emitStandardError, ErrorCodes } from './errors';

describe('emitStandardError', () => {
  it('emits standardized error with default message', () => {
    const s = { emit: vi.fn() } as any as Socket;
    emitStandardError(s, ErrorCodes.Forbidden);
    expect((s.emit as any).mock.calls[0][0]).toBe('error');
    const payload = (s.emit as any).mock.calls[0][1];
    expect(payload).toEqual({ code: 'forbidden', message: expect.any(String) });
  });

  it('allows overriding message', () => {
    const s = { emit: vi.fn() } as any as Socket;
    emitStandardError(s, ErrorCodes.Unauthorized, 'nope');
    const payload = (s.emit as any).mock.calls[0][1];
    expect(payload).toEqual({ code: 'unauthorized', message: 'nope' });
  });
});


