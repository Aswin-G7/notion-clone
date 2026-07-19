import React from "react";
import { useApp } from "../context/AppContext";
import { Page } from "../types";
import { Menu, Star, Trash2, ChevronRight, CheckCircle2, MoreHorizontal } from "lucide-react";

export const Toolbar: React.FC = () => {
  const {
    pages,
    activePage,
    sidebarOpen,
    setSidebarOpen,
    updatePage,
    deletePage,
    setActivePageId,
  } = useApp();

  if (!activePage) {
    return (
      <header className="flex items-center h-11 border-b border-stone-200/60 px-4 shrink-0 bg-white select-none">
        <button
          id="toolbar-toggle-sidebar-empty"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 mr-2"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium text-stone-400">No active page</span>
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
    updatePage(activePage.id, { isFavorite: !activePage.isFavorite });
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${activePage.title || "Untitled"}"? This will delete all subpages as well.`)) {
      deletePage(activePage.id);
    }
  };

  return (
    <header className="flex items-center justify-between h-11 border-b border-stone-200/40 px-4 shrink-0 bg-white select-none z-30">
      {/* Left items (Sidebar toggle and Breadcrumbs) */}
      <div className="flex items-center min-w-0 flex-1 gap-2">
        {!sidebarOpen && (
          <button
            id="toolbar-open-sidebar-btn"
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="Open Sidebar"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {/* Breadcrumb row */}
        <nav className="flex items-center text-xs font-medium text-stone-500 overflow-x-auto no-scrollbar py-1">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id}>
                {idx > 0 && <ChevronRight className="h-3 w-3 text-stone-300 mx-1 shrink-0" />}
                <button
                  id={`breadcrumb-${crumb.id}`}
                  onClick={() => setActivePageId(crumb.id)}
                  disabled={isLast}
                  className={`flex items-center gap-1 shrink-0 rounded px-1.5 py-0.5 max-w-[120px] md:max-w-[180px] transition-colors truncate text-left ${
                    isLast
                      ? "text-stone-800 font-semibold cursor-default"
                      : "hover:bg-stone-100 text-stone-400 hover:text-stone-700"
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
        {/* Autosave badge */}
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-sans text-stone-400 font-medium">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          <span>Saved</span>
        </span>

        <div className="w-[1px] h-4 bg-stone-200 hidden sm:block" />

        {/* Favorite page */}
        <button
          id="toolbar-toggle-favorite-btn"
          onClick={handleToggleFavorite}
          className={`p-1.5 rounded transition-colors ${
            activePage.isFavorite
              ? "text-amber-500 hover:bg-amber-50/50"
              : "text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          }`}
          title={activePage.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star className={`h-4 w-4 ${activePage.isFavorite ? "fill-amber-500" : ""}`} />
        </button>

        {/* Page Options (Delete Page) */}
        <button
          id="toolbar-delete-page-btn"
          onClick={handleDelete}
          className="p-1.5 rounded text-stone-400 hover:text-red-600 hover:bg-red-50/50 transition-colors"
          title="Delete page"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
