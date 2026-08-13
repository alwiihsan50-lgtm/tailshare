import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import crypto from 'crypto';

export class StorageManager {
  constructor(customDir = null) {
    if (customDir) {
      this.downloadDir = customDir;
    } else if (os.platform() === 'win32') {
      // Check if D:\tailscale or D:\ exists on Windows
      if (fs.existsSync('D:\\tailscale')) {
        this.downloadDir = 'D:\\tailscale';
      } else if (fs.existsSync('D:\\')) {
        this.downloadDir = 'D:\\Downloads\\TailShare';
      } else {
        this.downloadDir = path.join(os.homedir(), 'Downloads', 'TailShare');
      }
    } else {
      this.downloadDir = path.join(os.homedir(), 'Downloads', 'TailShare');
    }

    this.metaFile = path.join(this.downloadDir, '.tailshare_meta.json');
    this.files = [];
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
    this.loadMeta();
  }

  loadMeta() {
    try {
      if (fs.existsSync(this.metaFile)) {
        const raw = fs.readFileSync(this.metaFile, 'utf8');
        this.files = JSON.parse(raw);
        // Verify files still exist on disk
        this.files = this.files.filter(f => fs.existsSync(f.filePath));
      } else {
        this.files = [];
      }
    } catch {
      this.files = [];
    }
  }

  saveMeta() {
    try {
      fs.writeFileSync(this.metaFile, JSON.stringify(this.files, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save metadata:', err);
    }
  }

  getFiles() {
    // Re-verify existence
    this.files = this.files.filter(f => fs.existsSync(f.filePath));
    return this.files;
  }

  getFile(id) {
    return this.files.find(f => f.id === id);
  }

  addFile({ originalName, savedName, size, mimeType, senderDevice }) {
    const filePath = path.join(this.downloadDir, savedName);
    const id = crypto.randomUUID();

    const fileRecord = {
      id,
      originalName,
      savedName,
      size,
      mimeType: mimeType || 'application/octet-stream',
      senderDevice: senderDevice || 'Unknown Device',
      filePath,
      createdAt: Date.now()
    };

    this.files.unshift(fileRecord);
    this.saveMeta();
    return fileRecord;
  }

  deleteFile(id) {
    const idx = this.files.findIndex(f => f.id === id);
    if (idx !== -1) {
      const file = this.files[idx];
      try {
        if (fs.existsSync(file.filePath)) {
          fs.unlinkSync(file.filePath);
        }
      } catch (err) {
        console.error('Failed to remove file from disk:', err);
      }
      this.files.splice(idx, 1);
      this.saveMeta();
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
