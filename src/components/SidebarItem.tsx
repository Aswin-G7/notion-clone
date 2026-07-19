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
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const children = allPages.filter((p) => p.parentId === page.id);
  const hasChildren = children.length > 0;
  const isActive = activeId === page.id;

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const handleSelect = () => {
    onSelect(page.id);
  };

  return (
    <div className="w-full">
      <div
        id={`sidebar-item-${page.id}`}
        onClick={handleSelect}
        style={{ paddingLeft: `${level * 12 + 12}px` }}
        className={`group relative flex items-center justify-between py-1.5 pr-2 rounded-md cursor-pointer text-sm font-medium transition-colors select-none ${
          isActive
            ? "bg-stone-200/60 text-stone-900"
            : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
        }`}
      >
        <div className="flex items-center min-w-0 flex-1 gap-1">
          {/* Collapse/Expand Arrow */}
          <button
            id={`toggle-expand-btn-${page.id}`}
            onClick={handleToggleExpand}
            className={`p-0.5 rounded-sm hover:bg-stone-200/80 text-stone-400 hover:text-stone-600 transition-transform ${
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
            {page.icon ? page.icon : <FileText className="h-4 w-4 text-stone-400" />}
          </span>

          {/* Title */}
          <span className="truncate pr-4 font-sans text-[13px]">
            {page.title.trim() === "" ? "Untitled" : page.title}
          </span>
        </div>

        {/* Hover Action Controls */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-gradient-to-l from-stone-100 via-stone-100 pl-2 group-hover:from-transparent group-hover:via-stone-100/10 group-active:bg-transparent">
          {/* Favorite Toggle */}
          <button
            id={`fav-btn-${page.id}`}
            title={page.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(page.id, !page.isFavorite);
            }}
            className={`p-1 rounded hover:bg-stone-200 transition-colors ${
              page.isFavorite ? "text-amber-500" : "text-stone-400 hover:text-stone-600"
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
            className="p-1 rounded hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors"
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
            className="p-1 rounded hover:bg-stone-200 text-stone-400 hover:text-red-600 transition-colors"
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
            <div className="border-l border-stone-200/60 ml-[15px] pl-0.5">
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
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
