// © 2025 Joe Pruskowski
import { describe, it, expect, vi } from 'vitest';
import { generateNonce } from './nonce';

describe('generateNonce', () => {
  it('produces url-safe string with prefix and time', () => {
    const orig = Date.now;
    // @ts-expect-error override for test
    Date.now = () => 1_700_000_000_000;
    try {
      const n = generateNonce('m');
      expect(n.startsWith('m-')).toBe(true);
      expect(n).toMatch(/^[a-z]+-[a-z0-9]+-[a-z0-9]+$/);
      expect(n.split('-')[1]).toBe((1_700_000_000_000).toString(36));
    } finally {
      Date.now = orig;
    }
  });

  it('entropy length affects tail length', () => {
    const n = generateNonce('x', 4);
    expect(n.split('-')[2]).toHaveLength(4);
  });
});


