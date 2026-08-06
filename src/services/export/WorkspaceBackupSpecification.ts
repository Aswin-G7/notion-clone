import JSZip from "jszip";
import { WorkspaceSnapshot, CURRENT_SCHEMA_VERSION, persistenceService } from "../PersistenceService";

export interface WorkspaceBackupManifest {
  app: string;
  exportVersion: string;
  exportedAt: string;
  pagesCount: number;
  workspaceName: string;
}

export class WorkspaceBackupSpecification {
  /**
   * Serializes a WorkspaceSnapshot into a standardized ZIP backup archive (.zip).
   * The ZIP archive contains:
   * - workspace.json: Complete WorkspaceSnapshot JSON (source of truth)
   * - workspace.sqlite: Duplicate copy for legacy/sqlite tool compatibility
   * - metadata.json: Human-readable manifest info
   * - settings.json: Backup configuration metadata
   * - assets/: Folder containing embedded asset images
   */
  public static async serializeBackup(
    snapshot: WorkspaceSnapshot,
    workspaceName = "Workspace"
  ): Promise<Uint8Array> {
    const zip = new JSZip();

    // Standardize & sanitize snapshot content
    const cleanSnapshot: WorkspaceSnapshot = {
      version: CURRENT_SCHEMA_VERSION,
      timestamp: Date.now(),
      pages: snapshot.pages || [],
      activePageId: snapshot.activePageId || null,
      sidebarOpen: snapshot.sidebarOpen ?? true,
    };

    const jsonString = JSON.stringify(cleanSnapshot, null, 2);

    // Write primary data files
    zip.file("workspace.json", jsonString);
    zip.file("workspace.sqlite", jsonString);

    // Manifest metadata
    const manifest: WorkspaceBackupManifest = {
      app: "Workspace Desktop",
      exportVersion: "1.0.0",
      exportedAt: new Date().toISOString(),
      pagesCount: cleanSnapshot.pages.length,
      workspaceName,
    };
    zip.file("metadata.json", JSON.stringify(manifest, null, 2));

    const settingsData = {
      name: workspaceName,
      createdAt: cleanSnapshot.timestamp,
      updatedAt: Date.now(),
      version: CURRENT_SCHEMA_VERSION,
      pageCount: cleanSnapshot.pages.length,
    };
    zip.file("settings.json", JSON.stringify(settingsData, null, 2));

    // Extract assets into assets/ directory for archive portability
    const assetsFolder = zip.folder("assets");
    if (assetsFolder) {
      let counter = 1;
      for (const page of cleanSnapshot.pages) {
        if (page.coverImage && page.coverImage.startsWith("data:")) {
          const parsed = this.parseDataUrl(page.coverImage);
          if (parsed) {
            assetsFolder.file(`cover_${page.id.slice(0, 8)}.${parsed.extension}`, parsed.data);
          }
        }
        for (const block of page.blocks || []) {
          if (block.type === "image" && block.data?.url && block.data.url.startsWith("data:")) {
            const parsed = this.parseDataUrl(block.data.url);
            if (parsed) {
              assetsFolder.file(`image_${counter++}.${parsed.extension}`, parsed.data);
            }
          }
        }
      }
    }

    return await zip.generateAsync({ type: "uint8array" });
  }

  /**
   * Deserializes and validates a workspace backup from either:
   * 1. A .zip backup archive (containing workspace.json)
   * 2. A raw JSON string or Uint8Array/ArrayBuffer of JSON
   */
  public static async parseBackup(
    content: string | Uint8Array | ArrayBuffer | { filename: string; content: string | Uint8Array }
  ): Promise<WorkspaceSnapshot> {
    let rawInput: any = content;
    if (typeof content === "object" && content !== null && "content" in content) {
      rawInput = content.content;
    }

    let jsonString: string | null = null;

    if (rawInput instanceof Uint8Array || rawInput instanceof ArrayBuffer || this.isZipBinary(rawInput)) {
      jsonString = await this.extractJsonFromZip(rawInput);
    } else if (typeof rawInput === "string") {
      const trimmed = rawInput.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        jsonString = trimmed;
      } else {
        try {
          jsonString = await this.extractJsonFromZip(rawInput);
        } catch {
          jsonString = rawInput;
        }
      }
    }

    if (!jsonString) {
      throw new Error("Unable to read workspace backup content.");
    }

    return persistenceService.importWorkspace(jsonString);
  }

  private static async extractJsonFromZip(
    zipInput: Uint8Array | ArrayBuffer | string
  ): Promise<string> {
    try {
      const zip = await JSZip.loadAsync(zipInput);
      const jsonFile = zip.file("workspace.json") || zip.file("workspace.sqlite");
      if (jsonFile) {
        return await jsonFile.async("string");
      }

      // Search for any .json file in root
      const jsonFiles = zip.file(/\.json$/i);
      if (jsonFiles.length > 0) {
        const target = jsonFiles.find(
          (f) => !f.name.includes("metadata.json") && !f.name.includes("settings.json")
        ) || jsonFiles[0];
        return await target.async("string");
      }

      throw new Error("ZIP package missing 'workspace.json' backup file.");
    } catch (err: any) {
      throw new Error(`Failed to extract ZIP archive: ${err?.message || err}`);
    }
  }

  private static isZipBinary(input: any): boolean {
    if (input instanceof Uint8Array) {
      return input.length >= 4 && input[0] === 0x50 && input[1] === 0x4b && input[2] === 0x03 && input[3] === 0x04;
    }
    if (input instanceof ArrayBuffer) {
      const bytes = new Uint8Array(input);
      return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    }
    if (typeof input === "string") {
      return input.startsWith("PK\x03\x04");
    }
    return false;
  }

  private static parseDataUrl(dataUrl: string): { data: Uint8Array; extension: string } | null {
    try {
      const parts = dataUrl.split(",");
      if (parts.length < 2) return null;
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : "image/png";
      const extension = mime.split("/")[1] || "png";
      const binaryStr = atob(parts[1]);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return { data: bytes, extension };
    } catch {
      return null;
    }
  }
}
