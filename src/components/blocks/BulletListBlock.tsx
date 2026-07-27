import React from "react";
import { Block } from "../../types";
import { RichTextEditor } from "../RichTextEditor";

interface BulletListBlockProps {
  block: Block;
  handleBlockChange: (blockId: string, val: string) => void;
  handleKeyDown: (e: React.KeyboardEvent, block: Block) => void;
  setSelectedBlockId: (id: string | null) => void;
  isSelected: boolean;
}

export const BulletListBlock: React.FC<BulletListBlockProps> = ({
  block,
  handleBlockChange,
  handleKeyDown,
  setSelectedBlockId,
  isSelected,
}) => {
  return (
    <div className="flex items-start gap-2.5 w-full py-0.5">
      <span className="text-stone-400 select-none text-[15px] leading-relaxed pt-0.5 font-bold">•</span>
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
