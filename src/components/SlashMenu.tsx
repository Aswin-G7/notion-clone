import React, { useEffect, useState, useRef } from "react";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  FilePlus,
} from "lucide-react";

export interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface SlashMenuProps {
  searchText: string;
  onSelect: (commandId: string) => void;
  onClose: () => void;
}

export const COMMANDS: CommandItem[] = [
  {
    id: "paragraph",
    label: "Text",
    description: "Start writing with plain text.",
    icon: <Type className="h-4 w-4 text-stone-500" />,
  },
  {
    id: "heading-1",
    label: "Heading 1",
    description: "Big section heading.",
    icon: <Heading1 className="h-4 w-4 text-stone-500" />,
  },
  {
    id: "heading-2",
    label: "Heading 2",
    description: "Medium section heading.",
    icon: <Heading2 className="h-4 w-4 text-stone-500" />,
  },
  {
    id: "heading-3",
    label: "Heading 3",
    description: "Small section heading.",
    icon: <Heading3 className="h-4 w-4 text-stone-500" />,
  },
  {
    id: "bulleted-list",
    label: "Bulleted list",
    description: "Create a simple bulleted list.",
    icon: <List className="h-4 w-4 text-stone-500" />,
  },
  {
    id: "numbered-list",
    label: "Numbered list",
    description: "Create a list with numbering.",
    icon: <ListOrdered className="h-4 w-4 text-stone-500" />,
  },
  {
    id: "todo",
    label: "To-do list",
    description: "Track tasks with a to-do list.",
    icon: <CheckSquare className="h-4 w-4 text-stone-500" />,
  },
  {
    id: "quote",
    label: "Quote",
    description: "Capture a quote.",
    icon: <Quote className="h-4 w-4 text-stone-500" />,
  },
  {
    id: "code",
    label: "Code",
    description: "Write code snippets.",
    icon: <Code className="h-4 w-4 text-stone-500" />,
  },
  {
    id: "divider",
    label: "Divider",
    description: "Visually divide blocks with a line.",
    icon: <Minus className="h-4 w-4 text-stone-500" />,
  },
  {
    id: "child-page",
    label: "Inline Page",
    description: "Create a subpage inside this page.",
    icon: <FilePlus className="h-4 w-4 text-stone-500" />,
  },
];

export const SlashMenu: React.FC<SlashMenuProps> = ({
  searchText,
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter commands in real time
  const filtered = COMMANDS.filter((cmd) => {
    if (!searchText) return true;
    const query = searchText.toLowerCase().trim();
    return (
      cmd.label.toLowerCase().includes(query) ||
      cmd.description.toLowerCase().includes(query)
    );
  });

  // Keep index in range of filtered commands
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchText]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Window keydown listener in capture phase to intercept editor events
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (filtered.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        onSelect(filtered[selectedIndex].id);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true });
    };
  }, [filtered, selectedIndex, onSelect, onClose]);

  // Scroll active item into view
  const activeItemRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  if (filtered.length === 0) {
    return (
      <div
        ref={menuRef}
        id="slash-menu-empty"
        className="absolute z-50 left-0 mt-7 w-72 bg-white rounded-lg border border-stone-200 shadow-xl p-3 text-xs text-stone-400 italic font-sans"
      >
        No matching commands
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      id="slash-menu-container"
      className="absolute z-50 left-0 mt-7 w-72 max-h-80 overflow-y-auto bg-white rounded-lg border border-stone-200 shadow-xl py-1.5 flex flex-col scrollbar-thin select-none"
    >
      <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-50 pb-1.5 mb-1">
        Basic blocks
      </div>
      <div className="flex-1 overflow-y-auto space-y-[2px] px-1">
        {filtered.map((cmd, idx) => {
          const isActive = idx === selectedIndex;
          return (
            <button
              key={cmd.id}
              ref={isActive ? activeItemRef : null}
              id={`slash-menu-item-${cmd.id}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(cmd.id);
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full flex items-center gap-3 px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                isActive
                  ? "bg-stone-100 text-stone-900"
                  : "bg-transparent text-stone-600"
              }`}
            >
              <div className={`p-1 rounded bg-stone-50 flex items-center justify-center shrink-0 border border-stone-150 ${
                isActive ? "bg-white" : ""
              }`}>
                {cmd.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-stone-800 font-sans">
                  {cmd.label}
                </div>
                <div className="text-[10px] text-stone-400 font-sans leading-normal truncate">
                  {cmd.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
