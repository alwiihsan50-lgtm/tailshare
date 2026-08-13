import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tailshareNative', {
  isElectron: true,
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  openDownloadFolder: () => ipcRenderer.invoke('open-download-folder'),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  notify: (title, body) => ipcRenderer.invoke('notify', { title, body }),
  toggleMinimizeToTray: () => ipcRenderer.invoke('toggle-minimize-to-tray')
});
