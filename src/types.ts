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
  | "image";

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

