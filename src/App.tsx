import React from "react";
import { AppProvider } from "./context/AppContext";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { EditorArea } from "./components/EditorArea";

export default function App() {
  return (
    <AppProvider>
      <div id="notion-workspace" className="flex h-screen w-screen overflow-hidden bg-white text-stone-900 font-sans antialiased">
        {/* Sidebar Workspace navigation */}
        <Sidebar />

        {/* Main Document Interface */}
        <div id="workspace-container" className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
          {/* Action Top bar */}
          <Toolbar />

          {/* Active page document editor or empty state prompt */}
          <EditorArea />
        </div>
      </div>
    </AppProvider>
  );
}
