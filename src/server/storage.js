import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import mime from 'mime-types';

export class StorageManager {
  constructor(customDir = null) {
    if (customDir) {
      this.downloadDir = customDir;
    } else if (os.platform() === 'win32') {
      // Windows: Prioritize D:\tailshare if D: drive exists
      if (fs.existsSync('D:\\tailshare')) {
        this.downloadDir = 'D:\\tailshare';
      } else if (fs.existsSync('D:\\')) {
        this.downloadDir = 'D:\\tailshare';
      } else {
        this.downloadDir = path.join(os.homedir(), 'Downloads', 'TailShare');
      }
    } else {
      // Linux / Unix: Prioritize /media/cuker/Data/tailshare (Drive D)
      if (fs.existsSync('/media/cuker/Data/tailshare')) {
        this.downloadDir = '/media/cuker/Data/tailshare';
      } else if (fs.existsSync('/media/cuker/Data')) {
        this.downloadDir = '/media/cuker/Data/tailshare';
      } else {
        this.downloadDir = path.join(os.homedir(), 'Downloads', 'TailShare');
      }
    }

    this.metaFile = path.join(this.downloadDir, '.tailshare_meta.json');
    this.metaStore = new Map(); // filename -> { senderDevice, id, createdAt }
    this.files = [];
    this.watcher = null;
    this.watchDebounce = null;
    this.onFilesChangeCallback = null;

    this.init();
  }

  init() {
    if (!fs.existsSync(this.downloadDir)) {
      try {
        fs.mkdirSync(this.downloadDir, { recursive: true });
      } catch (e) {
        console.error('Failed to create storage dir:', e);
      }
    }

    // On Linux, symlink ~/Downloads/TailShare -> Drive D /media/cuker/Data/tailshare if available
    if (os.platform() === 'linux' && this.downloadDir === '/media/cuker/Data/tailshare') {
      try {
        const userDownloadTailShare = path.join(os.homedir(), 'Downloads', 'TailShare');
        if (!fs.existsSync(userDownloadTailShare)) {
          fs.symlinkSync(this.downloadDir, userDownloadTailShare, 'dir');
        }
      } catch (e) {
        // Ignore symlink failure
      }
    }

    this.loadMeta();
    this.scanFolder();
  }

  loadMeta() {
    try {
      if (fs.existsSync(this.metaFile)) {
        const raw = fs.readFileSync(this.metaFile, 'utf8');
        const list = JSON.parse(raw);
        for (const item of list) {
          if (item && item.savedName) {
            this.metaStore.set(item.savedName, item);
          }
        }
      }
    } catch {
      this.metaStore = new Map();
    }
  }

  saveMeta() {
    try {
      const list = Array.from(this.metaStore.values());
      fs.writeFileSync(this.metaFile, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save metadata:', err);
    }
  }

  scanFolder() {
    if (!fs.existsSync(this.downloadDir)) {
      this.files = [];
      return [];
    }

    try {
      const entries = fs.readdirSync(this.downloadDir, { withFileTypes: true });
      const currentFiles = [];

      for (const entry of entries) {
        // Skip hidden files and meta files
        if (entry.name.startsWith('.')) continue;

        if (entry.isFile()) {
          const filePath = path.join(this.downloadDir, entry.name);
          try {
            const stats = fs.statSync(filePath);
            const originalName = entry.name;
            const mimeType = mime.lookup(entry.name) || 'application/octet-stream';
            const fileId = Buffer.from(entry.name).toString('hex').slice(0, 24);

            const meta = this.metaStore.get(entry.name);
            const senderDevice = meta?.senderDevice || 'Storage (Drive D)';
            const createdAt = meta?.createdAt || Math.floor(stats.mtimeMs);

            currentFiles.push({
              id: fileId,
              originalName,
              savedName: entry.name,
              size: stats.size,
              mimeType,
              senderDevice,
              filePath,
              createdAt
            });
          } catch (err) {
            // Ignore stat errors
          }
        }
      }

      // Sort newest modified first
      currentFiles.sort((a, b) => b.createdAt - a.createdAt);
      this.files = currentFiles;
      return this.files;
    } catch (err) {
      console.error('Error scanning TailShare folder:', err);
      return [];
    }
  }

  startWatcher(onFilesChange) {
    this.onFilesChangeCallback = onFilesChange;
    if (this.watcher) return;

    try {
      this.watcher = fs.watch(this.downloadDir, (eventType, filename) => {
        if (!filename || filename.startsWith('.')) return;

        clearTimeout(this.watchDebounce);
        this.watchDebounce = setTimeout(() => {
          const updatedFiles = this.scanFolder();
          if (this.onFilesChangeCallback) {
            this.onFilesChangeCallback(updatedFiles);
          }
        }, 250);
      });
    } catch (err) {
      console.error('Failed to start folder watcher:', err);
    }
  }

  getFiles() {
    return this.scanFolder();
  }

  getFile(id) {
    this.scanFolder();
    return this.files.find(f => f.id === id);
  }

  registerUploadedFile({ originalName, savedName, size, mimeType, senderDevice }) {
    const fileId = Buffer.from(savedName).toString('hex').slice(0, 24);
    const metaRecord = {
      id: fileId,
      originalName,
      savedName,
      size,
      mimeType: mimeType || mime.lookup(savedName) || 'application/octet-stream',
      senderDevice: senderDevice || 'Mobile Device',
      filePath: path.join(this.downloadDir, savedName),
      createdAt: Date.now()
    };

    this.metaStore.set(savedName, metaRecord);
    this.saveMeta();
    this.scanFolder();
    return metaRecord;
  }

  deleteFile(id) {
    const file = this.getFile(id);
    if (file) {
      try {
        if (fs.existsSync(file.filePath)) {
          fs.unlinkSync(file.filePath);
        }
      } catch (err) {
        console.error('Failed to remove file from disk:', err);
      }
      this.metaStore.delete(file.savedName);
      this.saveMeta();
      this.scanFolder();
      return true;
    }
    return false;
  }

  openDownloadFolder() {
    return new Promise((resolve) => {
      const platform = os.platform();
      let cmd = `xdg-open "${this.downloadDir}" 2>/dev/null || true`;
      if (platform === 'win32') {
        cmd = `explorer.exe "${this.downloadDir}"`;
      } else if (platform === 'darwin') {
        cmd = `open "${this.downloadDir}"`;
      }

      exec(cmd, (err) => {
        resolve(!err);
      });
    });
  }

  openSpecificFile(id) {
    const file = this.getFile(id);
    if (!file || !fs.existsSync(file.filePath)) return Promise.resolve(false);

    return new Promise((resolve) => {
      const platform = os.platform();
      let cmd = `xdg-open "${file.filePath}" 2>/dev/null || true`;
      if (platform === 'win32') {
        cmd = `start "" "${file.filePath}"`;
      } else if (platform === 'darwin') {
        cmd = `open "${file.filePath}"`;
      }

      exec(cmd, (err) => {
        resolve(!err);
      });
    });
  }
}
