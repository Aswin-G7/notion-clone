import React, { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { Page } from "../types";
import { trashService } from "../services/TrashService";
import {
  Trash2,
  X,
  RotateCcw,
  Search,
  AlertTriangle,
  FolderTree,
  Clock,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TrashItemNodeProps {
  page: Page;
  level: number;
  allPages: Page[];
  searchQuery: string;
  expandedIds: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (page: Page) => void;
}

const TrashItemNode: React.FC<TrashItemNodeProps> = ({
  page,
  level,
  allPages,
  searchQuery,
  expandedIds,
  onToggleExpand,
  onRestore,
  onPermanentDelete,
}) => {
  const children = trashService.getTrashChildren(allPages, page.id);
  const hasChildren = children.length > 0;
  const descendantCount = trashService.countTrashDescendants(allPages, page.id);

  const q = searchQuery.trim().toLowerCase();
  const hasDescendantMatch =
    q !== "" && trashService.hasDescendantMatchInTrash(allPages, page.id, searchQuery);
  const isExpanded = Boolean(expandedIds[page.id]) || hasDescendantMatch;
  const isDirectMatch = q !== "" && page.title.toLowerCase().includes(q);

  // Format relative time
  const formatTimeAgo = (timestamp?: number | null) => {
    if (!timestamp) return "Recently";
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Get parent title if available (for root items whose parent is active)
  const getActiveParentTitle = () => {
    if (level !== 0 || !page.parentId) return null;
    const parent = allPages.find((p) => p.id === page.parentId);
    if (!parent || parent.isDeleted) return null;
    return parent.title.trim() === "" ? "Untitled" : parent.title;
  };

  const parentTitle = getActiveParentTitle();

  return (
    <div className="flex flex-col">
      <div
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        className={`flex items-center justify-between py-2 pr-2.5 rounded-lg transition-colors group ${
          isDirectMatch
            ? "bg-amber-50/90 dark:bg-amber-950/40 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-900/60"
            : "hover:bg-stone-50 dark:hover:bg-stone-800/40"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          {/* Chevron expand/collapse toggle */}
          {hasChildren ? (
            <button
              onClick={() => onToggleExpand(page.id)}
              className="p-0.5 text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-700 rounded transition-colors cursor-pointer shrink-0"
              title={isExpanded ? "Collapse subtree" : "Expand subtree"}
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
              )}
            </button>
          ) : (
            <div className="w-4.5 h-4.5 shrink-0" />
          )}

          {/* Icon */}
          <span className="text-base shrink-0">{page.icon || "📄"}</span>

          {/* Page Title & Meta Info */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-semibold truncate ${
                  isDirectMatch ? "text-amber-950 dark:text-amber-200 font-bold" : "text-stone-800 dark:text-stone-100"
                }`}
              >
                {page.title.trim() === "" ? "Untitled Page" : page.title}
              </span>
              {isDirectMatch && (
                <span className="px-1.5 py-0.2 text-[9.5px] font-semibold bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 rounded shrink-0">
                  Match
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10.5px] text-stone-400 dark:text-stone-500">
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3 text-stone-300 dark:text-stone-600" />
                <span>{formatTimeAgo(page.deletedAt)}</span>
              </span>
              {parentTitle && (
                <span className="flex items-center gap-1 truncate text-stone-400 dark:text-stone-500">
                  <span>•</span>
                  <FolderTree className="h-3 w-3 text-stone-300 dark:text-stone-600 shrink-0" />
                  <span className="truncate">In {parentTitle}</span>
                </span>
              )}
              {descendantCount > 0 && (
                <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400 font-medium shrink-0">
                  <span>•</span>
                  <FolderTree className="h-3 w-3 text-stone-400 dark:text-stone-500 shrink-0" />
                  <span>
                    {descendantCount} subpage{descendantCount > 1 ? "s" : ""}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            id={`restore-page-btn-${page.id}`}
            onClick={() => onRestore(page.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-700 dark:text-stone-200 bg-white dark:bg-[#282828] hover:bg-stone-100 dark:hover:bg-[#303030] border border-stone-200 dark:border-stone-700 rounded-md transition-all shadow-xs cursor-pointer"
            title="Restore page and hierarchy"
          >
            <RotateCcw className="h-3 w-3 text-stone-500 dark:text-stone-400" />
            <span>Restore</span>
          </button>
          <button
            id={`perm-delete-btn-${page.id}`}
            onClick={() => onPermanentDelete(page)}
            className="p-1.5 text-stone-400 dark:text-stone-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors cursor-pointer"
            title="Delete permanently"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Render child pages if expanded */}
      {hasChildren && isExpanded && (
        <div className="flex flex-col relative">
          {children
            .filter((child) =>
              trashService.isTrashItemInSearchContext(allPages, child.id, searchQuery)
            )
            .map((child) => (
              <TrashItemNode
                key={`trash-item-${child.id}`}
                page={child}
                level={level + 1}
                allPages={allPages}
                searchQuery={searchQuery}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onRestore={onRestore}
                onPermanentDelete={onPermanentDelete}
              />
            ))}
        </div>
      )}
    </div>
  );
};

export const TrashModal: React.FC<TrashModalProps> = ({ isOpen, onClose }) => {
  const {
    pages,
    trashPages,
    restorePage,
    permanentlyDeletePage,
    emptyTrash,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<Page | null>(null);
  const [confirmEmptyAll, setConfirmEmptyAll] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setConfirmDeleteTarget(null);
      setConfirmEmptyAll(false);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (confirmDeleteTarget) {
          setConfirmDeleteTarget(null);
        } else if (confirmEmptyAll) {
          setConfirmEmptyAll(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, confirmDeleteTarget, confirmEmptyAll, onClose]);

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Get root trash pages
  const rootTrashPages = useMemo(() => {
    return trashService.getRootTrashPages(pages);
  }, [pages]);

  // Filter root trash pages by search query
  const filteredRootTrash = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rootTrashPages;
    return rootTrashPages.filter((root) =>
      trashService.isTrashItemInSearchContext(pages, root.id, q)
    );
  }, [rootTrashPages, pages, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        id="trash-modal-container"
        className="w-full max-w-xl bg-white dark:bg-[#1f1f1f] border border-stone-200/90 dark:border-stone-800 shadow-2xl rounded-xl flex flex-col max-h-[85vh] overflow-hidden text-stone-800 dark:text-stone-100 font-sans animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-[#191919]">
          <div className="flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-stone-500 dark:text-stone-400" />
            <h2 className="text-sm font-bold text-stone-800 dark:text-stone-100 tracking-tight">Trash</h2>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
              {trashPages.length} {trashPages.length === 1 ? "page" : "pages"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {trashPages.length > 0 && (
              <button
                id="empty-trash-btn"
                onClick={() => setConfirmEmptyAll(true)}
                className="px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200/80 dark:border-red-900/60 rounded-md transition-all cursor-pointer"
              >
                Empty Trash
              </button>
            )}
            <button
              id="close-trash-modal-btn"
              onClick={onClose}
              className="p-1 rounded-md text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Input */}
        <div className="px-5 py-2.5 border-b border-stone-100 dark:border-stone-800 bg-white dark:bg-[#1f1f1f] flex items-center gap-2">
          <Search className="h-4 w-4 text-stone-400 dark:text-stone-500 shrink-0" />
          <input
            ref={searchInputRef}
            id="trash-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter trash by page title..."
            className="w-full bg-transparent text-xs text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Trashed Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredRootTrash.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-3">
                <Trash2 className="h-5 w-5 text-stone-400 dark:text-stone-500" />
              </div>
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1">
                {searchQuery ? "No matching pages found" : "Trash is empty"}
              </p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500 max-w-xs">
                {searchQuery
                  ? "Try searching with a different page title."
                  : "Deleted pages will appear here. You can restore them anytime or permanently delete them."}
              </p>
            </div>
          ) : (
            filteredRootTrash.map((rootPage) => (
              <TrashItemNode
                key={`root-trash-${rootPage.id}`}
                page={rootPage}
                level={0}
                allPages={pages}
                searchQuery={searchQuery}
                expandedIds={expandedIds}
                onToggleExpand={handleToggleExpand}
                onRestore={restorePage}
                onPermanentDelete={(p) => setConfirmDeleteTarget(p)}
              />
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-2.5 bg-stone-50/80 dark:bg-[#191919] border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-400 dark:text-stone-500 flex items-center justify-between">
          <span>Items in Trash retain all blocks and subpages upon restoration.</span>
        </div>
      </div>

      {/* Confirmation Modal for Permanent Delete of Single Page */}
      {confirmDeleteTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/50 dark:bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-md bg-white dark:bg-[#1f1f1f] border border-stone-200 dark:border-stone-800 shadow-2xl rounded-xl p-5 text-stone-800 dark:text-stone-100 font-sans space-y-4 animate-in zoom-in-95 duration-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Delete page permanently?
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  Are you sure you want to permanently delete{" "}
                  <strong className="text-stone-800 dark:text-stone-200">
                    &ldquo;{confirmDeleteTarget.title.trim() === "" ? "Untitled Page" : confirmDeleteTarget.title}&rdquo;
                  </strong>
                  {confirmDeleteTarget.children && confirmDeleteTarget.children.length > 0
                    ? " and all its subpages"
                    : ""}
                  ? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                onClick={() => setConfirmDeleteTarget(null)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-perm-delete-btn"
                onClick={() => {
                  permanentlyDeletePage(confirmDeleteTarget.id);
                  setConfirmDeleteTarget(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Empty Trash */}
      {confirmEmptyAll && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/50 dark:bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="w-full max-w-md bg-white dark:bg-[#1f1f1f] border border-stone-200 dark:border-stone-800 shadow-2xl rounded-xl p-5 text-stone-800 dark:text-stone-100 font-sans space-y-4 animate-in zoom-in-95 duration-100">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center shrink-0 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Empty Trash completely?
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                  Are you sure you want to permanently delete all{" "}
                  <strong className="text-stone-800 dark:text-stone-200">{trashPages.length}</strong> items in Trash? All pages and subpages will be removed forever. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
              <button
                onClick={() => setConfirmEmptyAll(false)}
                className="px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-empty-trash-btn"
                onClick={() => {
                  emptyTrash();
                  setConfirmEmptyAll(false);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm cursor-pointer"
              >
                Empty Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
