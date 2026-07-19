import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Smile,
  Image as ImageIcon,
  Calendar,
  Sparkles,
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  LayoutGrid,
  CornerDownLeft,
  ChevronRight
} from "lucide-react";
import { Page, Block } from "../types";

const EMOJIS = [
  "📄", "🚀", "📝", "🍳", "🎯", "💡", "💻", "🎨",
  "🛠️", "📚", "🪴", "🍿", "🍕", "🏃", "✈️", "🗺️",
  "📅", "✉️", "🔐", "💬", "❤️", "🔥", "✨", "🌟",
  "🐱", "🐶", "🥑", "🥐", "🏔️", "🏕️", "🏠", "⏰"
];

const COVER_PRESETS = [
  "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1200&auto=format&fit=crop", // Library/books
  "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=1200&auto=format&fit=crop", // Notebook
  "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=1200&auto=format&fit=crop", // Cozy desk
  "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?q=80&w=1200&auto=format&fit=crop", // Sunset workstation
  "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=1200&auto=format&fit=crop", // Minimalist library
  "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1200&auto=format&fit=crop", // Violet gradient
  "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&auto=format&fit=crop"  // Oil paint art
];

export const EditorArea: React.FC = () => {
  const {
    pages,
    activePage,
    updatePage,
    createPage,
    setActivePageId,
    selectedBlockId,
    setSelectedBlockId,
    addBlock,
    updateBlock,
    deleteBlock
  } = useApp();

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  if (!activePage) {
    return (
      <div id="editor-empty-state" className="flex-1 flex flex-col items-center justify-center bg-stone-50/50 p-8 text-center select-none">
        <div className="max-w-md space-y-6">
          <div className="w-16 h-16 mx-auto bg-stone-100 rounded-2xl flex items-center justify-center border border-stone-200/60 text-stone-400">
            <Sparkles className="h-8 w-8 text-stone-400 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-display text-stone-800">
              No page selected
            </h2>
            <p className="text-sm text-stone-500 font-sans leading-relaxed">
              Select an existing page from your personal workspace sidebar, or create a brand new one to start capturing your ideas.
            </p>
          </div>
          <button
            id="empty-create-page-btn"
            onClick={() => createPage(null)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-100 bg-stone-900 hover:bg-stone-800 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create new page</span>
          </button>
        </div>
      </div>
    );
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updatePage(activePage.id, { title: e.target.value });
  };

  const handleSelectEmoji = (emoji: string) => {
    updatePage(activePage.id, { icon: emoji });
    setShowEmojiPicker(false);
  };

  const handleSelectCover = (coverUrl: string) => {
    updatePage(activePage.id, { coverImage: coverUrl });
    setShowCoverPicker(false);
  };

  const handleRemoveCover = () => {
    updatePage(activePage.id, { coverImage: undefined });
    setShowCoverPicker(false);
  };

  const handleAddDefaultCover = () => {
    updatePage(activePage.id, { coverImage: COVER_PRESETS[0] });
  };

  const handleAddEmoji = () => {
    updatePage(activePage.id, { icon: "📄" });
    setShowEmojiPicker(true);
  };

  // Word/Char metadata counts from blocks
  const wordCount = activePage.blocks.reduce((acc, block) => {
    if (block.type === "child-page") return acc;
    const text = block.data.text || "";
    return acc + text.split(/\s+/).filter(Boolean).length;
  }, 0);

  const charCount = activePage.blocks.reduce((acc, block) => {
    if (block.type === "child-page") return acc;
    const text = block.data.text || "";
    return acc + text.length;
  }, 0);

  // Focus management effect
  React.useEffect(() => {
    if (selectedBlockId) {
      const el = document.getElementById(`block-input-${selectedBlockId}`);
      if (el && document.activeElement !== el) {
        el.focus();
        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          const length = el.value.length;
          el.setSelectionRange(length, length);
        }
      }
    }
  }, [selectedBlockId]);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
    block: Block
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart || 0;
      const text = block.data.text || "";
      const beforeText = text.substring(0, start);
      const afterText = text.substring(start);

      // Update current block text to before text
      updateBlock(activePage.id, block.id, beforeText);

      // Create new paragraph block with remaining text immediately after
      addBlock(activePage.id, "paragraph", afterText, block.id);
    }

    if (e.key === "Backspace") {
      const text = block.data.text || "";
      if (text === "") {
        // Only delete if there is more than 1 block
        if (activePage.blocks.length > 1) {
          e.preventDefault();
          const currentIndex = activePage.blocks.findIndex((b) => b.id === block.id);
          const prevBlock = currentIndex > 0 ? activePage.blocks[currentIndex - 1] : null;
          
          deleteBlock(activePage.id, block.id);

          if (prevBlock) {
            setSelectedBlockId(prevBlock.id);
          }
        }
      }
    }

    if (e.key === "ArrowUp") {
      const target = e.currentTarget;
      const isAtStart = target.selectionStart === 0 && target.selectionEnd === 0;
      if (isAtStart) {
        const currentIndex = activePage.blocks.findIndex((b) => b.id === block.id);
        if (currentIndex > 0) {
          e.preventDefault();
          const prevBlock = activePage.blocks[currentIndex - 1];
          setSelectedBlockId(prevBlock.id);
        }
      }
    }

    if (e.key === "ArrowDown") {
      const target = e.currentTarget;
      const textLength = target.value.length;
      const isAtEnd = target.selectionStart === textLength && target.selectionEnd === textLength;
      if (isAtEnd) {
        const currentIndex = activePage.blocks.findIndex((b) => b.id === block.id);
        if (currentIndex < activePage.blocks.length - 1) {
          e.preventDefault();
          const nextBlock = activePage.blocks[currentIndex + 1];
          setSelectedBlockId(nextBlock.id);
        }
      }
    }
  };

  const handleChildPageKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    block: Block
  ) => {
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

    if (e.key === "Enter") {
      e.preventDefault();
      const childPage = pages.find((p) => p.id === block.data.pageId);
      if (childPage) {
        setActivePageId(childPage.id);
      }
    }

    if (e.key === "Backspace") {
      if (activePage.blocks.length > 1) {
        e.preventDefault();
        const currentIndex = activePage.blocks.findIndex((b) => b.id === block.id);
        const prevBlock = currentIndex > 0 ? activePage.blocks[currentIndex - 1] : null;
        
        deleteBlock(activePage.id, block.id);

        if (prevBlock) {
          setSelectedBlockId(prevBlock.id);
        }
      }
    }
  };

  return (
    <div id="editor-workspace" className="flex-1 flex flex-col bg-white overflow-y-auto relative">
      
      {/* Cover Image Banner */}
      {activePage.coverImage ? (
        <div id="page-cover-banner" className="relative group w-full h-44 md:h-52 bg-stone-100 overflow-hidden shrink-0">
          <img
            src={activePage.coverImage}
            alt="Page cover"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover select-none pointer-events-none"
          />
          <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-[2px] border border-stone-200 rounded-md p-1 flex items-center gap-1.5 shadow-sm">
            <button
              id="change-cover-banner-btn"
              onClick={() => setShowCoverPicker(!showCoverPicker)}
              className="text-xs font-semibold px-2 py-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded"
            >
              Change cover
            </button>
            <div className="w-[1px] h-3 bg-stone-200" />
            <button
              id="remove-cover-banner-btn"
              onClick={handleRemoveCover}
              className="text-xs font-semibold px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
            >
              Remove
            </button>
          </div>
        </div>
      ) : null}

      {/* Editor Content Container */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-6 sm:px-12 md:px-16 pt-8 pb-16 space-y-6 flex flex-col">
        
        {/* Cover / Icon Quick Add Controls (Only if not already present) */}
        {!activePage.coverImage || !activePage.icon ? (
          <div className="flex items-center gap-3 text-stone-400 select-none pb-2">
            {!activePage.icon && (
              <button
                id="add-icon-shortcut-btn"
                onClick={handleAddEmoji}
                className="flex items-center gap-1 text-xs font-medium px-2 py-1 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-800 transition-colors"
              >
                <Smile className="h-3.5 w-3.5" />
                <span>Add icon</span>
              </button>
            )}
            {!activePage.coverImage && (
              <button
                id="add-cover-shortcut-btn"
                onClick={handleAddDefaultCover}
                className="flex items-center gap-1 text-xs font-medium px-2 py-1 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-800 transition-colors"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Add cover</span>
              </button>
            )}
          </div>
        ) : null}

        {/* Floating Cover Selection Menu */}
        {showCoverPicker && (
          <div id="cover-picker-menu" className="border border-stone-200 rounded-lg p-3 bg-white shadow-md space-y-2 select-none shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Select Preset Cover</span>
              <button
                onClick={() => setShowCoverPicker(false)}
                className="text-xs text-stone-400 hover:text-stone-600 font-semibold"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {COVER_PRESETS.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectCover(preset)}
                  className={`relative h-12 w-full rounded-md overflow-hidden border-2 transition-all ${
                    activePage.coverImage === preset ? "border-stone-800 scale-95" : "border-transparent hover:scale-105"
                  }`}
                >
                  <img src={preset} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Page Icon Display & Picker */}
        <div className="relative shrink-0 select-none">
          {activePage.icon ? (
            <div className="relative inline-block group">
              <button
                id="page-icon-badge"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-4xl md:text-5xl hover:bg-stone-100 p-2 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                title="Change Icon"
              >
                {activePage.icon}
              </button>
              <button
                id="remove-icon-btn"
                onClick={() => updatePage(activePage.id, { icon: undefined })}
                className="absolute -top-1 -right-1 hidden group-hover:flex items-center justify-center w-5 h-5 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 text-xs font-bold transition-all shadow-sm"
                title="Remove Icon"
              >
                ×
              </button>
            </div>
          ) : null}

          {/* Emoji Selection Popover */}
          {showEmojiPicker && (
            <div
              id="emoji-picker-popover"
              className="absolute left-0 mt-2 z-30 border border-stone-200 rounded-xl p-3 bg-white shadow-lg max-w-sm space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Select Emoji Icon</span>
                <button
                  onClick={() => setShowEmojiPicker(false)}
                  className="text-xs text-stone-400 hover:text-stone-600 font-semibold"
                >
                  Cancel
                </button>
              </div>
              <div className="grid grid-cols-8 gap-1.5 max-h-48 overflow-y-auto p-1 bg-stone-50 rounded-lg">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSelectEmoji(emoji)}
                    className="text-2xl hover:bg-white hover:shadow-sm p-1 rounded transition-all active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Page Title Auto-sizing Input */}
        <div className="shrink-0">
          <input
            id="editor-title-input"
            type="text"
            value={activePage.title}
            onChange={handleTitleChange}
            placeholder="Untitled Page"
            className="w-full font-display font-bold tracking-tight text-3xl sm:text-4xl text-stone-900 placeholder-stone-200 outline-none border-none py-1 resize-none select-text focus:placeholder-stone-300 transition-all"
          />
        </div>

        {/* Blocks Sequential Container */}
        <div className="flex-1 flex flex-col space-y-2.5">
          {activePage.blocks && activePage.blocks.length > 0 ? (
            activePage.blocks.map((block) => {
              const isSelected = selectedBlockId === block.id;

              return (
                <div
                  key={block.id}
                  id={`editor-block-wrapper-${block.id}`}
                  className={`group/block relative flex items-start gap-3 p-2 rounded-lg transition-all border-l-2 ${
                    isSelected
                      ? "bg-stone-50/80 border-stone-800 pl-3.5"
                      : "border-transparent hover:bg-stone-50/30 pl-2"
                  }`}
                >
                  {/* Hover Floating Options Panel */}
                  <div className="absolute right-2.5 top-2.5 opacity-0 group-hover/block:opacity-100 flex items-center gap-1 z-10 transition-opacity bg-stone-50 border border-stone-200/50 p-1 rounded shadow-sm">
                    {/* Add Inline child paragraph */}
                    <button
                      id={`block-add-p-${block.id}`}
                      onClick={() => addBlock(activePage.id, "paragraph", "", block.id)}
                      className="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-150 rounded transition-colors"
                      title="Insert paragraph below"
                    >
                      <FileText className="h-3 w-3" />
                    </button>
                    {/* Add Inline child heading */}
                    <button
                      id={`block-add-h-${block.id}`}
                      onClick={() => addBlock(activePage.id, "heading", "", block.id)}
                      className="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-150 rounded transition-colors text-[9px] font-bold"
                      title="Insert heading below"
                    >
                      H
                    </button>
                    {/* Add inline nested subpage */}
                    <button
                      id={`block-add-sub-${block.id}`}
                      onClick={() => createPage(activePage.id, block.id)}
                      className="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-150 rounded transition-colors"
                      title="Insert nested subpage below"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    {/* Delete block */}
                    <button
                      id={`block-delete-${block.id}`}
                      onClick={() => deleteBlock(activePage.id, block.id)}
                      className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete block"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Block Content Renderers */}
                  <div className="flex-1 min-w-0">
                    {block.type === "paragraph" && (
                      <textarea
                        id={`block-input-${block.id}`}
                        value={block.data.text || ""}
                        onChange={(e) => updateBlock(activePage.id, block.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, block)}
                        placeholder="Press Enter or start writing..."
                        className="w-full bg-transparent resize-none outline-none font-sans text-stone-800 text-[14.5px] leading-relaxed py-0.5 focus:placeholder-stone-400"
                        rows={Math.max(1, (block.data.text || "").split('\n').length)}
                        onFocus={() => setSelectedBlockId(block.id)}
                      />
                    )}

                    {block.type === "heading" && (
                      <input
                        id={`block-input-${block.id}`}
                        type="text"
                        value={block.data.text || ""}
                        onChange={(e) => updateBlock(activePage.id, block.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, block)}
                        placeholder="Heading"
                        className="w-full bg-transparent outline-none font-display font-bold tracking-tight text-stone-900 py-1"
                        style={{
                          fontSize: block.data.level === 1 ? "1.5rem" : block.data.level === 3 ? "1.15rem" : "1.3rem"
                        }}
                        onFocus={() => setSelectedBlockId(block.id)}
                      />
                    )}

                    {block.type === "child-page" && (() => {
                      const childPage = pages.find((p) => p.id === block.data.pageId);
                      if (!childPage) {
                        return (
                          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-500 font-sans italic">
                            <span>Broken reference: This subpage was deleted</span>
                            <button
                              onClick={() => deleteBlock(activePage.id, block.id)}
                              className="ml-auto text-red-600 hover:underline font-bold"
                            >
                              Dismiss block
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          id={`block-input-${block.id}`}
                          onClick={() => {
                            setSelectedBlockId(block.id);
                            setActivePageId(childPage.id);
                          }}
                          onKeyDown={(e) => handleChildPageKeyDown(e, block)}
                          onFocus={() => setSelectedBlockId(block.id)}
                          tabIndex={0}
                          className="flex items-center justify-between w-full p-3 rounded-lg border border-stone-200/80 bg-white hover:bg-stone-50/50 hover:border-stone-300 cursor-pointer transition-all group/childcard shadow-sm outline-none focus:ring-1 focus:ring-stone-400"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl shrink-0 group-hover/childcard:scale-110 transition-transform duration-150">
                              {childPage.icon || "📄"}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="font-sans font-semibold text-[13.5px] text-stone-700 group-hover/childcard:text-stone-950 truncate">
                                {childPage.title.trim() === "" ? "Untitled Page" : childPage.title}
                              </span>
                              <span className="text-[10px] text-stone-400 font-sans">
                                Click to open inline child page
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-stone-400 group-hover/childcard:translate-x-0.5 transition-transform shrink-0" />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-stone-200 rounded-xl space-y-2 select-none">
              <Sparkles className="h-6 w-6 mx-auto text-stone-300 animate-pulse" />
              <p className="text-xs text-stone-400 font-sans">This page is completely empty. Create some blocks below!</p>
            </div>
          )}

          {/* Persistent Action Bar at the Bottom to insert new blocks easily */}
          <div className="flex flex-col gap-2 pt-4 border-t border-stone-150/60 select-none">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider font-sans">
                Insert New Block {selectedBlockId ? "(Inserts after highlighted block)" : ""}
              </span>
              {selectedBlockId && (
                <button
                  onClick={() => setSelectedBlockId(null)}
                  className="text-[10px] text-stone-400 hover:text-stone-600 underline font-semibold font-sans"
                >
                  Clear Selection (Append to end)
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="bottom-insert-paragraph-btn"
                onClick={() => addBlock(activePage.id, "paragraph", "", selectedBlockId)}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200/60 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer transition-all active:scale-95"
              >
                <FileText className="h-3.5 w-3.5 text-stone-400" />
                <span>+ Paragraph</span>
              </button>
              <button
                id="bottom-insert-heading-btn"
                onClick={() => addBlock(activePage.id, "heading", "", selectedBlockId)}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200/60 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer transition-all active:scale-95"
              >
                <span className="text-xs font-bold text-stone-400 font-display">H</span>
                <span>+ Heading</span>
              </button>
              <button
                id="bottom-insert-subpage-btn"
                onClick={() => createPage(activePage.id, selectedBlockId)}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200/60 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5 text-stone-400" />
                <span>+ Inline Subpage</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick visual metadata panel at the bottom */}
        <div className="pt-8 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4 select-none shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-stone-400 font-sans font-medium">
            <Calendar className="h-3.5 w-3.5" />
            <span>Created {new Date(activePage.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="text-[11px] text-stone-400 font-mono">
            {wordCount} words • {charCount} characters
          </div>
        </div>

      </div>
    </div>
  );
};
