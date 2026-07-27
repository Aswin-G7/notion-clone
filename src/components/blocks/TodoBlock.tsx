import React from "react";
import { Block } from "../../types";
import { RichTextEditor } from "../RichTextEditor";

interface TodoBlockProps {
  block: Block;
  activePageId: string;
  handleBlockChange: (blockId: string, val: string) => void;
  handleKeyDown: (e: React.KeyboardEvent, block: Block) => void;
  updateBlockData: (pageId: string, blockId: string, data: any) => void;
  setSelectedBlockId: (id: string | null) => void;
  isSelected: boolean;
}

export const TodoBlock: React.FC<TodoBlockProps> = ({
  block,
  activePageId,
  handleBlockChange,
  handleKeyDown,
  updateBlockData,
  setSelectedBlockId,
  isSelected,
}) => {
  return (
    <div className="flex items-start gap-2.5 w-full py-0.5">
      <input
        type="checkbox"
        checked={!!block.data.checked}
        onChange={() => updateBlockData(activePageId, block.id, { checked: !block.data.checked })}
        className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-800 focus:ring-stone-400 cursor-pointer accent-stone-700 shrink-0"
      />
      <RichTextEditor
        id={`block-input-${block.id}`}
        value={block.data.text || ""}
        onChange={(val) => handleBlockChange(block.id, val)}
        onKeyDown={(e) => handleKeyDown(e, block)}
        placeholder="To-do"
        className={`font-sans text-stone-800 text-[14.5px] leading-relaxed py-0.5 ${
          block.data.checked ? "line-through text-stone-400" : ""
        }`}
        placeholderClassName="text-stone-300 font-sans text-[14.5px] leading-relaxed py-0.5"
        onFocus={() => setSelectedBlockId(null)}
        isSelected={isSelected}
      />
    </div>
  );
};
