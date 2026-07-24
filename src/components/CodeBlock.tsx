import React, { useState, useRef, useEffect } from "react";
import { Check, Copy, ChevronDown } from "lucide-react";
import Prism from "prismjs";

// Import Prism language components in strict dependency order
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-markup"; // HTML/XML
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markdown";

import { Block } from "../types";

export const CODE_LANGUAGES = [
  { id: "plaintext", label: "Plain Text" },
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "cpp", label: "C++" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "markdown", label: "Markdown" },
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function highlightCode(code: string, language: string): string {
  if (!code) return "";
  const langKey = (language || "javascript").toLowerCase();

  if (langKey === "text" || langKey === "plaintext") {
    return escapeHtml(code);
  }

  if (!Prism || !Prism.languages) {
    return escapeHtml(code);
  }

  const grammarMap: Record<string, any> = {
    javascript: Prism.languages.javascript,
    js: Prism.languages.javascript,
    typescript: Prism.languages.typescript,
    ts: Prism.languages.typescript,
    python: Prism.languages.python,
    py: Prism.languages.python,
    java: Prism.languages.java,
    cpp: Prism.languages.cpp,
    "c++": Prism.languages.cpp,
    html: Prism.languages.markup,
    markup: Prism.languages.markup,
    xml: Prism.languages.markup,
    css: Prism.languages.css,
    json: Prism.languages.json,
    markdown: Prism.languages.markdown,
    md: Prism.languages.markdown,
  };

  const grammar = grammarMap[langKey] || Prism.languages[langKey];
  if (!grammar || typeof grammar !== "object") {
    return escapeHtml(code);
  }

  try {
    return Prism.highlight(code, grammar, langKey);
  } catch {
    return escapeHtml(code);
  }
}

interface CodeBlockProps {
  block: Block;
  activePageId: string;
  updateBlockData: (pageId: string, blockId: string, data: Partial<Block["data"]>) => void;
  updateBlockType: (pageId: string, blockId: string, type: any, extraData?: any) => void;
  setSelectedBlockId: (id: string | null) => void;
  isSelected: boolean;
  onNavigateUp: () => void;
  onNavigateDown: () => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  block,
  activePageId,
  updateBlockData,
  updateBlockType,
  setSelectedBlockId,
  isSelected,
  onNavigateUp,
  onNavigateDown,
}) => {
  const [copied, setCopied] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const lastSelectionRef = useRef<{ start: number; end: number } | null>(null);

  const saveSelection = () => {
    if (textareaRef.current) {
      lastSelectionRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
      };
    }
  };

  const rawText = block.data.text || "";
  const language = block.data.language || "javascript";

  const currentLangObj =
    CODE_LANGUAGES.find(
      (l) => l.id === language || (l.id === "plaintext" && (language === "text" || language === "plaintext"))
    ) || CODE_LANGUAGES[1];

  // Auto-resize textarea height to fit content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(80, textareaRef.current.scrollHeight)}px`;
    }
  }, [rawText]);

  // Click outside listener for language dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    if (langMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [langMenuOpen]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    updateBlockData(activePageId, block.id, { text: val });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    // Tab key: Insert 2 spaces or handle multi-line indentation
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();

      if (start === end) {
        // Single cursor position
        const newValue = value.substring(0, start) + "  " + value.substring(end);
        updateBlockData(activePageId, block.id, { text: newValue });

        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
          }
        }, 0);
      } else {
        // Multi-line selection
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const lineEnd = value.indexOf("\n", end);
        const effectiveEnd = lineEnd === -1 ? value.length : lineEnd;

        const selectedText = value.substring(lineStart, effectiveEnd);
        const indentedText = selectedText
          .split("\n")
          .map((line) => "  " + line)
          .join("\n");

        const newValue = value.substring(0, lineStart) + indentedText + value.substring(effectiveEnd);
        updateBlockData(activePageId, block.id, { text: newValue });

        const addedChars = indentedText.length - selectedText.length;
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = start + 2;
            textareaRef.current.selectionEnd = end + addedChars;
          }
        }, 0);
      }
      return;
    }

    // Shift+Tab key: Remove up to 2 spaces of indentation
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();

      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEnd = value.indexOf("\n", end);
      const effectiveEnd = lineEnd === -1 ? value.length : lineEnd;

      const selectedText = value.substring(lineStart, effectiveEnd);
      let charsRemovedFirstLine = 0;

      const unindentedText = selectedText
        .split("\n")
        .map((line, idx) => {
          let removed = 0;
          let newLine = line;
          if (newLine.startsWith("  ")) {
            newLine = newLine.substring(2);
            removed = 2;
          } else if (newLine.startsWith(" ")) {
            newLine = newLine.substring(1);
            removed = 1;
          } else if (newLine.startsWith("\t")) {
            newLine = newLine.substring(1);
            removed = 1;
          }
          if (idx === 0) charsRemovedFirstLine = removed;
          return newLine;
        })
        .join("\n");

      const newValue = value.substring(0, lineStart) + unindentedText + value.substring(effectiveEnd);
      updateBlockData(activePageId, block.id, { text: newValue });

      const totalRemoved = selectedText.length - unindentedText.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = Math.max(lineStart, start - charsRemovedFirstLine);
          textareaRef.current.selectionEnd = Math.max(lineStart, end - totalRemoved);
        }
      }, 0);
      return;
    }

    // Enter key inside Code Block: Insert newline with matching auto-indentation
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();

      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const currentLine = value.substring(lineStart, start);
      const matchIndent = currentLine.match(/^[ \t]*/);
      const indent = matchIndent ? matchIndent[0] : "";

      const newValue = value.substring(0, start) + "\n" + indent + value.substring(end);
      updateBlockData(activePageId, block.id, { text: newValue });

      const newCursorPos = start + 1 + indent.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos;
        }
      }, 0);
      return;
    }

    // Backspace: If empty code block, convert to paragraph
    if (e.key === "Backspace") {
      if (value === "") {
        e.preventDefault();
        e.stopPropagation();
        updateBlockType(activePageId, block.id, "paragraph", { text: "" });
        return;
      }
      if (start === 0 && end === 0) {
        // At the beginning of non-empty code block, navigate up
        e.preventDefault();
        e.stopPropagation();
        onNavigateUp();
        return;
      }
    }

    // ArrowUp: Navigate up if on the first line
    if (e.key === "ArrowUp") {
      const isFirstLine = !value.substring(0, start).includes("\n");
      if (isFirstLine) {
        e.preventDefault();
        e.stopPropagation();
        onNavigateUp();
        return;
      }
    }

    // ArrowDown: Navigate down if on the last line
    if (e.key === "ArrowDown") {
      const isLastLine = !value.substring(end).includes("\n");
      if (isLastLine) {
        e.preventDefault();
        e.stopPropagation();
        onNavigateDown();
        return;
      }
    }
  };

  const highlightedHtml = highlightCode(rawText, language);

  return (
    <div
      className={`group relative w-full rounded-xl bg-[#191919] text-stone-100 font-mono shadow-sm transition-all border ${
        isSelected ? "border-stone-500 ring-1 ring-stone-500" : "border-stone-800 hover:border-stone-700"
      }`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-stone-800/80 bg-[#202020] rounded-t-xl select-none text-xs">
        {/* Language Dropdown Selector */}
        <div className="relative" ref={langMenuRef}>
          <button
            type="button"
            contentEditable={false}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              setLangMenuOpen(!langMenuOpen);
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white font-sans text-xs font-medium cursor-pointer transition-colors"
          >
            <span>{currentLangObj.label}</span>
            <ChevronDown className="h-3 w-3 text-stone-400" />
          </button>

          {langMenuOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-40 max-h-56 overflow-y-auto rounded-lg bg-[#252525] border border-stone-700 shadow-xl py-1 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
              {CODE_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateBlockData(activePageId, block.id, { language: lang.id });
                    setLangMenuOpen(false);
                    setSelectedBlockId(block.id);
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                    }
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-stone-700 transition-colors cursor-pointer flex items-center justify-between ${
                    (language === lang.id || (language === "text" && lang.id === "plaintext"))
                      ? "text-white font-semibold bg-stone-700/50"
                      : "text-stone-300"
                  }`}
                >
                  <span>{lang.label}</span>
                  {(language === lang.id || (language === "text" && lang.id === "plaintext")) && (
                    <Check className="h-3 w-3 text-emerald-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Copy Button */}
        <button
          type="button"
          contentEditable={false}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-stone-400 hover:text-stone-200 hover:bg-stone-800 font-sans text-xs font-medium cursor-pointer transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Textarea & Syntax Highlighted Backdrop */}
      <div className="relative min-h-[70px] w-full p-3.5 font-mono text-[13px] leading-relaxed">
        <pre
          aria-hidden="true"
          className="pointer-events-none m-0 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words text-stone-100 selection:bg-stone-700"
          dangerouslySetInnerHTML={{ __html: highlightedHtml + (rawText.endsWith("\n") ? "<br/>" : "") }}
        />
        <textarea
          ref={textareaRef}
          id={`block-input-${block.id}`}
          value={rawText}
          onChange={(e) => {
            handleTextChange(e);
            saveSelection();
          }}
          onKeyDown={handleKeyDown}
          onSelect={saveSelection}
          onClick={saveSelection}
          onKeyUp={saveSelection}
          onFocus={() => {
            setSelectedBlockId(block.id);
            if (textareaRef.current && lastSelectionRef.current) {
              const { start, end } = lastSelectionRef.current;
              textareaRef.current.setSelectionRange(start, end);
            }
          }}
          placeholder="// Type code here..."
          spellCheck={false}
          className="absolute inset-0 w-full h-full p-3.5 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words bg-transparent text-transparent caret-stone-100 outline-none resize-none overflow-hidden"
        />
      </div>
    </div>
  );
};
