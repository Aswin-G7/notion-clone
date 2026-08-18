import React from "react";
import { Block, Page } from "../../types";

interface ChildPageBlockProps {
  block: Block;
  activePage: Page;
  pages: Page[];
  deleteBlock: (pageId: string, blockId: string) => void;
  setSelectedBlockId: (id: string | null) => void;
  setActivePageId: (id: string) => void;
  handleChildPageKeyDown: (e: React.KeyboardEvent, block: Block) => void;
  isSelected?: boolean;
}

export const ChildPageBlock: React.FC<ChildPageBlockProps> = ({
  block,
  activePage,
  pages,
  deleteBlock,
  setSelectedBlockId,
  setActivePageId,
  handleChildPageKeyDown,
  isSelected,
}) => {
  const childPage = pages.find((p) => p.id === block.data.pageId && !p.isDeleted);
  if (!childPage) {
    return null;
  }

  return (
    <button
      type="button"
      id={`block-input-${block.id}`}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedBlockId(block.id);
        setActivePageId(childPage.id);
      }}
      onKeyDown={(e) => handleChildPageKeyDown(e, block)}
      onFocus={() => setSelectedBlockId(block.id)}
      tabIndex={0}
      className={`group/childcard flex w-full items-center gap-2 px-2 py-1 my-0.5 rounded text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800/60 cursor-pointer transition-colors outline-none border-0 text-left ${
        isSelected
          ? "bg-stone-100 dark:bg-stone-800/80 ring-1 ring-stone-300 dark:ring-stone-600"
          : "focus:bg-stone-100 dark:focus:bg-stone-800/80 focus:ring-1 focus:ring-stone-300 dark:focus:ring-stone-600"
      }`}
    >
      <span className="text-sm shrink-0 leading-none select-none">
        {childPage.icon || "📄"}
      </span>
      <span className="font-sans font-medium text-sm text-stone-800 dark:text-stone-200 group-hover/childcard:underline decoration-stone-300 dark:decoration-stone-600 underline-offset-2 truncate">
        {childPage.title.trim() === "" ? "Untitled Page" : childPage.title}
      </span>
    </button>
  );
};

