import React from "react";
import { ChevronRight } from "lucide-react";
import { Block } from "../../types";
import { RichTextEditor } from "../RichTextEditor";

interface ToggleBlockProps {
  block: Block;
  activePageId: string;
  handleBlockChange: (blockId: string, val: string) => void;
  handleKeyDown: (e: React.KeyboardEvent, block: Block) => void;
  updateBlockData: (pageId: string, blockId: string, data: any) => void;
  setSelectedBlockId: (id: string | null) => void;
  isSelected: boolean;
}

export const ToggleBlock: React.FC<ToggleBlockProps> = ({
  block,
  activePageId,
  handleBlockChange,
  handleKeyDown,
  updateBlockData,
  setSelectedBlockId,
  isSelected,
}) => {
  return (
    <div className="flex items-start gap-1 w-full py-0.5">
      <button
        type="button"
        contentEditable={false}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          updateBlockData(activePageId, block.id, {
            collapsed: !block.data.collapsed,
          });
        }}
        className="mt-1 p-0.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors cursor-pointer select-none shrink-0"
        title={block.data.collapsed ? "Expand toggle" : "Collapse toggle"}
      >
        <ChevronRight
          className={`h-4 w-4 transition-transform duration-150 ${
            block.data.collapsed ? "rotate-0" : "rotate-90"
          }`}
        />
      </button>
      <RichTextEditor
        id={`block-input-${block.id}`}
        value={block.data.text || ""}
        onChange={(val) => handleBlockChange(block.id, val)}
        onKeyDown={(e) => handleKeyDown(e, block)}
        placeholder="Toggle"
        className="font-sans font-medium text-stone-800 text-[14.5px] leading-relaxed py-0.5"
        placeholderClassName="text-stone-300 font-sans font-medium text-[14.5px] leading-relaxed py-0.5"
        onFocus={() => setSelectedBlockId(null)}
        isSelected={isSelected}
      />
    </div>
  );
};
