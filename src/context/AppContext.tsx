import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { Page, Block, BlockType, ClipboardBlockData } from "../types";
import { getTemplateById, instantiateTemplate } from "../templates/templateRegistry";
import { searchService } from "../services/SearchService";
import { favoritesService } from "../services/FavoritesService";
import { trashService } from "../services/TrashService";
import { recentPagesService } from "../services/RecentPagesService";
import { persistenceService, CURRENT_SCHEMA_VERSION, WorkspaceSnapshot } from "../services/PersistenceService";
import { exportService, WorkspaceImporter } from "../services/export";
import { pageImportService } from "../services/import";
import { platform } from "../platform";
import { resolveNextActivePage } from "../utils/navigation";

export interface SearchNavigationTarget {
  pageId: string;
  blockId: string | null;
  rawMatchStart?: number;
  rawMatchEnd?: number;
}

interface AppContextType {
  pages: Page[];
  activePageId: string | null;
  activePage: Page | null;
  sidebarOpen: boolean;
  selectedBlockId: string | null;
  focusToken: number;
  triggerPageFocus: () => void;
  setSelectedBlockId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setActivePageId: (id: string | null) => void;
  createPage: (parentId?: string | null, insertAfterBlockId?: string | null) => string;
  createPageFromTemplate: (templateId: string, parentId?: string | null) => string;
  applyTemplateToPage: (pageId: string, templateId: string) => void;
  deletePage: (id: string) => void;
  updatePage: (id: string, updates: Partial<Page>) => void;
  addBlock: (
    pageId: string,
    type: BlockType,
    text?: string,
    insertAfterBlockId?: string | null,
    extraData?: Partial<Block["data"]>
  ) => string;
  updateBlock: (pageId: string, blockId: string, text: string) => void;
  updateBlockType: (
    pageId: string,
    blockId: string,
    type: BlockType,
    extraData?: Partial<Block["data"]>
  ) => void;
  updateBlockData: (
    pageId: string,
    blockId: string,
    data: Partial<Block["data"]>
  ) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  reorderBlocks: (pageId: string, activeId: string, overId: string) => void;
  duplicateBlock: (pageId: string, blockId: string) => string | null;
  blockClipboard: ClipboardBlockData | null;
  setBlockClipboard: (data: ClipboardBlockData | null) => void;
  copyBlock: (pageId: string, blockId: string) => void;
  cutBlock: (pageId: string, blockId: string) => string | null;
  pasteBlock: (pageId: string, targetBlockId: string) => string | null;
  favoritePages: Page[];
  recentPages: Page[];
  toggleFavorite: (pageId: string) => void;
  reorderFavorites: (draggedId: string, targetId: string) => void;
  trashPages: Page[];
  restorePage: (pageId: string) => void;
  permanentlyDeletePage: (pageId: string) => void;
  emptyTrash: () => void;
  isSearchOpen: boolean;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
  highlightedBlockId: string | null;
  setHighlightedBlockId: React.Dispatch<React.SetStateAction<string | null>>;
  pendingSearchTarget: SearchNavigationTarget | null;
  setPendingSearchTarget: React.Dispatch<React.SetStateAction<SearchNavigationTarget | null>>;
  navigateToResult: (
    pageId: string,
    blockId: string | null,
    rawMatchStart?: number,
    rawMatchEnd?: number
  ) => void;
  exportWorkspace: () => void;
  importWorkspace: (providedContent?: string | Uint8Array | ArrayBuffer) => Promise<boolean>;
  importPage: (providedFile?: { filename: string; content: string | Uint8Array }) => Promise<string | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = "notion_clone_pages";
const ACTIVE_PAGE_KEY = "notion_clone_active_page_id";

const DEFAULT_PAGES: Page[] = [
  {
    id: "page-initial",
    title: "Untitled",
    icon: "📄",
    coverImage: null,
    parentId: null,
    children: [],
    blocks: [
      {
        id: "block-initial",
        type: "heading",
        data: { text: "Untitled", level: 1 }
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialSnapshot] = useState<WorkspaceSnapshot | null>(() => {
    return persistenceService.loadWorkspace();
  });

  const [pages, setPages] = useState<Page[]>(() => {
    if (initialSnapshot?.pages && initialSnapshot.pages.length > 0) {
      return initialSnapshot.pages;
    }
    return DEFAULT_PAGES;
  });

  const [activePageId, setActivePageIdState] = useState<string | null>(() => {
    if (initialSnapshot?.activePageId !== undefined && initialSnapshot?.activePageId !== null) {
      const exists = initialSnapshot.pages.some((p) => p.id === initialSnapshot.activePageId && !p.isDeleted);
      if (exists) return initialSnapshot.activePageId;
    }
    const defaultPage = initialSnapshot?.pages?.find((p) => !p.parentId && !p.isDeleted) || DEFAULT_PAGES[0];
    return defaultPage?.id || null;
  });

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof initialSnapshot?.sidebarOpen === "boolean") {
      return initialSnapshot.sidebarOpen;
    }
    return true;
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [focusToken, setFocusToken] = useState<number>(0);

  const triggerPageFocus = () => setFocusToken((prev) => prev + 1);

  // Debounced autosave (400 ms) to avoid writing storage on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      persistenceService.saveWorkspace({
        version: CURRENT_SCHEMA_VERSION,
        timestamp: Date.now(),
        pages,
        activePageId,
        sidebarOpen,
      });
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [pages, activePageId, sidebarOpen]);

  // Ensure initial active page gets lastOpenedAt set on mount if missing
  useEffect(() => {
    if (activePageId) {
      setPages((prev) => {
        const target = prev.find((p) => p.id === activePageId);
        if (target && !target.lastOpenedAt) {
          const now = Date.now();
          return prev.map((p) => (p.id === activePageId ? { ...p, lastOpenedAt: now } : p));
        }
        return prev;
      });
    }
  }, []);

  const setActivePageId = (id: string | null) => {
    if (id) {
      const targetPage = pages.find((p) => p.id === id);
      if (targetPage && targetPage.isDeleted) {
        return;
      }
      const now = Date.now();
      setPages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, lastOpenedAt: now } : p))
      );
    }
    setActivePageIdState(id);
    setSelectedBlockId(null);
    triggerPageFocus();
    if (id) {
      platform.persistence.setItem(ACTIVE_PAGE_KEY, id);
    } else {
      platform.persistence.removeItem(ACTIVE_PAGE_KEY);
    }
  };

  const createPage = (parentId: string | null = null, insertAfterBlockId?: string | null) => {
    const newId = `page-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const newPage: Page = {
      id: newId,
      title: "Untitled Page",
      icon: "📄",
      parentId,
      children: [],
      blocks: [
        {
          id: `block-init-${Math.random().toString(36).substr(2, 9)}`,
          type: "paragraph",
          data: { text: "" }
        }
      ],
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
    };

    setPages((prev) => {
      let updatedPages = [...prev, newPage];
      
      if (parentId) {
        updatedPages = updatedPages.map((page) => {
          if (page.id === parentId) {
            const currentChildren = page.children || [];
            const newChildren = currentChildren.includes(newId) ? currentChildren : [...currentChildren, newId];
            
            // Create the child-page block
            const childBlock: Block = {
              id: `block-${Math.random().toString(36).substr(2, 9)}`,
              type: "child-page",
              data: { pageId: newId }
            };

            // If insertAfterBlockId is specified, insert it after that block. Otherwise, append to blocks list
            let newBlocks = [...page.blocks];
            if (insertAfterBlockId) {
              const idx = newBlocks.findIndex((b) => b.id === insertAfterBlockId);
              if (idx !== -1) {
                newBlocks.splice(idx + 1, 0, childBlock);
              } else {
                newBlocks.push(childBlock);
              }
            } else {
              newBlocks.push(childBlock);
            }

            return {
              ...page,
              children: newChildren,
              blocks: newBlocks,
              updatedAt: Date.now(),
            };
          }
          return page;
        });
      }
      return updatedPages;
    });

    setActivePageId(newId);
    return newId;
  };

  const createPageFromTemplate = (templateId: string, parentId: string | null = null): string => {
    const template = getTemplateById(templateId) || getTemplateById("empty");
    if (!template) return createPage(parentId);

    const instantiated = instantiateTemplate(template, { parentId });
    const now = Date.now();
    const newPage: Page = {
      ...instantiated,
      lastOpenedAt: now,
    };

    setPages((prev) => {
      let updatedPages = [...prev, newPage];

      if (parentId) {
        updatedPages = updatedPages.map((page) => {
          if (page.id === parentId) {
            const currentChildren = page.children || [];
            const newChildren = currentChildren.includes(newPage.id)
              ? currentChildren
              : [...currentChildren, newPage.id];

            const childBlock: Block = {
              id: `block-${Math.random().toString(36).substr(2, 9)}`,
              type: "child-page",
              data: { pageId: newPage.id },
            };

            return {
              ...page,
              children: newChildren,
              blocks: [...page.blocks, childBlock],
              updatedAt: Date.now(),
            };
          }
          return page;
        });
      }
      return updatedPages;
    });

    setActivePageId(newPage.id);
    return newPage.id;
  };

  const applyTemplateToPage = (pageId: string, templateId: string) => {
    const template = getTemplateById(templateId);
    if (!template) return;

    const freshPage = instantiateTemplate(template);

    setPages((prev) =>
      prev.map((p) => {
        if (p.id === pageId) {
          return {
            ...p,
            title:
              p.title === "Untitled Page" || p.title === "Untitled" || p.title.trim() === ""
                ? template.defaultTitle
                : p.title,
            icon: template.icon || p.icon,
            coverImage: template.coverImage || p.coverImage,
            blocks: freshPage.blocks,
            updatedAt: Date.now(),
          };
        }
        return p;
      })
    );
    setActivePageId(pageId);
  };

  const deletePage = (id: string) => {
    // Check if the current activePageId or any of its ancestors is being deleted
    let isActiveAffected = false;
    if (activePageId) {
      let curr: string | null = activePageId;
      while (curr) {
        if (curr === id) {
          isActiveAffected = true;
          break;
        }
        const pg = pages.find((p) => p.id === curr);
        curr = pg?.parentId || null;
      }
    }

    let nextActiveId: string | null = null;
    if (isActiveAffected && activePageId) {
      nextActiveId = resolveNextActivePage(pages, id);
    }

    setPages((prev) => trashService.softDeletePage(prev, id));

    if (isActiveAffected) {
      if (nextActiveId) {
        setActivePageIdState(nextActiveId);
        setSelectedBlockId(null);
        triggerPageFocus();
      } else {
        createPage(null);
      }
    }
  };

  const updatePage = (id: string, updates: Partial<Page>) => {
    setPages((prev) =>
      prev.map((page) =>
        page.id === id
          ? { ...page, ...updates, updatedAt: Date.now() }
          : page
      )
    );
  };

const getDescendantIds = (targetId: string, blocks: Block[]): string[] => {
  const children = blocks.filter((b) => b.data?.parentId === targetId);
  let ids: string[] = [];
  for (const child of children) {
    ids.push(child.id);
    ids = ids.concat(getDescendantIds(child.id, blocks));
  }
  return ids;
};

const getLastSubtreeBlockId = (targetId: string, blocks: Block[]): string => {
  const descendantIds = new Set(getDescendantIds(targetId, blocks));
  let lastId = targetId;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].id === targetId || descendantIds.has(blocks[i].id)) {
      lastId = blocks[i].id;
    }
  }
  return lastId;
};

  const addBlock = (
    pageId: string,
    type: BlockType,
    text = "",
    insertAfterBlockId?: string | null,
    extraData?: Partial<Block["data"]> & { insertDirectlyAfter?: boolean }
  ) => {
    const newBlockId = `block-${Math.random().toString(36).substr(2, 9)}`;

    setPages((prev) =>
      prev.map((page) => {
        if (page.id !== pageId) return page;

        let targetParentId: string | null = null;
        if (extraData?.parentId !== undefined) {
          targetParentId = extraData.parentId;
        } else if (insertAfterBlockId) {
          const targetBlock = page.blocks.find((b) => b.id === insertAfterBlockId);
          targetParentId = targetBlock?.data?.parentId || null;
        }

        const newExtraData = { ...extraData };
        delete (newExtraData as any).insertDirectlyAfter;

        const newBlock: Block = {
          id: newBlockId,
          type,
          data: {
            text,
            level: type === "heading" ? 2 : undefined,
            checked: type === "todo" ? false : undefined,
            ...newExtraData,
            parentId: targetParentId,
          }
        };

        let newBlocks = [...page.blocks];
        if (insertAfterBlockId) {
          const targetId = extraData?.insertDirectlyAfter
            ? insertAfterBlockId
            : getLastSubtreeBlockId(insertAfterBlockId, newBlocks);
          const idx = newBlocks.findIndex((b) => b.id === targetId);
          if (idx !== -1) {
            newBlocks.splice(idx + 1, 0, newBlock);
          } else {
            newBlocks.push(newBlock);
          }
        } else {
          newBlocks.push(newBlock);
        }

        return { ...page, blocks: newBlocks, updatedAt: Date.now() };
      })
    );

    setSelectedBlockId(newBlockId);
    return newBlockId;
  };

  const updateBlock = (pageId: string, blockId: string, text: string) => {
    setPages((prev) =>
      prev.map((page) => {
        if (page.id !== pageId) return page;

        return {
          ...page,
          blocks: page.blocks.map((block) =>
            block.id === blockId
              ? { ...block, data: { ...block.data, text } }
              : block
          ),
          updatedAt: Date.now()
        };
      })
    );
  };

  const updateBlockType = (
    pageId: string,
    blockId: string,
    type: BlockType,
    extraData?: Partial<Block["data"]>
  ) => {
    setPages((prev) =>
      prev.map((page) => {
        if (page.id !== pageId) return page;

        return {
          ...page,
          blocks: page.blocks.map((block) =>
            block.id === blockId
              ? {
                  ...block,
                  type,
                  data: {
                    ...block.data,
                    level: type === "heading" ? (extraData?.level || 2) : undefined,
                    checked: type === "todo" ? (extraData?.checked !== undefined ? extraData.checked : false) : undefined,
                    ...extraData
                  }
                }
              : block
          ),
          updatedAt: Date.now()
        };
      })
    );
  };

  const updateBlockData = (
    pageId: string,
    blockId: string,
    data: Partial<Block["data"]>
  ) => {
    setPages((prev) =>
      prev.map((page) => {
        if (page.id !== pageId) return page;

        return {
          ...page,
          blocks: page.blocks.map((block) =>
            block.id === blockId
              ? {
                  ...block,
                  data: {
                    ...block.data,
                    ...data
                  }
                }
              : block
          ),
          updatedAt: Date.now()
        };
      })
    );
  };

  const deleteBlock = (pageId: string, blockId: string) => {
    setPages((prev) =>
      prev.map((page) => {
        if (page.id !== pageId) return page;

        const targetBlock = page.blocks.find((b) => b.id === blockId);
        if (!targetBlock) return page;

        const targetParentId = targetBlock.data?.parentId || null;

        const nextBlocks = page.blocks
          .filter((block) => block.id !== blockId)
          .map((block) => {
            if (block.data?.parentId === blockId) {
              return {
                ...block,
                data: {
                  ...block.data,
                  parentId: targetParentId,
                },
              };
            }
            return block;
          });

        return {
          ...page,
          blocks: nextBlocks,
          updatedAt: Date.now(),
        };
      })
    );

    // If it was a child-page block, also trigger the subpage deletion to keep state clean.
    const activePg = pages.find((p) => p.id === pageId);
    if (activePg) {
      const blk = activePg.blocks.find((b) => b.id === blockId);
      if (blk && blk.type === "child-page" && blk.data.pageId) {
        deletePage(blk.data.pageId);
      }
    }

    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  };

  const reorderBlocks = (pageId: string, activeId: string, overId: string) => {
    setPages((prev) =>
      prev.map((page) => {
        if (page.id !== pageId) return page;

        const descendantIds = new Set(getDescendantIds(activeId, page.blocks));
        const subtreeIds = new Set([activeId, ...descendantIds]);

        const subtreeBlocks: Block[] = [];
        const remainingBlocks: Block[] = [];

        for (const block of page.blocks) {
          if (subtreeIds.has(block.id)) {
            subtreeBlocks.push(block);
          } else {
            remainingBlocks.push(block);
          }
        }

        const overIndexInRemaining = remainingBlocks.findIndex((b) => b.id === overId);
        if (overIndexInRemaining === -1) return page;

        const oldIndex = page.blocks.findIndex((b) => b.id === activeId);
        const overIndexInOriginal = page.blocks.findIndex((b) => b.id === overId);

        const insertIndex = overIndexInOriginal > oldIndex 
          ? overIndexInRemaining + 1 
          : overIndexInRemaining;

        remainingBlocks.splice(insertIndex, 0, ...subtreeBlocks);

        return {
          ...page,
          blocks: remainingBlocks,
          updatedAt: Date.now(),
        };
      })
    );
  };

  const duplicateBlock = (pageId: string, blockId: string): string | null => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return null;

    const targetIndex = page.blocks.findIndex((b) => b.id === blockId);
    if (targetIndex === -1) return null;

    const descendantIds = new Set(getDescendantIds(blockId, page.blocks));
    const idMap = new Map<string, string>();

    const newBlockId = `block-${Math.random().toString(36).substr(2, 9)}`;
    idMap.set(blockId, newBlockId);

    for (const id of descendantIds) {
      idMap.set(id, `block-${Math.random().toString(36).substr(2, 9)}`);
    }

    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== pageId) return p;

        const idx = p.blocks.findIndex((b) => b.id === blockId);
        if (idx === -1) return p;

        const blocksToDuplicate: Block[] = [];
        for (let i = idx; i < p.blocks.length; i++) {
          const b = p.blocks[i];
          if (b.id === blockId || descendantIds.has(b.id)) {
            blocksToDuplicate.push(b);
          } else if (blocksToDuplicate.length > 0 && !b.data?.parentId) {
            break;
          }
        }

        const duplicatedBlocks: Block[] = blocksToDuplicate.map((b) => {
          const newId = idMap.get(b.id)!;
          const newData = JSON.parse(JSON.stringify(b.data));
          if (newData.parentId && idMap.has(newData.parentId)) {
            newData.parentId = idMap.get(newData.parentId);
          }
          return {
            id: newId,
            type: b.type,
            data: newData,
          };
        });

        const newBlocks = [...p.blocks];
        newBlocks.splice(idx + blocksToDuplicate.length, 0, ...duplicatedBlocks);

        return {
          ...p,
          blocks: newBlocks,
          updatedAt: Date.now(),
        };
      })
    );

    return newBlockId;
  };

  const [blockClipboard, setBlockClipboard] = useState<ClipboardBlockData | null>(null);

  const copyBlock = (pageId: string, blockId: string) => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;

    const rootBlock = page.blocks.find((b) => b.id === blockId);
    if (!rootBlock) return;

    const descendantIds = new Set(getDescendantIds(blockId, page.blocks));
    const childBlocks = page.blocks.filter((b) => descendantIds.has(b.id));

    setBlockClipboard({
      rootBlock: JSON.parse(JSON.stringify(rootBlock)),
      childBlocks: JSON.parse(JSON.stringify(childBlocks)),
    });
  };

  const cutBlock = (pageId: string, blockId: string): string | null => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return null;

    const rootBlock = page.blocks.find((b) => b.id === blockId);
    if (!rootBlock) return null;

    copyBlock(pageId, blockId);

    const blocksMap = new Map<string, Block>(page.blocks.map((b) => [b.id, b]));
    const isVisible = (b: Block): boolean => {
      let currParentId = b.data?.parentId;
      while (currParentId) {
        const parent = blocksMap.get(currParentId);
        if (!parent) break;
        if (parent.type === "toggle" && parent.data?.collapsed) return false;
        currParentId = parent.data?.parentId;
      }
      return true;
    };

    const visibleBlocks = page.blocks.filter(isVisible);
    const visIdx = visibleBlocks.findIndex((b) => b.id === blockId);

    let adjacentBlockId: string | null = null;
    if (visIdx < visibleBlocks.length - 1) {
      adjacentBlockId = visibleBlocks[visIdx + 1].id;
    } else if (visIdx > 0) {
      adjacentBlockId = visibleBlocks[visIdx - 1].id;
    }

    deleteBlock(pageId, blockId);
    return adjacentBlockId;
  };

  const pasteBlock = (pageId: string, targetBlockId: string): string | null => {
    if (!blockClipboard) return null;

    const newRootId = `block-${Math.random().toString(36).substr(2, 9)}`;
    const idMap = new Map<string, string>();
    idMap.set(blockClipboard.rootBlock.id, newRootId);

    for (const child of blockClipboard.childBlocks) {
      idMap.set(child.id, `block-${Math.random().toString(36).substr(2, 9)}`);
    }

    setPages((prev) =>
      prev.map((page) => {
        if (page.id !== pageId) return page;

        const targetBlock = page.blocks.find((b) => b.id === targetBlockId);
        if (!targetBlock) return page;

        const lastSubtreeId = getLastSubtreeBlockId(targetBlockId, page.blocks);
        const targetIndex = page.blocks.findIndex((b) => b.id === lastSubtreeId);
        if (targetIndex === -1) return page;

        const duplicatedRootBlock: Block = {
          id: newRootId,
          type: blockClipboard.rootBlock.type,
          data: {
            ...JSON.parse(JSON.stringify(blockClipboard.rootBlock.data)),
            parentId: targetBlock.data?.parentId || null,
          },
        };

        const duplicatedChildBlocks: Block[] = blockClipboard.childBlocks.map((child) => {
          const newChildId = idMap.get(child.id)!;
          const newChildData = JSON.parse(JSON.stringify(child.data));
          if (newChildData.parentId && idMap.has(newChildData.parentId)) {
            newChildData.parentId = idMap.get(newChildData.parentId);
          }
          return {
            id: newChildId,
            type: child.type,
            data: newChildData,
          };
        });

        const newBlocks = [...page.blocks];
        newBlocks.splice(targetIndex + 1, 0, duplicatedRootBlock, ...duplicatedChildBlocks);

        return {
          ...page,
          blocks: newBlocks,
          updatedAt: Date.now(),
        };
      })
    );

    return newRootId;
  };

  // Search State & Navigation Logic
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [pendingSearchTarget, setPendingSearchTarget] = useState<SearchNavigationTarget | null>(null);

  // Synchronize search index whenever active pages change
  useEffect(() => {
    const activePages = pages.filter((p) => !p.isDeleted);
    searchService.buildIndex(activePages);
  }, [pages]);

  // Ensure activePageId points to a non-deleted page
  useEffect(() => {
    if (activePageId) {
      const activePg = pages.find((p) => p.id === activePageId);
      if (!activePg || activePg.isDeleted) {
        const nextId = resolveNextActivePage(pages, activePageId);
        if (nextId) {
          setActivePageIdState(nextId);
        } else {
          const activePages = pages.filter((p) => !p.isDeleted);
          if (activePages.length > 0) {
            setActivePageIdState(activePages[0].id);
          } else {
            createPage(null);
          }
        }
      }
    }
  }, [pages, activePageId]);

  // Global Keyboard Shortcut: Ctrl+P / Cmd+P or Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && (e.key.toLowerCase() === "p" || e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigateToResult = (
    pageId: string,
    blockId: string | null,
    rawMatchStart?: number,
    rawMatchEnd?: number
  ) => {
    const targetPage = pages.find((p) => p.id === pageId);
    if (!targetPage || targetPage.isDeleted) {
      return;
    }
    setIsSearchOpen(false);
    setActivePageId(pageId);

    setPendingSearchTarget({
      pageId,
      blockId,
      rawMatchStart,
      rawMatchEnd,
    });

    if (blockId) {
      setHighlightedBlockId(blockId);
      setSelectedBlockId(blockId);
    } else {
      setHighlightedBlockId(null);
    }
  };

  const favoritePages = useMemo(() => {
    return favoritesService.getFavoritePages(pages);
  }, [pages]);

  const recentPages = useMemo(() => {
    return recentPagesService.getRecentPages(pages, 20);
  }, [pages]);

  const toggleFavorite = useCallback((pageId: string) => {
    setPages((prev) => favoritesService.toggleFavorite(prev, pageId));
  }, []);

  const reorderFavorites = useCallback((draggedId: string, targetId: string) => {
    setPages((prev) => favoritesService.reorderFavorites(prev, draggedId, targetId));
  }, []);

  const trashPages = useMemo(() => {
    return trashService.getRootTrashPages(pages);
  }, [pages]);

  const restorePage = useCallback((pageId: string) => {
    setPages((prev) => trashService.restorePage(prev, pageId));
  }, []);

  const permanentlyDeletePage = useCallback((pageId: string) => {
    setPages((prev) => trashService.permanentlyDeletePage(prev, pageId));
  }, []);

  const emptyTrash = useCallback(() => {
    setPages((prev) => trashService.emptyTrash(prev));
  }, []);

  const activePage = pages.find((page) => page.id === activePageId && !page.isDeleted) || null;

  const exportWorkspace = useCallback(async () => {
    try {
      const activePages = pages.filter((p) => !p.isDeleted);
      const wsInfo = platform.workspace.isSupported
        ? await platform.workspace.getActive()
        : null;
      const workspaceName = wsInfo?.name || "Workspace";

      await exportService.exportWorkspace("workspace", activePages, {
        allPages: activePages,
        workspaceName,
        activePageId,
        sidebarOpen,
      });
    } catch (err: any) {
      console.error("[AppContext] Export workspace failed:", err);
      platform.dialogs.alert(err?.message || "Failed to export workspace backup.");
    }
  }, [pages, activePageId, sidebarOpen]);

  const importWorkspace = useCallback(async (providedContent?: string | Uint8Array | ArrayBuffer) => {
    try {
      let content = providedContent;
      if (!content) {
        const fileResult = await platform.fileSystem.importFile(".zip,.json");
        if (!fileResult) return false;
        content = fileResult.content;
      }

      const snapshot = await WorkspaceImporter.importWorkspace(content);
      setPages(snapshot.pages);
      setActivePageIdState(snapshot.activePageId);
      if (typeof snapshot.sidebarOpen === "boolean") {
        setSidebarOpen(snapshot.sidebarOpen);
      }
      persistenceService.saveWorkspace(snapshot);
      platform.dialogs.alert("Workspace restored successfully!");
      return true;
    } catch (err: any) {
      console.error("[AppContext] Import workspace failed:", err);
      platform.dialogs.alert(err?.message || "Failed to import workspace backup archive.");
      return false;
    }
  }, []);

  const importPage = useCallback(
    async (providedFile?: { filename: string; content: string | Uint8Array }) => {
      try {
        let fileResult = providedFile;
        if (!fileResult) {
          const acceptFilter = pageImportService.getAcceptFilter();
          const result = await platform.fileSystem.importFile(acceptFilter);
          if (!result) return null;
          fileResult = result;
        }

        const { filename, content } = fileResult;
        const parsedData = await pageImportService.importPage(filename, content);

        const newId = `page-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const now = Date.now();

        const newPage: Page = {
          id: newId,
          title: parsedData.title || "Imported Page",
          icon: parsedData.icon || "📄",
          coverImage: parsedData.coverImage || null,
          parentId: null,
          children: [],
          blocks: parsedData.blocks,
          createdAt: now,
          updatedAt: now,
          lastOpenedAt: now,
        };

        setPages((prev) => [...prev, newPage]);
        setActivePageIdState(newId);

        const firstBlockId = newPage.blocks[0]?.id;
        if (firstBlockId) {
          setSelectedBlockId(firstBlockId);
          setHighlightedBlockId(firstBlockId);

          setTimeout(() => {
            const blockEl = document.querySelector(
              `[data-block-id="${firstBlockId}"] [contenteditable="true"], [data-block-id="${firstBlockId}"] input, [data-block-id="${firstBlockId}"] textarea`
            );
            if (blockEl && blockEl instanceof HTMLElement) {
              blockEl.focus();
            }
          }, 150);
        }

        return newId;
      } catch (err: any) {
        console.error("[AppContext] Import page failed:", err);
        platform.dialogs.alert(err?.message || "Failed to import page file.");
        return null;
      }
    },
    []
  );

  return (
    <AppContext.Provider
      value={{
        pages,
        favoritePages,
        recentPages,
        toggleFavorite,
        reorderFavorites,
        trashPages,
        restorePage,
        permanentlyDeletePage,
        emptyTrash,
        activePageId,
        activePage,
        sidebarOpen,
        selectedBlockId,
        focusToken,
        triggerPageFocus,
        setSelectedBlockId,
        setSidebarOpen,
        setActivePageId,
        createPage,
        createPageFromTemplate,
        applyTemplateToPage,
        deletePage,
        updatePage,
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
        isSearchOpen,
        setIsSearchOpen,
        highlightedBlockId,
        setHighlightedBlockId,
        pendingSearchTarget,
        setPendingSearchTarget,
        navigateToResult,
        exportWorkspace,
        importWorkspace,
        importPage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

