export interface FocusTarget {
  pageId?: string | null;
  blockId?: string | null;
  caretPos?: "start" | "end";
  focusTitle?: boolean;
  tableCell?: { r: number; c: number };
}

export interface WorkspaceCommand {
  id: string;
  description: string;
  timestamp: number;
  redoTimestamp?: number;
  pageId?: string | null;
  isTextCommand?: boolean;
  isTitleCommand?: boolean;
  blockId?: string | null;
  originalText?: string;
  latestText?: string;
  focusOnUndo?: FocusTarget | (() => FocusTarget | null);
  focusOnRedo?: FocusTarget | (() => FocusTarget | null);
  execute: () => void;
  undo: () => void;
}

export interface WorkspaceCommandGroup {
  id: string;
  description: string;
  timestamp: number;
  redoTimestamp?: number;
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
  private focusRestoreListeners: Set<(target: FocusTarget) => void> = new Set();
  private isPerformingUndoRedo = false;
  private navigateHandler: ((pageId: string) => void) | null = null;

  public setNavigateHandler(handler: ((pageId: string) => void) | null): void {
    this.navigateHandler = handler;
  }

  public onFocusRestore(handler: (target: FocusTarget) => void): () => void {
    this.focusRestoreListeners.add(handler);
    return () => {
      this.focusRestoreListeners.delete(handler);
    };
  }

  public triggerFocusRestore(target: FocusTarget): void {
    for (const listener of this.focusRestoreListeners) {
      try {
        listener(target);
      } catch (err) {
        console.error("[WorkspaceHistoryService] Error in focus restore listener:", err);
      }
    }
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
   * Registers or coalesces a text edit operation for a specific block on a page.
   * Continuous typing within a block is coalesced into a single undo step if within the threshold.
   */
  public registerTextEdit(
    pageId: string,
    blockId: string,
    oldText: string,
    newText: string,
    applyText: (pageId: string, blockId: string, text: string) => void
  ): void {
    if (this.isPerformingUndoRedo) return;
    if (oldText === newText) return;

    const now = Date.now();
    const lastItem = this.undoStack[this.undoStack.length - 1];
    const TEXT_COALESCE_THRESHOLD_MS = 1000;

    // If the last history command is a text command on the same block within the time window, coalesce into it
    const isWithinCoalesceWindow =
      lastItem &&
      !("commands" in lastItem) &&
      lastItem.isTextCommand &&
      lastItem.pageId === pageId &&
      lastItem.blockId === blockId &&
      now - lastItem.timestamp <= TEXT_COALESCE_THRESHOLD_MS;

    if (isWithinCoalesceWindow) {
      const orig = lastItem.originalText ?? oldText;
      // If user typed and backspaced back to original text, remove from undo stack
      if (orig === newText) {
        this.undoStack.pop();
        this.notifyListeners();
        return;
      }
      lastItem.latestText = newText;
      lastItem.timestamp = now;
      lastItem.execute = () => {
        applyText(pageId, blockId, newText);
      };
      lastItem.undo = () => {
        applyText(pageId, blockId, orig);
      };
      // Clear redo stack on continuous edit
      this.redoStack = [];
      this.notifyListeners();
      return;
    }

    const command: WorkspaceCommand = {
      id: `text_edit_${blockId}_${now}`,
      description: "Edit Text",
      timestamp: now,
      pageId,
      isTextCommand: true,
      blockId,
      originalText: oldText,
      latestText: newText,
      focusOnUndo: {
        pageId,
        blockId,
        caretPos: "end",
      },
      focusOnRedo: {
        pageId,
        blockId,
        caretPos: "end",
      },
      execute: () => {
        applyText(pageId, blockId, newText);
      },
      undo: () => {
        applyText(pageId, blockId, oldText);
      },
    };

    this.registerCommand(command);
  }

  /**
   * Registers or coalesces a page title edit operation.
   */
  public registerTitleEdit(
    pageId: string,
    oldTitle: string,
    newTitle: string,
    applyTitle: (pageId: string, title: string) => void
  ): void {
    if (this.isPerformingUndoRedo) return;
    if (oldTitle === newTitle) return;

    const now = Date.now();
    const lastItem = this.undoStack[this.undoStack.length - 1];
    const TITLE_COALESCE_THRESHOLD_MS = 1000;

    // If the last history command is a title command on the same page within the time window, coalesce into it
    const isWithinCoalesceWindow =
      lastItem &&
      !("commands" in lastItem) &&
      lastItem.isTitleCommand &&
      lastItem.pageId === pageId &&
      now - lastItem.timestamp <= TITLE_COALESCE_THRESHOLD_MS;

    if (isWithinCoalesceWindow) {
      const orig = lastItem.originalText ?? oldTitle;
      if (orig === newTitle) {
        this.undoStack.pop();
        this.notifyListeners();
        return;
      }
      lastItem.latestText = newTitle;
      lastItem.timestamp = now;
      lastItem.execute = () => {
        applyTitle(pageId, newTitle);
      };
      lastItem.undo = () => {
        applyTitle(pageId, orig);
      };
      this.redoStack = [];
      this.notifyListeners();
      return;
    }

    const command: WorkspaceCommand = {
      id: `title_edit_${pageId}_${now}`,
      description: "Rename Page",
      timestamp: now,
      pageId,
      isTitleCommand: true,
      originalText: oldTitle,
      latestText: newTitle,
      focusOnUndo: {
        pageId,
        focusTitle: true,
        caretPos: "end",
      },
      focusOnRedo: {
        pageId,
        focusTitle: true,
        caretPos: "end",
      },
      execute: () => {
        applyTitle(pageId, newTitle);
      },
      undo: () => {
        applyTitle(pageId, oldTitle);
      },
    };

    this.registerCommand(command);
  }

  /**
   * Checks if the most recent undo items are text edits for the given block.
   * If so, pops them and returns the earliest originalText (used to restore original block text on block deletion).
   */
  public popRecentTextEditForBlock(blockId: string): string | null {
    let originalText: string | null = null;
    while (this.undoStack.length > 0) {
      const lastItem = this.undoStack[this.undoStack.length - 1];
      if (
        lastItem &&
        !("commands" in lastItem) &&
        lastItem.isTextCommand &&
        lastItem.blockId === blockId
      ) {
        this.undoStack.pop();
        originalText = lastItem.originalText ?? originalText;
      } else {
        break;
      }
    }
    if (originalText !== null) {
      this.notifyListeners();
    }
    return originalText;
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

    let focusTarget: FocusTarget | null = null;
    if ("commands" in item) {
      for (let i = item.commands.length - 1; i >= 0; i--) {
        const cmd = item.commands[i];
        const target = typeof cmd.focusOnUndo === "function" ? cmd.focusOnUndo() : cmd.focusOnUndo;
        if (target) {
          focusTarget = target;
          break;
        }
      }
    } else {
      focusTarget = typeof item.focusOnUndo === "function" ? item.focusOnUndo() : item.focusOnUndo || null;
    }

    if (!focusTarget) {
      focusTarget = { pageId: targetPageId, blockId: null, caretPos: "end" };
    }

    const destinationPageId = focusTarget.pageId || targetPageId;

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

      if (destinationPageId && this.navigateHandler) {
        try {
          this.navigateHandler(destinationPageId);
        } catch (err) {
          console.error("[WorkspaceHistoryService] Navigation after undo failed:", err);
        }
      }

      item.redoTimestamp = Date.now();
      this.redoStack.push(item);
      this.notifyListeners();
      this.triggerFocusRestore(focusTarget);
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

    let focusTarget: FocusTarget | null = null;
    if ("commands" in item) {
      for (let i = 0; i < item.commands.length; i++) {
        const cmd = item.commands[i];
        const target = typeof cmd.focusOnRedo === "function" ? cmd.focusOnRedo() : cmd.focusOnRedo;
        if (target) {
          focusTarget = target;
          break;
        }
      }
    } else {
      focusTarget = typeof item.focusOnRedo === "function" ? item.focusOnRedo() : item.focusOnRedo || null;
    }

    if (!focusTarget) {
      focusTarget = { pageId: targetPageId, blockId: null, caretPos: "end" };
    }

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

      item.timestamp = Date.now();
      this.undoStack.push(item);
      this.notifyListeners();
      this.triggerFocusRestore(focusTarget);
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

  public getLastCommandTimestamp(): number {
    if (this.undoStack.length === 0) return 0;
    const item = this.undoStack[this.undoStack.length - 1];
    return item.timestamp || 0;
  }

  public getLastRedoTimestamp(): number {
    if (this.redoStack.length === 0) return 0;
    const item = this.redoStack[this.redoStack.length - 1];
    return item.redoTimestamp || item.timestamp || 0;
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
