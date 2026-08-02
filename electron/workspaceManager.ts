import path from "path";
import fs from "fs";
import { app, dialog, BrowserWindow } from "electron";

export interface WorkspaceInfo {
  path: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface RecentWorkspace {
  path: string;
  name: string;
  lastOpenedAt: number;
}

export interface GlobalConfig {
  activeWorkspacePath: string | null;
  recentWorkspaces: RecentWorkspace[];
}

export class WorkspaceManager {
  private configPath: string = "";
  private globalConfig: GlobalConfig = {
    activeWorkspacePath: null,
    recentWorkspaces: [],
  };

  public async init(): Promise<string | null> {
    const userDataPath = app?.getPath ? app.getPath("userData") : path.join(process.cwd(), ".app-data");
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    this.configPath = path.join(userDataPath, "globalConfig.json");
    this.loadGlobalConfig();

    let activePath = this.globalConfig.activeWorkspacePath;

    // Validate if activePath exists and contains workspace.sqlite or valid workspace folder
    if (activePath && (!fs.existsSync(activePath) || !fs.statSync(activePath).isDirectory())) {
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

  private setupDefaultWorkspace(userDataPath: string): string {
    const workspacesDir = path.join(userDataPath, "workspaces");
    const defaultWsPath = path.join(workspacesDir, "Default Workspace");
    this.ensureWorkspaceFolderStructure(defaultWsPath, "Default Workspace");

    // Migrate legacy workspace.sqlite if it exists at root of userData
    const legacyDbPath = path.join(userDataPath, "workspace.sqlite");
    const targetDbPath = path.join(defaultWsPath, "workspace.sqlite");

    if (fs.existsSync(legacyDbPath) && !fs.existsSync(targetDbPath)) {
      try {
        fs.copyFileSync(legacyDbPath, targetDbPath);
        console.log("[WorkspaceManager] Successfully migrated legacy workspace.sqlite into Default Workspace folder");
      } catch (e) {
        console.error("[WorkspaceManager] Error migrating legacy database file:", e);
      }
    }

    return defaultWsPath;
  }

  public ensureWorkspaceFolderStructure(wsPath: string, defaultName?: string): void {
    if (!fs.existsSync(wsPath)) {
      fs.mkdirSync(wsPath, { recursive: true });
    }

    const assetsDir = path.join(wsPath, "assets");
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const backupsDir = path.join(wsPath, "backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const settingsPath = path.join(wsPath, "settings.json");
    if (!fs.existsSync(settingsPath)) {
      const name = defaultName || path.basename(wsPath);
      const settings = {
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: 1,
      };
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
    }
  }

  private loadGlobalConfig(): void {
    if (fs.existsSync(this.configPath)) {
      try {
        const raw = fs.readFileSync(this.configPath, "utf-8");
        this.globalConfig = JSON.parse(raw);
      } catch (e) {
        console.error("[WorkspaceManager] Failed to parse globalConfig.json:", e);
      }
    }
  }

  public saveGlobalConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.globalConfig, null, 2), "utf-8");
    } catch (e) {
      console.error("[WorkspaceManager] Failed to write globalConfig.json:", e);
    }
  }

  public getActiveWorkspacePath(): string | null {
    return this.globalConfig.activeWorkspacePath;
  }

  public getActiveWorkspaceInfo(): WorkspaceInfo | null {
    const wsPath = this.globalConfig.activeWorkspacePath;
    if (!wsPath || !fs.existsSync(wsPath)) return null;

    let name = path.basename(wsPath);
    let createdAt = Date.now();
    let updatedAt = Date.now();

    const settingsPath = path.join(wsPath, "settings.json");
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
        if (settings.name) name = settings.name;
        if (settings.createdAt) createdAt = settings.createdAt;
        if (settings.updatedAt) updatedAt = settings.updatedAt;
      } catch {}
    }

    return { path: wsPath, name, createdAt, updatedAt };
  }

  public addRecentWorkspace(wsPath: string, name?: string): void {
    const wsName = name || path.basename(wsPath);
    const existingIndex = this.globalConfig.recentWorkspaces.findIndex((r) => r.path === wsPath);

    if (existingIndex >= 0) {
      this.globalConfig.recentWorkspaces[existingIndex].lastOpenedAt = Date.now();
      if (name) this.globalConfig.recentWorkspaces[existingIndex].name = name;
    } else {
      this.globalConfig.recentWorkspaces.unshift({
        path: wsPath,
        name: wsName,
        lastOpenedAt: Date.now(),
      });
    }

    this.globalConfig.recentWorkspaces.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
    this.saveGlobalConfig();
  }

  public getRecentWorkspaces(): RecentWorkspace[] {
    this.globalConfig.recentWorkspaces = this.globalConfig.recentWorkspaces.filter((r) =>
      fs.existsSync(r.path)
    );
    this.saveGlobalConfig();
    return this.globalConfig.recentWorkspaces;
  }

  public removeRecentWorkspace(wsPath: string): boolean {
    this.globalConfig.recentWorkspaces = this.globalConfig.recentWorkspaces.filter(
      (r) => r.path !== wsPath
    );
    this.saveGlobalConfig();
    return true;
  }

  public deleteWorkspaceFolder(wsPath: string): boolean {
    if (!wsPath) return false;

    // 1. Remove from recent workspaces list
    this.removeRecentWorkspace(wsPath);

    // 2. Clear active path if this was active
    if (this.globalConfig.activeWorkspacePath === wsPath) {
      this.globalConfig.activeWorkspacePath = null;
      this.saveGlobalConfig();
    }

    // 3. Delete directory from disk recursively
    try {
      if (fs.existsSync(wsPath)) {
        fs.rmSync(wsPath, { recursive: true, force: true });
        console.log(`[WorkspaceManager] Successfully deleted workspace directory: ${wsPath}`);
      }
      return true;
    } catch (e) {
      console.error(`[WorkspaceManager] Failed to delete workspace directory ${wsPath}:`, e);
      return false;
    }
  }

  public async selectWorkspaceFolder(parentWindow?: BrowserWindow | null): Promise<string | null> {
    const result = await dialog.showOpenDialog(parentWindow || undefined, {
      title: "Select Workspace Folder",
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  }

  public createWorkspace(targetPath: string, name?: string): WorkspaceInfo {
    this.ensureWorkspaceFolderStructure(targetPath, name);
    this.globalConfig.activeWorkspacePath = targetPath;
    const info = this.getActiveWorkspaceInfo()!;
    this.addRecentWorkspace(targetPath, info.name);
    return info;
  }

  public openWorkspace(targetPath: string): WorkspaceInfo {
    this.ensureWorkspaceFolderStructure(targetPath);
    this.globalConfig.activeWorkspacePath = targetPath;
    const info = this.getActiveWorkspaceInfo()!;
    this.addRecentWorkspace(targetPath, info.name);
    return info;
  }

  public closeWorkspace(): void {
    this.globalConfig.activeWorkspacePath = null;
    this.saveGlobalConfig();
  }

  public createBackup(): void {
    const wsPath = this.globalConfig.activeWorkspacePath;
    if (!wsPath || !fs.existsSync(wsPath)) return;

    const dbPath = path.join(wsPath, "workspace.sqlite");
    if (!fs.existsSync(dbPath)) return;

    const backupsDir = path.join(wsPath, "backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupsDir, `workspace-${timestamp}.sqlite`);

    try {
      fs.copyFileSync(dbPath, backupPath);

      // Maintain up to 5 backups
      const files = fs
        .readdirSync(backupsDir)
        .filter((f) => f.startsWith("workspace-") && f.endsWith(".sqlite"))
        .sort();

      if (files.length > 5) {
        for (let i = 0; i < files.length - 5; i++) {
          fs.unlinkSync(path.join(backupsDir, files[i]));
        }
      }
    } catch (e) {
      console.error("[WorkspaceManager] Failed to create database backup:", e);
    }
  }
}

export const workspaceManager = new WorkspaceManager();
