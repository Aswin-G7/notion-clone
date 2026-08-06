import { app, BrowserWindow, Menu, MenuItemConstructorOptions, dialog, shell, ipcMain } from "electron";
import { workspaceManager } from "./workspaceManager.js";

export interface MenuState {
  hasActivePage: boolean;
  selectedBlockId: string | null;
  sidebarOpen: boolean;
  isFullWidth: boolean;
  favoritePages: { id: string; title: string; icon?: string | null }[];
  recentPages: { id: string; title: string; icon?: string | null }[];
}

let currentMenuState: MenuState = {
  hasActivePage: false,
  selectedBlockId: null,
  sidebarOpen: true,
  isFullWidth: false,
  favoritePages: [],
  recentPages: [],
};

let getMainWindowRef: () => BrowserWindow | null = () => null;

function sendMenuAction(action: string, payload?: any) {
  const win = getMainWindowRef();
  if (win && !win.isDestroyed()) {
    win.webContents.send("menu:action", action, payload);
  }
}

export function setupApplicationMenu(getMainWindow: () => BrowserWindow | null) {
  getMainWindowRef = getMainWindow;

  ipcMain.on("menu:updateState", (_event, state: Partial<MenuState>) => {
    currentMenuState = {
      ...currentMenuState,
      ...state,
    };
    buildAndSetMenu();
  });

  buildAndSetMenu();
}

export function buildAndSetMenu() {
  const isMac = process.platform === "darwin";
  const {
    hasActivePage,
    selectedBlockId,
    sidebarOpen,
    isFullWidth,
    favoritePages,
    recentPages,
  } = currentMenuState;

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              {
                label: `About ${app.name}`,
                click: () => sendMenuAction("help:about"),
              },
              { type: "separator" as const },
              {
                label: "Settings...",
                accelerator: "CmdOrCtrl+,",
                click: () => sendMenuAction("file:settings"),
              },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),

    // 1. File Menu
    {
      label: "File",
      submenu: [
        {
          label: "New Page",
          accelerator: "CmdOrCtrl+N",
          click: () => sendMenuAction("file:new-page"),
        },
        { type: "separator" },
        {
          label: "New Workspace...",
          accelerator: "CmdOrCtrl+Shift+N",
          click: () => sendMenuAction("file:new-workspace"),
        },
        {
          label: "Open Workspace...",
          accelerator: "CmdOrCtrl+O",
          click: () => sendMenuAction("file:open-workspace"),
        },
        {
          label: "Close Workspace",
          accelerator: "CmdOrCtrl+Shift+W",
          click: () => sendMenuAction("file:close-workspace"),
        },
        { type: "separator" },
        {
          label: "Export Current Page...",
          accelerator: "CmdOrCtrl+E",
          enabled: hasActivePage,
          click: () => sendMenuAction("file:export-page"),
        },
        {
          label: "Export Workspace...",
          accelerator: "CmdOrCtrl+Shift+E",
          click: () => sendMenuAction("file:export-workspace"),
        },
        {
          label: "Import Workspace...",
          accelerator: "CmdOrCtrl+Shift+I",
          click: () => sendMenuAction("file:import-workspace"),
        },
        { type: "separator" },
        {
          label: "Settings",
          accelerator: "CmdOrCtrl+,",
          click: () => sendMenuAction("file:settings"),
        },
        { type: "separator" },
        isMac ? { role: "close" as const } : { label: "Exit", accelerator: "Alt+F4", click: () => app.quit() },
      ],
    },

    // 2. Edit Menu
    {
      label: "Edit",
      submenu: [
        {
          label: "Undo",
          accelerator: "CmdOrCtrl+Z",
          click: (_item, focusedWindow) => {
            if (focusedWindow) sendMenuAction("edit:undo");
          },
        },
        {
          label: "Redo",
          accelerator: isMac ? "CmdOrCtrl+Shift+Z" : "CmdOrCtrl+Y",
          click: (_item, focusedWindow) => {
            if (focusedWindow) sendMenuAction("edit:redo");
          },
        },
        { type: "separator" },
        {
          label: "Cut",
          accelerator: "CmdOrCtrl+X",
          role: "cut",
        },
        {
          label: "Copy",
          accelerator: "CmdOrCtrl+C",
          role: "copy",
        },
        {
          label: "Paste",
          accelerator: "CmdOrCtrl+V",
          role: "paste",
        },
        { type: "separator" },
        {
          label: "Duplicate Block",
          accelerator: "CmdOrCtrl+D",
          enabled: Boolean(hasActivePage && selectedBlockId),
          click: () => sendMenuAction("edit:duplicate-block"),
        },
        {
          label: "Delete Block",
          accelerator: "Delete",
          enabled: Boolean(hasActivePage && selectedBlockId),
          click: () => sendMenuAction("edit:delete-block"),
        },
        { type: "separator" },
        {
          label: "Select All",
          accelerator: "CmdOrCtrl+A",
          role: "selectAll",
        },
      ],
    },

    // 3. View Menu
    {
      label: "View",
      submenu: [
        {
          label: "Toggle Sidebar",
          accelerator: "CmdOrCtrl+\\",
          type: "checkbox",
          checked: sidebarOpen,
          click: () => sendMenuAction("view:toggle-sidebar"),
        },
        {
          label: "Toggle Full Width",
          accelerator: "CmdOrCtrl+Shift+F",
          type: "checkbox",
          checked: isFullWidth,
          click: () => sendMenuAction("view:toggle-full-width"),
        },
        { type: "separator" },
        { role: "zoomIn", accelerator: "CmdOrCtrl+=" },
        { role: "zoomOut", accelerator: "CmdOrCtrl+-" },
        { role: "resetZoom", accelerator: "CmdOrCtrl+0" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },

    // 4. Go Menu
    {
      label: "Go",
      submenu: [
        {
          label: "Search Pages...",
          accelerator: "CmdOrCtrl+P",
          click: () => sendMenuAction("go:search"),
        },
        { type: "separator" },
        {
          label: "Favorites",
          submenu:
            favoritePages.length > 0
              ? favoritePages.map((page) => ({
                  label: `${page.icon || "📄"} ${page.title || "Untitled"}`,
                  click: () => sendMenuAction("go:navigate-page", { pageId: page.id }),
                }))
              : [{ label: "No Favorite Pages", enabled: false }],
        },
        {
          label: "Recent Pages",
          submenu:
            recentPages.length > 0
              ? recentPages.map((page) => ({
                  label: `${page.icon || "📄"} ${page.title || "Untitled"}`,
                  click: () => sendMenuAction("go:navigate-page", { pageId: page.id }),
                }))
              : [{ label: "No Recent Pages", enabled: false }],
        },
      ],
    },

    // 5. Help Menu
    {
      label: "Help",
      submenu: [
        {
          label: "About Workspace Desktop",
          click: () => sendMenuAction("help:about"),
        },
        {
          label: "Version Info",
          click: async () => {
            const win = getMainWindowRef();
            const version = app.getVersion();
            if (win) {
              await dialog.showMessageBox(win, {
                type: "info",
                title: "Application Version",
                message: `Workspace Desktop v${version}`,
                detail: `Electron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}\nPlatform: ${process.platform}`,
                buttons: ["OK"],
              });
            }
          },
        },
        { type: "separator" },
        {
          label: "Open Data Folder",
          click: async () => {
            const activePath = workspaceManager.getActiveWorkspacePath();
            const targetPath = activePath || app.getPath("userData");
            await shell.openPath(targetPath);
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
