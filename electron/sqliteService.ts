import path from "path";
import fs from "fs";
import { app } from "electron";

export class SQLiteService {
  private db: any = null;
  private dbPath: string = "";
  private isInitialized = false;
  private isSaveLocked = false;

  public setSaveLocked(locked: boolean): void {
    this.isSaveLocked = locked;
  }

  public close(): void {
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

  public async init(targetDbPath?: string): Promise<void> {
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
      } catch {}
      this.db = {
        exec: (sql: string) => nativeDb.exec(sql),
        prepare: (sql: string) => {
          const stmt = nativeDb.prepare(sql);
          return {
            get: (...args: any[]) => stmt.get(...args),
            all: (...args: any[]) => stmt.all(...args),
            run: (...args: any[]) => stmt.run(...args),
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
        },
      };
    } catch (e) {
      try {
        // @ts-ignore
        const BetterSqlite3 = (await import("better-sqlite3")).default;
        const nativeDb = new BetterSqlite3(this.dbPath);
        nativeDb.pragma("journal_mode = WAL");
        nativeDb.pragma("busy_timeout = 5000");
        this.db = {
          exec: (sql: string) => nativeDb.exec(sql),
          prepare: (sql: string) => {
            const stmt = nativeDb.prepare(sql);
            return {
              get: (...args: any[]) => stmt.get(...args),
              all: (...args: any[]) => stmt.all(...args),
              run: (...args: any[]) => stmt.run(...args),
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
          },
        };
      } catch (err) {
        console.error("[SQLiteService] Failed to initialize SQLite engine:", err);
      }
    }

    this.setupTables();
    this.isInitialized = true;
  }

  public async switchDatabase(newDbPath: string, isNewWorkspace: boolean = false, workspaceName?: string): Promise<void> {
    this.isSaveLocked = true;
    this.db = null;
    this.isInitialized = false;
    this.dbPath = newDbPath;
    await this.init(newDbPath);

    if (isNewWorkspace) {
      try {
        this.db?.exec("DELETE FROM kv_store; DELETE FROM pages; DELETE FROM blocks;");
      } catch {}
      this.initializeCleanWorkspace(workspaceName);
    }
  }

  public initializeCleanWorkspace(workspaceName?: string): string {
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
          icon: "📄",
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
          updatedAt: now,
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

  private setupTables(): void {
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

  public getItem(key: string): string | null {
    if (!this.db) return null;
    try {
      const stmt = this.db.prepare("SELECT value FROM kv_store WHERE key = ?");
      const row = stmt.get(key);

      if (key === "notion_workspace_v1") {
        if (!row || typeof row.value !== "string") {
          const freshJson = this.initializeCleanWorkspace();
          return this.formatSnapshotForRenderer(freshJson);
        }
        return this.formatSnapshotForRenderer(row.value);
      }

      return row ? row.value : null;
    } catch (e) {
      console.error("[SQLiteService] getItem error:", e);
      return null;
    }
  }

  public setItem(key: string, value: string): void {
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

  public removeItem(key: string): void {
    if (!this.db) return;
    try {
      const stmt = this.db.prepare("DELETE FROM kv_store WHERE key = ?");
      stmt.run(key);
    } catch (e) {
      console.error("[SQLiteService] removeItem error:", e);
    }
  }

  public clear(): void {
    if (!this.db) return;
    try {
      this.db.exec("DELETE FROM kv_store; DELETE FROM pages; DELETE FROM blocks;");
    } catch (e) {
      console.error("[SQLiteService] clear error:", e);
    }
  }

  public isMigrated(): boolean {
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

  public migrateLocalStorage(data: Record<string, string>): boolean {
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
      } catch {}
      return false;
    }
  }

  /**
   * Scans snapshot JSON for base64 images, extracts them to the workspace assets/ folder,
   * and replaces data URLs with relative asset paths (e.g. assets/cover-123.png).
   */
  private processAssetsAndSanitizeSnapshot(jsonString: string): string {
    if (!this.dbPath) return jsonString;
    const workspaceDir = path.dirname(this.dbPath);
    const assetsDir = path.join(workspaceDir, "assets");

    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.pages)) return jsonString;

      const saveBase64Asset = (dataUrl: string, prefix: string): string => {
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

      const sanitizeUrl = (url: string | null | undefined, prefix: string): string | null | undefined => {
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
  private formatSnapshotForRenderer(jsonString: string): string {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.pages)) return jsonString;

      const toAppAssetUrl = (url: string | null | undefined): string | null | undefined => {
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

  private syncStructuredTables(jsonSnapshot: string): void {
    if (!this.db) return;
    let parsed: any;
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
      } catch {}
    }
  }
}

export const sqliteService = new SQLiteService();
