import React from "react";
import { Block } from "../../types";
import { RichTextEditor } from "../RichTextEditor";

interface QuoteBlockProps {
  block: Block;
  handleBlockChange: (blockId: string, val: string) => void;
  handleKeyDown: (e: React.KeyboardEvent, block: Block) => void;
  setSelectedBlockId: (id: string | null) => void;
  isSelected: boolean;
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({
  block,
  handleBlockChange,
  handleKeyDown,
  setSelectedBlockId,
  isSelected,
}) => {
  return (
    <div className="flex items-stretch border-l-4 border-stone-300 dark:border-stone-600 pl-4 py-0.5 w-full">
      <RichTextEditor
        id={`block-input-${block.id}`}
        value={block.data.text || ""}
        onChange={(val) => handleBlockChange(block.id, val)}
        onKeyDown={(e) => handleKeyDown(e, block)}
        placeholder="Empty quote"
        className="font-sans text-stone-700 dark:text-[#d3d3d3] italic text-[14.5px] leading-relaxed py-0.5"
        placeholderClassName="text-stone-300 dark:text-stone-600 font-sans text-[14.5px] leading-relaxed py-0.5"
        onFocus={() => setSelectedBlockId(null)}
        isSelected={isSelected}
      />
    </div>
  );
};
