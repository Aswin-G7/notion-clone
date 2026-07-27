import React from "react";
import { Block } from "../../types";
import { RichTextEditor } from "../RichTextEditor";

interface HeadingBlockProps {
  block: Block;
  handleBlockChange: (blockId: string, val: string) => void;
  handleKeyDown: (e: React.KeyboardEvent, block: Block) => void;
  setSelectedBlockId: (id: string | null) => void;
  isSelected: boolean;
}

export const HeadingBlock: React.FC<HeadingBlockProps> = ({
  block,
  handleBlockChange,
  handleKeyDown,
  setSelectedBlockId,
  isSelected,
}) => {
  return (
    <RichTextEditor
      id={`block-input-${block.id}`}
      value={block.data.text || ""}
      onChange={(val) => handleBlockChange(block.id, val)}
      onKeyDown={(e) => handleKeyDown(e, block)}
      placeholder={`Heading ${block.data.level || 1}`}
      className="font-display font-bold tracking-tight text-stone-900 py-1"
      placeholderClassName="text-stone-300 font-display font-bold tracking-tight py-1"
      style={{
        fontSize: block.data.level === 1 ? "1.65rem" : block.data.level === 3 ? "1.15rem" : "1.35rem",
      }}
      onFocus={() => setSelectedBlockId(null)}
      isSelected={isSelected}
    />
  );
};
