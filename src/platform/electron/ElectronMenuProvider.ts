import { IMenuProvider, MenuState } from "../interfaces";

export class ElectronMenuProvider implements IMenuProvider {
  public readonly isSupported = true;

  public onAction(callback: (action: string, payload?: any) => void): () => void {
    if (typeof window !== "undefined" && window.electronAPI?.menu) {
      return window.electronAPI.menu.onAction(callback);
    }
    return () => {};
  }

  public updateState(state: MenuState): void {
    if (typeof window !== "undefined" && window.electronAPI?.menu) {
      window.electronAPI.menu.updateState(state);
    }
  }
}
