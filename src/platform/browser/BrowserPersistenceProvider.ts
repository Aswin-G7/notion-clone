import { IPersistenceProvider } from "../interfaces";

export class BrowserPersistenceProvider implements IPersistenceProvider {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error("[BrowserPersistenceProvider] Error getting item:", e);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error("[BrowserPersistenceProvider] Error setting item:", e);
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error("[BrowserPersistenceProvider] Error removing item:", e);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (e) {
      console.error("[BrowserPersistenceProvider] Error clearing storage:", e);
    }
  }
}
