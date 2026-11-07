/* Shared helper: throwaway static server + headless Chrome/Edge over the DevTools
   protocol. No dependencies (Node 22+: global fetch + WebSocket). */
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { promises as fs, existsSync, createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const wait = ms => new Promise(r => setTimeout(r, ms));
function which(cmd) { try { execSync((process.platform === 'win32' ? 'where ' : 'which ') + cmd, { stdio: 'ignore' }); return true; } catch { return false; } }
export function findChrome(explicit) {
  if (explicit) return explicit;
  const env = process.env, pf = env.PROGRAMFILES || 'C:\\Program Files', pf86 = env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
  const candidates = process.platform === 'win32' ? [
    path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'), path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'), path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
  ] : process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium']
    : ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge'];
  for (const c of candidates) if (c.includes(path.sep) ? existsSync(c) : which(c)) return c;
  throw new Error('No Chrome/Edge found. Pass --chrome=<path>');
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.md': 'text/plain' };
export function serve(root) {
  return new Promise(resolve => {
    const srv = createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
      const file = path.normalize(path.join(root, p));
      if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}
export class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.listeners = [];
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) { const { resolve, reject } = this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result); }
      else if (msg.method) this.listeners.forEach(l => l(msg));
    });
  }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })); }
  on(fn) { this.listeners.push(fn); }
  once(method, timeout = 15000) {
    return new Promise(resolve => {
      const timer = setTimeout(() => { this.listeners = this.listeners.filter(x => x !== l); resolve(null); }, timeout);
      const l = msg => { if (msg.method === method) { clearTimeout(timer); this.listeners = this.listeners.filter(x => x !== l); resolve(msg.params); } };
      this.listeners.push(l);
    });
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
}
const wsOpen = url => new Promise((resolve, reject) => { const ws = new WebSocket(url); ws.addEventListener('open', () => resolve(ws)); ws.addEventListener('error', () => reject(new Error('websocket error ' + url))); });
async function fetchJson(url, tries = 60) { for (let i = 0; i < tries; i++) { try { const r = await fetch(url); if (r.ok) return await r.json(); } catch { /* starting */ } await wait(250); } throw new Error('browser did not answer at ' + url); }

/* Launch headless browser, serve `root`, open `pagePath` and return { page, errors, close } */
export async function launch(opts) {
  const { root, pagePath = 'index.html?mute=1', width = 1600, height = 900, chrome } = opts;
  const srv = await serve(root);
  const url = `http://127.0.0.1:${srv.address().port}/${pagePath}`;
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'slot-cdp-'));
  const debugPort = 9222 + Math.floor(Math.random() * 400);
  const proc = spawn(findChrome(chrome), ['--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, `--window-size=${width},${height}`,
    '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--mute-audio', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', 'about:blank'], { stdio: 'ignore' });
  const errors = [];
  let page = null;
  const close = async () => { try { page && page.ws.close(); } catch { /* ignore */ } proc.kill(); srv.close(); await wait(300); await fs.rm(profile, { recursive: true, force: true }).catch(() => {}); };
  try {
    await fetchJson(`http://127.0.0.1:${debugPort}/json/version`);
    const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
    page = new CDP(await wsOpen(targets.find(t => t.type === 'page').webSocketDebuggerUrl));
    await page.send('Page.enable'); await page.send('Runtime.enable'); await page.send('Log.enable');
    page.on(msg => {
      if (msg.method === 'Runtime.exceptionThrown') errors.push('exception: ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
      else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push('console.error: ' + msg.params.args.map(a => a.value || a.description).join(' '));
      else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push('log: ' + msg.params.entry.text + ' ' + (msg.params.entry.url || ''));
    });
    await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    const loaded = page.once('Page.loadEventFired');
    await page.send('Page.navigate', { url }); await loaded;
    return { page, errors, url, close, screenshot: async (file, quality = 86) => { await page.eval('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))'); const { data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality }); await fs.writeFile(file, Buffer.from(data, 'base64')); } };
  } catch (e) { await close(); throw e; }
}
