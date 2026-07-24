export type BlockType =
  | "paragraph"
  | "heading"
  | "child-page"
  | "bulleted-list"
  | "numbered-list"
  | "todo"
  | "quote"
  | "code"
  | "divider"
  | "image"
  | "toggle"
  | "callout"
  | "table";

export interface Block {
  id: string;
  type: BlockType;
  data: {
    text?: string;
    level?: number; // for heading level (e.g. 1, 2, 3)
    pageId?: string; // for child-page block type
    checked?: boolean; // for todo check status
    language?: string; // for code block syntax highlighting (optional)
    url?: string; // for image block URL/src
    caption?: string; // for image block caption
    width?: number; // for image block width percentage (e.g. 20 to 100)
    collapsed?: boolean; // for toggle block collapsed state
    parentId?: string | null; // for nested child blocks inside a toggle
    icon?: string; // for callout icon/emoji
    rows?: string[][]; // for table block cell matrix
    hasHeaderRow?: boolean; // for table block header row
    hasHeaderColumn?: boolean; // for table block header column
  };
}

export interface Page {
  id: string;
  title: string;
  icon?: string; // e.g. emoji
  coverImage?: string;
  isFavorite?: boolean;
  parentId?: string | null;
  children: string[]; // array of child page ids
  blocks: Block[];
  createdAt: number;
  updatedAt: number;
}

