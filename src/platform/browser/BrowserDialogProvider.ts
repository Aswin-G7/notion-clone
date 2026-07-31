import { IDialogProvider } from "../interfaces";

export class BrowserDialogProvider implements IDialogProvider {
  async alert(message: string): Promise<void> {
    window.alert(message);
  }

  async confirm(message: string): Promise<boolean> {
    return window.confirm(message);
  }
}
