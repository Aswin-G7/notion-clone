import { useEffect } from "react";
import { useApp } from "../context/AppContext";
import { commandRegistry, Command } from "../services/CommandRegistry";
import { platform } from "../platform";

export function useAppCommands(): void {
  const {
    pages,
    activePageId,
    activePage,
    sidebarOpen,
    canUndo,
    canRedo,
    undo,
    redo,
    setSidebarOpen,
    createPage,
    duplicatePage,
    deletePage,
    toggleFavorite,
    setIsSearchOpen,
    setIsSettingsOpen,
    setIsTrashOpen,
    setIsExportOpen,
    setIsTemplateModalOpen,
    importPage,
    exportWorkspace,
  } = useApp();

  useEffect(() => {
    const commands: Command[] = [
      {
        id: "workspace.undo",
        title: "Undo Workspace Action",
        description: "Revert the last page, block, or workspace change",
        category: "Workspace",
        icon: "Undo",
        shortcut: "⌘Z",
        keywords: ["undo", "revert", "back", "history"],
        enabled: () => canUndo,
        action: () => {
          undo();
        },
      },
      {
        id: "workspace.redo",
        title: "Redo Workspace Action",
        description: "Reapply the last undone workspace change",
        category: "Workspace",
        icon: "Redo",
        shortcut: "⌘⇧Z",
        keywords: ["redo", "forward", "reapply", "history"],
        enabled: () => canRedo,
        action: () => {
          redo();
        },
      },
      {
        id: "page.new",
        title: "New Page",
        description: "Create a new top-level document in workspace",
        category: "Pages",
        icon: "FilePlus",
        shortcut: "⌘N",
        keywords: ["create", "add", "document", "page", "note", "blank"],
        action: () => {
          createPage(null);
        },
      },
      {
        id: "page.new-subpage",
        title: "New Subpage",
        description: "Create a nested subpage under active page",
        category: "Pages",
        icon: "Plus",
        keywords: ["child", "nested", "subpage", "add"],
        enabled: () => !!activePageId,
        action: () => {
          if (activePageId) {
            createPage(activePageId);
          }
        },
      },
      {
        id: "page.duplicate",
        title: "Duplicate Page",
        description: "Duplicate current page and all its blocks",
        category: "Pages",
        icon: "Copy",
        keywords: ["copy", "clone", "replicate", "duplicate"],
        enabled: () => !!activePageId,
        action: () => {
          if (activePageId) {
            duplicatePage(activePageId);
          }
        },
      },
      {
        id: "page.toggle-favorite",
        title: activePage?.isFavorite ? "Remove from Favorites" : "Add to Favorites",
        description: "Star or unstar the current active page",
        category: "Pages",
        icon: "Star",
        keywords: ["favorite", "star", "bookmark", "pin"],
        enabled: () => !!activePageId,
        action: () => {
          if (activePageId) {
            toggleFavorite(activePageId);
          }
        },
      },
      {
        id: "page.delete",
        title: "Delete Page",
        description: "Move current page to Trash",
        category: "Pages",
        icon: "Trash2",
        keywords: ["delete", "remove", "trash", "destroy"],
        enabled: () => !!activePageId,
        action: async () => {
          if (activePage) {
            const confirmed = await platform.dialogs.confirm(
              `Are you sure you want to move "${activePage.title || "Untitled"}" to Trash?`
            );
            if (confirmed) {
              deletePage(activePage.id);
            }
          }
        },
      },
      {
        id: "navigation.search-pages",
        title: "Search Pages & Content",
        description: "Search page titles and block contents",
        category: "Navigation",
        icon: "Search",
        shortcut: "⌘P",
        keywords: ["search", "find", "query", "locate"],
        action: () => {
          setIsSearchOpen(true);
        },
      },
      {
        id: "workspace.template-gallery",
        title: "Template Gallery",
        description: "Browse pre-built templates for notes, wikis, and tasks",
        category: "Workspace",
        icon: "Sparkles",
        keywords: ["template", "preset", "gallery", "starter"],
        action: () => {
          setIsTemplateModalOpen(true);
        },
      },
      {
        id: "workspace.import-page",
        title: "Import Page",
        description: "Import a Markdown or text document as a new page",
        category: "Workspace",
        icon: "Upload",
        keywords: ["import", "markdown", "upload", "file"],
        action: () => {
          importPage();
        },
      },
      {
        id: "workspace.export-page",
        title: "Export Current Page",
        description: "Export current page to Markdown, HTML, PDF, or JSON",
        category: "Workspace",
        icon: "Download",
        keywords: ["export", "download", "save", "markdown", "pdf", "html"],
        action: () => {
          setIsExportOpen(true);
        },
      },
      {
        id: "workspace.export-workspace",
        title: "Export Workspace",
        description: "Download entire workspace as a ZIP package",
        category: "Workspace",
        icon: "Download",
        keywords: ["export", "zip", "backup", "workspace", "all"],
        action: () => {
          exportWorkspace();
        },
      },
      {
        id: "workspace.trash",
        title: "Restore from Trash",
        description: "View and restore deleted pages",
        category: "Workspace",
        icon: "Trash2",
        keywords: ["trash", "restore", "deleted", "bin"],
        action: () => {
          setIsTrashOpen(true);
        },
      },
      {
        id: "workspace.create",
        title: "Create Workspace",
        description: "Create a new workspace folder",
        category: "Workspace",
        icon: "FolderPlus",
        keywords: ["workspace", "create", "new", "folder"],
        action: async () => {
          if (platform.workspace.isSupported) {
            await platform.workspace.create();
          }
        },
      },
      {
        id: "workspace.open",
        title: "Open Workspace",
        description: "Select an existing workspace directory",
        category: "Workspace",
        icon: "FolderOpen",
        keywords: ["workspace", "open", "folder", "directory"],
        action: async () => {
          if (platform.workspace.isSupported) {
            await platform.workspace.selectFolder();
          }
        },
      },
      {
        id: "workspace.switch",
        title: "Switch Workspace",
        description: "Switch to another workspace",
        category: "Workspace",
        icon: "Layers",
        keywords: ["workspace", "switch", "change"],
        action: async () => {
          if (platform.workspace.isSupported) {
            const list = await platform.workspace.getRecents();
            if (list.length > 0) {
              await platform.workspace.switch(list[0].path);
            }
          }
        },
      },
      {
        id: "view.toggle-sidebar",
        title: sidebarOpen ? "Close Sidebar" : "Open Sidebar",
        description: "Toggle navigation sidebar visibility",
        category: "View",
        icon: "Menu",
        shortcut: "⌘\\",
        keywords: ["sidebar", "navigation", "toggle", "hide", "show"],
        action: () => {
          setSidebarOpen(!sidebarOpen);
        },
      },
      {
        id: "view.toggle-theme",
        title: "Toggle Theme",
        description: "Switch between light and dark visual themes",
        category: "View",
        icon: "Moon",
        keywords: ["theme", "dark mode", "light mode", "color", "appearance"],
        action: () => {
          const isDark = document.documentElement.classList.contains("dark");
          if (isDark) {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
          } else {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
          }
        },
      },
      {
        id: "settings.open",
        title: "Open Settings",
        description: "Manage app settings, typography, and storage",
        category: "Settings",
        icon: "Settings",
        shortcut: "⌘,",
        keywords: ["settings", "preferences", "config", "options"],
        action: () => {
          setIsSettingsOpen(true);
        },
      },
    ];

    const unregister = commandRegistry.registerCommands(commands);
    return () => {
      unregister();
    };
  }, [
    pages,
    activePageId,
    activePage,
    sidebarOpen,
    canUndo,
    canRedo,
    undo,
    redo,
    setSidebarOpen,
    createPage,
    duplicatePage,
    deletePage,
    toggleFavorite,
    setIsSearchOpen,
    setIsSettingsOpen,
    setIsTrashOpen,
    setIsExportOpen,
    setIsTemplateModalOpen,
    importPage,
    exportWorkspace,
  ]);
}
