import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { platform } from "../platform";
import { SidebarItem } from "./SidebarItem";
import { TemplateGalleryModal } from "./TemplateGalleryModal";
import { TrashModal } from "./TrashModal";
import { PageContextMenu } from "./PageContextMenu";
import { WorkspaceSelectorPopover } from "./WorkspaceSelectorPopover";
import { SettingsModal } from "./SettingsModal";
import { isUserEditingText } from "../utils/dom";
import { Page } from "../types";
import { WorkspaceInfo } from "../types/electron";
import {
  Plus,
  Search,
  Settings,
  ChevronsLeft,
  Command,
  Star,
  Layers,
  FolderOpen,
  X,
  FilePlus,
  FileText,
  Check,
  LayoutGrid,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Trash2,
  Clock,
  Download,
  Upload,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const {
    pages,
    favoritePages,
    recentPages,
    trashPages,
    toggleFavorite,
    reorderFavorites,
    activePageId,
    sidebarOpen,
    setSidebarOpen,
    createPage,
    deletePage,
    updatePage,
    setActivePageId,
    setIsSearchOpen,
    setIsSettingsOpen,
    setIsTrashOpen,
    setIsTemplateModalOpen,
    exportWorkspace,
    importWorkspace,
    importPage,
  } = useApp();

  const handleImportWorkspaceClick = async () => {
    await importWorkspace();
  };

  const handleImportPageClick = async () => {
    await importPage();
  };

  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState(true);
  const [isRecentExpanded, setIsRecentExpanded] = useState(true);
  const [showWorkspaceSelector, setShowWorkspaceSelector] = useState(false);
  const [activeWorkspaceInfo, setActiveWorkspaceInfo] = useState<WorkspaceInfo | null>(null);

  useEffect(() => {
    if (platform.workspace.isSupported) {
      platform.workspace.getActive().then((ws) => {
        if (ws) setActiveWorkspaceInfo(ws);
      });
    }
  }, []);

  // Global keyboard shortcut for Settings (Cmd/Ctrl + ,)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setIsSettingsOpen]);

  // Drag and drop state for favorites reordering
  const [draggedFavId, setDraggedFavId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  // Right-click context menu state
  const [contextMenuPage, setContextMenuPage] = useState<Page | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  const handleSelectPage = (id: string) => {
    setActivePageId(id);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleCreateRootPage = () => {
    createPage(null);
  };

  const handleDuplicatePage = (pageId: string) => {
    const pageToDup = pages.find((p) => p.id === pageId);
    if (!pageToDup) return;
    const newId = createPage(pageToDup.parentId);
    updatePage(newId, {
      title: `${pageToDup.title || "Untitled"} (Copy)`,
      icon: pageToDup.icon,
      coverImage: pageToDup.coverImage,
      blocks: JSON.parse(JSON.stringify(pageToDup.blocks)),
    });
  };

  // Drag and drop handlers for favorites
  const handleDragStartFav = (e: React.DragEvent, pageId: string) => {
    e.dataTransfer.setData("text/plain", pageId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedFavId(pageId);
  };

  const handleDragOverFav = (e: React.DragEvent, pageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedFavId && draggedFavId !== pageId) {
      setDropTargetId(pageId);
    }
  };

  const handleDropFav = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain") || draggedFavId;
    if (draggedId && draggedId !== targetId) {
      reorderFavorites(draggedId, targetId);
    }
    setDraggedFavId(null);
    setDropTargetId(null);
  };

  const handleDragLeaveFav = () => {
    // Optionally reset target if leaving section
  };

  const handleDragEndFav = () => {
    setDraggedFavId(null);
    setDropTargetId(null);
  };

  // Get only top-level pages (no parent) to start recursion
  const rootPages = pages.filter((page) => !page.parentId && !page.isDeleted);

  const handleSidebarClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("input") && !target.closest("textarea")) {
      if (document.activeElement instanceof HTMLElement && isUserEditingText()) {
        document.activeElement.blur();
      }
    }
  };

  return (
    <>
      {/* Mobile Sidebar Overlay Backdrop */}
      {sidebarOpen && (
        <div
          id="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-stone-900/20 backdrop-blur-[1px] md:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        id="app-sidebar"
        onClick={handleSidebarClick}
        onMouseDown={handleSidebarClick}
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-[260px] bg-stone-50 dark:bg-[#202020] border-r border-stone-200 dark:border-stone-800 select-none transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        }`}
      >
        {/* Workspace Profile / Header */}
        <div className="relative flex items-center justify-between px-3 py-3 shrink-0">
          {platform.workspace.isSupported ? (
            <button
              id="workspace-switcher-btn"
              type="button"
              onClick={() => setShowWorkspaceSelector(!showWorkspaceSelector)}
              className="flex items-center gap-2 overflow-hidden hover:bg-stone-200/50 dark:hover:bg-stone-800 p-1 rounded-lg transition-colors cursor-pointer text-left min-w-0"
              title="Manage & switch workspaces"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded bg-stone-800 dark:bg-stone-100 text-stone-100 dark:text-stone-900 font-bold font-display text-[12px] shrink-0">
                {activeWorkspaceInfo?.name?.[0]?.toUpperCase() || "N"}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[13px] font-semibold text-stone-800 dark:text-stone-200 truncate font-sans">
                    {activeWorkspaceInfo?.name || "Personal Workspace"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
                </div>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                  Desktop Folder Workspace
                </span>
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2 overflow-hidden p-1 rounded-lg min-w-0">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-stone-800 dark:bg-stone-100 text-stone-100 dark:text-stone-900 font-bold font-display text-[12px] shrink-0">
                N
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-semibold text-stone-800 dark:text-stone-200 truncate font-sans">
                  Personal Workspace
                </span>
                <span className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                  Free Plan • Aswin
                </span>
              </div>
            </div>
          )}

          {platform.workspace.isSupported && showWorkspaceSelector && (
            <WorkspaceSelectorPopover onClose={() => setShowWorkspaceSelector(false)} />
          )}

          <div className="flex items-center gap-1 shrink-0">
            {/* Collapse Sidebar Button (for desktop) */}
            <button
              id="sidebar-collapse-btn"
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 md:flex hidden"
              title="Close Sidebar (⌘\)"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            {/* Close Sidebar Button (for mobile) */}
            <button
              id="sidebar-close-mobile-btn"
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 md:hidden flex"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Utilities Block */}
        <div className="px-3 py-1 space-y-0.5 shrink-0">
          {/* Global Search Button Trigger */}
          <button
            id="sidebar-search-btn"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800/60 text-[12px] font-medium font-sans text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
              <span>Search</span>
            </div>
            <span className="text-[10px] text-stone-400 dark:text-stone-500 bg-stone-200/50 dark:bg-stone-800 px-1 py-0.5 rounded flex items-center gap-0.5 font-mono">
              <Command className="h-2.5 w-2.5" />
              <span>P</span>
            </span>
          </button>

          {/* Quick static settings action buttons */}
          <button
            id="sidebar-settings-btn"
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800/60 text-[12px] font-medium font-sans cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
              <span>Settings & Preferences</span>
            </div>
            <span className="text-[10px] text-stone-400 dark:text-stone-500 bg-stone-200/50 dark:bg-stone-800 px-1 py-0.5 rounded flex items-center gap-0.5 font-mono">
              <Command className="h-2 w-2" />
              <span>,</span>
            </span>
          </button>
        </div>

        {/* Scrollable Document List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {/* Favorites Section */}
          {favoritePages.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2 pb-1 text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider flex items-center justify-between font-sans">
                <button
                  id="toggle-favorites-section-btn"
                  onClick={() => setIsFavoritesExpanded((prev) => !prev)}
                  className="flex items-center gap-1 hover:text-stone-700 dark:hover:text-stone-300 transition-colors cursor-pointer"
                >
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  <span>Favorites</span>
                  {isFavoritesExpanded ? (
                    <ChevronDown className="h-3 w-3 text-stone-400 dark:text-stone-500" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-stone-400 dark:text-stone-500" />
                  )}
                </button>
              </div>

              {isFavoritesExpanded && (
                <div className="space-y-0.5">
                  {favoritePages.map((page) => (
                    <SidebarItem
                      key={`fav-${page.id}`}
                      page={page}
                      level={0}
                      activeId={activePageId}
                      allPages={pages}
                      onSelect={handleSelectPage}
                      onCreateChild={createPage}
                      onDelete={deletePage}
                      onToggleFavorite={(id) => toggleFavorite(id)}
                      onContextMenuPage={(p, pos) => {
                        setContextMenuPage(p);
                        setContextMenuPos(pos);
                      }}
                      isDraggable={true}
                      onDragStartFav={handleDragStartFav}
                      onDragOverFav={handleDragOverFav}
                      onDropFav={handleDropFav}
                      onDragLeaveFav={handleDragLeaveFav}
                      onDragEndFav={handleDragEndFav}
                      isDropTargetAbove={dropTargetId === page.id && draggedFavId !== page.id}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent Pages Section */}
          {recentPages.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2 pb-1 text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider flex items-center justify-between font-sans">
                <button
                  id="toggle-recent-section-btn"
                  onClick={() => setIsRecentExpanded((prev) => !prev)}
                  className="flex items-center gap-1 hover:text-stone-700 dark:hover:text-stone-300 transition-colors cursor-pointer"
                >
                  <Clock className="h-3 w-3 text-stone-400 dark:text-stone-500" />
                  <span>Recent</span>
                  {isRecentExpanded ? (
                    <ChevronDown className="h-3 w-3 text-stone-400 dark:text-stone-500" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-stone-400 dark:text-stone-500" />
                  )}
                </button>
              </div>

              {isRecentExpanded && (
                <div className="space-y-0.5">
                  {recentPages.map((page) => (
                    <SidebarItem
                      key={`recent-${page.id}`}
                      page={page}
                      level={0}
                      activeId={activePageId}
                      allPages={pages}
                      onSelect={handleSelectPage}
                      onCreateChild={createPage}
                      onDelete={deletePage}
                      onToggleFavorite={(id) => toggleFavorite(id)}
                      onContextMenuPage={(p, pos) => {
                        setContextMenuPage(p);
                        setContextMenuPos(pos);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Private Pages Section */}
          <div className="space-y-0.5">
            <div className="px-2 pb-1 text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider flex items-center justify-between font-sans">
              <span className="flex items-center gap-1">
                <FolderOpen className="h-3 w-3 text-stone-400 dark:text-stone-500" />
                <span>Private Pages</span>
              </span>
              <button
                id="add-root-page-top-btn"
                onClick={handleCreateRootPage}
                className="p-0.5 rounded text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800"
                title="Add a page"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            
            {rootPages.length > 0 ? (
              <div className="space-y-0.5">
                {rootPages.map((page) => (
                  <SidebarItem
                    key={page.id}
                    page={page}
                    level={0}
                    activeId={activePageId}
                    allPages={pages}
                    onSelect={handleSelectPage}
                    onCreateChild={createPage}
                    onDelete={deletePage}
                    onToggleFavorite={(id) => toggleFavorite(id)}
                    onContextMenuPage={(p, pos) => {
                      setContextMenuPage(p);
                      setContextMenuPos(pos);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="px-3 py-6 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-lg">
                <p className="text-[11px] text-stone-400 dark:text-stone-500 font-sans mb-2">No pages yet</p>
                <button
                  onClick={handleCreateRootPage}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded transition-all cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  Create first page
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-2 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#202020] shrink-0 space-y-1">
          <button
            id="sidebar-templates-btn"
            onClick={() => setIsTemplateModalOpen(true)}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800/60 text-[13px] font-medium font-sans text-left transition-colors cursor-pointer"
          >
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Templates</span>
          </button>
          <button
            id="sidebar-trash-btn"
            onClick={() => setIsTrashOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800/60 text-[13px] font-medium font-sans text-left transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-stone-400 dark:text-stone-500 shrink-0" />
              <span>Trash</span>
            </div>
            {trashPages.length > 0 && (
              <span className="text-[10px] font-mono font-medium text-stone-500 dark:text-stone-400 bg-stone-200/70 dark:bg-stone-800 px-1.5 py-0.2 rounded-full">
                {trashPages.length}
              </span>
            )}
          </button>
          <button
            id="sidebar-import-page-btn"
            onClick={handleImportPageClick}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800/60 text-[13px] font-medium font-sans text-left transition-colors cursor-pointer"
            title="Import page from Markdown document (.md)"
          >
            <FileText className="h-4 w-4 text-stone-400 dark:text-stone-500 shrink-0" />
            <span>Import Page</span>
          </button>
          <button
            id="sidebar-export-workspace-btn"
            onClick={exportWorkspace}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800/60 text-[13px] font-medium font-sans text-left transition-colors cursor-pointer"
            title="Export complete workspace JSON backup"
          >
            <Download className="h-4 w-4 text-stone-400 dark:text-stone-500 shrink-0" />
            <span>Export Workspace</span>
          </button>
          <button
            id="sidebar-import-workspace-btn"
            onClick={handleImportWorkspaceClick}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800/60 text-[13px] font-medium font-sans text-left transition-colors cursor-pointer"
            title="Import workspace backup archive"
          >
            <Upload className="h-4 w-4 text-stone-400 dark:text-stone-500 shrink-0" />
            <span>Import Workspace</span>
          </button>
          <button
            id="sidebar-new-page-footer-btn"
            onClick={handleCreateRootPage}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800/60 text-[13px] font-medium font-sans text-left transition-colors cursor-pointer"
          >
            <FilePlus className="h-4 w-4 text-stone-400 dark:text-stone-500" />
            <span>Add a page</span>
          </button>
        </div>
      </aside>

      {/* Page Context Menu */}
      {contextMenuPage && contextMenuPos && (
        <PageContextMenu
          page={contextMenuPage}
          position={contextMenuPos}
          onClose={() => {
            setContextMenuPage(null);
            setContextMenuPos(null);
          }}
          onToggleFavorite={toggleFavorite}
          onCreateChild={createPage}
          onDuplicate={handleDuplicatePage}
          onDelete={deletePage}
        />
      )}
    </>
  );
};
