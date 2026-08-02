import path from "path";
import fs from "fs";
import { app } from "electron";

export class SQLiteService {
  private db: any = null;
  private dbPath: string = "";
  private isInitialized = false;

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    const userDataPath = app?.getPath ? app.getPath("userData") : path.join(process.cwd(), ".app-data");
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    this.dbPath = path.join(userDataPath, "workspace.sqlite");

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
        };
      } catch (err) {
        console.error("[SQLiteService] Failed to initialize SQLite engine:", err);
      }
    }

    this.setupTables();
    this.isInitialized = true;
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
      return row ? row.value : null;
    } catch (e) {
      console.error("[SQLiteService] getItem error:", e);
      return null;
    }
  }

  public setItem(key: string, value: string): void {
    if (!this.db) return;
    try {
      const now = Date.now();
      const stmt = this.db.prepare(
        "INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)"
      );
      stmt.run(key, value, now);

      if (key === "notion_workspace_v1") {
        this.syncStructuredTables(value);
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
