import React from "react";
import { Block } from "../../types";
import { RichTextEditor } from "../RichTextEditor";

interface CalloutBlockProps {
  block: Block;
  activePageId: string;
  handleBlockChange: (blockId: string, val: string) => void;
  handleKeyDown: (e: React.KeyboardEvent, block: Block) => void;
  updateBlockData: (pageId: string, blockId: string, data: any) => void;
  calloutEmojiPickerBlockId: string | null;
  setCalloutEmojiPickerBlockId: (id: string | null) => void;
  setSelectedBlockId: (id: string | null) => void;
  isSelected: boolean;
}

export const CalloutBlock: React.FC<CalloutBlockProps> = ({
  block,
  activePageId,
  handleBlockChange,
  handleKeyDown,
  updateBlockData,
  calloutEmojiPickerBlockId,
  setCalloutEmojiPickerBlockId,
  setSelectedBlockId,
  isSelected,
}) => {
  return (
    <div className="flex items-start gap-3 w-full p-3.5 rounded-xl bg-stone-100/80 border border-stone-200/70 dark:bg-[#252525] dark:border-stone-700/70 my-1 transition-colors hover:bg-stone-100 dark:hover:bg-[#282828] relative">
      <div className="relative shrink-0 pt-0.5 select-none">
        <button
          type="button"
          contentEditable={false}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            setCalloutEmojiPickerBlockId(
              calloutEmojiPickerBlockId === block.id ? null : block.id
            );
          }}
          className="text-xl leading-none p-1 hover:bg-stone-200/70 dark:hover:bg-stone-700/70 rounded cursor-pointer select-none transition-transform active:scale-95 flex items-center justify-center"
          title="Change callout icon"
        >
          {block.data.icon || "💡"}
        </button>

        {calloutEmojiPickerBlockId === block.id && (
          <div
            id={`callout-emoji-picker-${block.id}`}
            className="absolute left-0 top-full mt-1.5 z-50 bg-white dark:bg-[#202020] border border-stone-200 dark:border-stone-700 shadow-xl dark:shadow-2xl rounded-xl p-2 grid grid-cols-4 gap-1 w-40 select-none animate-in fade-in zoom-in-95 duration-100"
          >
            {["💡", "ℹ️", "⚠️", "🔥", "📌", "✨", "🎯", "📝", "🚀", "💬", "⭐", "🎉", "⚡", "🛑", "🔔", "❤️"].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  updateBlockData(activePageId, block.id, { icon: emoji });
                  setCalloutEmojiPickerBlockId(null);
                  setSelectedBlockId(null);
                  const inputEl = document.getElementById(`block-input-${block.id}`);
                  if (inputEl) {
                    inputEl.focus();
                  }
                }}
                className="text-lg p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <RichTextEditor
        id={`block-input-${block.id}`}
        value={block.data.text || ""}
        onChange={(val) => handleBlockChange(block.id, val)}
        onKeyDown={(e) => handleKeyDown(e, block)}
        placeholder="Callout text..."
        className="flex-1 font-sans text-stone-800 dark:text-[#d3d3d3] text-[14.5px] leading-relaxed py-0.5"
        placeholderClassName="text-stone-400 dark:text-stone-500 font-sans text-[14.5px] leading-relaxed py-0.5"
        onFocus={() => setSelectedBlockId(null)}
        isSelected={isSelected}
      />
    </div>
  );
};
