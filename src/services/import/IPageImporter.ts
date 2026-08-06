import { Block } from "../../types";

export interface ParsedPageData {
  title: string;
  icon?: string | null;
  coverImage?: string | null;
  blocks: Block[];
}

export interface IPageImporter {
  readonly id: string;
  readonly name: string;
  readonly supportedExtensions: string[];

  /**
   * Determines if this importer can handle the given filename or extension.
   */
  canImport(filename: string): boolean;

  /**
   * Parses string or binary content into a structured page model with blocks.
   */
  importPage(
    filename: string,
    content: string | Uint8Array
  ): Promise<ParsedPageData>;
}
