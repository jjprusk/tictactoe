// © 2025 Joe Pruskowski
// Lightweight, URL-safe nonce generator for client emits

function randomString(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * alphabet.length);
    out += alphabet[idx];
  }
  return out;
}

export function generateNonce(prefix = 'n', entropy = 12): string {
  const ts = Date.now().toString(36);
  const rand = randomString(entropy);
  return `${prefix}-${ts}-${rand}`;
}


