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
  
  // Detect lists first and save the prefix
  if (text.match(/^[•\-\*]/)) {
    isList = true;
    listPrefix = '- ';
    markdown = text.replace(/^[•\-\*]/, '').trim();
  } else if (text.match(/^\d+\./)) {
    isList = true;
    listPrefix = '1. ';
    markdown = text.replace(/^\d+\./, '').trim();
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
  
  // Add spacing based on position
  const needsNewline = prevItem && Math.abs(item.transform[5] - prevItem.transform[5]) > 10;
  return needsNewline ? `\n${markdown}` : markdown;
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
      
      // Add page separator
      if (pageNum > 1) {
        markdownContent += '\n\n---\n\n';
      }
      
      // Process text content
      textContent.items.forEach((item, index) => {
        const textItem = item as TextItem;
        const prevItem = index > 0 ? textContent.items[index - 1] as TextItem : null;
        const nextItem = index < textContent.items.length - 1 ? textContent.items[index + 1] as TextItem : null;
        
        // Detect headers and footers on first page
        if (pageNum === 1) {
          hasHeaders = hasHeaders || textItem.transform[5] > page.view[3] - 100;
          hasFooters = hasFooters || textItem.transform[5] < 100;
        }
        
        // Convert to markdown and append
        const markdown = convertToMarkdown(textItem, prevItem, nextItem, textItem.fontName as string | undefined);
        markdownContent += markdown + ' ';
      });
    }
    
    return {
      markdown: markdownContent.trim(),
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