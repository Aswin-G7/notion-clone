/**
 * Checks whether the user is currently focused on an active text input element,
 * such as a Lexical ContentEditable block, HTML input, textarea, or select element.
 */
export function isUserEditingText(): boolean {
  if (typeof document === "undefined") return false;

  const active = document.activeElement;
  if (!active || active === document.body || active === document.documentElement) {
    return false;
  }

  // Check if active element or any ancestor is a contenteditable element
  if (
    ("isContentEditable" in active && (active as HTMLElement).isContentEditable) ||
    active.getAttribute("contenteditable") === "true"
  ) {
    return true;
  }

  if (active.closest('[contenteditable="true"]')) {
    return true;
  }

  const tagName = active.tagName ? active.tagName.toUpperCase() : "";
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }

  return false;
}

/**
 * Sets up a global pointerdown event listener that ensures that whenever a user
 * clicks on a non-text element (workspace background, sidebar, header, buttons, block handles, etc.),
 * any currently focused text editor (contenteditable, input, textarea) is blurred.
 * This guarantees that focus properly leaves the text editor when the user clicks outside,
 * allowing workspace-level shortcuts (like Ctrl+Z for block undo) to function seamlessly.
 */
export function setupGlobalTextFocusManager(): () => void {
  if (typeof window === "undefined") return () => {};

  const handlePointerDown = (e: PointerEvent | MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Check if clicked element or any ancestor is an editable input or contenteditable
    const isTargetEditable =
      target.isContentEditable ||
      Boolean(target.closest?.('[contenteditable="true"]')) ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT";

    // If the clicked target is NOT editable, ensure any active text editor is blurred
    if (!isTargetEditable) {
      const active = document.activeElement;
      if (
        active &&
        active !== document.body &&
        active !== document.documentElement &&
        (
          (active as HTMLElement).isContentEditable ||
          Boolean(active.closest?.('[contenteditable="true"]')) ||
          active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT"
        )
      ) {
        if (typeof (active as HTMLElement).blur === "function") {
          (active as HTMLElement).blur();
        }
      }
    }
  };

  window.addEventListener("pointerdown", handlePointerDown, true);
  return () => {
    window.removeEventListener("pointerdown", handlePointerDown, true);
  };
}

