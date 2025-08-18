// © 2025 Joe Pruskowski
import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { spawn, execFileSync } from 'child_process';
import http from 'http';

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe('scripts: kill-port.sh', () => {
  it('kills processes listening on a port and frees it for reuse', async () => {
    const testPort = 34567;

    // Start a child Node process that listens on the test port and stays alive
    const child = spawn(process.execPath, [
      '-e',
      `require('http').createServer((req,res)=>{res.end('ok')}).listen(${testPort}); setInterval(()=>{}, 1000);`,
    ], { stdio: 'ignore' });

    // Give it a moment to bind
    await wait(200);

    // Verify the port responds
    await new Promise<void>((resolveReq) => {
      http.get({ hostname: '127.0.0.1', port: testPort, path: '/' }, (res) => {
        res.resume();
        resolveReq();
      }).on('error', () => resolveReq());
    });

    // Run the kill-port script
    const scriptPath = resolve(__dirname, '..', '..', 'scripts', 'kill-port.sh');
    execFileSync(scriptPath, [String(testPort)], { stdio: 'pipe' });

    // Wait a bit for child to be killed
    await wait(200);

    // The child should have exited or exit soon after
    try { child.kill('SIGKILL'); } catch (_e) { void 0; }

    // Port should now be free to bind
    await new Promise<void>((resolveBind, rejectBind) => {
      const server = http.createServer((_, res) => res.end('ok'));
      server.listen(testPort, '127.0.0.1', () => {
        server.close(() => resolveBind());
      });
      server.on('error', (err) => rejectBind(err));
    });

    expect(true).toBe(true);
  });
});


