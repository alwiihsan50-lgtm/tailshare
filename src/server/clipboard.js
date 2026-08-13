import { spawn, exec } from 'child_process';
import crypto from 'crypto';

export class ClipboardManager {
  constructor(options = {}) {
    this.autoSync = options.autoSync ?? true;
    this.pollInterval = options.pollInterval ?? 600;
    this.onClipboardChange = options.onClipboardChange || (() => {});
    this.lastContentHash = '';
    this.lastReceivedHash = '';
    this.lastSetTimestamp = 0;
    this.intervalId = null;
    this.isMonitoring = false;
  }

  hash(text) {
    if (!text) return '';
    return crypto.createHash('md5').update(text).digest('hex');
  }

  async getNativeClipboard() {
    return new Promise((resolve) => {
      // Try wl-paste if Wayland, else xclip, then xsel
      const isWayland = Boolean(process.env.WAYLAND_DISPLAY);
      const cmd = isWayland
        ? 'wl-paste --no-newline 2>/dev/null || xclip -selection clipboard -o 2>/dev/null'
        : 'xclip -selection clipboard -o 2>/dev/null || xsel --clipboard --output 2>/dev/null';

      exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
        if (err) {
          resolve('');
        } else {
          resolve(stdout || '');
        }
      });
    });
  }

  async setNativeClipboard(text) {
    if (typeof text !== 'string') return false;
    const textHash = this.hash(text);
    this.lastReceivedHash = textHash;
    this.lastContentHash = textHash;
    this.lastSetTimestamp = Date.now();

    return new Promise((resolve) => {
      try {
        const isWayland = Boolean(process.env.WAYLAND_DISPLAY);
        const binary = isWayland ? 'wl-copy' : 'xclip';
        const args = isWayland ? [] : ['-selection', 'clipboard'];

        const child = spawn(binary, args, {
          stdio: ['pipe', 'ignore', 'ignore'],
          detached: true
        });

        child.on('error', () => {
          // Fallback to xsel
          try {
            const fallback = spawn('xsel', ['--clipboard', '--input'], {
              stdio: ['pipe', 'ignore', 'ignore'],
              detached: true
            });
            fallback.stdin.write(text);
            fallback.stdin.end();
            fallback.unref();
            resolve(true);
          } catch {
            resolve(false);
          }
        });

        child.stdin.write(text);
        child.stdin.end();
        child.unref();
        resolve(true);
      } catch (err) {
        console.error('setNativeClipboard error:', err);
        resolve(false);
      }
    });
  }

  sendDesktopNotification(title, message) {
    try {
      const sanitizedTitle = (title || 'TailShare').replace(/"/g, '\\"');
      const sanitizedMsg = (message || '').replace(/"/g, '\\"');
      exec(`notify-send -a "TailShare" "${sanitizedTitle}" "${sanitizedMsg}" -t 4000 2>/dev/null || true`);
    } catch {
      // Ignore notification failures if headless
    }
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Initialize baseline hash so we don't immediately trigger an echo on startup
    this.getNativeClipboard().then((initial) => {
      this.lastContentHash = this.hash(initial);
    });

    this.intervalId = setInterval(async () => {
      if (!this.autoSync) return;

      // Don't poll right after an internal clipboard set
      if (Date.now() - this.lastSetTimestamp < 1200) return;

      try {
        const current = await this.getNativeClipboard();
        if (!current || !current.trim()) return;

        const currentHash = this.hash(current);
        if (currentHash !== this.lastContentHash && currentHash !== this.lastReceivedHash) {
          this.lastContentHash = currentHash;
          this.onClipboardChange({
            text: current,
            source: 'PC (Linux)',
            timestamp: Date.now()
          });
        }
      } catch {
        // Silent error
      }
    }, this.pollInterval);
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
  }

  setAutoSync(enabled) {
    this.autoSync = Boolean(enabled);
  }
}
