/**
 * Checks whether the user is currently focused on an active text input element,
 * such as a Lexical ContentEditable block, HTML input, textarea, or select element.
 */
export function isUserEditingText(): boolean {
  if (typeof document === "undefined") return false;

  const active = document.activeElement;
  if (!active) return false;

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
