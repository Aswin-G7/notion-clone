import { Page } from "../../types";
import { ExportOptions, ExportResult, IExporter, IPagePackageExporter } from "./IExporter";
import { MarkdownExporter } from "./MarkdownExporter";
import { HTMLExporter } from "./HTMLExporter";
import { PDFExporter } from "./PDFExporter";
import { WorkspaceBackupExporter } from "./WorkspaceBackupExporter";
import { platform } from "../../platform";

export class ExportService {
  private exporters: Map<string, IExporter> = new Map();

  constructor() {
    // Register default exporters
    this.registerExporter(new MarkdownExporter());
    this.registerExporter(new HTMLExporter());
    this.registerExporter(new PDFExporter());
    this.registerExporter(new WorkspaceBackupExporter());
  }

  /**
   * Registers a new exporter implementation.
   */
  public registerExporter(exporter: IExporter): void {
    this.exporters.set(exporter.id, exporter);
  }

  /**
   * Retrieves an exporter by format ID.
   */
  public getExporter(formatId: string): IExporter | undefined {
    return this.exporters.get(formatId);
  }

  /**
   * Returns a list of all registered exporters.
   */
  public getAvailableExporters(): IExporter[] {
    return Array.from(this.exporters.values());
  }

  /**
   * Exports a single page using the specified format ID.
   */
  public async exportPage(
    formatId: string,
    page: Page,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    if (formatId === "workspace") {
      throw new Error("Workspace Backup (.zip) format can only be used for Entire Workspace exports, not single page exports.");
    }

    const exporter = this.getExporter(formatId);
    if (!exporter) {
      throw new Error(`Unknown export format: '${formatId}'`);
    }

    const result = await exporter.exportPage(page, options);
    await this.saveExportResult(result);
    return result;
  }

  /**
   * Abstracted handler for future "Page Package" exports (e.g. Project.zip with hierarchy + metadata).
   * Reserved for dedicated multi-page package exporters without affecting MarkdownExporter.
   */
  public async exportPagePackage(
    formatId: string,
    page: Page,
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const exporter = this.getExporter(formatId);
    if (!exporter) {
      throw new Error(`Unknown export format: '${formatId}'`);
    }

    const pkgExporter = exporter as Partial<IPagePackageExporter>;
    if (typeof pkgExporter.exportPagePackage === "function") {
      const result = await pkgExporter.exportPagePackage(page, options.allPages || [page], options);
      await this.saveExportResult(result);
      return result;
    }

    throw new Error(`Exporter '${formatId}' does not support Page Package export.`);
  }

  /**
   * Exports the entire workspace using the specified format ID.
   */
  public async exportWorkspace(
    formatId: string,
    pages: Page[],
    options: ExportOptions = {}
  ): Promise<ExportResult> {
    const exporter = this.getExporter(formatId);
    if (!exporter) {
      throw new Error(`Unknown export format: '${formatId}'`);
    }

    const result = await exporter.exportWorkspace(pages, options);
    await this.saveExportResult(result);
    return result;
  }

  /**
   * Delegates file saving to the PlatformBridge file system provider.
   * Electron uses native save dialogs; Browser falls back to blob downloads.
   */
  public async saveExportResult(result: ExportResult): Promise<boolean> {
    return await platform.fileSystem.exportFile(
      result.filename,
      result.content,
      result.mimeType
    );
  }
}

export const exportService = new ExportService();
