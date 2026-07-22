import React, { useState, useRef, useEffect } from "react";
import {
  ImageIcon,
  Upload,
  Link as LinkIcon,
  X,
  Trash2,
  RefreshCw,
  Maximize2,
} from "lucide-react";
import { Block } from "../types";

interface ImageBlockProps {
  block: Block;
  isSelected: boolean;
  onUpdateData: (data: Partial<Block["data"]>) => void;
  onSelectBlock: () => void;
  onDeleteBlock: () => void;
  onNavigateUp: () => void;
  onNavigateDown: () => void;
  onInsertParagraphAfter: () => void;
}

export const ImageBlock: React.FC<ImageBlockProps> = ({
  block,
  isSelected,
  onUpdateData,
  onSelectBlock,
  onDeleteBlock,
  onNavigateUp,
  onNavigateDown,
  onInsertParagraphAfter,
}) => {
  const [activeTab, setActiveTab] = useState<"upload" | "embed">("upload");
  const [embedUrlInput, setEmbedUrlInput] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [tempWidth, setTempWidth] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  const imageUrl = block.data.url;
  const caption = block.data.caption || "";
  const currentWidth = tempWidth ?? block.data.width ?? 100;

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      onUpdateData({ url, width: 100 });
    }
  };

  // Handle drag and drop files onto the placeholder area
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      onUpdateData({ url, width: 100 });
    }
  };

  // Embed link submission
  const handleEmbedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (embedUrlInput.trim()) {
      onUpdateData({ url: embedUrlInput.trim(), width: 100 });
      setEmbedUrlInput("");
    }
  };

  // Resize handler using mouse dragging on edge handles
  const handleResizeStart = (e: React.MouseEvent, direction: "left" | "right") => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    const startX = e.clientX;
    const parentWidth = containerRef.current?.getBoundingClientRect().width || 600;
    const startWidthPx = (currentWidth / 100) * parentWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // Depending on handle side, dragging right expands if right handle, contracts if left handle
      const newWidthPx = direction === "right"
        ? startWidthPx + deltaX * 2
        : startWidthPx - deltaX * 2;

      let newPercentage = Math.round((newWidthPx / parentWidth) * 100);
      newPercentage = Math.max(25, Math.min(100, newPercentage));
      setTempWidth(newPercentage);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      setTempWidth((finalWidth) => {
        if (finalWidth !== null) {
          onUpdateData({ width: finalWidth });
        }
        return null;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Keyboard navigation when image container is focused
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Ignore if target is the caption input
    if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") {
      if (e.key === "Enter") {
        e.preventDefault();
        onInsertParagraphAfter();
      }
      return;
    }

    if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      onDeleteBlock();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onNavigateUp();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onNavigateDown();
    } else if (e.key === "Enter") {
      e.preventDefault();
      onInsertParagraphAfter();
    }
  };

  return (
    <div
      ref={containerRef}
      id={`block-input-${block.id}`}
      tabIndex={0}
      onClick={onSelectBlock}
      onFocus={onSelectBlock}
      onKeyDown={handleKeyDown}
      className="w-full flex flex-col items-center py-1 outline-none select-none group/imageblock"
    >
      {!imageUrl ? (
        /* Empty Upload / Embed Card */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full rounded-xl border-2 border-dashed p-4 transition-all bg-stone-50/60 ${
            isDraggingOver
              ? "border-stone-800 bg-stone-100/80 scale-[1.01]"
              : isSelected
              ? "border-stone-400 bg-stone-50"
              : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
          }`}
        >
          {/* Tabs */}
          <div className="flex items-center gap-4 border-b border-stone-200/80 pb-2 mb-3">
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-1.5 text-xs font-semibold pb-1 border-b-2 transition-all cursor-pointer ${
                activeTab === "upload"
                  ? "border-stone-800 text-stone-900"
                  : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("embed")}
              className={`flex items-center gap-1.5 text-xs font-semibold pb-1 border-b-2 transition-all cursor-pointer ${
                activeTab === "embed"
                  ? "border-stone-800 text-stone-900"
                  : "border-transparent text-stone-400 hover:text-stone-600"
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              <span>Embed link</span>
            </button>
          </div>

          {/* Tab Contents */}
          {activeTab === "upload" ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-2 text-center">
              <div className="p-2.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200/60">
                <ImageIcon className="h-6 w-6 text-stone-500" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-stone-700">
                  Drag and drop an image here, or browse files
                </p>
                <p className="text-[11px] text-stone-400">
                  Supports PNG, JPG, GIF, WebP, SVG
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-100 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer active:scale-95 mt-1"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Choose image</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmbedSubmit} className="flex flex-col gap-2.5 py-2">
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="Paste an image link..."
                  value={embedUrlInput}
                  onChange={(e) => setEmbedUrlInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white text-stone-800 placeholder-stone-300 outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-400"
                />
                <button
                  type="submit"
                  disabled={!embedUrlInput.trim()}
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-200 disabled:text-stone-400 text-stone-100 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Embed image
                </button>
              </div>
              <p className="text-[10px] text-stone-400">
                Works with any direct image URL.
              </p>
            </form>
          )}
        </div>
      ) : (
        /* Image Display Box */
        <div
          ref={imageWrapperRef}
          style={{ width: `${currentWidth}%` }}
          className={`relative group/imgwrapper rounded-xl overflow-hidden transition-all border ${
            isSelected
              ? "ring-2 ring-stone-800 border-transparent shadow-md"
              : "border-stone-200/80 hover:border-stone-300"
          }`}
        >
          <img
            src={imageUrl}
            alt={caption || "Inserted image"}
            referrerPolicy="no-referrer"
            className="w-full h-auto object-contain max-h-[600px] rounded-xl block pointer-events-none select-none"
          />

          {/* Action Overlay Controls */}
          <div className="absolute top-2 right-2 opacity-0 group-hover/imgwrapper:opacity-100 transition-opacity bg-white/95 backdrop-blur-[2px] border border-stone-200/90 rounded-lg p-1 flex items-center gap-1 shadow-md z-10">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUpdateData({ url: undefined });
              }}
              className="text-xs font-medium px-2 py-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded flex items-center gap-1 transition-colors cursor-pointer"
              title="Replace image"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Replace</span>
            </button>
            <div className="w-[1px] h-3 bg-stone-200" />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUpdateData({ width: currentWidth === 100 ? 60 : 100 });
              }}
              className="text-xs font-medium px-2 py-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded flex items-center gap-1 transition-colors cursor-pointer"
              title="Toggle width"
            >
              <Maximize2 className="h-3 w-3" />
              <span>{currentWidth === 100 ? "Compact" : "Full"}</span>
            </button>
            <div className="w-[1px] h-3 bg-stone-200" />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteBlock();
              }}
              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
              title="Delete block"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Left & Right Resize Handles */}
          <div
            onMouseDown={(e) => handleResizeStart(e, "left")}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-3 h-12 bg-white/80 hover:bg-stone-800 border border-stone-300 hover:border-stone-800 rounded-full cursor-ew-resize opacity-0 group-hover/imgwrapper:opacity-100 transition-all flex items-center justify-center shadow-sm z-10"
            title="Drag to resize"
          >
            <div className="w-0.5 h-4 bg-stone-400 group-hover/imgwrapper:bg-white rounded" />
          </div>
          <div
            onMouseDown={(e) => handleResizeStart(e, "right")}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-12 bg-white/80 hover:bg-stone-800 border border-stone-300 hover:border-stone-800 rounded-full cursor-ew-resize opacity-0 group-hover/imgwrapper:opacity-100 transition-all flex items-center justify-center shadow-sm z-10"
            title="Drag to resize"
          >
            <div className="w-0.5 h-4 bg-stone-400 group-hover/imgwrapper:bg-white rounded" />
          </div>
        </div>
      )}

      {/* Caption Field */}
      {imageUrl && (
        <div className="w-full flex justify-center mt-1.5">
          <input
            type="text"
            value={caption}
            onChange={(e) => onUpdateData({ caption: e.target.value })}
            placeholder="Write a caption..."
            className="text-center text-xs text-stone-500 placeholder-stone-300 font-sans border-b border-transparent hover:border-stone-200 focus:border-stone-400 outline-none py-0.5 px-2 transition-all max-w-lg w-full bg-transparent"
          />
        </div>
      )}
    </div>
  );
};
