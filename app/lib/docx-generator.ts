import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  IStylesOptions,
  convertInchesToTwip,
  INumberingOptions,
  ILevelsOptions
} from 'docx';
import { md } from './markdown-utils';

// Define Token interface for internal use
interface TokenInternal {
  type: string;
  tag: string;
  attrs: [string, string][] | null;
  map: [number, number] | null;
  nesting: number;
  level: number;
  children: TokenInternal[] | null;
  content: string;
  markup: string;
  info: string;
  meta: unknown;
  block: boolean;
  hidden: boolean;
}

// Polyfill for isSpace function used by markdown-it
const isSpace = (code: number): boolean => {
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

if (typeof global !== 'undefined') {
  (global as { isSpace?: typeof isSpace }).isSpace = isSpace;
}

// Document styles configuration
const styles: IStylesOptions = {
  default: {
    document: {
      run: {
        font: 'Calibri',
        size: 24
      },
      paragraph: {
        spacing: { line: 276, before: 20, after: 20 }
      }
    }
  },
  paragraphStyles: [
    {
      id: 'Normal',
      name: 'Normal',
      basedOn: 'Normal',
      next: 'Normal',
      quickFormat: true,
      run: {
        size: 24,
        font: 'Calibri'
      }
    }
  ]
};

// Numbering configuration for lists
const numbering: INumberingOptions = {
  config: [
    {
      reference: 'bullet-list',
      levels: [
        {
          level: 0,
          format: 'bullet',
          text: '•',
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) }
            }
          }
        } as ILevelsOptions
      ]
    },
    {
      reference: 'number-list',
      levels: [
        {
          level: 0,
          format: 'decimal',
          text: '%1.',
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) }
            }
          }
        } as ILevelsOptions
      ]
    }
  ]
};

export async function generateWordDocument(markdownContent: string): Promise<Buffer> {
  try {
    // Create a simple document with basic structure
    const doc = new Document({
      creator: "PDF to Word Converter",
      description: "Converted document",
      title: "Converted Document",
      styles,
      numbering,
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440
            }
          }
        },
        children: convertMarkdownToDocx(markdownContent)
      }]
    });

    // Use Packer to create a buffer from the document
    return await Packer.toBuffer(doc);
  } catch (error) {
    console.error('Error generating Word document:', error);
    throw new Error('Failed to generate Word document: ' + (error instanceof Error ? error.message : String(error)));
  }
}

function convertMarkdownToDocx(markdown: string): Paragraph[] {
  const tokens = md.parse(markdown, {});
  const paragraphs: Paragraph[] = [];
  const currentListLevel = 0;
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === 'heading_open') {
      const level = token.tag.charAt(1);
      const content = tokens[i + 1].content;
      const headingStyle = `Heading${level}`;
      paragraphs.push(createParagraphWithFormatting(content, token, headingStyle));
      i += 2; // Skip the content and closing tag
    } 
    else if (token.type === 'paragraph_open') {
      const content = tokens[i + 1].content;
      paragraphs.push(createParagraphWithFormatting(content, token));
      i += 2; // Skip the content and closing tag
    } 
    else if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      const isOrdered = token.type === 'ordered_list_open';
      const listStartIndex = i;
      let listEndIndex = -1;
      let nestingLevel = 1;
      
      // Find the end of this list
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === 'bullet_list_open' || tokens[j].type === 'ordered_list_open') {
          nestingLevel++;
        } else if (tokens[j].type === 'bullet_list_close' || tokens[j].type === 'ordered_list_close') {
          nestingLevel--;
          if (nestingLevel === 0) {
            listEndIndex = j;
            break;
          }
        }
      }
      
      if (listEndIndex === -1) {
        continue; // Malformed list, skip it
      }
      
      // Process list items
      for (let j = listStartIndex + 1; j < listEndIndex; j++) {
        if (tokens[j].type === 'list_item_open') {
          const itemStartIndex = j;
          let itemEndIndex = -1;
          let itemNestingLevel = 1;
          
          // Find the end of this list item
          for (let k = j + 1; k < listEndIndex; k++) {
            if (tokens[k].type === 'list_item_open') {
              itemNestingLevel++;
            } else if (tokens[k].type === 'list_item_close') {
              itemNestingLevel--;
              if (itemNestingLevel === 0) {
                itemEndIndex = k;
                break;
              }
            }
          }
          
          if (itemEndIndex === -1) {
            continue; // Malformed list item, skip it
          }
          
          // Find the content of this list item
          let itemContent = '';
          for (let k = itemStartIndex + 1; k < itemEndIndex; k++) {
            if (tokens[k].type === 'paragraph_open') {
              itemContent = tokens[k + 1].content;
              break;
            }
          }
          
          // Create a new paragraph with numbering
          const listParagraph = new Paragraph({
            style: 'Normal',
            spacing: {
              before: 200,
              after: 200,
              line: 360, // 1.5 line spacing
            },
            numbering: {
              reference: isOrdered ? 'number-list' : 'bullet-list',
              level: currentListLevel
            }
          });
          
          // Process the text with formatting and add to the paragraph
          // This will handle partial formatting within the list item
          const textRuns = processTextWithFormatting(itemContent);
          textRuns.forEach(run => listParagraph.addChildElement(run));
          
          paragraphs.push(listParagraph);
          
          j = itemEndIndex; // Skip to the end of this list item
        }
      }
      
      i = listEndIndex; // Skip to the end of this list
    } 
    else if (token.type === 'hr') {
      const paragraph = new Paragraph({
        children: [
          new TextRun({
            text: '',
            break: 1,
          }),
        ],
        border: {
          bottom: {
            color: '999999',
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
      });
      paragraphs.push(paragraph);
    }
  }
  
  return paragraphs;
}

function processTextWithFormatting(text: string): TextRun[] {
  // Preserve answer spaces (multiple underscores)
  const answerSpacePattern = /_{3,}/g;
  const answerSpaces = text.match(answerSpacePattern);
  if (answerSpaces) {
    // Replace answer spaces with a temporary marker
    text = text.replace(answerSpacePattern, (match) => `§${match.length}§`);
  }

  // Special case for list items with partial formatting
  const colonFormatPattern = /^\*\*([^:]+)\*\*\s*:\s*(.*)$/;
  const colonFormatMatch = text.match(colonFormatPattern);
  
  if (colonFormatMatch) {
    const boldPart = colonFormatMatch[1];
    const regularPart = colonFormatMatch[2];
    
    return [
      new TextRun({ text: boldPart, bold: true }),
      new TextRun({ text: ': ' }),
      new TextRun({ text: regularPart })
    ];
  }
  
  // Check for different types of formatting
  const hasBold = text.includes('**');
  const hasItalicAsterisk = text.includes('*') && !text.includes('**');
  const hasItalicUnderscore = text.includes('_');
  
  if (!hasBold && !hasItalicAsterisk && !hasItalicUnderscore) {
    // Restore answer spaces in plain text
    if (answerSpaces) {
      text = text.replace(/§(\d+)§/g, (_, length) => '_'.repeat(Number(length)));
    }
    return [new TextRun({ text })];
  }
  
  const textRuns: TextRun[] = [];
  
  // Process bold formatting first
  if (hasBold) {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    parts.forEach(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Bold text
        const boldText = part.slice(2, -2);
        // Process italic within bold
        if (boldText.includes('*') || boldText.includes('_')) {
          const italicParts = boldText.split(/(\*.*?\*|_.*?_)/g);
          italicParts.forEach(italicPart => {
            if ((italicPart.startsWith('*') && italicPart.endsWith('*')) ||
                (italicPart.startsWith('_') && italicPart.endsWith('_'))) {
              textRuns.push(new TextRun({ 
                text: italicPart.slice(1, -1), 
                bold: true,
                italics: true 
              }));
            } else if (italicPart) {
              textRuns.push(new TextRun({ 
                text: italicPart, 
                bold: true 
              }));
            }
          });
        } else {
          textRuns.push(new TextRun({ 
            text: boldText, 
            bold: true 
          }));
        }
      } else if (part) {
        // Process italic in non-bold text
        if (part.includes('*') || part.includes('_')) {
          const italicParts = part.split(/(\*.*?\*|_.*?_)/g);
          italicParts.forEach(italicPart => {
            if ((italicPart.startsWith('*') && italicPart.endsWith('*')) ||
                (italicPart.startsWith('_') && italicPart.endsWith('_'))) {
              // Restore answer spaces in italic text
              let italicText = italicPart.slice(1, -1);
              if (answerSpaces) {
                italicText = italicText.replace(/§(\d+)§/g, (_, length) => '_'.repeat(Number(length)));
              }
              textRuns.push(new TextRun({ 
                text: italicText, 
                italics: true 
              }));
            } else if (italicPart) {
              // Restore answer spaces in regular text
              if (answerSpaces) {
                italicPart = italicPart.replace(/§(\d+)§/g, (_, length) => '_'.repeat(Number(length)));
              }
              textRuns.push(new TextRun({ text: italicPart }));
            }
          });
        } else {
          // Restore answer spaces in regular text
          if (answerSpaces) {
            part = part.replace(/§(\d+)§/g, (_, length) => '_'.repeat(Number(length)));
          }
          textRuns.push(new TextRun({ text: part }));
        }
      }
    });
  } else {
    // Only italic formatting (either * or _)
    const parts = text.split(/(\*.*?\*|_.*?_)/g);
    parts.forEach(part => {
      if ((part.startsWith('*') && part.endsWith('*')) ||
          (part.startsWith('_') && part.endsWith('_'))) {
        // Restore answer spaces in italic text
        let italicText = part.slice(1, -1);
        if (answerSpaces) {
          italicText = italicText.replace(/§(\d+)§/g, (_, length) => '_'.repeat(Number(length)));
        }
        textRuns.push(new TextRun({ 
          text: italicText, 
          italics: true 
        }));
      } else if (part) {
        // Restore answer spaces in regular text
        if (answerSpaces) {
          part = part.replace(/§(\d+)§/g, (_, length) => '_'.repeat(Number(length)));
        }
        textRuns.push(new TextRun({ text: part }));
      }
    });
  }
  
  return textRuns;
}

function createParagraphWithFormatting(text: string, tokenData: TokenInternal, style?: string): Paragraph {
  // Split text by newlines to handle line breaks
  const lines = text.split('\n');
  const paragraph = new Paragraph({
    style: style || 'Normal',
    spacing: {
      before: 200,
      after: 200,
      line: 360, // 1.5 line spacing
    }
  });
  
  // Process each line
  lines.forEach((line, index) => {
    // Add text runs with formatting for this line
    const textRuns = processTextWithFormatting(line);
    textRuns.forEach(run => paragraph.addChildElement(run));
    
    // Add line break between lines (except for the last line)
    if (index < lines.length - 1) {
      paragraph.addChildElement(new TextRun({ break: 1 }));
    }
  });
  
  return paragraph;
}