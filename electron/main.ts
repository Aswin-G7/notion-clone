import { app, BrowserWindow, ipcMain, dialog, clipboard } from "electron";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  ipcMain.handle(
    "file:exportFile",
    async (_event, { filename, content }: { filename: string; content: string }) => {
      if (!mainWindow) return false;
      const saveResult = await dialog.showSaveDialog(mainWindow, {
        defaultPath: filename,
      });
      if (saveResult.canceled || !saveResult.filePath) {
        return false;
      }
      await fs.writeFile(saveResult.filePath, content, "utf-8");
      return true;
    }
  );

  ipcMain.handle("file:importFile", async (_event, _acceptFilter?: string) => {
    if (!mainWindow) return null;
    const openResult = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
    });
    if (openResult.canceled || openResult.filePaths.length === 0) {
      return null;
    }
    const filePath = openResult.filePaths[0];
    const fileName = path.basename(filePath);
    const content = await fs.readFile(filePath, "utf-8");
    return { filename: fileName, content };
  });

  ipcMain.handle("app:getVersion", async () => {
    return app.getVersion();
  });
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
