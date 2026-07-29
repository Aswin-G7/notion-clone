import { Page } from "../types";

export interface WorkspaceSnapshot {
  version: number;
  timestamp: number;
  pages: Page[];
  activePageId: string | null;
  sidebarOpen?: boolean;
}

export const CURRENT_SCHEMA_VERSION = 1;
const STORAGE_KEY = "notion_workspace_v1";
const LEGACY_PAGES_KEY = "notion_pages_v1";
const LEGACY_ACTIVE_PAGE_KEY = "notion_active_page_v1";

export class PersistenceService {
  private lastSavedHash: string | null = null;

  /**
   * Saves the workspace snapshot to storage layer.
   * Compares payload string to avoid writing identical state repeatedly.
   */
  public saveWorkspace(snapshot: WorkspaceSnapshot): boolean {
    try {
      const payload: WorkspaceSnapshot = {
        version: CURRENT_SCHEMA_VERSION,
        timestamp: Date.now(),
        pages: snapshot.pages,
        activePageId: snapshot.activePageId,
        sidebarOpen: snapshot.sidebarOpen ?? true,
      };

      const jsonString = JSON.stringify(payload);
      if (this.lastSavedHash === jsonString) {
        return true; // No changes to persist
      }

      localStorage.setItem(STORAGE_KEY, jsonString);
      // Legacy backwards-compatibility updates
      localStorage.setItem(LEGACY_PAGES_KEY, JSON.stringify(snapshot.pages));
      if (snapshot.activePageId) {
        localStorage.setItem(LEGACY_ACTIVE_PAGE_KEY, snapshot.activePageId);
      } else {
        localStorage.removeItem(LEGACY_ACTIVE_PAGE_KEY);
      }

      this.lastSavedHash = jsonString;
      return true;
    } catch (error) {
      console.error("[PersistenceService] Failed to save workspace:", error);
      return false;
    }
  }

  /**
   * Loads workspace snapshot from storage layer.
   * Handles schema migrations if version differs.
   * Falls back to legacy keys if v1 workspace key is absent.
   */
  public loadWorkspace(): WorkspaceSnapshot | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const migrated = this.migrateSchema(parsed);
        if (migrated) {
          this.lastSavedHash = JSON.stringify(migrated);
          return migrated;
        }
      }

      // Legacy fallback
      const legacyPagesRaw = localStorage.getItem(LEGACY_PAGES_KEY);
      if (legacyPagesRaw) {
        const pages = JSON.parse(legacyPagesRaw);
        const activePageId = localStorage.getItem(LEGACY_ACTIVE_PAGE_KEY);
        if (Array.isArray(pages) && pages.length > 0) {
          const snapshot: WorkspaceSnapshot = {
            version: CURRENT_SCHEMA_VERSION,
            timestamp: Date.now(),
            pages: this.sanitizePages(pages),
            activePageId,
            sidebarOpen: true,
          };
          this.lastSavedHash = JSON.stringify(snapshot);
          return snapshot;
        }
      }

      return null;
    } catch (error) {
      console.error("[PersistenceService] Failed to load workspace:", error);
      return null;
    }
  }

  /**
   * Clears stored workspace data.
   */
  public clearWorkspace(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_PAGES_KEY);
      localStorage.removeItem(LEGACY_ACTIVE_PAGE_KEY);
      this.lastSavedHash = null;
    } catch (error) {
      console.error("[PersistenceService] Failed to clear workspace:", error);
    }
  }

  /**
   * Exports workspace snapshot as formatted JSON string.
   */
  public exportWorkspace(snapshot: WorkspaceSnapshot): string {
    const exportData: WorkspaceSnapshot = {
      version: CURRENT_SCHEMA_VERSION,
      timestamp: Date.now(),
      pages: snapshot.pages,
      activePageId: snapshot.activePageId,
      sidebarOpen: snapshot.sidebarOpen ?? true,
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Imports a workspace JSON string, validates schema, and sanitizes state.
   */
  public importWorkspace(jsonString: string): WorkspaceSnapshot {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error("Invalid JSON workspace file format.");
    }

    if (!parsed || typeof parsed !== "object") {
      throw new Error("Imported data is not a valid workspace object.");
    }

    let pages: Page[] = [];
    let activePageId: string | null = null;
    let sidebarOpen = true;

    if (Array.isArray(parsed)) {
      pages = parsed;
    } else if (Array.isArray(parsed.pages)) {
      pages = parsed.pages;
      activePageId = typeof parsed.activePageId === "string" ? parsed.activePageId : null;
      if (typeof parsed.sidebarOpen === "boolean") {
        sidebarOpen = parsed.sidebarOpen;
      }
    } else {
      throw new Error("Workspace data missing 'pages' array.");
    }

    const sanitizedPages = this.sanitizePages(pages);

    if (activePageId) {
      const exists = sanitizedPages.some((p) => p.id === activePageId && !p.isDeleted);
      if (!exists) {
        const rootPage = sanitizedPages.find((p) => !p.parentId && !p.isDeleted);
        activePageId = rootPage ? rootPage.id : sanitizedPages[0]?.id || null;
      }
    } else {
      const rootPage = sanitizedPages.find((p) => !p.parentId && !p.isDeleted);
      activePageId = rootPage ? rootPage.id : sanitizedPages[0]?.id || null;
    }

    return {
      version: CURRENT_SCHEMA_VERSION,
      timestamp: Date.now(),
      pages: sanitizedPages,
      activePageId,
      sidebarOpen,
    };
  }

  /**
   * Migrates older schemas to the current schema format.
   */
  private migrateSchema(data: any): WorkspaceSnapshot | null {
    if (!data || typeof data !== "object") return null;

    const pages: any[] = Array.isArray(data.pages) ? data.pages : [];

    return {
      version: CURRENT_SCHEMA_VERSION,
      timestamp: typeof data.timestamp === "number" ? data.timestamp : Date.now(),
      pages: this.sanitizePages(pages),
      activePageId: typeof data.activePageId === "string" ? data.activePageId : null,
      sidebarOpen: typeof data.sidebarOpen === "boolean" ? data.sidebarOpen : true,
    };
  }

  /**
   * Ensures all pages have valid required properties and blocks array.
   */
  private sanitizePages(rawPages: any[]): Page[] {
    return rawPages.map((p) => {
      let blocks = Array.isArray(p.blocks) ? p.blocks : [];
      if (blocks.length === 0 && p.content) {
        blocks = [
          {
            id: `block-${Math.random().toString(36).substr(2, 9)}`,
            type: "paragraph",
            data: { text: p.content },
          },
        ];
      }

      return {
        id: String(p.id || `page-${Math.random().toString(36).substr(2, 9)}`),
        title: typeof p.title === "string" ? p.title : "Untitled Page",
        parentId: p.parentId ? String(p.parentId) : null,
        children: Array.isArray(p.children) ? p.children.map(String) : [],
        blocks: blocks.map((b: any) => ({
          id: String(b.id || `block-${Math.random().toString(36).substr(2, 9)}`),
          type: b.type || "paragraph",
          data: b.data && typeof b.data === "object" ? b.data : { text: "" },
        })),
        createdAt: typeof p.createdAt === "number" ? p.createdAt : Date.now(),
        updatedAt: typeof p.updatedAt === "number" ? p.updatedAt : Date.now(),
        lastOpenedAt: typeof p.lastOpenedAt === "number" ? p.lastOpenedAt : null,
        isFavorite: Boolean(p.isFavorite),
        favoriteOrder: typeof p.favoriteOrder === "number" ? p.favoriteOrder : undefined,
        isDeleted: Boolean(p.isDeleted),
        deletedAt: typeof p.deletedAt === "number" ? p.deletedAt : null,
        icon: typeof p.icon === "string" ? p.icon : p.icon === null ? null : undefined,
        coverImage: typeof p.coverImage === "string" ? p.coverImage : p.coverImage === null ? null : undefined,
      };
    });
  }
}

export const persistenceService = new PersistenceService();
