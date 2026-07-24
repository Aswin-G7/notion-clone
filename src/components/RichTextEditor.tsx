import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bold, Italic, Underline, Strikethrough, Code, Link as LinkIcon, Unlink, X } from "lucide-react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { LinkNode, AutoLinkNode, TOGGLE_LINK_COMMAND, $isLinkNode } from "@lexical/link";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  ElementNode,
  TextNode,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
  KEY_ESCAPE_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_NORMAL,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  FOCUS_COMMAND,
} from "lexical";

// Helper to sanitize URLs by adding default https:// protocol if missing
function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

// Helper to detect if current selection is in a LinkNode and return its URL
function getLinkUrlFromSelection(selection: any): { isLink: boolean; url: string } {
  if (!$isRangeSelection(selection)) {
    return { isLink: false, url: "" };
  }
  const nodes = selection.getNodes();
  for (const node of nodes) {
    if ($isLinkNode(node)) {
      return { isLink: true, url: node.getURL() };
    }
    const parent = node.getParent();
    if ($isLinkNode(parent)) {
      return { isLink: true, url: parent.getURL() };
    }
  }
  return { isLink: false, url: "" };
}

// Helper to calculate the exact selection offsets in the plain text representation
function getSelectionOffsets(editor: any) {
  let start = 0;
  let end = 0;
  let text = "";

  editor.getEditorState().read(() => {
    const root = $getRoot();
    text = root.getTextContent();
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      const anchor = selection.anchor;
      const focus = selection.focus;

      const getAbsoluteOffset = (targetKey: string, targetOffset: number): number => {
        let offset = 0;
        let found = false;

        function traverse(node: any) {
          if (found) return;

          if (node.getKey() === targetKey) {
            offset += targetOffset;
            found = true;
            return;
          }

          if (node instanceof TextNode) {
            offset += node.getTextContent().length;
          } else if (node instanceof ElementNode || typeof node.getChildren === "function") {
            const children = node.getChildren();
            for (const child of children) {
              traverse(child);
              if (found) return;
            }
          }
        }

        traverse(root);
        return found ? offset : 0;
      };

      const anchorAbs = getAbsoluteOffset(anchor.key, anchor.offset);
      const focusAbs = getAbsoluteOffset(focus.key, focus.offset);

      start = Math.min(anchorAbs, focusAbs);
      end = Math.max(anchorAbs, focusAbs);
    }
  });

  return { start, end, text };
}

// Plugin to synchronize parent's value to Lexical when changed externally
interface SyncValuePluginProps {
  value: string;
  lastHtmlRef: React.MutableRefObject<string>;
}

function SyncValuePlugin({ value, lastHtmlRef }: SyncValuePluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (value === lastHtmlRef.current) {
      return;
    }

    lastHtmlRef.current = value;

    editor.update(() => {
      const root = $getRoot();
      const currentHtml = $generateHtmlFromNodes(editor, null);
      if (currentHtml !== value) {
        root.clear();
        const parser = new DOMParser();
        const dom = parser.parseFromString(value || "", "text/html");
        const nodes = $generateNodesFromDOM(editor, dom);

        const paragraph = $createParagraphNode();
        for (const node of nodes) {
          if (node instanceof ElementNode && !node.isInline()) {
            const children = node.getChildren();
            for (const child of children) {
              paragraph.append(child);
            }
          } else {
            paragraph.append(node);
          }
        }
        root.append(paragraph);
      }
    });
  }, [value, editor, lastHtmlRef]);

  return null;
}

// Plugin to manage reactive focus and cursor placement
function FocusPlugin({ isSelected }: { isSelected: boolean }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (isSelected) {
      editor.focus();
      editor.update(() => {
        const selection = $getSelection();
        if (!selection || !$isRangeSelection(selection)) {
          const root = $getRoot();
          root.selectEnd();
        }
      });
    }
  }, [isSelected, editor]);

  return null;
}

// Custom plugin to handle keyboard shortcuts, focus, and block-level key intercepts
interface ShortcutsPluginProps {
  onKeyDown: (e: any) => void;
  onFocus: () => void;
}

function ShortcutsPlugin({ onKeyDown, onFocus }: ShortcutsPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // 1. Focus command listener
    const removeFocusListener = editor.registerCommand(
      FOCUS_COMMAND,
      () => {
        onFocus();
        return false; // let other handlers run (like Lexical's own focus handling)
      },
      COMMAND_PRIORITY_LOW
    );

    // 2. Keydown command listener
    const removeKeyDownListener = editor.registerCommand<KeyboardEvent>(
      KEY_DOWN_COMMAND,
      (event) => {
        const { key, ctrlKey, metaKey, shiftKey } = event;
        const keyLower = key.toLowerCase();
        const isMetaOrCtrl = ctrlKey || metaKey;

        // --- Formatting Shortcuts ---
        // 1. Ctrl+Shift+S (Strikethrough)
        if (isMetaOrCtrl && shiftKey && keyLower === "s") {
          event.preventDefault();
          event.stopPropagation();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
          return true;
        }

        // 2. Ctrl+` (Inline Code)
        if (isMetaOrCtrl && !shiftKey && key === "`") {
          event.preventDefault();
          event.stopPropagation();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
          return true;
        }

        // --- Block-Level Intercepts (Enter, Backspace, ArrowUp, ArrowDown, Space) ---
        const interceptKeys = ["enter", "backspace", "arrowup", "arrowdown", " "];
        if (interceptKeys.includes(keyLower)) {
          const { start, end, text } = getSelectionOffsets(editor);

          let shouldIntercept = false;

          if (keyLower === "enter" && !shiftKey) {
            shouldIntercept = true;
          } else if (keyLower === "backspace") {
            // Only merge/delete blocks if selection is collapsed at the very start
            if (start === 0 && end === 0) {
              shouldIntercept = true;
            }
          } else if (keyLower === "arrowup") {
            // Only navigate blocks if selection is collapsed at the very start
            if (start === 0 && end === 0) {
              shouldIntercept = true;
            }
          } else if (keyLower === "arrowdown") {
            // Only navigate blocks if selection is collapsed at the very end
            if (start === text.length && end === text.length) {
              shouldIntercept = true;
            }
          } else if (keyLower === " ") {
            // Only handle markdown shortcuts if selection is collapsed
            if (start === end) {
              const textBeforeCursor = text.substring(0, start);
              const shortcuts = ["#", "##", "###", "-", "*", "1.", "[]", ">", "!", '"', "|", "```"];
              if (shortcuts.includes(textBeforeCursor)) {
                shouldIntercept = true;
              }
            }
          }

          if (shouldIntercept) {
            event.preventDefault();
            event.stopPropagation();

            // Create adapted keyboard event that mimics an HTMLTextAreaElement / HTMLInputElement event
            const adaptedEvent = {
              key: event.key,
              shiftKey: event.shiftKey,
              preventDefault: () => {}, // already prevented
              stopPropagation: () => {}, // already stopped
              currentTarget: {
                value: text,
                selectionStart: start,
                selectionEnd: end,
              },
            };

            onKeyDown(adaptedEvent);
            return true;
          }
        }

        return false;
      },
      COMMAND_PRIORITY_HIGH
    );

    return () => {
      removeFocusListener();
      removeKeyDownListener();
    };
  }, [editor, onKeyDown, onFocus]);

  return null;
}

function FloatingToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);

  const [isLink, setIsLink] = useState(false);
  const [currentLinkUrl, setCurrentLinkUrl] = useState("");

  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const showLinkPopoverRef = useRef(false);
  const [linkInputUrl, setLinkInputUrl] = useState("");

  const closeLinkPopover = useCallback(() => {
    showLinkPopoverRef.current = false;
    setShowLinkPopover(false);
  }, []);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      const { isLink: hasLink, url } = getLinkUrlFromSelection(selection);
      setIsLink(hasLink);
      setCurrentLinkUrl(url);

      if (!selection.isCollapsed()) {
        setIsBold(selection.hasFormat("bold"));
        setIsItalic(selection.hasFormat("italic"));
        setIsUnderline(selection.hasFormat("underline"));
        setIsStrikethrough(selection.hasFormat("strikethrough"));
        setIsCode(selection.hasFormat("code"));

        const nativeSelection = window.getSelection();
        if (nativeSelection && nativeSelection.rangeCount > 0) {
          const domRange = nativeSelection.getRangeAt(0);
          const rect = domRange.getBoundingClientRect();

          if (rect.width > 0 || rect.height > 0) {
            setPosition({
              top: Math.max(10, rect.top - 8),
              left: Math.max(20, Math.min(window.innerWidth - 20, rect.left + rect.width / 2)),
            });
            setIsVisible(true);
            return;
          }
        }
      }
    }

    if (!showLinkPopoverRef.current) {
      setIsVisible(false);
    }
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, updateToolbar]);

  const openLinkPopover = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const { isLink: hasLink, url } = getLinkUrlFromSelection(selection);
        if (!selection.isCollapsed() || hasLink) {
          setLinkInputUrl(url);
          showLinkPopoverRef.current = true;
          setShowLinkPopover(true);
          setIsVisible(true);

          const nativeSelection = window.getSelection();
          if (nativeSelection && nativeSelection.rangeCount > 0) {
            const domRange = nativeSelection.getRangeAt(0);
            const rect = domRange.getBoundingClientRect();
            if (rect.width > 0 || rect.height > 0) {
              setPosition({
                top: Math.max(10, rect.top - 8),
                left: Math.max(20, Math.min(window.innerWidth - 20, rect.left + rect.width / 2)),
              });
            }
          }
        }
      }
    });
  }, [editor]);

  // Ctrl+K / Cmd+K listener
  useEffect(() => {
    return editor.registerCommand<KeyboardEvent>(
      KEY_DOWN_COMMAND,
      (event) => {
        const { key, ctrlKey, metaKey } = event;
        if ((ctrlKey || metaKey) && key.toLowerCase() === "k") {
          event.preventDefault();
          event.stopPropagation();
          openLinkPopover();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL
    );
  }, [editor, openLinkPopover]);

  useEffect(() => {
    const handleScrollOrResize = () => {
      if (isVisible) {
        editor.getEditorState().read(() => {
          updateToolbar();
        });
      }
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [editor, isVisible, updateToolbar]);

  const closeFloatingToolbar = useCallback(() => {
    if (showLinkPopoverRef.current) {
      closeLinkPopover();
    }
    setIsVisible(false);
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.anchor.set(
          selection.focus.key,
          selection.focus.offset,
          selection.focus.type
        );
      }
    });
    editor.focus();
  }, [closeLinkPopover, editor]);

  const handleEscape = useCallback(() => {
    closeFloatingToolbar();
  }, [closeFloatingToolbar]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (event) => {
        if (isVisible || showLinkPopoverRef.current) {
          event.preventDefault();
          closeFloatingToolbar();
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [closeFloatingToolbar, editor, isVisible]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isVisible || showLinkPopoverRef.current) {
          e.preventDefault();
          closeFloatingToolbar();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeFloatingToolbar, isVisible]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // If target was unmounted/detached during state change in mousedown (e.g., button replaced by popover), ignore it
      const isDetached = !document.body.contains(target);
      const isInsideToolbar = toolbarRef.current?.contains(target);
      const rootElement = editor.getRootElement();
      const isInsideRoot = rootElement?.contains(target);

      if (!isDetached && !isInsideToolbar && !isInsideRoot) {
        setIsVisible(false);
        closeLinkPopover();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [closeLinkPopover, editor]);

  useEffect(() => {
    if (showLinkPopover && linkInputRef.current) {
      linkInputRef.current.focus();
      linkInputRef.current.select();
    }
  }, [showLinkPopover]);

  if (!isVisible || !position) {
    return null;
  }

  const formatText = (format: "bold" | "italic" | "underline" | "strikethrough" | "code") => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const handleApplyLink = () => {
    const formattedUrl = sanitizeUrl(linkInputUrl);
    if (formattedUrl) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, formattedUrl);
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
    closeFloatingToolbar();
  };

  const handleRemoveLink = () => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    closeFloatingToolbar();
  };

  const handleCloseLinkPopover = () => {
    closeLinkPopover();
    editor.focus();
  };

  return createPortal(
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translate(-50%, -100%)",
      }}
      className="z-50 flex items-center gap-0.5 p-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg select-none transition-opacity duration-150"
    >
      {showLinkPopover ? (
        <div className="flex items-center gap-1.5 p-0.5 min-w-[280px]">
          <LinkIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 ml-1" />
          <input
            ref={linkInputRef}
            type="text"
            placeholder="Paste or type URL..."
            value={linkInputUrl}
            onChange={(e) => setLinkInputUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleApplyLink();
              } else if (e.key === "Escape") {
                e.preventDefault();
                handleCloseLinkPopover();
              }
            }}
            className="flex-1 text-xs px-2 py-1 rounded border border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleApplyLink();
            }}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors cursor-pointer"
            title="Apply link (Enter)"
          >
            Apply
          </button>
          {isLink && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleRemoveLink();
              }}
              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors cursor-pointer"
              title="Remove link"
            >
              <Unlink className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              handleCloseLinkPopover();
            }}
            className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded transition-colors cursor-pointer"
            title="Cancel (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              formatText("bold");
            }}
            className={`p-1.5 rounded transition-colors ${
              isBold
                ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white font-semibold"
                : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              formatText("italic");
            }}
            className={`p-1.5 rounded transition-colors ${
              isItalic
                ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white font-semibold"
                : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              formatText("underline");
            }}
            className={`p-1.5 rounded transition-colors ${
              isUnderline
                ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white font-semibold"
                : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            }`}
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              formatText("strikethrough");
            }}
            className={`p-1.5 rounded transition-colors ${
              isStrikethrough
                ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white font-semibold"
                : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            }`}
            title="Strikethrough (Ctrl+Shift+S)"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              formatText("code");
            }}
            className={`p-1.5 rounded transition-colors ${
              isCode
                ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white font-semibold"
                : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            }`}
            title="Inline Code (Ctrl+`)"
          >
            <Code className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              openLinkPopover();
            }}
            className={`p-1.5 rounded transition-colors ${
              isLink
                ? "bg-neutral-200 dark:bg-neutral-700 text-blue-600 dark:text-blue-400 font-semibold"
                : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            }`}
            title={isLink ? `Edit link: ${currentLinkUrl} (Ctrl+K)` : "Insert link (Ctrl+K)"}
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        </>
      )}
    </div>,
    document.body
  );
}

interface RichTextEditorProps {
  id: string;
  value: string;
  onChange: (val: string) => void;
  onKeyDown: (e: any) => void;
  onFocus: () => void;
  placeholder: string;
  className: string;
  placeholderClassName?: string;
  isSelected?: boolean;
  style?: React.CSSProperties;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  id,
  value,
  onChange,
  onKeyDown,
  onFocus,
  placeholder,
  className,
  placeholderClassName = "text-stone-300",
  isSelected = false,
  style,
}) => {
  const lastHtmlRef = useRef(value);

  const initialConfig = {
    namespace: `block-${id}`,
    nodes: [LinkNode, AutoLinkNode],
    theme: {
      paragraph: "m-0 whitespace-pre-wrap break-words",
      link: "text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer",
      text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
        strikethrough: "line-through",
        code: "bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-1 py-0.5 rounded font-mono text-[13px]",
      },
    },
    onError: (error: Error) => {
      console.error("Lexical Error:", error);
    },
    editorState: (editor: any) => {
      const root = $getRoot();
      if (root.isEmpty()) {
        const parser = new DOMParser();
        const dom = parser.parseFromString(value || "", "text/html");
        const nodes = $generateNodesFromDOM(editor, dom);

        const paragraph = $createParagraphNode();
        for (const node of nodes) {
          if (node instanceof ElementNode && !node.isInline()) {
            const children = node.getChildren();
            for (const child of children) {
              paragraph.append(child);
            }
          } else {
            paragraph.append(node);
          }
        }
        root.append(paragraph);
      }
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative w-full">
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              id={id}
              className={`outline-none w-full bg-transparent ${className}`}
              style={style}
            />
          }
          placeholder={
            <div
              className={`absolute top-0 left-0 pointer-events-none select-none py-0.5 ${placeholderClassName}`}
            >
              {placeholder}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <OnChangePlugin
          onChange={(editorState, editor) => {
            editorState.read(() => {
              const html = $generateHtmlFromNodes(editor, null);
              if (html !== lastHtmlRef.current) {
                lastHtmlRef.current = html;
                onChange(html);
              }
            });
          }}
        />
        <LinkPlugin />
        <SyncValuePlugin value={value} lastHtmlRef={lastHtmlRef} />
        <FocusPlugin isSelected={isSelected} />
        <ShortcutsPlugin onKeyDown={onKeyDown} onFocus={onFocus} />
        <FloatingToolbarPlugin />
      </div>
    </LexicalComposer>
  );
};
