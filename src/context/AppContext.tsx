import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Page, Block, BlockType, ClipboardBlockData } from "../types";
import { getTemplateById, instantiateTemplate } from "../templates/templateRegistry";
import { searchService } from "../services/SearchService";
import { favoritesService } from "../services/FavoritesService";
import { trashService } from "../services/TrashService";
import { recentPagesService } from "../services/RecentPagesService";
import { persistenceService, CURRENT_SCHEMA_VERSION, WorkspaceSnapshot } from "../services/PersistenceService";
import { exportService, WorkspaceImporter } from "../services/export";
import { pageImportService } from "../services/import";
import { notificationService } from "../services/NotificationService";
import { workspaceHistoryService } from "../services/WorkspaceHistoryService";
import { isUserEditingText } from "../utils/dom";
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
  canUndo: boolean;
  canRedo: boolean;
  undo: () => boolean;
  redo: () => boolean;
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
  duplicatePage: (id: string) => string | null;
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
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isTrashOpen: boolean;
  setIsTrashOpen: (open: boolean) => void;
  isExportOpen: boolean;
  setIsExportOpen: (open: boolean) => void;
  isTemplateModalOpen: boolean;
  setIsTemplateModalOpen: (open: boolean) => void;
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

  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  const setActivePageId = useCallback((id: string | null, options?: { skipFocus?: boolean }) => {
    if (id) {
      const targetPage = pagesRef.current.find((p) => p.id === id);
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
    if (!options?.skipFocus) {
      triggerPageFocus();
    }
    if (id) {
      platform.persistence.setItem(ACTIVE_PAGE_KEY, id);
    } else {
      platform.persistence.removeItem(ACTIVE_PAGE_KEY);
    }
  }, []);

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

    const prevActiveId = activePageId;

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
    notificationService.info("Page created", "Untitled page added to workspace");

    if (!workspaceHistoryService.isExecutingUndoRedo()) {
      workspaceHistoryService.registerCommand({
        id: `create_page_${newId}`,
        description: "Create Page",
        timestamp: Date.now(),
        pageId: newId,
        execute: () => {
          setPages((prev) => {
            if (prev.some((p) => p.id === newId)) return prev;
            let updatedPages = [...prev, newPage];
            if (parentId) {
              updatedPages = updatedPages.map((page) => {
                if (page.id === parentId) {
                  const currentChildren = page.children || [];
                  const newChildren = currentChildren.includes(newId) ? currentChildren : [...currentChildren, newId];
                  const childBlock: Block = {
                    id: `block-${Math.random().toString(36).substr(2, 9)}`,
                    type: "child-page",
                    data: { pageId: newId }
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
          setActivePageId(newId);
          notificationService.info("Page created", "Untitled page added to workspace");
        },
        undo: () => {
          setPages((prev) => {
            const filteredPages = prev.filter((p) => p.id !== newId);
            if (!parentId) return filteredPages;
            return filteredPages.map((page) => {
              if (page.id === parentId) {
                const newChildren = (page.children || []).filter((cId) => cId !== newId);
                const newBlocks = page.blocks.filter(
                  (b) => !(b.type === "child-page" && b.data?.pageId === newId)
                );
                return {
                  ...page,
                  children: newChildren,
                  blocks: newBlocks,
                  updatedAt: Date.now(),
                };
              }
              return page;
            });
          });

          setActivePageIdState((currentActiveId) => {
            if (currentActiveId === newId) {
              return prevActiveId && prevActiveId !== newId ? prevActiveId : parentId || null;
            }
            return currentActiveId;
          });
          notificationService.info("Page creation undone", "Untitled page removed.");
        },
      });
    }

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

    const prevActiveId = activePageId;

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
    notificationService.success("Page Created", `Created "${newPage.title}" from template.`);

    if (!workspaceHistoryService.isExecutingUndoRedo()) {
      workspaceHistoryService.registerCommand({
        id: `create_page_template_${newPage.id}_${Date.now()}`,
        description: `Create Page from Template (${template.name})`,
        timestamp: Date.now(),
        pageId: newPage.id,
        execute: () => {
          setPages((prev) => {
            if (prev.some((p) => p.id === newPage.id)) return prev;
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
          notificationService.success("Page Created", `Created "${newPage.title}" from template.`);
        },
        undo: () => {
          setPages((prev) => {
            const filteredPages = prev.filter((p) => p.id !== newPage.id);
            if (!parentId) return filteredPages;
            return filteredPages.map((page) => {
              if (page.id === parentId) {
                const newChildren = (page.children || []).filter((cId) => cId !== newPage.id);
                const newBlocks = page.blocks.filter(
                  (b) => !(b.type === "child-page" && b.data?.pageId === newPage.id)
                );
                return {
                  ...page,
                  children: newChildren,
                  blocks: newBlocks,
                  updatedAt: Date.now(),
                };
              }
              return page;
            });
          });

          setActivePageIdState((currentActiveId) => {
            if (currentActiveId === newPage.id) {
              return prevActiveId && prevActiveId !== newPage.id ? prevActiveId : parentId || null;
            }
            return currentActiveId;
          });
          notificationService.info("Page creation undone", `"${newPage.title}" removed.`);
        },
      });
    }

    return newPage.id;
  };

  const applyTemplateToPage = (pageId: string, templateId: string) => {
    const template = getTemplateById(templateId);
    if (!template) return;

    const targetPage = pages.find((p) => p.id === pageId);
    if (!targetPage) return;

    const oldState = { ...targetPage };
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

    if (!workspaceHistoryService.isExecutingUndoRedo()) {
      workspaceHistoryService.registerCommand({
        id: `apply_template_${pageId}_${Date.now()}`,
        description: "Apply Template",
        timestamp: Date.now(),
        pageId: pageId,
        execute: () => {
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
          notificationService.success("Template Applied", `Applied "${template.name}".`);
        },
        undo: () => {
          setPages((prev) =>
            prev.map((p) => (p.id === pageId ? { ...oldState } : p))
          );
          notificationService.info("Template application undone", `Restored "${oldState.title}".`);
        },
      });
    }
  };

  const deletePage = (id: string) => {
    const targetPage = pages.find((p) => p.id === id);
    const pageTitle = targetPage?.title || "Untitled";

    const prevPagesState = pages;
    const prevActiveId = activePageId;

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

    if (!workspaceHistoryService.isExecutingUndoRedo()) {
      workspaceHistoryService.registerCommand({
        id: `delete_page_${id}_${Date.now()}`,
        description: "Delete Page",
        timestamp: Date.now(),
        pageId: id,
        execute: () => {
          setPages((prev) => trashService.softDeletePage(prev, id));
          if (isActiveAffected && nextActiveId) {
            setActivePageIdState(nextActiveId);
          }
          notificationService.info("Moved to Trash", `"${pageTitle}" was moved to Trash.`);
        },
        undo: () => {
          setPages((currentPages) => trashService.restorePage(currentPages, id));
          if (prevActiveId) {
            setActivePageIdState(prevActiveId);
          }
          notificationService.success("Page restored", `"${pageTitle}" restored from Trash.`);
        },
      });
    }

    notificationService.success(
      "Moved to Trash",
      `"${pageTitle}" was moved to Trash.`,
      {
        label: "Undo",
        onClick: () => {
          if (workspaceHistoryService.canUndo()) {
            workspaceHistoryService.undo();
          } else {
            restorePage(id);
          }
        },
      }
    );
  };

  const duplicatePage = (id: string): string | null => {
    const pageToDup = pages.find((p) => p.id === id);
    if (!pageToDup) return null;

    workspaceHistoryService.startGroup("Duplicate Page", id);
    try {
      const newId = createPage(pageToDup.parentId);
      updatePage(newId, {
        title: `${pageToDup.title || "Untitled"} (Copy)`,
        icon: pageToDup.icon,
        coverImage: pageToDup.coverImage,
        blocks: JSON.parse(JSON.stringify(pageToDup.blocks)),
      });
      notificationService.success("Page duplicated", `Copied "${pageToDup.title || "Untitled"}"`);
      return newId;
    } finally {
      workspaceHistoryService.endGroup();
    }
  };

  const updatePage = (id: string, updates: Partial<Page>) => {
    const target = pages.find((p) => p.id === id);
    if (!target) {
      setPages((prev) =>
        prev.map((page) =>
          page.id === id ? { ...page, ...updates, updatedAt: Date.now() } : page
        )
      );
      return;
    }

    const oldTitle = target.title;
    const oldIcon = target.icon;
    const oldCover = target.coverImage;

    setPages((prev) =>
      prev.map((page) =>
        page.id === id ? { ...page, ...updates, updatedAt: Date.now() } : page
      )
    );

    if (!workspaceHistoryService.isExecutingUndoRedo()) {
      const isMeaningful =
        (updates.title !== undefined && updates.title !== oldTitle) ||
        (updates.icon !== undefined && updates.icon !== oldIcon) ||
        (updates.coverImage !== undefined && updates.coverImage !== oldCover);

      if (isMeaningful) {
        workspaceHistoryService.registerCommand({
          id: `update_page_${id}_${Date.now()}`,
          description: updates.title !== undefined ? "Rename Page" : "Update Page",
          timestamp: Date.now(),
          pageId: id,
          execute: () => {
            setPages((prev) =>
              prev.map((page) =>
                page.id === id ? { ...page, ...updates, updatedAt: Date.now() } : page
              )
            );
          },
          undo: () => {
            setPages((prev) =>
              prev.map((page) =>
                page.id === id
                  ? {
                      ...page,
                      title: updates.title !== undefined ? oldTitle : page.title,
                      icon: updates.icon !== undefined ? oldIcon : page.icon,
                      coverImage: updates.coverImage !== undefined ? oldCover : page.coverImage,
                      updatedAt: Date.now(),
                    }
                  : page
              )
            );
          },
        });
      }
    }
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

    if (!workspaceHistoryService.isExecutingUndoRedo()) {
      workspaceHistoryService.registerCommand({
        id: `add_block_${newBlockId}`,
        description: "Add Block",
        timestamp: Date.now(),
        pageId: pageId,
        execute: () => {
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
                },
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
        },
        undo: () => {
          setPages((prev) =>
            prev.map((page) => {
              if (page.id !== pageId) return page;
              return {
                ...page,
                blocks: page.blocks.filter((b) => b.id !== newBlockId),
                updatedAt: Date.now(),
              };
            })
          );
        },
      });
    }

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
    const pageToModify = pages.find((p) => p.id === pageId);
    const prevBlock = pageToModify?.blocks.find((b) => b.id === blockId);

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

    if (!workspaceHistoryService.isExecutingUndoRedo() && pageToModify && prevBlock) {
      const oldBlock = JSON.parse(JSON.stringify(prevBlock));
      workspaceHistoryService.registerCommand({
        id: `update_block_type_${blockId}_${Date.now()}`,
        description: "Change Block Type",
        timestamp: Date.now(),
        pageId: pageId,
        execute: () => {
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
                          ...extraData,
                        },
                      }
                    : block
                ),
                updatedAt: Date.now(),
              };
            })
          );
        },
        undo: () => {
          setPages((prev) =>
            prev.map((page) =>
              page.id === pageId
                ? {
                    ...page,
                    blocks: page.blocks.map((b) => (b.id === blockId ? oldBlock : b)),
                    updatedAt: Date.now(),
                  }
                : page
            )
          );
        },
      });
    }
  };

  const updateBlockData = (
    pageId: string,
    blockId: string,
    data: Partial<Block["data"]>
  ) => {
    const pageToModify = pages.find((p) => p.id === pageId);
    const prevBlock = pageToModify?.blocks.find((b) => b.id === blockId);

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

    const isPureTextUpdate = Object.keys(data).length === 1 && "text" in data;

    if (!isPureTextUpdate && !workspaceHistoryService.isExecutingUndoRedo() && pageToModify && prevBlock) {
      const oldData = JSON.parse(JSON.stringify(prevBlock.data));
      workspaceHistoryService.registerCommand({
        id: `update_block_data_${blockId}_${Date.now()}`,
        description: "Update Block Data",
        timestamp: Date.now(),
        pageId: pageId,
        execute: () => {
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
                          ...data,
                        },
                      }
                    : block
                ),
                updatedAt: Date.now(),
              };
            })
          );
        },
        undo: () => {
          setPages((prev) =>
            prev.map((page) =>
              page.id === pageId
                ? {
                    ...page,
                    blocks: page.blocks.map((block) =>
                      block.id === blockId ? { ...block, data: oldData } : block
                    ),
                    updatedAt: Date.now(),
                  }
                : page
            )
          );
        },
      });
    }
  };

  const deleteBlock = (pageId: string, blockId: string) => {
    const pageToModify = pages.find((p) => p.id === pageId);
    const prevBlocks = pageToModify?.blocks;

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

    if (!workspaceHistoryService.isExecutingUndoRedo() && pageToModify && prevBlocks) {
      workspaceHistoryService.registerCommand({
        id: `delete_block_${blockId}_${Date.now()}`,
        description: "Delete Block",
        timestamp: Date.now(),
        pageId: pageId,
        execute: () => {
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
              return { ...page, blocks: nextBlocks, updatedAt: Date.now() };
            })
          );
        },
        undo: () => {
          setPages((prev) =>
            prev.map((page) =>
              page.id === pageId ? { ...page, blocks: prevBlocks, updatedAt: Date.now() } : page
            )
          );
        },
      });
    }

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
    const pageToModify = pages.find((p) => p.id === pageId);
    if (!pageToModify) return;

    // Snapshot PREVIOUS block array before mutation (deep copy to guarantee immutability)
    const prevBlocks: Block[] = JSON.parse(JSON.stringify(pageToModify.blocks));

    const descendantIds = new Set(getDescendantIds(activeId, prevBlocks));
    const subtreeIds = new Set([activeId, ...descendantIds]);

    const subtreeBlocks: Block[] = [];
    const remainingBlocks: Block[] = [];

    for (const block of prevBlocks) {
      if (subtreeIds.has(block.id)) {
        subtreeBlocks.push(block);
      } else {
        remainingBlocks.push(block);
      }
    }

    const overIndexInRemaining = remainingBlocks.findIndex((b) => b.id === overId);
    if (overIndexInRemaining === -1) return;

    const oldIndex = prevBlocks.findIndex((b) => b.id === activeId);
    const overIndexInOriginal = prevBlocks.findIndex((b) => b.id === overId);

    const insertIndex =
      overIndexInOriginal > oldIndex ? overIndexInRemaining + 1 : overIndexInRemaining;

    remainingBlocks.splice(insertIndex, 0, ...subtreeBlocks);
    const newBlocks: Block[] = JSON.parse(JSON.stringify(remainingBlocks));

    setPages((prev) =>
      prev.map((page) => {
        if (page.id !== pageId) return page;
        return {
          ...page,
          blocks: newBlocks,
          updatedAt: Date.now(),
        };
      })
    );

    if (!workspaceHistoryService.isExecutingUndoRedo()) {
      workspaceHistoryService.registerCommand({
        id: `reorder_blocks_${pageId}_${Date.now()}`,
        description: "Reorder Blocks",
        timestamp: Date.now(),
        pageId: pageId,
        execute: () => {
          setPages((prev) =>
            prev.map((page) =>
              page.id === pageId ? { ...page, blocks: newBlocks, updatedAt: Date.now() } : page
            )
          );
        },
        undo: () => {
          setPages((prev) =>
            prev.map((page) =>
              page.id === pageId ? { ...page, blocks: prevBlocks, updatedAt: Date.now() } : page
            )
          );
        },
      });
    }
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

    const createdIds = new Set(Array.from(idMap.values()));
    if (!workspaceHistoryService.isExecutingUndoRedo()) {
      workspaceHistoryService.registerCommand({
        id: `duplicate_block_${newBlockId}_${Date.now()}`,
        description: "Duplicate Block",
        timestamp: Date.now(),
        pageId: pageId,
        execute: () => {
          setPages((prev) =>
            prev.map((p) => {
              if (p.id !== pageId) return p;
              if (p.blocks.some((b) => createdIds.has(b.id))) return p;
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

              return { ...p, blocks: newBlocks, updatedAt: Date.now() };
            })
          );
        },
        undo: () => {
          setPages((prev) =>
            prev.map((p) =>
              p.id === pageId
                ? { ...p, blocks: p.blocks.filter((b) => !createdIds.has(b.id)), updatedAt: Date.now() }
                : p
            )
          );
        },
      });
    }

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

    const createdIds = new Set([newRootId, ...Array.from(idMap.values())]);
    if (!workspaceHistoryService.isExecutingUndoRedo()) {
      workspaceHistoryService.registerCommand({
        id: `paste_block_${newRootId}_${Date.now()}`,
        description: "Paste Block",
        timestamp: Date.now(),
        pageId: pageId,
        execute: () => {
          setPages((prev) =>
            prev.map((page) => {
              if (page.id !== pageId) return page;
              if (page.blocks.some((b) => createdIds.has(b.id))) return page;

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

              return { ...page, blocks: newBlocks, updatedAt: Date.now() };
            })
          );
        },
        undo: () => {
          setPages((prev) =>
            prev.map((page) =>
              page.id === pageId
                ? { ...page, blocks: page.blocks.filter((b) => !createdIds.has(b.id)), updatedAt: Date.now() }
                : page
            )
          );
        },
      });
    }

    return newRootId;
  };

  // Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Search State & Navigation Logic
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const [pendingSearchTarget, setPendingSearchTarget] = useState<SearchNavigationTarget | null>(null);

  // Synchronize search index whenever active pages change (debounced for smooth typing performance)
  useEffect(() => {
    const timer = setTimeout(() => {
      const activePages = pages.filter((p) => !p.isDeleted);
      searchService.buildIndex(activePages);
    }, 300);
    return () => clearTimeout(timer);
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

  // Workspace History State Subscription
  const [historyState, setHistoryState] = useState(() => workspaceHistoryService.getState());

  useEffect(() => {
    return workspaceHistoryService.subscribe((state) => {
      setHistoryState(state);
    });
  }, []);

  useEffect(() => {
    workspaceHistoryService.setNavigateHandler((pageId: string) => {
      setActivePageIdState((currentActiveId) => {
        if (currentActiveId !== pageId) {
          const targetPage = pagesRef.current.find((p) => p.id === pageId);
          if (targetPage && !targetPage.isDeleted) {
            setActivePageId(pageId, { skipFocus: true });
          }
        }
        return currentActiveId;
      });
    });
    return () => {
      workspaceHistoryService.setNavigateHandler(null);
    };
  }, [setActivePageId]);

  const undo = useCallback(() => {
    return workspaceHistoryService.undo();
  }, []);

  const redo = useCallback(() => {
    return workspaceHistoryService.redo();
  }, []);

  // Global Keyboard Shortcuts: Search (Ctrl+P / Ctrl+K), Undo (Ctrl+Z), Redo (Ctrl+Shift+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      const keyLower = e.key.toLowerCase();

      if (keyLower === "p" || keyLower === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      if (keyLower === "z") {
        if (e.defaultPrevented) return;

        const active = document.activeElement;
        const isBlockInput =
          active &&
          ((active.id && (active.id.startsWith("block-input-") || active.id.startsWith("table-cell-") || active.id === "editor-page-title")) ||
            !!active.closest("[id^='editor-block-wrapper-']") ||
            !!active.closest("#editor-scroll-container"));

        const isNonBlockStandardInput =
          active &&
          !isBlockInput &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT");

        if (isNonBlockStandardInput) {
          return;
        }

        if (e.shiftKey) {
          if (workspaceHistoryService.canRedo()) {
            e.preventDefault();
            workspaceHistoryService.redo();
          }
        } else {
          if (workspaceHistoryService.canUndo()) {
            e.preventDefault();
            workspaceHistoryService.undo();
          }
        }
      } else if (keyLower === "y") {
        if (e.defaultPrevented) return;

        const active = document.activeElement;
        const isBlockInput =
          active &&
          ((active.id && (active.id.startsWith("block-input-") || active.id.startsWith("table-cell-") || active.id === "editor-page-title")) ||
            !!active.closest("[id^='editor-block-wrapper-']") ||
            !!active.closest("#editor-scroll-container"));

        const isNonBlockStandardInput =
          active &&
          !isBlockInput &&
          (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT");

        if (isNonBlockStandardInput) {
          return;
        }

        if (workspaceHistoryService.canRedo()) {
          e.preventDefault();
          workspaceHistoryService.redo();
        }
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
    const pg = pages.find((p) => p.id === pageId);
    const targetTitle = pg ? (pg.title || "Untitled") : "Page";
    const wasFav = pg ? !!pg.isFavorite : false;
    const willBeFav = !wasFav;

    setPages((prev) => favoritesService.toggleFavorite(prev, pageId));

    if (!workspaceHistoryService.isExecutingUndoRedo()) {
      workspaceHistoryService.registerCommand({
        id: `toggle_fav_${pageId}_${Date.now()}`,
        description: "Toggle Favorite",
        timestamp: Date.now(),
        pageId: pageId,
        execute: () => {
          setPages((prev) => favoritesService.toggleFavorite(prev, pageId));
          notificationService.info(
            willBeFav ? "Added to Favorites" : "Removed from Favorites",
            `"${targetTitle}"`
          );
        },
        undo: () => {
          setPages((prev) => favoritesService.toggleFavorite(prev, pageId));
          notificationService.info(
            wasFav ? "Added to Favorites" : "Removed from Favorites",
            `"${targetTitle}"`
          );
        },
      });
    }

    notificationService.info(
      willBeFav ? "Added to Favorites" : "Removed from Favorites",
      `"${targetTitle}"`
    );
  }, [pages]);

  const reorderFavorites = useCallback((draggedId: string, targetId: string) => {
    const prevPagesState = pages;
    setPages((prev) => favoritesService.reorderFavorites(prev, draggedId, targetId));

    if (!workspaceHistoryService.isExecutingUndoRedo()) {
      workspaceHistoryService.registerCommand({
        id: `reorder_fav_${Date.now()}`,
        description: "Change Favorite Order",
        timestamp: Date.now(),
        execute: () => {
          setPages((prev) => favoritesService.reorderFavorites(prev, draggedId, targetId));
        },
        undo: () => {
          setPages(prevPagesState);
        },
      });
    }
  }, [pages]);

  const trashPages = useMemo(() => {
    return trashService.getRootTrashPages(pages);
  }, [pages]);

  const restorePage = useCallback((pageId: string) => {
    let targetTitle = "Page";
    const prevPagesState = pages;
    setPages((prev) => {
      const pg = prev.find((p) => p.id === pageId);
      if (pg) targetTitle = pg.title || "Untitled";
      return trashService.restorePage(prev, pageId);
    });

    if (!workspaceHistoryService.isExecutingUndoRedo()) {
      workspaceHistoryService.registerCommand({
        id: `restore_page_${pageId}_${Date.now()}`,
        description: "Restore Page",
        timestamp: Date.now(),
        execute: () => {
          setPages((prev) => trashService.restorePage(prev, pageId));
          setActivePageIdState(pageId);
        },
        undo: () => {
          setPages(prevPagesState);
        },
      });
    }

    notificationService.success("Page restored", `"${targetTitle}" restored from Trash.`);
  }, [pages]);

  const permanentlyDeletePage = useCallback((pageId: string) => {
    let targetTitle = "Page";
    const pg = pages.find((p) => p.id === pageId);
    if (pg) targetTitle = pg.title || "Untitled";

    setPages((prev) => trashService.permanentlyDeletePage(prev, pageId));

    // Permanent deletion clears history stack so Ctrl+Z cannot restore permanently deleted items
    workspaceHistoryService.clear();

    notificationService.info("Page deleted permanently", `"${targetTitle}" deleted.`);
  }, [pages]);

  const emptyTrash = useCallback(() => {
    setPages((prev) => trashService.emptyTrash(prev));

    // Permanent trash clear invalidates undo stack
    workspaceHistoryService.clear();

    notificationService.info("Trash emptied", "All items permanently removed.");
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
      notificationService.success("Workspace exported", `Backup created for "${workspaceName}".`);
    } catch (err: any) {
      console.error("[AppContext] Export workspace failed:", err);
      notificationService.error("Export failed", err?.message || "Failed to export workspace backup.");
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
      workspaceHistoryService.clear();
      persistenceService.saveWorkspace(snapshot);
      notificationService.success("Workspace restored", "Workspace backup restored successfully.");
      return true;
    } catch (err: any) {
      console.error("[AppContext] Import workspace failed:", err);
      notificationService.error("Import failed", err?.message || "Failed to import workspace backup archive.");
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

        notificationService.success("Page imported", `Imported "${newPage.title}" successfully.`);
        return newId;
      } catch (err: any) {
        console.error("[AppContext] Import page failed:", err);
        notificationService.error("Import failed", err?.message || "Failed to import page file.");
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
        duplicatePage,
        blockClipboard,
        setBlockClipboard,
        copyBlock,
        cutBlock,
        pasteBlock,
        isSearchOpen,
        setIsSearchOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        isTrashOpen,
        setIsTrashOpen,
        isExportOpen,
        setIsExportOpen,
        isTemplateModalOpen,
        setIsTemplateModalOpen,
        highlightedBlockId,
        setHighlightedBlockId,
        pendingSearchTarget,
        setPendingSearchTarget,
        navigateToResult,
        exportWorkspace,
        importWorkspace,
        importPage,
        canUndo: historyState.canUndo,
        canRedo: historyState.canRedo,
        undo,
        redo,
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

