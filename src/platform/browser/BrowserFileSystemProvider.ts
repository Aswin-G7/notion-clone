import { IFileSystemProvider, ImportedFileResult } from "../interfaces";

export class BrowserFileSystemProvider implements IFileSystemProvider {
  async exportFile(filename: string, content: string | Uint8Array, mimeType = "application/octet-stream"): Promise<boolean> {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error("[BrowserFileSystemProvider] Export failed:", e);
      return false;
    }
  }

  async importFile(acceptFilter = ".zip,.json"): Promise<ImportedFileResult | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = acceptFilter;
      
      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const reader = new FileReader();
        const isZip = file.name.toLowerCase().endsWith(".zip");

        if (isZip) {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsText(file);
        }

        reader.onload = (event) => {
          const result = event.target?.result;
          if (isZip && result instanceof ArrayBuffer) {
            resolve({ filename: file.name, content: new Uint8Array(result) });
          } else {
            resolve({ filename: file.name, content: (result as string) || "" });
          }
        };
        reader.onerror = () => {
          resolve(null);
        };
      };

      input.click();
    });
  }

  async readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          resolve(result);
        } else {
          reject(new Error("Failed to read file as data URL."));
        }
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsDataURL(file);
    });
  }
}
