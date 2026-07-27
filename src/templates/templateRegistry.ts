import { Block, BlockType, Page } from "../types";

export interface TemplateBlockDefinition {
  tempId?: string;
  tempParentId?: string;
  type: BlockType;
  data: {
    text?: string;
    level?: number;
    checked?: boolean;
    language?: string;
    url?: string;
    caption?: string;
    width?: number;
    collapsed?: boolean;
    icon?: string;
    rows?: string[][];
    hasHeaderRow?: boolean;
    hasHeaderColumn?: boolean;
  };
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "General" | "Work" | "Personal" | "School";
  coverImage?: string;
  defaultTitle: string;
  blocks: TemplateBlockDefinition[];
}

export const PREDEFINED_TEMPLATES: PageTemplate[] = [
  {
    id: "empty",
    name: "Empty Page",
    description: "Start fresh with a clean blank canvas.",
    icon: "📄",
    category: "General",
    defaultTitle: "Untitled Page",
    blocks: [
      {
        type: "paragraph",
        data: { text: "" }
      }
    ]
  },
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    description: "Capture agenda items, discussion points, attendees, and action items.",
    icon: "📅",
    category: "Work",
    coverImage: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop",
    defaultTitle: "Meeting Notes",
    blocks: [
      {
        type: "callout",
        data: {
          icon: "💡",
          text: "<b>Meeting Details</b><br/>Date: " + new Date().toLocaleDateString() + " | Time: 10:00 AM | Location: Conference Room A<br/>Attendees: @Alex, @Sam, @Jordan"
        }
      },
      {
        type: "heading",
        data: { text: "🎯 Agenda", level: 2 }
      },
      {
        type: "bulleted-list",
        data: { text: "Review status of Q3 goals and key deliverables" }
      },
      {
        type: "bulleted-list",
        data: { text: "Discuss cross-team dependencies and timelines" }
      },
      {
        type: "bulleted-list",
        data: { text: "Open floor for Q&A and next steps" }
      },
      {
        type: "heading",
        data: { text: "💬 Discussion & Key Decisions", level: 2 }
      },
      {
        type: "paragraph",
        data: { text: "Record important conversation points, decisions made, and technical trade-offs discussed..." }
      },
      {
        type: "heading",
        data: { text: "✅ Action Items", level: 2 }
      },
      {
        type: "todo",
        data: { text: "Send meeting summary email to all stakeholders", checked: false }
      },
      {
        type: "todo",
        data: { text: "Update project roadmaps and task boards", checked: false }
      },
      {
        type: "todo",
        data: { text: "Schedule follow-up review session for next week", checked: false }
      }
    ]
  },
  {
    id: "project-plan",
    name: "Project Plan",
    description: "Outline scope, timeline, milestones, tasks, and risk management.",
    icon: "🚀",
    category: "Work",
    coverImage: "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?q=80&w=1200&auto=format&fit=crop",
    defaultTitle: "Project Plan",
    blocks: [
      {
        type: "callout",
        data: {
          icon: "🎯",
          text: "<b>Project Mission</b>: Define the high-level objectives, expected business value, and primary metrics for success."
        }
      },
      {
        type: "heading",
        data: { text: "📌 Scope & Core Objectives", level: 2 }
      },
      {
        type: "bulleted-list",
        data: { text: "<b>Primary Goal</b>: Deliver feature set within target timeframe." }
      },
      {
        type: "bulleted-list",
        data: { text: "<b>Key Deliverable 1</b>: User experience design and interactive prototypes." }
      },
      {
        type: "bulleted-list",
        data: { text: "<b>Key Deliverable 2</b>: Scalable full-stack implementation with clean test coverage." }
      },
      {
        type: "heading",
        data: { text: "📅 Timeline & Milestones", level: 2 }
      },
      {
        type: "table",
        data: {
          hasHeaderRow: true,
          rows: [
            ["Phase", "Target Date", "Status"],
            ["Discovery & Specs", "Week 1", "Completed"],
            ["Architecture & Design", "Week 2", "In Progress"],
            ["Development & Testing", "Weeks 3-4", "Not Started"],
            ["Deployment & Release", "Week 5", "Not Started"]
          ]
        }
      },
      {
        type: "heading",
        data: { text: "📋 Implementation Checklist", level: 2 }
      },
      {
        type: "todo",
        data: { text: "Draft functional specifications & architectural overview", checked: true }
      },
      {
        type: "todo",
        data: { text: "Set up development environments & CI pipeline", checked: true }
      },
      {
        type: "todo",
        data: { text: "Build core user interface components", checked: false }
      },
      {
        type: "todo",
        data: { text: "Conduct user acceptance testing (UAT)", checked: false }
      },
      {
        type: "heading",
        data: { text: "⚠️ Risk Management", level: 2 }
      },
      {
        tempId: "risk-toggle-1",
        type: "toggle",
        data: { text: "<b>Risk: Scope Creep</b>", collapsed: false }
      },
      {
        tempParentId: "risk-toggle-1",
        type: "paragraph",
        data: { text: "<i>Mitigation</i>: Enforce strict change control process; defer non-critical requests to Phase 2." }
      }
    ]
  },
  {
    id: "weekly-journal",
    name: "Weekly Journal",
    description: "Track priority goals, daily reflections, and weekly achievements.",
    icon: "📓",
    category: "Personal",
    coverImage: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=1200&auto=format&fit=crop",
    defaultTitle: "Weekly Journal",
    blocks: [
      {
        type: "callout",
        data: {
          icon: "🌟",
          text: "<b>Weekly Theme</b>: Focus on consistency, mindfulness, and intentional progress."
        }
      },
      {
        type: "heading",
        data: { text: "🎯 Top 3 Goals for the Week", level: 2 }
      },
      {
        type: "todo",
        data: { text: "Goal 1: Complete major project deliverable", checked: false }
      },
      {
        type: "todo",
        data: { text: "Goal 2: Maintain daily exercise routine", checked: false }
      },
      {
        type: "todo",
        data: { text: "Goal 3: Read 1 chapter of a book each evening", checked: false }
      },
      {
        type: "heading",
        data: { text: "📅 Daily Reflections", level: 2 }
      },
      {
        tempId: "mon-toggle",
        type: "toggle",
        data: { text: "<b>Monday Reflection</b>", collapsed: true }
      },
      {
        tempParentId: "mon-toggle",
        type: "paragraph",
        data: { text: "Highlights, wins, and observations from Monday..." }
      },
      {
        tempId: "tue-toggle",
        type: "toggle",
        data: { text: "<b>Tuesday Reflection</b>", collapsed: true }
      },
      {
        tempParentId: "tue-toggle",
        type: "paragraph",
        data: { text: "Highlights, wins, and observations from Tuesday..." }
      },
      {
        tempId: "wed-toggle",
        type: "toggle",
        data: { text: "<b>Wednesday Reflection</b>", collapsed: true }
      },
      {
        tempParentId: "wed-toggle",
        type: "paragraph",
        data: { text: "Highlights, wins, and observations from Wednesday..." }
      },
      {
        tempId: "thu-toggle",
        type: "toggle",
        data: { text: "<b>Thursday Reflection</b>", collapsed: true }
      },
      {
        tempParentId: "thu-toggle",
        type: "paragraph",
        data: { text: "Highlights, wins, and observations from Thursday..." }
      },
      {
        tempId: "fri-toggle",
        type: "toggle",
        data: { text: "<b>Friday Reflection</b>", collapsed: true }
      },
      {
        tempParentId: "fri-toggle",
        type: "paragraph",
        data: { text: "Highlights, wins, and observations from Friday..." }
      },
      {
        type: "heading",
        data: { text: "🏆 Weekly Reflection & Wins", level: 2 }
      },
      {
        type: "quote",
        data: { text: "What were your biggest highlights this week? What did you learn?" }
      }
    ]
  },
  {
    id: "task-list",
    name: "Task List",
    description: "Prioritize personal and work tasks with checked lists and status sections.",
    icon: "✅",
    category: "Personal",
    coverImage: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=1200&auto=format&fit=crop",
    defaultTitle: "Task Tracker",
    blocks: [
      {
        type: "callout",
        data: {
          icon: "💡",
          text: "<b>Task Management Tip</b>: Keep high-priority tasks at the top and check off items as you complete them."
        }
      },
      {
        type: "heading",
        data: { text: "🔥 High Priority", level: 2 }
      },
      {
        type: "todo",
        data: { text: "Review critical pull requests", checked: false }
      },
      {
        type: "todo",
        data: { text: "Prepare quarterly presentation deck", checked: false }
      },
      {
        type: "heading",
        data: { text: "📌 In Progress", level: 2 }
      },
      {
        type: "todo",
        data: { text: "Refactor editor focus handling", checked: false }
      },
      {
        type: "todo",
        data: { text: "Update component documentation", checked: false }
      },
      {
        type: "heading",
        data: { text: "📥 Backlog & Future Ideas", level: 2 }
      },
      {
        type: "todo",
        data: { text: "Explore custom theme customization options", checked: false }
      },
      {
        type: "todo",
        data: { text: "Add shortcut cheat sheet modal", checked: false }
      },
      {
        type: "heading",
        data: { text: "🎉 Completed Tasks", level: 2 }
      },
      {
        type: "todo",
        data: { text: "Setup Notion-style Template Registry system", checked: true }
      }
    ]
  },
  {
    id: "class-notes",
    name: "Class Notes",
    description: "Organize lecture materials, course metadata, key definitions, and review questions.",
    icon: "📚",
    category: "School",
    coverImage: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1200&auto=format&fit=crop",
    defaultTitle: "Class Notes",
    blocks: [
      {
        type: "callout",
        data: {
          icon: "🎓",
          text: "<b>Course Info</b><br/>Course: CS 101 - Intro to Computer Science | Date: " + new Date().toLocaleDateString() + "<br/>Professor: Dr. Smith | Topic: Data Structures & Algorithms"
        }
      },
      {
        type: "heading",
        data: { text: "🎯 Key Learning Objectives", level: 2 }
      },
      {
        type: "bulleted-list",
        data: { text: "Understand time complexity and Big O notation" }
      },
      {
        type: "bulleted-list",
        data: { text: "Compare array list vs linked list tradeoffs" }
      },
      {
        type: "heading",
        data: { text: "📝 Lecture Notes", level: 2 }
      },
      {
        type: "paragraph",
        data: { text: "Record detailed concepts, explanations, and diagrams from the lecture here..." }
      },
      {
        type: "heading",
        data: { text: "💡 Key Concepts & Definitions", level: 2 }
      },
      {
        type: "quote",
        data: { text: "<b>Big O Notation</b>: A mathematical notation that describes the limiting behavior of a function when the argument tends towards a particular value or infinity." }
      },
      {
        type: "heading",
        data: { text: "❓ Questions & Follow-up Review", level: 2 }
      },
      {
        type: "todo",
        data: { text: "Review textbook chapter 3", checked: false }
      },
      {
        type: "todo",
        data: { text: "Solve practice problem set 2", checked: false }
      }
    ]
  }
];

// Mutable custom template registry allowing runtime registration of custom templates
let customTemplates: PageTemplate[] = [];

/**
 * Returns all available templates (predefined + custom).
 */
export function getTemplates(): PageTemplate[] {
  return [...PREDEFINED_TEMPLATES, ...customTemplates];
}

/**
 * Returns a template by its ID.
 */
export function getTemplateById(id: string): PageTemplate | undefined {
  return getTemplates().find((t) => t.id === id);
}

/**
 * Register a custom JSON template definition.
 */
export function registerCustomTemplate(template: PageTemplate): void {
  const existingIdx = customTemplates.findIndex((t) => t.id === template.id);
  if (existingIdx !== -1) {
    customTemplates[existingIdx] = template;
  } else {
    customTemplates.push(template);
  }
}

/**
 * Generates a completely independent Page instance from a PageTemplate.
 * Guarantees fresh unique IDs for all blocks and removes shared object references.
 */
export function instantiateTemplate(
  template: PageTemplate,
  options?: { parentId?: string | null }
): Page {
  const newPageId = `page-${Math.random().toString(36).substring(2, 9)}`;

  // Map temporary block IDs to newly generated unique block IDs
  const tempIdToNewId = new Map<string, string>();
  
  template.blocks.forEach((def, index) => {
    const freshBlockId = `block-${Math.random().toString(36).substring(2, 9)}-${index}`;
    if (def.tempId) {
      tempIdToNewId.set(def.tempId, freshBlockId);
    }
  });

  const instantiatedBlocks: Block[] = template.blocks.map((def, index) => {
    const blockId = def.tempId
      ? tempIdToNewId.get(def.tempId)!
      : `block-${Math.random().toString(36).substring(2, 9)}-${index}`;

    const parentId = def.tempParentId ? tempIdToNewId.get(def.tempParentId) || null : null;

    // Deep copy data object (e.g. rows matrix for tables)
    const clonedData: Block["data"] = {
      ...def.data,
      rows: def.data.rows ? def.data.rows.map((row) => [...row]) : undefined,
    };

    if (parentId) {
      clonedData.parentId = parentId;
    }

    return {
      id: blockId,
      type: def.type,
      data: clonedData,
    };
  });

  return {
    id: newPageId,
    title: template.defaultTitle,
    icon: template.icon,
    coverImage: template.coverImage,
    parentId: options?.parentId || null,
    children: [],
    blocks: instantiatedBlocks,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
