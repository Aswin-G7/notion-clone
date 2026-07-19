import React from "react";
import { Plus, GripVertical } from "lucide-react";

interface BlockToolbarProps {
  blockId: string;
  onPlusClick: (e: React.MouseEvent) => void;
  onDragClick: (e: React.MouseEvent) => void;
  dragHandleListeners?: any;
  dragHandleAttributes?: any;
}

export const BlockToolbar: React.FC<BlockToolbarProps> = ({
  blockId,
  onPlusClick,
  onDragClick,
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
        className="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded transition-colors cursor-pointer"
        title="Click to add a block below"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {/* Drag handle button */}
      <button
        id={`block-toolbar-drag-${blockId}`}
        onClick={onDragClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onDragClick(e);
        }}
        type="button"
        {...(dragHandleListeners || {})}
        {...(dragHandleAttributes || {})}
        className="w-5 h-6 flex items-center justify-center text-stone-300 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors cursor-grab active:cursor-grabbing"
        title="Drag to reorder / Click for menu"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

