import { IDialogProvider } from "../interfaces";

export class ElectronDialogProvider implements IDialogProvider {
  async alert(message: string): Promise<void> {
    if (window.electronAPI) {
      await window.electronAPI.dialogs.alert(message);
    }
  }

  async confirm(message: string): Promise<boolean> {
    if (window.electronAPI) {
      return await window.electronAPI.dialogs.confirm(message);
    }
    return false;
  }
}
