import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { platform } from "../platform";
import {
  Smile,
  Image as ImageIcon,
  Calendar,
  Sparkles,
  FileText,
  Plus,
  ChevronDown,
  LayoutGrid,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { Page, Block, BlockType } from "../types";
import { SlashMenu } from "./SlashMenu";
import { BlockToolbar } from "./BlockToolbar";
import { ContextMenu } from "./ContextMenu";
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
import { BlockRenderer } from "./blocks/BlockRenderer";
import { TemplateGalleryModal } from "./TemplateGalleryModal";
import { PageHeader } from "./PageHeader";
import { PREDEFINED_TEMPLATES } from "../templates/templateRegistry";
import { useSettings } from "../hooks/useSettings";
import { LineWidthOption } from "../types/settings";
import { workspaceHistoryService, FocusTarget } from "../services/WorkspaceHistoryService";

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

const isBlockVisible = (
  block: Block,
  blocksMap: Map<string, Block>,
  pages?: Page[]
): boolean => {
  if (block.type === "child-page" && pages) {
    const childPage = pages.find((p) => p.id === block.data?.pageId);
    if (!childPage || childPage.isDeleted) {
      return false;
    }
  }
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
    recordPageRename,
    createPage,
    setActivePageId,
    selectedBlockId,
    setSelectedBlockId,
    focusToken,
    addBlock,
    updateBlock,
    updateBlockType,
    updateBlockData,
    deleteBlock,
    reorderBlocks,
    duplicateBlock,
    blockClipboard,
    setBlockClipboard,
    copyBlock,
    cutBlock,
    pasteBlock,
    applyTemplateToPage,
    highlightedBlockId,
    setHighlightedBlockId,
    pendingSearchTarget,
    setPendingSearchTarget,
  } = useApp();

  const { settings } = useSettings();

  const getLineWidthClass = (lineWidth: LineWidthOption) => {
    switch (lineWidth) {
      case "wide":
        return "max-w-5xl";
      case "full":
        return "max-w-full";
      case "readable":
      default:
        return "max-w-3xl";
    }
  };

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

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

  React.useEffect(() => {
    // Keep block clipboard intact across selection changes
    return () => {};
  }, []);

  const focusBlockInput = (blockId: string, caretPos: "start" | "end" = "end") => {
    const doFocus = () => {
      const el = document.getElementById(`block-input-${blockId}`);
      if (el) {
        el.focus();
        el.dispatchEvent(new CustomEvent("set-caret-position", { detail: { position: caretPos } }));

        if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
          const len = caretPos === "start" ? 0 : el.value.length;
          el.setSelectionRange(len, len);
        } else if (el.isContentEditable) {
          const range = document.createRange();

          const getTextNode = (node: Node, first: boolean): Node => {
            if (node.nodeType === Node.TEXT_NODE) return node;
            const children = Array.from(node.childNodes);
            if (children.length === 0) return node;
            return getTextNode(first ? children[0] : children[children.length - 1], first);
          };

          const targetNode = getTextNode(el, caretPos === "start");
          if (targetNode.nodeType === Node.TEXT_NODE) {
            const offset = caretPos === "start" ? 0 : (targetNode.textContent?.length || 0);
            range.setStart(targetNode, offset);
            range.setEnd(targetNode, offset);
          } else {
            range.selectNodeContents(targetNode);
            range.collapse(caretPos === "start");
          }

          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
    };

    doFocus();
    requestAnimationFrame(doFocus);
    setTimeout(doFocus, 50);
  };

  const focusFirstEditableBlock = React.useCallback(
    (page: Page) => {
      if (!page) return;
      if (!page.blocks || page.blocks.length === 0) {
        const newBlockId = addBlock(page.id, "paragraph");
        focusBlockInput(newBlockId, "start");
      } else {
        const firstEditableBlock =
          page.blocks.find((b) => b.type !== "divider" && b.type !== "image") ||
          page.blocks[0];

        if (firstEditableBlock) {
          focusBlockInput(firstEditableBlock.id, "start");
        }
      }
    },
    [addBlock]
  );

  const pendingFocusRestoreRef = React.useRef<FocusTarget | null>(null);

  const restoreFocusToTarget = React.useCallback(
    (target: FocusTarget) => {
      if (!activePage) return false;

      // 1. If page title is the explicit target
      if (target.focusTitle) {
        const titleEl = document.getElementById("editor-title-input") as HTMLInputElement | null;
        if (titleEl) {
          titleEl.focus();
          const len = target.caretPos === "start" ? 0 : titleEl.value.length;
          titleEl.setSelectionRange(len, len);
          return true;
        }
      }

      // 2. If target has a specific blockId and it exists in current blocks
      if (target.blockId) {
        const targetBlock = activePage.blocks.find((b) => b.id === target.blockId);
        if (targetBlock) {
          if (target.tableCell) {
            const { r, c } = target.tableCell;
            const cellEl = (document.getElementById(`table-cell-${targetBlock.id}-${r}-${c}`) ||
              (r === 0 && c === 0 ? document.getElementById(`block-input-${targetBlock.id}`) : null)) as HTMLTextAreaElement | null;
            if (cellEl) {
              cellEl.focus();
              const len = target.caretPos === "start" ? 0 : cellEl.value.length;
              cellEl.setSelectionRange(len, len);
              return true;
            }
            return false;
          }
          focusBlockInput(targetBlock.id, target.caretPos || "end");
          return true;
        }
      }

      // 3. Target block does not exist or wasn't specified -> find nearest surviving editable block
      if (activePage.blocks && activePage.blocks.length > 0) {
        const editableBlocks = activePage.blocks.filter(
          (b) => b.type !== "divider" && b.type !== "image"
        );
        const targetBlock =
          editableBlocks.length > 0
            ? target.caretPos === "start"
              ? editableBlocks[0]
              : editableBlocks[editableBlocks.length - 1]
            : activePage.blocks[0];

        if (targetBlock) {
          focusBlockInput(targetBlock.id, target.caretPos || "end");
          return true;
        }
      } else {
        // Empty page: focus title input if available, do NOT auto-create phantom blocks during undo/redo
        const titleEl = document.getElementById("editor-title-input") as HTMLInputElement | null;
        if (titleEl) {
          titleEl.focus();
          return true;
        }
      }

      return false;
    },
    [activePage, focusFirstEditableBlock]
  );

  // Subscribe to WorkspaceHistoryService focus restoration
  React.useEffect(() => {
    return workspaceHistoryService.onFocusRestore((target) => {
      pendingFocusRestoreRef.current = target;
      if (!target.pageId || target.pageId === activePage?.id) {
        const ok = restoreFocusToTarget(target);
        if (!ok) {
          requestAnimationFrame(() => {
            restoreFocusToTarget(target);
          });
        }
      }
    });
  }, [restoreFocusToTarget, activePage?.id]);

  // When activePage or its blocks change, if a focus restore is pending, execute it after layout commit
  React.useLayoutEffect(() => {
    if (pendingFocusRestoreRef.current) {
      const target = pendingFocusRestoreRef.current;
      if (target.pageId && activePage?.id && target.pageId !== activePage.id) {
        return;
      }
      pendingFocusRestoreRef.current = null;
      const ok = restoreFocusToTarget(target);
      if (!ok) {
        requestAnimationFrame(() => {
          restoreFocusToTarget(target);
        });
      }
    }
  }, [activePage, restoreFocusToTarget]);

  const isInitialMountRef = React.useRef(true);
  const lastFocusedPageIdRef = React.useRef<string | null>(null);
  const lastFocusTokenRef = React.useRef<number>(-1);

  React.useEffect(() => {
    if (!activePage) {
      lastFocusedPageIdRef.current = null;
      return;
    }

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      lastFocusedPageIdRef.current = activePage.id;
      lastFocusTokenRef.current = focusToken;
      return;
    }

    const isPageChanged = lastFocusedPageIdRef.current !== activePage.id;
    const isTokenTriggered = lastFocusTokenRef.current !== focusToken;

    if (isTokenTriggered) {
      lastFocusedPageIdRef.current = activePage.id;
      lastFocusTokenRef.current = focusToken;

      // Do NOT focus top block if a search navigation target is pending for this page
      if (pendingSearchTarget && pendingSearchTarget.pageId === activePage.id) {
        return;
      }

      focusFirstEditableBlock(activePage);
    } else if (isPageChanged) {
      lastFocusedPageIdRef.current = activePage.id;
      lastFocusTokenRef.current = focusToken;
    }
  }, [activePage, focusToken, focusFirstEditableBlock, pendingSearchTarget]);

  // Synchronized Search Navigation Handler
  React.useLayoutEffect(() => {
    if (!pendingSearchTarget) return;
    if (!activePage || activePage.id !== pendingSearchTarget.pageId) return;

    const { blockId, rawMatchStart, rawMatchEnd } = pendingSearchTarget;

    const executeNavigation = () => {
      if (blockId) {
        const wrapperEl = document.getElementById(`editor-block-wrapper-${blockId}`);
        const inputEl = document.getElementById(`block-input-${blockId}`) as HTMLInputElement | HTMLTextAreaElement | null;

        if (!wrapperEl && !inputEl) {
          return false;
        }

        // 1. Smoothly scroll block into center of viewport
        if (wrapperEl) {
          wrapperEl.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (inputEl) {
          inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // 2. Restore editing focus to block
        if (inputEl) {
          inputEl.focus();

          // 3. Position caret / selection range at match indices
          if (
            typeof rawMatchStart === "number" &&
            typeof rawMatchEnd === "number"
          ) {
            if (
              inputEl instanceof HTMLInputElement ||
              inputEl instanceof HTMLTextAreaElement
            ) {
              try {
                const maxLen = inputEl.value.length;
                const start = Math.min(Math.max(0, rawMatchStart), maxLen);
                const end = Math.min(Math.max(start, rawMatchEnd), maxLen);
                inputEl.setSelectionRange(start, end);
              } catch (e) {
                // Fallback
              }
            } else if ((inputEl as HTMLElement).isContentEditable) {
              try {
                const el = inputEl as HTMLElement;
                const range = document.createRange();
                const sel = window.getSelection();

                let charCount = 0;
                let startNode: Node | null = null;
                let startOffset = 0;
                let endNode: Node | null = null;
                let endOffset = 0;

                const traverse = (node: Node) => {
                  if (node.nodeType === Node.TEXT_NODE) {
                    const len = node.textContent?.length || 0;
                    if (!startNode && charCount + len >= rawMatchStart) {
                      startNode = node;
                      startOffset = rawMatchStart - charCount;
                    }
                    if (!endNode && charCount + len >= rawMatchEnd) {
                      endNode = node;
                      endOffset = rawMatchEnd - charCount;
                    }
                    charCount += len;
                  } else {
                    for (let i = 0; i < node.childNodes.length; i++) {
                      traverse(node.childNodes[i]);
                    }
                  }
                };

                traverse(el);

                if (startNode && endNode) {
                  range.setStart(startNode, startOffset);
                  range.setEnd(endNode, endOffset);
                  if (sel) {
                    sel.removeAllRanges();
                    sel.addRange(range);
                  }
                }
              } catch (e) {
                // Fallback
              }
            }
          }
        }

        const timer = setTimeout(() => {
          setHighlightedBlockId((curr) => (curr === blockId ? null : curr));
        }, 2200);

        setPendingSearchTarget(null);
        return true;
      } else {
        // Search result target is Page Title
        const titleEl = document.getElementById("editor-title-input") as HTMLInputElement | null;
        if (titleEl) {
          titleEl.scrollIntoView({ behavior: "smooth", block: "center" });
          titleEl.focus();

          if (
            typeof rawMatchStart === "number" &&
            typeof rawMatchEnd === "number"
          ) {
            try {
              const maxLen = titleEl.value.length;
              const start = Math.min(Math.max(0, rawMatchStart), maxLen);
              const end = Math.min(Math.max(start, rawMatchEnd), maxLen);
              titleEl.setSelectionRange(start, end);
            } catch (e) {
              // Fallback
            }
          }

          setPendingSearchTarget(null);
          return true;
        }
        return false;
      }
    };

    const success = executeNavigation();

    if (!success) {
      const frameId = requestAnimationFrame(() => {
        executeNavigation();
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [pendingSearchTarget, activePage, setPendingSearchTarget, setHighlightedBlockId]);

  const handleUpdateBlockType = (
    pageId: string,
    blockId: string,
    type: BlockType,
    extraData?: Partial<Block["data"]>
  ) => {
    updateBlockType(pageId, blockId, type, extraData);
    focusBlockInput(blockId, "start");
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
      focusBlockInput(targetFocusId);
    }
  };

  const handleDuplicateBlock = (blockId: string) => {
    if (!activePage) return;
    const newBlockId = duplicateBlock(activePage.id, blockId);
    if (newBlockId) {
      setSelectedBlockId(null);
      focusBlockInput(newBlockId, "start");
    }
  };

  React.useEffect(() => {
    const hasTextSelection = (activeEl: Element | null): boolean => {
      if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) {
        return activeEl.selectionStart !== null && activeEl.selectionEnd !== null && activeEl.selectionStart !== activeEl.selectionEnd;
      }
      const sel = window.getSelection();
      return !!(sel && !sel.isCollapsed && sel.toString().length > 0);
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditing =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable ||
          !!activeEl.closest("[contenteditable='true']"));

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      // Top priority: Global block clipboard paste (Ctrl+V) when blockClipboard exists in Block Selected Mode
      if (isCmdOrCtrl && e.key.toLowerCase() === "v" && blockClipboard && !isEditing && selectedBlockId && activePage) {
        const targetBlockId = selectedBlockId;

        if (targetBlockId) {
          e.preventDefault();
          e.stopPropagation();
          const newBlockId = pasteBlock(activePage.id, targetBlockId);
          if (newBlockId) {
            setSelectedBlockId(null);
            if (activeEl && "blur" in activeEl) {
              (activeEl as HTMLElement).blur();
            }
            focusBlockInput(newBlockId, "start");
          }
          return;
        }
      }

      // 1. Editing Mode: Escape switches block to Block Selected Mode
      if (isEditing && e.key === "Escape") {
        e.preventDefault();
        const blockWrapper = activeEl.closest("[id^='editor-block-wrapper-']");
        if (blockWrapper) {
          const blockId = blockWrapper.id.replace("editor-block-wrapper-", "");
          (activeEl as HTMLElement).blur();
          setSelectedBlockId(blockId);
        } else {
          (activeEl as HTMLElement).blur();
          setSelectedBlockId(null);
        }
        return;
      }

      // Ctrl+C in Editing Mode when NO text selection exists -> copy current block
      if (isEditing && isCmdOrCtrl && e.key.toLowerCase() === "c" && !hasTextSelection(activeEl) && activePage) {
        const wrapper = activeEl.closest("[id^='editor-block-wrapper-']");
        if (wrapper) {
          const blockId = wrapper.id.replace("editor-block-wrapper-", "");
          const currentBlock = activePage.blocks.find((b) => b.id === blockId);
          if (currentBlock) {
            e.preventDefault();
            copyBlock(activePage.id, blockId);
            const plainText = currentBlock.data?.text ? getPlainTextFromHtml(currentBlock.data.text) : "";
            platform.clipboard.writeText(plainText).catch(() => {});
            return;
          }
        }
      }

      // 2. Block Selected Mode
      if (!isEditing && selectedBlockId && activePage) {
        const blocksMap = new Map<string, Block>(activePage.blocks.map((b) => [b.id, b]));
        const visibleBlocks = activePage.blocks.filter((b) => isBlockVisible(b, blocksMap, pages));
        const currentIndex = visibleBlocks.findIndex((b) => b.id === selectedBlockId);

        if (e.key === "Escape") {
          e.preventDefault();
          setSelectedBlockId(null);
          return;
        }

        if (e.key === "Enter") {
          e.preventDefault();
          const targetBlockId = selectedBlockId;
          setSelectedBlockId(null);
          const el = document.getElementById(`block-input-${targetBlockId}`);
          if (el) {
            el.focus();
            if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
              const len = el.value.length;
              el.setSelectionRange(len, len);
            }
          }
          return;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (currentIndex > 0) {
            const prevBlock = visibleBlocks[currentIndex - 1];
            setSelectedBlockId(prevBlock.id);
          }
          return;
        }

        if (e.key === "ArrowDown") {
          e.preventDefault();
          if (currentIndex < visibleBlocks.length - 1) {
            const nextBlock = visibleBlocks[currentIndex + 1];
            setSelectedBlockId(nextBlock.id);
          }
          return;
        }

        if (e.key === "Backspace" || e.key === "Delete") {
          if (activePage.blocks.length > 1) {
            e.preventDefault();
            handleDeleteBlock(selectedBlockId);
          }
          return;
        }

        // Ctrl / Cmd shortcuts for Block Selected Mode: C, X, V, D
        if (isCmdOrCtrl) {
          const key = e.key.toLowerCase();
          const currentBlock = activePage.blocks.find((b) => b.id === selectedBlockId);

          if (key === "c" && currentBlock) {
            e.preventDefault();
            copyBlock(activePage.id, selectedBlockId);
            const plainText = currentBlock.data?.text ? getPlainTextFromHtml(currentBlock.data.text) : "";
            platform.clipboard.writeText(plainText).catch(() => {});
          } else if (key === "x" && currentBlock) {
            e.preventDefault();
            const adjacentBlockId = cutBlock(activePage.id, selectedBlockId);
            if (adjacentBlockId) {
              setSelectedBlockId(adjacentBlockId);
            }
          } else if (key === "v" && blockClipboard) {
            e.preventDefault();
            const newBlockId = pasteBlock(activePage.id, selectedBlockId);
            if (newBlockId) {
              setSelectedBlockId(null);
              focusBlockInput(newBlockId, "start");
            }
          } else if (key === "d" && currentBlock) {
            e.preventDefault();
            handleDuplicateBlock(selectedBlockId);
          }
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    activePage,
    selectedBlockId,
    blockClipboard,
    copyBlock,
    cutBlock,
    pasteBlock,
    setSelectedBlockId,
    handleDeleteBlock,
    isBlockVisible,
    pages,
    focusBlockInput,
    handleDuplicateBlock,
  ]);

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
    focusBlockInput(draggedBlockId, "end");
  };

  if (!activePage) {
    return (
      <div id="editor-empty-state" className="flex-1 flex flex-col items-center justify-center bg-stone-50/50 dark:bg-[#191919] p-8 text-center select-none">
        <div className="max-w-md space-y-6">
          <div className="w-16 h-16 mx-auto bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center border border-stone-200/60 dark:border-stone-700 text-stone-400">
            <Sparkles className="h-8 w-8 text-stone-400 dark:text-stone-500 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-display text-stone-800 dark:text-stone-100">
              No page selected
            </h2>
            <p className="text-sm text-stone-500 dark:text-stone-400 font-sans leading-relaxed">
              Select an existing page from your personal workspace sidebar, or create a brand new one to start capturing your ideas.
            </p>
          </div>
          <button
            id="empty-create-page-btn"
            onClick={() => createPage(null)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-100 dark:text-stone-900 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 rounded-lg shadow-sm transition-all cursor-pointer"
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
        setSlashMenuOpen(false);
        setSlashMenuBlockId(null);
        setSlashMenuSearch("");
      }
    }
  };

  const handleSelectCommand = (commandId: string) => {
    if (!slashMenuBlockId) return;

    if (commandId === "paragraph") {
      handleUpdateBlockType(activePage.id, slashMenuBlockId, "paragraph", { text: "" });
    } else if (commandId === "heading-1") {
      handleUpdateBlockType(activePage.id, slashMenuBlockId, "heading", { text: "", level: 1 });
    } else if (commandId === "heading-2") {
      handleUpdateBlockType(activePage.id, slashMenuBlockId, "heading", { text: "", level: 2 });
    } else if (commandId === "heading-3") {
      handleUpdateBlockType(activePage.id, slashMenuBlockId, "heading", { text: "", level: 3 });
    } else if (commandId === "bulleted-list") {
      handleUpdateBlockType(activePage.id, slashMenuBlockId, "bulleted-list", { text: "" });
    } else if (commandId === "numbered-list") {
      handleUpdateBlockType(activePage.id, slashMenuBlockId, "numbered-list", { text: "" });
    } else if (commandId === "todo") {
      handleUpdateBlockType(activePage.id, slashMenuBlockId, "todo", { text: "", checked: false });
    } else if (commandId === "quote") {
      handleUpdateBlockType(activePage.id, slashMenuBlockId, "quote", { text: "" });
    } else if (commandId === "code") {
      handleUpdateBlockType(activePage.id, slashMenuBlockId, "code", { text: "", language: "javascript" });
    } else if (commandId === "table") {
      handleUpdateBlockType(activePage.id, slashMenuBlockId, "table", {
        rows: [
          ["", "", ""],
          ["", "", ""],
          ["", "", ""],
        ],
      });
    } else if (commandId === "divider") {
      handleUpdateBlockType(activePage.id, slashMenuBlockId, "divider", { text: "" });
    } else if (commandId === "image") {
      handleUpdateBlockType(activePage.id, slashMenuBlockId, "image", { url: undefined, width: 100 });
    } else if (commandId === "toggle") {
      handleUpdateBlockType(activePage.id, slashMenuBlockId, "toggle", { text: "", collapsed: false });
    } else if (commandId === "callout") {
      handleUpdateBlockType(activePage.id, slashMenuBlockId, "callout", { text: "", icon: "💡" });
    } else if (commandId === "child-page") {
      createPage(activePage.id, slashMenuBlockId);
      deleteBlock(activePage.id, slashMenuBlockId);
    } else if (commandId === "template") {
      setTemplateModalOpen(true);
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
    setToolbarMenuBlockId(null);
    focusBlockInput(newBlockId);
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
    setContextMenuBlockId(null);
    setContextMenuPosition(null);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleBlockContextMenu = (e: React.MouseEvent, blockId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBlockId(blockId);
    setContextMenuBlockId(blockId);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleTurnIntoBlock = (blockId: string, type: BlockType, extraData?: any) => {
    if (!activePage) return;
    if (type === "divider") {
      handleUpdateBlockType(activePage.id, blockId, type, { text: "" });
    } else if (type === "callout") {
      handleUpdateBlockType(activePage.id, blockId, type, { icon: "💡", ...extraData });
    } else {
      handleUpdateBlockType(activePage.id, blockId, type, extraData);
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
      const visibleBlocks = activePage.blocks.filter((b) => isBlockVisible(b, blocksMap, pages));
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
          handleUpdateBlockType(activePage.id, block.id, "paragraph", { text: "" });
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
          focusBlockInput(newBlockId);
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
          { parentId: block.id, insertDirectlyAfter: true } as any
        );
        focusBlockInput(newBlockId, "start");
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
      focusBlockInput(newBlockId, "start");
    }

    if (e.key === "Backspace") {
      const text = getPlainTextFromHtml(block.data.text || "");
      if (block.type !== "paragraph") {
        e.preventDefault();
        handleUpdateBlockType(activePage.id, block.id, "paragraph", { text: block.data.text || "" });
        return;
      }

      if (text === "") {
        if (block.data.parentId) {
          e.preventDefault();
          // Outdent child block on Backspace if empty
          const parentBlock = activePage.blocks.find((b) => b.id === block.data.parentId);
          updateBlockData(activePage.id, block.id, { parentId: parentBlock?.data?.parentId || null });
          focusBlockInput(block.id, "start");
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
        const visibleBlocks = activePage.blocks.filter((b) => isBlockVisible(b, blocksMap, pages));
        const currentIndex = visibleBlocks.findIndex((b) => b.id === block.id);
        if (currentIndex > 0) {
          e.preventDefault();
          const prevBlock = visibleBlocks[currentIndex - 1];
          focusBlockInput(prevBlock.id, "end");
        }
      }
    }

    if (e.key === "ArrowDown") {
      const target = e.currentTarget;
      const textLength = target.value.length;
      const isAtEnd = target.selectionStart === textLength && target.selectionEnd === textLength;
      if (isAtEnd) {
        const blocksMap = new Map<string, Block>(activePage.blocks.map((b) => [b.id, b]));
        const visibleBlocks = activePage.blocks.filter((b) => isBlockVisible(b, blocksMap, pages));
        const currentIndex = visibleBlocks.findIndex((b) => b.id === block.id);
        if (currentIndex < visibleBlocks.length - 1) {
          e.preventDefault();
          const nextBlock = visibleBlocks[currentIndex + 1];
          focusBlockInput(nextBlock.id, "start");
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

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const childPage = pages.find((p) => p.id === block.data.pageId && !p.isDeleted);
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

  const handleWorkspacePaste = async (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith("image/")) {
        e.preventDefault();
        try {
          const dataUrl = await platform.fileSystem.readFileAsDataUrl(file);
          if (dataUrl && activePage) {
            const newBlockId = addBlock(activePage.id, "image", "", selectedBlockId, { url: dataUrl, width: 100 });
            setSelectedBlockId(newBlockId);
          }
        } catch (err) {
          console.error("Failed to read pasted image file:", err);
        }
        return;
      }
    }

    const activeEl = document.activeElement;
    const hasTextSel = () => {
      if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) {
        return activeEl.selectionStart !== null && activeEl.selectionEnd !== null && activeEl.selectionStart !== activeEl.selectionEnd;
      }
      const sel = window.getSelection();
      return !!(sel && !sel.isCollapsed && sel.toString().length > 0);
    };

    if (blockClipboard && !hasTextSel() && activePage && activePage.blocks.length > 0) {
      e.preventDefault();
      let targetBlockId = selectedBlockId;
      if (!targetBlockId && activeEl) {
        const wrapper = activeEl.closest("[id^='editor-block-wrapper-']");
        if (wrapper) {
          targetBlockId = wrapper.id.replace("editor-block-wrapper-", "");
        }
      }
      if (!targetBlockId) {
        targetBlockId = activePage.blocks[activePage.blocks.length - 1].id;
      }
      if (targetBlockId) {
        const newBlockId = pasteBlock(activePage.id, targetBlockId);
        if (newBlockId) {
          setSelectedBlockId(null);
          if (activeEl && "blur" in activeEl) {
            (activeEl as HTMLElement).blur();
          }
          focusBlockInput(newBlockId, "start");
        }
      }
    }
  };

  const handleWorkspaceDrop = async (e: React.DragEvent) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const dataUrl = await platform.fileSystem.readFileAsDataUrl(file);
          if (dataUrl && activePage) {
            const newBlockId = addBlock(activePage.id, "image", "", selectedBlockId, { url: dataUrl, width: 100 });
            setSelectedBlockId(newBlockId);
          }
        } catch (err) {
          console.error("Failed to read dropped image file:", err);
        }
      }
    }
  };

  const handleWorkspaceDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
    }
  };

  const handleWorkspaceClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive =
      target.closest("[id^='editor-block-wrapper-']") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("[contenteditable='true']");

    if (!isInteractive) {
      if (activePage) {
        setSelectedBlockId(null);
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  const handleWorkspaceMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive =
      target.closest("[id^='editor-block-wrapper-']") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("[contenteditable='true']");

    if (!isInteractive) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (activePage) {
        focusFirstEditableBlock(activePage);
      }
    }
  };

  const isEmptyPage =
    !activePage.blocks ||
    activePage.blocks.length === 0 ||
    (activePage.blocks.length === 1 &&
      activePage.blocks[0].type === "paragraph" &&
      getPlainTextFromHtml(activePage.blocks[0].data?.text || "").trim() === "");

  return (
    <div
      id="editor-workspace"
      onClick={handleWorkspaceClick}
      onMouseDown={handleWorkspaceMouseDown}
      onPaste={handleWorkspacePaste}
      onDrop={handleWorkspaceDrop}
      onDragOver={handleWorkspaceDragOver}
      className="flex-1 flex flex-col bg-white dark:bg-[#191919] text-stone-900 dark:text-[#d3d3d3] overflow-y-auto relative"
    >
      <PageHeader
        page={activePage}
        onUpdateTitle={(title) => updatePage(activePage.id, { title })}
        onUpdateIcon={(icon) => updatePage(activePage.id, { icon })}
        onUpdateCover={(coverUrl) => updatePage(activePage.id, { coverImage: coverUrl })}
        onTitleKeyDown={handleTitleKeyDown}
      />

      {/* Editor Content Container */}
      <div
        className={`flex-1 ${getLineWidthClass(settings.editor.lineWidth)} w-full mx-auto px-6 sm:px-12 md:px-16 pt-2 pb-16 space-y-6 flex flex-col`}
        style={{ fontSize: `${settings.editor.fontSize}px` }}
      >

        {/* Notion-style Page Template Quick Launcher on Blank Pages */}
        {isEmptyPage && (
          <div className="my-2 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-[#202020] space-y-2.5 font-sans animate-fade-in shrink-0">
            <div
              onClick={() => focusFirstEditableBlock(activePage)}
              className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-xs font-medium cursor-pointer hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Press enter to continue writing, or start from a pre-configured template:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {PREDEFINED_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => applyTemplateToPage(activePage.id, tmpl.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#252525] border border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500 hover:shadow-sm text-xs font-medium text-stone-700 dark:text-stone-200 hover:text-stone-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  <span className="text-sm">{tmpl.icon}</span>
                  <span>{tmpl.name}</span>
                </button>
              ))}
              <button
                onClick={() => setTemplateModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-900 text-stone-100 hover:bg-stone-800 text-xs font-semibold shadow-sm transition-all cursor-pointer"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Browse all templates...</span>
              </button>
            </div>
          </div>
        )}

        {/* Blocks Sequential Container */}
        <div className="flex-1 flex flex-col">
          {activePage.blocks && activePage.blocks.length > 0 ? (() => {
            const blocksMap = new Map<string, Block>(activePage.blocks.map((b) => [b.id, b]));
            const visibleBlocks = activePage.blocks.filter((b) => isBlockVisible(b, blocksMap, pages));

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
                    } else if (block.type === "child-page") {
                      marginTopClass = "mt-1";
                    }

                    let paddingYClass = "py-2";
                    if (isListType) {
                      paddingYClass = "py-0.5";
                    } else if (block.type === "child-page") {
                      paddingYClass = "py-0.5";
                    }

                    return (
                      <SortableBlockWrapper
                        key={block.id}
                        block={block}
                        isSelected={isSelected}
                        isHighlighted={highlightedBlockId === block.id}
                        paddingYClass={paddingYClass}
                        marginTopClass={marginTopClass}
                        onPlusClick={(e) => handlePlusClick(e, block.id)}
                        onDragClick={(e) => handleDragClick(e, block.id)}
                        onContextMenu={(e) => handleBlockContextMenu(e, block.id)}
                      >
                        {/* Block Content Renderers */}
                        <div
                          className={`flex-1 min-w-0 relative ${
                            depth > 0 ? "pl-3 border-l-2 border-stone-200/70 ml-2" : ""
                          }`}
                        >
                        <BlockRenderer
                          block={block}
                          activePage={activePage}
                          pages={pages}
                          isSelected={isSelected}
                          handleBlockChange={handleBlockChange}
                          handleKeyDown={handleKeyDown}
                          setSelectedBlockId={setSelectedBlockId}
                          updateBlockData={updateBlockData}
                          updateBlockType={handleUpdateBlockType}
                          deleteBlock={deleteBlock}
                          handleDeleteBlock={handleDeleteBlock}
                          addBlock={addBlock}
                          setActivePageId={setActivePageId}
                          handleChildPageKeyDown={handleChildPageKeyDown}
                          isBlockVisible={(b, bMap) => isBlockVisible(b, bMap, pages)}
                          slashMenuOpen={slashMenuOpen}
                          slashMenuBlockId={slashMenuBlockId}
                          slashMenuSearch={slashMenuSearch}
                          handleSelectCommand={handleSelectCommand}
                          setSlashMenuOpen={setSlashMenuOpen}
                          setSlashMenuBlockId={setSlashMenuBlockId}
                          setSlashMenuSearch={setSlashMenuSearch}
                          calloutEmojiPickerBlockId={calloutEmojiPickerBlockId}
                          setCalloutEmojiPickerBlockId={setCalloutEmojiPickerBlockId}
                        />

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
          <div className="flex flex-col gap-2 pt-4 border-t border-stone-150/60 dark:border-stone-800 select-none">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider font-sans">
                Insert New Block {selectedBlockId ? "(Inserts after highlighted block)" : ""}
              </span>
              {selectedBlockId && (
                <button
                  onClick={() => setSelectedBlockId(null)}
                  className="text-[10px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 underline font-semibold font-sans cursor-pointer"
                >
                  Clear Selection (Append to end)
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="bottom-insert-paragraph-btn"
                onClick={() => {
                  const newBlockId = addBlock(activePage.id, "paragraph", "", selectedBlockId);
                  focusBlockInput(newBlockId);
                }}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200/60 dark:border-stone-800 bg-stone-50 dark:bg-[#202020] hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer transition-all active:scale-95"
              >
                <FileText className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
                <span>+ Paragraph</span>
              </button>
              <button
                id="bottom-insert-heading-btn"
                onClick={() => {
                  const newBlockId = addBlock(activePage.id, "heading", "", selectedBlockId);
                  focusBlockInput(newBlockId);
                }}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200/60 dark:border-stone-800 bg-stone-50 dark:bg-[#202020] hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer transition-all active:scale-95"
              >
                <span className="text-xs font-bold text-stone-400 dark:text-stone-500 font-display">H</span>
                <span>+ Heading</span>
              </button>
              <button
                id="bottom-insert-toggle-btn"
                onClick={() => {
                  const newBlockId = addBlock(activePage.id, "toggle", "", selectedBlockId, { collapsed: false });
                  focusBlockInput(newBlockId);
                }}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200/60 dark:border-stone-800 bg-stone-50 dark:bg-[#202020] hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer transition-all active:scale-95"
              >
                <ChevronRight className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
                <span>+ Toggle</span>
              </button>
              <button
                id="bottom-insert-callout-btn"
                onClick={() => {
                  const newBlockId = addBlock(activePage.id, "callout", "", selectedBlockId, { icon: "💡" });
                  focusBlockInput(newBlockId);
                }}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200/60 dark:border-stone-800 bg-stone-50 dark:bg-[#202020] hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer transition-all active:scale-95"
              >
                <Lightbulb className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
                <span>+ Callout</span>
              </button>
              <button
                id="bottom-insert-image-btn"
                onClick={() => {
                  const newBlockId = addBlock(activePage.id, "image", "", selectedBlockId, { url: undefined, width: 100 });
                  focusBlockInput(newBlockId);
                }}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200/60 dark:border-stone-800 bg-stone-50 dark:bg-[#202020] hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer transition-all active:scale-95"
              >
                <ImageIcon className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
                <span>+ Image</span>
              </button>
              <button
                id="bottom-insert-subpage-btn"
                onClick={() => createPage(activePage.id, selectedBlockId)}
                className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-200/60 dark:border-stone-800 bg-stone-50 dark:bg-[#202020] hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
                <span>+ Inline Subpage</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick visual metadata panel at the bottom */}
        <div className="pt-8 border-t border-stone-100 dark:border-stone-800/80 flex flex-wrap items-center justify-between gap-4 select-none shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 font-sans font-medium">
            <Calendar className="h-3.5 w-3.5" />
            <span>Created {new Date(activePage.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="text-[11px] text-stone-400 dark:text-stone-500 font-mono">
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

      <TemplateGalleryModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        targetPageId={activePage.id}
      />
    </div>
  );
};
