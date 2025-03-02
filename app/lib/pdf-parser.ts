import pdf2md from '@opendocsg/pdf2md';
import * as pdfjs from 'pdfjs-dist';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// PDF to Markdown conversion callbacks
const PDF2MD_CALLBACKS = {
  metadataParsed: () => {
    console.log('[PDF Processing] Metadata successfully parsed');
  },
  pageParsed: () => {
    console.log('[PDF Processing] Page content successfully parsed');
  },
  documentParsed: () => {
    console.log('[PDF Processing] Document parsing completed successfully');
  }
};

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

function cleanupMarkdown(markdown: string): string {
  // First pass: normalize basic elements
  let text = markdown
    .replace(/\r\n/g, '\n')
    // Fix common PDF conversion artifacts
    .replace(/([^_])'([^_])/g, "$1'$2")
    .replace(/([^_])"([^_])/g, '$1"$2');

  // Handle biblical quotes (special case)
  text = text.replace(
    /_+"([^"]+)"_+/g,
    "**_$1_**"
  );

  // Handle biblical references
  text = text.replace(
    /_+(-\s*)?([^_]+\([^)]+\))_+/g,
    "**$2**"
  );

  // Split into lines for structural processing
  const lines = text.split('\n');
  const processedLines: string[] = [];
  let inQuote = false;

  for (const line of lines) {
    let processedLine = line.trim();
    
    if (!processedLine) {
      processedLines.push('');
      continue;
    }

    // Handle headings
    if (processedLine.startsWith('#')) {
      if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
        processedLines.push('');
      }
      processedLine = processedLine.replace(/^(#{1,6}):?\s*/, '$1 ');
      processedLines.push(processedLine);
      processedLines.push('');
      continue;
    }

    // Handle bullet points
    if (processedLine.includes('●')) {
      if (processedLines.length > 0 && processedLines[processedLines.length - 1] !== '') {
        processedLines.push('');
      }
      processedLine = processedLine.replace(/●\s*/, '* ');
    }

    // Clean up any remaining formatting issues
    processedLine = processedLine
      // Fix multiple asterisks
      .replace(/\*{3,}/g, '**')
      // Fix multiple underscores
      .replace(/_{3,}/g, '_')
      // Fix space between formatting
      .replace(/\*\s+\*/g, '**')
      .replace(/_\s+_/g, '_');

    processedLines.push(processedLine);
  }

  // Final cleanup
  return processedLines
    .join('\n')
    // Remove multiple consecutive empty lines
    .replace(/\n{3,}/g, '\n\n')
    // Final formatting fixes
    .replace(/\*\*\s+\*\*/g, '**')
    .replace(/_\s+_/g, '_')
    .trim();
}

export async function parsePDF(input: Blob | File): Promise<PDFContent> {
  try {
    // Create two separate array buffers for pdf.js and pdf2md
    const arrayBuffer1 = await input.arrayBuffer();
    const arrayBuffer2 = await input.arrayBuffer();

    // Convert first buffer for pdf.js
    const uint8Array = new Uint8Array(arrayBuffer1);

    // First try to extract metadata since it's more likely to succeed
    const loadingTask = pdfjs.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    const metadata = await extractMetadata(pdf);

    // Then try the markdown conversion with second buffer
    try {
      // pdf2md expects a Buffer
      const buffer = Buffer.from(arrayBuffer2);
      const markdown = await pdf2md(buffer, PDF2MD_CALLBACKS);
      
      // Clean up the markdown output
      const cleanedMarkdown = cleanupMarkdown(markdown);
      
      return {
        markdown: cleanedMarkdown,
        metadata
      };
    } catch (mdError) {
      console.error('Error converting to markdown:', mdError);
      // Fallback to basic text extraction if markdown conversion fails
      const textContent = await extractTextContent(pdf);
      return {
        markdown: cleanupMarkdown(textContent),
        metadata
      };
    }
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractTextContent(pdf: pdfjs.PDFDocumentProxy): Promise<string> {
  let text = '';
  let lastY: number | null = null;
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    
    // Process items with position information
    const items = content.items.map((item: TextItem | TextMarkedContent) => {
      if ('str' in item) { // Type guard for TextItem
        return {
          text: item.str,
          y: item.transform[5],
          x: item.transform[4],
          fontName: item.fontName
        };
      }
      return null;
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    // Sort items by vertical position (top to bottom) and then horizontal position
    items.sort((a, b) => b.y !== a.y ? b.y - a.y : a.x - b.x);

    // Process items with better formatting detection
    for (const item of items) {
      // Detect if we need a new paragraph based on vertical position
      if (lastY !== null && Math.abs(item.y - lastY) > 12) {
        text += '\n\n';
      } else if (lastY !== null && item.y !== lastY) {
        text += ' ';
      }

      // Add the text with basic formatting
      let itemText = item.text;
      if (item.fontName && item.fontName.toLowerCase().includes('bold')) {
        itemText = `**${itemText}**`;
      }
      
      text += itemText;
      lastY = item.y;
    }

    // Add page separator except for last page
    if (i < pdf.numPages) {
      text += '\n\n---\n\n';
    }
  }
  
  return cleanupMarkdown(text.trim());
}

async function extractMetadata(pdf: pdfjs.PDFDocumentProxy) {
  let hasHeaders = false;
  let hasFooters = false;
  let hasImages = false;
  let hasTables = false;

  try {
    // Check first page for headers, footers, images, and tables
    const page = await pdf.getPage(1);
    const operatorList = await page.getOperatorList();
    
    // Check for images
    hasImages = operatorList.fnArray.includes(pdfjs.OPS.paintImageXObject);

    // Get text content to check for headers and footers
    const textContent = await page.getTextContent();
    const { height } = page.getViewport({ scale: 1.0 });

    // Analyze text positions to detect headers and footers
    for (const item of textContent.items) {
      const textItem = item as TextItem;
      const y = textItem.transform[5];
      
      // Consider text in top 10% as header
      if (y > height * 0.9) {
        hasHeaders = true;
      }
      // Consider text in bottom 10% as footer
      if (y < height * 0.1) {
        hasFooters = true;
      }
    }

    // Check for table-like structures in text content
    const text = textContent.items
      .filter((item): item is TextItem => 'str' in item)
      .map((item) => item.str)
      .join(' ');
    hasTables = /\|\s*[-|]+\s*\|/.test(text) || text.includes('┌') || text.includes('└') || text.includes('│');
  } catch (error) {
    console.error('Error extracting metadata:', error);
    // Return default values if metadata extraction fails
  }

  return {
    pageCount: pdf.numPages,
    hasHeaders,
    hasFooters,
    hasTables,
    hasImages
  };
} 