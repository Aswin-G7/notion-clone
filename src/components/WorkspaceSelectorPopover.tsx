import React, { useState, useEffect } from "react";
import { Folder, Plus, FolderOpen, History, Check, X, Trash2, HardDrive, ChevronRight, FolderX } from "lucide-react";
import { platform, WorkspaceInfo, RecentWorkspace } from "../platform";

interface WorkspaceSelectorPopoverProps {
  onClose: () => void;
}

export const WorkspaceSelectorPopover: React.FC<WorkspaceSelectorPopoverProps> = ({ onClose }) => {
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceInfo | null>(null);
  const [recents, setRecents] = useState<RecentWorkspace[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWorkspaceData();
  }, []);

  const loadWorkspaceData = async () => {
    if (platform.workspace.isSupported) {
      try {
        const active = await platform.workspace.getActive();
        const recentList = await platform.workspace.getRecents();
        setActiveWorkspace(active);
        setRecents(recentList);
      } catch (e) {
        console.error("Failed to load workspace info:", e);
      }
    }
  };

  const handleOpenWorkspace = async () => {
    if (!platform.workspace.isSupported) return;
    setLoading(true);
    try {
      const result = await platform.workspace.open();
      if (result) {
        window.location.reload();
      }
    } catch (e) {
      console.error("Failed to open workspace:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platform.workspace.isSupported) return;
    const name = newWsName.trim();
    if (!name) return;

    setLoading(true);
    try {
      const selectedPath = await platform.workspace.selectFolder();
      if (selectedPath) {
        const result = await platform.workspace.create(selectedPath, name);
        if (result) {
          window.location.reload();
        }
      }
    } catch (e) {
      console.error("Failed to create workspace:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchWorkspace = async (path: string) => {
    if (!platform.workspace.isSupported) return;
    setLoading(true);
    try {
      const result = await platform.workspace.switch(path);
      if (result) {
        window.location.reload();
      }
    } catch (e) {
      console.error("Failed to switch workspace:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRecent = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (!platform.workspace.isSupported) return;
    try {
      await platform.workspace.removeRecent(path);
      setRecents((prev) => prev.filter((r) => r.path !== path));
    } catch (e) {
      console.error("Failed to remove recent workspace:", e);
    }
  };

  const handleDeleteWorkspace = async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (!platform.workspace.isSupported) return;
    setLoading(true);
    try {
      const success = await platform.workspace.delete(path);
      if (success) {
        if (activeWorkspace?.path === path) {
          window.location.reload();
        } else {
          setRecents((prev) => prev.filter((r) => r.path !== path));
        }
      }
    } catch (e) {
      console.error("Failed to delete workspace:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="workspace-selector-popover"
      className="absolute top-12 left-2 z-50 w-80 sm:w-96 bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden font-sans text-stone-800"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-3 border-b border-stone-150 bg-stone-50/80 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-700 uppercase tracking-wider">
          <HardDrive className="h-4 w-4 text-stone-600 shrink-0" />
          <span>Workspace Manager</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 space-y-3 max-h-[420px] overflow-y-auto">
        {/* Active Workspace Info */}
        <div className="p-2.5 bg-stone-100/80 rounded-lg border border-stone-200/80 space-y-1">
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
            <span>Current Active Workspace</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold lowercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              active
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded bg-stone-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {activeWorkspace?.name?.[0]?.toUpperCase() || "W"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-stone-900 truncate">
                  {activeWorkspace?.name || "Default Workspace"}
                </div>
                <div className="text-[10px] text-stone-500 truncate" title={activeWorkspace?.path}>
                  {activeWorkspace?.path || "Local Storage"}
                </div>
              </div>
            </div>
            {activeWorkspace?.path && platform.workspace.isSupported && (
              <button
                type="button"
                onClick={(e) => handleDeleteWorkspace(e, activeWorkspace.path)}
                disabled={loading}
                className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0"
                title="Permanently Delete Current Workspace"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={handleOpenWorkspace}
            disabled={loading}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-stone-500 group-hover:text-stone-900" />
              <span>Open Existing Workspace Folder</span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
          </button>

          {!isCreating ? (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-stone-500 group-hover:text-stone-900" />
                <span>Create New Workspace Folder</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
            </button>
          ) : (
            <form onSubmit={handleCreateWorkspace} className="p-2.5 bg-stone-50 rounded-lg border border-stone-200 space-y-2">
              <div className="text-xs font-semibold text-stone-700">Workspace Name</div>
              <input
                type="text"
                autoFocus
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="e.g. My Research Workspace"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-stone-200 rounded-md focus:border-stone-400 focus:outline-none"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={!newWsName.trim() || loading}
                  className="flex-1 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
                >
                  Choose Folder & Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-2.5 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Recent Workspaces */}
        {recents.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-stone-150">
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
              <History className="h-3 w-3" />
              <span>Recent Workspaces</span>
            </div>
            <div className="space-y-1">
              {recents.map((recent) => {
                const isActive = activeWorkspace?.path === recent.path;
                return (
                  <div
                    key={recent.path}
                    onClick={() => !isActive && handleSwitchWorkspace(recent.path)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer group ${
                      isActive
                        ? "bg-stone-900 text-white font-semibold"
                        : "hover:bg-stone-100 text-stone-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <Folder className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-stone-400 group-hover:text-stone-700"}`} />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{recent.name}</div>
                        <div className={`text-[10px] truncate ${isActive ? "text-stone-300" : "text-stone-400"}`} title={recent.path}>
                          {recent.path}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isActive ? (
                        <Check className="h-4 w-4 text-white" />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveRecent(e, recent.path)}
                            className="p-1 rounded text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Remove from recent list (keeps files on disk)"
                          >
                            <FolderX className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteWorkspace(e, recent.path)}
                            className="p-1 rounded text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Permanently delete workspace folder from disk"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
