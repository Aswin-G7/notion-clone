import React from "react";
import { Plus, GripVertical } from "lucide-react";

interface BlockToolbarProps {
  blockId: string;
  onPlusClick: (e: React.MouseEvent) => void;
  onDragClick: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  dragHandleListeners?: any;
  dragHandleAttributes?: any;
}

export const BlockToolbar: React.FC<BlockToolbarProps> = ({
  blockId,
  onPlusClick,
  onDragClick,
  onContextMenu,
  dragHandleListeners,
  dragHandleAttributes,
}) => {
  return (
    <div
      id={`block-toolbar-${blockId}`}
      className="absolute -left-12 top-1/2 -translate-y-1/2 opacity-0 group-hover/block:opacity-100 flex items-center gap-0.5 z-20 transition-opacity select-none pointer-events-auto"
    >
      {/* Add block button */}
      <button
        id={`block-toolbar-plus-${blockId}`}
        onClick={onPlusClick}
        type="button"
        className="w-5 h-5 flex items-center justify-center text-stone-400 dark:text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors cursor-pointer"
        title="Click to add a block below"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {/* Drag handle button */}
      <button
        id={`block-toolbar-drag-${blockId}`}
        onClick={onDragClick}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.preventDefault();
            e.stopPropagation();
            onContextMenu(e);
          }
        }}
        type="button"
        {...(dragHandleListeners || {})}
        {...(dragHandleAttributes || {})}
        className="w-5 h-6 flex items-center justify-center text-stone-300 dark:text-stone-600 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors cursor-grab active:cursor-grabbing"
        title="Drag to reorder / Click to select block"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

