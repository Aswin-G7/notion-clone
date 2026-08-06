import { Page } from "../../types";
import { ExportOptions, ExportResult, IExporter } from "./IExporter";
import { WorkspaceBackupSpecification } from "./WorkspaceBackupSpecification";

export class WorkspaceBackupExporter implements IExporter {
  public readonly id = "workspace";
  public readonly name = "Workspace Backup (.zip)";
  public readonly extension = ".zip";
  public readonly mimeType = "application/zip";

  public async exportPage(page: Page, options: ExportOptions = {}): Promise<ExportResult> {
    throw new Error("WorkspaceBackupExporter cannot be used for single page exports. Use 'markdown', 'html', or 'pdf' for page exports.");
  }

  public async exportWorkspace(pages: Page[], options: ExportOptions = {}): Promise<ExportResult> {
    const wsName = this.sanitizeFilename(options.workspaceName || "Workspace");

    const snapshot = {
      version: 1,
      timestamp: Date.now(),
      pages,
      activePageId: options.activePageId !== undefined ? options.activePageId : (pages[0]?.id || null),
      sidebarOpen: options.sidebarOpen ?? true,
    };

    const zipContent = await WorkspaceBackupSpecification.serializeBackup(snapshot, wsName);

    return {
      filename: `${wsName}_Backup_${new Date().toISOString().slice(0, 10)}.zip`,
      mimeType: "application/zip",
      content: zipContent,
    };
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[/\\?%*:|"<>]/g, "-").trim() || "Workspace";
  }
}

