# Graph Report - tailshare  (2026-08-17)

## Corpus Check
- 12 files · ~47,062 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 137 nodes · 203 edges · 10 communities (7 shown, 3 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0c050031`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- app.js
- main.js
- package.json
- createTailShareServer
- dependencies
- manifest.json
- tailshare
- ⚡ TailShare - Universal Tailscale Sync Suite (Windows & Linux)
- ClipboardManager

## God Nodes (most connected - your core abstractions)
1. `createTailShareServer()` - 19 edges
2. `StorageManager` - 14 edges
3. `ClipboardManager` - 10 edges
4. `initEventListeners()` - 9 edges
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

### Community 0 - "index.js"
Cohesion: 0.13
Nodes (14): CONFIG_DIR, __dirname, __filename, getDefaultStoragePath(), HISTORY_FILE, loadClipboardHistory(), loadSettings(), LOG_FILE (+6 more)

### Community 1 - "app.js"
Cohesion: 0.23
Nodes (21): applySettingsToUI(), copyTextToClipboard(), escapeHtml(), fetchQrCode(), fetchStatus(), formatBytes(), formatTimeAgo(), getFileTypeInfo() (+13 more)

### Community 2 - "main.js"
Cohesion: 0.12
Nodes (12): keywords, clipboard, electron, file-sharing, pwa, tailscale, appIconPath, __dirname (+4 more)

### Community 3 - "package.json"
Cohesion: 0.14
Nodes (13): author, bin, tailshare, description, license, main, name, scripts (+5 more)

### Community 5 - "dependencies"
Cohesion: 0.13
Nodes (15): cors, electron, express, mime-types, multer, dependencies, cors, electron (+7 more)

### Community 6 - "manifest.json"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

### Community 8 - "⚡ TailShare - Universal Tailscale Sync Suite (Windows & Linux)"
Cohesion: 0.14
Nodes (13): 1. Installation, 1. One-Click Installer (Auto-Start on Boot), 2. Manual Start / Commands, 2. Run Desktop App, 3. Enable 24/7 Background Service (Systemd), 3. Uninstall Auto-Start, 🌟 Key Features, 📄 License (+5 more)

## Knowledge Gaps
- **53 isolated node(s):** `name`, `version`, `description`, `main`, `type` (+48 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `keywords` connect `main.js` to `package.json`?**
  _High betweenness centrality (0.207) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `createTailShareServer()` (e.g. with `.sendDesktopNotification()` and `.setAutoSync()`) actually correct?**
  _`createTailShareServer()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _53 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13071895424836602 - nodes in this community are weakly interconnected._
- **Should `main.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._