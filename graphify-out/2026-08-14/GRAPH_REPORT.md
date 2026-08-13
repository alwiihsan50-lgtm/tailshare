# Graph Report - tailshare  (2026-08-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 120 nodes · 188 edges · 8 communities (6 shown, 2 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9cbdfbbd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.js
- app.js
- main.js
- package.json
- StorageManager
- dependencies
- manifest.json
- tailshare

## God Nodes (most connected - your core abstractions)
1. `createTailShareServer()` - 19 edges
2. `StorageManager` - 14 edges
3. `ClipboardManager` - 10 edges
4. `initEventListeners()` - 9 edges
5. `handleServerMessage()` - 8 edges
6. `renderClipboard()` - 8 edges
7. `renderFiles()` - 8 edges
8. `showToast()` - 7 edges
9. `keywords` - 6 edges
10. `escapeHtml()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `createTailShareServer()` --calls--> `getTailscaleInfo()`  [EXTRACTED]
  src/server/index.js → src/server/tailscale.js

## Import Cycles
- None detected.

## Communities (8 total, 2 thin omitted)

### Community 0 - "index.js"
Cohesion: 0.12
Nodes (15): ClipboardManager, CONFIG_DIR, createTailShareServer(), __dirname, __filename, getDefaultStoragePath(), HISTORY_FILE, loadClipboardHistory() (+7 more)

### Community 1 - "app.js"
Cohesion: 0.23
Nodes (21): applySettingsToUI(), copyTextToClipboard(), escapeHtml(), fetchQrCode(), fetchStatus(), formatBytes(), formatTimeAgo(), getFileTypeInfo() (+13 more)

### Community 2 - "main.js"
Cohesion: 0.11
Nodes (13): electron, electron, keywords, clipboard, file-sharing, pwa, tailscale, appIconPath (+5 more)

### Community 3 - "package.json"
Cohesion: 0.14
Nodes (13): author, bin, tailshare, description, license, main, name, scripts (+5 more)

### Community 5 - "dependencies"
Cohesion: 0.15
Nodes (13): cors, express, mime-types, multer, dependencies, cors, express, mime-types (+5 more)

### Community 6 - "manifest.json"
Cohesion: 0.22
Nodes (8): background_color, description, display, icons, name, short_name, start_url, theme_color

## Knowledge Gaps
- **41 isolated node(s):** `CONFIG_DIR`, `__dirname`, `__filename`, `HISTORY_FILE`, `PUBLIC_DIR` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `keywords` connect `main.js` to `package.json`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Why does `createTailShareServer()` connect `index.js` to `main.js`, `StorageManager`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `createTailShareServer()` (e.g. with `.sendDesktopNotification()` and `.setAutoSync()`) actually correct?**
  _`createTailShareServer()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CONFIG_DIR`, `__dirname`, `__filename` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12307692307692308 - nodes in this community are weakly interconnected._
- **Should `main.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._