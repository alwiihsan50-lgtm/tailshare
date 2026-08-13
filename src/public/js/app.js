/**
 * TailShare - Universal Web & Native App Client Logic
 */

(function () {
  'use strict';

  // --- State Management ---
  const state = {
    connected: false,
    ws: null,
    tailscale: null,
    port: window.location.port || 53317,
    webUrl: window.location.origin,
    qrDataUrl: null,
    clipboardHistory: [],
    files: [],
    peers: [],
    settings: {
      autoSyncClipboard: true,
      soundNotifications: true,
      desktopNotifications: true
    },
    activeTab: 'clipboard',
    searchQuery: '',
    deviceInfo: detectDeviceName()
  };

  // --- DOM Elements ---
  const el = {
    // Header
    netStatusPulse: document.getElementById('netStatusPulse'),
    deviceIdentityBadge: document.getElementById('deviceIdentityBadge'),
    headerTailscaleIp: document.getElementById('headerTailscaleIp'),
    btnCopyIpUrl: document.getElementById('btnCopyIpUrl'),
    btnOpenQrModal: document.getElementById('btnOpenQrModal'),
    btnOpenDevicesTab: document.getElementById('btnOpenDevicesTab'),
    activePeerCount: document.getElementById('activePeerCount'),

    // Navigation
    navTabs: document.querySelectorAll('.nav-tab'),
    tabPanels: document.querySelectorAll('.tab-panel'),
    clipboardBadge: document.getElementById('clipboardBadge'),
    filesBadge: document.getElementById('filesBadge'),

    // Clipboard Section
    txtClipboardInput: document.getElementById('txtClipboardInput'),
    chkAutoCopyToPc: document.getElementById('chkAutoCopyToPc'),
    charCounter: document.getElementById('charCounter'),
    detectedType: document.getElementById('detectedType'),
    btnClearComposer: document.getElementById('btnClearComposer'),
    btnSendClipboard: document.getElementById('btnSendClipboard'),
    searchClipboard: document.getElementById('searchClipboard'),
    btnClearHistory: document.getElementById('btnClearHistory'),
    clipboardFeed: document.getElementById('clipboardFeed'),
    clipboardEmptyState: document.getElementById('clipboardEmptyState'),

    // Files Section
    fileDropzone: document.getElementById('fileDropzone'),
    filePickerInput: document.getElementById('filePickerInput'),
    cameraPickerInput: document.getElementById('cameraPickerInput'),
    btnBrowseFiles: document.getElementById('btnBrowseFiles'),
    btnCameraUpload: document.getElementById('btnCameraUpload'),
    uploadProgressBox: document.getElementById('uploadProgressBox'),
    uploadingFileName: document.getElementById('uploadingFileName'),
    uploadingPercent: document.getElementById('uploadingPercent'),
    uploadProgressBarFill: document.getElementById('uploadProgressBarFill'),
    uploadSpeed: document.getElementById('uploadSpeed'),
    uploadTransferred: document.getElementById('uploadTransferred'),
    filesCountBadge: document.getElementById('filesCountBadge'),
    folderSyncBadge: document.getElementById('folderSyncBadge'),
    btnOpenDownloadsFolder: document.getElementById('btnOpenDownloadsFolder'),
    filesGrid: document.getElementById('filesGrid'),
    filesEmptyState: document.getElementById('filesEmptyState'),

    // Network / Tailscale Section
    tsNodeIp: document.getElementById('tsNodeIp'),
    tsHostname: document.getElementById('tsHostname'),
    tsDnsName: document.getElementById('tsDnsName'),
    tsAccount: document.getElementById('tsAccount'),
    qrCodeImg: document.getElementById('qrCodeImg'),
    qrTargetUrlText: document.getElementById('qrTargetUrlText'),
    btnCopyPairingUrl: document.getElementById('btnCopyPairingUrl'),
    discoveredPeersCount: document.getElementById('discoveredPeersCount'),
    btnRefreshPeers: document.getElementById('btnRefreshPeers'),
    peersGrid: document.getElementById('peersGrid'),

    // Settings Section
    settingAutoSync: document.getElementById('settingAutoSync'),
    settingDesktopNotify: document.getElementById('settingDesktopNotify'),
    settingSound: document.getElementById('settingSound'),
    settingDownloadPathText: document.getElementById('settingDownloadPathText'),
    btnOpenFolderSettings: document.getElementById('btnOpenFolderSettings'),

    // Modals & Overlays
    globalDropOverlay: document.getElementById('globalDropOverlay'),
    qrModal: document.getElementById('qrModal'),
    qrModalImg: document.getElementById('qrModalImg'),
    qrModalUrlText: document.getElementById('qrModalUrlText'),
    btnCloseQrModal: document.getElementById('btnCloseQrModal'),
    btnCopyModalUrl: document.getElementById('btnCopyModalUrl'),
    previewModal: document.getElementById('previewModal'),
    previewTitle: document.getElementById('previewTitle'),
    previewContent: document.getElementById('previewContent'),
    previewDownloadBtn: document.getElementById('previewDownloadBtn'),
    btnClosePreviewModal: document.getElementById('btnClosePreviewModal'),
    toastContainer: document.getElementById('toastContainer')
  };

  // --- Device Detection ---
  function detectDeviceName() {
    const ua = navigator.userAgent || '';
    let name = 'Web Browser';
    if (window.tailshareNative && window.tailshareNative.isElectron) {
      name = /Windows|Win32|Win64/i.test(ua) ? 'PC Native (Windows)' : 'PC Native (Linux)';
    } else if (/iPhone/i.test(ua)) {
      name = 'iPhone';
    } else if (/iPad/i.test(ua)) {
      name = 'iPad';
    } else if (/Android/i.test(ua)) {
      name = 'Android Device';
    } else if (/Macintosh/i.test(ua)) {
      name = 'Mac';
    } else if (/Windows/i.test(ua)) {
      name = 'Windows PC';
    } else if (/Linux/i.test(ua)) {
      name = 'Linux Client';
    }
    return name;
  }

  // --- Web Audio Notification Synthesizer ---
  function playAudioChime() {
    if (!state.settings.soundNotifications) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + index * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.28);
      });
    } catch (e) {
      // Audio context might require user interaction first
    }
  }

  // --- Toast System ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '⚡';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✕';

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = '0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // --- Helper Functions ---
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  function formatTimeAgo(timestamp) {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 5) return 'Baru saja';
    if (diff < 60) return `${diff}d lalu`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins}m lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    return `${days}h lalu`;
  }

  function isUrl(text) {
    return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(text.trim());
  }

  async function copyTextToClipboard(text) {
    try {
      if (window.tailshareNative && window.tailshareNative.copyToClipboard) {
        await window.tailshareNative.copyToClipboard(text);
        return true;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }

  // --- WebSocket Setup ---
  function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
      state.connected = true;
      el.netStatusPulse.style.backgroundColor = 'var(--accent-primary)';
      
      // Identify this client device to server
      state.ws.send(JSON.stringify({
        type: 'device:identify',
        deviceName: state.deviceInfo
      }));
    };

    state.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch (err) {
        console.error('WS Parse Error:', err);
      }
    };

    state.ws.onclose = () => {
      state.connected = false;
      el.netStatusPulse.style.backgroundColor = 'var(--text-muted)';
      // Reconnect after 2 seconds
      setTimeout(initWebSocket, 2000);
    };

    state.ws.onerror = () => {
      state.ws.close();
    };
  }

  function handleServerMessage(msg) {
    switch (msg.type) {
      case 'init':
        state.clipboardHistory = msg.payload.clipboardHistory || [];
        state.files = msg.payload.files || [];
        if (msg.payload.settings) {
          state.settings = { ...state.settings, ...msg.payload.settings };
          applySettingsToUI();
        }
        renderClipboard();
        renderFiles();
        break;

      case 'clipboard:update':
        if (msg.payload.history) {
          state.clipboardHistory = msg.payload.history;
        } else if (msg.payload.item) {
          state.clipboardHistory.unshift(msg.payload.item);
        }
        renderClipboard();
        playAudioChime();
        showToast('📋 Clipboard baru diterima', 'info');
        break;

      case 'clipboard:history':
        state.clipboardHistory = msg.payload.history || [];
        renderClipboard();
        break;

      case 'files:new':
      case 'files:updated':
        state.files = msg.payload.allFiles || [];
        renderFiles();
        if (msg.payload.files && msg.payload.files.length > 0) {
          playAudioChime();
          showToast('📁 Folder TailShare tersinkronisasi', 'success');
        }
        break;

      case 'files:deleted':
        state.files = msg.payload.allFiles || [];
        renderFiles();
        break;

      case 'devices:update':
        updateDevicesCount(msg.payload.clients || []);
        break;

      case 'settings:update':
        state.settings = { ...state.settings, ...msg.payload.settings };
        applySettingsToUI();
        break;
    }
  }

  function updateDevicesCount(clients) {
    const count = clients.length;
    el.activePeerCount.textContent = count === 1 ? '1 Sesi Aktif' : `${count} Sesi Aktif`;
  }

  // --- API Calls ---
  async function fetchStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success) {
        state.tailscale = data.tailscale;
        state.peers = data.tailscale.peers || [];
        state.port = data.port;
        state.webUrl = data.webUrl;
        
        // Update header & network tab
        el.headerTailscaleIp.textContent = `${data.tailscale.ip}:${data.port}`;
        el.tsNodeIp.textContent = data.tailscale.ip;
        el.tsHostname.textContent = data.tailscale.hostname;
        el.tsDnsName.textContent = data.tailscale.dnsName || '-';
        el.tsAccount.textContent = data.tailscale.user?.name ? `${data.tailscale.user.name} (${data.tailscale.user.login})` : (data.tailscale.tailnet || 'Terkoneksi');
        
        if (data.storageDir) {
          if (el.folderSyncBadge) el.folderSyncBadge.textContent = '📁 ' + data.storageDir;
          if (el.settingDownloadPathText) el.settingDownloadPathText.textContent = data.storageDir;
        }

        renderPeers();
      }
    } catch (err) {
      console.error('Fetch status error:', err);
    }
  }

  async function fetchQrCode() {
    try {
      const res = await fetch('/api/qr');
      const data = await res.json();
      if (data.success) {
        state.qrDataUrl = data.qrDataUrl;
        el.qrCodeImg.src = data.qrDataUrl;
        el.qrTargetUrlText.textContent = data.url;
        el.qrModalImg.src = data.qrDataUrl;
        el.qrModalUrlText.textContent = data.url;
      }
    } catch (err) {
      console.error('Fetch QR error:', err);
    }
  }

  // --- Render Functions ---

  function renderClipboard() {
    const query = state.searchQuery.toLowerCase().trim();
    const items = state.clipboardHistory.filter(item => {
      if (!query) return true;
      return (item.text && item.text.toLowerCase().includes(query)) ||
             (item.source && item.source.toLowerCase().includes(query));
    });

    el.clipboardBadge.textContent = state.clipboardHistory.length;

    if (items.length === 0) {
      el.clipboardFeed.innerHTML = '';
      el.clipboardEmptyState.classList.remove('hidden');
      el.clipboardFeed.appendChild(el.clipboardEmptyState);
      return;
    }

    el.clipboardEmptyState.classList.add('hidden');
    el.clipboardFeed.innerHTML = '';

    items.forEach(item => {
      const isItemUrl = isUrl(item.text);
      const card = document.createElement('div');
      card.className = `clipboard-card ${item.pinned ? 'pinned' : ''}`;
      card.dataset.id = item.id;

      card.innerHTML = `
        <div class="card-top">
          <span class="sender-tag">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
              <line x1="12" y1="18" x2="12.01" y2="18"/>
            </svg>
            ${escapeHtml(item.source || 'Device')}
          </span>
          <span class="card-timestamp">${formatTimeAgo(item.timestamp)}</span>
        </div>

        <div class="clipboard-content-text" title="Klik untuk menyalin">${escapeHtml(item.text)}</div>

        <div class="card-actions">
          <span class="card-metrics">${item.text.length} karakter</span>
          <div class="action-buttons">
            ${isItemUrl ? `
              <a href="${escapeHtml(item.text)}" target="_blank" rel="noopener noreferrer" class="btn-card-action" title="Buka Link di Tab Baru">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            ` : ''}
            <button class="btn-card-action btn-copy-card" title="Salin Teks">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button class="btn-card-action btn-pin-card ${item.pinned ? 'active' : ''}" title="${item.pinned ? 'Lepas Pin' : 'Sematkan di Atas'}">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="${item.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="17" x2="12" y2="22"/>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
              </svg>
            </button>
            <button class="btn-card-action delete-btn btn-delete-card" title="Hapus">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      `;

      // Card Copy event
      const copyBtn = card.querySelector('.btn-copy-card');
      const contentBox = card.querySelector('.clipboard-content-text');
      const handleCopy = async () => {
        const ok = await copyTextToClipboard(item.text);
        if (ok) {
          copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#10b981" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
          showToast('✓ Disalin ke clipboard!', 'success');
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            `;
          }, 1500);
        }
      };

      copyBtn.addEventListener('click', handleCopy);
      contentBox.addEventListener('click', handleCopy);

      // Pin event
      card.querySelector('.btn-pin-card').addEventListener('click', async () => {
        try {
          await fetch('/api/clipboard/pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id })
          });
        } catch (e) {
          console.error(e);
        }
      });

      // Delete event
      card.querySelector('.btn-delete-card').addEventListener('click', async () => {
        try {
          await fetch(`/api/clipboard/${item.id}`, { method: 'DELETE' });
        } catch (e) {
          console.error(e);
        }
      });

      el.clipboardFeed.appendChild(card);
    });
  }

  function getFileTypeInfo(mimeType, filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (/image\/(jpeg|png|gif|webp|svg|avif)/i.test(mimeType) || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return { type: 'image', icon: '🖼️', previewable: true };
    }
    if (/video\/(mp4|webm|quicktime|mkv)/i.test(mimeType) || ['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
      return { type: 'video', icon: '🎬', previewable: true };
    }
    if (/audio\/(mp3|wav|ogg|aac|m4a)/i.test(mimeType) || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      return { type: 'audio', icon: '🎵', previewable: true };
    }
    if (/pdf/i.test(mimeType) || ext === 'pdf') {
      return { type: 'pdf', icon: '📄', previewable: true };
    }
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) {
      return { type: 'archive', icon: '📦', previewable: false };
    }
    if (['js', 'ts', 'py', 'json', 'html', 'css', 'sh', 'c', 'cpp', 'rs', 'go'].includes(ext)) {
      return { type: 'code', icon: '💻', previewable: true };
    }
    return { type: 'document', icon: '📁', previewable: false };
  }

  function renderFiles() {
    el.filesBadge.textContent = state.files.length;
    el.filesCountBadge.textContent = `${state.files.length} File`;

    if (state.files.length === 0) {
      el.filesGrid.innerHTML = '';
      el.filesEmptyState.classList.remove('hidden');
      el.filesGrid.appendChild(el.filesEmptyState);
      return;
    }

    el.filesEmptyState.classList.add('hidden');
    el.filesGrid.innerHTML = '';

    state.files.forEach(file => {
      const typeInfo = getFileTypeInfo(file.mimeType, file.originalName);
      const isImg = typeInfo.type === 'image';
      const isElectron = window.tailshareNative && window.tailshareNative.isElectron;

      const card = document.createElement('div');
      card.className = 'file-card';
      card.dataset.id = file.id;

      card.innerHTML = `
        ${isImg ? `
          <img src="/api/files/preview/${file.id}" alt="${escapeHtml(file.originalName)}" class="file-preview-thumb" loading="lazy" title="Klik untuk melihat foto langsung">
        ` : ''}

        <div class="file-card-header file-clickable-header" title="Klik untuk membuka / melihat file">
          <div class="file-type-icon">${typeInfo.icon}</div>
          <div class="file-meta-col">
            <div class="file-name-text" title="${escapeHtml(file.originalName)}">${escapeHtml(file.originalName)}</div>
            <div class="file-submeta">
              <span>${formatBytes(file.size)}</span> • <span>${escapeHtml(file.senderDevice)}</span> • <span>${formatTimeAgo(file.createdAt)}</span>
            </div>
          </div>
        </div>

        <div class="file-card-footer">
          <div class="file-actions">
            ${typeInfo.previewable ? `
              <button class="btn btn-primary btn-sm btn-preview-file" title="Buka dan lihat langsung di browser">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <span>Buka</span>
              </button>
            ` : `
              <a href="/api/files/download/${file.id}" class="btn btn-secondary btn-sm" download="${escapeHtml(file.originalName)}" title="Unduh File">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Unduh</span>
              </a>
            `}

            ${typeInfo.previewable ? `
              <a href="/api/files/download/${file.id}" class="btn btn-ghost btn-sm" download="${escapeHtml(file.originalName)}" title="Simpan / Download File">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </a>
            ` : ''}

            ${isElectron ? `
              <button class="btn btn-ghost btn-sm btn-open-local" title="Buka dengan Aplikasi PC">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </button>
            ` : ''}
          </div>

          <button class="btn-card-action delete-btn btn-delete-file" title="Hapus File">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      `;

      // Preview Thumbnail Click
      const thumb = card.querySelector('.file-preview-thumb');
      if (thumb) {
        thumb.addEventListener('click', () => openPreviewModal(file, typeInfo));
      }

      // Header click to open preview
      const headerClick = card.querySelector('.file-clickable-header');
      if (headerClick) {
        headerClick.addEventListener('click', () => openPreviewModal(file, typeInfo));
      }

      // Preview Button Click
      const previewBtn = card.querySelector('.btn-preview-file');
      if (previewBtn) {
        previewBtn.addEventListener('click', () => openPreviewModal(file, typeInfo));
      }

      // Open Local Native (Electron)
      const openLocalBtn = card.querySelector('.btn-open-local');
      if (openLocalBtn && isElectron) {
        openLocalBtn.addEventListener('click', async () => {
          await window.tailshareNative.openFile(file.filePath);
        });
      }

      // Delete File Click
      card.querySelector('.btn-delete-file').addEventListener('click', async () => {
        if (confirm(`Hapus file "${file.originalName}"?`)) {
          try {
            await fetch(`/api/files/${file.id}`, { method: 'DELETE' });
            showToast('File dihapus', 'info');
          } catch (e) {
            console.error(e);
          }
        }
      });

      el.filesGrid.appendChild(card);
    });
  }

  function openPreviewModal(file, typeInfo) {
    el.previewTitle.textContent = file.originalName;
    el.previewDownloadBtn.href = `/api/files/download/${file.id}`;
    el.previewDownloadBtn.setAttribute('download', file.originalName);
    el.previewContent.innerHTML = '';

    if (typeInfo.type === 'image') {
      const img = document.createElement('img');
      img.src = `/api/files/preview/${file.id}`;
      img.alt = file.originalName;
      el.previewContent.appendChild(img);
    } else if (typeInfo.type === 'video') {
      const video = document.createElement('video');
      video.src = `/api/files/preview/${file.id}`;
      video.controls = true;
      video.autoplay = true;
      el.previewContent.appendChild(video);
    } else if (typeInfo.type === 'audio') {
      const audio = document.createElement('audio');
      audio.src = `/api/files/preview/${file.id}`;
      audio.controls = true;
      audio.autoplay = true;
      el.previewContent.appendChild(audio);
    } else if (typeInfo.type === 'pdf') {
      const iframe = document.createElement('iframe');
      iframe.src = `/api/files/preview/${file.id}`;
      iframe.style.width = '100%';
      iframe.style.height = '65vh';
      iframe.style.border = 'none';
      el.previewContent.appendChild(iframe);
    } else {
      // Code or text
      fetch(`/api/files/preview/${file.id}`)
        .then(res => res.text())
        .then(text => {
          const pre = document.createElement('pre');
          pre.className = 'clipboard-content-text';
          pre.style.maxHeight = '65vh';
          pre.textContent = text;
          el.previewContent.appendChild(pre);
        });
    }

    el.previewModal.classList.remove('hidden');
  }

  function renderPeers() {
    el.discoveredPeersCount.textContent = `${state.peers.length} Terdeteksi`;
    el.peersGrid.innerHTML = '';

    if (state.peers.length === 0) {
      el.peersGrid.innerHTML = `
        <div class="empty-state">
          <p>Tidak ada perangkat peer Tailscale lain yang terdeteksi saat ini.</p>
        </div>
      `;
      return;
    }

    state.peers.forEach(peer => {
      const card = document.createElement('div');
      card.className = 'peer-card';

      let osIcon = '💻';
      if (peer.os === 'iOS') osIcon = '📱';
      else if (peer.os === 'android') osIcon = '🤖';
      else if (peer.os === 'windows') osIcon = '🪟';
      else if (peer.os === 'linux') osIcon = '🐧';
      else if (peer.os === 'macOS' || peer.os === 'darwin') osIcon = '🍎';

      card.innerHTML = `
        <div class="peer-os-icon">${osIcon}</div>
        <div class="peer-info-col">
          <div class="peer-name">${escapeHtml(peer.name)}</div>
          <div class="peer-ip">${escapeHtml(peer.ip)}</div>
        </div>
        <span class="peer-status-pill ${peer.online ? 'online' : 'offline'}">
          ${peer.online ? 'Online' : 'Offline'}
        </span>
      `;
      el.peersGrid.appendChild(card);
    });
  }

  function applySettingsToUI() {
    el.settingAutoSync.checked = Boolean(state.settings.autoSyncClipboard);
    el.settingDesktopNotify.checked = Boolean(state.settings.desktopNotifications);
    el.settingSound.checked = Boolean(state.settings.soundNotifications);
  }

  // --- Upload Files Handler ---
  function uploadFiles(files) {
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('senderDevice', state.deviceInfo);

    const firstFileName = files[0].name;
    const totalCount = files.length;
    const title = totalCount === 1 ? firstFileName : `${firstFileName} + ${totalCount - 1} file`;

    el.uploadingFileName.textContent = `Mengupload ${title}...`;
    el.uploadProgressBarFill.style.width = '0%';
    el.uploadingPercent.textContent = '0%';
    el.uploadProgressBox.classList.remove('hidden');

    const startTime = Date.now();
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        el.uploadProgressBarFill.style.width = `${percent}%`;
        el.uploadingPercent.textContent = `${percent}%`;

        const elapsedSec = (Date.now() - startTime) / 1000;
        if (elapsedSec > 0.3) {
          const speedBytesPerSec = event.loaded / elapsedSec;
          el.uploadSpeed.textContent = `${formatBytes(speedBytesPerSec)}/s`;
        }
        el.uploadTransferred.textContent = `${formatBytes(event.loaded)} / ${formatBytes(event.total)}`;
      }
    };

    xhr.onload = () => {
      el.uploadProgressBox.classList.add('hidden');
      if (xhr.status >= 200 && xhr.status < 300) {
        showToast('✓ Berhasil dikirim!', 'success');
        playAudioChime();
      } else {
        showToast('Gagal mengupload file', 'error');
      }
    };

    xhr.onerror = () => {
      el.uploadProgressBox.classList.add('hidden');
      showToast('Koneksi upload terputus', 'error');
    };

    xhr.open('POST', '/api/files/upload', true);
    xhr.send(formData);
  }

  // --- Event Listeners ---

  function initEventListeners() {
    // Navigation Tabs
    el.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        state.activeTab = tabName;

        el.navTabs.forEach(t => t.classList.remove('active'));
        el.tabPanels.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const activePanel = document.getElementById(`tab-${tabName}`);
        if (activePanel) activePanel.classList.add('active');
      });
    });

    el.btnOpenDevicesTab.addEventListener('click', () => {
      document.querySelector('[data-tab="network"]').click();
    });

    // Copy Tailscale URL
    const handleCopyUrl = async () => {
      const target = state.webUrl;
      const ok = await copyTextToClipboard(target);
      if (ok) showToast('✓ URL Tailscale disalin!', 'success');
    };

    el.btnCopyIpUrl.addEventListener('click', handleCopyUrl);
    el.btnCopyPairingUrl.addEventListener('click', handleCopyUrl);
    el.btnCopyModalUrl.addEventListener('click', handleCopyUrl);

    // QR Modal Toggle
    el.btnOpenQrModal.addEventListener('click', () => {
      el.qrModal.classList.remove('hidden');
    });

    el.btnCloseQrModal.addEventListener('click', () => {
      el.qrModal.classList.add('hidden');
    });

    el.qrModal.addEventListener('click', (e) => {
      if (e.target === el.qrModal) el.qrModal.classList.add('hidden');
    });

    // Preview Modal Close
    el.btnClosePreviewModal.addEventListener('click', () => {
      el.previewModal.classList.add('hidden');
      el.previewContent.innerHTML = '';
    });

    el.previewModal.addEventListener('click', (e) => {
      if (e.target === el.previewModal) {
        el.previewModal.classList.add('hidden');
        el.previewContent.innerHTML = '';
      }
    });

    // Textarea input character count & type detection
    el.txtClipboardInput.addEventListener('input', () => {
      const val = el.txtClipboardInput.value;
      el.charCounter.textContent = `${val.length} karakter`;
      if (isUrl(val)) {
        el.detectedType.textContent = 'Link URL';
      } else if (/[\{\}\[\]\(\);=><]/.test(val) && val.includes('\n')) {
        el.detectedType.textContent = 'Kode / Script';
      } else {
        el.detectedType.textContent = 'Teks Biasa';
      }
    });

    el.btnClearComposer.addEventListener('click', () => {
      el.txtClipboardInput.value = '';
      el.charCounter.textContent = '0 karakter';
      el.detectedType.textContent = 'Teks Biasa';
      el.txtClipboardInput.focus();
    });

    // Send Clipboard
    el.btnSendClipboard.addEventListener('click', async () => {
      const text = el.txtClipboardInput.value.trim();
      if (!text) {
        showToast('Ketik teks terlebih dahulu', 'error');
        return;
      }

      const autoCopy = el.chkAutoCopyToPc.checked;

      try {
        const res = await fetch('/api/clipboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            sourceDevice: state.deviceInfo,
            copyToPc: autoCopy
          })
        });

        if (res.ok) {
          el.txtClipboardInput.value = '';
          el.charCounter.textContent = '0 karakter';
          showToast('✓ Terkirim & Tersinkronisasi!', 'success');
        }
      } catch (err) {
        showToast('Gagal mengirim teks', 'error');
      }
    });

    // Search Clipboard
    el.searchClipboard.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderClipboard();
    });

    // Clear History
    el.btnClearHistory.addEventListener('click', async () => {
      if (confirm('Hapus riwayat clipboard yang tidak dipin?')) {
        try {
          await fetch('/api/clipboard/all', { method: 'DELETE' });
          showToast('Riwayat dibersihkan', 'info');
        } catch (e) {
          console.error(e);
        }
      }
    });

    // File Browse & Upload
    el.btnBrowseFiles.addEventListener('click', () => {
      el.filePickerInput.click();
    });

    el.btnCameraUpload.addEventListener('click', () => {
      el.cameraPickerInput.click();
    });

    el.filePickerInput.addEventListener('change', (e) => {
      uploadFiles(e.target.files);
      el.filePickerInput.value = '';
    });

    el.cameraPickerInput.addEventListener('change', (e) => {
      uploadFiles(e.target.files);
      el.cameraPickerInput.value = '';
    });

    // Open Downloads Folder (Native / Server)
    const handleOpenFolder = async () => {
      try {
        if (window.tailshareNative && window.tailshareNative.openDownloadFolder) {
          await window.tailshareNative.openDownloadFolder();
        } else {
          await fetch('/api/files/open-folder', { method: 'POST' });
        }
        showToast('Membuka folder TailShare...', 'info');
      } catch (e) {
        console.error(e);
      }
    };

    el.btnOpenDownloadsFolder.addEventListener('click', handleOpenFolder);
    el.btnOpenFolderSettings.addEventListener('click', handleOpenFolder);

    // Refresh peers button
    el.btnRefreshPeers.addEventListener('click', async () => {
      await fetchStatus();
      showToast('Status diperbarui', 'info');
    });

    // Settings switches
    el.settingAutoSync.addEventListener('change', async (e) => {
      state.settings.autoSyncClipboard = e.target.checked;
      await saveSettings();
    });

    el.settingDesktopNotify.addEventListener('change', async (e) => {
      state.settings.desktopNotifications = e.target.checked;
      await saveSettings();
    });

    el.settingSound.addEventListener('change', async (e) => {
      state.settings.soundNotifications = e.target.checked;
      if (e.target.checked) playAudioChime();
      await saveSettings();
    });

    async function saveSettings() {
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state.settings)
        });
      } catch (err) {
        console.error('Settings save error:', err);
      }
    }

    // Drag and drop listeners
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      el.globalDropOverlay.classList.remove('hidden');
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        el.globalDropOverlay.classList.add('hidden');
      }
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      el.globalDropOverlay.classList.add('hidden');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    });
  }

  // --- Initialization ---
  async function init() {
    el.deviceIdentityBadge.textContent = state.deviceInfo;
    initWebSocket();
    initEventListeners();
    await fetchStatus();
    await fetchQrCode();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
