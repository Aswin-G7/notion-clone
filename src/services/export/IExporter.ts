import { Page } from "../../types";

export interface ExportOptions {
  includeChildPages?: boolean;
  allPages?: Page[];
  workspaceName?: string;
  activePageId?: string | null;
  sidebarOpen?: boolean;
}

export interface ExportFile {
  path: string; // Relative path inside multi-file bundle (e.g. "Page/Child.md")
  content: string | Uint8Array;
}

export interface ExportResult {
  filename: string;
  mimeType: string;
  content: string | Uint8Array;
  files?: ExportFile[]; // Included if multi-file export
}

export interface IExporter {
  id: string; // "markdown" | "html" | "pdf" | "workspace"
  name: string; // "Markdown" | "HTML" | "PDF" | "Workspace Backup"
  extension: string; // ".md" | ".html" | ".pdf" | ".zip"
  mimeType: string;

  exportPage(page: Page, options?: ExportOptions): Promise<ExportResult>;
  exportWorkspace(pages: Page[], options?: ExportOptions): Promise<ExportResult>;
}

/**
  * Abstraction for future multi-file/hierarchical "Page Package" exporters (e.g. Project.zip).
  * Keeps single-page Markdown/HTML/PDF exporters independent.
  */
export interface IPagePackageExporter extends IExporter {
  readonly targetScope: "page-package";
  exportPagePackage(rootPage: Page, allPages: Page[], options?: ExportOptions): Promise<ExportResult>;
}
