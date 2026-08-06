import { IMenuProvider, MenuState } from "../interfaces";

export class BrowserMenuProvider implements IMenuProvider {
  public readonly isSupported = false;

  public onAction(_callback: (action: string, payload?: any) => void): () => void {
    return () => {};
  }

  public updateState(_state: MenuState): void {
    // No-op in browser
  }
}
