import React from "react";
import { Block, Page } from "../../types";
import { RichTextEditor } from "../RichTextEditor";

interface NumberedListBlockProps {
  block: Block;
  activePage: Page;
  handleBlockChange: (blockId: string, val: string) => void;
  handleKeyDown: (e: React.KeyboardEvent, block: Block) => void;
  setSelectedBlockId: (id: string | null) => void;
  isSelected: boolean;
}

export const NumberedListBlock: React.FC<NumberedListBlockProps> = ({
  block,
  activePage,
  handleBlockChange,
  handleKeyDown,
  setSelectedBlockId,
  isSelected,
}) => {
  let index = 1;
  const blocks = activePage.blocks;
  const currentIndex = blocks.findIndex((b) => b.id === block.id);
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (blocks[i].type === "numbered-list") {
      index++;
    } else {
      break;
    }
  }

  return (
    <div className="flex items-start gap-2 w-full py-0.5">
      <span className="text-stone-400 font-sans font-medium select-none text-[14px] leading-relaxed pt-0.5 w-5 text-right shrink-0">
        {index}.
      </span>
      <RichTextEditor
        id={`block-input-${block.id}`}
        value={block.data.text || ""}
        onChange={(val) => handleBlockChange(block.id, val)}
        onKeyDown={(e) => handleKeyDown(e, block)}
        placeholder="List item"
        className="font-sans text-stone-800 text-[14.5px] leading-relaxed py-0.5"
        placeholderClassName="text-stone-300 font-sans text-[14.5px] leading-relaxed py-0.5"
        onFocus={() => setSelectedBlockId(null)}
        isSelected={isSelected}
      />
    </div>
  );
};
