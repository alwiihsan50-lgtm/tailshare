# Graph Report - tailshare  (2026-08-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 138 nodes · 205 edges · 10 communities (7 shown, 3 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6d6cc516`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.js
- main.js
- index.js
- createTailShareServer
- package.json
- ⚡ TailShare - Universal Tailscale Sync Suite (Windows & Linux)
- dependencies
- ClipboardManager
- manifest.json
- tailshare

## God Nodes (most connected - your core abstractions)
1. `createTailShareServer()` - 20 edges
2. `StorageManager` - 14 edges
3. `ClipboardManager` - 10 edges
4. `initEventListeners()` - 10 edges
5. `handleServerMessage()` - 8 edges
6. `renderClipboard()` - 8 edges
7. `renderFiles()` - 8 edges
8. `showToast()` - 7 edges
9. `⚡ TailShare - Universal Tailscale Sync Suite (Windows & Linux)` - 7 edges
10. `keywords` - 6 edges

## Surprising Connections (you probably didn't know these)
- `createTailShareServer()` --calls--> `getTailscaleInfo()`  [EXTRACTED]
  src/server/index.js → src/server/tailscale.js

## Import Cycles
- None detected.

## Communities (10 total, 3 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.21
Nodes (21): applySettingsToUI(), copyTextToClipboard(), escapeHtml(), fetchQrCode(), fetchStatus(), formatBytes(), formatTimeAgo(), getFileTypeInfo() (+13 more)

### Community 1 - "main.js"
Cohesion: 0.11
Nodes (13): electron, electron, keywords, clipboard, file-sharing, pwa, tailscale, appIconPath (+5 more)

### Community 2 - "index.js"
Cohesion: 0.13
Nodes (14): CONFIG_DIR, __dirname, __filename, getDefaultStoragePath(), HISTORY_FILE, loadClipboardHistory(), loadSettings(), LOG_FILE (+6 more)

### Community 4 - "package.json"
Cohesion: 0.14
Nodes (13): author, bin, tailshare, description, license, main, name, scripts (+5 more)

### Community 5 - "⚡ TailShare - Universal Tailscale Sync Suite (Windows & Linux)"
Cohesion: 0.14
Nodes (13): 1. Installation, 1. One-Click Installer (Auto-Start on Boot), 2. Manual Start / Commands, 2. Run Desktop App, 3. Enable 24/7 Background Service (Systemd), 3. Uninstall Auto-Start, 🌟 Key Features, 📄 License (+5 more)

### Community 6 - "dependencies"
Cohesion: 0.15
Nodes (13): cors, express, mime-types, multer, dependencies, cors, express, mime-types (+5 more)

### Community 8 - "manifest.json"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

## Knowledge Gaps
- **52 isolated node(s):** `{ contextBridge, ipcRenderer }`, `clipboard`, `file-sharing`, `pwa`, `tailscale` (+47 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createTailShareServer()` connect `createTailShareServer` to `main.js`, `index.js`, `ClipboardManager`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `keywords` connect `main.js` to `package.json`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `createTailShareServer()` (e.g. with `.sendDesktopNotification()` and `.setAutoSync()`) actually correct?**
  _`createTailShareServer()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{ contextBridge, ipcRenderer }`, `clipboard`, `file-sharing` to the rest of the system?**
  _52 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13071895424836602 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._