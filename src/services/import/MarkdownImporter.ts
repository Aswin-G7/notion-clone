import { Block, BlockType } from "../../types";
import { IPageImporter, ParsedPageData } from "./IPageImporter";

export class MarkdownImporter implements IPageImporter {
  public readonly id = "markdown";
  public readonly name = "Markdown (.md)";
  public readonly supportedExtensions = ["md", "markdown"];

  public canImport(filename: string): boolean {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    return this.supportedExtensions.includes(ext);
  }

  public async importPage(
    filename: string,
    content: string | Uint8Array
  ): Promise<ParsedPageData> {
    const textContent =
      typeof content === "string"
        ? content
        : new TextDecoder("utf-8").decode(content);

    const lines = textContent.split(/\r?\n/);

    let extractedTitle: string | null = null;
    let extractedIcon: string | null = null;
    let extractedCoverImage: string | null = null;

    const blocks: Block[] = [];
    let lineIdx = 0;

    let blockCounter = 0;

    // Helper to generate a unique block ID
    const generateBlockId = (): string =>
      `block-imp-${Date.now()}-${++blockCounter}-${Math.random().toString(36).substr(2, 6)}`;

    // Regex for emoji at the beginning of a title string
    const EMOJI_REGEX = /^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E6}-\u{1F1FF}])/u;

    while (lineIdx < lines.length) {
      const currentLine = lines[lineIdx];
      const trimmedLine = currentLine.trim();

      // Skip empty lines between blocks
      if (!trimmedLine) {
        lineIdx++;
        continue;
      }

      // 1. Cover Image metadata check at top of file (e.g. ![Cover Image](url))
      if (lineIdx === 0 && !extractedCoverImage) {
        const coverMatch = trimmedLine.match(/^\!\[(?:Cover|Cover Image)\]\((.*?)\)$/i);
        if (coverMatch) {
          extractedCoverImage = coverMatch[1].trim();
          lineIdx++;
          continue;
        }
      }

      // 1b. Workspace Container Directive Block (:::callout, :::child-page, :::toggle, etc.)
      const directiveStart = trimmedLine.match(/^:::\s*([a-zA-Z0-9_-]+)$/);
      if (directiveStart) {
        const directiveType = directiveStart[1].toLowerCase();
        lineIdx++;

        const directiveLines: string[] = [];
        while (lineIdx < lines.length) {
          const dLine = lines[lineIdx];
          if (dLine.trim().match(/^:::\s*$/)) {
            lineIdx++; // Consume closing :::
            break;
          }
          directiveLines.push(dLine);
          lineIdx++;
        }

        // Parse key-value metadata headers vs body text
        const metadata: Record<string, string> = {};
        const bodyLines: string[] = [];
        let readingMetadata = true;

        for (const dLine of directiveLines) {
          const trimmed = dLine.trim();
          if (readingMetadata) {
            if (!trimmed) {
              // First empty line separates header metadata from body
              readingMetadata = false;
              continue;
            }
            const kvMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
            if (kvMatch) {
              metadata[kvMatch[1].toLowerCase()] = kvMatch[2].trim();
            } else {
              readingMetadata = false;
              bodyLines.push(dLine);
            }
          } else {
            bodyLines.push(dLine);
          }
        }

        const bodyText = bodyLines.join("\n").trim();

        switch (directiveType) {
          case "callout": {
            blocks.push({
              id: generateBlockId(),
              type: "callout",
              data: {
                icon: metadata["icon"] || "💡",
                text: bodyText || metadata["text"] || "",
              },
            });
            break;
          }

          case "child-page": {
            const title = metadata["title"] || bodyText || "Sub Page";
            const pageId = metadata["id"] || metadata["pageid"] || "";
            blocks.push({
              id: generateBlockId(),
              type: "child-page",
              data: {
                pageId: pageId,
                text: title,
              },
            });
            break;
          }

          case "toggle": {
            const title = metadata["title"] || bodyText || "Toggle";
            const collapsed = metadata["collapsed"] === "true";
            blocks.push({
              id: generateBlockId(),
              type: "toggle",
              data: {
                text: title,
                collapsed,
              },
            });
            break;
          }

          default: {
            blocks.push({
              id: generateBlockId(),
              type: directiveType as BlockType,
              data: {
                ...metadata,
                text: bodyText || metadata["text"] || "",
              },
            });
            break;
          }
        }

        continue;
      }

      // 2. Code Fence Block (```lang or ~~~lang)
      const codeFenceStart = trimmedLine.match(/^(```|~~~)(.*)$/);
      if (codeFenceStart) {
        const fenceType = codeFenceStart[1];
        const language = codeFenceStart[2].trim();
        const codeLines: string[] = [];
        lineIdx++;

        while (lineIdx < lines.length) {
          const nextLine = lines[lineIdx];
          if (nextLine.trim().startsWith(fenceType)) {
            lineIdx++; // Consume closing fence
            break;
          }
          codeLines.push(nextLine);
          lineIdx++;
        }

        blocks.push({
          id: generateBlockId(),
          type: "code",
          data: {
            text: codeLines.join("\n"),
            language: language || "javascript",
          },
        });
        continue;
      }

      // 3. Table Block (| Col 1 | Col 2 |)
      if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
        const tableRows: string[][] = [];
        let isFirstRow = true;

        while (lineIdx < lines.length) {
          const tableLine = lines[lineIdx].trim();
          if (!tableLine.startsWith("|") || !tableLine.endsWith("|")) {
            break;
          }

          // Skip separator row (e.g. | --- | --- |)
          const isSeparator = /^\|(?:\s*:?-+:?\s*\|)+$/.test(tableLine);
          if (isSeparator) {
            lineIdx++;
            continue;
          }

          // Parse cell items
          const cells = tableLine
            .slice(1, -1)
            .split("|")
            .map((cell) => cell.trim());

          tableRows.push(cells);
          lineIdx++;
        }

        if (tableRows.length > 0) {
          blocks.push({
            id: generateBlockId(),
            type: "table",
            data: {
              rows: tableRows,
              hasHeaderRow: true,
              hasHeaderColumn: false,
            },
          });
        }
        continue;
      }

      // 4. Heading Block (# H1, ## H2, ### H3, etc.)
      const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        let headingText = headingMatch[2].trim();

        // If this is the very first heading in the file, extract as Page Title & Icon
        if (extractedTitle === null && level === 1) {
          const emojiMatch = headingText.match(EMOJI_REGEX);
          if (emojiMatch) {
            extractedIcon = emojiMatch[1];
            headingText = headingText.slice(emojiMatch[0].length).trim();
          }
          extractedTitle = headingText || "Untitled";
          lineIdx++;
          continue; // Top H1 becomes page header title, skip adding duplicate block
        }

        blocks.push({
          id: generateBlockId(),
          type: "heading",
          data: {
            text: headingText,
            level: Math.min(Math.max(level, 1), 3),
          },
        });
        lineIdx++;
        continue;
      }

      // 5. Horizontal Rule / Divider (---, ***, ___)
      if (/^(---|\*\*\*|___)\s*$/.test(trimmedLine)) {
        blocks.push({
          id: generateBlockId(),
          type: "divider",
          data: {},
        });
        lineIdx++;
        continue;
      }

      // 6. Standalone Image Block (![alt](url))
      const imageMatch = trimmedLine.match(/^\!\[(.*?)\]\((.*?)\)$/);
      if (imageMatch) {
        blocks.push({
          id: generateBlockId(),
          type: "image",
          data: {
            caption: imageMatch[1] || "Image",
            url: imageMatch[2],
          },
        });
        lineIdx++;
        continue;
      }

      // 7. Todo List Block (- [ ] item, - [x] item)
      const todoMatch = trimmedLine.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
      if (todoMatch) {
        const isChecked = todoMatch[1].toLowerCase() === "x";
        blocks.push({
          id: generateBlockId(),
          type: "todo",
          data: {
            text: todoMatch[2].trim(),
            checked: isChecked,
          },
        });
        lineIdx++;
        continue;
      }

      // 8. Bulleted List Block (- item, * item, + item)
      const bulletMatch = trimmedLine.match(/^[-*+]\s+(.*)$/);
      if (bulletMatch) {
        blocks.push({
          id: generateBlockId(),
          type: "bulleted-list",
          data: {
            text: bulletMatch[1].trim(),
          },
        });
        lineIdx++;
        continue;
      }

      // 9. Numbered List Block (1. item, 2. item)
      const numberMatch = trimmedLine.match(/^\d+\.\s+(.*)$/);
      if (numberMatch) {
        blocks.push({
          id: generateBlockId(),
          type: "numbered-list",
          data: {
            text: numberMatch[1].trim(),
          },
        });
        lineIdx++;
        continue;
      }

      // 10. Quote Block (> quote text)
      if (trimmedLine.startsWith(">")) {
        const quoteLines: string[] = [];
        while (lineIdx < lines.length) {
          const qLine = lines[lineIdx].trim();
          if (!qLine.startsWith(">")) break;
          // Strip leading '>' and space
          quoteLines.push(qLine.replace(/^>\s?/, ""));
          lineIdx++;
        }

        blocks.push({
          id: generateBlockId(),
          type: "quote",
          data: {
            text: quoteLines.join("\n"),
          },
        });
        continue;
      }

      // 11. HTML Details / Toggle Block (<details><summary>Title</summary>Content</details>)
      if (trimmedLine.startsWith("<details>")) {
        let summaryText = "Toggle";
        const toggleLines: string[] = [];
        lineIdx++;

        while (lineIdx < lines.length) {
          const tLine = lines[lineIdx].trim();
          if (tLine.startsWith("</details>")) {
            lineIdx++;
            break;
          }
          const sumMatch = tLine.match(/<summary>(.*?)<\/summary>/i);
          if (sumMatch) {
            summaryText = sumMatch[1].trim();
          } else {
            toggleLines.push(tLine);
          }
          lineIdx++;
        }

        blocks.push({
          id: generateBlockId(),
          type: "toggle",
          data: {
            text: summaryText,
          },
        });
        continue;
      }

      // 12. Default Paragraph Block
      blocks.push({
        id: generateBlockId(),
        type: "paragraph",
        data: {
          text: trimmedLine,
        },
      });
      lineIdx++;
    }

    // Determine fallback title from filename if no top H1 was extracted
    if (!extractedTitle) {
      const cleanFilename = filename
        .replace(/\.(md|markdown)$/i, "")
        .replace(/[-_]/g, " ")
        .trim();
      extractedTitle = cleanFilename || "Untitled Page";
    }

    // Ensure at least one default editable block exists if file was empty
    if (blocks.length === 0) {
      blocks.push({
        id: generateBlockId(),
        type: "paragraph",
        data: { text: "" },
      });
    }

    return {
      title: extractedTitle,
      icon: extractedIcon || "📄",
      coverImage: extractedCoverImage || null,
      blocks,
    };
  }
}
