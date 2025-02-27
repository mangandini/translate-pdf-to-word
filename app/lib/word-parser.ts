import mammoth from 'mammoth';
import Turndown from 'turndown';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { PDFContent } from './pdf-parser';
import { Node } from 'turndown';
import { lint as lintPromise } from 'markdownlint/promise';

// Define Mammoth types
interface MammothOptions {
  styleMap?: string[];
  includeDefaultStyleMap?: boolean;
  convertImage?: unknown;
  includeEmbeddedStyleMap?: boolean;
  ignoreEmptyParagraphs?: boolean;
  idPrefix?: string;
}

interface MammothInput {
  arrayBuffer: ArrayBuffer;
  styleMap?: string[];
  includeDefaultStyleMap?: boolean;
  ignoreEmptyParagraphs?: boolean;
}

interface MammothResult {
  value: string;
  messages: Array<{
    type: string;
    message: string;
    locationInInput?: object;
  }>;
}

// Define Markdownlint types
interface MarkdownlintReplacement {
  start: number;
  end: number;
  text: string;
}

interface MarkdownlintFixInfo {
  lineNumber: number;
  replacements: MarkdownlintReplacement[];
}

interface MarkdownlintResult {
  fixInfo?: MarkdownlintFixInfo;
}

// Configurar Turndown para la conversión de HTML a Markdown
const turndownService = new Turndown({
  headingStyle: 'atx',       // Use # style headings
  codeBlockStyle: 'fenced',  // Use ```code``` style blocks
  emDelimiter: '*',          // Use * for emphasis
  strongDelimiter: '**',     // Use ** for strong
  bulletListMarker: '-',     // Use - for unordered lists
  hr: '---',                 // Use --- for horizontal rules
});

// Configurar Markdownlint
const markdownlintConfig = {
  "default": true,
  "MD013": false,  // Line length
  "MD033": false,  // Inline HTML
  "MD041": false,  // First line h1
  "MD002": false,  // First header should be h1
  "MD031": false,  // Fenced code blocks
};

// Mejorar el manejo de listas y otros elementos
turndownService.addRule('listItems', {
  filter: ['ul', 'ol'],
  replacement: function(content: string, node: Node) {
    const isOrdered = node.nodeName === 'OL';
    const prefix = isOrdered ? '1. ' : '- ';
    return '\n\n' + content.replace(/^/gm, prefix) + '\n\n';
  }
});

// Mejorar el manejo de párrafos para preservar espaciado
turndownService.addRule('paragraphs', {
  filter: 'p',
  replacement: function(content: string) {
    return '\n\n' + content + '\n\n';
  }
});

/**
 * Limpia y formatea el Markdown usando reglas básicas
 */
async function cleanMarkdown(markdown: string): Promise<string> {
  try {
    // Aplicar reglas básicas de limpieza
    let cleanedMarkdown = markdown
      // Eliminar espacios en blanco múltiples
      .replace(/\s+/g, ' ')
      // Normalizar saltos de línea
      .replace(/\n{3,}/g, '\n\n')
      // Asegurar que los encabezados tengan espacio después del #
      .replace(/^(#{1,6})([^ \n])/gm, '$1 $2')
      // Normalizar listas
      .replace(/^[-*+]\s*/gm, '- ')
      .replace(/^\d+\.\s*/gm, '1. ')
      // Eliminar espacios al final de las líneas
      .replace(/[ \t]+$/gm, '')
      // Asegurar un salto de línea al final del archivo
      .trim() + '\n';

    console.log('Basic Markdown cleaning completed');
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

/**
 * Elimina el marcado Markdown para obtener texto plano
 * Esta función no se usa en el parser de Word pero se mantiene por consistencia con pdf-parser
 */
function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/#{1,6}\s+/g, '')         // Eliminar encabezados
    .replace(/\*\*(.*?)\*\*/g, '$1')   // Eliminar negritas
    .replace(/\*(.*?)\*/g, '$1')       // Eliminar cursivas
    .replace(/^\s*[*+-]\s+/gm, '')     // Eliminar listas no ordenadas
    .replace(/^\s*\d+\.\s+/gm, '')     // Eliminar listas ordenadas
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Eliminar código
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Reemplazar enlaces con solo el texto
    .replace(/\n{2,}/g, '\n')          // Normalizar espacios en blanco
    .trim();                           // Eliminar espacios en blanco al inicio y final
} 