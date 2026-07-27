import React, { useEffect } from "react";
import { ChevronRight } from "lucide-react";
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
  const childPage = pages.find((p) => p.id === block.data.pageId);
  if (!childPage) {
    return (
      <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-500 font-sans italic">
        <span>Broken reference: This subpage was deleted</span>
        <button
          onClick={() => deleteBlock(activePage.id, block.id)}
          className="ml-auto text-red-600 hover:underline font-bold"
        >
          Dismiss block
        </button>
      </div>
    );
  }

  return (
    <div
      id={`block-input-${block.id}`}
      onClick={() => {
        setSelectedBlockId(block.id);
        setActivePageId(childPage.id);
      }}
      onKeyDown={(e) => handleChildPageKeyDown(e, block)}
      onFocus={() => setSelectedBlockId(block.id)}
      tabIndex={0}
      className="flex items-center justify-between w-full p-3 rounded-lg border border-stone-200/80 bg-white hover:bg-stone-50/50 hover:border-stone-300 cursor-pointer transition-all group/childcard shadow-sm outline-none focus:ring-1 focus:ring-stone-400"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-2xl shrink-0 group-hover/childcard:scale-110 transition-transform duration-150">
          {childPage.icon || "📄"}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-sans font-semibold text-[13.5px] text-stone-700 group-hover/childcard:text-stone-950 truncate">
            {childPage.title.trim() === "" ? "Untitled Page" : childPage.title}
          </span>
          <span className="text-[10px] text-stone-400 font-sans">
            Click to open inline child page
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-stone-400 group-hover/childcard:translate-x-0.5 transition-transform shrink-0" />
    </div>
  );
};
