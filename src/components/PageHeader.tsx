import React, { useState, useCallback, memo, useEffect, useRef } from "react";
import { Smile, Image as ImageIcon, X } from "lucide-react";
import { Page } from "../types";
import { EmojiPickerPopover } from "./EmojiPickerPopover";
import { CoverPickerPopover, COVER_PRESETS } from "./CoverPickerPopover";
import { workspaceHistoryService } from "../services/WorkspaceHistoryService";

interface PageHeaderProps {
  page: Page;
  onUpdateTitle: (title: string) => void;
  onCommitTitle?: (oldTitle: string, newTitle: string) => void;
  onUpdateIcon: (icon: string | null) => void;
  onUpdateCover: (coverUrl: string | null) => void;
  onTitleKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const PageHeader: React.FC<PageHeaderProps> = memo(({
  page,
  onUpdateTitle,
  onCommitTitle,
  onUpdateIcon,
  onUpdateCover,
  onTitleKeyDown,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const initialTitleRef = useRef(page.title);

  useEffect(() => {
    initialTitleRef.current = page.title;
  }, [page.title]);

  const handleTitleFocus = () => {
    initialTitleRef.current = page.title;
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (page.title !== initialTitleRef.current) {
      if (onCommitTitle) {
        onCommitTitle(initialTitleRef.current, page.title);
      }
      initialTitleRef.current = page.title;
    }
  };

  const handleInternalTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    if (isCmdOrCtrl) {
      const keyLower = e.key.toLowerCase();
      if (keyLower === "z") {
        e.preventDefault();
        e.stopPropagation();
        if (!e.shiftKey) {
          workspaceHistoryService.undo();
        } else {
          workspaceHistoryService.redo();
        }
        return;
      } else if (keyLower === "y") {
        e.preventDefault();
        e.stopPropagation();
        workspaceHistoryService.redo();
        return;
      }
    }

    if (onTitleKeyDown) {
      onTitleKeyDown(e);
    }
  };

  const handleAddIconShortcut = () => {
    if (!page.icon) {
      onUpdateIcon("📄");
    }
    setShowEmojiPicker(true);
  };

  const handleAddCoverShortcut = () => {
    onUpdateCover(COVER_PRESETS[0].url);
    setShowCoverPicker(true);
  };

  const handleSelectEmoji = useCallback((emoji: string) => {
    onUpdateIcon(emoji);
    setShowEmojiPicker(false);
  }, [onUpdateIcon]);

  const handleRemoveIcon = useCallback(() => {
    onUpdateIcon(null);
    setShowEmojiPicker(false);
  }, [onUpdateIcon]);

  const handleSelectCover = useCallback((coverUrl: string) => {
    onUpdateCover(coverUrl);
    setShowCoverPicker(false);
  }, [onUpdateCover]);

  const handleRemoveCover = useCallback(() => {
    onUpdateCover(null);
    setShowCoverPicker(false);
  }, [onUpdateCover]);

  return (
    <div className="w-full relative select-none shrink-0">
      {/* Cover Image Banner */}
      {page.coverImage ? (
        <div id="page-cover-banner" className="relative group/cover w-full h-44 md:h-52 bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0">
          <img
            src={page.coverImage}
            alt="Page cover"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-300"
          />
          <div className="absolute right-4 bottom-4 opacity-0 group-hover/cover:opacity-100 transition-opacity bg-white/90 dark:bg-[#202020]/90 backdrop-blur-[2px] border border-stone-200 dark:border-stone-700 rounded-lg p-1 flex items-center gap-1.5 shadow-sm">
            <button
              id="change-cover-banner-btn"
              type="button"
              onClick={() => setShowCoverPicker(!showCoverPicker)}
              className="text-xs font-semibold px-2 py-1 text-stone-700 dark:text-stone-200 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors cursor-pointer"
            >
              Change cover
            </button>
            <div className="w-[1px] h-3.5 bg-stone-200 dark:bg-stone-700" />
            <button
              id="remove-cover-banner-btn"
              type="button"
              onClick={handleRemoveCover}
              className="text-xs font-semibold px-2 py-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
            >
              Remove
            </button>
          </div>

          {/* Cover Picker Popover when changing cover */}
          {showCoverPicker && (
            <div className="absolute right-4 top-12 z-50">
              <CoverPickerPopover
                currentCover={page.coverImage}
                onSelectCover={handleSelectCover}
                onRemoveCover={handleRemoveCover}
                onClose={() => setShowCoverPicker(false)}
                align="right"
              />
            </div>
          )}
        </div>
      ) : null}

      {/* Editor Main Header Container */}
      <div className="max-w-3xl w-full mx-auto px-6 sm:px-12 md:px-16 pt-6 pb-2 space-y-3 relative">
        
        {/* Cover / Icon Quick Action Buttons (Show if icon or cover is missing) */}
        {(!page.icon || !page.coverImage) && (
          <div className="flex items-center gap-2 text-stone-400 dark:text-stone-500 select-none opacity-80 hover:opacity-100 transition-opacity">
            {!page.icon && (
              <button
                id="add-icon-shortcut-btn"
                type="button"
                onClick={handleAddIconShortcut}
                className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer"
              >
                <Smile className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
                <span>Add icon</span>
              </button>
            )}
            {!page.coverImage && (
              <button
                id="add-cover-shortcut-btn"
                type="button"
                onClick={handleAddCoverShortcut}
                className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors cursor-pointer"
              >
                <ImageIcon className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
                <span>Add cover</span>
              </button>
            )}
          </div>
        )}

        {/* Floating Cover Picker Popover if no cover banner exists */}
        {!page.coverImage && showCoverPicker && (
          <div className="relative z-50">
            <CoverPickerPopover
              currentCover={page.coverImage}
              onSelectCover={handleSelectCover}
              onRemoveCover={handleRemoveCover}
              onClose={() => setShowCoverPicker(false)}
              align="left"
            />
          </div>
        )}

        {/* Page Icon Display & Popover */}
        <div className={`relative ${page.coverImage ? "-mt-14 sm:-mt-16 mb-2" : ""}`}>
          {page.icon ? (
            <div className="relative inline-block group/icon">
              <button
                id="page-icon-badge"
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`text-5xl sm:text-6xl p-1.5 rounded-2xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  page.coverImage ? "bg-white dark:bg-[#191919] shadow-md border border-stone-200/60 dark:border-stone-700 hover:scale-105" : "hover:bg-stone-100/80 dark:hover:bg-stone-800/80"
                }`}
                title="Click to change icon"
              >
                {page.icon}
              </button>
              <button
                id="remove-icon-btn"
                type="button"
                onClick={handleRemoveIcon}
                className="absolute -top-1 -right-1 hidden group-hover/icon:flex items-center justify-center w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-200 text-xs font-bold transition-all shadow-sm cursor-pointer"
                title="Remove Icon"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : null}

          {/* Emoji Picker Popover */}
          {showEmojiPicker && (
            <EmojiPickerPopover
              currentIcon={page.icon}
              onSelectEmoji={handleSelectEmoji}
              onRemoveIcon={handleRemoveIcon}
              onClose={() => setShowEmojiPicker(false)}
              align="left"
            />
          )}
        </div>

        {/* Page Title Auto-sizing Input */}
        <div className="shrink-0 pt-1">
          <input
            id="editor-title-input"
            type="text"
            value={page.title}
            onFocus={handleTitleFocus}
            onBlur={handleTitleBlur}
            onChange={handleTitleChange}
            onKeyDown={handleInternalTitleKeyDown}
            placeholder="Untitled Page"
            className="w-full font-display font-bold tracking-tight text-3xl sm:text-4xl text-stone-900 dark:text-stone-100 placeholder-stone-300 dark:placeholder-stone-600 outline-none border-none py-1 resize-none select-text focus:placeholder-stone-300 dark:focus:placeholder-stone-600 transition-all"
          />
        </div>
      </div>
    </div>
  );
});

PageHeader.displayName = "PageHeader";
