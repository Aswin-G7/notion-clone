import { IClipboardProvider } from "../interfaces";

export class ElectronClipboardProvider implements IClipboardProvider {
  async writeText(text: string): Promise<boolean> {
    if (window.electronAPI) {
      return await window.electronAPI.clipboard.writeText(text);
    }
    return false;
  }

  async readText(): Promise<string> {
    if (window.electronAPI) {
      return await window.electronAPI.clipboard.readText();
    }
    return "";
  }
}
