export interface WorkspaceCommand {
  id: string;
  description: string;
  timestamp: number;
  pageId?: string | null;
  execute: () => void;
  undo: () => void;
}

export interface WorkspaceCommandGroup {
  id: string;
  description: string;
  timestamp: number;
  pageId?: string | null;
  commands: WorkspaceCommand[];
}

export type WorkspaceHistoryItem = WorkspaceCommand | WorkspaceCommandGroup;

export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  lastUndoDescription: string | null;
  lastRedoDescription: string | null;
}

export type HistoryChangeListener = (state: HistoryState) => void;

export class WorkspaceHistoryService {
  private undoStack: WorkspaceHistoryItem[] = [];
  private redoStack: WorkspaceHistoryItem[] = [];
  private activeGroup: { description: string; pageId?: string | null; commands: WorkspaceCommand[] } | null = null;
  private maxHistoryDepth = 100;
  private listeners: Set<HistoryChangeListener> = new Set();
  private isPerformingUndoRedo = false;
  private navigateHandler: ((pageId: string) => void) | null = null;

  public setNavigateHandler(handler: ((pageId: string) => void) | null): void {
    this.navigateHandler = handler;
  }

  public getItemPageId(item: WorkspaceHistoryItem): string | null {
    if ("pageId" in item && item.pageId) {
      return item.pageId;
    }
    if ("commands" in item && item.commands && item.commands.length > 0) {
      const cmd = item.commands.find((c) => c.pageId);
      return cmd?.pageId || null;
    }
    return null;
  }

  /**
   * Check if currently executing an undo or redo step
   */
  public isExecutingUndoRedo(): boolean {
    return this.isPerformingUndoRedo;
  }

  /**
   * Pushes a completed command onto the history stack (or active transaction group).
   * Note: The caller is expected to have executed the command or perform initial execution.
   */
  public registerCommand(command: WorkspaceCommand): void {
    if (this.isPerformingUndoRedo) return;

    if (this.activeGroup) {
      if (!this.activeGroup.pageId && command.pageId) {
        this.activeGroup.pageId = command.pageId;
      }
      this.activeGroup.commands.push(command);
      return;
    }

    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistoryDepth) {
      this.undoStack.shift();
    }

    // A new workspace mutation clears the redo stack
    this.redoStack = [];

    this.notifyListeners();
  }

  /**
   * Start a transaction group for atomic multi-operation actions (e.g. template instantiation)
   */
  public startGroup(description: string, pageId?: string | null): void {
    if (this.activeGroup) {
      this.endGroup();
    }
    this.activeGroup = { description, pageId: pageId || null, commands: [] };
  }

  /**
   * End and commit the current transaction group
   */
  public endGroup(): void {
    if (!this.activeGroup) return;

    const group = this.activeGroup;
    this.activeGroup = null;

    if (group.commands.length === 0) return;

    const item: WorkspaceCommandGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      description: group.description,
      timestamp: Date.now(),
      pageId: group.pageId || group.commands.find((c) => c.pageId)?.pageId || null,
      commands: group.commands,
    };

    this.undoStack.push(item);
    if (this.undoStack.length > this.maxHistoryDepth) {
      this.undoStack.shift();
    }

    this.redoStack = [];
    this.notifyListeners();
  }

  /**
   * Cancel and revert all commands added to the current transaction group
   */
  public cancelGroup(): void {
    if (!this.activeGroup) return;

    const group = this.activeGroup;
    this.activeGroup = null;

    this.isPerformingUndoRedo = true;
    try {
      for (let i = group.commands.length - 1; i >= 0; i--) {
        group.commands[i].undo();
      }
    } finally {
      this.isPerformingUndoRedo = false;
    }

    this.notifyListeners();
  }

  /**
   * Undo the most recent workspace action
   */
  public undo(): boolean {
    if (!this.canUndo() || this.isPerformingUndoRedo) return false;

    const item = this.undoStack[this.undoStack.length - 1];
    const targetPageId = this.getItemPageId(item);

    if (targetPageId && this.navigateHandler) {
      try {
        this.navigateHandler(targetPageId);
      } catch (err) {
        console.error("[WorkspaceHistoryService] Navigation before undo failed:", err);
      }
    }

    this.undoStack.pop();
    this.isPerformingUndoRedo = true;

    try {
      if ("commands" in item) {
        // Undo grouped commands in reverse order
        for (let i = item.commands.length - 1; i >= 0; i--) {
          item.commands[i].undo();
        }
      } else {
        item.undo();
      }

      this.redoStack.push(item);
      this.notifyListeners();
      return true;
    } catch (err) {
      console.error("[WorkspaceHistoryService] Failed to execute undo:", err);
      return false;
    } finally {
      this.isPerformingUndoRedo = false;
    }
  }

  /**
   * Redo the most recently undone workspace action
   */
  public redo(): boolean {
    if (!this.canRedo() || this.isPerformingUndoRedo) return false;

    const item = this.redoStack[this.redoStack.length - 1];
    const targetPageId = this.getItemPageId(item);

    if (targetPageId && this.navigateHandler) {
      try {
        this.navigateHandler(targetPageId);
      } catch (err) {
        console.error("[WorkspaceHistoryService] Navigation before redo failed:", err);
      }
    }

    this.redoStack.pop();
    this.isPerformingUndoRedo = true;

    try {
      if ("commands" in item) {
        for (const cmd of item.commands) {
          cmd.execute();
        }
      } else {
        item.execute();
      }

      this.undoStack.push(item);
      this.notifyListeners();
      return true;
    } catch (err) {
      console.error("[WorkspaceHistoryService] Failed to execute redo:", err);
      return false;
    } finally {
      this.isPerformingUndoRedo = false;
    }
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Clears the entire history stack (e.g., when switching workspaces)
   */
  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.activeGroup = null;
    this.notifyListeners();
  }

  public setMaxDepth(depth: number): void {
    this.maxHistoryDepth = Math.max(10, depth);
    while (this.undoStack.length > this.maxHistoryDepth) {
      this.undoStack.shift();
    }
    this.notifyListeners();
  }

  public subscribe(listener: HistoryChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): HistoryState {
    const lastUndo = this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1] : null;
    const lastRedo = this.redoStack.length > 0 ? this.redoStack[this.redoStack.length - 1] : null;

    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      lastUndoDescription: lastUndo ? lastUndo.description : null,
      lastRedoDescription: lastRedo ? lastRedo.description : null,
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error("[WorkspaceHistoryService] Listener error:", err);
      }
    }
  }
}

export const workspaceHistoryService = new WorkspaceHistoryService();
