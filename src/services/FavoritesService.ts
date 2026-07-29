import { Page } from "../types";

export class FavoritesService {
  /**
   * Returns favorite pages sorted by `favoriteOrder` (or fallback to creation order).
   */
  public getFavoritePages(pages: Page[]): Page[] {
    const favorites = pages.filter((page) => Boolean(page.isFavorite) && !page.isDeleted);

    return favorites.sort((a, b) => {
      const orderA = a.favoriteOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.favoriteOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.createdAt - b.createdAt;
    });
  }

  /**
   * Reorders favorite pages by moving `draggedId` to the position of `targetId`.
   * Modifies only `favoriteOrder` on pages and strictly preserves normal page hierarchy.
   */
  public reorderFavorites(pages: Page[], draggedId: string, targetId: string): Page[] {
    const currentFavs = this.getFavoritePages(pages);
    const draggedIdx = currentFavs.findIndex((p) => p.id === draggedId);
    const targetIdx = currentFavs.findIndex((p) => p.id === targetId);

    if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) {
      return pages;
    }

    const reordered = [...currentFavs];
    const [draggedPage] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, draggedPage);

    const orderMap = new Map<string, number>();
    reordered.forEach((p, idx) => {
      orderMap.set(p.id, idx);
    });

    return pages.map((page) => {
      if (orderMap.has(page.id)) {
        return {
          ...page,
          favoriteOrder: orderMap.get(page.id),
        };
      }
      return page;
    });
  }

  /**
   * Toggles `isFavorite` for a page.
   * If adding to favorites, assigns a new `favoriteOrder` at the end of current list.
   */
  public toggleFavorite(pages: Page[], pageId: string): Page[] {
    const targetPage = pages.find((p) => p.id === pageId);
    if (!targetPage) return pages;

    const willBeFavorite = !targetPage.isFavorite;

    if (willBeFavorite) {
      const currentFavs = this.getFavoritePages(pages);
      const maxOrder = currentFavs.reduce((max, p) => Math.max(max, p.favoriteOrder ?? 0), 0);
      const newOrder = maxOrder + 1;

      return pages.map((p) =>
        p.id === pageId
          ? { ...p, isFavorite: true, favoriteOrder: newOrder, updatedAt: Date.now() }
          : p
      );
    } else {
      return pages.map((p) =>
        p.id === pageId
          ? { ...p, isFavorite: false, favoriteOrder: undefined, updatedAt: Date.now() }
          : p
      );
    }
  }
}

export const favoritesService = new FavoritesService();
