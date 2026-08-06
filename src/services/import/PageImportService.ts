import { IPageImporter, ParsedPageData } from "./IPageImporter";
import { MarkdownImporter } from "./MarkdownImporter";

export class PageImportService {
  private importers: IPageImporter[] = [];

  constructor() {
    // Register default page importers
    this.registerImporter(new MarkdownImporter());
  }

  /**
   * Registers a new page importer (e.g. for HTML, DOCX, etc.)
   */
  public registerImporter(importer: IPageImporter): void {
    // Avoid duplicate registration
    if (!this.importers.some((imp) => imp.id === importer.id)) {
      this.importers.push(importer);
    }
  }

  /**
   * Returns a list of supported file extensions (e.g. ['md', 'markdown'])
   */
  public getSupportedExtensions(): string[] {
    const exts = new Set<string>();
    for (const imp of this.importers) {
      for (const ext of imp.supportedExtensions) {
        exts.add(ext);
      }
    }
    return Array.from(exts);
  }

  /**
   * Formats extensions as accept filter string (e.g. ".md,.markdown")
   */
  public getAcceptFilter(): string {
    return this.getSupportedExtensions()
      .map((ext) => `.${ext}`)
      .join(",");
  }

  /**
   * Checks if a filename can be imported as a page.
   */
  public canImport(filename: string): boolean {
    return this.importers.some((imp) => imp.canImport(filename));
  }

  /**
   * Parses document content into structured page data.
   */
  public async importPage(
    filename: string,
    content: string | Uint8Array
  ): Promise<ParsedPageData> {
    const importer = this.importers.find((imp) => imp.canImport(filename));
    if (!importer) {
      const supported = this.getSupportedExtensions()
        .map((e) => `.${e}`)
        .join(", ");
      throw new Error(
        `Unsupported page import format for "${filename}". Supported formats: ${supported}`
      );
    }
    return await importer.importPage(filename, content);
  }
}

export const pageImportService = new PageImportService();
