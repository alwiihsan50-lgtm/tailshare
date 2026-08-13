import { app, BrowserWindow, Tray, Menu, ipcMain, shell, clipboard, Notification } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTailShareServer } from '../server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let tray = null;
let serverInstance = null;
let isQuitting = false;

const iconPath = path.join(__dirname, '..', 'public', 'icons', 'icon.png');

// Linux display compatibility
app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform');
app.commandLine.appendSwitch('ozone-platform-hint', 'auto');

async function createWindow(serverPort, tailscaleInfo) {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    title: 'TailShare - Native Sync',
    icon: iconPath,
    backgroundColor: '#090d16',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  const localUrl = `http://127.0.0.1:${serverPort}`;
  await mainWindow.loadURL(localUrl);

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (Notification.isSupported()) {
        new Notification({
          title: 'TailShare Running in Background',
          body: 'TailShare is still active in your system tray to sync clipboard & files.'
        }).show();
      }
    }
    return false;
  });
}

function createTray(serverPort, tailscaleInfo) {
  try {
    tray = new Tray(iconPath);
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
          }
        }
      },
      {
        label: 'Copy Web Link',
        click: () => {
          clipboard.writeText(webUrl);
          if (Notification.isSupported()) {
            new Notification({
              title: 'TailShare URL Copied',
              body: webUrl
            }).show();
          }
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

    tray.setToolTip('TailShare - Tailscale Clipboard & File Sharing');
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
    console.error('Tray creation error:', err);
  }
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
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
    let serverPort = 53317;
    let tailscaleInfo = { ip: '127.0.0.1', hostname: 'PC', peers: [] };

    try {
      serverInstance = await createTailShareServer(serverPort);
      serverPort = serverInstance.port;
      tailscaleInfo = serverInstance.tailscale;
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.log('⚡ TailShare server is already running in background. Connecting to existing instance...');
        try {
          const res = await fetch(`http://127.0.0.1:${serverPort}/api/status`);
          const data = await res.json();
          if (data.success && data.tailscale) {
            tailscaleInfo = data.tailscale;
          }
        } catch (e) {
          console.error('Failed to query existing instance:', e);
        }
      } else {
        console.error('Failed to start TailShare Desktop:', err);
      }
    }

    createTray(serverPort, tailscaleInfo);
    await createWindow(serverPort, tailscaleInfo);

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
