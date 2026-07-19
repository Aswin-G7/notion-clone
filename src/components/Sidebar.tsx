import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { SidebarItem } from "./SidebarItem";
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
  Check
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const {
    pages,
    activePageId,
    sidebarOpen,
    setSidebarOpen,
    createPage,
    deletePage,
    updatePage,
    setActivePageId,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");

  const handleSelectPage = (id: string) => {
    setActivePageId(id);
    // On mobile viewports, automatically close the sidebar after selection for a cleaner UX
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleCreateRootPage = () => {
    createPage(null);
  };

  const handleToggleFavorite = (id: string, isFavorite: boolean) => {
    updatePage(id, { isFavorite });
  };

  // Get only top-level pages (no parent) to start the recursion
  const rootPages = pages.filter((page) => !page.parentId);

  // Get favorite pages
  const favoritePages = pages.filter((page) => page.isFavorite);

  // Filtered pages for search results
  const filteredPages = searchQuery.trim() !== ""
    ? pages.filter((page) =>
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

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
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-[260px] bg-stone-50 border-r border-stone-200 select-none transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        }`}
      >
        {/* Workspace Profile / Header */}
        <div className="flex items-center justify-between px-3 py-3 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-stone-800 text-stone-100 font-bold font-display text-[12px] shrink-0">
              N
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-semibold text-stone-800 truncate font-sans">
                Personal Workspace
              </span>
              <span className="text-[10px] text-stone-400 truncate">
                Free Plan • Aswin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Collapse Sidebar Button (for desktop) */}
            <button
              id="sidebar-collapse-btn"
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 md:flex hidden"
              title="Close Sidebar (⌘\)"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            {/* Close Sidebar Button (for mobile) */}
            <button
              id="sidebar-close-mobile-btn"
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 md:hidden flex"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Utilities Block */}
        <div className="px-3 py-1 space-y-0.5 shrink-0">
          {/* Search bar input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <input
              id="sidebar-search-input"
              type="text"
              placeholder="Search page..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1 bg-stone-200/40 border border-transparent hover:bg-stone-200/60 focus:bg-white focus:border-stone-300 focus:outline-none rounded text-xs text-stone-700 transition-all font-sans"
            />
            {searchQuery && (
              <button
                id="clear-search-btn"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Quick static settings action buttons */}
          <button
            id="sidebar-settings-btn"
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-200/30 text-[12px] font-medium font-sans"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-3.5 w-3.5" />
              <span>Settings & Members</span>
            </div>
            <span className="text-[10px] text-stone-400 bg-stone-200/50 px-1 py-0.5 rounded flex items-center gap-0.5 font-mono">
              <Command className="h-2 w-2" />
              <span>,</span>
            </span>
          </button>
        </div>

        {/* Scrollable Document List */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {/* Search Results Mode */}
          {searchQuery.trim() !== "" ? (
            <div className="space-y-1">
              <div className="px-2 pb-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                <span>Search Results ({filteredPages.length})</span>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-stone-400 hover:text-stone-600 normal-case font-normal text-[10px]"
                >
                  Clear
                </button>
              </div>
              {filteredPages.length > 0 ? (
                <div className="space-y-0.5">
                  {filteredPages.map((page) => (
                    <div
                      key={page.id}
                      onClick={() => handleSelectPage(page.id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs font-medium transition-colors ${
                        activePageId === page.id
                          ? "bg-stone-200/60 text-stone-950"
                          : "text-stone-600 hover:bg-stone-200/30 hover:text-stone-900"
                      }`}
                    >
                      <span className="text-sm shrink-0">{page.icon || "📄"}</span>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate font-sans font-medium text-stone-800">
                          {page.title.trim() === "" ? "Untitled" : page.title}
                        </span>
                        {page.content && (
                          <span className="truncate text-[10px] text-stone-400 font-normal">
                            {page.content.substring(0, 40)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-2 py-4 text-xs text-stone-400 italic text-center font-sans">
                  No matching pages found
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Favorites Section */}
              {favoritePages.length > 0 && (
                <div className="space-y-0.5">
                  <div className="px-2 pb-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1 font-sans">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    <span>Favorites</span>
                  </div>
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
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Private Pages Section */}
              <div className="space-y-0.5">
                <div className="px-2 pb-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between font-sans">
                  <span className="flex items-center gap-1">
                    <FolderOpen className="h-3 w-3 text-stone-400" />
                    <span>Private Pages</span>
                  </span>
                  <button
                    id="add-root-page-top-btn"
                    onClick={handleCreateRootPage}
                    className="p-0.5 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200"
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
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-6 text-center border border-dashed border-stone-200 rounded-lg">
                    <p className="text-[11px] text-stone-400 font-sans mb-2">No pages yet</p>
                    <button
                      onClick={handleCreateRootPage}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-stone-600 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded transition-all"
                    >
                      <Plus className="h-3 w-3" />
                      Create first page
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-2 border-t border-stone-200 bg-stone-50 shrink-0">
          <button
            id="sidebar-new-page-footer-btn"
            onClick={handleCreateRootPage}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-200/50 text-[13px] font-medium font-sans text-left transition-colors"
          >
            <FilePlus className="h-4 w-4 text-stone-400" />
            <span>Add a page</span>
          </button>
        </div>
      </aside>
    </>
  );
};
