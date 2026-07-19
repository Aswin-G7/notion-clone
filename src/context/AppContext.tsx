import React, { createContext, useContext, useState, useEffect } from "react";
import { Page, Block, BlockType } from "../types";

interface AppContextType {
  pages: Page[];
  activePageId: string | null;
  activePage: Page | null;
  sidebarOpen: boolean;
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setActivePageId: (id: string | null) => void;
  createPage: (parentId?: string | null, insertAfterBlockId?: string | null) => string;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY = "notion_clone_pages";
const ACTIVE_PAGE_KEY = "notion_clone_active_page_id";

const DEFAULT_PAGES: Page[] = [
  {
    id: "getting-started",
    title: "🚀 Getting Started",
    icon: "🚀",
    coverImage: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=1200&auto=format&fit=crop",
    isFavorite: true,
    parentId: null,
    children: [],
    blocks: [
      {
        id: "gs-b1",
        type: "heading",
        data: { text: "Welcome to your custom Notion Workspace!", level: 1 }
      },
      {
        id: "gs-b2",
        type: "paragraph",
        data: { text: "This is a beautiful, production-quality Notion Clone built using React, TypeScript, and Tailwind CSS." }
      },
      {
        id: "gs-b3",
        type: "heading",
        data: { text: "Features:", level: 2 }
      },
      {
        id: "gs-b4",
        type: "paragraph",
        data: { text: "• Interactive Sidebar: Organize, add, and delete pages seamlessly." }
      },
      {
        id: "gs-b5",
        type: "paragraph",
        data: { text: "• Dynamic Child Pages: Create nested subpages directly within the document flow as inline block cards." }
      },
      {
        id: "gs-b6",
        type: "paragraph",
        data: { text: "• Real-time Sync: Auto-saves any modifications to local storage immediately." }
      }
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "daily-notes",
    title: "📝 Daily Journal",
    icon: "📝",
    coverImage: "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=1200&auto=format&fit=crop",
    parentId: null,
    children: [],
    blocks: [
      {
        id: "dn-b1",
        type: "heading",
        data: { text: "Journal Entries", level: 2 }
      },
      {
        id: "dn-b2",
        type: "paragraph",
        data: { text: "Use this space to track your daily highlights, reflections, and tasks." }
      },
      {
        id: "dn-b3",
        type: "paragraph",
        data: { text: "• Practice React and Tailwind for 1 hour" }
      },
      {
        id: "dn-b4",
        type: "paragraph",
        data: { text: "• Review project architecture" }
      }
    ],
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: "recipes",
    title: "🍳 Quick Recipes",
    icon: "🍳",
    parentId: null,
    children: [],
    blocks: [
      {
        id: "qr-b1",
        type: "heading",
        data: { text: "My Favorite Quick Meal: Avocado Toast with Poached Egg", level: 3 }
      },
      {
        id: "qr-b2",
        type: "paragraph",
        data: { text: "Ingredients: 1 slice sourdough bread, 1/2 ripe avocado, 1 fresh egg, salt & pepper." }
      }
    ],
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now() - 7200000,
  }
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pages, setPages] = useState<Page[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((p: any) => {
          let blocks = p.blocks || [];
          if (blocks.length === 0 && p.content) {
            blocks = [{
              id: `block-conv-${Math.random().toString(36).substr(2, 9)}`,
              type: "paragraph",
              data: { text: p.content }
            }];
          }
          return {
            ...p,
            children: p.children || [],
            blocks,
          };
        });
      } catch (e) {
        console.error("Error parsing saved pages:", e);
      }
    }
    return DEFAULT_PAGES;
  });

  const [activePageId, setActivePageIdState] = useState<string | null>(() => {
    const saved = localStorage.getItem(ACTIVE_PAGE_KEY);
    if (saved) {
      return saved;
    }
    return DEFAULT_PAGES[0]?.id || null;
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
  }, [pages]);

  const setActivePageId = (id: string | null) => {
    setActivePageIdState(id);
    setSelectedBlockId(null);
    if (id) {
      localStorage.setItem(ACTIVE_PAGE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PAGE_KEY);
    }
  };

  const createPage = (parentId: string | null = null, insertAfterBlockId?: string | null) => {
    const newId = `page-${Math.random().toString(36).substr(2, 9)}`;
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
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

  const deletePage = (id: string) => {
    const deleteRecursive = (idToDelete: string, allPages: Page[]): Page[] => {
      let pagesToKeep = allPages.filter((p) => p.id !== idToDelete);
      const children = allPages.filter((p) => p.parentId === idToDelete);
      for (const child of children) {
        pagesToKeep = deleteRecursive(child.id, pagesToKeep);
      }
      return pagesToKeep;
    };

    setPages((prev) => {
      const pageToDelete = prev.find((p) => p.id === id);
      const parentId = pageToDelete?.parentId;

      let updated = deleteRecursive(id, prev);

      if (parentId) {
        updated = updated.map((page) => {
          if (page.id === parentId) {
            return {
              ...page,
              children: (page.children || []).filter((childId) => childId !== id),
              blocks: page.blocks.filter((b) => !(b.type === "child-page" && b.data.pageId === id)),
              updatedAt: Date.now(),
            };
          }
          return page;
        });
      }
      
      const remainsActive = updated.some((p) => p.id === activePageId);
      if (!remainsActive) {
        if (updated.length > 0) {
          const roots = updated.filter((p) => !p.parentId);
          setActivePageId(roots.length > 0 ? roots[0].id : updated[0].id);
        } else {
          setActivePageId(null);
        }
      }
      return updated;
    });
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

  const addBlock = (
    pageId: string,
    type: BlockType,
    text = "",
    insertAfterBlockId?: string | null,
    extraData?: Partial<Block["data"]>
  ) => {
    const newBlockId = `block-${Math.random().toString(36).substr(2, 9)}`;
    const newBlock: Block = {
      id: newBlockId,
      type,
      data: {
        text,
        level: type === "heading" ? 2 : undefined,
        checked: type === "todo" ? false : undefined,
        ...extraData
      }
    };

    setPages((prev) =>
      prev.map((page) => {
        if (page.id !== pageId) return page;

        let newBlocks = [...page.blocks];
        if (insertAfterBlockId) {
          const idx = newBlocks.findIndex((b) => b.id === insertAfterBlockId);
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

        // If it's a child-page block, we should keep the subpage itself but just remove the block from the flow,
        // or optionally delete the page. According to standard Notion, deleting the page link block can delete the subpage,
        // or just sever the link. To be safe & complete, if a child-page block is deleted, we also delete the page itself.
        const blockToDelete = page.blocks.find((b) => b.id === blockId);
        
        // Return page with updated blocks
        const nextBlocks = page.blocks.filter((block) => block.id !== blockId);
        return {
          ...page,
          blocks: nextBlocks,
          updatedAt: Date.now()
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

  const activePage = pages.find((page) => page.id === activePageId) || null;

  return (
    <AppContext.Provider
      value={{
        pages,
        activePageId,
        activePage,
        sidebarOpen,
        selectedBlockId,
        setSelectedBlockId,
        setSidebarOpen,
        setActivePageId,
        createPage,
        deletePage,
        updatePage,
        addBlock,
        updateBlock,
        updateBlockType,
        updateBlockData,
        deleteBlock,
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

