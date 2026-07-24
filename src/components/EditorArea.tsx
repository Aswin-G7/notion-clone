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
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { Page, Block, BlockType } from "../types";
import { SlashMenu } from "./SlashMenu";
import { BlockToolbar } from "./BlockToolbar";
import { ContextMenu } from "./ContextMenu";
import { RichTextEditor } from "./RichTextEditor";
import { CodeBlock } from "./CodeBlock";
import { TableBlock } from "./TableBlock";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableBlockWrapper } from "./SortableBlockWrapper";
import { ImageBlock } from "./ImageBlock";

const getPlainTextFromHtml = (html: string): string => {
  if (!html) return "";
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return doc.body.textContent || doc.body.innerText || "";
};

function splitHtmlAtTextOffset(html: string, offset: number): [string, string] {
  if (offset <= 0) return ["", html];
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;
  
  const leftDoc = parser.parseFromString("", "text/html");
  const rightDoc = parser.parseFromString("", "text/html");
  const leftBody = leftDoc.body;
  const rightBody = rightDoc.body;
  
  let currentOffset = 0;
  let splitDone = false;
  
  function traverse(node: Node, leftParent: Node, rightParent: Node) {
    if (splitDone) {
      rightParent.appendChild(node.cloneNode(true));
      return;
    }
    
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      const len = text.length;
      
      if (currentOffset + len < offset) {
        leftParent.appendChild(node.cloneNode(true));
        currentOffset += len;
      } else {
        const splitIndex = offset - currentOffset;
        const leftText = text.substring(0, splitIndex);
        const rightText = text.substring(splitIndex);
        
        if (leftText) {
          leftParent.appendChild(leftDoc.createTextNode(leftText));
        }
        if (rightText) {
          rightParent.appendChild(rightDoc.createTextNode(rightText));
        }
        
        currentOffset = offset;
        splitDone = true;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const leftClone = element.cloneNode(false);
      const rightClone = element.cloneNode(false);
      
      const children = Array.from(element.childNodes);
      for (const child of children) {
        traverse(child, leftClone, rightClone);
      }
      
      if (leftClone.childNodes.length > 0 || children.length === 0) {
        leftParent.appendChild(leftClone);
      }
      if (rightClone.childNodes.length > 0 || children.length === 0) {
        rightParent.appendChild(rightClone);
      }
    }
  }
  
  const topLevelChildren = Array.from(body.childNodes);
  for (const child of topLevelChildren) {
    traverse(child, leftBody, rightBody);
  }
  
  return [leftBody.innerHTML, rightBody.innerHTML];
}

const EMOJIS = [
  "📄", "🚀", "📝", "🍳", "🎯", "💡", "💻", "🎨",
  "🛠️", "📚", "🪴", "🍿", "🍕", "🏃", "✈️", "🗺️",
  "📅", "✉️", "🔐", "💬", "❤️", "🔥", "✨", "🌟",
  "🐱", "🐶", "🥑", "🥐", "🏔️", "🏕️", "🏠", "⏰"
];

const isBlockVisible = (block: Block, blocksMap: Map<string, Block>): boolean => {
  let currParentId = block.data?.parentId;
  while (currParentId) {
    const parent = blocksMap.get(currParentId);
    if (!parent) break;
    if (parent.type === "toggle" && parent.data?.collapsed) {
      return false;
    }
    currParentId = parent.data?.parentId;
  }
  return true;
};

const getBlockDepth = (block: Block, blocksMap: Map<string, Block>): number => {
  let depth = 0;
  let currParentId = block.data?.parentId;
  while (currParentId) {
    depth++;
    const parent = blocksMap.get(currParentId);
    if (!parent) break;
    currParentId = parent.data?.parentId;
  }
  return depth;
};

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
    updateBlockType,
    updateBlockData,
    deleteBlock,
    reorderBlocks,
    duplicateBlock
  } = useApp();

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuBlockId, setSlashMenuBlockId] = useState<string | null>(null);
  const [slashMenuSearch, setSlashMenuSearch] = useState("");

  const [toolbarMenuBlockId, setToolbarMenuBlockId] = useState<string | null>(null);

  const [contextMenuBlockId, setContextMenuBlockId] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [calloutEmojiPickerBlockId, setCalloutEmojiPickerBlockId] = useState<string | null>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calloutEmojiPickerBlockId) {
        const pickerEl = document.getElementById(`callout-emoji-picker-${calloutEmojiPickerBlockId}`);
        if (pickerEl && !pickerEl.contains(e.target as Node)) {
          setCalloutEmojiPickerBlockId(null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [calloutEmojiPickerBlockId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!activePage) return;

    const draggedBlockId = active.id as string;

    if (over && active.id !== over.id) {
      reorderBlocks(activePage.id, draggedBlockId, over.id as string);
    }

    setSelectedBlockId(draggedBlockId);

    const focusTarget = () => {
      const el = document.getElementById(`block-input-${draggedBlockId}`);
      if (el) {
        el.focus();
        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          const start = el.selectionStart;
          const end = el.selectionEnd;
          if (start !== null && end !== null && (start > 0 || end > 0)) {
            el.setSelectionRange(start, end);
          } else {
            const length = el.value.length;
            el.setSelectionRange(length, length);
          }
        }
      }
    };

    focusTarget();
    requestAnimationFrame(focusTarget);
    setTimeout(focusTarget, 50);
  };

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
    const text = getPlainTextFromHtml(block.data.text || "");
    return acc + text.split(/\s+/).filter(Boolean).length;
  }, 0);

  const charCount = activePage.blocks.reduce((acc, block) => {
    if (block.type === "child-page") return acc;
    const text = getPlainTextFromHtml(block.data.text || "");
    return acc + text.length;
  }, 0);

  const selectedBlock = activePage.blocks.find((b) => b.id === selectedBlockId);
  const selectedBlockType = selectedBlock ? selectedBlock.type : null;
  const selectedBlockLevel = selectedBlock?.data?.level;

  // Focus management effect
  React.useEffect(() => {
    if (selectedBlockId) {
      const el = document.getElementById(`block-input-${selectedBlockId}`);
      if (el) {
        el.focus();
        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          const length = el.value.length;
          el.setSelectionRange(length, length);
        }
      }
    }
  }, [selectedBlockId, selectedBlockType, selectedBlockLevel, slashMenuOpen]);

  const handleBlockChange = (blockId: string, val: string) => {
    updateBlock(activePage.id, blockId, val);

    const block = activePage.blocks.find((b) => b.id === blockId);
    if (
      block &&
      (block.type === "paragraph" ||
        block.type === "bulleted-list" ||
        block.type === "numbered-list" ||
        block.type === "todo" ||
        block.type === "quote" ||
        block.type === "code" ||
        block.type === "toggle" ||
        block.type === "callout")
    ) {
      const plainText = getPlainTextFromHtml(val);
      if (plainText.startsWith("/")) {
        const query = plainText.slice(1);
        if (query.includes(" ")) {
          setSlashMenuOpen(false);
          setSlashMenuBlockId(null);
          setSlashMenuSearch("");
        } else {
          setSlashMenuOpen(true);
          setSlashMenuBlockId(blockId);
          setSlashMenuSearch(query);
        }
      } else {
        if (slashMenuBlockId === blockId) {
          setSlashMenuOpen(false);
          setSlashMenuBlockId(null);
          setSlashMenuSearch("");
        }
      }
    }
  };

  const handleSelectCommand = (commandId: string) => {
    if (!slashMenuBlockId) return;

    if (commandId === "paragraph") {
      updateBlockType(activePage.id, slashMenuBlockId, "paragraph", { text: "" });
    } else if (commandId === "heading-1") {
      updateBlockType(activePage.id, slashMenuBlockId, "heading", { text: "", level: 1 });
    } else if (commandId === "heading-2") {
      updateBlockType(activePage.id, slashMenuBlockId, "heading", { text: "", level: 2 });
    } else if (commandId === "heading-3") {
      updateBlockType(activePage.id, slashMenuBlockId, "heading", { text: "", level: 3 });
    } else if (commandId === "bulleted-list") {
      updateBlockType(activePage.id, slashMenuBlockId, "bulleted-list", { text: "" });
    } else if (commandId === "numbered-list") {
      updateBlockType(activePage.id, slashMenuBlockId, "numbered-list", { text: "" });
    } else if (commandId === "todo") {
      updateBlockType(activePage.id, slashMenuBlockId, "todo", { text: "", checked: false });
    } else if (commandId === "quote") {
      updateBlockType(activePage.id, slashMenuBlockId, "quote", { text: "" });
    } else if (commandId === "code") {
      updateBlockType(activePage.id, slashMenuBlockId, "code", { text: "", language: "javascript" });
    } else if (commandId === "table") {
      updateBlockType(activePage.id, slashMenuBlockId, "table", {
        rows: [
          ["", "", ""],
          ["", "", ""],
          ["", "", ""],
        ],
      });
    } else if (commandId === "divider") {
      updateBlockType(activePage.id, slashMenuBlockId, "divider", { text: "" });
    } else if (commandId === "image") {
      updateBlockType(activePage.id, slashMenuBlockId, "image", { url: undefined, width: 100 });
    } else if (commandId === "toggle") {
      updateBlockType(activePage.id, slashMenuBlockId, "toggle", { text: "", collapsed: false });
    } else if (commandId === "callout") {
      updateBlockType(activePage.id, slashMenuBlockId, "callout", { text: "", icon: "💡" });
    } else if (commandId === "child-page") {
      createPage(activePage.id, slashMenuBlockId);
      deleteBlock(activePage.id, slashMenuBlockId);
    }

    setSlashMenuOpen(false);
    setSlashMenuBlockId(null);
    setSlashMenuSearch("");
  };

  const handleSelectToolbarCommand = (blockId: string, commandId: string) => {
    let newType: BlockType = "paragraph";
    let extraData: any = {};

    if (commandId === "paragraph") {
      newType = "paragraph";
    } else if (commandId === "heading-1") {
      newType = "heading";
      extraData = { level: 1 };
    } else if (commandId === "heading-2") {
      newType = "heading";
      extraData = { level: 2 };
    } else if (commandId === "heading-3") {
      newType = "heading";
      extraData = { level: 3 };
    } else if (commandId === "bulleted-list") {
      newType = "bulleted-list";
    } else if (commandId === "numbered-list") {
      newType = "numbered-list";
    } else if (commandId === "todo") {
      newType = "todo";
      extraData = { checked: false };
    } else if (commandId === "quote") {
      newType = "quote";
    } else if (commandId === "code") {
      newType = "code";
      extraData = { language: "javascript" };
    } else if (commandId === "table") {
      newType = "table";
      extraData = {
        rows: [
          ["", "", ""],
          ["", "", ""],
          ["", "", ""],
        ],
      };
    } else if (commandId === "divider") {
      newType = "divider";
    } else if (commandId === "image") {
      newType = "image";
      extraData = { url: undefined, width: 100 };
    } else if (commandId === "toggle") {
      newType = "toggle";
      extraData = { collapsed: false };
    } else if (commandId === "callout") {
      newType = "callout";
      extraData = { icon: "💡" };
    } else if (commandId === "child-page") {
      createPage(activePage.id, blockId);
      setToolbarMenuBlockId(null);
      return;
    }

    const newBlockId = addBlock(activePage.id, newType, "", blockId, extraData);
    setSelectedBlockId(newBlockId);
    setToolbarMenuBlockId(null);
  };

  const handlePlusClick = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setToolbarMenuBlockId(blockId);
  };

  const handleDragClick = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBlockId(blockId);

    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenuBlockId(blockId);
    setContextMenuPosition({ x: rect.right + 4, y: rect.top });
  };

  const handleDuplicateBlock = (blockId: string) => {
    if (!activePage) return;
    duplicateBlock(activePage.id, blockId);
  };

  const handleDeleteBlock = (blockId: string) => {
    if (!activePage) return;
    if (activePage.blocks.length <= 1) return;

    const currentIndex = activePage.blocks.findIndex((b) => b.id === blockId);
    if (currentIndex === -1) return;

    let targetFocusId: string | null = null;
    if (currentIndex > 0) {
      targetFocusId = activePage.blocks[currentIndex - 1].id;
    } else if (currentIndex < activePage.blocks.length - 1) {
      targetFocusId = activePage.blocks[currentIndex + 1].id;
    }

    deleteBlock(activePage.id, blockId);

    if (targetFocusId) {
      setSelectedBlockId(targetFocusId);

      const focusTarget = () => {
        const el = document.getElementById(`block-input-${targetFocusId}`);
        if (el) {
          el.focus();
          if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
            const length = el.value.length;
            el.setSelectionRange(length, length);
          }
        }
      };

      focusTarget();
      requestAnimationFrame(focusTarget);
    }
  };

  const handleTurnIntoBlock = (blockId: string, type: BlockType, extraData?: any) => {
    if (!activePage) return;
    if (type === "divider") {
      updateBlockType(activePage.id, blockId, type, { text: "" });
    } else if (type === "callout") {
      updateBlockType(activePage.id, blockId, type, { icon: "💡", ...extraData });
    } else {
      updateBlockType(activePage.id, blockId, type, extraData);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
    block: Block
  ) => {
    if (!activePage) return;

    // Markdown shortcuts auto-conversion when typing at the beginning of a paragraph block and pressing Space
    if (e.key === " " && block.type === "paragraph") {
      const target = e.currentTarget;
      const start = target.selectionStart || 0;
      const end = target.selectionEnd || 0;

      if (start === end) {
        const text = target.value || "";
        const textBeforeCursor = text.substring(0, start);

        const shortcuts: { [key: string]: { type: BlockType; extraData?: any } } = {
          "#": { type: "heading", extraData: { level: 1 } },
          "##": { type: "heading", extraData: { level: 2 } },
          "###": { type: "heading", extraData: { level: 3 } },
          "-": { type: "bulleted-list" },
          "*": { type: "bulleted-list" },
          "1.": { type: "numbered-list" },
          "[]": { type: "todo", extraData: { checked: false } },
          ">": { type: "toggle", extraData: { collapsed: false } },
          "!": { type: "callout", extraData: { icon: "💡" } },
          '"': { type: "quote" },
          "|": { type: "quote" },
          "```": { type: "code", extraData: { language: "javascript" } },
        };

        if (shortcuts[textBeforeCursor] !== undefined) {
          e.preventDefault();
          const match = shortcuts[textBeforeCursor];
          const remainingText = text.substring(start);
          
          handleTurnIntoBlock(block.id, match.type, {
            ...match.extraData,
            text: remainingText,
          });
          return;
        }
      }
    }

    // Tab key: Indent block into previous block or toggle
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const blocksMap = new Map<string, Block>(activePage.blocks.map((b) => [b.id, b]));
      const visibleBlocks = activePage.blocks.filter((b) => isBlockVisible(b, blocksMap));
      const idx = visibleBlocks.findIndex((b) => b.id === block.id);
      if (idx > 0) {
        const prevBlock = visibleBlocks[idx - 1];
        if (prevBlock.type === "toggle") {
          updateBlockData(activePage.id, block.id, { parentId: prevBlock.id });
          if (prevBlock.data.collapsed) {
            updateBlockData(activePage.id, prevBlock.id, { collapsed: false });
          }
        } else {
          updateBlockType(activePage.id, prevBlock.id, "toggle", { collapsed: false });
          updateBlockData(activePage.id, block.id, { parentId: prevBlock.id });
        }
      }
      return;
    }

    // Shift+Tab key: Outdent block
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      if (block.data.parentId) {
        const parentBlock = activePage.blocks.find((b) => b.id === block.data.parentId);
        updateBlockData(activePage.id, block.id, { parentId: parentBlock?.data?.parentId || null });
      }
      return;
    }

    // If slash menu is open for this block, let the slash menu intercept keys
    if (slashMenuOpen && slashMenuBlockId === block.id) {
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "Enter" ||
        e.key === "Escape"
      ) {
        // Handled by window capture listener in SlashMenu
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart || 0;
      const textPlain = getPlainTextFromHtml(block.data.text || "").trim();

      // Case 1: Empty block inside a toggle (or child block)
      if (textPlain === "") {
        if (block.type !== "paragraph") {
          updateBlockType(activePage.id, block.id, "paragraph", { text: "" });
          return;
        }
        if (block.data.parentId) {
          const parentBlock = activePage.blocks.find((b) => b.id === block.data.parentId);
          const outerParentId = parentBlock?.data?.parentId || null;

          // Delete current empty child block
          deleteBlock(activePage.id, block.id);

          // Add new paragraph block immediately after parent toggle subtree
          const insertAfterId = parentBlock ? parentBlock.id : block.id;
          const newBlockId = addBlock(
            activePage.id,
            "paragraph",
            "",
            insertAfterId,
            { parentId: outerParentId }
          );
          setSelectedBlockId(newBlockId);
          return;
        }
      }

      // Case 2: Caret is inside a Toggle block title
      if (block.type === "toggle") {
        const [beforeHtml, afterHtml] = splitHtmlAtTextOffset(block.data.text || "", start);
        updateBlock(activePage.id, block.id, beforeHtml);

        // Expand toggle if collapsed so the new child is visible
        if (block.data.collapsed) {
          updateBlockData(activePage.id, block.id, { collapsed: false });
        }

        // Create the first child block inside the Toggle
        const newBlockId = addBlock(
          activePage.id,
          "paragraph",
          afterHtml,
          block.id,
          { parentId: block.id, insertDirectlyAfter: true }
        );
        setSelectedBlockId(newBlockId);
        return;
      }

      // Case 3: Standard block or non-empty child block
      const [beforeHtml, afterHtml] = splitHtmlAtTextOffset(block.data.text || "", start);
      updateBlock(activePage.id, block.id, beforeHtml);

      let nextType: BlockType = "paragraph";
      let nextData: any = { parentId: block.data.parentId || null };
      if (
        block.type === "bulleted-list" ||
        block.type === "numbered-list" ||
        block.type === "todo"
      ) {
        nextType = block.type;
        if (block.type === "todo") {
          nextData.checked = false;
        }
      }

      const newBlockId = addBlock(activePage.id, nextType, afterHtml, block.id, nextData);
      setSelectedBlockId(newBlockId);
    }

    if (e.key === "Backspace") {
      const text = getPlainTextFromHtml(block.data.text || "");
      if (text === "") {
        if (block.type !== "paragraph") {
          e.preventDefault();
          updateBlockType(activePage.id, block.id, "paragraph", { text: "" });
        } else if (block.data.parentId) {
          e.preventDefault();
          // Outdent child block on Backspace if empty
          const parentBlock = activePage.blocks.find((b) => b.id === block.data.parentId);
          updateBlockData(activePage.id, block.id, { parentId: parentBlock?.data?.parentId || null });
        } else {
          // Only delete if there is more than 1 block
          if (activePage.blocks.length > 1) {
            e.preventDefault();
            handleDeleteBlock(block.id);
          }
        }
      }
    }

    if (e.key === "ArrowUp") {
      const target = e.currentTarget;
      const isAtStart = target.selectionStart === 0 && target.selectionEnd === 0;
      if (isAtStart) {
        const blocksMap = new Map<string, Block>(activePage.blocks.map((b) => [b.id, b]));
        const visibleBlocks = activePage.blocks.filter((b) => isBlockVisible(b, blocksMap));
        const currentIndex = visibleBlocks.findIndex((b) => b.id === block.id);
        if (currentIndex > 0) {
          e.preventDefault();
          const prevBlock = visibleBlocks[currentIndex - 1];
          setSelectedBlockId(prevBlock.id);
        }
      }
    }

    if (e.key === "ArrowDown") {
      const target = e.currentTarget;
      const textLength = target.value.length;
      const isAtEnd = target.selectionStart === textLength && target.selectionEnd === textLength;
      if (isAtEnd) {
        const blocksMap = new Map<string, Block>(activePage.blocks.map((b) => [b.id, b]));
        const visibleBlocks = activePage.blocks.filter((b) => isBlockVisible(b, blocksMap));
        const currentIndex = visibleBlocks.findIndex((b) => b.id === block.id);
        if (currentIndex < visibleBlocks.length - 1) {
          e.preventDefault();
          const nextBlock = visibleBlocks[currentIndex + 1];
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
        handleDeleteBlock(block.id);
      }
    }
  };

  const handleWorkspacePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith("image/")) {
        e.preventDefault();
        const url = URL.createObjectURL(file);
        const newBlockId = addBlock(activePage.id, "image", "", selectedBlockId, { url, width: 100 });
        setSelectedBlockId(newBlockId);
      }
    }
  };

  const handleWorkspaceDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        e.preventDefault();
        e.stopPropagation();
        const url = URL.createObjectURL(file);
        const newBlockId = addBlock(activePage.id, "image", "", selectedBlockId, { url, width: 100 });
        setSelectedBlockId(newBlockId);
      }
    }
  };

  const handleWorkspaceDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
    }
  };

  return (
    <div
      id="editor-workspace"
      onPaste={handleWorkspacePaste}
      onDrop={handleWorkspaceDrop}
      onDragOver={handleWorkspaceDragOver}
      className="flex-1 flex flex-col bg-white overflow-y-auto relative"
    >
      
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
        <div className="flex-1 flex flex-col">
          {activePage.blocks && activePage.blocks.length > 0 ? (() => {
            const blocksMap = new Map<string, Block>(activePage.blocks.map((b) => [b.id, b]));
            const visibleBlocks = activePage.blocks.filter((b) => isBlockVisible(b, blocksMap));

            return (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={visibleBlocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {visibleBlocks.map((block, index) => {
                    const isSelected = selectedBlockId === block.id;
                    const prevBlock = index > 0 ? visibleBlocks[index - 1] : null;
                    const depth = getBlockDepth(block, blocksMap);

                    const isListType =
                      block.type === "bulleted-list" ||
                      block.type === "numbered-list" ||
                      block.type === "todo";
                    const isPrevSameType = prevBlock && prevBlock.type === block.type;

                    let marginTopClass = "mt-2.5";
                    if (index === 0) {
                      marginTopClass = "mt-0";
                    } else if (isListType && isPrevSameType) {
                      marginTopClass = "mt-0";
                    }

                    let paddingYClass = "py-2";
                    if (isListType) {
                      paddingYClass = "py-0.5";
                    }

                    return (
                      <SortableBlockWrapper
                        key={block.id}
                        block={block}
                        isSelected={isSelected}
                        paddingYClass={paddingYClass}
                        marginTopClass={marginTopClass}
                        onPlusClick={(e) => handlePlusClick(e, block.id)}
                        onDragClick={(e) => handleDragClick(e, block.id)}
                      >
                        {/* Block Content Renderers */}
                        <div
                          className={`flex-1 min-w-0 relative ${
                            depth > 0 ? "pl-3 border-l-2 border-stone-200/70 ml-2" : ""
                          }`}
                        >
                      {block.type === "paragraph" && (
                        <div className="relative w-full">
                          <RichTextEditor
                            id={`block-input-${block.id}`}
                            value={block.data.text || ""}
                            onChange={(val) => handleBlockChange(block.id, val)}
                            onKeyDown={(e) => handleKeyDown(e, block)}
                            placeholder="Press Enter or start writing, or type '/' for commands..."
                            className="font-sans text-stone-800 text-[14.5px] leading-relaxed py-0.5"
                            placeholderClassName="text-stone-300 font-sans text-[14.5px] leading-relaxed py-0.5"
                            onFocus={() => setSelectedBlockId(block.id)}
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
                      )}

                      {block.type === "callout" && (
                        <div className="flex items-start gap-3 w-full p-3.5 rounded-xl bg-stone-100/80 border border-stone-200/70 my-1 transition-colors hover:bg-stone-100 relative">
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
                              className="text-xl leading-none p-1 hover:bg-stone-200/70 rounded cursor-pointer select-none transition-transform active:scale-95 flex items-center justify-center"
                              title="Change callout icon"
                            >
                              {block.data.icon || "💡"}
                            </button>

                            {calloutEmojiPickerBlockId === block.id && (
                              <div
                                id={`callout-emoji-picker-${block.id}`}
                                className="absolute left-0 top-full mt-1.5 z-50 bg-white border border-stone-200 shadow-xl rounded-xl p-2 grid grid-cols-4 gap-1 w-40 select-none animate-in fade-in zoom-in-95 duration-100"
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
                                      updateBlockData(activePage.id, block.id, { icon: emoji });
                                      setCalloutEmojiPickerBlockId(null);
                                      setSelectedBlockId(block.id);
                                      const inputEl = document.getElementById(`block-input-${block.id}`);
                                      if (inputEl) {
                                        inputEl.focus();
                                      }
                                    }}
                                    className="text-lg p-1.5 hover:bg-stone-100 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
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
                            className="flex-1 font-sans text-stone-800 text-[14.5px] leading-relaxed py-0.5"
                            placeholderClassName="text-stone-400 font-sans text-[14.5px] leading-relaxed py-0.5"
                            onFocus={() => setSelectedBlockId(block.id)}
                            isSelected={isSelected}
                          />
                        </div>
                      )}

                      {block.type === "heading" && (
                        <RichTextEditor
                          id={`block-input-${block.id}`}
                          value={block.data.text || ""}
                          onChange={(val) => handleBlockChange(block.id, val)}
                          onKeyDown={(e) => handleKeyDown(e, block)}
                          placeholder={`Heading ${block.data.level || 1}`}
                          className="font-display font-bold tracking-tight text-stone-900 py-1"
                          placeholderClassName="text-stone-300 font-display font-bold tracking-tight py-1"
                          style={{
                            fontSize: block.data.level === 1 ? "1.65rem" : block.data.level === 3 ? "1.15rem" : "1.35rem"
                          }}
                          onFocus={() => setSelectedBlockId(block.id)}
                          isSelected={isSelected}
                        />
                      )}

                      {block.type === "toggle" && (
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
                              updateBlockData(activePage.id, block.id, {
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
                            onFocus={() => setSelectedBlockId(block.id)}
                            isSelected={isSelected}
                          />
                        </div>
                      )}

                    {block.type === "bulleted-list" && (
                      <div className="flex items-start gap-2.5 w-full py-0.5">
                        <span className="text-stone-400 select-none text-[15px] leading-relaxed pt-0.5 font-bold">•</span>
                        <RichTextEditor
                          id={`block-input-${block.id}`}
                          value={block.data.text || ""}
                          onChange={(val) => handleBlockChange(block.id, val)}
                          onKeyDown={(e) => handleKeyDown(e, block)}
                          placeholder="List item"
                          className="font-sans text-stone-800 text-[14.5px] leading-relaxed py-0.5"
                          placeholderClassName="text-stone-300 font-sans text-[14.5px] leading-relaxed py-0.5"
                          onFocus={() => setSelectedBlockId(block.id)}
                          isSelected={isSelected}
                        />
                      </div>
                    )}

                    {block.type === "numbered-list" && (() => {
                      let index = 1;
                      const blocks = activePage.blocks;
                      const currentIndex = blocks.findIndex((b) => b.id === block.id);
                      for (let i = currentIndex - 1; i >= 0; i--) {
                        if (blocks[i].type === "numbered-list") {
                          index++;
                        } else {
                          break;
                        }
                      }

                      return (
                        <div className="flex items-start gap-2 w-full py-0.5">
                          <span className="text-stone-400 font-sans font-medium select-none text-[14px] leading-relaxed pt-0.5 w-5 text-right shrink-0">
                            {index}.
                          </span>
                          <RichTextEditor
                            id={`block-input-${block.id}`}
                            value={block.data.text || ""}
                            onChange={(val) => handleBlockChange(block.id, val)}
                            onKeyDown={(e) => handleKeyDown(e, block)}
                            placeholder="List item"
                            className="font-sans text-stone-800 text-[14.5px] leading-relaxed py-0.5"
                            placeholderClassName="text-stone-300 font-sans text-[14.5px] leading-relaxed py-0.5"
                            onFocus={() => setSelectedBlockId(block.id)}
                            isSelected={isSelected}
                          />
                        </div>
                      );
                    })()}

                    {block.type === "todo" && (
                      <div className="flex items-start gap-2.5 w-full py-0.5">
                        <input
                          type="checkbox"
                          checked={!!block.data.checked}
                          onChange={() => updateBlockData(activePage.id, block.id, { checked: !block.data.checked })}
                          className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-800 focus:ring-stone-400 cursor-pointer accent-stone-700 shrink-0"
                        />
                        <RichTextEditor
                          id={`block-input-${block.id}`}
                          value={block.data.text || ""}
                          onChange={(val) => handleBlockChange(block.id, val)}
                          onKeyDown={(e) => handleKeyDown(e, block)}
                          placeholder="To-do"
                          className={`font-sans text-stone-800 text-[14.5px] leading-relaxed py-0.5 ${
                            block.data.checked ? "line-through text-stone-400" : ""
                          }`}
                          placeholderClassName="text-stone-300 font-sans text-[14.5px] leading-relaxed py-0.5"
                          onFocus={() => setSelectedBlockId(block.id)}
                          isSelected={isSelected}
                        />
                      </div>
                    )}

                    {block.type === "quote" && (
                      <div className="flex items-stretch border-l-4 border-stone-300 pl-4 py-0.5 w-full">
                        <RichTextEditor
                          id={`block-input-${block.id}`}
                          value={block.data.text || ""}
                          onChange={(val) => handleBlockChange(block.id, val)}
                          onKeyDown={(e) => handleKeyDown(e, block)}
                          placeholder="Empty quote"
                          className="font-sans text-stone-700 italic text-[14.5px] leading-relaxed py-0.5"
                          placeholderClassName="text-stone-300 font-sans text-[14.5px] leading-relaxed py-0.5"
                          onFocus={() => setSelectedBlockId(block.id)}
                          isSelected={isSelected}
                        />
                      </div>
                    )}

                    {block.type === "code" && (() => {
                      const blocksMap = new Map<string, Block>(activePage.blocks.map((b) => [b.id, b]));
                      const visibleBlocks = activePage.blocks.filter((b) => isBlockVisible(b, blocksMap));
                      const currentIndex = visibleBlocks.findIndex((b) => b.id === block.id);
                      const prevBlock = currentIndex > 0 ? visibleBlocks[currentIndex - 1] : null;
                      const nextBlock = currentIndex < visibleBlocks.length - 1 ? visibleBlocks[currentIndex + 1] : null;

                      return (
                        <CodeBlock
                          block={block}
                          activePageId={activePage.id}
                          updateBlockData={updateBlockData}
                          updateBlockType={updateBlockType}
                          setSelectedBlockId={setSelectedBlockId}
                          isSelected={isSelected}
                          onNavigateUp={() => {
                            if (prevBlock) {
                              setSelectedBlockId(prevBlock.id);
                              const el = document.getElementById(`block-input-${prevBlock.id}`);
                              if (el) el.focus();
                            }
                          }}
                          onNavigateDown={() => {
                            if (nextBlock) {
                              setSelectedBlockId(nextBlock.id);
                              const el = document.getElementById(`block-input-${nextBlock.id}`);
                              if (el) el.focus();
                            }
                          }}
                        />
                      );
                    })()}

                    {block.type === "table" && (() => {
                      const blocksMap = new Map<string, Block>(activePage.blocks.map((b) => [b.id, b]));
                      const visibleBlocks = activePage.blocks.filter((b) => isBlockVisible(b, blocksMap));
                      const currentIndex = visibleBlocks.findIndex((b) => b.id === block.id);
                      const prevBlock = currentIndex > 0 ? visibleBlocks[currentIndex - 1] : null;
                      const nextBlock = currentIndex < visibleBlocks.length - 1 ? visibleBlocks[currentIndex + 1] : null;

                      return (
                        <TableBlock
                          block={block}
                          activePageId={activePage.id}
                          updateBlockData={updateBlockData}
                          updateBlockType={updateBlockType}
                          setSelectedBlockId={setSelectedBlockId}
                          isSelected={isSelected}
                          onNavigateUp={() => {
                            if (prevBlock) {
                              setSelectedBlockId(prevBlock.id);
                              const el = document.getElementById(`block-input-${prevBlock.id}`);
                              if (el) el.focus();
                            }
                          }}
                          onNavigateDown={() => {
                            if (nextBlock) {
                              setSelectedBlockId(nextBlock.id);
                              const el = document.getElementById(`block-input-${nextBlock.id}`);
                              if (el) el.focus();
                            }
                          }}
                        />
                      );
                    })()}

                    {block.type === "divider" && (
                      <div
                        id={`block-input-${block.id}`}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace") {
                            if (activePage.blocks.length > 1) {
                              e.preventDefault();
                              handleDeleteBlock(block.id);
                            }
                          }
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
                        }}
                        onFocus={() => setSelectedBlockId(block.id)}
                        className="py-4 w-full cursor-pointer group/divider flex items-center outline-none"
                      >
                        <div className="w-full border-t border-stone-200 group-focus/divider:border-stone-400 transition-colors" />
                      </div>
                    )}

                    {block.type === "image" && (
                      <ImageBlock
                        block={block}
                        isSelected={isSelected}
                        onUpdateData={(data) => updateBlockData(activePage.id, block.id, data)}
                        onSelectBlock={() => setSelectedBlockId(block.id)}
                        onDeleteBlock={() => handleDeleteBlock(block.id)}
                        onNavigateUp={() => {
                          const currentIndex = activePage.blocks.findIndex((b) => b.id === block.id);
                          if (currentIndex > 0) {
                            setSelectedBlockId(activePage.blocks[currentIndex - 1].id);
                          }
                        }}
                        onNavigateDown={() => {
                          const currentIndex = activePage.blocks.findIndex((b) => b.id === block.id);
                          if (currentIndex < activePage.blocks.length - 1) {
                            setSelectedBlockId(activePage.blocks[currentIndex + 1].id);
                          }
                        }}
                        onInsertParagraphAfter={() => {
                          const newBlockId = addBlock(activePage.id, "paragraph", "", block.id);
                          setSelectedBlockId(newBlockId);
                        }}
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

                    {toolbarMenuBlockId === block.id && (
                      <SlashMenu
                        searchText=""
                        onSelect={(commandId) => handleSelectToolbarCommand(block.id, commandId)}
                        onClose={() => setToolbarMenuBlockId(null)}
                      />
                    )}
                  </div>
                </SortableBlockWrapper>
              );
            })}
          </SortableContext>
        </DndContext>
            );
          })() : (
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
                id="bottom-insert-toggle-btn"
                onClick={() => {
                  const newBlockId = addBlock(activePage.id, "toggle", "", selectedBlockId, { collapsed: false });
                  setSelectedBlockId(newBlockId);
                }}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200/60 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer transition-all active:scale-95"
              >
                <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
                <span>+ Toggle</span>
              </button>
              <button
                id="bottom-insert-callout-btn"
                onClick={() => {
                  const newBlockId = addBlock(activePage.id, "callout", "", selectedBlockId, { icon: "💡" });
                  setSelectedBlockId(newBlockId);
                }}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200/60 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer transition-all active:scale-95"
              >
                <Lightbulb className="h-3.5 w-3.5 text-stone-400" />
                <span>+ Callout</span>
              </button>
              <button
                id="bottom-insert-image-btn"
                onClick={() => {
                  const newBlockId = addBlock(activePage.id, "image", "", selectedBlockId, { url: undefined, width: 100 });
                  setSelectedBlockId(newBlockId);
                }}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200/60 bg-stone-50 hover:bg-stone-100 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer transition-all active:scale-95"
              >
                <ImageIcon className="h-3.5 w-3.5 text-stone-400" />
                <span>+ Image</span>
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

      {contextMenuBlockId && contextMenuPosition && (
        <ContextMenu
          position={contextMenuPosition}
          onClose={() => {
            setContextMenuBlockId(null);
            setContextMenuPosition(null);
          }}
          onDuplicate={() => handleDuplicateBlock(contextMenuBlockId)}
          onDelete={() => handleDeleteBlock(contextMenuBlockId)}
          onTurnInto={(type, extraData) => handleTurnIntoBlock(contextMenuBlockId, type, extraData)}
        />
      )}
    </div>
  );
};
