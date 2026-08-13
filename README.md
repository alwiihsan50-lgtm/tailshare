# ⚡ TailShare - Tailscale Native Sync Suite

A native desktop application & companion web app for Linux, iOS, Android, and Windows to easily share clipboard history, text, and files over your Tailscale mesh network.

---

## 🌟 Features

- 📋 **Real-time Clipboard Sync**:
  - Live clipboard stream via WebSockets.
  - PC system clipboard auto-monitoring & sync (copies on PC automatically appear on mobile).
  - 1-click "Send & Copy to PC" from mobile browser (automatically sets Linux clipboard via `xclip`/`wl-copy`).
  - Searchable clipboard history, pinned items, and character counter.
  - URL detection with 1-click open.

- 📁 **High-Speed File Sharing**:
  - Drag & drop file uploads (photos, 4K videos, documents, zip files, code).
  - Mobile camera & photo library direct upload.
  - Real-time transfer progress with speed (MB/s), ETA, and percentage.
  - In-app preview modal for images, videos, audio, PDF, and code.
  - Native "Open in Folder" (`xdg-open`) integration for Linux desktop.
  - Default storage directory: `~/Downloads/TailShare`.

- 🌐 **Tailscale Network Awareness**:
  - Automatic detection of Tailscale IP (`100.110.205.27`), MagicDNS hostname, and Tailnet user.
  - Discovered peers radar (iPhone, Windows, Android).
  - Dynamic QR Code for instant pairing with your iPhone or mobile device.

- 🖥️ **Native PC Desktop Mode & Background Daemon**:
  - Sleek Electron native desktop app with System Tray icon.
  - Native Linux desktop notifications (`notify-send`).
  - Desktop launcher icon on Desktop and Applications menu.
  - CLI command `tailshare` and systemd user service support.

---

## 🚀 How to Run

### 1. Launch the Native Desktop App:
```bash
tailshare
```
or double-click the **TailShare** icon on your Desktop / Application Menu.

### 2. Run in Headless / Background Server Mode:
```bash
tailshare --headless
```
or via Systemd:
```bash
systemctl --user enable --now tailshare
```

---

## 📱 How to Open on iPhone / Mobile:
1. Make sure your phone is connected to Tailscale.
2. Open Safari / Chrome on your phone and go to:
   ```
   http://100.110.205.27:53317
   ```
   *(Or simply scan the QR code displayed inside the TailShare desktop app with your iPhone camera).*
3. **Tip for iPhone**: Tap the **Share** button in Safari and select **"Add to Home Screen"** to use TailShare like a full native iOS app without browser bars!

---

## 🛠️ Project Structure

```
/home/cuker/tailshare/
├── bin/
│   └── tailshare            # Command-line launcher
├── src/
│   ├── electron/
│   │   ├── main.js          # Electron native window & system tray
│   │   └── preload.js       # Secure IPC bridge
│   ├── server/
│   │   ├── index.js         # Express + WebSocket API server
│   │   ├── tailscale.js     # Tailscale network & peer detector
│   │   ├── clipboard.js     # Linux clipboard watcher (xclip/wl-copy)
│   │   └── storage.js       # File uploads & metadata manager
│   └── public/
│       ├── index.html       # Responsive web UI
│       ├── css/style.css    # Modern dark theme design system
│       ├── js/app.js        # Client WebSocket & upload logic
│       ├── icons/           # App & tray icons
│       └── manifest.json    # PWA configuration
├── tailshare.desktop        # Linux desktop shortcut
└── package.json
```
