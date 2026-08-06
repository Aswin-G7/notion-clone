import React, { useEffect } from "react";
import { Block, Page } from "../../types";

interface DividerBlockProps {
  block: Block;
  activePage: Page;
  handleDeleteBlock: (blockId: string) => void;
  setSelectedBlockId: (id: string | null) => void;
  isSelected?: boolean;
}

export const DividerBlock: React.FC<DividerBlockProps> = ({
  block,
  activePage,
  handleDeleteBlock,
  setSelectedBlockId,
  isSelected,
}) => {
  return (
    <div
      id={`block-input-${block.id}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Backspace") {
          if (activePage.blocks.length > 1) {
            e.preventDefault();
            handleDeleteBlock(block.id);
          }
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const currentIndex = activePage.blocks.findIndex((b) => b.id === block.id);
          if (currentIndex > 0) {
            const prevBlock = activePage.blocks[currentIndex - 1];
            setSelectedBlockId(prevBlock.id);
          }
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const currentIndex = activePage.blocks.findIndex((b) => b.id === block.id);
          if (currentIndex < activePage.blocks.length - 1) {
            const nextBlock = activePage.blocks[currentIndex + 1];
            setSelectedBlockId(nextBlock.id);
          }
        }
      }}
      onFocus={() => setSelectedBlockId(block.id)}
      className="py-4 w-full cursor-pointer group/divider flex items-center outline-none"
    >
      <div className="w-full border-t border-stone-200 dark:border-stone-800 group-focus/divider:border-stone-400 dark:group-focus/divider:border-stone-500 transition-colors" />
    </div>
  );
};
