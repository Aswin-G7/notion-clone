import React, { useState, useRef } from "react";
import { Image as ImageIcon, Upload, Link as LinkIcon, X, Trash2, Check, Sparkles } from "lucide-react";

export const COVER_PRESETS = [
  {
    name: "Library Books",
    url: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Cozy Notebook",
    url: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Desk Workspace",
    url: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Sunset Workspace",
    url: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Minimalist Bookshelf",
    url: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Violet Gradient",
    url: "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Oil Painting Art",
    url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?q=80&w=1200&auto=format&fit=crop",
  },
  {
    name: "Abstract Architecture",
    url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200&auto=format&fit=crop",
  },
];

interface CoverPickerPopoverProps {
  currentCover?: string | null;
  onSelectCover: (coverUrl: string) => void;
  onRemoveCover?: () => void;
  onClose: () => void;
  align?: "left" | "center" | "right";
}

export const CoverPickerPopover: React.FC<CoverPickerPopoverProps> = ({
  currentCover,
  onSelectCover,
  onRemoveCover,
  onClose,
  align = "right",
}) => {
  const [activeTab, setActiveTab] = useState<"gallery" | "upload" | "link">("gallery");
  const [customUrl, setCustomUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customUrl.trim();
    if (!trimmed) {
      setUrlError("Please enter an image URL.");
      return;
    }
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("data:image/")) {
      setUrlError("URL must start with http:// or https://");
      return;
    }
    setUrlError("");
    onSelectCover(trimmed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        onSelectCover(result);
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert("Failed to read image file.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      id="cover-picker-popover"
      className={`absolute z-50 mt-2 w-80 sm:w-96 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden font-sans text-stone-800 ${
        align === "center" ? "left-1/2 -translate-x-1/2" : align === "right" ? "right-0" : "left-0"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Bar */}
      <div className="p-3 border-b border-stone-150 bg-stone-50/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider">
          <ImageIcon className="h-4 w-4 text-stone-600 shrink-0" />
          <span>Change Cover</span>
        </div>
        <div className="flex items-center gap-1">
          {currentCover && onRemoveCover && (
            <button
              type="button"
              onClick={onRemoveCover}
              className="px-2 py-1 rounded text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Remove</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center border-b border-stone-150 bg-white text-xs font-medium text-stone-500">
        <button
          onClick={() => setActiveTab("gallery")}
          className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === "gallery"
              ? "border-stone-900 text-stone-900 font-bold"
              : "border-transparent hover:text-stone-800"
          }`}
        >
          Gallery
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === "upload"
              ? "border-stone-900 text-stone-900 font-bold"
              : "border-transparent hover:text-stone-800"
          }`}
        >
          Upload
        </button>
        <button
          onClick={() => setActiveTab("link")}
          className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === "link"
              ? "border-stone-900 text-stone-900 font-bold"
              : "border-transparent hover:text-stone-800"
          }`}
        >
          Link / URL
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-3">
        {activeTab === "gallery" && (
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              Presets & Fine Art
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
              {COVER_PRESETS.map((preset) => {
                const isSelected = currentCover === preset.url;
                return (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => onSelectCover(preset.url)}
                    className={`relative h-16 w-full rounded-lg overflow-hidden border-2 transition-all cursor-pointer group/item ${
                      isSelected ? "border-stone-900 ring-2 ring-stone-900/20" : "border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-200"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-stone-900/30 flex items-center justify-center">
                        <Check className="h-5 w-5 text-white drop-shadow-sm" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "upload" && (
          <div className="space-y-3 py-2">
            <div className="text-xs text-stone-500 text-center">
              Choose an image from your computer to use as the page cover.
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-stone-200 hover:border-stone-400 rounded-xl p-6 text-center cursor-pointer bg-stone-50/50 hover:bg-stone-50 transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
                <Upload className="h-5 w-5 text-stone-600" />
              </div>
              <div>
                <span className="text-xs font-semibold text-stone-700 block">
                  {isUploading ? "Uploading image..." : "Click to select local image"}
                </span>
                <span className="text-[11px] text-stone-400">PNG, JPG, WEBP or GIF</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "link" && (
          <form onSubmit={handleUrlSubmit} className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-600 block">
                Paste Image URL
              </label>
              <div className="flex items-center gap-2 border border-stone-200 rounded-lg p-2 bg-stone-50/50 focus-within:bg-white focus-within:border-stone-400 focus-within:ring-1 focus-within:ring-stone-400 transition-all">
                <LinkIcon className="h-4 w-4 text-stone-400 shrink-0" />
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => {
                    setCustomUrl(e.target.value);
                    setUrlError("");
                  }}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-transparent text-xs text-stone-800 outline-none"
                />
              </div>
              {urlError && <p className="text-[11px] text-red-500">{urlError}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Submit Cover URL
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
