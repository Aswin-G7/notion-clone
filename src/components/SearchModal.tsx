import React, { useState, useEffect, useRef, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { searchService, SearchResultGroup, SearchResultItem } from "../services/SearchService";
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
} from "lucide-react";
import { BlockType } from "../types";

export const SearchModal: React.FC = () => {
  const {
    pages,
    isSearchOpen,
    setIsSearchOpen,
    navigateToResult,
  } = useApp();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-focus input on open
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

  // Execute search via SearchService
  const results: SearchResultGroup[] = useMemo(() => {
    if (!query.trim()) return [];
    return searchService.search(query, pages);
  }, [query, pages]);

  // Flattened list of matches for keyboard navigation
  const flatMatches = useMemo(() => {
    const list: { pageId: string; match: SearchResultItem }[] = [];
    for (const group of results) {
      for (const match of group.matches) {
        list.push({ pageId: group.pageId, match });
      }
    }
    return list;
  }, [results]);

  // Reset selected index when search query or flat matches change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view in search list
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const selectedEl = scrollContainerRef.current.querySelector(
      `[data-search-index="${selectedIndex}"]`
    );
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Keyboard navigation inside search modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsSearchOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flatMatches.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % flatMatches.length);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flatMatches.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + flatMatches.length) % flatMatches.length);
      }
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (flatMatches.length > 0 && flatMatches[selectedIndex]) {
        const item = flatMatches[selectedIndex];
        navigateToResult(
          item.pageId,
          item.match.blockId,
          item.match.rawMatchStart,
          item.match.rawMatchEnd
        );
      }
    }
  };

  if (!isSearchOpen) return null;

  const getBlockIcon = (type: BlockType | "title") => {
    switch (type) {
      case "title":
        return <FileText className="h-3.5 w-3.5 text-stone-500" />;
      case "heading":
        return <Heading className="h-3.5 w-3.5 text-amber-600" />;
      case "bulleted-list":
        return <List className="h-3.5 w-3.5 text-stone-500" />;
      case "numbered-list":
        return <ListOrdered className="h-3.5 w-3.5 text-stone-500" />;
      case "todo":
        return <CheckSquare className="h-3.5 w-3.5 text-blue-500" />;
      case "quote":
        return <Quote className="h-3.5 w-3.5 text-stone-500" />;
      case "code":
        return <Code className="h-3.5 w-3.5 text-emerald-600" />;
      case "table":
        return <Table className="h-3.5 w-3.5 text-purple-600" />;
      case "image":
        return <Image className="h-3.5 w-3.5 text-indigo-500" />;
      case "toggle":
        return <ChevronRight className="h-3.5 w-3.5 text-stone-500" />;
      case "callout":
        return <MessageSquare className="h-3.5 w-3.5 text-orange-500" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-stone-400" />;
    }
  };

  let globalIndexCounter = 0;

  return (
    <div
      id="search-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4 transition-all"
      onClick={() => setIsSearchOpen(false)}
    >
      <div
        id="search-modal-container"
        className="w-full max-w-2xl bg-white border border-stone-200/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-200/80 bg-stone-50/50">
          <Search className="h-4 w-4 text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            id="global-search-input"
            type="text"
            placeholder="Search pages, notes, blocks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm font-sans text-stone-800 placeholder-stone-400 outline-none border-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-stone-400 hover:text-stone-600 rounded-md hover:bg-stone-200/50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-stone-400 bg-stone-200/60 rounded border border-stone-300/60">
            ESC
          </kbd>
        </div>

        {/* Results / Empty States List */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-2 space-y-4 font-sans"
        >
          {query.trim() === "" ? (
            /* Recent Pages List when search is empty */
            <div className="p-2 space-y-1">
              <div className="px-2 pb-1 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                Pages in Workspace
              </div>
              {pages.map((page) => (
                <div
                  key={page.id}
                  onClick={() => navigateToResult(page.id, null)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs hover:bg-stone-100/80 transition-colors"
                >
                  <span className="text-base shrink-0">{page.icon || "📄"}</span>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-stone-800 truncate">
                      {page.title.trim() === "" ? "Untitled" : page.title}
                    </span>
                    <span className="text-[11px] text-stone-400 truncate font-normal">
                      {page.blocks.length} blocks • Updated {new Date(page.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            /* Search Results Grouped by Page */
            <div className="space-y-3">
              {results.map((group) => (
                <div key={group.pageId} className="space-y-0.5">
                  {/* Page Header */}
                  <div
                    onClick={() => navigateToResult(group.pageId, null)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-stone-100/60 cursor-pointer text-xs font-semibold text-stone-600"
                  >
                    <span className="text-sm shrink-0">{group.pageIcon || "📄"}</span>
                    <span className="truncate">{group.pageTitle}</span>
                  </div>

                  {/* Matching Blocks */}
                  <div className="space-y-0.5 pl-2">
                    {group.matches.map((match, idx) => {
                      const currentIndex = globalIndexCounter++;
                      const isSelected = currentIndex === selectedIndex;

                      return (
                        <div
                          key={`${group.pageId}-${match.blockId || "title"}-${idx}`}
                          data-search-index={currentIndex}
                          onClick={() =>
                            navigateToResult(
                              group.pageId,
                              match.blockId,
                              match.rawMatchStart,
                              match.rawMatchEnd
                            )
                          }
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer text-xs transition-all ${
                            isSelected
                              ? "bg-amber-500/10 text-stone-900 border border-amber-300/60 shadow-2xs"
                              : "hover:bg-stone-100/70 text-stone-700 border border-transparent"
                          }`}
                        >
                          <div className="shrink-0 p-1 rounded bg-stone-100 border border-stone-200/60">
                            {getBlockIcon(match.blockType)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-stone-700 truncate font-sans text-[12px] leading-relaxed">
                              {match.snippet.substring(0, match.matchStart)}
                              <mark className="bg-amber-200/90 text-amber-950 font-semibold rounded-xs px-0.5 mx-0.5">
                                {match.snippet.substring(match.matchStart, match.matchEnd)}
                              </mark>
                              {match.snippet.substring(match.matchEnd)}
                            </p>
                          </div>

                          {isSelected && (
                            <CornerDownLeft className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* No Results Match State */
            <div className="py-12 text-center space-y-1">
              <p className="text-sm font-medium text-stone-600">No matching results</p>
              <p className="text-xs text-stone-400">
                No blocks or titles found matching &quot;{query}&quot;
              </p>
            </div>
          )}
        </div>

        {/* Modal Keyboard Navigation Footer */}
        <div className="px-4 py-2 border-t border-stone-200/80 bg-stone-50/70 flex items-center justify-between text-[11px] text-stone-400 font-sans">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-stone-200/60 border border-stone-300/60 rounded text-[10px]">
                <ArrowUp className="h-2.5 w-2.5 inline" />
              </kbd>
              <kbd className="px-1 py-0.5 bg-stone-200/60 border border-stone-300/60 rounded text-[10px]">
                <ArrowDown className="h-2.5 w-2.5 inline" />
              </kbd>
              <span className="ml-0.5">Navigate</span>
            </span>

            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-stone-200/60 border border-stone-300/60 rounded text-[10px]">
                ↵
              </kbd>
              <span>Select</span>
            </span>
          </div>

          <div>
            <span>{flatMatches.length} matches found</span>
          </div>
        </div>
      </div>
    </div>
  );
};
