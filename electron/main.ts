import { app, BrowserWindow, ipcMain, dialog, clipboard, protocol, net } from "electron";
import path from "path";
import fs from "fs/promises";
import existsSync from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import { sqliteService } from "./sqliteService.js";
import { workspaceManager } from "./workspaceManager.js";
import { setupApplicationMenu } from "./menuManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app-asset",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Workspace Desktop",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:3000";
    await mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.join(__dirname, "../dist/index.html");
    await mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function setupIpcHandlers() {
  // Clipboard
  ipcMain.handle("clipboard:writeText", async (_event, text: string) => {
    try {
      clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle("clipboard:readText", async () => {
    try {
      return clipboard.readText();
    } catch {
      return "";
    }
  });

  // Dialogs
  ipcMain.handle("dialog:alert", async (_event, message: string) => {
    if (!mainWindow) return;
    await dialog.showMessageBox(mainWindow, {
      type: "info",
      message,
      buttons: ["OK"],
    });
  });

  ipcMain.handle("dialog:confirm", async (_event, message: string) => {
    if (!mainWindow) return false;
    const result = await dialog.showMessageBox(mainWindow, {
      type: "question",
      message,
      buttons: ["Cancel", "OK"],
      defaultId: 1,
      cancelId: 0,
    });
    return result.response === 1;
  });

  // Files
  ipcMain.handle(
    "file:exportFile",
    async (_event, { filename, content }: { filename: string; content: string | Uint8Array | Buffer }) => {
      if (!mainWindow) return false;

      const rawExt = filename.split(".").pop()?.toLowerCase() || "";
      let filters: Electron.FileFilter[] | undefined = undefined;
      let defaultExtension: string | undefined = undefined;

      if (rawExt === "md" || rawExt === "markdown") {
        defaultExtension = "md";
        filters = [
          { name: "Markdown Files (*.md, *.markdown)", extensions: ["md", "markdown"] },
          { name: "All Files (*.*)", extensions: ["*"] },
        ];
      } else if (rawExt === "html" || rawExt === "htm") {
        defaultExtension = "html";
        filters = [
          { name: "HTML Documents (*.html)", extensions: ["html", "htm"] },
          { name: "All Files (*.*)", extensions: ["*"] },
        ];
      } else if (rawExt === "pdf") {
        defaultExtension = "pdf";
        filters = [
          { name: "PDF Documents (*.pdf)", extensions: ["pdf"] },
          { name: "All Files (*.*)", extensions: ["*"] },
        ];
      } else if (rawExt === "zip") {
        defaultExtension = "zip";
        filters = [
          { name: "Zip Archives (*.zip)", extensions: ["zip"] },
          { name: "All Files (*.*)", extensions: ["*"] },
        ];
      } else if (rawExt === "json") {
        defaultExtension = "json";
        filters = [
          { name: "JSON Files (*.json)", extensions: ["json"] },
          { name: "All Files (*.*)", extensions: ["*"] },
        ];
      }

      const saveResult = await dialog.showSaveDialog(mainWindow, {
        title: "Save File",
        defaultPath: filename,
        filters,
      });

      if (saveResult.canceled || !saveResult.filePath) {
        return false;
      }

      let filePath = saveResult.filePath;
      if (defaultExtension && !path.extname(filePath)) {
        filePath = `${filePath}.${defaultExtension}`;
      }

      if (typeof content === "string") {
        await fs.writeFile(filePath, content, "utf-8");
      } else {
        await fs.writeFile(filePath, Buffer.from(content));
      }
      return true;
    }
  );

  ipcMain.handle("file:importFile", async (_event, acceptFilter?: string) => {
    if (!mainWindow) return null;

    let filters: Electron.FileFilter[] | undefined = undefined;

    if (acceptFilter) {
      const rawExts = acceptFilter
        .split(",")
        .map((ext) => ext.trim().replace(/^\./, "").toLowerCase())
        .filter(Boolean);

      if (rawExts.length > 0) {
        const isMarkdown = rawExts.some((e) => e === "md" || e === "markdown");
        const isWorkspace = rawExts.some((e) => e === "zip" || e === "json");

        filters = [];

        if (isMarkdown && !isWorkspace) {
          filters.push({
            name: "Markdown Documents",
            extensions: rawExts,
          });
        } else if (isWorkspace && !isMarkdown) {
          filters.push({
            name: "Workspace Archives & Backups",
            extensions: rawExts,
          });
        } else {
          filters.push({
            name: "Supported Documents",
            extensions: rawExts,
          });
        }

        filters.push({
          name: "All Files",
          extensions: ["*"],
        });
      }
    }

    const openResult = await dialog.showOpenDialog(mainWindow, {
      title: "Import File",
      properties: ["openFile"],
      filters,
    });

    if (openResult.canceled || openResult.filePaths.length === 0) {
      return null;
    }

    const filePath = openResult.filePaths[0];
    const fileName = path.basename(filePath);
    const buffer = await fs.readFile(filePath);

    if (fileName.toLowerCase().endsWith(".zip")) {
      return { filename: fileName, content: buffer };
    } else {
      return { filename: fileName, content: buffer.toString("utf-8") };
    }
  });

  ipcMain.handle("app:getVersion", async () => {
    return app.getVersion();
  });

  // Database / SQLite IPC handlers
  ipcMain.on("db:getItemSync", (event, key: string) => {
    event.returnValue = sqliteService.getItem(key);
  });

  ipcMain.on("db:isMigratedSync", (event) => {
    event.returnValue = sqliteService.isMigrated();
  });

  ipcMain.handle("db:setItem", async (_event, key: string, value: string) => {
    sqliteService.setItem(key, value);
    return true;
  });

  ipcMain.handle("db:removeItem", async (_event, key: string) => {
    sqliteService.removeItem(key);
    return true;
  });

  ipcMain.handle("db:clear", async () => {
    sqliteService.clear();
    return true;
  });

  ipcMain.handle(
    "db:migrateLocalStorage",
    async (_event, data: Record<string, string>) => {
      return sqliteService.migrateLocalStorage(data);
    }
  );

  // Workspace IPC handlers
  ipcMain.handle("workspace:getActive", async () => {
    return workspaceManager.getActiveWorkspaceInfo();
  });

  ipcMain.handle("workspace:selectFolder", async () => {
    return workspaceManager.selectWorkspaceFolder(mainWindow);
  });

  ipcMain.handle("workspace:create", async (_event, folderPath?: string, name?: string) => {
    let targetPath = folderPath;
    if (!targetPath) {
      targetPath = await workspaceManager.selectWorkspaceFolder(mainWindow) || undefined;
    }
    if (!targetPath) return null;

    sqliteService.setSaveLocked(true);

    workspaceManager.createBackup();
    const info = workspaceManager.createWorkspace(targetPath, name);
    const dbPath = path.join(targetPath, "workspace.sqlite");

    await sqliteService.switchDatabase(dbPath, true, name || info.name);

    if (mainWindow) {
      mainWindow.reload();
    }

    setTimeout(() => {
      sqliteService.setSaveLocked(false);
    }, 800);

    return info;
  });

  ipcMain.handle("workspace:open", async (_event, folderPath?: string) => {
    let targetPath = folderPath;
    if (!targetPath) {
      targetPath = await workspaceManager.selectWorkspaceFolder(mainWindow) || undefined;
    }
    if (!targetPath) return null;

    sqliteService.setSaveLocked(true);

    workspaceManager.createBackup();
    const info = workspaceManager.openWorkspace(targetPath);
    const dbPath = path.join(targetPath, "workspace.sqlite");

    await sqliteService.switchDatabase(dbPath, false);

    if (mainWindow) {
      mainWindow.reload();
    }

    setTimeout(() => {
      sqliteService.setSaveLocked(false);
    }, 800);

    return info;
  });

  ipcMain.handle("workspace:switch", async (_event, folderPath: string) => {
    sqliteService.setSaveLocked(true);

    workspaceManager.createBackup();
    const info = workspaceManager.openWorkspace(folderPath);
    const dbPath = path.join(folderPath, "workspace.sqlite");

    await sqliteService.switchDatabase(dbPath, false);

    if (mainWindow) {
      mainWindow.reload();
    }

    setTimeout(() => {
      sqliteService.setSaveLocked(false);
    }, 800);

    return info;
  });

  ipcMain.handle("workspace:close", async () => {
    workspaceManager.createBackup();
    workspaceManager.closeWorkspace();
    return true;
  });

  ipcMain.handle("workspace:getRecents", async () => {
    return workspaceManager.getRecentWorkspaces();
  });

  ipcMain.handle("workspace:removeRecent", async (_event, folderPath: string) => {
    return workspaceManager.removeRecentWorkspace(folderPath);
  });

  ipcMain.handle("workspace:delete", async (_event, folderPath: string) => {
    if (!folderPath) return false;

    // Show native confirmation dialog explaining full workspace deletion
    if (mainWindow) {
      const confirmResult = await dialog.showMessageBox(mainWindow, {
        type: "warning",
        title: "Delete Workspace Permanently",
        message: "Are you sure you want to permanently delete this workspace?",
        detail: `This action CANNOT be undone. The workspace directory and all its contents will be permanently deleted from disk:\n\n• workspace.sqlite (Database & Pages)\n• assets/ (Images & Attachments)\n• backups/ (Database Backups)\n• settings.json (Workspace Config)\n• All other workspace-specific files\n\nTarget Workspace Path:\n${folderPath}`,
        buttons: ["Cancel", "Delete Workspace"],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      });

      if (confirmResult.response !== 1) {
        return false;
      }
    }

    const activePath = workspaceManager.getActiveWorkspacePath();
    const isActive = activePath === folderPath;

    if (isActive) {
      // Lock saves and close SQLite database to release file locks on workspace.sqlite
      sqliteService.setSaveLocked(true);
      sqliteService.close();
    }

    // Perform deletion of folder and removal from recents
    const success = workspaceManager.deleteWorkspaceFolder(folderPath);

    if (isActive) {
      // Find next available valid workspace in recents
      const recents = workspaceManager.getRecentWorkspaces();
      const validNext = recents.find((r) => r.path !== folderPath && existsSync.existsSync(r.path));

      let nextWsPath: string;
      if (validNext) {
        nextWsPath = workspaceManager.openWorkspace(validNext.path).path;
      } else {
        const userDataPath = app.getPath("userData");
        nextWsPath = await workspaceManager.init() || path.join(userDataPath, "workspaces", "Default Workspace");
      }

      const dbPath = path.join(nextWsPath, "workspace.sqlite");
      await sqliteService.switchDatabase(dbPath, false);

      if (mainWindow) {
        mainWindow.reload();
      }

      setTimeout(() => {
        sqliteService.setSaveLocked(false);
      }, 800);
    }

    return success;
  });
}

function setupAssetProtocol() {
  protocol.handle("app-asset", async (request) => {
    const activePath = workspaceManager.getActiveWorkspacePath();
    if (!activePath) {
      return new Response("No active workspace", { status: 404 });
    }

    const relativeUrl = request.url.replace(/^app-asset:\/\//, "");
    const relativeClean = relativeUrl.startsWith("assets/")
      ? relativeUrl
      : path.join("assets", relativeUrl);

    const fullFilePath = path.join(activePath, relativeClean);
    try {
      return await net.fetch(pathToFileURL(fullFilePath).toString());
    } catch (err) {
      console.error("[app-asset] Error serving asset file:", fullFilePath, err);
      return new Response("Asset file not found", { status: 404 });
    }
  });
}

app.whenReady().then(async () => {
  setupAssetProtocol();

  const activeWsPath = await workspaceManager.init();
  if (activeWsPath) {
    const dbPath = path.join(activeWsPath, "workspace.sqlite");
    await sqliteService.init(dbPath);
  } else {
    await sqliteService.init();
  }

  setupIpcHandlers();
  setupApplicationMenu(() => mainWindow);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  workspaceManager.createBackup();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
