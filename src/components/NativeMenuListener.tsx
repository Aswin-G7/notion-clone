import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useSettings } from "../hooks/useSettings";
import { platform } from "../platform";
import { isUserEditingText } from "../utils/dom";
import { SettingsModal } from "./SettingsModal";
import { ExportModal } from "./ExportModal";

export const NativeMenuListener: React.FC = () => {
  const {
    activePage,
    selectedBlockId,
    sidebarOpen,
    favoritePages,
    recentPages,
    undo,
    redo,
    createPage,
    importWorkspace,
    importPage,
    duplicateBlock,
    deleteBlock,
    setSidebarOpen,
    setIsSearchOpen,
    setIsSettingsOpen,
    setIsExportOpen,
    setActivePageId,
  } = useApp();

  const { settings, updateSettings } = useSettings();

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
        case "file:export-workspace":
          setIsExportOpen(true);
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
          setIsSettingsOpen(true);
          break;

        case "edit:undo":
          if (isUserEditingText()) {
            document.execCommand("undo");
          } else {
            undo();
          }
          break;

        case "edit:redo":
          if (isUserEditingText()) {
            document.execCommand("redo");
          } else {
            redo();
          }
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

  return null;
};
