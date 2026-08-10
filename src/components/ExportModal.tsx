import React, { useState } from "react";
import { Download, FileText, Code, FileCode, Archive, Check, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { exportService } from "../services/export";
import { notificationService } from "../services/NotificationService";
import { platform } from "../platform";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultScope?: "page" | "workspace";
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  defaultScope = "page",
}) => {
  const { activePage, pages, activePageId, sidebarOpen } = useApp();

  const [scope, setScope] = useState<"page" | "workspace">(
    activePage ? defaultScope : "workspace"
  );
  const [selectedFormat, setSelectedFormat] = useState<string>(
    activePage && defaultScope === "page" ? "markdown" : "workspace"
  );
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allFormats = [
    {
      id: "markdown",
      name: "Markdown (.md)",
      description: "Standard Markdown document preserving formatting and structure.",
      icon: FileText,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40",
      targetScope: "page",
    },
    {
      id: "html",
      name: "HTML (.html)",
      description: "Standalone styled HTML document with offline CSS styling.",
      icon: Code,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40",
      targetScope: "page",
    },
    {
      id: "pdf",
      name: "PDF Document (.pdf)",
      description: "Printable PDF document preserving title, cover, tables, and page breaks.",
      icon: FileCode,
      color: "text-red-500 bg-red-50 dark:bg-red-950/40",
      targetScope: "page",
    },
    {
      id: "workspace",
      name: "Workspace Backup (.zip)",
      description: "Complete database backup archive containing workspace data, settings, and assets.",
      icon: Archive,
      color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40",
      targetScope: "workspace",
    },
  ];

  const availableFormats = allFormats.filter((fmt) => fmt.targetScope === scope);

  const handleScopeChange = (newScope: "page" | "workspace") => {
    setScope(newScope);
    if (newScope === "workspace") {
      setSelectedFormat("workspace");
    } else {
      if (selectedFormat === "workspace") {
        setSelectedFormat("markdown");
      }
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const activePages = pages.filter((p) => !p.isDeleted);
      const wsInfo = platform.workspace.isSupported
        ? await platform.workspace.getActive()
        : null;
      const workspaceName = wsInfo?.name || "Workspace";

      if (scope === "page" && activePage) {
        await exportService.exportPage(selectedFormat, activePage, {
          allPages: activePages,
          workspaceName,
        });
        const msg = `Successfully exported "${activePage.title || "Untitled"}" as ${selectedFormat.toUpperCase()}`;
        setSuccessMessage(msg);
        notificationService.success("Export Complete", msg);
      } else {
        await exportService.exportWorkspace("workspace", activePages, {
          allPages: activePages,
          workspaceName,
          activePageId,
          sidebarOpen,
        });
        const msg = `Successfully exported workspace backup for "${workspaceName}".`;
        setSuccessMessage(msg);
        notificationService.success("Export Complete", msg);
      }

      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("[ExportModal] Export failed:", err);
      setErrorMessage(err.message || "Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" role="dialog" aria-modal="true" aria-label="Export Modal">
      <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-stone-700 dark:text-stone-300" />
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Export
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close export modal"
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-stone-500 uppercase mb-2">
              Export Target
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!activePage}
                onClick={() => handleScopeChange("page")}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  scope === "page"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold"
                    : "border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                } ${!activePage ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <FileText className="w-4 h-4" />
                Current Page
              </button>

              <button
                type="button"
                onClick={() => handleScopeChange("workspace")}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  scope === "workspace"
                    ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-semibold"
                    : "border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                }`}
              >
                <Archive className="w-4 h-4" />
                Entire Workspace
              </button>
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-stone-500 uppercase mb-2">
              Format
            </label>
            <div className="space-y-2">
              {availableFormats.map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = selectedFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-blue-600"
                        : "border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${fmt.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                          {fmt.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {fmt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback Messages */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-sm rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-sm rounded-lg flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-stone-50 dark:bg-stone-900/50 border-t border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
    </div>
  );
};
