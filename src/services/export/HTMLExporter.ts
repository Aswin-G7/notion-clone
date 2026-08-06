import JSZip from "jszip";
import { Block, Page } from "../../types";
import { ExportOptions, ExportResult, IExporter } from "./IExporter";

export class HTMLExporter implements IExporter {
  public readonly id = "html";
  public readonly name = "HTML (.html)";
  public readonly extension = ".html";
  public readonly mimeType = "text/html";

  public async exportPage(page: Page, options: ExportOptions = {}): Promise<ExportResult> {
    const allPages = options.allPages || [page];
    const htmlContent = this.pageToHTML(page, allPages);
    const safeTitle = this.sanitizeFilename(page.title || "Untitled");

    return {
      filename: `${safeTitle}.html`,
      mimeType: "text/html",
      content: htmlContent,
    };
  }

  public async exportWorkspace(pages: Page[], options: ExportOptions = {}): Promise<ExportResult> {
    const zip = new JSZip();
    const activePages = pages.filter((p) => !p.isDeleted);
    const wsName = this.sanitizeFilename(options.workspaceName || "Workspace");

    for (const page of activePages) {
      const htmlContent = this.pageToHTML(page, activePages);
      const safeTitle = this.sanitizeFilename(page.title || "Untitled");
      zip.file(`${safeTitle}_${page.id.slice(0, 6)}.html`, htmlContent);
    }

    // Include an index.html listing all pages
    const indexHtml = this.generateIndexHTML(activePages, wsName);
    zip.file("index.html", indexHtml);

    const zipContent = await zip.generateAsync({ type: "uint8array" });

    return {
      filename: `${wsName}_HTML_Export.zip`,
      mimeType: "application/zip",
      content: zipContent,
    };
  }

  public pageToHTML(page: Page, allPages: Page[] = []): string {
    const title = page.title || "Untitled Page";
    const icon = page.icon || "";
    const coverImage = page.coverImage || "";
    const blocks = page.blocks || [];

    const topLevelBlocks = blocks.filter((b) => !b.data.parentId);
    const bodyHtml = topLevelBlocks
      .map((b) => this.blockToHTML(b, blocks, allPages))
      .join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
    /* CSS Reset & Base Styling */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      background-color: #ffffff;
      line-height: 1.6;
      padding: 0;
      margin: 0;
      display: flex;
      justify-content: center;
    }

    .container {
      width: 100%;
      max-width: 800px;
      padding: 40px 24px 80px 24px;
    }

    /* Cover Image */
    .cover-image {
      width: 100%;
      height: 220px;
      object-fit: cover;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    /* Page Header */
    .page-header {
      margin-bottom: 32px;
    }

    .page-icon {
      font-size: 48px;
      margin-bottom: 8px;
      display: block;
    }

    .page-title {
      font-size: 36px;
      font-weight: 700;
      color: #111827;
      line-height: 1.25;
      letter-spacing: -0.02em;
    }

    /* Typography & Block Styles */
    p {
      margin-bottom: 12px;
      font-size: 16px;
      color: #374151;
    }

    h1, h2, h3, h4, h5, h6 {
      color: #111827;
      font-weight: 600;
      margin-top: 24px;
      margin-bottom: 12px;
      line-height: 1.3;
    }

    h1 { font-size: 28px; }
    h2 { font-size: 22px; }
    h3 { font-size: 18px; }

    /* Lists */
    ul, ol {
      margin-bottom: 16px;
      padding-left: 24px;
    }

    li {
      margin-bottom: 4px;
      color: #374151;
    }

    /* Todo list */
    .todo-item {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
      list-style-type: none;
    }

    .todo-checkbox {
      width: 18px;
      height: 18px;
      accent-color: #2563eb;
    }

    .todo-text.checked {
      text-decoration: line-through;
      color: #9ca3af;
    }

    /* Blockquote */
    blockquote {
      border-left: 4px solid #e5e7eb;
      padding-left: 16px;
      color: #4b5563;
      font-style: italic;
      margin: 16px 0;
    }

    /* Code Block */
    pre {
      background-color: #0d1117;
      color: #e6edf3;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 14px;
      line-height: 1.5;
      margin: 16px 0;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 14px;
      color: #1f2937;
    }

    pre code {
      background-color: transparent;
      padding: 0;
      color: inherit;
    }

    /* Divider */
    hr {
      border: 0;
      border-top: 1px solid #e5e7eb;
      margin: 24px 0;
    }

    /* Images */
    .image-block {
      margin: 20px 0;
    }

    .image-block img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .image-caption {
      font-size: 13px;
      color: #6b7280;
      text-align: center;
      margin-top: 6px;
    }

    /* Callout */
    .callout {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }

    .callout-icon {
      font-size: 20px;
      line-height: 1;
    }

    .callout-text {
      flex: 1;
      font-size: 15px;
      color: #1f2937;
    }

    /* Toggle */
    details {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 12px 0;
    }

    summary {
      font-weight: 600;
      cursor: pointer;
      color: #1e293b;
    }

    .toggle-content {
      margin-top: 12px;
      padding-left: 12px;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }

    th, td {
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      text-align: left;
    }

    th {
      background-color: #f1f5f9;
      font-weight: 600;
      color: #0f172a;
    }

    /* Child Page Link */
    .child-page-card {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      text-decoration: none;
      color: #2563eb;
      font-weight: 500;
      margin: 6px 0;
      transition: background-color 0.15s;
    }

    .child-page-card:hover {
      background-color: #f1f5f9;
    }

    /* Print Specific Styling */
    @media print {
      body {
        background-color: #ffffff;
      }
      .container {
        padding: 0;
        max-width: 100%;
      }
      details {
        open: true;
      }
      pre, blockquote, table, .callout, .image-block {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      h1, h2, h3 {
        break-after: avoid;
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${coverImage ? `<img class="cover-image" src="${this.escapeHtml(coverImage)}" alt="Cover" />` : ""}
    <header class="page-header">
      ${icon ? `<span class="page-icon">${this.escapeHtml(icon)}</span>` : ""}
      <h1 class="page-title">${this.escapeHtml(title)}</h1>
    </header>

    <main class="page-content">
      ${bodyHtml}
    </main>
  </div>
</body>
</html>`;
  }

  private blockToHTML(block: Block, allBlocks: Block[], allPages: Page[]): string {
    const data = block.data || {};
    const text = data.text || "";

    switch (block.type) {
      case "heading": {
        const level = Math.min(Math.max(data.level || 1, 1), 6);
        return `<h${level}>${this.escapeHtml(text)}</h${level}>`;
      }

      case "paragraph":
        return `<p>${this.escapeHtml(text)}</p>`;

      case "bulleted-list":
        return `<ul><li>${this.escapeHtml(text)}</li></ul>`;

      case "numbered-list":
        return `<ol><li>${this.escapeHtml(text)}</li></ol>`;

      case "todo":
        return `<div class="todo-item">
          <input type="checkbox" class="todo-checkbox" ${data.checked ? "checked" : ""} disabled />
          <span class="todo-text ${data.checked ? "checked" : ""}">${this.escapeHtml(text)}</span>
        </div>`;

      case "quote":
        return `<blockquote>${this.escapeHtml(text)}</blockquote>`;

      case "code":
        return `<pre><code>${this.escapeHtml(text)}</code></pre>`;

      case "divider":
        return "<hr />";

      case "image": {
        const url = data.url || "";
        const caption = data.caption || "";
        if (!url) return "";
        return `<div class="image-block">
          <img src="${this.escapeHtml(url)}" alt="${this.escapeHtml(caption)}" />
          ${caption ? `<div class="image-caption">${this.escapeHtml(caption)}</div>` : ""}
        </div>`;
      }

      case "toggle": {
        const childBlocks = allBlocks.filter((b) => b.data.parentId === block.id);
        const childHtml = childBlocks
          .map((b) => this.blockToHTML(b, allBlocks, allPages))
          .join("\n");

        return `<details open>
          <summary>${this.escapeHtml(text || "Toggle")}</summary>
          <div class="toggle-content">${childHtml}</div>
        </details>`;
      }

      case "callout": {
        const icon = data.icon || "💡";
        return `<div class="callout">
          <span class="callout-icon">${this.escapeHtml(icon)}</span>
          <div class="callout-text">${this.escapeHtml(text)}</div>
        </div>`;
      }

      case "table": {
        if (!data.rows || data.rows.length === 0) return "";
        const rows = data.rows;
        const headerRow = rows[0] || [];

        const headerHtml = `<tr>${headerRow.map((cell) => `<th>${this.escapeHtml(cell)}</th>`).join("")}</tr>`;
        const bodyRowsHtml = rows
          .slice(1)
          .map((row) => `<tr>${row.map((cell) => `<td>${this.escapeHtml(cell)}</td>`).join("")}</tr>`)
          .join("\n");

        return `<table>
          <thead>${headerHtml}</thead>
          <tbody>${bodyRowsHtml}</tbody>
        </table>`;
      }

      case "child-page": {
        const targetPage = allPages.find((p) => p.id === data.pageId);
        const childTitle = targetPage ? targetPage.title : text || "Child Page";
        const childIcon = targetPage?.icon || "📄";
        return `<a class="child-page-card" href="#">${this.escapeHtml(childIcon)} ${this.escapeHtml(childTitle)}</a>`;
      }

      default:
        return `<p>${this.escapeHtml(text)}</p>`;
    }
  }

  private generateIndexHTML(pages: Page[], wsName: string): string {
    const listItems = pages
      .map((p) => {
        const safeTitle = this.sanitizeFilename(p.title || "Untitled");
        const filename = `${safeTitle}_${p.id.slice(0, 6)}.html`;
        const icon = p.icon || "📄";
        return `<li><a href="${filename}">${this.escapeHtml(icon)} ${this.escapeHtml(p.title || "Untitled")}</a></li>`;
      })
      .join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(wsName)} Workspace Export</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #111827; }
    h1 { margin-bottom: 24px; font-size: 28px; }
    ul { list-style: none; padding: 0; }
    li { margin-bottom: 12px; }
    a { color: #2563eb; text-decoration: none; font-size: 18px; font-weight: 500; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>${this.escapeHtml(wsName)} Exported Pages</h1>
  <ul>
    ${listItems}
  </ul>
</body>
</html>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[/\\?%*:|"<>]/g, "-").trim() || "Untitled";
  }
}
