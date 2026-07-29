import { Page } from "../types";

export class RecentPagesService {
  /**
   * Returns recent pages sorted descending by `lastOpenedAt`.
   * Filters out deleted pages and pages without valid `lastOpenedAt`.
   * Limits results to `limit` items (default: 20).
   */
  public getRecentPages(pages: Page[], limit: number = 20): Page[] {
    const recentPages = pages.filter(
      (page) => !page.isDeleted && page.lastOpenedAt != null && page.lastOpenedAt > 0
    );

    return recentPages
      .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))
      .slice(0, limit);
  }
}

export const recentPagesService = new RecentPagesService();
