import { IWorkspaceProvider, WorkspaceInfo, RecentWorkspace } from "../interfaces";

export class ElectronWorkspaceProvider implements IWorkspaceProvider {
  public readonly isSupported = true;

  public async getActive(): Promise<WorkspaceInfo | null> {
    if (typeof window !== "undefined" && window.electronAPI?.workspace) {
      return window.electronAPI.workspace.getActive();
    }
    return null;
  }

  public async selectFolder(): Promise<string | null> {
    if (typeof window !== "undefined" && window.electronAPI?.workspace) {
      return window.electronAPI.workspace.selectFolder();
    }
    return null;
  }

  public async create(folderPath?: string, name?: string): Promise<WorkspaceInfo | null> {
    if (typeof window !== "undefined" && window.electronAPI?.workspace) {
      return window.electronAPI.workspace.create(folderPath, name);
    }
    return null;
  }

  public async open(folderPath?: string): Promise<WorkspaceInfo | null> {
    if (typeof window !== "undefined" && window.electronAPI?.workspace) {
      return window.electronAPI.workspace.open(folderPath);
    }
    return null;
  }

  public async switch(folderPath: string): Promise<WorkspaceInfo | null> {
    if (typeof window !== "undefined" && window.electronAPI?.workspace) {
      return window.electronAPI.workspace.switch(folderPath);
    }
    return null;
  }

  public async close(): Promise<boolean> {
    if (typeof window !== "undefined" && window.electronAPI?.workspace) {
      return window.electronAPI.workspace.close();
    }
    return false;
  }

  public async getRecents(): Promise<RecentWorkspace[]> {
    if (typeof window !== "undefined" && window.electronAPI?.workspace) {
      return window.electronAPI.workspace.getRecents();
    }
    return [];
  }

  public async removeRecent(folderPath: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.electronAPI?.workspace) {
      return window.electronAPI.workspace.removeRecent(folderPath);
    }
    return false;
  }

  public async delete(folderPath: string): Promise<boolean> {
    if (typeof window !== "undefined" && window.electronAPI?.workspace) {
      return window.electronAPI.workspace.delete(folderPath);
    }
    return false;
  }
}
