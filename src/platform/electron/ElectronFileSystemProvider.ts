import { IFileSystemProvider, ImportedFileResult } from "../interfaces";

export class ElectronFileSystemProvider implements IFileSystemProvider {
  async exportFile(filename: string, content: string, mimeType?: string): Promise<boolean> {
    if (window.electronAPI) {
      return await window.electronAPI.fileSystem.exportFile(filename, content, mimeType);
    }
    return false;
  }

  async importFile(acceptFilter?: string): Promise<ImportedFileResult | null> {
    if (window.electronAPI) {
      return await window.electronAPI.fileSystem.importFile(acceptFilter);
    }
    return null;
  }

  async readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
