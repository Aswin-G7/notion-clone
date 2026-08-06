import JSZip from "jszip";
import { Block, Page } from "../../types";
import { ExportOptions, ExportResult, IExporter } from "./IExporter";

export class MarkdownExporter implements IExporter {
  public readonly id = "markdown";
  public readonly name = "Markdown (.md)";
  public readonly extension = ".md";
  public readonly mimeType = "text/markdown";

  public async exportPage(page: Page, options: ExportOptions = {}): Promise<ExportResult> {
    const allPages = options.allPages || [page];
    const markdown = this.pageToMarkdown(page, allPages);
    const safeTitle = this.sanitizeFilename(page.title || "Untitled");

    return {
      filename: `${safeTitle}.md`,
      mimeType: "text/markdown",
      content: markdown,
    };
  }

  public async exportWorkspace(pages: Page[], options: ExportOptions = {}): Promise<ExportResult> {
    const zip = new JSZip();
    const activePages = pages.filter((p) => !p.isDeleted);
    const rootPages = activePages.filter((p) => !p.parentId);

    for (const rootPage of rootPages) {
      this.addPageToZipFolder(zip, rootPage, "", activePages);
    }

    const zipContent = await zip.generateAsync({ type: "uint8array" });
    const wsName = this.sanitizeFilename(options.workspaceName || "Workspace");

    return {
      filename: `${wsName}_Markdown_Export.zip`,
      mimeType: "application/zip",
      content: zipContent,
    };
  }

  /**
   * Converts a single Page model to a Markdown string.
   */
  public pageToMarkdown(page: Page, allPages: Page[] = []): string {
    const lines: string[] = [];

    // Header metadata
    if (page.icon) {
      lines.push(`# ${page.icon} ${page.title || "Untitled"}`);
    } else {
      lines.push(`# ${page.title || "Untitled"}`);
    }

    if (page.coverImage) {
      lines.push(`![Cover Image](${page.coverImage})`);
    }

    lines.push(""); // empty line

    const blocks = page.blocks || [];
    const topLevelBlocks = blocks.filter((b) => !b.data.parentId);

    for (const block of topLevelBlocks) {
      lines.push(this.blockToMarkdown(block, blocks, allPages));
    }

    // Check for child pages not represented in child-page blocks
    const referencedChildPageIds = new Set(
      blocks
        .filter((b) => b.type === "child-page" && b.data.pageId)
        .map((b) => b.data.pageId!)
    );

    const unreferencedChildren = allPages.filter(
      (p) => p.parentId === page.id && !p.isDeleted && !referencedChildPageIds.has(p.id)
    );

    if (unreferencedChildren.length > 0) {
      for (const child of unreferencedChildren) {
        const icon = child.icon || "📄";
        const title = child.title || "Untitled";
        lines.push(`:::child-page\nid: ${child.id}\ntitle: ${title}\nicon: ${icon}\n:::`);
      }
    }

    return lines.join("\n\n");
  }

  /**
   * Converts a Block model to Markdown syntax.
   */
  private blockToMarkdown(block: Block, allBlocks: Block[], allPages: Page[]): string {
    const data = block.data || {};
    const text = data.text || "";

    switch (block.type) {
      case "heading": {
        const level = Math.min(Math.max(data.level || 1, 1), 6);
        const prefix = "#".repeat(level);
        return `${prefix} ${text}`;
      }

      case "paragraph":
        return text;

      case "bulleted-list":
        return `- ${text}`;

      case "numbered-list":
        return `1. ${text}`;

      case "todo":
        return `- [${data.checked ? "x" : " "}] ${text}`;

      case "quote":
        return `> ${text.split("\n").join("\n> ")}`;

      case "code": {
        const lang = data.language || "";
        return `\`\`\`${lang}\n${text}\n\`\`\``;
      }

      case "divider":
        return "---";

      case "image": {
        const caption = data.caption || "Image";
        const url = data.url || "";
        return url ? `![${caption}](${url})` : `_[Image: ${caption}]_`;
      }

      case "toggle": {
        const childBlocks = allBlocks.filter((b) => b.data.parentId === block.id);
        const childMd = childBlocks
          .map((b) => this.blockToMarkdown(b, allBlocks, allPages))
          .join("\n\n");

        const title = text || "Toggle";
        const isCollapsed = data.collapsed ? "true" : "false";
        return childMd
          ? `:::toggle\ntitle: ${title}\ncollapsed: ${isCollapsed}\n\n${childMd}\n:::`
          : `:::toggle\ntitle: ${title}\ncollapsed: ${isCollapsed}\n:::`;
      }

      case "callout": {
        const icon = data.icon || "💡";
        const bodyText = text || "";
        return `:::callout\nicon: ${icon}${bodyText ? `\n\n${bodyText}` : ""}\n:::`;
      }

      case "table": {
        if (!data.rows || data.rows.length === 0) return "";
        const rows = data.rows;
        const colCount = Math.max(...rows.map((r) => r.length));

        const tableLines: string[] = [];

        // Header row
        const headerCells = rows[0] || [];
        const formattedHeader = Array.from({ length: colCount }, (_, i) => headerCells[i] || "").join(" | ");
        tableLines.push(`| ${formattedHeader} |`);

        // Separator row
        const separator = Array.from({ length: colCount }, () => "---").join(" | ");
        tableLines.push(`| ${separator} |`);

        // Data rows
        for (let r = 1; r < rows.length; r++) {
          const rowCells = rows[r] || [];
          const formattedRow = Array.from({ length: colCount }, (_, i) => rowCells[i] || "").join(" | ");
          tableLines.push(`| ${formattedRow} |`);
        }

        return tableLines.join("\n");
      }

      case "child-page": {
        const targetPage = allPages.find((p) => p.id === data.pageId);
        const icon = targetPage?.icon || data.icon || "📄";
        const title = targetPage ? (targetPage.title || "Untitled") : text || "Sub Page";
        const pageId = data.pageId || "";
        return `:::child-page\nid: ${pageId}\ntitle: ${title}\nicon: ${icon}\n:::`;
      }

      default:
        return text;
    }
  }

  private addPageToZipFolder(
    zip: JSZip,
    page: Page,
    currentPath: string,
    allPages: Page[]
  ): void {
    const safeTitle = this.sanitizeFilename(page.title || "Untitled");
    const markdownContent = this.pageToMarkdown(page, allPages);

    const filePath = currentPath ? `${currentPath}/${safeTitle}.md` : `${safeTitle}.md`;
    zip.file(filePath, markdownContent);

    // Recursively add child pages in a subfolder
    const children = allPages.filter((p) => p.parentId === page.id && !p.isDeleted);
    if (children.length > 0) {
      const subFolder = currentPath ? `${currentPath}/${safeTitle}` : safeTitle;
      for (const child of children) {
        this.addPageToZipFolder(zip, child, subFolder, allPages);
      }
    }
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[/\\?%*:|"<>]/g, "-")
      .trim() || "Untitled";
  }
}
