import { Page, Block, BlockType } from "../types";

export interface SearchResultItem {
  pageId: string;
  blockId: string | null; // null for page title match
  blockType: BlockType | "title";
  text: string;
  snippet: string;
  matchStart: number; // index within snippet
  matchEnd: number;   // index within snippet
  rawMatchStart: number; // index within raw text
  rawMatchEnd: number;   // index within raw text
}

export interface SearchResultGroup {
  pageId: string;
  pageTitle: string;
  pageIcon?: string;
  matches: SearchResultItem[];
}

export interface IndexEntry {
  pageId: string;
  blockId: string | null;
  blockType: BlockType | "title";
  text: string;
}

export class SearchService {
  private index: Map<string, IndexEntry[]> = new Map();

  /**
   * Rebuild the search index for all given pages.
   */
  public buildIndex(pages: Page[]): void {
    this.index.clear();
    for (const page of pages) {
      this.updateIndex(page);
    }
  }

  /**
   * Incrementally update or index a single page.
   */
  public updateIndex(page: Page): void {
    const entries: IndexEntry[] = [];

    // 1. Index Page Title
    const titleText = page.title || "Untitled";
    entries.push({
      pageId: page.id,
      blockId: null,
      blockType: "title",
      text: titleText,
    });

    // 2. Index Page Blocks
    if (page.blocks && Array.isArray(page.blocks)) {
      for (const block of page.blocks) {
        const text = this.extractTextFromBlock(block);
        if (text && text.trim().length > 0) {
          entries.push({
            pageId: page.id,
            blockId: block.id,
            blockType: block.type,
            text,
          });
        }
      }
    }

    this.index.set(page.id, entries);
  }

  /**
   * Remove a page from the search index.
   */
  public removePage(pageId: string): void {
    this.index.delete(pageId);
  }

  /**
   * Extract searchable plain text from a block depending on its type.
   */
  private extractTextFromBlock(block: Block): string {
    if (!block || !block.data) return "";

    switch (block.type) {
      case "paragraph":
      case "heading":
      case "bulleted-list":
      case "numbered-list":
      case "todo":
      case "quote":
      case "toggle":
      case "callout":
      case "child-page":
        return block.data.text || "";

      case "code":
        return [block.data.language, block.data.text].filter(Boolean).join(" ");

      case "image":
        return block.data.caption || "";

      case "table": {
        if (block.data.rows && Array.isArray(block.data.rows)) {
          const cells: string[] = [];
          for (const row of block.data.rows) {
            if (Array.isArray(row)) {
              for (const cell of row) {
                if (typeof cell === "string" && cell.trim()) {
                  cells.push(cell.trim());
                }
              }
            }
          }
          return cells.join(" ");
        }
        return "";
      }

      default:
        return block.data.text || "";
    }
  }

  /**
   * Search across the workspace index and return results grouped by page.
   */
  public search(query: string, pages: Page[]): SearchResultGroup[] {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return [];

    const pageMap = new Map<string, Page>(pages.map((p) => [p.id, p]));
    const results: SearchResultGroup[] = [];

    for (const [pageId, entries] of this.index.entries()) {
      const page = pageMap.get(pageId);
      if (!page) continue;

      const matchedItems: SearchResultItem[] = [];

      for (const entry of entries) {
        const lowerText = entry.text.toLowerCase();
        const matchIdx = lowerText.indexOf(trimmedQuery);

        if (matchIdx !== -1) {
          // Generate a snippet centered around the matching position
          const start = Math.max(0, matchIdx - 25);
          const end = Math.min(entry.text.length, matchIdx + trimmedQuery.length + 45);

          let snippet = entry.text.substring(start, end);
          let matchStartInSnippet = matchIdx - start;

          if (start > 0) {
            snippet = "..." + snippet;
            matchStartInSnippet += 3;
          }
          if (end < entry.text.length) {
            snippet = snippet + "...";
          }

          matchedItems.push({
            pageId: entry.pageId,
            blockId: entry.blockId,
            blockType: entry.blockType,
            text: entry.text,
            snippet,
            matchStart: matchStartInSnippet,
            matchEnd: matchStartInSnippet + trimmedQuery.length,
            rawMatchStart: matchIdx,
            rawMatchEnd: matchIdx + trimmedQuery.length,
          });
        }
      }

      if (matchedItems.length > 0) {
        results.push({
          pageId,
          pageTitle: page.title || "Untitled",
          pageIcon: page.icon,
          matches: matchedItems,
        });
      }
    }

    return results;
  }
}

export const searchService = new SearchService();
