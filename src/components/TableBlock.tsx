import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
  Table as TableIcon,
  Settings2,
  Sparkles,
} from "lucide-react";
import { Block } from "../types";

interface TableBlockProps {
  block: Block;
  activePageId: string;
  updateBlockData: (pageId: string, blockId: string, data: Partial<Block["data"]>) => void;
  updateBlockType: (pageId: string, blockId: string, type: any, extraData?: any) => void;
  setSelectedBlockId: (id: string | null) => void;
  isSelected: boolean;
  onNavigateUp: () => void;
  onNavigateDown: () => void;
}

export const TableBlock: React.FC<TableBlockProps> = ({
  block,
  activePageId,
  updateBlockData,
  updateBlockType,
  setSelectedBlockId,
  isSelected,
  onNavigateUp,
  onNavigateDown,
}) => {
  const [activeCell, setActiveCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [colMenuOpen, setColMenuOpen] = useState<number | null>(null);
  const [rowMenuOpen, setRowMenuOpen] = useState<number | null>(null);
  const [tableOptionsOpen, setTableOptionsOpen] = useState(false);

  const colMenuRef = useRef<HTMLDivElement>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);
  const tableOptionsRef = useRef<HTMLDivElement>(null);

  // Normalize matrix from block data (default 3x3)
  const rows: string[][] =
    block.data.rows && Array.isArray(block.data.rows) && block.data.rows.length > 0
      ? block.data.rows.map((row) => (Array.isArray(row) ? row : ["", "", ""]))
      : [
          ["", "", ""],
          ["", "", ""],
          ["", "", ""],
        ];

  const hasHeaderRow = !!block.data.hasHeaderRow;
  const hasHeaderColumn = !!block.data.hasHeaderColumn;

  const numRows = rows.length;
  const numCols = rows[0]?.length || 3;

  // Close popup menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setColMenuOpen(null);
      }
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
        setRowMenuOpen(null);
      }
      if (tableOptionsRef.current && !tableOptionsRef.current.contains(e.target as Node)) {
        setTableOptionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const focusCell = (r: number, c: number, cursorAt: "start" | "end" | "preserve" = "end") => {
    setActiveCell({ r, c });

    const focusTarget = () => {
      const el = (document.getElementById(`table-cell-${block.id}-${r}-${c}`) ||
        (r === 0 && c === 0 ? document.getElementById(`block-input-${block.id}`) : null)) as HTMLTextAreaElement | null;
      if (el) {
        el.focus();
        if (cursorAt === "start") {
          el.setSelectionRange(0, 0);
        } else if (cursorAt === "end") {
          const len = el.value.length;
          el.setSelectionRange(len, len);
        }
      }
    };

    focusTarget();
    requestAnimationFrame(focusTarget);
    setTimeout(focusTarget, 50);
  };

  const handleCellChange = (rIdx: number, cIdx: number, val: string) => {
    const newRows = rows.map((row, r) =>
      r === rIdx ? row.map((cell, c) => (c === cIdx ? val : cell)) : [...row]
    );
    updateBlockData(activePageId, block.id, { rows: newRows });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, rIdx: number, cIdx: number) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    // Tab key navigation
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();

      if (cIdx < numCols - 1) {
        focusCell(rIdx, cIdx + 1, "end");
      } else if (rIdx < numRows - 1) {
        focusCell(rIdx + 1, 0, "start");
      } else {
        // At the last cell of table: insert new row at bottom and focus first cell of new row
        insertRow(numRows, 0);
      }
      return;
    }

    // Shift + Tab key navigation
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();

      if (cIdx > 0) {
        focusCell(rIdx, cIdx - 1, "end");
      } else if (rIdx > 0) {
        focusCell(rIdx - 1, numCols - 1, "end");
      }
      return;
    }

    // Enter key: create newline inside current cell
    if (e.key === "Enter") {
      e.stopPropagation(); // Stop block creation in editor
      // Normal textarea newline handles automatically, auto-resize will trigger
      return;
    }

    // ArrowUp: move up a cell if at top line of current cell
    if (e.key === "ArrowUp") {
      const textBefore = value.substring(0, start);
      const isFirstLine = !textBefore.includes("\n");

      if (isFirstLine) {
        e.preventDefault();
        e.stopPropagation();
        if (rIdx > 0) {
          focusCell(rIdx - 1, cIdx, "end");
        } else {
          onNavigateUp();
        }
        return;
      }
    }

    // ArrowDown: move down a cell if at bottom line of current cell
    if (e.key === "ArrowDown") {
      const textAfter = value.substring(end);
      const isLastLine = !textAfter.includes("\n");

      if (isLastLine) {
        e.preventDefault();
        e.stopPropagation();
        if (rIdx < numRows - 1) {
          focusCell(rIdx + 1, cIdx, "start");
        } else {
          onNavigateDown();
        }
        return;
      }
    }

    // ArrowLeft: move to previous cell if at offset 0
    if (e.key === "ArrowLeft") {
      if (start === 0 && end === 0) {
        e.preventDefault();
        e.stopPropagation();
        if (cIdx > 0) {
          focusCell(rIdx, cIdx - 1, "end");
        } else if (rIdx > 0) {
          focusCell(rIdx - 1, numCols - 1, "end");
        } else {
          onNavigateUp();
        }
        return;
      }
    }

    // ArrowRight: move to next cell if at end offset
    if (e.key === "ArrowRight") {
      if (start === value.length && end === value.length) {
        e.preventDefault();
        e.stopPropagation();
        if (cIdx < numCols - 1) {
          focusCell(rIdx, cIdx + 1, "start");
        } else if (rIdx < numRows - 1) {
          focusCell(rIdx + 1, 0, "start");
        } else {
          onNavigateDown();
        }
        return;
      }
    }

    // Backspace: if whole table is empty & at top-left cell pos 0, convert to paragraph
    if (e.key === "Backspace") {
      if (start === 0 && end === 0 && rIdx === 0 && cIdx === 0) {
        const isTableEmpty = rows.every((row) => row.every((cell) => cell.trim() === ""));
        if (isTableEmpty) {
          e.preventDefault();
          e.stopPropagation();
          updateBlockType(activePageId, block.id, "paragraph", { text: "" });
          return;
        }
      }
    }
  };

  // Row operations
  const insertRow = (atRowIndex: number, focusColIndex?: number) => {
    const newRow = Array(numCols).fill("");
    const newRows = [...rows];
    newRows.splice(atRowIndex, 0, newRow);
    updateBlockData(activePageId, block.id, { rows: newRows });
    setRowMenuOpen(null);
    const targetC = focusColIndex !== undefined ? focusColIndex : Math.min(activeCell.c, numCols - 1);
    focusCell(atRowIndex, targetC, "start");
  };

  const deleteRow = (rIndex: number) => {
    const newRows = rows.filter((_, idx) => idx !== rIndex);
    updateBlockData(activePageId, block.id, { rows: newRows });
    setRowMenuOpen(null);

    if (newRows.length === 0) {
      setSelectedBlockId(block.id);
      const el = document.getElementById(`block-input-${block.id}`);
      if (el) el.focus();
    } else {
      const targetR = rIndex < newRows.length ? rIndex : rIndex - 1;
      const targetC = Math.min(activeCell.c, (newRows[0]?.length || 1) - 1);
      focusCell(targetR, targetC);
    }
  };

  // Column operations
  const insertColumn = (atColIndex: number) => {
    const newRows = rows.map((row) => {
      const copy = [...row];
      copy.splice(atColIndex, 0, "");
      return copy;
    });
    updateBlockData(activePageId, block.id, { rows: newRows });
    setColMenuOpen(null);
    const targetR = Math.min(activeCell.r, numRows - 1);
    focusCell(targetR, atColIndex, "start");
  };

  const deleteColumn = (cIndex: number) => {
    const newRows = rows.map((row) => row.filter((_, idx) => idx !== cIndex));
    const newNumCols = newRows[0]?.length || 0;
    updateBlockData(activePageId, block.id, { rows: newRows });
    setColMenuOpen(null);

    if (newNumCols === 0) {
      setSelectedBlockId(block.id);
      const el = document.getElementById(`block-input-${block.id}`);
      if (el) el.focus();
    } else {
      const targetC = cIndex < newNumCols ? cIndex : cIndex - 1;
      const targetR = Math.min(activeCell.r, newRows.length - 1);
      focusCell(targetR, targetC);
    }
  };

  return (
    <div
      className={`group/table relative w-full my-2 rounded-xl transition-all font-sans text-stone-800 ${
        isSelected ? "ring-1 ring-stone-400" : ""
      }`}
    >
      {/* Table Toolbar Bar (Top Right) */}
      <div className="flex items-center justify-between pb-1.5 px-0.5 select-none text-xs text-stone-500">
        <div className="flex items-center gap-1.5 font-medium text-stone-400 text-[11px] uppercase tracking-wider">
          <TableIcon className="h-3.5 w-3.5" />
          <span>Simple Table</span>
        </div>

        <div className="relative" ref={tableOptionsRef}>
          <button
            type="button"
            contentEditable={false}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              setTableOptionsOpen(!tableOptionsOpen);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-stone-100 text-stone-500 hover:text-stone-800 font-medium cursor-pointer transition-colors"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>Options</span>
          </button>

          {tableOptionsOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg bg-white border border-stone-200 shadow-xl py-1 text-xs text-stone-700 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  updateBlockData(activePageId, block.id, { hasHeaderRow: !hasHeaderRow });
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <span>Header row</span>
                <div
                  className={`w-7 h-4 rounded-full transition-colors relative ${
                    hasHeaderRow ? "bg-stone-800" : "bg-stone-200"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                      hasHeaderRow ? "left-3.5" : "left-0.5"
                    }`}
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  updateBlockData(activePageId, block.id, { hasHeaderColumn: !hasHeaderColumn });
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <span>Header column</span>
                <div
                  className={`w-7 h-4 rounded-full transition-colors relative ${
                    hasHeaderColumn ? "bg-stone-800" : "bg-stone-200"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${
                      hasHeaderColumn ? "left-3.5" : "left-0.5"
                    }`}
                  />
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="relative overflow-x-auto rounded-lg border border-stone-200/90 bg-white shadow-2xs">
        <table className="w-full border-collapse text-left text-sm">
          {/* Column Header Controls */}
          <thead>
            <tr className="bg-stone-50/80 border-b border-stone-200">
              {Array.from({ length: numCols }).map((_, cIdx) => (
                <th
                  key={cIdx}
                  onMouseEnter={() => setHoveredCol(cIdx)}
                  onMouseLeave={() => setHoveredCol(null)}
                  className="p-1 font-normal border-r border-stone-200/80 last:border-r-0 relative group/colHeader"
                  style={{ minWidth: "120px" }}
                >
                  <div className="flex items-center justify-center h-5 text-stone-400">
                    <button
                      type="button"
                      contentEditable={false}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setColMenuOpen(colMenuOpen === cIdx ? null : cIdx);
                      }}
                      className={`p-0.5 rounded hover:bg-stone-200/80 text-stone-400 hover:text-stone-700 cursor-pointer transition-opacity ${
                        hoveredCol === cIdx || colMenuOpen === cIdx
                          ? "opacity-100"
                          : "opacity-0 group-hover/colHeader:opacity-100"
                      }`}
                      title="Column options"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>

                    {/* Column Dropdown Menu */}
                    {colMenuOpen === cIdx && (
                      <div
                        ref={colMenuRef}
                        className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 w-44 rounded-lg bg-white border border-stone-200 shadow-xl py-1 text-xs text-stone-700 font-sans animate-in fade-in zoom-in-95 duration-100"
                      >
                        <button
                          type="button"
                          onClick={() => insertColumn(cIdx)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-stone-50 transition-colors text-left cursor-pointer"
                        >
                          <ArrowLeft className="h-3.5 w-3.5 text-stone-500" />
                          <span>Insert left</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => insertColumn(cIdx + 1)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-stone-50 transition-colors text-left cursor-pointer"
                        >
                          <ArrowRight className="h-3.5 w-3.5 text-stone-500" />
                          <span>Insert right</span>
                        </button>
                        {numCols > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteColumn(cIdx)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-red-600 transition-colors text-left cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            <span>Delete column</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {/* Add Column (+) Header Button */}
              <th className="w-8 p-0 bg-stone-100/50 hover:bg-stone-200/60 transition-colors text-center border-l border-stone-200/80">
                <button
                  type="button"
                  contentEditable={false}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => insertColumn(numCols)}
                  className="w-full h-full min-h-[28px] flex items-center justify-center text-stone-400 hover:text-stone-800 cursor-pointer"
                  title="Add column"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {rows.map((row, rIdx) => {
              const isHeaderRowCell = hasHeaderRow && rIdx === 0;

              return (
                <tr
                  key={rIdx}
                  onMouseEnter={() => setHoveredRow(rIdx)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={`border-b border-stone-200/80 last:border-b-0 transition-colors ${
                    isHeaderRowCell ? "bg-stone-50/70 font-semibold" : "hover:bg-stone-50/30"
                  }`}
                >
                  {row.map((cellVal, cIdx) => {
                    const isHeaderColCell = hasHeaderColumn && cIdx === 0;

                    return (
                      <td
                        key={cIdx}
                        className={`p-0 border-r border-stone-200/80 last:border-r-0 relative transition-colors ${
                          isHeaderColCell ? "bg-stone-50/50 font-semibold" : ""
                        } ${
                          activeCell.r === rIdx && activeCell.c === cIdx
                            ? "bg-stone-100/40 ring-1 ring-inset ring-stone-400"
                            : ""
                        }`}
                      >
                        <textarea
                          id={rIdx === 0 && cIdx === 0 ? `block-input-${block.id}` : `table-cell-${block.id}-${rIdx}-${cIdx}`}
                          value={cellVal}
                          onChange={(e) => {
                            handleCellChange(rIdx, cIdx, e.target.value);
                            // Auto-adjust height
                            e.target.style.height = "auto";
                            e.target.style.height = `${Math.max(36, e.target.scrollHeight)}px`;
                          }}
                          onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                          onFocus={() => {
                            setSelectedBlockId(block.id);
                            setActiveCell({ r: rIdx, c: cIdx });
                          }}
                          placeholder=""
                          rows={1}
                          className="w-full min-h-[36px] p-2.5 bg-transparent resize-none overflow-hidden outline-none font-sans text-[13.5px] leading-relaxed text-stone-800 placeholder-stone-300 block"
                          style={{
                            height: "auto",
                          }}
                        />
                      </td>
                    );
                  })}

                  {/* Row Menu (Left/Right hover control in the extra col) */}
                  <td className="w-8 p-0 bg-stone-50/30 border-l border-stone-200/80 text-center relative group/rowHeader">
                    <button
                      type="button"
                      contentEditable={false}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRowMenuOpen(rowMenuOpen === rIdx ? null : rIdx);
                      }}
                      className={`w-full h-full min-h-[36px] flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 cursor-pointer transition-opacity ${
                        hoveredRow === rIdx || rowMenuOpen === rIdx
                          ? "opacity-100"
                          : "opacity-0 group-hover/rowHeader:opacity-100"
                      }`}
                      title="Row options"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>

                    {/* Row Dropdown Menu */}
                    {rowMenuOpen === rIdx && (
                      <div
                        ref={rowMenuRef}
                        className="absolute right-full top-1/2 -translate-y-1/2 mr-1 z-50 w-40 rounded-lg bg-white border border-stone-200 shadow-xl py-1 text-xs text-stone-700 font-sans animate-in fade-in zoom-in-95 duration-100"
                      >
                        <button
                          type="button"
                          onClick={() => insertRow(rIdx)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-stone-50 transition-colors text-left cursor-pointer"
                        >
                          <ArrowUp className="h-3.5 w-3.5 text-stone-500" />
                          <span>Insert above</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => insertRow(rIdx + 1)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-stone-50 transition-colors text-left cursor-pointer"
                        >
                          <ArrowDown className="h-3.5 w-3.5 text-stone-500" />
                          <span>Insert below</span>
                        </button>
                        {numRows > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteRow(rIdx)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-red-600 transition-colors text-left cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            <span>Delete row</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Add Row (+) Bottom Bar */}
        <button
          type="button"
          contentEditable={false}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={() => insertRow(numRows)}
          className="w-full py-1.5 px-3 flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 hover:bg-stone-50 border-t border-stone-200/80 transition-colors cursor-pointer font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New row</span>
        </button>
      </div>
    </div>
  );
};
