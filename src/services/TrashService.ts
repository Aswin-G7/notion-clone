import { Page } from "../types";

export class TrashService {
  /**
   * Returns pages that are trashed (isDeleted === true), sorted by deletedAt descending.
   */
  public getTrashPages(pages: Page[]): Page[] {
    return pages
      .filter((page) => Boolean(page.isDeleted))
      .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  }

  /**
   * Returns root trashed pages (isDeleted === true and parent is not deleted or null).
   * Sorted by deletedAt descending.
   */
  public getRootTrashPages(pages: Page[]): Page[] {
    return pages
      .filter((page) => {
        if (!page.isDeleted) return false;
        if (!page.parentId) return true;
        const parent = pages.find((p) => p.id === page.parentId);
        return !parent || !parent.isDeleted;
      })
      .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
  }

  /**
   * Returns direct trashed children of a given page.
   */
  public getTrashChildren(pages: Page[], parentId: string): Page[] {
    return pages.filter((page) => page.parentId === parentId && Boolean(page.isDeleted));
  }

  /**
   * Counts total deleted descendants of a given trashed page.
   */
  public countTrashDescendants(pages: Page[], pageId: string): number {
    const children = this.getTrashChildren(pages, pageId);
    let count = children.length;
    for (const child of children) {
      count += this.countTrashDescendants(pages, child.id);
    }
    return count;
  }

  /**
   * Checks if a trashed page or any of its trashed descendants matches the search query.
   */
  public hasMatchInTrashSubtree(pages: Page[], pageId: string, query: string): boolean {
    return this.isTrashItemInSearchContext(pages, pageId, query);
  }

  /**
   * Checks if any trashed descendant matches query.
   */
  public hasDescendantMatchInTrash(pages: Page[], pageId: string, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    const children = this.getTrashChildren(pages, pageId);
    for (const child of children) {
      if (child.title.toLowerCase().includes(q)) return true;
      if (this.hasDescendantMatchInTrash(pages, child.id, q)) return true;
    }
    return false;
  }

  /**
   * Checks if a trashed page or any of its deleted ancestors or descendants matches the search query.
   */
  public isTrashItemInSearchContext(pages: Page[], pageId: string, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    const page = pages.find((p) => p.id === pageId);
    if (!page || !page.isDeleted) return false;

    if (page.title.toLowerCase().includes(q)) return true;

    if (this.hasDescendantMatchInTrash(pages, pageId, q)) return true;

    let curr = page;
    while (curr && curr.parentId) {
      const parent = pages.find((p) => p.id === curr.parentId);
      if (parent && parent.isDeleted) {
        if (parent.title.toLowerCase().includes(q)) return true;
        curr = parent;
      } else {
        break;
      }
    }

    return false;
  }

  /**
   * Returns all active (non-deleted) pages.
   */
  public getActivePages(pages: Page[]): Page[] {
    return pages.filter((page) => !page.isDeleted);
  }

  /**
   * Recursively soft-deletes a page and all its descendant pages.
   * Sets isDeleted = true, deletedAt = timestamp, removes from Favorites.
   * Keeps parentId and children hierarchy data intact.
   */
  public softDeletePage(pages: Page[], pageId: string): Page[] {
    const now = Date.now();
    const idsToDelete = new Set<string>();

    const collectDescendants = (id: string) => {
      idsToDelete.add(id);
      const page = pages.find((p) => p.id === id);
      if (page) {
        const childPages = pages.filter((p) => p.parentId === id);
        for (const child of childPages) {
          collectDescendants(child.id);
        }
        if (page.children && Array.isArray(page.children)) {
          for (const childId of page.children) {
            collectDescendants(childId);
          }
        }
      }
    };

    collectDescendants(pageId);

    return pages.map((page) => {
      if (idsToDelete.has(page.id)) {
        return {
          ...page,
          isDeleted: true,
          deletedAt: page.deletedAt || now,
          isFavorite: false,
          favoriteOrder: undefined,
          updatedAt: now,
        };
      }
      return page;
    });
  }

  /**
   * Restores a trashed page and all its descendant pages.
   * Clears isDeleted and deletedAt.
   * Also restores deleted parent ancestors if needed so hierarchy stays connected.
   */
  public restorePage(pages: Page[], pageId: string): Page[] {
    const now = Date.now();
    const idsToRestore = new Set<string>();

    const collectDescendants = (id: string) => {
      idsToRestore.add(id);
      const page = pages.find((p) => p.id === id);
      if (page) {
        const childPages = pages.filter((p) => p.parentId === id);
        for (const child of childPages) {
          collectDescendants(child.id);
        }
        if (page.children && Array.isArray(page.children)) {
          for (const childId of page.children) {
            collectDescendants(childId);
          }
        }
      }
    };

    collectDescendants(pageId);

    // Restore deleted ancestors so the restored branch remains connected to the tree
    let curr = pages.find((p) => p.id === pageId);
    while (curr && curr.parentId) {
      const parent = pages.find((p) => p.id === curr!.parentId);
      if (parent && parent.isDeleted) {
        idsToRestore.add(parent.id);
        curr = parent;
      } else {
        break;
      }
    }

    return pages.map((page) => {
      if (idsToRestore.has(page.id)) {
        return {
          ...page,
          isDeleted: false,
          deletedAt: null,
          updatedAt: now,
        };
      }
      return page;
    });
  }

  /**
   * Permanently deletes a page and all its descendants.
   */
  public permanentlyDeletePage(pages: Page[], pageId: string): Page[] {
    const idsToRemove = new Set<string>();

    const collectDescendants = (id: string) => {
      idsToRemove.add(id);
      const page = pages.find((p) => p.id === id);
      if (page) {
        const childPages = pages.filter((p) => p.parentId === id);
        for (const child of childPages) {
          collectDescendants(child.id);
        }
        if (page.children && Array.isArray(page.children)) {
          for (const childId of page.children) {
            collectDescendants(childId);
          }
        }
      }
    };

    collectDescendants(pageId);

    let remaining = pages.filter((p) => !idsToRemove.has(p.id));

    remaining = remaining.map((page) => {
      const hasChildToRemove = page.children?.some((childId) => idsToRemove.has(childId));
      const hasBlockToRemove = page.blocks?.some(
        (b) => b.type === "child-page" && b.data.pageId && idsToRemove.has(b.data.pageId)
      );

      if (hasChildToRemove || hasBlockToRemove) {
        return {
          ...page,
          children: (page.children || []).filter((childId) => !idsToRemove.has(childId)),
          blocks: page.blocks.filter(
            (b) => !(b.type === "child-page" && b.data.pageId && idsToRemove.has(b.data.pageId))
          ),
          updatedAt: Date.now(),
        };
      }
      return page;
    });

    return remaining;
  }

  /**
   * Empties all items currently in trash.
   */
  public emptyTrash(pages: Page[]): Page[] {
    const trashedIds = new Set(pages.filter((p) => p.isDeleted).map((p) => p.id));
    if (trashedIds.size === 0) return pages;

    let remaining = pages.filter((p) => !p.isDeleted);

    remaining = remaining.map((page) => {
      return {
        ...page,
        children: (page.children || []).filter((childId) => !trashedIds.has(childId)),
        blocks: page.blocks.filter(
          (b) => !(b.type === "child-page" && b.data.pageId && trashedIds.has(b.data.pageId))
        ),
      };
    });

    return remaining;
  }
}

export const trashService = new TrashService();
