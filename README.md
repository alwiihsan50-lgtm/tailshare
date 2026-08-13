# ⚡ TailShare - Universal Tailscale Sync Suite (Windows & Linux)

**TailShare** is a fast, native desktop application and responsive Web App (PWA) designed specifically for sharing clipboard text, links, notes, and large files seamlessly across **Windows**, **Linux**, **iOS (iPhone/iPad)**, and **Android** devices over your private [Tailscale](https://tailscale.com) network.

---

## 🌟 Key Features

- 📋 **Universal Clipboard Synchronization**:
  - **Auto-Sync PC Clipboard**: Copies on Windows (`PowerShell` / `clip.exe`) or Linux (`xclip` / `wl-copy`) automatically sync to the web stream in real time.
  - **Instant Push to PC**: Tap "Kirim & Sync" on your phone to immediately copy text into the PC's native system clipboard.
  - **Clipboard History**: Searchable feed, pin important snippets, character counter, and clickable URL detection.
  - **Desktop Pop-up Notifications**: Integrated with Windows Toast Notifications & Linux `notify-send`.

- 📁 **High-Speed File Sharing**:
  - **Bi-directional Sharing**: Drag & drop files on PC or upload photos/4K videos/documents directly from your smartphone camera or photo library.
  - **No File Size Limits**: Handles multi-gigabyte transfers with real-time transfer speed (MB/s), percentage progress, and ETA.
  - **Instant Preview**: View images, videos, audio, PDF documents, and code snippets in full-screen modal without third-party tools.
  - **Native Explorer / File Manager**: 1-click "Buka Folder PC" opens Windows File Explorer (`explorer.exe`) or Linux File Manager (`xdg-open`).

- 🌐 **Tailscale Network Awareness**:
  - Automatic detection of Tailscale IPv4 (`100.x.x.x`), MagicDNS hostname, and Tailnet user.
  - Discovered peers radar showing active connection status (iPhone, Android, Windows, Linux).
  - Dynamic QR Code for pairing your smartphone camera in seconds.

- 🖥️ **Native Desktop Window & Background Service**:
  - **Windows**: Silent background execution via VBScript (`launch-silent.vbs`), 1-click installer (`install-windows.bat`), and Windows Startup auto-start.
  - **Linux**: Systemd user service (`tailshare.service`) running 24/7 with auto-restart, Desktop launcher (`.desktop`), and CLI tool (`tailshare`).
  - **System Tray Icon**: Minimizes to system tray on close for persistent, unobtrusive syncing.

---

## 🪟 Windows Setup (Windows 10 / 11)

### 1. One-Click Installer (Auto-Start on Boot)
1. Clone or download this repository on Windows:
   ```cmd
   git clone https://github.com/alwiihsan50-lgtm/tailshare.git
   cd tailshare
   ```
2. Double-click **`install-windows.bat`**.
3. The installer will:
   - Verify Node.js installation.
   - Install required npm dependencies.
   - Set up automatic background startup in your Windows Startup folder.
   - Create a **TailShare** shortcut on your Desktop.
   - Start TailShare silently in the background immediately!

### 2. Manual Start / Commands
```cmd
# Start GUI Desktop App
npm run desktop

# Start Headless Background Server
start-windows.bat
```

### 3. Uninstall Auto-Start
Double-click **`uninstall-windows.bat`** to cleanly remove the startup shortcut.

---

## 🐧 Linux Setup (Linux Mint / Ubuntu / Debian)

### 1. Installation
```bash
git clone https://github.com/alwiihsan50-lgtm/tailshare.git ~/tailshare
cd ~/tailshare
npm install

# Make CLI tool accessible globally
mkdir -p ~/.local/bin
ln -sf ~/tailshare/bin/tailshare ~/.local/bin/tailshare
```

### 2. Run Desktop App
```bash
tailshare
```
*(Or double-click the **TailShare** shortcut on your Desktop or Applications menu).*

### 3. Enable 24/7 Background Service (Systemd)
```bash
# Enable and start user service
systemctl --user enable --now tailshare

# Enable user lingering (runs even before graphical login)
loginctl enable-linger $USER
```

---

## 📱 Mobile Pairing (iPhone & Android)

1. Connect your phone to Tailscale.
2. Open Safari (iOS) or Chrome (Android) and navigate to:
   ```
   http://<YOUR_TAILSCALE_IP>:53317
   ```
   *(e.g., `http://100.110.205.27:53317` or scan the dynamic QR Code on your PC screen).*
3. **iPhone Tip (PWA)**:
   - Tap the **Share** button in Safari -> **"Add to Home Screen"**.
   - TailShare will launch as a fullscreen native app without browser URL bars.

---

## 📂 Project Architecture

```
tailshare/
├── bin/
│   └── tailshare            # Linux CLI launcher executable
├── install-windows.bat      # Windows 1-click automated installer
├── start-windows.bat        # Windows start batch script
├── launch-silent.vbs        # Windows VBScript background launcher
├── uninstall-windows.bat    # Windows uninstaller script
├── tailshare.desktop        # Linux desktop entry shortcut
├── package.json             # App manifest & dependencies
├── src/
│   ├── electron/
│   │   ├── main.js          # Electron desktop window & tray process
│   │   └── preload.js       # Secure IPC bridge
│   ├── server/
│   │   ├── index.js         # Express & WebSocket API server
│   │   ├── clipboard.js     # Universal clipboard manager (Win/Linux/Mac)
│   │   ├── storage.js       # File manager & cross-platform storage
│   │   └── tailscale.js     # Tailscale network & peer inspector
│   └── public/
│       ├── index.html       # Mobile-first responsive UI
│       ├── css/style.css    # Modern dark theme design system
│       ├── js/app.js        # Real-time WebSocket client & upload engine
│       ├── icons/           # App & tray icon assets
│       └── manifest.json    # Progressive Web App (PWA) manifest
└── README.md
```

---

## 📄 License
MIT License © 2026 Alwi Ikhsan & Antigravity AI
