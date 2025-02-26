import MarkdownIt from 'markdown-it';

// Polyfill for isSpace function used by markdown-it
export const isSpace = (code: number): boolean => {
  switch (code) {
    case 0x09: // \t
    case 0x20: // space
    case 0x0A: // \n
    case 0x0D: // \r
    case 0x0C: // \f
      return true;
    default:
      return false;
  }
};

// Make isSpace available globally
if (typeof window !== 'undefined') {
  (window as { isSpace?: typeof isSpace }).isSpace = isSpace;
} else if (typeof global !== 'undefined') {
  (global as { isSpace?: typeof isSpace }).isSpace = isSpace;
}

// Initialize markdown-it parser with enhanced configuration
export const md = new MarkdownIt({
  html: true,           // Enable HTML tags in source
  xhtmlOut: true,       // Use '/' to close single tags (<br />)
  breaks: true,         // Convert '\n' in paragraphs into <br>
  linkify: true,        // Autoconvert URL-like text to links
  typographer: true,    // Enable some language-neutral replacement + quotes beautification
}).enable([
  // Block rules
  'paragraph',
  'heading',
  'list',
  'hr',
  'blockquote',
  'code',
  'fence',
  'table',
  
  // Inline rules
  'text',
  'link',
  'image',
  'strikethrough',
  'emphasis',        // This handles both bold and italic
  'backticks',
  'escape',
  'html_inline'
]);

// Add custom renderer for emphasis to ensure proper bold/italic handling
md.renderer.rules.strong_open = () => '<strong>';
md.renderer.rules.strong_close = () => '</strong>';
md.renderer.rules.em_open = () => '<em>';
md.renderer.rules.em_close = () => '</em>'; 