import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockToolbar } from "./BlockToolbar";
import { Block } from "../types";

interface SortableBlockWrapperProps {
  block: Block;
  isSelected: boolean;
  isHighlighted?: boolean;
  paddingYClass: string;
  marginTopClass: string;
  onPlusClick: (e: React.MouseEvent) => void;
  onDragClick: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export const SortableBlockWrapper: React.FC<SortableBlockWrapperProps> = ({
  block,
  isSelected,
  isHighlighted = false,
  paddingYClass,
  marginTopClass,
  onPlusClick,
  onDragClick,
  onContextMenu,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
    position: "relative",
    zIndex: isDragging ? 50 : undefined,
  };

  const handleWrapperClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "BUTTON" ||
      target.isContentEditable ||
      target.closest("[contenteditable='true']") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("textarea");

    if (!isInteractive) {
      e.stopPropagation();
      onDragClick(e);
    }
  };

  const handleWrapperContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(e);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`editor-block-wrapper-${block.id}`}
      onClick={handleWrapperClick}
      onContextMenu={handleWrapperContextMenu}
      className={`group/block relative flex items-start gap-3 pr-2 ${paddingYClass} ${marginTopClass} rounded-lg transition-all ${
        isHighlighted
          ? "bg-amber-100/90 dark:bg-amber-950/50 ring-2 ring-amber-400 dark:ring-amber-500 shadow-md pl-2 duration-300"
          : isSelected
          ? "bg-blue-50/90 dark:bg-blue-950/40 ring-1 ring-blue-300/60 dark:ring-blue-700/60 pl-2"
          : "border-transparent hover:bg-stone-50/40 dark:hover:bg-stone-800/30 pl-2"
      } ${isDragging ? "bg-stone-100/70 dark:bg-stone-800/70 border-stone-300 dark:border-stone-700 shadow-sm" : ""}`}
    >
      {/* Left-aligned Hover Block Controls with drag listeners and attributes */}
      <BlockToolbar
        blockId={block.id}
        onPlusClick={onPlusClick}
        onDragClick={onDragClick}
        onContextMenu={onContextMenu}
        dragHandleListeners={listeners}
        dragHandleAttributes={attributes}
      />

      {children}
    </div>
  );
};
