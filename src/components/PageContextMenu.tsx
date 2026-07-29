import React, { useEffect, useRef, useState } from "react";
import { Page } from "../types";
import { Star, Plus, Copy, Trash2 } from "lucide-react";

interface PageContextMenuProps {
  page: Page;
  position: { x: number; y: number };
  onClose: () => void;
  onToggleFavorite: (pageId: string) => void;
  onCreateChild: (parentId: string) => void;
  onDuplicate: (pageId: string) => void;
  onDelete: (pageId: string) => void;
}

export const PageContextMenu: React.FC<PageContextMenuProps> = ({
  page,
  position,
  onClose,
  onToggleFavorite,
  onCreateChild,
  onDuplicate,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Close on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Screen bounds collision handling
  useEffect(() => {
    if (menuRef.current) {
      const menuWidth = 200;
      const menuHeight = 160;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let x = position.x;
      let y = position.y;

      if (x + menuWidth > windowWidth) {
        x = windowWidth - menuWidth - 12;
      }
      if (y + menuHeight > windowHeight) {
        y = windowHeight - menuHeight - 12;
      }

      setAdjustedPosition({ x: Math.max(8, x), y: Math.max(8, y) });
    }
  }, [position]);

  return (
    <div
      ref={menuRef}
      id={`page-context-menu-${page.id}`}
      style={{
        position: "fixed",
        top: adjustedPosition.y,
        left: adjustedPosition.x,
      }}
      className="z-50 min-w-[190px] bg-white border border-stone-200 shadow-xl rounded-lg py-1 text-stone-800 text-xs font-sans select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Title Header preview */}
      <div className="px-3 py-1.5 text-[11px] font-semibold text-stone-400 border-b border-stone-100 truncate">
        {page.icon ? `${page.icon} ` : "📄 "}
        {page.title.trim() === "" ? "Untitled Page" : page.title}
      </div>

      {/* Toggle Favorite */}
      <button
        id={`page-menu-fav-${page.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(page.id);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-stone-100 text-stone-700 transition-colors"
      >
        <Star
          className={`h-3.5 w-3.5 ${
            page.isFavorite ? "fill-amber-500 text-amber-500" : "text-stone-400"
          }`}
        />
        <span>{page.isFavorite ? "Remove from Favorites" : "Add to Favorites"}</span>
      </button>

      {/* Add Subpage */}
      <button
        id={`page-menu-add-child-${page.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onCreateChild(page.id);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-stone-100 text-stone-700 transition-colors"
      >
        <Plus className="h-3.5 w-3.5 text-stone-400" />
        <span>Add subpage</span>
      </button>

      {/* Duplicate Page */}
      <button
        id={`page-menu-duplicate-${page.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate(page.id);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-stone-100 text-stone-700 transition-colors"
      >
        <Copy className="h-3.5 w-3.5 text-stone-400" />
        <span>Duplicate</span>
      </button>

      <div className="my-1 border-t border-stone-100" />

      {/* Delete Page */}
      <button
        id={`page-menu-delete-${page.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(page.id);
          onClose();
        }}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-red-600 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5 text-red-500" />
        <span>Delete</span>
      </button>
    </div>
  );
};
