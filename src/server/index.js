import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import os from 'os';
import multer from 'multer';
import QRCode from 'qrcode';
import cors from 'cors';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

import { getTailscaleInfo } from './tailscale.js';
import { ClipboardManager } from './clipboard.js';
import { StorageManager } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const CONFIG_DIR = path.join(os.homedir(), '.config', 'tailshare');

// Ensure config dir
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Config file
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');
const HISTORY_FILE = path.join(CONFIG_DIR, 'clipboard_history.json');

function loadSettings() {
  const defaults = {
    port: 53317,
    autoSyncClipboard: true,
    soundNotifications: true,
    desktopNotifications: true,
    downloadPath: path.join(os.homedir(), 'Downloads', 'TailShare')
  };
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return { ...defaults, ...data };
    }
  } catch {}
  return defaults;
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

function loadClipboardHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch {}
  return [];
}

function saveClipboardHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 100), null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save history:', err);
  }
}

export async function createTailShareServer(portOverride = null) {
  const settings = loadSettings();
  const PORT = portOverride || process.env.PORT || settings.port || 53317;

  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  const storageManager = new StorageManager(settings.downloadPath);
  let clipboardHistory = loadClipboardHistory();

  // Connected WebSockets
  const clients = new Map(); // ws -> { id, deviceName, userAgent, ip }

  // Broadcast helper
  function broadcast(type, payload, excludeWs = null) {
    const message = JSON.stringify({ type, payload, timestamp: Date.now() });
    for (const [clientWs] of clients) {
      if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(message);
      }
    }
  }

  // Clipboard Manager
  const clipboardManager = new ClipboardManager({
    autoSync: settings.autoSyncClipboard,
    onClipboardChange: (item) => {
      // Received new text from Linux local clipboard
      const existingIdx = clipboardHistory.findIndex(h => h.text === item.text);
      let newItem;

      if (existingIdx !== -1) {
        newItem = clipboardHistory[existingIdx];
        newItem.timestamp = Date.now();
        newItem.source = 'PC Clipboard';
        // Move to top
        clipboardHistory.splice(existingIdx, 1);
        clipboardHistory.unshift(newItem);
      } else {
        newItem = {
          id: crypto.randomUUID(),
          text: item.text,
          source: 'PC (Linux)',
          pinned: false,
          timestamp: Date.now()
        };
        clipboardHistory.unshift(newItem);
      }

      saveClipboardHistory(clipboardHistory);
      broadcast('clipboard:update', { item: newItem, history: clipboardHistory });
    }
  });

  clipboardManager.startMonitoring();

  // Multer Storage Configuration
  const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, storageManager.downloadDir);
    },
    filename: (req, file, cb) => {
      // Decode URI components or unicode characters properly
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const ext = path.extname(originalName);
      const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E6);
      cb(null, `${base}-${uniqueSuffix}${ext}`);
    }
  });

  const upload = multer({
    storage: multerStorage,
    limits: { fileSize: 10 * 1024 * 1024 * 1024 } // 10GB limit
  });

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(express.static(PUBLIC_DIR));

  // --- API Routes ---

  // 1. Network / Tailscale Status
  app.get('/api/status', async (req, res) => {
    try {
      const tailscale = await getTailscaleInfo();
      const clientList = Array.from(clients.values());

      res.json({
        success: true,
        tailscale,
        port: PORT,
        webUrl: `http://${tailscale.ip}:${PORT}`,
        activeClients: clientList,
        settings,
        stats: {
          clipboardCount: clipboardHistory.length,
          filesCount: storageManager.getFiles().length
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Dynamic QR Code
  app.get('/api/qr', async (req, res) => {
    try {
      const tailscale = await getTailscaleInfo();
      const targetUrl = `http://${tailscale.ip}:${PORT}`;
      const qrDataUrl = await QRCode.toDataURL(targetUrl, {
        margin: 2,
        width: 380,
        color: {
          dark: '#0f172a',
          light: '#f8fafc'
        }
      });
      res.json({ success: true, url: targetUrl, qrDataUrl });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Clipboard API
  app.get('/api/clipboard', (req, res) => {
    res.json({
      success: true,
      history: clipboardHistory
    });
  });

  app.post('/api/clipboard', async (req, res) => {
    try {
      const { text, sourceDevice, copyToPc } = req.body;
      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ success: false, error: 'Text content is required' });
      }

      const sender = sourceDevice || 'Mobile Device';
      
      // Update Linux system clipboard if requested or autoSync is on
      if (copyToPc !== false) {
        await clipboardManager.setNativeClipboard(text);
        if (settings.desktopNotifications) {
          const preview = text.length > 60 ? text.substring(0, 60) + '...' : text;
          clipboardManager.sendDesktopNotification('📋 Clipboard Received', `${sender}: ${preview}`);
        }
      }

      // Add to history
      const existingIdx = clipboardHistory.findIndex(h => h.text === text);
      let newItem;

      if (existingIdx !== -1) {
        newItem = clipboardHistory[existingIdx];
        newItem.timestamp = Date.now();
        newItem.source = sender;
        clipboardHistory.splice(existingIdx, 1);
        clipboardHistory.unshift(newItem);
      } else {
        newItem = {
          id: crypto.randomUUID(),
          text,
          source: sender,
          pinned: false,
          timestamp: Date.now()
        };
        clipboardHistory.unshift(newItem);
      }

      saveClipboardHistory(clipboardHistory);
      broadcast('clipboard:update', { item: newItem, history: clipboardHistory });

      res.json({ success: true, item: newItem });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/clipboard/pin', (req, res) => {
    const { id } = req.body;
    const item = clipboardHistory.find(h => h.id === id);
    if (item) {
      item.pinned = !item.pinned;
      // Keep pinned items sorted to top
      clipboardHistory.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      saveClipboardHistory(clipboardHistory);
      broadcast('clipboard:history', { history: clipboardHistory });
      return res.json({ success: true, item });
    }
    res.status(404).json({ success: false, error: 'Item not found' });
  });

  app.delete('/api/clipboard/:id', (req, res) => {
    const { id } = req.params;
    if (id === 'all') {
      clipboardHistory = clipboardHistory.filter(h => h.pinned);
      saveClipboardHistory(clipboardHistory);
      broadcast('clipboard:history', { history: clipboardHistory });
      return res.json({ success: true, count: clipboardHistory.length });
    }

    const idx = clipboardHistory.findIndex(h => h.id === id);
    if (idx !== -1) {
      clipboardHistory.splice(idx, 1);
      saveClipboardHistory(clipboardHistory);
      broadcast('clipboard:history', { history: clipboardHistory });
      return res.json({ success: true });
    }
    res.status(404).json({ success: false, error: 'Item not found' });
  });

  // 4. File Sharing API
  app.get('/api/files', (req, res) => {
    res.json({
      success: true,
      files: storageManager.getFiles()
    });
  });

  app.post('/api/files/upload', upload.array('files'), (req, res) => {
    try {
      const sender = req.body.senderDevice || req.headers['x-sender-device'] || 'Device';
      const uploadedRecords = [];

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: 'No files uploaded' });
      }

      for (const file of req.files) {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const record = storageManager.addFile({
          originalName,
          savedName: file.filename,
          size: file.size,
          mimeType: file.mimetype,
          senderDevice: sender
        });
        uploadedRecords.push(record);
      }

      // Notify Linux desktop
      if (settings.desktopNotifications) {
        const fileNames = uploadedRecords.map(r => r.originalName).join(', ');
        const summary = uploadedRecords.length === 1
          ? `${uploadedRecords[0].originalName} (${(uploadedRecords[0].size / 1024 / 1024).toFixed(1)} MB)`
          : `${uploadedRecords.length} files received (${fileNames})`;
        clipboardManager.sendDesktopNotification(`📁 Received from ${sender}`, summary);
      }

      broadcast('files:new', { files: uploadedRecords, allFiles: storageManager.getFiles() });
      res.json({ success: true, uploaded: uploadedRecords });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/files/download/:id', (req, res) => {
    const file = storageManager.getFile(req.params.id);
    if (!file || !fs.existsSync(file.filePath)) {
      return res.status(404).send('File not found');
    }
    res.download(file.filePath, file.originalName);
  });

  app.get('/api/files/preview/:id', (req, res) => {
    const file = storageManager.getFile(req.params.id);
    if (!file || !fs.existsSync(file.filePath)) {
      return res.status(404).send('File not found');
    }
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    fs.createReadStream(file.filePath).pipe(res);
  });

  app.delete('/api/files/:id', (req, res) => {
    const success = storageManager.deleteFile(req.params.id);
    if (success) {
      broadcast('files:deleted', { id: req.params.id, allFiles: storageManager.getFiles() });
      return res.json({ success: true });
    }
    res.status(404).json({ success: false, error: 'File not found' });
  });

  app.post('/api/files/open-folder', async (req, res) => {
    const ok = await storageManager.openDownloadFolder();
    res.json({ success: ok });
  });

  app.post('/api/files/open-file/:id', async (req, res) => {
    const ok = await storageManager.openSpecificFile(req.params.id);
    res.json({ success: ok });
  });

  // 5. Settings API
  app.get('/api/settings', (req, res) => {
    res.json({ success: true, settings });
  });

  app.post('/api/settings', (req, res) => {
    const newSettings = { ...settings, ...req.body };
    Object.assign(settings, newSettings);
    saveSettings(settings);
    clipboardManager.setAutoSync(settings.autoSyncClipboard);
    broadcast('settings:update', { settings });
    res.json({ success: true, settings });
  });

  // WebSocket connection handler
  wss.on('connection', (ws, req) => {
    const clientId = crypto.randomUUID();
    const clientIp = req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    let deviceName = 'Browser Client';

    if (/iPhone|iPad|iPod/i.test(userAgent)) deviceName = 'iPhone / iOS';
    else if (/Android/i.test(userAgent)) deviceName = 'Android Device';
    else if (/Macintosh/i.test(userAgent)) deviceName = 'Mac';
    else if (/Windows/i.test(userAgent)) deviceName = 'Windows PC';
    else if (/Linux/i.test(userAgent)) deviceName = 'Linux Client';

    clients.set(ws, {
      id: clientId,
      deviceName,
      userAgent,
      ip: clientIp,
      connectedAt: Date.now()
    });

    // Send initial sync payload
    ws.send(JSON.stringify({
      type: 'init',
      payload: {
        clientId,
        clipboardHistory,
        files: storageManager.getFiles(),
        settings
      }
    }));

    broadcast('devices:update', { clients: Array.from(clients.values()) });

    ws.on('message', async (messageRaw) => {
      try {
        const msg = JSON.parse(messageRaw.toString());
        if (msg.type === 'device:identify') {
          const clientMeta = clients.get(ws);
          if (clientMeta && msg.deviceName) {
            clientMeta.deviceName = msg.deviceName;
            broadcast('devices:update', { clients: Array.from(clients.values()) });
          }
        } else if (msg.type === 'clipboard:send') {
          const { text, sourceDevice, copyToPc } = msg.payload;
          if (text) {
            if (copyToPc !== false) {
              await clipboardManager.setNativeClipboard(text);
              if (settings.desktopNotifications) {
                const preview = text.length > 50 ? text.substring(0, 50) + '...' : text;
                clipboardManager.sendDesktopNotification('📋 Clipboard Received', `${sourceDevice || 'Device'}: ${preview}`);
              }
            }
            const newItem = {
              id: crypto.randomUUID(),
              text,
              source: sourceDevice || 'Mobile Device',
              pinned: false,
              timestamp: Date.now()
            };
            clipboardHistory.unshift(newItem);
            saveClipboardHistory(clipboardHistory);
            broadcast('clipboard:update', { item: newItem, history: clipboardHistory });
          }
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      broadcast('devices:update', { clients: Array.from(clients.values()) });
    });

    ws.on('error', () => {
      clients.delete(ws);
    });
  });

  // Catch-all route to serve SPA
  app.use((req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  return new Promise((resolve, reject) => {
    server.listen(PORT, '0.0.0.0', async () => {
      const tailscale = await getTailscaleInfo();
      console.log(`\n⚡ TailShare Server running on port ${PORT}`);
      console.log(`🌐 Tailscale URL: http://${tailscale.ip}:${PORT}`);
      if (tailscale.dnsName) {
        console.log(`🔗 MagicDNS URL: http://${tailscale.dnsName}:${PORT}`);
      }
      console.log(`📂 Storage directory: ${storageManager.downloadDir}\n`);

      resolve({
        server,
        app,
        wss,
        port: PORT,
        tailscale,
        clipboardManager,
        storageManager,
        close: () => {
          clipboardManager.stopMonitoring();
          wss.close();
          server.close();
        }
      });
    }).on('error', reject);
  });
}

// Auto start if executed directly
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  createTailShareServer().catch((err) => {
    console.error('Failed to start TailShare server:', err);
    process.exit(1);
  });
}
