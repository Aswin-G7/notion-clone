import { contextBridge, ipcRenderer } from "electron";

export interface IElectronAPI {
  isElectron: boolean;
  clipboard: {
    writeText: (text: string) => Promise<boolean>;
    readText: () => Promise<string>;
  };
  fileSystem: {
    exportFile: (filename: string, content: string, mimeType?: string) => Promise<boolean>;
    importFile: (acceptFilter?: string) => Promise<{ filename: string; content: string } | null>;
  };
  dialogs: {
    alert: (message: string) => Promise<void>;
    confirm: (message: string) => Promise<boolean>;
  };
  app: {
    getVersion: () => Promise<string>;
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
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
