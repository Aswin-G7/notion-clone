import React from "react";

export interface Command {
  id: string;
  title: string;
  description?: string;
  category: "Pages" | "Workspace" | "Navigation" | "View" | "Settings" | "System" | string;
  icon?: string | React.ComponentType<{ className?: string }>;
  shortcut?: string;
  keywords?: string[];
  action: (context?: any) => void | Promise<void>;
  enabled?: boolean | (() => boolean);
}

type CommandListener = () => void;

export class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private listeners: Set<CommandListener> = new Set();

  /**
   * Register a single command. Returns an unregister cleanup function.
   */
  public registerCommand(command: Command): () => void {
    this.commands.set(command.id, command);
    this.notifyListeners();
    return () => this.unregisterCommand(command.id);
  }

  /**
   * Register multiple commands at once. Returns an unregister cleanup function.
   */
  public registerCommands(commands: Command[]): () => void {
    for (const cmd of commands) {
      this.commands.set(cmd.id, cmd);
    }
    this.notifyListeners();
    return () => {
      for (const cmd of commands) {
        this.commands.delete(cmd.id);
      }
      this.notifyListeners();
    };
  }

  /**
   * Unregister a command by ID.
   */
  public unregisterCommand(id: string): void {
    if (this.commands.delete(id)) {
      this.notifyListeners();
    }
  }

  /**
   * Get all currently enabled commands.
   */
  public getCommands(): Command[] {
    return Array.from(this.commands.values()).filter((cmd) => {
      if (cmd.enabled === undefined) return true;
      if (typeof cmd.enabled === "function") return cmd.enabled();
      return cmd.enabled;
    });
  }

  /**
   * Search registered commands matching query.
   */
  public searchCommands(query: string): Command[] {
    const trimmed = query.trim().toLowerCase();
    const available = this.getCommands();
    if (!trimmed) return available;

    return available.filter((cmd) => {
      if (cmd.title.toLowerCase().includes(trimmed)) return true;
      if (cmd.description && cmd.description.toLowerCase().includes(trimmed)) return true;
      if (cmd.category.toLowerCase().includes(trimmed)) return true;
      if (cmd.keywords && cmd.keywords.some((k) => k.toLowerCase().includes(trimmed))) return true;
      return false;
    });
  }

  /**
   * Execute a command by ID.
   */
  public async executeCommand(id: string, context?: any): Promise<void> {
    const command = this.commands.get(id);
    if (command) {
      const isEnabled =
        typeof command.enabled === "function" ? command.enabled() : command.enabled !== false;
      if (isEnabled) {
        await command.action(context);
      }
    }
  }

  /**
   * Subscribe to command registry updates.
   */
  public subscribe(listener: CommandListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error("Error in CommandRegistry listener:", err);
      }
    }
  }
}

export const commandRegistry = new CommandRegistry();
