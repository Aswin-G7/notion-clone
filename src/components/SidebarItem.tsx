import React, { useState } from "react";
import { Page } from "../types";
import { ChevronRight, ChevronDown, Plus, Trash2, Star, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SidebarItemProps {
  page: Page;
  level: number;
  activeId: string | null;
  allPages: Page[];
  onSelect: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFav: boolean) => void;
  onContextMenuPage?: (page: Page, pos: { x: number; y: number }) => void;
  isDraggable?: boolean;
  onDragStartFav?: (e: React.DragEvent, pageId: string) => void;
  onDragOverFav?: (e: React.DragEvent, pageId: string) => void;
  onDropFav?: (e: React.DragEvent, pageId: string) => void;
  onDragLeaveFav?: (e: React.DragEvent) => void;
  onDragEndFav?: () => void;
  isDropTargetAbove?: boolean;
  isDropTargetBelow?: boolean;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  page,
  level,
  activeId,
  allPages,
  onSelect,
  onCreateChild,
  onDelete,
  onToggleFavorite,
  onContextMenuPage,
  isDraggable = false,
  onDragStartFav,
  onDragOverFav,
  onDropFav,
  onDragLeaveFav,
  onDragEndFav,
  isDropTargetAbove,
  isDropTargetBelow,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const children = allPages.filter((p) => p.parentId === page.id && !p.isDeleted);
  const hasChildren = children.length > 0;
  const isActive = activeId === page.id;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const handleSelect = () => {
    onSelect(page.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenuPage) {
      onContextMenuPage(page, { x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div className="w-full relative">
      {isDropTargetAbove && (
        <div className="absolute top-0 left-3 right-2 h-0.5 bg-amber-500 z-10 rounded-full" />
      )}
      <div
        id={`sidebar-item-${page.id}`}
        onClick={handleSelect}
        onContextMenu={handleContextMenu}
        draggable={isDraggable}
        onDragStart={(e) => onDragStartFav?.(e, page.id)}
        onDragOver={(e) => onDragOverFav?.(e, page.id)}
        onDrop={(e) => onDropFav?.(e, page.id)}
        onDragLeave={onDragLeaveFav}
        onDragEnd={onDragEndFav}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        className={`group relative flex items-center justify-between py-1.5 pr-2 rounded-md cursor-pointer text-sm font-medium transition-colors select-none ${
          isActive
            ? "bg-stone-200/80 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold"
            : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-200"
        }`}
      >
        <div className="flex items-center min-w-0 flex-1 gap-1">
          {/* Collapse/Expand Arrow */}
          <button
            id={`toggle-expand-btn-${page.id}`}
            onClick={handleToggleExpand}
            className={`p-0.5 rounded-sm hover:bg-stone-200/80 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-transform ${
              !hasChildren ? "opacity-0 cursor-default" : ""
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Page Icon */}
          <span className="flex items-center justify-center text-base w-4 h-4 shrink-0">
            {page.icon ? page.icon : <FileText className="h-4 w-4 text-stone-400 dark:text-stone-500" />}
          </span>

          {/* Title */}
          <span className="truncate pr-4 font-sans text-[13px]">
            {page.title.trim() === "" ? "Untitled" : page.title}
          </span>
        </div>

        {/* Hover Action Controls */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 pl-1.5 rounded-md shadow-2xs">
          {/* Favorite Toggle */}
          <button
            id={`fav-btn-${page.id}`}
            title={page.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(page.id, !page.isFavorite);
            }}
            className={`p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors ${
              page.isFavorite ? "text-amber-500" : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${page.isFavorite ? "fill-amber-500" : ""}`} />
          </button>

          {/* Add Child Page */}
          <button
            id={`add-child-btn-${page.id}`}
            title="Add a nested page"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
              onCreateChild(page.id);
            }}
            className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>

          {/* Delete Page */}
          <button
            id={`delete-btn-${page.id}`}
            title="Delete page"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(page.id);
            }}
            className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Render children subpages recursively */}
      <AnimatePresence initial={false}>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-l border-stone-200/60 dark:border-stone-800 ml-[15px] pl-0.5">
              {children.map((child) => (
                <SidebarItem
                  key={child.id}
                  page={child}
                  level={level + 1}
                  activeId={activeId}
                  allPages={allPages}
                  onSelect={onSelect}
                  onCreateChild={onCreateChild}
                  onDelete={onDelete}
                  onToggleFavorite={onToggleFavorite}
                  onContextMenuPage={onContextMenuPage}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {isDropTargetBelow && (
        <div className="absolute bottom-0 left-3 right-2 h-0.5 bg-amber-500 z-10 rounded-full" />
      )}
    </div>
  );
};
