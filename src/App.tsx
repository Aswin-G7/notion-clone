import React from "react";
import { AppProvider } from "./context/AppContext";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { EditorArea } from "./components/EditorArea";
import { SearchModal } from "./components/SearchModal";
import { NativeMenuListener } from "./components/NativeMenuListener";
import { useSettings } from "./hooks/useSettings";

export default function App() {
  // Initialize and load global settings on app root mount
  useSettings();

  return (
    <AppProvider>
      <NativeMenuListener />
      <div id="notion-workspace" className="flex h-screen w-screen overflow-hidden bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-sans antialiased transition-colors duration-200">
        {/* Sidebar Workspace navigation */}
        <Sidebar />

        {/* Main Document Interface */}
        <div id="workspace-container" className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-white dark:bg-stone-900 transition-colors duration-200">
          {/* Action Top bar */}
          <Toolbar />

          {/* Active page document editor or empty state prompt */}
          <EditorArea />
        </div>

        {/* Global Search Dialog Modal */}
        <SearchModal />
      </div>
    </AppProvider>
  );
}
