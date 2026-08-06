import React, { useState } from "react";
import {
  X,
  Search,
  LayoutGrid,
  Sparkles,
  Check,
  Plus,
  ArrowRight,
  FileText,
  Briefcase,
  User,
  GraduationCap
} from "lucide-react";
import {
  getTemplates,
  PageTemplate,
  PREDEFINED_TEMPLATES
} from "../templates/templateRegistry";
import { useApp } from "../context/AppContext";

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPageId?: string | null; // If provided, option to apply template directly to target page
}

type CategoryFilter = "All" | "Work" | "Personal" | "School" | "General";

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  targetPageId,
}) => {
  const { createPageFromTemplate, applyTemplateToPage, setActivePageId } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplate>(
    PREDEFINED_TEMPLATES[1] || PREDEFINED_TEMPLATES[0]
  );

  if (!isOpen) return null;

  const allTemplates = getTemplates();

  const filteredTemplates = allTemplates.filter((template) => {
    const matchesCategory =
      selectedCategory === "All" || template.category === selectedCategory;
    const matchesQuery =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const handleUseTemplate = (templateId: string) => {
    if (targetPageId) {
      applyTemplateToPage(targetPageId, templateId);
      setActivePageId(targetPageId);
    } else {
      createPageFromTemplate(templateId);
    }
    onClose();
  };

  const categories: { name: CategoryFilter; icon: React.ReactNode }[] = [
    { name: "All", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { name: "Work", icon: <Briefcase className="h-3.5 w-3.5" /> },
    { name: "Personal", icon: <User className="h-3.5 w-3.5" /> },
    { name: "School", icon: <GraduationCap className="h-3.5 w-3.5" /> },
    { name: "General", icon: <FileText className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 dark:bg-stone-950/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-[#1f1f1f] rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-[#191919]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                Template Gallery
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Choose a pre-configured Notion structure to jumpstart your document.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-6 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/30 dark:bg-[#1c1c1c]">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.name
                    ? "bg-stone-900 dark:bg-stone-100 text-stone-100 dark:text-stone-900 shadow-sm"
                    : "text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100"
                }`}
              >
                {cat.icon}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 dark:text-stone-500" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-[#252525] border border-stone-200 dark:border-stone-700 focus:border-stone-400 dark:focus:border-stone-500 focus:outline-none rounded-lg text-xs text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 shadow-sm transition-all"
            />
          </div>
        </div>

        {/* Body Grid: Left list + Right preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Template Cards List */}
          <div className="md:col-span-5 overflow-y-auto p-4 space-y-2 border-r border-stone-200 dark:border-stone-800 bg-stone-50/20 dark:bg-[#191919]">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map((template) => {
                const isSelected = selectedTemplate.id === template.id;
                return (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`group cursor-pointer p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-white dark:bg-[#252525] border-stone-900 dark:border-stone-100 shadow-sm ring-1 ring-stone-900 dark:ring-stone-100"
                        : "bg-white dark:bg-[#202020] border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl shrink-0 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
                        {template.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                            {template.name}
                          </h3>
                          <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-1.5 py-0.5 rounded-md shrink-0">
                            {template.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-xs text-stone-400 dark:text-stone-500">
                No templates found matching your criteria.
              </div>
            )}
          </div>

          {/* Detailed Template Preview */}
          <div className="md:col-span-7 flex flex-col h-full bg-white dark:bg-[#1f1f1f] overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Cover Preview */}
              {selectedTemplate.coverImage && (
                <div className="h-28 w-full rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800">
                  <img
                    src={selectedTemplate.coverImage}
                    alt={selectedTemplate.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Title Header */}
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedTemplate.icon}</span>
                <div>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                    {selectedTemplate.defaultTitle}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {selectedTemplate.description}
                  </p>
                </div>
              </div>

              {/* Block List Structure Preview */}
              <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                  Included Blocks ({selectedTemplate.blocks.length})
                </span>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedTemplate.blocks.map((block, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-stone-50 dark:bg-[#252525] border border-stone-100 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 flex items-center gap-2"
                    >
                      <span className="text-[10px] uppercase font-mono font-semibold text-stone-400 dark:text-stone-500 bg-stone-200/60 dark:bg-stone-800 px-1.5 py-0.5 rounded">
                        {block.type}
                      </span>
                      <span
                        className="truncate flex-1 text-stone-600 dark:text-stone-300"
                        dangerouslySetInnerHTML={{
                          __html:
                            block.data.text ||
                            (block.type === "table"
                              ? "Table (" +
                                (block.data.rows?.length || 0) +
                                " rows)"
                              : block.type === "paragraph"
                              ? "(Text paragraph)"
                              : block.type),
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-[#191919] flex items-center justify-between">
              <span className="text-xs text-stone-500 dark:text-stone-400">
                Independent page instance • Fresh copy
              </span>
              <button
                onClick={() => handleUseTemplate(selectedTemplate.id)}
                className="flex items-center gap-2 px-4 py-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <span>Use Template</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
