import React from "react";
import { Block, BlockType, Page } from "../../types";
import { ParagraphBlock } from "./ParagraphBlock";
import { HeadingBlock } from "./HeadingBlock";
import { BulletListBlock } from "./BulletListBlock";
import { NumberedListBlock } from "./NumberedListBlock";
import { TodoBlock } from "./TodoBlock";
import { QuoteBlock } from "./QuoteBlock";
import { ToggleBlock } from "./ToggleBlock";
import { CalloutBlock } from "./CalloutBlock";
import { DividerBlock } from "./DividerBlock";
import { ChildPageBlock } from "./ChildPageBlock";
import { CodeBlock } from "../CodeBlock";
import { TableBlock } from "../TableBlock";
import { ImageBlock } from "../ImageBlock";

export interface BlockRendererProps {
  block: Block;
  activePage: Page;
  pages: Page[];
  isSelected: boolean;
  handleBlockChange: (blockId: string, val: string) => void;
  handleKeyDown: (e: React.KeyboardEvent, block: Block) => void;
  setSelectedBlockId: (id: string | null) => void;
  updateBlockData: (pageId: string, blockId: string, data: any) => void;
  updateBlockType: (pageId: string, blockId: string, type: BlockType) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  handleDeleteBlock: (blockId: string) => void;
  addBlock: (pageId: string, type: BlockType, text?: string, targetBlockId?: string) => string;
  setActivePageId: (id: string) => void;
  handleChildPageKeyDown: (e: React.KeyboardEvent, block: Block) => void;
  isBlockVisible: (block: Block, blocksMap: Map<string, Block>) => boolean;
  // Slash menu state
  slashMenuOpen: boolean;
  slashMenuBlockId: string | null;
  slashMenuSearch: string;
  handleSelectCommand: (cmd: any) => void;
  setSlashMenuOpen: (open: boolean) => void;
  setSlashMenuBlockId: (id: string | null) => void;
  setSlashMenuSearch: (text: string) => void;
  // Emoji picker state
  calloutEmojiPickerBlockId: string | null;
  setCalloutEmojiPickerBlockId: (id: string | null) => void;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  activePage,
  pages,
  isSelected,
  handleBlockChange,
  handleKeyDown,
  setSelectedBlockId,
  updateBlockData,
  updateBlockType,
  deleteBlock,
  handleDeleteBlock,
  addBlock,
  setActivePageId,
  handleChildPageKeyDown,
  isBlockVisible,
  slashMenuOpen,
  slashMenuBlockId,
  slashMenuSearch,
  handleSelectCommand,
  setSlashMenuOpen,
  setSlashMenuBlockId,
  setSlashMenuSearch,
  calloutEmojiPickerBlockId,
  setCalloutEmojiPickerBlockId,
}) => {
  switch (block.type) {
    case "paragraph":
      return (
        <ParagraphBlock
          block={block}
          handleBlockChange={handleBlockChange}
          handleKeyDown={handleKeyDown}
          setSelectedBlockId={setSelectedBlockId}
          isSelected={isSelected}
          slashMenuOpen={slashMenuOpen}
          slashMenuBlockId={slashMenuBlockId}
          slashMenuSearch={slashMenuSearch}
          handleSelectCommand={handleSelectCommand}
          setSlashMenuOpen={setSlashMenuOpen}
          setSlashMenuBlockId={setSlashMenuBlockId}
          setSlashMenuSearch={setSlashMenuSearch}
        />
      );

    case "heading":
      return (
        <HeadingBlock
          block={block}
          handleBlockChange={handleBlockChange}
          handleKeyDown={handleKeyDown}
          setSelectedBlockId={setSelectedBlockId}
          isSelected={isSelected}
        />
      );

    case "bulleted-list":
      return (
        <BulletListBlock
          block={block}
          handleBlockChange={handleBlockChange}
          handleKeyDown={handleKeyDown}
          setSelectedBlockId={setSelectedBlockId}
          isSelected={isSelected}
        />
      );

    case "numbered-list":
      return (
        <NumberedListBlock
          block={block}
          activePage={activePage}
          handleBlockChange={handleBlockChange}
          handleKeyDown={handleKeyDown}
          setSelectedBlockId={setSelectedBlockId}
          isSelected={isSelected}
        />
      );

    case "todo":
      return (
        <TodoBlock
          block={block}
          activePageId={activePage.id}
          handleBlockChange={handleBlockChange}
          handleKeyDown={handleKeyDown}
          updateBlockData={updateBlockData}
          setSelectedBlockId={setSelectedBlockId}
          isSelected={isSelected}
        />
      );

    case "quote":
      return (
        <QuoteBlock
          block={block}
          handleBlockChange={handleBlockChange}
          handleKeyDown={handleKeyDown}
          setSelectedBlockId={setSelectedBlockId}
          isSelected={isSelected}
        />
      );

    case "toggle":
      return (
        <ToggleBlock
          block={block}
          activePageId={activePage.id}
          handleBlockChange={handleBlockChange}
          handleKeyDown={handleKeyDown}
          updateBlockData={updateBlockData}
          setSelectedBlockId={setSelectedBlockId}
          isSelected={isSelected}
        />
      );

    case "callout":
      return (
        <CalloutBlock
          block={block}
          activePageId={activePage.id}
          handleBlockChange={handleBlockChange}
          handleKeyDown={handleKeyDown}
          updateBlockData={updateBlockData}
          calloutEmojiPickerBlockId={calloutEmojiPickerBlockId}
          setCalloutEmojiPickerBlockId={setCalloutEmojiPickerBlockId}
          setSelectedBlockId={setSelectedBlockId}
          isSelected={isSelected}
        />
      );

    case "code": {
      const blocksMap = new Map<string, Block>(activePage.blocks.map((b) => [b.id, b]));
      const visibleBlocks = activePage.blocks.filter((b) => isBlockVisible(b, blocksMap));
      const currentIndex = visibleBlocks.findIndex((b) => b.id === block.id);
      const prevBlock = currentIndex > 0 ? visibleBlocks[currentIndex - 1] : null;
      const nextBlock = currentIndex < visibleBlocks.length - 1 ? visibleBlocks[currentIndex + 1] : null;

      return (
        <CodeBlock
          block={block}
          activePageId={activePage.id}
          updateBlockData={updateBlockData}
          updateBlockType={updateBlockType}
          setSelectedBlockId={setSelectedBlockId}
          isSelected={isSelected}
          onNavigateUp={() => {
            if (prevBlock) {
              setSelectedBlockId(prevBlock.id);
              const el = document.getElementById(`block-input-${prevBlock.id}`);
              if (el) el.focus();
            }
          }}
          onNavigateDown={() => {
            if (nextBlock) {
              setSelectedBlockId(nextBlock.id);
              const el = document.getElementById(`block-input-${nextBlock.id}`);
              if (el) el.focus();
            }
          }}
        />
      );
    }

    case "table": {
      const blocksMap = new Map<string, Block>(activePage.blocks.map((b) => [b.id, b]));
      const visibleBlocks = activePage.blocks.filter((b) => isBlockVisible(b, blocksMap));
      const currentIndex = visibleBlocks.findIndex((b) => b.id === block.id);
      const prevBlock = currentIndex > 0 ? visibleBlocks[currentIndex - 1] : null;
      const nextBlock = currentIndex < visibleBlocks.length - 1 ? visibleBlocks[currentIndex + 1] : null;

      return (
        <TableBlock
          block={block}
          activePageId={activePage.id}
          updateBlockData={updateBlockData}
          updateBlockType={updateBlockType}
          setSelectedBlockId={setSelectedBlockId}
          isSelected={isSelected}
          onNavigateUp={() => {
            if (prevBlock) {
              setSelectedBlockId(prevBlock.id);
              const el = document.getElementById(`block-input-${prevBlock.id}`);
              if (el) el.focus();
            }
          }}
          onNavigateDown={() => {
            if (nextBlock) {
              setSelectedBlockId(nextBlock.id);
              const el = document.getElementById(`block-input-${nextBlock.id}`);
              if (el) el.focus();
            }
          }}
        />
      );
    }

    case "divider":
      return (
        <DividerBlock
          block={block}
          activePage={activePage}
          handleDeleteBlock={handleDeleteBlock}
          setSelectedBlockId={setSelectedBlockId}
          isSelected={isSelected}
        />
      );

    case "image":
      return (
        <ImageBlock
          block={block}
          isSelected={isSelected}
          onUpdateData={(data) => updateBlockData(activePage.id, block.id, data)}
          onSelectBlock={() => setSelectedBlockId(block.id)}
          onDeleteBlock={() => handleDeleteBlock(block.id)}
          onNavigateUp={() => {
            const currentIndex = activePage.blocks.findIndex((b) => b.id === block.id);
            if (currentIndex > 0) {
              setSelectedBlockId(activePage.blocks[currentIndex - 1].id);
            }
          }}
          onNavigateDown={() => {
            const currentIndex = activePage.blocks.findIndex((b) => b.id === block.id);
            if (currentIndex < activePage.blocks.length - 1) {
              setSelectedBlockId(activePage.blocks[currentIndex + 1].id);
            }
          }}
          onInsertParagraphAfter={() => {
            const newBlockId = addBlock(activePage.id, "paragraph", "", block.id);
            setSelectedBlockId(newBlockId);
          }}
        />
      );

    case "child-page":
      return (
        <ChildPageBlock
          block={block}
          activePage={activePage}
          pages={pages}
          deleteBlock={deleteBlock}
          setSelectedBlockId={setSelectedBlockId}
          setActivePageId={setActivePageId}
          handleChildPageKeyDown={handleChildPageKeyDown}
          isSelected={isSelected}
        />
      );

    default:
      return null;
  }
};
