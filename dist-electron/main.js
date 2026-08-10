// electron/main.ts
import { app as app4, BrowserWindow as BrowserWindow3, ipcMain as ipcMain2, dialog as dialog3, clipboard, protocol, net } from "electron";
import path3 from "path";
import fs3 from "fs/promises";
import existsSync from "fs";
import { fileURLToPath, pathToFileURL } from "url";

// electron/sqliteService.ts
import path from "path";
import fs from "fs";
import { app } from "electron";
var SQLiteService = class {
  constructor() {
    this.db = null;
    this.dbPath = "";
    this.isInitialized = false;
    this.isSaveLocked = false;
  }
  setSaveLocked(locked) {
    this.isSaveLocked = locked;
  }
  close() {
    if (this.db) {
      try {
        if (typeof this.db.close === "function") {
          this.db.close();
        }
      } catch (e) {
        console.error("[SQLiteService] Error closing database:", e);
      }
      this.db = null;
      this.isInitialized = false;
    }
  }
  async init(targetDbPath) {
    if (targetDbPath) {
      this.dbPath = targetDbPath;
    } else if (!this.dbPath) {
      const userDataPath = app?.getPath ? app.getPath("userData") : path.join(process.cwd(), ".app-data");
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      this.dbPath = path.join(userDataPath, "workspace.sqlite");
    }
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    try {
      const { DatabaseSync } = await import("node:sqlite");
      const nativeDb = new DatabaseSync(this.dbPath);
      try {
        nativeDb.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
      } catch {
      }
      this.db = {
        exec: (sql) => nativeDb.exec(sql),
        prepare: (sql) => {
          const stmt = nativeDb.prepare(sql);
          return {
            get: (...args) => stmt.get(...args),
            all: (...args) => stmt.all(...args),
            run: (...args) => stmt.run(...args)
          };
        },
        close: () => {
          try {
            if (typeof nativeDb.close === "function") {
              nativeDb.close();
            }
          } catch (err) {
            console.error("[SQLiteService] Native DB close error:", err);
          }
        }
      };
    } catch (e) {
      try {
        const BetterSqlite3 = (await import("better-sqlite3")).default;
        const nativeDb = new BetterSqlite3(this.dbPath);
        nativeDb.pragma("journal_mode = WAL");
        nativeDb.pragma("busy_timeout = 5000");
        this.db = {
          exec: (sql) => nativeDb.exec(sql),
          prepare: (sql) => {
            const stmt = nativeDb.prepare(sql);
            return {
              get: (...args) => stmt.get(...args),
              all: (...args) => stmt.all(...args),
              run: (...args) => stmt.run(...args)
            };
          },
          close: () => {
            try {
              if (typeof nativeDb.close === "function") {
                nativeDb.close();
              }
            } catch (err) {
              console.error("[SQLiteService] Native DB close error:", err);
            }
          }
        };
      } catch (err) {
        console.error("[SQLiteService] Failed to initialize SQLite engine:", err);
      }
    }
    this.setupTables();
    this.isInitialized = true;
  }
  async switchDatabase(newDbPath, isNewWorkspace = false, workspaceName) {
    this.isSaveLocked = true;
    this.close();
    this.dbPath = newDbPath;
    await this.init(newDbPath);
    if (isNewWorkspace) {
      try {
        this.db?.exec("DELETE FROM kv_store; DELETE FROM pages; DELETE FROM blocks;");
      } catch {
      }
      this.initializeCleanWorkspace(workspaceName);
    }
  }
  initializeCleanWorkspace(workspaceName) {
    if (!this.db) return "";
    const pageId = `page-${Date.now()}`;
    const blockId = `block-${Date.now()}`;
    const now = Date.now();
    const cleanSnapshot = {
      version: 1,
      timestamp: now,
      pages: [
        {
          id: pageId,
          title: "Untitled",
          icon: "\u{1F4C4}",
          coverImage: null,
          parentId: null,
          children: [],
          blocks: [
            {
              id: blockId,
              type: "heading",
              data: { text: "Untitled", level: 1 }
            }
          ],
          createdAt: now,
          updatedAt: now
        }
      ],
      activePageId: pageId,
      sidebarOpen: true
    };
    const jsonStr = JSON.stringify(cleanSnapshot);
    try {
      const stmt = this.db.prepare(
        "INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)"
      );
      stmt.run("notion_workspace_v1", jsonStr, now);
      this.syncStructuredTables(jsonStr);
    } catch (e) {
      console.error("[SQLiteService] Failed to initialize clean workspace snapshot:", e);
    }
    return jsonStr;
  }
  setupTables() {
    if (!this.db) return;
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        title TEXT,
        parent_id TEXT,
        children TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        last_opened_at INTEGER,
        is_favorite INTEGER,
        favorite_order INTEGER,
        is_deleted INTEGER,
        deleted_at INTEGER,
        icon TEXT,
        cover_image TEXT
      );

      CREATE TABLE IF NOT EXISTS blocks (
        id TEXT PRIMARY KEY,
        page_id TEXT,
        type TEXT,
        data TEXT,
        created_at INTEGER
      );

      INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '1');
    `);
  }
  getItem(key) {
    if (!this.db) return null;
    try {
      const stmt = this.db.prepare("SELECT value FROM kv_store WHERE key = ?");
      const row = stmt.get(key);
      if (key === "notion_workspace_v1") {
        if (!row || typeof row.value !== "string") {
          const reconstructed = this.reconstructFromRelationalTables();
          if (reconstructed) {
            return this.formatSnapshotForRenderer(reconstructed);
          }
          const freshJson = this.initializeCleanWorkspace();
          return this.formatSnapshotForRenderer(freshJson);
        }
        try {
          JSON.parse(row.value);
        } catch (jsonErr) {
          console.error("[SQLiteService] kv_store JSON corruption detected, recovering from relational tables...", jsonErr);
          const reconstructed = this.reconstructFromRelationalTables();
          if (reconstructed) {
            return this.formatSnapshotForRenderer(reconstructed);
          }
        }
        return this.formatSnapshotForRenderer(row.value);
      }
      return row ? row.value : null;
    } catch (e) {
      console.error("[SQLiteService] getItem error:", e);
      return null;
    }
  }
  setItem(key, value) {
    if (this.isSaveLocked) {
      console.log("[SQLiteService] setItem ignored because save is locked during workspace transition");
      return;
    }
    if (!this.db) return;
    try {
      let finalValue = value;
      if (key === "notion_workspace_v1") {
        finalValue = this.processAssetsAndSanitizeSnapshot(value);
      }
      const now = Date.now();
      const stmt = this.db.prepare(
        "INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)"
      );
      stmt.run(key, finalValue, now);
      if (key === "notion_workspace_v1") {
        this.syncStructuredTables(finalValue);
      }
    } catch (e) {
      console.error("[SQLiteService] setItem error:", e);
    }
  }
  removeItem(key) {
    if (!this.db) return;
    try {
      const stmt = this.db.prepare("DELETE FROM kv_store WHERE key = ?");
      stmt.run(key);
    } catch (e) {
      console.error("[SQLiteService] removeItem error:", e);
    }
  }
  clear() {
    if (!this.db) return;
    try {
      this.db.exec("DELETE FROM kv_store; DELETE FROM pages; DELETE FROM blocks;");
    } catch (e) {
      console.error("[SQLiteService] clear error:", e);
    }
  }
  isMigrated() {
    if (!this.db) return false;
    try {
      const stmt = this.db.prepare(
        "SELECT value FROM meta WHERE key = 'migrated_from_localstorage'"
      );
      const row = stmt.get();
      return row ? row.value === "true" : false;
    } catch (e) {
      console.error("[SQLiteService] isMigrated error:", e);
      return false;
    }
  }
  migrateLocalStorage(data) {
    if (!this.db) return false;
    try {
      this.db.exec("BEGIN IMMEDIATE;");
      for (const [key, value] of Object.entries(data)) {
        this.setItem(key, value);
      }
      this.db.exec(
        "INSERT OR REPLACE INTO meta (key, value) VALUES ('migrated_from_localstorage', 'true');"
      );
      this.db.exec("COMMIT;");
      return true;
    } catch (e) {
      console.error("[SQLiteService] migrateLocalStorage error, rolling back:", e);
      try {
        this.db.exec("ROLLBACK;");
      } catch {
      }
      return false;
    }
  }
  /**
   * Scans snapshot JSON for base64 images, extracts them to the workspace assets/ folder,
   * and replaces data URLs with relative asset paths (e.g. assets/cover-123.png).
   */
  processAssetsAndSanitizeSnapshot(jsonString) {
    if (!this.dbPath) return jsonString;
    const workspaceDir = path.dirname(this.dbPath);
    const assetsDir = path.join(workspaceDir, "assets");
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.pages)) return jsonString;
      const saveBase64Asset = (dataUrl, prefix) => {
        const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (!matches) return dataUrl;
        const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
        const base64Data = matches[2];
        const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const relativePath = `assets/${filename}`;
        const fullPath = path.join(workspaceDir, relativePath);
        fs.writeFileSync(fullPath, Buffer.from(base64Data, "base64"));
        return relativePath;
      };
      const sanitizeUrl = (url, prefix) => {
        if (!url || typeof url !== "string") return url;
        if (url.startsWith("data:image/")) {
          return saveBase64Asset(url, prefix);
        }
        if (url.startsWith("app-asset://")) {
          return url.replace(/^app-asset:\/\//, "");
        }
        return url;
      };
      for (const page of parsed.pages) {
        if (page.coverImage) {
          page.coverImage = sanitizeUrl(page.coverImage, `cover_${page.id}`);
        }
        if (Array.isArray(page.blocks)) {
          for (const block of page.blocks) {
            if (block.type === "image" && block.data && block.data.url) {
              block.data.url = sanitizeUrl(block.data.url, `img_${block.id}`);
            }
          }
        }
      }
      return JSON.stringify(parsed);
    } catch (e) {
      console.error("[SQLiteService] Failed to process assets:", e);
      return jsonString;
    }
  }
  /**
   * Converts relative asset paths (e.g. assets/cover.png) to custom protocol app-asset://
   * URLs so the renderer can display images loaded directly from the workspace folder.
   */
  formatSnapshotForRenderer(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.pages)) return jsonString;
      const toAppAssetUrl = (url) => {
        if (!url || typeof url !== "string") return url;
        if (url.startsWith("assets/")) {
          return `app-asset://${url}`;
        }
        return url;
      };
      for (const page of parsed.pages) {
        if (page.coverImage) {
          page.coverImage = toAppAssetUrl(page.coverImage);
        }
        if (Array.isArray(page.blocks)) {
          for (const block of page.blocks) {
            if (block.type === "image" && block.data && block.data.url) {
              block.data.url = toAppAssetUrl(block.data.url);
            }
          }
        }
      }
      return JSON.stringify(parsed);
    } catch (e) {
      return jsonString;
    }
  }
  syncStructuredTables(jsonSnapshot) {
    if (!this.db) return;
    let parsed;
    try {
      parsed = JSON.parse(jsonSnapshot);
      if (!parsed || !Array.isArray(parsed.pages)) return;
    } catch (e) {
      console.error("[SQLiteService] Failed to parse workspace JSON for relational sync:", e);
      return;
    }
    try {
      this.db.exec("BEGIN IMMEDIATE;");
      this.db.exec("DELETE FROM pages; DELETE FROM blocks;");
      const insertPageStmt = this.db.prepare(`
        INSERT INTO pages (
          id, title, parent_id, children, created_at, updated_at,
          last_opened_at, is_favorite, favorite_order, is_deleted,
          deleted_at, icon, cover_image
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `);
      const insertBlockStmt = this.db.prepare(`
        INSERT INTO blocks (id, page_id, type, data, created_at)
        VALUES (?, ?, ?, ?, ?);
      `);
      for (const page of parsed.pages) {
        insertPageStmt.run(
          page.id,
          page.title || "",
          page.parentId || null,
          JSON.stringify(page.children || []),
          page.createdAt || Date.now(),
          page.updatedAt || Date.now(),
          page.lastOpenedAt || null,
          page.isFavorite ? 1 : 0,
          typeof page.favoriteOrder === "number" ? page.favoriteOrder : null,
          page.isDeleted ? 1 : 0,
          page.deletedAt || null,
          typeof page.icon === "string" ? page.icon : null,
          typeof page.coverImage === "string" ? page.coverImage : null
        );
        if (Array.isArray(page.blocks)) {
          for (const block of page.blocks) {
            insertBlockStmt.run(
              block.id,
              page.id,
              block.type || "paragraph",
              JSON.stringify(block.data || {}),
              block.createdAt || Date.now()
            );
          }
        }
      }
      this.db.exec("COMMIT;");
    } catch (e) {
      console.error("[SQLiteService] Sync structured tables failed, rolling back transaction:", e);
      try {
        this.db.exec("ROLLBACK;");
      } catch {
      }
    }
  }
  /**
   * Reconstructs a full WorkspaceSnapshot from structured relational tables (pages, blocks)
   * if kv_store is empty or corrupted.
   */
  reconstructFromRelationalTables() {
    if (!this.db) return null;
    try {
      const pageRows = this.db.prepare("SELECT * FROM pages").all();
      if (!pageRows || pageRows.length === 0) return null;
      const blockRows = this.db.prepare("SELECT * FROM blocks").all();
      const blocksByPageId = /* @__PURE__ */ new Map();
      for (const row of blockRows) {
        let blockData = {};
        try {
          blockData = JSON.parse(row.data || "{}");
        } catch {
        }
        const blockObj = {
          id: row.id,
          type: row.type || "paragraph",
          data: blockData,
          createdAt: row.created_at || Date.now()
        };
        if (!blocksByPageId.has(row.page_id)) {
          blocksByPageId.set(row.page_id, []);
        }
        blocksByPageId.get(row.page_id).push(blockObj);
      }
      const pages = pageRows.map((p) => {
        let children = [];
        try {
          children = JSON.parse(p.children || "[]");
        } catch {
        }
        return {
          id: p.id,
          title: p.title || "",
          icon: p.icon || null,
          coverImage: p.cover_image || null,
          parentId: p.parent_id || null,
          children,
          blocks: blocksByPageId.get(p.id) || [],
          createdAt: p.created_at || Date.now(),
          updatedAt: p.updated_at || Date.now(),
          lastOpenedAt: p.last_opened_at || null,
          isFavorite: Boolean(p.is_favorite),
          favoriteOrder: p.favorite_order ?? void 0,
          isDeleted: Boolean(p.is_deleted),
          deletedAt: p.deleted_at || null
        };
      });
      const activePage = pages.find((p) => !p.isDeleted) || pages[0];
      const snapshot = {
        version: 1,
        timestamp: Date.now(),
        pages,
        activePageId: activePage ? activePage.id : null,
        sidebarOpen: true
      };
      const jsonStr = JSON.stringify(snapshot);
      const stmt = this.db.prepare(
        "INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)"
      );
      stmt.run("notion_workspace_v1", jsonStr, Date.now());
      console.log("[SQLiteService] Successfully reconstructed workspace from relational database tables!");
      return jsonStr;
    } catch (err) {
      console.error("[SQLiteService] Relational reconstruction failed:", err);
      return null;
    }
  }
};
var sqliteService = new SQLiteService();

// electron/workspaceManager.ts
import path2 from "path";
import fs2 from "fs";
import { app as app2, dialog } from "electron";
var WorkspaceManager = class {
  constructor() {
    this.configPath = "";
    this.globalConfig = {
      activeWorkspacePath: null,
      recentWorkspaces: []
    };
  }
  async init() {
    const userDataPath = app2?.getPath ? app2.getPath("userData") : path2.join(process.cwd(), ".app-data");
    if (!fs2.existsSync(userDataPath)) {
      fs2.mkdirSync(userDataPath, { recursive: true });
    }
    this.configPath = path2.join(userDataPath, "globalConfig.json");
    this.loadGlobalConfig();
    let activePath = this.globalConfig.activeWorkspacePath;
    if (activePath && (!fs2.existsSync(activePath) || !fs2.statSync(activePath).isDirectory())) {
      activePath = null;
    }
    if (!activePath) {
      activePath = this.setupDefaultWorkspace(userDataPath);
      this.globalConfig.activeWorkspacePath = activePath;
      this.addRecentWorkspace(activePath, "Default Workspace");
      this.saveGlobalConfig();
    } else {
      this.ensureWorkspaceFolderStructure(activePath);
    }
    return activePath;
  }
  setupDefaultWorkspace(userDataPath) {
    const workspacesDir = path2.join(userDataPath, "workspaces");
    const defaultWsPath = path2.join(workspacesDir, "Default Workspace");
    this.ensureWorkspaceFolderStructure(defaultWsPath, "Default Workspace");
    const legacyDbPath = path2.join(userDataPath, "workspace.sqlite");
    const targetDbPath = path2.join(defaultWsPath, "workspace.sqlite");
    if (fs2.existsSync(legacyDbPath) && !fs2.existsSync(targetDbPath)) {
      try {
        fs2.copyFileSync(legacyDbPath, targetDbPath);
        console.log("[WorkspaceManager] Successfully migrated legacy workspace.sqlite into Default Workspace folder");
      } catch (e) {
        console.error("[WorkspaceManager] Error migrating legacy database file:", e);
      }
    }
    return defaultWsPath;
  }
  ensureWorkspaceFolderStructure(wsPath, defaultName) {
    if (!fs2.existsSync(wsPath)) {
      fs2.mkdirSync(wsPath, { recursive: true });
    }
    const assetsDir = path2.join(wsPath, "assets");
    if (!fs2.existsSync(assetsDir)) {
      fs2.mkdirSync(assetsDir, { recursive: true });
    }
    const backupsDir = path2.join(wsPath, "backups");
    if (!fs2.existsSync(backupsDir)) {
      fs2.mkdirSync(backupsDir, { recursive: true });
    }
    const settingsPath = path2.join(wsPath, "settings.json");
    if (!fs2.existsSync(settingsPath)) {
      const name = defaultName || path2.basename(wsPath);
      const settings = {
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1
      };
      fs2.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
    }
  }
  loadGlobalConfig() {
    if (fs2.existsSync(this.configPath)) {
      try {
        const raw = fs2.readFileSync(this.configPath, "utf-8");
        this.globalConfig = JSON.parse(raw);
      } catch (e) {
        console.error("[WorkspaceManager] Failed to parse globalConfig.json:", e);
      }
    }
  }
  saveGlobalConfig() {
    try {
      fs2.writeFileSync(this.configPath, JSON.stringify(this.globalConfig, null, 2), "utf-8");
    } catch (e) {
      console.error("[WorkspaceManager] Failed to write globalConfig.json:", e);
    }
  }
  getActiveWorkspacePath() {
    return this.globalConfig.activeWorkspacePath;
  }
  getActiveWorkspaceInfo() {
    const wsPath = this.globalConfig.activeWorkspacePath;
    if (!wsPath || !fs2.existsSync(wsPath)) return null;
    let name = path2.basename(wsPath);
    let createdAt = Date.now();
    let updatedAt = Date.now();
    const settingsPath = path2.join(wsPath, "settings.json");
    if (fs2.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs2.readFileSync(settingsPath, "utf-8"));
        if (settings.name) name = settings.name;
        if (settings.createdAt) createdAt = settings.createdAt;
        if (settings.updatedAt) updatedAt = settings.updatedAt;
      } catch {
      }
    }
    return { path: wsPath, name, createdAt, updatedAt };
  }
  addRecentWorkspace(wsPath, name) {
    const wsName = name || path2.basename(wsPath);
    const existingIndex = this.globalConfig.recentWorkspaces.findIndex((r) => r.path === wsPath);
    if (existingIndex >= 0) {
      this.globalConfig.recentWorkspaces[existingIndex].lastOpenedAt = Date.now();
      if (name) this.globalConfig.recentWorkspaces[existingIndex].name = name;
    } else {
      this.globalConfig.recentWorkspaces.unshift({
        path: wsPath,
        name: wsName,
        lastOpenedAt: Date.now()
      });
    }
    this.globalConfig.recentWorkspaces.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
    this.saveGlobalConfig();
  }
  getRecentWorkspaces() {
    this.globalConfig.recentWorkspaces = this.globalConfig.recentWorkspaces.filter(
      (r) => fs2.existsSync(r.path)
    );
    this.saveGlobalConfig();
    return this.globalConfig.recentWorkspaces;
  }
  removeRecentWorkspace(wsPath) {
    this.globalConfig.recentWorkspaces = this.globalConfig.recentWorkspaces.filter(
      (r) => r.path !== wsPath
    );
    this.saveGlobalConfig();
    return true;
  }
  deleteWorkspaceFolder(wsPath) {
    if (!wsPath) return false;
    this.removeRecentWorkspace(wsPath);
    if (this.globalConfig.activeWorkspacePath === wsPath) {
      this.globalConfig.activeWorkspacePath = null;
      this.saveGlobalConfig();
    }
    try {
      if (fs2.existsSync(wsPath)) {
        fs2.rmSync(wsPath, { recursive: true, force: true });
        console.log(`[WorkspaceManager] Successfully deleted workspace directory: ${wsPath}`);
      }
      return true;
    } catch (e) {
      console.error(`[WorkspaceManager] Failed to delete workspace directory ${wsPath}:`, e);
      return false;
    }
  }
  async selectWorkspaceFolder(parentWindow) {
    const result = await dialog.showOpenDialog(parentWindow || void 0, {
      title: "Select Workspace Folder",
      properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  }
  createWorkspace(targetPath, name) {
    this.ensureWorkspaceFolderStructure(targetPath, name);
    this.globalConfig.activeWorkspacePath = targetPath;
    const info = this.getActiveWorkspaceInfo();
    this.addRecentWorkspace(targetPath, info.name);
    return info;
  }
  openWorkspace(targetPath) {
    this.ensureWorkspaceFolderStructure(targetPath);
    this.globalConfig.activeWorkspacePath = targetPath;
    const info = this.getActiveWorkspaceInfo();
    this.addRecentWorkspace(targetPath, info.name);
    return info;
  }
  closeWorkspace() {
    this.globalConfig.activeWorkspacePath = null;
    this.saveGlobalConfig();
  }
  createBackup() {
    const wsPath = this.globalConfig.activeWorkspacePath;
    if (!wsPath || !fs2.existsSync(wsPath)) return;
    const dbPath = path2.join(wsPath, "workspace.sqlite");
    if (!fs2.existsSync(dbPath)) return;
    const backupsDir = path2.join(wsPath, "backups");
    if (!fs2.existsSync(backupsDir)) {
      fs2.mkdirSync(backupsDir, { recursive: true });
    }
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const backupPath = path2.join(backupsDir, `workspace-${timestamp}.sqlite`);
    try {
      fs2.copyFileSync(dbPath, backupPath);
      const files = fs2.readdirSync(backupsDir).filter((f) => f.startsWith("workspace-") && f.endsWith(".sqlite")).sort();
      if (files.length > 5) {
        for (let i = 0; i < files.length - 5; i++) {
          fs2.unlinkSync(path2.join(backupsDir, files[i]));
        }
      }
    } catch (e) {
      console.error("[WorkspaceManager] Failed to create database backup:", e);
    }
  }
};
var workspaceManager = new WorkspaceManager();

// electron/menuManager.ts
import { app as app3, Menu, dialog as dialog2, shell, ipcMain } from "electron";
var currentMenuState = {
  hasActivePage: false,
  selectedBlockId: null,
  sidebarOpen: true,
  isFullWidth: false,
  favoritePages: [],
  recentPages: []
};
var getMainWindowRef = () => null;
function sendMenuAction(action, payload) {
  const win = getMainWindowRef();
  if (win && !win.isDestroyed()) {
    win.webContents.send("menu:action", action, payload);
  }
}
function setupApplicationMenu(getMainWindow) {
  getMainWindowRef = getMainWindow;
  ipcMain.on("menu:updateState", (_event, state) => {
    currentMenuState = {
      ...currentMenuState,
      ...state
    };
    buildAndSetMenu();
  });
  buildAndSetMenu();
}
function buildAndSetMenu() {
  const isMac = process.platform === "darwin";
  const {
    hasActivePage,
    selectedBlockId,
    sidebarOpen,
    isFullWidth,
    favoritePages,
    recentPages
  } = currentMenuState;
  const template = [
    ...isMac ? [
      {
        label: app3.name,
        submenu: [
          {
            label: `About ${app3.name}`,
            click: () => sendMenuAction("help:about")
          },
          { type: "separator" },
          {
            label: "Settings...",
            accelerator: "CmdOrCtrl+,",
            click: () => sendMenuAction("file:settings")
          },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" }
        ]
      }
    ] : [],
    // 1. File Menu
    {
      label: "File",
      submenu: [
        {
          label: "New Page",
          accelerator: "CmdOrCtrl+N",
          click: () => sendMenuAction("file:new-page")
        },
        { type: "separator" },
        {
          label: "New Workspace...",
          accelerator: "CmdOrCtrl+Shift+N",
          click: () => sendMenuAction("file:new-workspace")
        },
        {
          label: "Open Workspace...",
          accelerator: "CmdOrCtrl+O",
          click: () => sendMenuAction("file:open-workspace")
        },
        {
          label: "Close Workspace",
          accelerator: "CmdOrCtrl+Shift+W",
          click: () => sendMenuAction("file:close-workspace")
        },
        { type: "separator" },
        {
          label: "Export Current Page...",
          accelerator: "CmdOrCtrl+E",
          enabled: hasActivePage,
          click: () => sendMenuAction("file:export-page")
        },
        {
          label: "Export Workspace...",
          accelerator: "CmdOrCtrl+Shift+E",
          click: () => sendMenuAction("file:export-workspace")
        },
        {
          label: "Import Page...",
          accelerator: "CmdOrCtrl+I",
          click: () => sendMenuAction("file:import-page")
        },
        {
          label: "Import Workspace...",
          accelerator: "CmdOrCtrl+Shift+I",
          click: () => sendMenuAction("file:import-workspace")
        },
        { type: "separator" },
        {
          label: "Settings",
          accelerator: "CmdOrCtrl+,",
          click: () => sendMenuAction("file:settings")
        },
        { type: "separator" },
        isMac ? { role: "close" } : { label: "Exit", accelerator: "Alt+F4", click: () => app3.quit() }
      ]
    },
    // 2. Edit Menu
    {
      label: "Edit",
      submenu: [
        {
          label: "Undo",
          accelerator: "CmdOrCtrl+Z",
          click: (_item, focusedWindow) => {
            if (focusedWindow) sendMenuAction("edit:undo");
          }
        },
        {
          label: "Redo",
          accelerator: isMac ? "CmdOrCtrl+Shift+Z" : "CmdOrCtrl+Y",
          click: (_item, focusedWindow) => {
            if (focusedWindow) sendMenuAction("edit:redo");
          }
        },
        { type: "separator" },
        {
          label: "Cut",
          accelerator: "CmdOrCtrl+X",
          role: "cut"
        },
        {
          label: "Copy",
          accelerator: "CmdOrCtrl+C",
          role: "copy"
        },
        {
          label: "Paste",
          accelerator: "CmdOrCtrl+V",
          role: "paste"
        },
        { type: "separator" },
        {
          label: "Duplicate Block",
          accelerator: "CmdOrCtrl+D",
          enabled: Boolean(hasActivePage && selectedBlockId),
          click: () => sendMenuAction("edit:duplicate-block")
        },
        {
          label: "Delete Block",
          accelerator: "Delete",
          enabled: Boolean(hasActivePage && selectedBlockId),
          click: () => sendMenuAction("edit:delete-block")
        },
        { type: "separator" },
        {
          label: "Select All",
          accelerator: "CmdOrCtrl+A",
          role: "selectAll"
        }
      ]
    },
    // 3. View Menu
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Sidebar",
          accelerator: "CmdOrCtrl+\\",
          type: "checkbox",
          checked: sidebarOpen,
          click: () => sendMenuAction("view:toggle-sidebar")
        },
        {
          label: "Toggle Full Width",
          accelerator: "CmdOrCtrl+Shift+F",
          type: "checkbox",
          checked: isFullWidth,
          click: () => sendMenuAction("view:toggle-full-width")
        },
        { type: "separator" },
        { role: "zoomIn", accelerator: "CmdOrCtrl+=" },
        { role: "zoomOut", accelerator: "CmdOrCtrl+-" },
        { role: "resetZoom", accelerator: "CmdOrCtrl+0" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    // 4. Go Menu
    {
      label: "Go",
      submenu: [
        {
          label: "Search Pages...",
          accelerator: "CmdOrCtrl+P",
          click: () => sendMenuAction("go:search")
        },
        { type: "separator" },
        {
          label: "Favorites",
          submenu: favoritePages.length > 0 ? favoritePages.map((page) => ({
            label: `${page.icon || "\u{1F4C4}"} ${page.title || "Untitled"}`,
            click: () => sendMenuAction("go:navigate-page", { pageId: page.id })
          })) : [{ label: "No Favorite Pages", enabled: false }]
        },
        {
          label: "Recent Pages",
          submenu: recentPages.length > 0 ? recentPages.map((page) => ({
            label: `${page.icon || "\u{1F4C4}"} ${page.title || "Untitled"}`,
            click: () => sendMenuAction("go:navigate-page", { pageId: page.id })
          })) : [{ label: "No Recent Pages", enabled: false }]
        }
      ]
    },
    // 5. Help Menu
    {
      label: "Help",
      submenu: [
        {
          label: "About Workspace Desktop",
          click: () => sendMenuAction("help:about")
        },
        {
          label: "Version Info",
          click: async () => {
            const win = getMainWindowRef();
            const version = app3.getVersion();
            if (win) {
              await dialog2.showMessageBox(win, {
                type: "info",
                title: "Application Version",
                message: `Workspace Desktop v${version}`,
                detail: `Electron: ${process.versions.electron}
Chrome: ${process.versions.chrome}
Node.js: ${process.versions.node}
Platform: ${process.platform}`,
                buttons: ["OK"]
              });
            }
          }
        },
        { type: "separator" },
        {
          label: "Open Data Folder",
          click: async () => {
            const activePath = workspaceManager.getActiveWorkspacePath();
            const targetPath = activePath || app3.getPath("userData");
            await shell.openPath(targetPath);
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// electron/main.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path3.dirname(__filename);
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app-asset",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true
    }
  }
]);
var mainWindow = null;
var isDev = process.env.NODE_ENV === "development" || !app4.isPackaged;
async function createWindow() {
  mainWindow = new BrowserWindow3({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Workspace Desktop",
    webPreferences: {
      preload: path3.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:3000";
    await mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path3.join(__dirname, "../dist/index.html");
    await mainWindow.loadFile(indexPath);
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
function setupIpcHandlers() {
  ipcMain2.handle("clipboard:writeText", async (_event, text) => {
    try {
      clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  });
  ipcMain2.handle("clipboard:readText", async () => {
    try {
      return clipboard.readText();
    } catch {
      return "";
    }
  });
  ipcMain2.handle("dialog:alert", async (_event, message) => {
    if (!mainWindow) return;
    await dialog3.showMessageBox(mainWindow, {
      type: "info",
      message,
      buttons: ["OK"]
    });
  });
  ipcMain2.handle("dialog:confirm", async (_event, message) => {
    if (!mainWindow) return false;
    const result = await dialog3.showMessageBox(mainWindow, {
      type: "question",
      message,
      buttons: ["Cancel", "OK"],
      defaultId: 1,
      cancelId: 0
    });
    return result.response === 1;
  });
  ipcMain2.handle(
    "file:exportFile",
    async (_event, { filename, content }) => {
      if (!mainWindow) return false;
      const rawExt = filename.split(".").pop()?.toLowerCase() || "";
      let filters = void 0;
      let defaultExtension = void 0;
      if (rawExt === "md" || rawExt === "markdown") {
        defaultExtension = "md";
        filters = [
          { name: "Markdown Files (*.md, *.markdown)", extensions: ["md", "markdown"] },
          { name: "All Files (*.*)", extensions: ["*"] }
        ];
      } else if (rawExt === "html" || rawExt === "htm") {
        defaultExtension = "html";
        filters = [
          { name: "HTML Documents (*.html)", extensions: ["html", "htm"] },
          { name: "All Files (*.*)", extensions: ["*"] }
        ];
      } else if (rawExt === "pdf") {
        defaultExtension = "pdf";
        filters = [
          { name: "PDF Documents (*.pdf)", extensions: ["pdf"] },
          { name: "All Files (*.*)", extensions: ["*"] }
        ];
      } else if (rawExt === "zip") {
        defaultExtension = "zip";
        filters = [
          { name: "Zip Archives (*.zip)", extensions: ["zip"] },
          { name: "All Files (*.*)", extensions: ["*"] }
        ];
      } else if (rawExt === "json") {
        defaultExtension = "json";
        filters = [
          { name: "JSON Files (*.json)", extensions: ["json"] },
          { name: "All Files (*.*)", extensions: ["*"] }
        ];
      }
      const saveResult = await dialog3.showSaveDialog(mainWindow, {
        title: "Save File",
        defaultPath: filename,
        filters
      });
      if (saveResult.canceled || !saveResult.filePath) {
        return false;
      }
      let filePath = saveResult.filePath;
      if (defaultExtension && !path3.extname(filePath)) {
        filePath = `${filePath}.${defaultExtension}`;
      }
      if (typeof content === "string") {
        await fs3.writeFile(filePath, content, "utf-8");
      } else {
        await fs3.writeFile(filePath, Buffer.from(content));
      }
      return true;
    }
  );
  ipcMain2.handle("file:importFile", async (_event, acceptFilter) => {
    if (!mainWindow) return null;
    let filters = void 0;
    if (acceptFilter) {
      const rawExts = acceptFilter.split(",").map((ext) => ext.trim().replace(/^\./, "").toLowerCase()).filter(Boolean);
      if (rawExts.length > 0) {
        const isMarkdown = rawExts.some((e) => e === "md" || e === "markdown");
        const isWorkspace = rawExts.some((e) => e === "zip" || e === "json");
        filters = [];
        if (isMarkdown && !isWorkspace) {
          filters.push({
            name: "Markdown Documents",
            extensions: rawExts
          });
        } else if (isWorkspace && !isMarkdown) {
          filters.push({
            name: "Workspace Archives & Backups",
            extensions: rawExts
          });
        } else {
          filters.push({
            name: "Supported Documents",
            extensions: rawExts
          });
        }
        filters.push({
          name: "All Files",
          extensions: ["*"]
        });
      }
    }
    const openResult = await dialog3.showOpenDialog(mainWindow, {
      title: "Import File",
      properties: ["openFile"],
      filters
    });
    if (openResult.canceled || openResult.filePaths.length === 0) {
      return null;
    }
    const filePath = openResult.filePaths[0];
    const fileName = path3.basename(filePath);
    const buffer = await fs3.readFile(filePath);
    if (fileName.toLowerCase().endsWith(".zip")) {
      return { filename: fileName, content: buffer };
    } else {
      return { filename: fileName, content: buffer.toString("utf-8") };
    }
  });
  ipcMain2.handle("app:getVersion", async () => {
    return app4.getVersion();
  });
  ipcMain2.on("db:getItemSync", (event, key) => {
    event.returnValue = sqliteService.getItem(key);
  });
  ipcMain2.on("db:isMigratedSync", (event) => {
    event.returnValue = sqliteService.isMigrated();
  });
  ipcMain2.handle("db:setItem", async (_event, key, value) => {
    sqliteService.setItem(key, value);
    return true;
  });
  ipcMain2.handle("db:removeItem", async (_event, key) => {
    sqliteService.removeItem(key);
    return true;
  });
  ipcMain2.handle("db:clear", async () => {
    sqliteService.clear();
    return true;
  });
  ipcMain2.handle(
    "db:migrateLocalStorage",
    async (_event, data) => {
      return sqliteService.migrateLocalStorage(data);
    }
  );
  ipcMain2.handle("workspace:getActive", async () => {
    return workspaceManager.getActiveWorkspaceInfo();
  });
  ipcMain2.handle("workspace:selectFolder", async () => {
    return workspaceManager.selectWorkspaceFolder(mainWindow);
  });
  ipcMain2.handle("workspace:create", async (_event, folderPath, name) => {
    let targetPath = folderPath;
    if (!targetPath) {
      targetPath = await workspaceManager.selectWorkspaceFolder(mainWindow) || void 0;
    }
    if (!targetPath) return null;
    sqliteService.setSaveLocked(true);
    workspaceManager.createBackup();
    const info = workspaceManager.createWorkspace(targetPath, name);
    const dbPath = path3.join(targetPath, "workspace.sqlite");
    await sqliteService.switchDatabase(dbPath, true, name || info.name);
    if (mainWindow) {
      mainWindow.reload();
    }
    setTimeout(() => {
      sqliteService.setSaveLocked(false);
    }, 800);
    return info;
  });
  ipcMain2.handle("workspace:open", async (_event, folderPath) => {
    let targetPath = folderPath;
    if (!targetPath) {
      targetPath = await workspaceManager.selectWorkspaceFolder(mainWindow) || void 0;
    }
    if (!targetPath) return null;
    sqliteService.setSaveLocked(true);
    workspaceManager.createBackup();
    const info = workspaceManager.openWorkspace(targetPath);
    const dbPath = path3.join(targetPath, "workspace.sqlite");
    await sqliteService.switchDatabase(dbPath, false);
    if (mainWindow) {
      mainWindow.reload();
    }
    setTimeout(() => {
      sqliteService.setSaveLocked(false);
    }, 800);
    return info;
  });
  ipcMain2.handle("workspace:switch", async (_event, folderPath) => {
    sqliteService.setSaveLocked(true);
    workspaceManager.createBackup();
    const info = workspaceManager.openWorkspace(folderPath);
    const dbPath = path3.join(folderPath, "workspace.sqlite");
    await sqliteService.switchDatabase(dbPath, false);
    if (mainWindow) {
      mainWindow.reload();
    }
    setTimeout(() => {
      sqliteService.setSaveLocked(false);
    }, 800);
    return info;
  });
  ipcMain2.handle("workspace:close", async () => {
    workspaceManager.createBackup();
    workspaceManager.closeWorkspace();
    return true;
  });
  ipcMain2.handle("workspace:getRecents", async () => {
    return workspaceManager.getRecentWorkspaces();
  });
  ipcMain2.handle("workspace:removeRecent", async (_event, folderPath) => {
    return workspaceManager.removeRecentWorkspace(folderPath);
  });
  ipcMain2.handle("workspace:delete", async (_event, folderPath) => {
    if (!folderPath) return false;
    if (mainWindow) {
      const confirmResult = await dialog3.showMessageBox(mainWindow, {
        type: "warning",
        title: "Delete Workspace Permanently",
        message: "Are you sure you want to permanently delete this workspace?",
        detail: `This action CANNOT be undone. The workspace directory and all its contents will be permanently deleted from disk:

\u2022 workspace.sqlite (Database & Pages)
\u2022 assets/ (Images & Attachments)
\u2022 backups/ (Database Backups)
\u2022 settings.json (Workspace Config)
\u2022 All other workspace-specific files

Target Workspace Path:
${folderPath}`,
        buttons: ["Cancel", "Delete Workspace"],
        defaultId: 0,
        cancelId: 0,
        noLink: true
      });
      if (confirmResult.response !== 1) {
        return false;
      }
    }
    const activePath = workspaceManager.getActiveWorkspacePath();
    const isActive = activePath === folderPath;
    if (isActive) {
      sqliteService.setSaveLocked(true);
      sqliteService.close();
    }
    const success = workspaceManager.deleteWorkspaceFolder(folderPath);
    if (isActive) {
      const recents = workspaceManager.getRecentWorkspaces();
      const validNext = recents.find((r) => r.path !== folderPath && existsSync.existsSync(r.path));
      let nextWsPath;
      if (validNext) {
        nextWsPath = workspaceManager.openWorkspace(validNext.path).path;
      } else {
        const userDataPath = app4.getPath("userData");
        nextWsPath = await workspaceManager.init() || path3.join(userDataPath, "workspaces", "Default Workspace");
      }
      const dbPath = path3.join(nextWsPath, "workspace.sqlite");
      await sqliteService.switchDatabase(dbPath, false);
      if (mainWindow) {
        mainWindow.reload();
      }
      setTimeout(() => {
        sqliteService.setSaveLocked(false);
      }, 800);
    }
    return success;
  });
}
function setupAssetProtocol() {
  protocol.handle("app-asset", async (request) => {
    const activePath = workspaceManager.getActiveWorkspacePath();
    if (!activePath) {
      return new Response("No active workspace", { status: 404 });
    }
    const allowedAssetsDir = path3.resolve(activePath, "assets");
    try {
      const rawUrl = request.url.replace(/^app-asset:\/\//, "");
      const decodedUrl = decodeURIComponent(rawUrl);
      const cleanRelative = decodedUrl.replace(/^(assets[\/\\]?|\/)/i, "");
      const targetFilePath = path3.resolve(allowedAssetsDir, cleanRelative);
      const relativePath = path3.relative(allowedAssetsDir, targetFilePath);
      const isOutsideDir = relativePath.startsWith("..") || path3.isAbsolute(relativePath);
      if (isOutsideDir) {
        console.warn("[app-asset] Path traversal blocked:", request.url, "->", targetFilePath);
        return new Response("Forbidden: Access outside workspace assets directory is denied", { status: 403 });
      }
      if (!existsSync.existsSync(targetFilePath)) {
        return new Response("Asset file not found", { status: 404 });
      }
      return await net.fetch(pathToFileURL(targetFilePath).toString());
    } catch (err) {
      console.error("[app-asset] Error serving asset file:", request.url, err);
      return new Response("Asset file error", { status: 500 });
    }
  });
}
app4.whenReady().then(async () => {
  setupAssetProtocol();
  const activeWsPath = await workspaceManager.init();
  if (activeWsPath) {
    const dbPath = path3.join(activeWsPath, "workspace.sqlite");
    await sqliteService.init(dbPath);
  } else {
    await sqliteService.init();
  }
  setupIpcHandlers();
  setupApplicationMenu(() => mainWindow);
  createWindow();
  app4.on("activate", () => {
    if (BrowserWindow3.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app4.on("before-quit", () => {
  workspaceManager.createBackup();
  sqliteService.close();
});
app4.on("window-all-closed", () => {
  workspaceManager.createBackup();
  if (process.platform !== "darwin") {
    app4.quit();
  }
});
