import * as pdfjs from 'pdfjs-dist'
import { TextItem } from 'pdfjs-dist/types/src/display/api'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry'

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

export interface PDFContent {
  markdown: string;
  metadata: {
    pageCount: number;
    hasHeaders: boolean;
    hasFooters: boolean;
    hasTables: boolean;
    hasImages: boolean;
  };
}

function detectHeadingLevel(fontSize: number): number {
  if (fontSize >= 20) return 1;
  if (fontSize >= 16) return 2;
  if (fontSize >= 14) return 3;
  return 0; // Not a heading
}

function convertToMarkdown(
  item: TextItem,
  prevItem: TextItem | null,
  nextItem: TextItem | null,
  fontName?: string
): string {
  const fontSize = Math.abs(item.transform[0]);
  const text = item.str.trim();
  const fontNameLower = (fontName || '').toLowerCase();
  
  // Skip empty text
  if (!text) return '';
  
  let markdown = text;
  let isList = false;
  let listPrefix = '';
  
  // Detect lists with better pattern matching
  if (text.match(/^[\s]*[•\-\*][\s]*/)) {
    isList = true;
    listPrefix = '- ';
    markdown = text.replace(/^[\s]*[•\-\*][\s]*/, '').trim();
  } else if (text.match(/^[\s]*\d+\.[\s]*/)) {
    isList = true;
    listPrefix = '1. ';
    markdown = text.replace(/^[\s]*\d+\.[\s]*/, '').trim();
  }
  
  // Check for partial formatting patterns in the text
  const hasColonSeparator = markdown.includes(':');
  
  if (hasColonSeparator && fontNameLower.includes('bold')) {
    // Handle the case where only part of the text is bold (before the colon)
    const parts = markdown.split(':');
    if (parts.length >= 2) {
      const boldPart = parts[0].trim();
      const restPart = parts.slice(1).join(':').trim();
      markdown = `**${boldPart}**: ${restPart}`;
    } else {
      markdown = `**${markdown}**`;
    }
  } else {
    // Apply formatting to the entire text
    if (fontNameLower.includes('bold')) {
      markdown = `**${markdown}**`;
    }
    if (fontNameLower.includes('italic')) {
      markdown = `*${markdown}*`;
    }
  }
  
  // Detect headings
  const headingLevel = detectHeadingLevel(fontSize);
  if (headingLevel > 0 && !isList) {
    markdown = `${'#'.repeat(headingLevel)} ${markdown}`;
  }
  
  // Add list prefix after formatting is applied
  if (isList) {
    markdown = `${listPrefix}${markdown}`;
  }
  
  // Enhanced spacing detection with more aggressive rules
  let prefix = '';
  let suffix = '';
  
  if (prevItem) {
    const verticalGap = Math.abs(item.transform[5] - prevItem.transform[5]);
    const horizontalGap = Math.abs(item.transform[4] - prevItem.transform[4]);
    const isNewLine = verticalGap > 0; // Any vertical difference indicates new line
    
    // More aggressive paragraph detection
    if (verticalGap > 12) { // Reduced from 15 to 12 for more sensitive paragraph detection
      prefix = '\n\n\n'; // Triple newline for clear paragraph separation
    }
    // Indentation or tab detection
    else if (verticalGap < 3 && horizontalGap > 8) { // Reduced from 10 to 8 for better tab detection
      prefix = '    ';
    }
    // Normal line break - more sensitive detection
    else if (isNewLine) {
      prefix = '\n\n'; // Double newline for better separation
    }
    // Same line continuation with proper spacing
    else {
      prefix = ' ';
    }
  }
  
  if (nextItem) {
    const verticalGap = Math.abs(nextItem.transform[5] - item.transform[5]);
    const isLastInParagraph = verticalGap > 12; // Check if this is the last line in a paragraph
    
    // Add extra line breaks for paragraph separation
    if (isLastInParagraph) {
      suffix = '\n\n';
    }
  }
  
  return prefix + markdown + suffix;
}

export async function parsePDF(input: Blob | File): Promise<PDFContent> {
  try {
    const buffer = await input.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    
    let markdownContent = '';
    let hasHeaders = false;
    let hasFooters = false;
    const hasTables = false;
    let hasImages = false;
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Check for images
      const operatorList = await page.getOperatorList();
      hasImages = hasImages || operatorList.fnArray.includes(pdfjs.OPS.paintImageXObject);
      
      // Add page separator with extra spacing
      if (pageNum > 1) {
        markdownContent += '\n\n---\n\n';
      }
      
      // Process text content with enhanced spacing handling
      let currentY = null;
      let isFirstItem = true;
      let lastY: number | null = null;
      
      textContent.items.forEach((item, index) => {
        const textItem = item as TextItem;
        const prevItem = index > 0 ? textContent.items[index - 1] as TextItem : null;
        const nextItem = index < textContent.items.length - 1 ? textContent.items[index + 1] as TextItem : null;
        
        // Detect headers and footers on first page
        if (pageNum === 1) {
          hasHeaders = hasHeaders || textItem.transform[5] > page.view[3] - 100;
          hasFooters = hasFooters || textItem.transform[5] < 100;
        }
        
        // Add extra paragraph break if significant vertical gap
        if (lastY !== null && Math.abs(textItem.transform[5] - lastY) > 12) {
          markdownContent += '\n\n';
        }
        
        // Convert to markdown with enhanced spacing
        const markdown = convertToMarkdown(textItem, prevItem, nextItem, textItem.fontName as string | undefined);
        
        // Handle first item of the page differently
        if (isFirstItem) {
          markdownContent += markdown.trimLeft();
          isFirstItem = false;
        } else {
          markdownContent += markdown;
        }
        
        lastY = textItem.transform[5];
      });
    }
    
    // Enhanced cleanup of the final markdown
    markdownContent = markdownContent
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      // Remove more than three consecutive blank lines
      .replace(/\n{4,}/g, '\n\n\n')
      // Ensure proper list formatting with extra spacing
      .replace(/^(- |\d+\. )/gm, '\n\n$1')
      // Remove trailing spaces
      .replace(/[ \t]+$/gm, '')
      // Ensure proper spacing around headings
      .replace(/^(#{1,6} .*?)$/gm, '\n\n$1\n\n')
      // Ensure paragraphs are properly separated
      .replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
      // Final cleanup of excessive spacing
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();
    
    return {
      markdown: markdownContent,
      metadata: {
        pageCount: pdf.numPages,
        hasHeaders,
        hasFooters,
        hasTables,
        hasImages
      }
    };
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF');
  }
} 