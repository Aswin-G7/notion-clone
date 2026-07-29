import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, Trash2, Shuffle, Smile } from "lucide-react";

interface EmojiCategory {
  name: string;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: "Frequently Used",
    emojis: ["📄", "🚀", "📝", "🎯", "💡", "💻", "🎨", "📚", "🪴", "🍿", "🍕", "✨", "🔥", "❤️", "⭐", "🎉"],
  },
  {
    name: "Smileys & People",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐"],
  },
  {
    name: "Objects & Work",
    emojis: ["📄", "📑", "📊", "📈", "📉", "📅", "📆", "🗓️", "📇", "📂", "📁", "📋", "📌", "📍", "📎", "📏", "📐", "✂️", "🔒", "🔓", "🔑", "🛠️", "⚙️", "🧪", "🧰", "💻", "🖥️", "⌨️", "🖱️", "📱", "📞", "⌛", "⏰", "⏳", "📡", "💡", "flashlight", "🕯️", "📦", "🏷️", "✉️", "📧", "📩"],
  },
  {
    name: "Symbols & Icons",
    emojis: ["🎯", "🔥", "✨", "🌟", "💫", "⭐", "🎉", "🎊", "💬", "💭", "🗯️", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💯", "💢", "💥", "🛑", "⛔", "📛", "🚫", "⭕", "❌", "❓", "❗", "📌", "🚩", "🏁", "⚠️", "⚡", "🔮", "🧿"],
  },
  {
    name: "Nature & Animals",
    emojis: ["🪴", "🌱", "🌿", "🍀", "🍃", "🍂", "🍁", "🌾", "🌺", "🌻", "🌹", "🌷", "🌼", "🌸", "💐", "🍄", "🌵", "🌲", "🌳", "🌴", "🐱", "🐶", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🦅", "🦉", "🦋", "🐝", "🐞", "🌊", "🏔️", "⛰️", "🌋", "🏕️", "🏞️", "🌅", "🌄", "🌌"],
  },
  {
    name: "Food & Activity",
    emojis: ["☕", "🍵", "🥤", "🧃", "🥐", "🍞", "🥖", "🥨", "🍳", "🥞", "🧇", "🧀", "🍕", "🥪", "🍔", "🍟", "🌮", "🌯", "🥗", "🍲", "🍣", "🍱", "🥟", "🍩", "🍨", "🍦", "🍰", "🎂", "🍎", "🥑", "🍓", "🍉", "🍌", "🏃", "🚴", "🧗", "🧘", "✈️", "🗺️", "🚀", "⛵", "🎮", "🎨", "🎬", "🎤", "🎧", "🎷", "🎸"],
  },
];

interface EmojiPickerPopoverProps {
  currentIcon?: string | null;
  onSelectEmoji: (emoji: string) => void;
  onRemoveIcon?: () => void;
  onClose: () => void;
  align?: "left" | "center" | "right";
}

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  currentIcon,
  onSelectEmoji,
  onRemoveIcon,
  onClose,
  align = "left",
}) => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) {
      if (activeCategory === "All") return EMOJI_CATEGORIES;
      return EMOJI_CATEGORIES.filter((c) => c.name === activeCategory);
    }

    const q = search.toLowerCase();
    return EMOJI_CATEGORIES.map((cat) => {
      const matchedName = cat.name.toLowerCase().includes(q);
      if (matchedName) return cat;
      return {
        ...cat,
        emojis: cat.emojis.filter((e) => e.includes(q) || cat.name.toLowerCase().includes(q)),
      };
    }).filter((cat) => cat.emojis.length > 0);
  }, [search, activeCategory]);

  const handleRandom = () => {
    const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
    const rand = all[Math.floor(Math.random() * all.length)];
    onSelectEmoji(rand);
  };

  return (
    <div
      id="emoji-picker-popover"
      className={`absolute z-50 mt-2 w-80 sm:w-88 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden font-sans text-stone-800 ${
        align === "center" ? "left-1/2 -translate-x-1/2" : align === "right" ? "right-0" : "left-0"
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Bar */}
      <div className="p-3 border-b border-stone-150 bg-stone-50/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider">
          <Smile className="h-4 w-4 text-amber-500 shrink-0" />
          <span>Select Icon</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRandom}
            className="p-1 rounded text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
            title="Random Emoji"
          >
            <Shuffle className="h-3.5 w-3.5" />
          </button>
          {currentIcon && onRemoveIcon && (
            <button
              type="button"
              onClick={onRemoveIcon}
              className="px-2 py-1 rounded text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-1 cursor-pointer"
              title="Remove Icon"
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

      {/* Search Input */}
      <div className="p-2 border-b border-stone-150 bg-white flex items-center gap-2">
        <Search className="h-3.5 w-3.5 text-stone-400 shrink-0 ml-1" />
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter icons or search category..."
          className="w-full bg-transparent text-xs text-stone-800 placeholder-stone-400 outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Category Tabs */}
      {!search && (
        <div className="flex items-center gap-1 p-1.5 border-b border-stone-100 bg-stone-50/50 overflow-x-auto no-scrollbar text-[11px] font-medium text-stone-500">
          <button
            onClick={() => setActiveCategory("All")}
            className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
              activeCategory === "All"
                ? "bg-white text-stone-900 font-bold shadow-2xs border border-stone-200/60"
                : "hover:text-stone-800 hover:bg-stone-200/40"
            }`}
          >
            All
          </button>
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat.name
                  ? "bg-white text-stone-900 font-bold shadow-2xs border border-stone-200/60"
                  : "hover:text-stone-800 hover:bg-stone-200/40"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Scroll Area */}
      <div className="p-2 max-h-56 overflow-y-auto space-y-3 font-sans">
        {filteredCategories.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400">
            No matching icons found.
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="px-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                {cat.name}
              </div>
              <div className="grid grid-cols-8 gap-1">
                {cat.emojis.map((emoji) => (
                  <button
                    key={`${cat.name}-${emoji}`}
                    type="button"
                    onClick={() => onSelectEmoji(emoji)}
                    className={`text-xl h-8 w-8 flex items-center justify-center rounded-lg hover:bg-stone-100 hover:scale-110 active:scale-95 transition-all cursor-pointer ${
                      currentIcon === emoji ? "bg-amber-100 ring-1 ring-amber-400" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
