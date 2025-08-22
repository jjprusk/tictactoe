// © 2025 Joe Pruskowski
// Configure React testing environment for act() when using happy-dom
// See: https://react.dev/reference/react/act
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Optional: polyfill matchMedia for components that query it
if (typeof window !== 'undefined' && !window.matchMedia) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Suppress noisy React testing warnings that are expected in our test harness
const origError = console.error;
const origWarn = console.warn;
const SUPPRESSED_PATTERNS = [
  'An update to',
  'act(...).',
  'not wrapped in act',
  'ReactDOMTestUtils.act is deprecated',
];
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (SUPPRESSED_PATTERNS.some((p) => msg.includes(p))) return;
  // @ts-ignore
  origError(...args);
};
console.warn = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (SUPPRESSED_PATTERNS.some((p) => msg.includes(p))) return;
  // @ts-ignore
  origWarn(...args);
};


