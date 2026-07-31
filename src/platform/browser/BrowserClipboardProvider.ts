import { IClipboardProvider } from "../interfaces";

export class BrowserClipboardProvider implements IClipboardProvider {
  async writeText(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      
      // Fallback for older browser contexts
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      return success;
    } catch (e) {
      console.error("[BrowserClipboardProvider] Failed to copy text:", e);
      return false;
    }
  }

  async readText(): Promise<string> {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText();
      }
      return "";
    } catch (e) {
      console.error("[BrowserClipboardProvider] Failed to read clipboard text:", e);
      return "";
    }
  }
}
