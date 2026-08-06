import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useSettings } from "../hooks/useSettings";
import { platform } from "../platform";
import { SettingsModal } from "./SettingsModal";
import { ExportModal } from "./ExportModal";

export const NativeMenuListener: React.FC = () => {
  const {
    activePage,
    selectedBlockId,
    sidebarOpen,
    favoritePages,
    recentPages,
    createPage,
    importWorkspace,
    importPage,
    duplicateBlock,
    deleteBlock,
    setSidebarOpen,
    setIsSearchOpen,
    setActivePageId,
  } = useApp();

  const { settings, updateSettings } = useSettings();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"page" | "workspace">("page");

  // Synchronize state with Electron's Native Menu
  useEffect(() => {
    if (!platform.menu.isSupported) return;

    platform.menu.updateState({
      hasActivePage: Boolean(activePage),
      selectedBlockId,
      sidebarOpen,
      isFullWidth: settings.editor.lineWidth === "full",
      favoritePages: favoritePages.map((p) => ({
        id: p.id,
        title: p.title,
        icon: p.icon,
      })),
      recentPages: recentPages.slice(0, 10).map((p) => ({
        id: p.id,
        title: p.title,
        icon: p.icon,
      })),
    });
  }, [
    activePage,
    selectedBlockId,
    sidebarOpen,
    settings.editor.lineWidth,
    favoritePages,
    recentPages,
  ]);

  // Handle native menu action triggers
  useEffect(() => {
    if (!platform.menu.isSupported) return;

    const unsubscribe = platform.menu.onAction(async (action: string, payload?: any) => {
      switch (action) {
        case "file:new-page":
          createPage(null);
          break;

        case "file:new-workspace":
          if (platform.workspace.isSupported) {
            await platform.workspace.create();
            window.location.reload();
          }
          break;

        case "file:open-workspace":
          if (platform.workspace.isSupported) {
            const ws = await platform.workspace.open();
            if (ws) window.location.reload();
          }
          break;

        case "file:close-workspace":
          if (platform.workspace.isSupported) {
            await platform.workspace.close();
            window.location.reload();
          }
          break;

        case "file:export-page":
          setExportScope("page");
          setIsExportModalOpen(true);
          break;

        case "file:export-workspace":
          setExportScope("workspace");
          setIsExportModalOpen(true);
          break;

        case "file:import-page": {
          await importPage();
          break;
        }

        case "file:import-workspace": {
          await importWorkspace();
          break;
        }

        case "file:settings":
        case "help:about":
          setIsSettingsModalOpen(true);
          break;

        case "edit:undo":
          document.execCommand("undo");
          break;

        case "edit:redo":
          document.execCommand("redo");
          break;

        case "edit:duplicate-block":
          if (activePage && selectedBlockId) {
            duplicateBlock(activePage.id, selectedBlockId);
          }
          break;

        case "edit:delete-block":
          if (activePage && selectedBlockId) {
            deleteBlock(activePage.id, selectedBlockId);
          }
          break;

        case "view:toggle-sidebar":
          setSidebarOpen(!sidebarOpen);
          break;

        case "view:toggle-full-width": {
          const nextWidth = settings.editor.lineWidth === "full" ? "readable" : "full";
          updateSettings({ editor: { ...settings.editor, lineWidth: nextWidth } });
          break;
        }

        case "go:search":
          setIsSearchOpen(true);
          break;

        case "go:navigate-page":
          if (payload?.pageId) {
            setActivePageId(payload.pageId);
          }
          break;

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [
    activePage,
    selectedBlockId,
    sidebarOpen,
    settings,
    createPage,
    importWorkspace,
    duplicateBlock,
    deleteBlock,
    setSidebarOpen,
    updateSettings,
    setIsSearchOpen,
    setActivePageId,
  ]);

  return (
    <>
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        defaultScope={exportScope}
      />
    </>
  );
};
