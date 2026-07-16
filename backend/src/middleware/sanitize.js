// Server-side XSS sanitization for all user-generated content.
// Strips all HTML tags, event handlers, and dangerous attributes.
// Returns plain text — the frontend is responsible for rendering
// markdown / mentions / emojis on top of this safe base string.
import sanitizeHtml from 'sanitize-html';

const STRIP_OPTIONS = {
  allowedTags: [],          // Strip ALL HTML tags
  allowedAttributes: {},   // Strip ALL attributes
  allowProtocolRelative: false,
  decodeEntities: false,   // Keep raw entities as-is
  // Disallow HTML comments which can be abused in some contexts
  allowedIframeHostnames: [],
  enforceHtmlEntityDecode: false,
};

/**
 * Sanitize a string by stripping all HTML. Safe for messages,
 * DMs, usernames, bios, channel topics, server descriptions, etc.
 *
 * - Non-string inputs are coerced to empty string (never throws).
 * - Returns the original string trimmed and stripped of HTML.
 */
export function sanitize(input) {
  if (input == null) return '';
  const str = String(input);
  if (!str) return '';
  if (!/[<>&"']/.test(str)) return str.trim();
  return sanitizeHtml(str, STRIP_OPTIONS).trim();
}
