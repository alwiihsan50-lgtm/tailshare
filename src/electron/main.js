import { app, BrowserWindow, Tray, Menu, ipcMain, shell, clipboard, Notification } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTailShareServer } from '../server/index.js';

import fs from 'fs';

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION in Electron Main:', err);
  try {
    fs.writeFileSync('/tmp/electron_crash.txt', (err && err.stack) ? err.stack : String(err));
  } catch {}
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION in Electron Main:', reason);
  try {
    fs.writeFileSync('/tmp/electron_rejection.txt', String(reason));
  } catch {}
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let tray = null;
let serverInstance = null;
let isQuitting = false;

const trayIconPath = path.join(__dirname, '..', 'public', 'icons', 'tray.png');
const appIconPath = path.join(__dirname, '..', 'public', 'icons', 'app-icon.png');

// Linux display & sandbox compatibility
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox');
  app.commandLine.appendSwitch('disable-setuid-sandbox');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}

function createWindow(serverPort, tailscaleInfo) {
  try {
    mainWindow = new BrowserWindow({
      width: 1100,
      height: 750,
      minWidth: 800,
      minHeight: 600,
      title: 'TailShare - Native Sync',
      icon: appIconPath,
      backgroundColor: '#090d16',
      autoHideMenuBar: true,
      show: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false
      }
    });

    const localUrl = `http://127.0.0.1:${serverPort}`;
    mainWindow.loadURL(localUrl).catch((err) => {
      console.error('Failed to load URL:', err);
    });

    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow.hide();
      }
      return false;
    });

    mainWindow.show();
    mainWindow.focus();
  } catch (err) {
    console.error('Error creating window:', err);
  }
}

function createTray(serverPort, tailscaleInfo) {
  try {
    tray = new Tray(trayIconPath);
    const webUrl = `http://${tailscaleInfo.ip || '127.0.0.1'}:${serverPort}`;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '⚡ TailShare (Active)',
        enabled: false
      },
      {
        label: `🌐 Web: ${tailscaleInfo.ip || 'Localhost'}:${serverPort}`,
        click: () => {
          shell.openExternal(webUrl);
        }
      },
      { type: 'separator' },
      {
        label: 'Show TailShare Window',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Open Downloads Folder',
        click: () => {
          if (serverInstance && serverInstance.storageManager) {
            serverInstance.storageManager.openDownloadFolder();
          } else {
            shell.openPath(path.join(process.env.HOME, 'Downloads', 'TailShare'));
          }
        }
      },
      {
        label: 'Copy Web Link',
        click: () => {
          clipboard.writeText(webUrl);
        }
      },
      { type: 'separator' },
      {
        label: 'Quit TailShare',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setToolTip('TailShare - Tailscale Sync');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
  } catch (err) {
    console.log('Note: System tray not supported or failed to initialize:', err.message);
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // If another instance is running, signal it and exit cleanly
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    let serverPort = 40506;
    let tailscaleInfo = { ip: '127.0.0.1', hostname: 'PC', peers: [] };

    // Check if background server is already running
    let isAlreadyRunning = false;
    try {
      const res = await fetch(`http://127.0.0.1:${serverPort}/api/status`, {
        signal: AbortSignal.timeout(800)
      });
      const data = await res.json();
      if (data.success && data.tailscale) {
        tailscaleInfo = data.tailscale;
        isAlreadyRunning = true;
      }
    } catch {}

    if (!isAlreadyRunning) {
      try {
        serverInstance = await createTailShareServer(serverPort);
        serverPort = serverInstance.port;
        tailscaleInfo = serverInstance.tailscale;
      } catch (err) {
        console.error('Failed to start server instance:', err);
      }
    }

    createWindow(serverPort, tailscaleInfo);
    createTray(serverPort, tailscaleInfo);

    // IPC Handlers
    ipcMain.handle('get-server-info', () => ({
      port: serverPort,
      tailscale: tailscaleInfo,
      downloadDir: serverInstance ? serverInstance.storageManager.downloadDir : path.join(process.env.HOME, 'Downloads', 'TailShare')
    }));

    ipcMain.handle('open-download-folder', async () => {
      if (serverInstance && serverInstance.storageManager) {
        return serverInstance.storageManager.openDownloadFolder();
      } else {
        const downloadDir = path.join(process.env.HOME, 'Downloads', 'TailShare');
        shell.openPath(downloadDir);
        return true;
      }
    });

    ipcMain.handle('open-file', (event, filePath) => {
      if (filePath) {
        shell.openPath(filePath);
        return true;
      }
      return false;
    });

    ipcMain.handle('copy-to-clipboard', (event, text) => {
      clipboard.writeText(text);
      return true;
    });

    ipcMain.handle('notify', (event, { title, body }) => {
      if (Notification.isSupported()) {
        new Notification({ title, body }).show();
      }
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
    if (serverInstance && serverInstance.close) {
      serverInstance.close();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && serverInstance) {
      createWindow(serverInstance.port, serverInstance.tailscale);
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
}
