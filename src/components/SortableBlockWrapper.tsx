import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockToolbar } from "./BlockToolbar";
import { Block } from "../types";

interface SortableBlockWrapperProps {
  block: Block;
  isSelected: boolean;
  paddingYClass: string;
  marginTopClass: string;
  onPlusClick: (e: React.MouseEvent) => void;
  onDragClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export const SortableBlockWrapper: React.FC<SortableBlockWrapperProps> = ({
  block,
  isSelected,
  paddingYClass,
  marginTopClass,
  onPlusClick,
  onDragClick,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      id={`editor-block-wrapper-${block.id}`}
      className={`group/block relative flex items-start gap-3 pr-2 ${paddingYClass} ${marginTopClass} rounded-lg transition-all border-l-2 ${
        isSelected
          ? "bg-stone-50/80 border-stone-800 pl-3.5"
          : "border-transparent hover:bg-stone-50/30 pl-2"
      } ${isDragging ? "bg-stone-100/70 border-stone-300 shadow-sm" : ""}`}
    >
      {/* Left-aligned Hover Block Controls with drag listeners and attributes */}
      <BlockToolbar
        blockId={block.id}
        onPlusClick={onPlusClick}
        onDragClick={onDragClick}
        dragHandleListeners={listeners}
        dragHandleAttributes={attributes}
      />

      {children}
    </div>
  );
};
