import { Page } from "../types";

/**
 * Resolves the next active page ID when a page (and its subpages) is deleted or moved to trash.
 *
 * Navigation priority:
 * 1. Next visible sibling page.
 * 2. Previous visible sibling page.
 * 3. Parent page.
 * 4. First visible root page.
 * 5. Returns null if no active pages remain (caller should create/open a new page).
 */
export function resolveNextActivePage(pages: Page[], deletedPageId: string): string | null {
  const deletedPage = pages.find((p) => p.id === deletedPageId);

  if (deletedPage) {
    const parentId = deletedPage.parentId || null;

    // Get all siblings in the same array order (including deleted ones to preserve relative index)
    const siblings = pages.filter((p) => (p.parentId || null) === parentId);
    const idx = siblings.findIndex((p) => p.id === deletedPageId);

    if (idx !== -1) {
      // 1. Next visible sibling page
      for (let i = idx + 1; i < siblings.length; i++) {
        if (!siblings[i].isDeleted && siblings[i].id !== deletedPageId) {
          return siblings[i].id;
        }
      }

      // 2. Previous visible sibling page
      for (let i = idx - 1; i >= 0; i--) {
        if (!siblings[i].isDeleted && siblings[i].id !== deletedPageId) {
          return siblings[i].id;
        }
      }
    }

    // 3. Parent page (if parent exists and is visible)
    if (parentId) {
      const parentPage = pages.find((p) => p.id === parentId);
      if (parentPage && !parentPage.isDeleted && parentPage.id !== deletedPageId) {
        return parentPage.id;
      }
    }
  }

  // 4. First visible root page
  const firstRoot = pages.find((p) => !p.parentId && !p.isDeleted && p.id !== deletedPageId);
  if (firstRoot) {
    return firstRoot.id;
  }

  // Fallback: any visible page
  const anyVisible = pages.find((p) => !p.isDeleted && p.id !== deletedPageId);
  if (anyVisible) {
    return anyVisible.id;
  }

  // 5. If no active pages remain, return null
  return null;
}
