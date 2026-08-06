import { contextBridge, ipcRenderer } from "electron";

export interface WorkspaceInfo {
  path: string;
  name: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpenedAt: number;
}

export interface MenuState {
  hasActivePage: boolean;
  selectedBlockId: string | null;
  sidebarOpen: boolean;
  isFullWidth: boolean;
  favoritePages: { id: string; title: string; icon?: string | null }[];
  recentPages: { id: string; title: string; icon?: string | null }[];
}

export interface IElectronAPI {
  isElectron: boolean;
  clipboard: {
    writeText: (text: string) => Promise<boolean>;
    readText: () => Promise<string>;
  };
  fileSystem: {
    exportFile: (filename: string, content: string | Uint8Array, mimeType?: string) => Promise<boolean>;
    importFile: (acceptFilter?: string) => Promise<{ filename: string; content: string } | null>;
  };
  dialogs: {
    alert: (message: string) => Promise<void>;
    confirm: (message: string) => Promise<boolean>;
  };
  app: {
    getVersion: () => Promise<string>;
  };
  database: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => Promise<boolean>;
    removeItem: (key: string) => Promise<boolean>;
    clear: () => Promise<boolean>;
    migrateLocalStorage: (data: Record<string, string>) => Promise<boolean>;
    isMigrated: () => boolean;
  };
  workspace: {
    getActive: () => Promise<WorkspaceInfo | null>;
    selectFolder: () => Promise<string | null>;
    create: (folderPath?: string, name?: string) => Promise<WorkspaceInfo | null>;
    open: (folderPath?: string) => Promise<WorkspaceInfo | null>;
    switch: (folderPath: string) => Promise<WorkspaceInfo | null>;
    close: () => Promise<boolean>;
    getRecents: () => Promise<RecentWorkspace[]>;
    removeRecent: (folderPath: string) => Promise<boolean>;
    delete: (folderPath: string) => Promise<boolean>;
  };
  menu: {
    onAction: (callback: (action: string, payload?: any) => void) => () => void;
    updateState: (state: MenuState) => void;
  };
}

const electronAPI: IElectronAPI = {
  isElectron: true,
  clipboard: {
    writeText: (text: string) => ipcRenderer.invoke("clipboard:writeText", text),
    readText: () => ipcRenderer.invoke("clipboard:readText"),
  },
  fileSystem: {
    exportFile: (filename: string, content: string, mimeType?: string) =>
      ipcRenderer.invoke("file:exportFile", { filename, content, mimeType }),
    importFile: (acceptFilter?: string) =>
      ipcRenderer.invoke("file:importFile", acceptFilter),
  },
  dialogs: {
    alert: (message: string) => ipcRenderer.invoke("dialog:alert", message),
    confirm: (message: string) => ipcRenderer.invoke("dialog:confirm", message),
  },
  app: {
    getVersion: () => ipcRenderer.invoke("app:getVersion"),
  },
  database: {
    getItem: (key: string) => ipcRenderer.sendSync("db:getItemSync", key),
    setItem: (key: string, value: string) => ipcRenderer.invoke("db:setItem", key, value),
    removeItem: (key: string) => ipcRenderer.invoke("db:removeItem", key),
    clear: () => ipcRenderer.invoke("db:clear"),
    migrateLocalStorage: (data: Record<string, string>) => ipcRenderer.invoke("db:migrateLocalStorage", data),
    isMigrated: () => ipcRenderer.sendSync("db:isMigratedSync"),
  },
  workspace: {
    getActive: () => ipcRenderer.invoke("workspace:getActive"),
    selectFolder: () => ipcRenderer.invoke("workspace:selectFolder"),
    create: (folderPath?: string, name?: string) => ipcRenderer.invoke("workspace:create", folderPath, name),
    open: (folderPath?: string) => ipcRenderer.invoke("workspace:open", folderPath),
    switch: (folderPath: string) => ipcRenderer.invoke("workspace:switch", folderPath),
    close: () => ipcRenderer.invoke("workspace:close"),
    getRecents: () => ipcRenderer.invoke("workspace:getRecents"),
    removeRecent: (folderPath: string) => ipcRenderer.invoke("workspace:removeRecent", folderPath),
    delete: (folderPath: string) => ipcRenderer.invoke("workspace:delete", folderPath),
  },
  menu: {
    onAction: (callback: (action: string, payload?: any) => void) => {
      const handler = (_event: any, action: string, payload?: any) => callback(action, payload);
      ipcRenderer.on("menu:action", handler);
      return () => {
        ipcRenderer.removeListener("menu:action", handler);
      };
    },
    updateState: (state: MenuState) => ipcRenderer.send("menu:updateState", state),
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
