import React, { useEffect, useRef, useState } from "react";
import {
  Copy,
  Trash2,
  ChevronRight,
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
} from "lucide-react";
import { BlockType } from "../types";

interface ContextMenuProps {
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onTurnInto: (type: BlockType, extraData?: any) => void;
  position: { x: number; y: number };
}

const TURN_INTO_OPTIONS = [
  { id: "paragraph", label: "Paragraph", icon: Type },
  { id: "heading-1", label: "Heading 1", icon: Heading1, extraData: { level: 1 } },
  { id: "heading-2", label: "Heading 2", icon: Heading2, extraData: { level: 2 } },
  { id: "heading-3", label: "Heading 3", icon: Heading3, extraData: { level: 3 } },
  { id: "bulleted-list", label: "Bullet List", icon: List },
  { id: "numbered-list", label: "Numbered List", icon: ListOrdered },
  { id: "todo", label: "To-do List", icon: CheckSquare },
  { id: "quote", label: "Quote", icon: Quote },
  { id: "code", label: "CodeBlock", icon: Code },
  { id: "divider", label: "Divider", icon: Minus },
];

export const ContextMenu: React.FC<ContextMenuProps> = ({
  onClose,
  onDuplicate,
  onDelete,
  onTurnInto,
  position,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showSubmenu, setShowSubmenu] = useState(false);
  const submenuTimeoutRef = useRef<number | null>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleMouseEnterTurnInto = () => {
    if (submenuTimeoutRef.current) {
      window.clearTimeout(submenuTimeoutRef.current);
      submenuTimeoutRef.current = null;
    }
    setShowSubmenu(true);
  };

  const handleMouseLeaveTurnInto = () => {
    submenuTimeoutRef.current = window.setTimeout(() => {
      setShowSubmenu(false);
    }, 200);
  };

  const handleMouseEnterOther = () => {
    setShowSubmenu(false);
  };

  // Adjust positioning to avoid going off-screen
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (menuRef.current) {
      const menuWidth = 220;
      const menuHeight = 200;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let x = position.x;
      let y = position.y;

      if (x + menuWidth > windowWidth) {
        x = windowWidth - menuWidth - 16;
      }
      if (y + menuHeight > windowHeight) {
        y = windowHeight - menuHeight - 16;
      }

      setAdjustedPosition({ x: Math.max(8, x), y: Math.max(8, y) });
    }
  }, [position]);

  return (
    <div
      ref={menuRef}
      id="block-context-menu"
      style={{
        position: "fixed",
        top: adjustedPosition.y,
        left: adjustedPosition.x,
      }}
      className="z-50 min-w-[220px] bg-white border border-stone-200 shadow-xl rounded-lg py-1.5 text-stone-800 text-sm select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Actions */}
      <button
        id="context-menu-duplicate"
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
          onClose();
        }}
        onMouseEnter={handleMouseEnterOther}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-stone-50 transition-colors"
      >
        <Copy className="h-4 w-4 text-stone-500" />
        <span className="flex-1 font-medium text-stone-700">Duplicate</span>
        <span className="text-[10px] text-stone-400">Ctrl+D</span>
      </button>

      {/* Turn Into Submenu Trigger */}
      <div
        id="context-menu-turn-into-trigger"
        onMouseEnter={handleMouseEnterTurnInto}
        onMouseLeave={handleMouseLeaveTurnInto}
        className="relative"
      >
        <button
          id="context-menu-turn-into-btn"
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-stone-50 transition-colors"
        >
          <Type className="h-4 w-4 text-stone-500" />
          <span className="flex-1 font-medium text-stone-700">Turn Into</span>
          <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
        </button>

        {/* Turn Into Submenu */}
        {showSubmenu && (
          <div
            id="context-menu-turn-into-submenu"
            className="absolute left-full top-0 ml-1 min-w-[180px] bg-white border border-stone-200 shadow-xl rounded-lg py-1 text-stone-800 text-sm animate-in fade-in slide-in-from-left-2 duration-100"
          >
            {TURN_INTO_OPTIONS.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.id}
                  id={`context-submenu-item-${option.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    let blockType: BlockType = "paragraph";
                    if (option.id.startsWith("heading")) {
                      blockType = "heading";
                    } else if (option.id === "code") {
                      blockType = "code";
                    } else if (option.id === "bulleted-list") {
                      blockType = "bulleted-list";
                    } else if (option.id === "numbered-list") {
                      blockType = "numbered-list";
                    } else if (option.id === "todo") {
                      blockType = "todo";
                    } else if (option.id === "quote") {
                      blockType = "quote";
                    } else if (option.id === "divider") {
                      blockType = "divider";
                    }
                    onTurnInto(blockType, option.extraData);
                    onClose();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-stone-50 transition-colors"
                >
                  <IconComponent className="h-4 w-4 text-stone-500" />
                  <span className="flex-1 font-medium text-stone-700">{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="my-1 border-t border-stone-100" />

      <button
        id="context-menu-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
          onClose();
        }}
        onMouseEnter={handleMouseEnterOther}
        className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-red-50 text-red-600 transition-colors"
      >
        <Trash2 className="h-4 w-4 text-red-500" />
        <span className="flex-1 font-medium text-red-700">Delete</span>
        <span className="text-[10px] text-red-400">Del</span>
      </button>
    </div>
  );
};
