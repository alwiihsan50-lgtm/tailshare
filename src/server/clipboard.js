import { spawn, exec } from 'child_process';
import crypto from 'crypto';
import os from 'os';

export class ClipboardManager {
  constructor(options = {}) {
    this.autoSync = options.autoSync ?? true;
    this.pollInterval = options.pollInterval ?? 750;
    this.onClipboardChange = options.onClipboardChange || (() => {});
    this.lastContentHash = '';
    this.lastReceivedHash = '';
    this.lastSetTimestamp = 0;
    this.intervalId = null;
    this.isMonitoring = false;
    this.platform = os.platform(); // 'win32', 'linux', 'darwin'
  }

  hash(text) {
    if (!text) return '';
    return crypto.createHash('md5').update(text).digest('hex');
  }

  async getNativeClipboard() {
    return new Promise((resolve) => {
      if (this.platform === 'win32') {
        exec('powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Get-Clipboard"', { timeout: 1500, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
          if (err || !stdout) resolve('');
          else resolve(stdout.replace(/\r\n/g, '\n').replace(/\r$/, ''));
        });
      } else if (this.platform === 'darwin') {
        exec('pbpaste', { timeout: 1500, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
          resolve(err ? '' : stdout || '');
        });
      } else {
        // Linux (Wayland or X11)
        const isWayland = Boolean(process.env.WAYLAND_DISPLAY);
        const cmd = isWayland
          ? 'wl-paste --no-newline 2>/dev/null || xclip -selection clipboard -o 2>/dev/null'
          : 'xclip -selection clipboard -o 2>/dev/null || xsel --clipboard --output 2>/dev/null';

        exec(cmd, { timeout: 1500, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
          resolve(err ? '' : stdout || '');
        });
      }
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
        if (this.platform === 'win32') {
          const cp = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', '$input | Set-Clipboard'], {
            stdio: ['pipe', 'ignore', 'ignore'],
            detached: true
          });
          cp.stdin.write(text);
          cp.stdin.end();
          cp.unref();
          resolve(true);
        } else if (this.platform === 'darwin') {
          const cp = spawn('pbcopy', [], {
            stdio: ['pipe', 'ignore', 'ignore'],
            detached: true
          });
          cp.stdin.write(text);
          cp.stdin.end();
          cp.unref();
          resolve(true);
        } else {
          // Linux
          const isWayland = Boolean(process.env.WAYLAND_DISPLAY);
          const binary = isWayland ? 'wl-copy' : 'xclip';
          const args = isWayland ? [] : ['-selection', 'clipboard'];

          const child = spawn(binary, args, {
            stdio: ['pipe', 'ignore', 'ignore'],
            detached: true
          });

          child.on('error', () => {
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
        }
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

      if (this.platform === 'win32') {
        // Windows notification via PowerShell
        const psCommand = `
          [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
          $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
          $textNodes = $template.GetElementsByTagName("text")
          $textNodes.Item(0).AppendChild($template.CreateTextNode("${sanitizedTitle}")) > $null
          $textNodes.Item(1).AppendChild($template.CreateTextNode("${sanitizedMsg}")) > $null
          $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("TailShare")
          $notification = [Windows.UI.Notifications.ToastNotification]::new($template)
          $notifier.Show($notification)
        `.replace(/\n/g, ' ');
        exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}" 2>nul || true`);
      } else if (this.platform === 'darwin') {
        exec(`osascript -e 'display notification "${sanitizedMsg}" with title "${sanitizedTitle}"' 2>/dev/null || true`);
      } else {
        // Linux
        exec(`notify-send -a "TailShare" "${sanitizedTitle}" "${sanitizedMsg}" -t 4000 2>/dev/null || true`);
      }
    } catch {
      // Ignore notification errors
    }
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // Initialize baseline hash
    this.getNativeClipboard().then((initial) => {
      this.lastContentHash = this.hash(initial);
    });

    this.intervalId = setInterval(async () => {
      if (!this.autoSync) return;

      // Don't poll right after an internal clipboard update
      if (Date.now() - this.lastSetTimestamp < 1500) return;

      try {
        const current = await this.getNativeClipboard();
        if (!current || !current.trim()) return;

        const currentHash = this.hash(current);
        if (currentHash !== this.lastContentHash && currentHash !== this.lastReceivedHash) {
          this.lastContentHash = currentHash;
          const hostLabel = this.platform === 'win32' ? 'PC (Windows)' : (this.platform === 'darwin' ? 'Mac' : 'PC (Linux)');
          this.onClipboardChange({
            text: current,
            source: hostLabel,
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
