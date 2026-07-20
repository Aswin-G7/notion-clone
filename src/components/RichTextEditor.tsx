import React, { useEffect, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
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
  COMMAND_PRIORITY_NORMAL,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  FOCUS_COMMAND,
} from "lexical";

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
              const shortcuts = ["#", "##", "###", "-", "*", "1.", "[]", ">", "```"];
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
    theme: {
      paragraph: "m-0 whitespace-pre-wrap break-words",
      text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
        strikethrough: "line-through",
        code: "bg-stone-100 text-stone-800 px-1 py-0.5 rounded font-mono text-[13px]",
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
        <SyncValuePlugin value={value} lastHtmlRef={lastHtmlRef} />
        <FocusPlugin isSelected={isSelected} />
        <ShortcutsPlugin onKeyDown={onKeyDown} onFocus={onFocus} />
      </div>
    </LexicalComposer>
  );
};
