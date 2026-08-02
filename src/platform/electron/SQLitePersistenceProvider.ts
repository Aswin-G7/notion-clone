import { IPersistenceProvider } from "../interfaces";

export class SQLitePersistenceProvider implements IPersistenceProvider {
  constructor() {
    this.checkAndMigrate();
  }

  private checkAndMigrate(): void {
    if (typeof window === "undefined" || !window.electronAPI?.database) {
      return;
    }

    try {
      const isMigrated = window.electronAPI.database.isMigrated();
      if (!isMigrated) {
        const localData: Record<string, string> = {};
        if (typeof localStorage !== "undefined") {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
              const val = localStorage.getItem(key);
              if (val !== null) {
                localData[key] = val;
              }
            }
          }
        }
        window.electronAPI.database.migrateLocalStorage(localData);
      }
    } catch (e) {
      console.error("[SQLitePersistenceProvider] Migration failed:", e);
    }
  }

  public getItem(key: string): string | null {
    if (typeof window !== "undefined" && window.electronAPI?.database) {
      return window.electronAPI.database.getItem(key);
    }
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  }

  public setItem(key: string, value: string): void {
    if (typeof window !== "undefined" && window.electronAPI?.database) {
      window.electronAPI.database.setItem(key, value).catch((e) => {
        console.error("[SQLitePersistenceProvider] setItem error:", e);
      });
      return;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
  }

  public removeItem(key: string): void {
    if (typeof window !== "undefined" && window.electronAPI?.database) {
      window.electronAPI.database.removeItem(key).catch((e) => {
        console.error("[SQLitePersistenceProvider] removeItem error:", e);
      });
      return;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  }

  public clear(): void {
    if (typeof window !== "undefined" && window.electronAPI?.database) {
      window.electronAPI.database.clear().catch((e) => {
        console.error("[SQLitePersistenceProvider] clear error:", e);
      });
      return;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
  }
}
