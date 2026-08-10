import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { Page } from "../types";
import { platform } from "../platform";
import { Menu, Star, Trash2, ChevronRight, CheckCircle2, Search, Download, Upload } from "lucide-react";
import { ExportModal } from "./ExportModal";

export const Toolbar: React.FC = () => {
  const {
    pages,
    activePage,
    sidebarOpen,
    setSidebarOpen,
    toggleFavorite,
    deletePage,
    setActivePageId,
    setIsSearchOpen,
    setIsExportOpen,
    importPage,
  } = useApp();

  if (!activePage) {
    return (
      <header className="flex items-center h-11 border-b border-stone-200/60 dark:border-stone-800 px-4 shrink-0 bg-white dark:bg-stone-900 select-none">
        <button
          id="toolbar-toggle-sidebar-empty"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 mr-2"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium text-stone-400 dark:text-stone-500">No active page</span>
      </header>
    );
  }

  // Construct breadcrumbs
  const getBreadcrumbs = (page: Page, allPages: Page[]): Page[] => {
    const crumbs: Page[] = [page];
    let current = page;
    while (current.parentId) {
      const parent = allPages.find((p) => p.id === current.parentId);
      if (parent) {
        crumbs.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs(activePage, pages);

  const handleToggleFavorite = () => {
    toggleFavorite(activePage.id);
  };

  const handleDelete = async () => {
    const confirmed = await platform.dialogs.confirm(
      `Are you sure you want to move "${activePage.title || "Untitled"}" to Trash?`
    );
    if (confirmed) {
      deletePage(activePage.id);
    }
  };

  return (
    <header className="flex items-center justify-between h-11 border-b border-stone-200/40 dark:border-stone-800 px-4 shrink-0 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 select-none z-30 transition-colors">
      {/* Left items (Sidebar toggle and Breadcrumbs) */}
      <div className="flex items-center min-w-0 flex-1 gap-2">
        {!sidebarOpen && (
          <button
            id="toolbar-open-sidebar-btn"
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Open Sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {/* Breadcrumb row */}
        <nav className="flex items-center text-xs font-medium text-stone-500 dark:text-stone-400 overflow-x-auto no-scrollbar py-1">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id}>
                {idx > 0 && <ChevronRight className="h-3 w-3 text-stone-300 dark:text-stone-600 mx-1 shrink-0" />}
                <button
                  id={`breadcrumb-${crumb.id}`}
                  onClick={() => setActivePageId(crumb.id)}
                  disabled={isLast}
                  className={`flex items-center gap-1 shrink-0 rounded px-1.5 py-0.5 max-w-[120px] md:max-w-[180px] transition-colors truncate text-left ${
                    isLast
                      ? "text-stone-800 dark:text-stone-100 font-semibold cursor-default"
                      : "hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  }`}
                >
                  <span className="text-sm shrink-0">{crumb.icon || "📄"}</span>
                  <span className="truncate font-sans text-[12px]">
                    {crumb.title.trim() === "" ? "Untitled" : crumb.title}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Right items (Status & Actions) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Global Search Button */}
        <button
          id="toolbar-search-btn"
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-medium transition-colors"
          title="Search Workspace (Ctrl+P)"
        >
          <Search className="h-3.5 w-3.5 text-stone-400" />
          <span className="hidden sm:inline font-sans">Search</span>
          <kbd className="hidden md:inline-flex items-center text-[10px] text-stone-400 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-1 rounded font-mono">
            ⌘P
          </kbd>
        </button>

        {/* Autosave badge */}
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-sans text-stone-400 dark:text-stone-500 font-medium">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span>Saved</span>
        </span>

        <div className="w-[1px] h-4 bg-stone-200 dark:bg-stone-800 hidden sm:block" />

        {/* Import Page */}
        <button
          id="toolbar-import-page-btn"
          onClick={() => importPage()}
          className="p-1.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="Import Page (.md)"
        >
          <Upload className="h-4 w-4" />
        </button>

        {/* Export Page / Workspace */}
        <button
          id="toolbar-export-btn"
          onClick={() => setIsExportOpen(true)}
          className="p-1.5 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="Export document or workspace"
        >
          <Download className="h-4 w-4" />
        </button>

        {/* Favorite page */}
        <button
          id="toolbar-toggle-favorite-btn"
          onClick={handleToggleFavorite}
          className={`p-1.5 rounded transition-colors ${
            activePage.isFavorite
              ? "text-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/30"
              : "text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          }`}
          title={activePage.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star className={`h-4 w-4 ${activePage.isFavorite ? "fill-amber-500" : ""}`} />
        </button>

        {/* Page Options (Delete Page) */}
        <button
          id="toolbar-delete-page-btn"
          onClick={handleDelete}
          className="p-1.5 rounded text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/30 transition-colors"
          title="Delete page"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
