import mammoth from 'mammoth';
import Turndown from 'turndown';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { PDFContent } from './pdf-parser';
import { Node } from 'turndown';

// Configurar Turndown para la conversión de HTML a Markdown
const turndownService = new Turndown({
  headingStyle: 'atx',       // Use # style headings
  codeBlockStyle: 'fenced',  // Use ```code``` style blocks
  emDelimiter: '*',          // Use * for emphasis
  strongDelimiter: '**',     // Use ** for strong
  bulletListMarker: '-',     // Use - for unordered lists
  hr: '---',                 // Use --- for horizontal rules
  blankReplacement: function(content, node) {
    // Preserve multiple blank lines by checking node type
    return node.nodeName === 'P' || node.nodeName === 'DIV' || node.nodeName === 'BR' ? '\n\n' : '';
  }
});

// Improve list handling with better formatting
turndownService.addRule('listItems', {
  filter: ['ul', 'ol'],
  replacement: function(content: string, node: Node) {
    const isOrdered = node.nodeName === 'OL';
    
    // Split content into lines and process each line
    const lines = content.trim().split('\n');
    const processedLines = lines.map((line, index) => {
      line = line.trim();
      if (!line) return '';
      
      // Remove any existing list markers
      line = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
      
      // Add the appropriate list marker
      if (isOrdered) {
        return `${index + 1}. ${line}`;
      } else {
        return `- ${line}`;
      }
    });
    
    // Join lines with proper spacing
    return '\n\n' + processedLines.filter(line => line).join('\n') + '\n\n';
  }
});

// Enhanced paragraph handling
turndownService.addRule('paragraphs', {
  filter: 'p',
  replacement: function(content: string, node: Node) {
    // Clean up the content first
    content = content
      .replace(/[*`]+/g, '') // Remove extra asterisks and backticks
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .trim();
    
    // Check if the paragraph has special spacing
    const style = (node as HTMLElement).style;
    const marginBottom = style?.marginBottom;
    const marginTop = style?.marginTop;
    
    // Add extra line breaks for paragraphs with larger margins
    const hasExtraSpacing = marginBottom?.includes('2em') || marginTop?.includes('2em');
    const spacing = hasExtraSpacing ? '\n\n\n' : '\n\n';
    
    return spacing + content + spacing;
  }
});

// Add rule for headings with better formatting
turndownService.addRule('headings', {
  filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  replacement: function(content: string, node: Node) {
    const level = Number(node.nodeName.charAt(1));
    // Clean up the content
    content = content
      .replace(/[*`]+/g, '') // Remove extra asterisks and backticks
      .trim();
    return '\n\n' + '#'.repeat(level) + ' ' + content + '\n\n';
  }
});

/**
 * Enhanced Markdown cleaning with better formatting preservation
 */
async function cleanMarkdown(markdown: string): Promise<string> {
  try {
    // Apply enhanced cleaning rules
    let cleanedMarkdown = markdown
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      // Remove code blocks that shouldn't be there
      .replace(/```[^`]*```/g, '')
      // Remove extra asterisks
      .replace(/\*{3,}/g, '**')
      // Clean up list formatting
      .replace(/^[-*•]\s*(\d+\.)/gm, '$1') // Remove bullet points before numbers
      .replace(/^(\d+\.)\s*[-*•]/gm, '$1') // Remove bullet points after numbers
      // Normalize ordered lists
      .replace(/^\d+\.\s+/gm, (match, offset) => {
        // Count previous list items to determine the correct number
        const previousItems = markdown
          .slice(0, offset)
          .match(/^\d+\.\s+/gm)?.length || 0;
        return `${previousItems + 1}. `;
      })
      // Remove trailing spaces
      .replace(/[ \t]+$/gm, '')
      // Ensure proper spacing around headings
      .replace(/^(#{1,6} .*?)$/gm, '\n\n$1\n\n')
      // Ensure paragraphs are properly separated
      .replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
      // Remove multiple consecutive blank lines
      .replace(/\n{3,}/g, '\n\n')
      .trim() + '\n';

    // Final pass to ensure proper list formatting
    cleanedMarkdown = cleanedMarkdown
      .split('\n')
      .map(line => {
        // Clean up any remaining mixed list markers
        line = line.replace(/^[-*•]+\s*(\d+\.)/, '$1'); // Remove bullets before numbers
        line = line.replace(/^(\d+\.)\s*[-*•]+/, '$1'); // Remove bullets after numbers
        return line;
      })
      .join('\n');

    console.log('Enhanced Markdown cleaning completed');
    return cleanedMarkdown;
  } catch (error) {
    console.warn('Error during Markdown cleaning, returning original:', error);
    return markdown;
  }
}

/**
 * Convierte un archivo Word a Markdown
 */
export async function parseWord(file: Blob): Promise<PDFContent> {
  try {
    console.log('Starting Word document parsing...');
    console.log('Input file type:', file.type);
    console.log('Input file size:', file.size, 'bytes');

    // Paso 1: Convertir Blob a ArrayBuffer y luego a Buffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('ArrayBuffer obtained:', {
      byteLength: arrayBuffer.byteLength,
      isArrayBuffer: arrayBuffer instanceof ArrayBuffer
    });

    // Verificar que el ArrayBuffer no esté vacío
    if (arrayBuffer.byteLength === 0) {
      throw new Error('ArrayBuffer is empty');
    }

    // Convertir ArrayBuffer a Buffer
    const buffer = Buffer.from(arrayBuffer);
    console.log('Buffer created, length:', buffer.length);

    // Paso 2: Usar Mammoth para convertir Word a HTML usando buffer
    console.log('Calling mammoth.convertToHtml with buffer...');
    const result = await mammoth.convertToHtml({
      buffer: buffer
    });

    const { value: html, messages } = result;

    // Registrar mensajes de advertencia o error de Mammoth
    if (messages && messages.length > 0) {
      console.log('Mammoth conversion messages:', JSON.stringify(messages, null, 2));
    }

    // Verificar que el HTML no esté vacío
    if (!html) {
      console.error('Mammoth produced empty HTML');
      throw new Error('No content was extracted from the document');
    }

    console.log('HTML conversion successful, length:', html.length);
    console.log('HTML preview:', html.substring(0, 200)); // Log primeros 200 caracteres del HTML
    
    // Paso 3: Usar Turndown para convertir HTML a Markdown
    console.log('Converting HTML to Markdown...');
    const markdown = turndownService.turndown(html);
    console.log('Markdown conversion successful, length:', markdown.length);
    console.log('Markdown preview:', markdown.substring(0, 200)); // Log primeros 200 caracteres del Markdown
    
    // Paso 4: Limpiar y formatear el Markdown con reglas básicas
    console.log('Cleaning Markdown...');
    const cleanedMarkdown = await cleanMarkdown(markdown);
    console.log('Markdown cleaning successful, length:', cleanedMarkdown.length);
    console.log('Cleaned Markdown preview:', cleanedMarkdown.substring(0, 200));
    
    // Paso 5: Usar Remark para normalizar y procesar el Markdown limpio
    console.log('Processing Markdown with Remark...');
    const processedMarkdown = await unified()
      .use(remarkParse)
      .use(remarkStringify)
      .process(cleanedMarkdown);
    
    const finalMarkdown = String(processedMarkdown);
    console.log('Final Markdown processing successful, length:', finalMarkdown.length);
    
    // Paso 6: Devolver el contenido en el formato esperado
    return {
      markdown: finalMarkdown,
      metadata: {
        pageCount: 1,
        hasHeaders: false,
        hasFooters: false,
        hasTables: html.includes('<table'),
        hasImages: html.includes('<img')
      }
    };
  } catch (error) {
    console.error('Error parsing Word document:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse Word document: ${errorMessage}. Please ensure the file is a valid .docx file and try again.`);
  }
} 