import { WorkspaceSnapshot } from "../PersistenceService";
import { WorkspaceBackupSpecification } from "../export/WorkspaceBackupSpecification";

export class WorkspaceImporter {
  /**
   * Imports and restores a workspace snapshot from a .zip backup package
   * or a raw JSON workspace file.
   */
  public static async importWorkspace(
    content: string | Uint8Array | ArrayBuffer | { filename: string; content: string | Uint8Array }
  ): Promise<WorkspaceSnapshot> {
    return await WorkspaceBackupSpecification.parseBackup(content);
  }
}
