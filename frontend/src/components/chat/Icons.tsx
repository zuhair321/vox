// Vox icon set — stroke-based SVG glyphs sized to fit the action-toolbar
// (14×14 in a 28px cut-corner button). Stroke uses currentColor so the
// icon inherits the button's text color and picks up hover/danger states
// automatically. Sized via width/height attrs and 1.5 stroke for the
// angular, slightly-inked feel that matches the Cinzel/Share-Tech-Mono
// aesthetic of the rest of the app.
//
// Why SVG and not emoji:
//   • Emoji (✏️ 🙂 🗑️) doesn't inherit theme colors and clashes with the
//     dark-matter / crimson palette.
//   • These glyphs scale cleanly, animate with CSS, and respect
//     font-size / line-height for alignment.
//   • They match the existing "cut-corner + thin border" geometry.

import React from 'react';

const baseProps = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

export const IconEdit: React.FC = () => (
  <svg {...baseProps}>
    {/* Pencil — diagonal shaft + tip + eraser end, the Discord/Linear staple */}
    <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
    <path d="M13.5 6.5l3 3" />
  </svg>
);

export const IconReact: React.FC = () => (
  <svg {...baseProps}>
    {/* Smiley — open circle + two dots + a curve. Smaller details so it
        reads as "react" even at 14px (vs. a generic circle). */}
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
    <path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8" />
  </svg>
);

export const IconDelete: React.FC = () => (
  <svg {...baseProps}>
    {/* Trash — lid + handle + bin + two interior lines. Standard, instantly
        readable. */}
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

export const IconReply: React.FC = () => (
  <svg {...baseProps}>
    {/* Curved reply arrow */}
    <path d="M9 14l-5-4 5-4" />
    <path d="M4 10h9a6 6 0 0 1 6 6v0a6 6 0 0 1-6 6h-3" />
  </svg>
);

export const IconPin: React.FC = () => (
  <svg {...baseProps}>
    <path d="M12 17v5" />
    <path d="M9 4h6l-1 7 3 3H7l3-3-1-7Z" />
  </svg>
);

export const IconCopy: React.FC = () => (
  <svg {...baseProps}>
    <rect x="8" y="8" width="12" height="12" rx="1" />
    <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
  </svg>
);

export const IconBookmark: React.FC = () => (
  <svg {...baseProps}>
    <path d="M6 3h12v18l-6-4-6 4Z" />
  </svg>
);

export const IconLink: React.FC = () => (
  <svg {...baseProps}>
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" />
  </svg>
);

export const IconFlag: React.FC = () => (
  <svg {...baseProps}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1Z" />
    <path d="M4 22v-7" />
  </svg>
);

export const IconChevron: React.FC = () => (
  // Used for the message-row "more" affordance — a small downward chevron
  // that opens the action popover. Rotates 180° when the popover is open.
  <svg
    width={12}
    height={12}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    focusable={false}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);