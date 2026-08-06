import React from "react";
import { Block } from "../../types";
import { RichTextEditor } from "../RichTextEditor";
import { SlashMenu } from "../SlashMenu";

interface ParagraphBlockProps {
  block: Block;
  handleBlockChange: (blockId: string, val: string) => void;
  handleKeyDown: (e: React.KeyboardEvent, block: Block) => void;
  setSelectedBlockId: (id: string | null) => void;
  isSelected: boolean;
  slashMenuOpen: boolean;
  slashMenuBlockId: string | null;
  slashMenuSearch: string;
  handleSelectCommand: (cmd: any) => void;
  setSlashMenuOpen: (open: boolean) => void;
  setSlashMenuBlockId: (id: string | null) => void;
  setSlashMenuSearch: (text: string) => void;
}

export const ParagraphBlock: React.FC<ParagraphBlockProps> = ({
  block,
  handleBlockChange,
  handleKeyDown,
  setSelectedBlockId,
  isSelected,
  slashMenuOpen,
  slashMenuBlockId,
  slashMenuSearch,
  handleSelectCommand,
  setSlashMenuOpen,
  setSlashMenuBlockId,
  setSlashMenuSearch,
}) => {
  return (
    <div className="relative w-full">
      <RichTextEditor
        id={`block-input-${block.id}`}
        value={block.data.text || ""}
        onChange={(val) => handleBlockChange(block.id, val)}
        onKeyDown={(e) => handleKeyDown(e, block)}
        placeholder="Press Enter or start writing, or type '/' for commands..."
        className="font-sans text-stone-800 dark:text-[#d3d3d3] text-[14.5px] leading-relaxed py-0.5"
        placeholderClassName="text-stone-300 dark:text-stone-600 font-sans text-[14.5px] leading-relaxed py-0.5"
        onFocus={() => setSelectedBlockId(null)}
        isSelected={isSelected}
      />
      {slashMenuOpen && slashMenuBlockId === block.id && (
        <SlashMenu
          searchText={slashMenuSearch}
          onSelect={handleSelectCommand}
          onClose={() => {
            setSlashMenuOpen(false);
            setSlashMenuBlockId(null);
            setSlashMenuSearch("");
          }}
        />
      )}
    </div>
  );
};
