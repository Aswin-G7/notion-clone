import { Page } from "../../types";
import { ExportOptions, ExportResult, IExporter } from "./IExporter";
import { HTMLExporter } from "./HTMLExporter";

export class PDFExporter implements IExporter {
  public readonly id = "pdf";
  public readonly name = "PDF (.pdf)";
  public readonly extension = ".pdf";
  public readonly mimeType = "application/pdf";

  private htmlExporter = new HTMLExporter();

  public async exportPage(page: Page, options: ExportOptions = {}): Promise<ExportResult> {
    const allPages = options.allPages || [page];
    const html = this.htmlExporter.pageToHTML(page, allPages);
    const safeTitle = this.sanitizeFilename(page.title || "Untitled");

    // Enhance HTML for PDF print styling
    const pdfPrintHtml = this.enhanceForPdfPrint(html);

    // Trigger printable PDF dialog in client/Electron
    this.triggerPrintPdf(pdfPrintHtml, `${safeTitle}.pdf`);

    return {
      filename: `${safeTitle}.pdf`,
      mimeType: "application/pdf",
      content: pdfPrintHtml,
    };
  }

  public async exportWorkspace(pages: Page[], options: ExportOptions = {}): Promise<ExportResult> {
    const activePages = pages.filter((p) => !p.isDeleted);
    const wsName = this.sanitizeFilename(options.workspaceName || "Workspace");

    // Concatenate printable pages with clean page breaks
    const concatenatedHtml = this.generateMultiPagePdfHtml(activePages, wsName);

    this.triggerPrintPdf(concatenatedHtml, `${wsName}_PDF_Export.pdf`);

    return {
      filename: `${wsName}_PDF_Export.pdf`,
      mimeType: "application/pdf",
      content: concatenatedHtml,
    };
  }

  private enhanceForPdfPrint(html: string): string {
    const printCss = `
      @page {
        size: letter;
        margin: 20mm 15mm 20mm 15mm;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #111827;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .container {
        width: 100% !important;
        max-width: none !important;
        padding: 0 !important;
      }
      .page-break {
        page-break-after: always;
        break-after: page;
      }
      table, pre, blockquote, .callout, .image-block, details {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      h1, h2, h3, h4 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    `;

    return html.replace("</head>", `<style>${printCss}</style></head>`);
  }

  private generateMultiPagePdfHtml(pages: Page[], wsName: string): string {
    const pageHtmls = pages.map((page, index) => {
      const singleHtml = this.htmlExporter.pageToHTML(page, pages);
      // Extract inner content inside <div class="container">
      const match = singleHtml.match(/<div class="container">([\s\S]*?)<\/div>\s*<\/body>/);
      const innerContent = match ? match[1] : "";

      return `<div class="container ${index < pages.length - 1 ? "page-break" : ""}">
        ${innerContent}
      </div>`;
    }).join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${wsName} PDF Export</title>
  <style>
    @page {
      size: letter;
      margin: 20mm 15mm 20mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #111827;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      padding: 0;
      margin: 0;
    }
    .container {
      width: 100%;
      margin-bottom: 40px;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    .cover-image { width: 100%; height: 200px; object-fit: cover; border-radius: 6px; margin-bottom: 20px; }
    .page-header { margin-bottom: 24px; }
    .page-icon { font-size: 40px; margin-bottom: 6px; display: block; }
    .page-title { font-size: 32px; font-weight: 700; color: #111827; }
    p { margin-bottom: 12px; font-size: 15px; color: #374151; }
    h1 { font-size: 26px; font-weight: 700; margin-top: 24px; margin-bottom: 12px; }
    h2 { font-size: 20px; font-weight: 600; margin-top: 20px; margin-bottom: 10px; }
    h3 { font-size: 17px; font-weight: 600; margin-top: 16px; margin-bottom: 8px; }
    ul, ol { margin-bottom: 16px; padding-left: 24px; }
    pre { background: #0d1117; color: #e6edf3; padding: 14px; border-radius: 6px; font-size: 13px; page-break-inside: avoid; }
    code { font-family: monospace; background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
    pre code { background: transparent; padding: 0; color: inherit; }
    blockquote { border-left: 4px solid #e5e7eb; padding-left: 14px; color: #4b5563; font-style: italic; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; page-break-inside: avoid; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; font-size: 14px; }
    th { background: #f1f5f9; font-weight: 600; }
    .callout { display: flex; gap: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; page-break-inside: avoid; }
    details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin: 10px 0; page-break-inside: avoid; }
  </style>
</head>
<body>
  ${pageHtmls}
</body>
</html>`;
  }

  private triggerPrintPdf(htmlContent: string, title: string): void {
    if (typeof window === "undefined") return;

    try {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.title = title;
        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
          printWindow.print();
        }, 300);
      }
    } catch (err) {
      console.warn("[PDFExporter] Could not open print window, falling back to window.print():", err);
      window.print();
    }
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[/\\?%*:|"<>]/g, "-").trim() || "Untitled";
  }
}
