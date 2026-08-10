import React from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { EditorArea } from "./components/EditorArea";
import { SearchModal } from "./components/SearchModal";
import { SettingsModal } from "./components/SettingsModal";
import { TrashModal } from "./components/TrashModal";
import { ExportModal } from "./components/ExportModal";
import { TemplateGalleryModal } from "./components/TemplateGalleryModal";
import { ToastContainer } from "./components/notifications/ToastContainer";
import { NativeMenuListener } from "./components/NativeMenuListener";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useSettings } from "./hooks/useSettings";
import { useAppCommands } from "./hooks/useAppCommands";

function AppContent() {
  // Register all core workspace and app actions into CommandRegistry
  useAppCommands();

  const {
    isSettingsOpen,
    setIsSettingsOpen,
    isTrashOpen,
    setIsTrashOpen,
    isExportOpen,
    setIsExportOpen,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
  } = useApp();

  return (
    <div id="notion-workspace" className="flex h-screen w-screen overflow-hidden bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-sans antialiased transition-colors duration-200">
      {/* Sidebar Workspace navigation */}
      <Sidebar />

      {/* Main Document Interface */}
      <div id="workspace-container" className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-white dark:bg-stone-900 transition-colors duration-200">
        {/* Action Top bar */}
        <Toolbar />

        {/* Active page document editor or empty state prompt */}
        <ErrorBoundary fallbackTitle="Editor View Exception">
          <EditorArea />
        </ErrorBoundary>
      </div>

      {/* Unified Command Palette Modal */}
      <SearchModal />

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Global Trash System Modal */}
      <TrashModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
      />

      {/* Global Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        defaultScope="page"
      />

      {/* Global Template Gallery Modal */}
      <TemplateGalleryModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />

      {/* Global Toast Notifications Container */}
      <ToastContainer />
    </div>
  );
}

export default function App() {
  // Initialize and load global settings on app root mount
  useSettings();

  return (
    <ErrorBoundary fallbackTitle="Workspace Application Error">
      <AppProvider>
        <NativeMenuListener />
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
