import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { searchService, SearchResultGroup, SearchResultItem } from "../services/SearchService";
import { commandRegistry, Command } from "../services/CommandRegistry";
import {
  Search,
  X,
  FileText,
  Heading,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Table,
  Image,
  ChevronRight,
  MessageSquare,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  FilePlus,
  Plus,
  Copy,
  Trash2,
  Star,
  Sparkles,
  Upload,
  Download,
  FolderPlus,
  FolderOpen,
  Layers,
  Menu,
  Moon,
  Settings,
  Command as CommandIcon,
} from "lucide-react";
import { BlockType, Page } from "../types";

export type PaletteItem =
  | { type: "command"; command: Command }
  | { type: "pageMatch"; pageId: string; pageTitle: string; pageIcon?: string; match: SearchResultItem }
  | { type: "page"; page: Page };

export const CommandPaletteModal: React.FC = () => {
  const {
    pages,
    isSearchOpen,
    setIsSearchOpen,
    navigateToResult,
  } = useApp();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, setRegisteredCommandsVersion] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Subscribe to command registry updates
  useEffect(() => {
    const unsubscribe = commandRegistry.subscribe(() => {
      setRegisteredCommandsVersion((v) => v + 1);
    });
    return unsubscribe;
  }, []);

  // Auto-focus input on open & reset state
  useEffect(() => {
    if (isSearchOpen) {
      setQuery("");
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  const activePages = useMemo(() => {
    return pages.filter((p) => !p.isDeleted);
  }, [pages]);

  // Execute Command search
  const matchedCommands = useMemo(() => {
    return commandRegistry.searchCommands(query);
  }, [query, isSearchOpen]);

  // Execute Page content search
  const pageSearchResults: SearchResultGroup[] = useMemo(() => {
    if (!query.trim()) return [];
    return searchService.search(query, activePages);
  }, [query, activePages]);

  // Unified flattened list of matches for single-index keyboard navigation
  const flatItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];

    if (!query.trim()) {
      // Empty query mode: Show top commands first, then pages in workspace
      for (const cmd of matchedCommands) {
        items.push({ type: "command", command: cmd });
      }
      for (const pg of activePages) {
        items.push({ type: "page", page: pg });
      }
    } else {
      // Search mode: Matching Commands first
      for (const cmd of matchedCommands) {
        items.push({ type: "command", command: cmd });
      }

      // Then Matching Pages & Block contents
      for (const group of pageSearchResults) {
        for (const match of group.matches) {
          items.push({
            type: "pageMatch",
            pageId: group.pageId,
            pageTitle: group.pageTitle,
            pageIcon: group.pageIcon,
            match,
          });
        }
      }
    }

    return items;
  }, [query, matchedCommands, pageSearchResults, activePages]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view smoothly
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const selectedEl = scrollContainerRef.current.querySelector(
      `[data-palette-index="${selectedIndex}"]`
    );
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const executeItem = useCallback(
    (item: PaletteItem) => {
      setIsSearchOpen(false);
      if (item.type === "command") {
        item.command.action();
      } else if (item.type === "pageMatch") {
        navigateToResult(
          item.pageId,
          item.match.blockId,
          item.match.rawMatchStart,
          item.match.rawMatchEnd
        );
      } else if (item.type === "page") {
        navigateToResult(item.page.id, null);
      }
    },
    [setIsSearchOpen, navigateToResult]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsSearchOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flatItems.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % flatItems.length);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flatItems.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (flatItems.length > 0 && flatItems[selectedIndex]) {
        executeItem(flatItems[selectedIndex]);
      }
    }
  };

  if (!isSearchOpen) return null;

  const renderCommandIcon = (iconName?: string | React.ComponentType<{ className?: string }>) => {
    if (typeof iconName === "function" || (typeof iconName === "object" && iconName !== null)) {
      const IconComp = iconName as React.ComponentType<{ className?: string }>;
      return <IconComp className="h-4 w-4 text-stone-500 dark:text-stone-400 shrink-0" />;
    }

    switch (iconName) {
      case "FilePlus":
        return <FilePlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case "Plus":
        return <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />;
      case "Copy":
        return <Copy className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />;
      case "Trash2":
        return <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400 shrink-0" />;
      case "Star":
        return <Star className="h-4 w-4 text-amber-500 fill-amber-500/20 shrink-0" />;
      case "Sparkles":
        return <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />;
      case "Upload":
        return <Upload className="h-4 w-4 text-indigo-500 dark:text-indigo-400 shrink-0" />;
      case "Download":
        return <Download className="h-4 w-4 text-teal-500 dark:text-teal-400 shrink-0" />;
      case "FolderPlus":
        return <FolderPlus className="h-4 w-4 text-stone-500 dark:text-stone-400 shrink-0" />;
      case "FolderOpen":
        return <FolderOpen className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />;
      case "Layers":
        return <Layers className="h-4 w-4 text-blue-500 shrink-0" />;
      case "Menu":
        return <Menu className="h-4 w-4 text-stone-500 dark:text-stone-400 shrink-0" />;
      case "Moon":
        return <Moon className="h-4 w-4 text-indigo-400 shrink-0" />;
      case "Settings":
        return <Settings className="h-4 w-4 text-stone-500 dark:text-stone-400 shrink-0" />;
      case "Search":
        return <Search className="h-4 w-4 text-stone-500 dark:text-stone-400 shrink-0" />;
      default:
        return <CommandIcon className="h-4 w-4 text-stone-400 shrink-0" />;
    }
  };

  const getBlockIcon = (type: BlockType | "title") => {
    switch (type) {
      case "title":
        return <FileText className="h-3.5 w-3.5 text-stone-500 shrink-0" />;
      case "heading":
        return <Heading className="h-3.5 w-3.5 text-amber-600 shrink-0" />;
      case "bulleted-list":
        return <List className="h-3.5 w-3.5 text-stone-500 shrink-0" />;
      case "numbered-list":
        return <ListOrdered className="h-3.5 w-3.5 text-stone-500 shrink-0" />;
      case "todo":
        return <CheckSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
      case "quote":
        return <Quote className="h-3.5 w-3.5 text-stone-500 shrink-0" />;
      case "code":
        return <Code className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
      case "table":
        return <Table className="h-3.5 w-3.5 text-purple-600 shrink-0" />;
      case "image":
        return <Image className="h-3.5 w-3.5 text-indigo-500 shrink-0" />;
      case "toggle":
        return <ChevronRight className="h-3.5 w-3.5 text-stone-500 shrink-0" />;
      case "callout":
        return <MessageSquare className="h-3.5 w-3.5 text-orange-500 shrink-0" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-stone-400 shrink-0" />;
    }
  };

  let currentIndexTracker = 0;

  return (
    <div
      id="command-palette-backdrop"
      className="fixed inset-0 z-50 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-xs flex items-start justify-center pt-12 sm:pt-20 px-4 transition-all"
      onClick={() => setIsSearchOpen(false)}
    >
      <div
        id="command-palette-container"
        className="w-full max-w-2xl bg-white dark:bg-[#1f1f1f] border border-stone-200/80 dark:border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[78vh] animate-in fade-in zoom-in-95 duration-150 select-none font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-200/80 dark:border-stone-800 bg-stone-50/50 dark:bg-[#191919]">
          <CommandIcon className="h-4 w-4 text-stone-400 dark:text-stone-500 shrink-0" />
          <input
            ref={inputRef}
            id="command-palette-input"
            type="text"
            placeholder="Type a command or search pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm font-sans text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 outline-none border-none"
          />
          {query && (
            <button
              id="command-palette-clear-btn"
              onClick={() => setQuery("")}
              className="p-1 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 rounded-md hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-stone-400 dark:text-stone-500 bg-stone-200/60 dark:bg-stone-800 rounded border border-stone-300/60 dark:border-stone-700">
            ESC
          </kbd>
        </div>

        {/* Unified Search List */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-2 space-y-4 font-sans"
        >
          {flatItems.length === 0 ? (
            <div className="py-12 text-center space-y-1">
              <p className="text-sm font-medium text-stone-600 dark:text-stone-300">No matching results</p>
              <p className="text-xs text-stone-400 dark:text-stone-500">
                No commands or pages found for &quot;{query}&quot;
              </p>
            </div>
          ) : (
            <>
              {/* Commands Group */}
              {matchedCommands.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Actions & Commands</span>
                    <span className="text-[10px] font-normal text-stone-400 dark:text-stone-600">
                      {matchedCommands.length} available
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    {matchedCommands.map((cmd) => {
                      const itemIdx = currentIndexTracker++;
                      const isSelected = itemIdx === selectedIndex;

                      return (
                        <div
                          key={cmd.id}
                          data-palette-index={itemIdx}
                          onClick={() => executeItem({ type: "command", command: cmd })}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                            isSelected
                              ? "bg-amber-500/10 dark:bg-amber-500/20 text-stone-900 dark:text-stone-100 border border-amber-300/80 dark:border-amber-700/80 shadow-2xs"
                              : "hover:bg-stone-100/80 dark:hover:bg-stone-800/40 text-stone-700 dark:text-stone-300 border border-transparent"
                          }`}
                        >
                          <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800/80 border border-stone-200/60 dark:border-stone-700/60 shrink-0">
                            {renderCommandIcon(cmd.icon)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-stone-800 dark:text-stone-100 truncate text-[13px]">
                                {cmd.title}
                              </span>
                              <span className="px-1.5 py-0.2 text-[9px] font-medium tracking-wide uppercase rounded-xs bg-stone-200/60 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                                {cmd.category}
                              </span>
                            </div>
                            {cmd.description && (
                              <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate font-normal mt-0.5">
                                {cmd.description}
                              </p>
                            )}
                          </div>

                          {cmd.shortcut && (
                            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-stone-400 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700 shrink-0">
                              {cmd.shortcut}
                            </kbd>
                          )}

                          {isSelected && (
                            <CornerDownLeft className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pages & Block Matches Group */}
              {!query.trim() ? (
                /* Empty Query Mode: Pages in Workspace */
                <div className="space-y-1 pt-2 border-t border-stone-200/60 dark:border-stone-800/80">
                  <div className="px-3 py-1 text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                    Pages in Workspace
                  </div>
                  <div className="space-y-0.5">
                    {activePages.map((page) => {
                      const itemIdx = currentIndexTracker++;
                      const isSelected = itemIdx === selectedIndex;

                      return (
                        <div
                          key={page.id}
                          data-palette-index={itemIdx}
                          onClick={() => executeItem({ type: "page", page })}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-xs transition-all ${
                            isSelected
                              ? "bg-amber-500/10 dark:bg-amber-500/20 text-stone-900 dark:text-stone-100 border border-amber-300/80 dark:border-amber-700/80 shadow-2xs"
                              : "hover:bg-stone-100/80 dark:hover:bg-stone-800/40 text-stone-700 dark:text-stone-300 border border-transparent"
                          }`}
                        >
                          <span className="text-base shrink-0">{page.icon || "📄"}</span>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-semibold text-stone-800 dark:text-stone-100 truncate text-[13px]">
                              {page.title.trim() === "" ? "Untitled" : page.title}
                            </span>
                            <span className="text-[11px] text-stone-400 dark:text-stone-500 truncate font-normal">
                              {page.blocks.length} blocks • Updated {new Date(page.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {isSelected && (
                            <CornerDownLeft className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : pageSearchResults.length > 0 ? (
                /* Non-empty Query Mode: Content Matches */
                <div className="space-y-3 pt-2 border-t border-stone-200/60 dark:border-stone-800/80">
                  <div className="px-3 py-1 text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                    Pages & Search Matches
                  </div>

                  <div className="space-y-3">
                    {pageSearchResults.map((group) => (
                      <div key={group.pageId} className="space-y-0.5">
                        {/* Page Header */}
                        <div
                          onClick={() => navigateToResult(group.pageId, null)}
                          className="flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold text-stone-500 dark:text-stone-400"
                        >
                          <span className="text-sm shrink-0">{group.pageIcon || "📄"}</span>
                          <span className="truncate">{group.pageTitle}</span>
                        </div>

                        {/* Matching Blocks */}
                        <div className="space-y-0.5 pl-2">
                          {group.matches.map((match, idx) => {
                            const itemIdx = currentIndexTracker++;
                            const isSelected = itemIdx === selectedIndex;

                            return (
                              <div
                                key={`${group.pageId}-${match.blockId || "title"}-${idx}`}
                                data-palette-index={itemIdx}
                                onClick={() =>
                                  executeItem({
                                    type: "pageMatch",
                                    pageId: group.pageId,
                                    pageTitle: group.pageTitle,
                                    pageIcon: group.pageIcon,
                                    match,
                                  })
                                }
                                onMouseEnter={() => setSelectedIndex(itemIdx)}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer text-xs transition-all ${
                                  isSelected
                                    ? "bg-amber-500/10 dark:bg-amber-500/20 text-stone-900 dark:text-stone-100 border border-amber-300/80 dark:border-amber-700/80 shadow-2xs"
                                    : "hover:bg-stone-100/80 dark:hover:bg-stone-800/40 text-stone-700 dark:text-stone-300 border border-transparent"
                                }`}
                              >
                                <div className="shrink-0 p-1 rounded bg-stone-100 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700">
                                  {getBlockIcon(match.blockType)}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="text-stone-700 dark:text-stone-300 truncate font-sans text-[12px] leading-relaxed">
                                    {match.snippet.substring(0, match.matchStart)}
                                    <mark className="bg-amber-200/90 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 font-semibold rounded-xs px-0.5 mx-0.5">
                                      {match.snippet.substring(match.matchStart, match.matchEnd)}
                                    </mark>
                                    {match.snippet.substring(match.matchEnd)}
                                  </p>
                                </div>

                                {isSelected && (
                                  <CornerDownLeft className="h-3.5 w-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Modal Navigation Footer */}
        <div className="px-4 py-2.5 border-t border-stone-200/80 dark:border-stone-800 bg-stone-50/70 dark:bg-[#191919] flex items-center justify-between text-[11px] text-stone-400 dark:text-stone-500 font-sans">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-stone-200/60 dark:bg-stone-800 border border-stone-300/60 dark:border-stone-700 rounded text-[10px]">
                <ArrowUp className="h-2.5 w-2.5 inline" />
              </kbd>
              <kbd className="px-1 py-0.5 bg-stone-200/60 dark:bg-stone-800 border border-stone-300/60 dark:border-stone-700 rounded text-[10px]">
                <ArrowDown className="h-2.5 w-2.5 inline" />
              </kbd>
              <span className="ml-0.5">Navigate</span>
            </span>

            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-stone-200/60 dark:bg-stone-800 border border-stone-300/60 dark:border-stone-700 rounded text-[10px]">
                ↵
              </kbd>
              <span>Select</span>
            </span>
          </div>

          <div>
            <span>{flatItems.length} items</span>
          </div>
        </div>
      </div>
    </div>
  );
};
