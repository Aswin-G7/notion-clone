import { IWorkspaceProvider, WorkspaceInfo, RecentWorkspace } from "../interfaces";

export class BrowserWorkspaceProvider implements IWorkspaceProvider {
  public readonly isSupported = false;

  public async getActive(): Promise<WorkspaceInfo | null> {
    return {
      path: "browser",
      name: "Personal Workspace",
    };
  }

  public async selectFolder(): Promise<string | null> {
    return null;
  }

  public async create(): Promise<WorkspaceInfo | null> {
    return null;
  }

  public async open(): Promise<WorkspaceInfo | null> {
    return null;
  }

  public async switch(): Promise<WorkspaceInfo | null> {
    return null;
  }

  public async close(): Promise<boolean> {
    return false;
  }

  public async getRecents(): Promise<RecentWorkspace[]> {
    return [];
  }

  public async removeRecent(): Promise<boolean> {
    return false;
  }

  public async delete(): Promise<boolean> {
    return false;
  }
}
