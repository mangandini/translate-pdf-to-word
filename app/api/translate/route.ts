import { NextRequest, NextResponse } from 'next/server';
import { parsePDF } from '../../lib/pdf-parser';
import { parseWord } from '../../lib/word-parser';
import { translateContent } from '../../lib/openai';
import { generateWordDocument } from '../../lib/docx-generator';
import { SUPPORTED_LANGUAGES } from '../../lib/constants';

// Polyfill for File API in Node.js environment
// Note: This is a simplified implementation for server-side use
class ServerFile {
  name: string;
  lastModified: number;
  size: number;
  type: string;
  webkitRelativePath: string = '';
  private blob: Blob;

  constructor(
    bits: BlobPart[],
    name: string,
    options?: FilePropertyBag
  ) {
    this.name = name;
    this.lastModified = options?.lastModified || Date.now();
    this.blob = new Blob(bits as Buffer[], { type: options?.type });
    this.size = this.blob.size;
    this.type = options?.type || '';
  }

  slice(start?: number, end?: number, contentType?: string): Blob {
    return this.blob.slice(start, end, contentType);
  }

  stream(): ReadableStream<Uint8Array> {
    return this.blob.stream() as ReadableStream<Uint8Array>;
  }

  text(): Promise<string> {
    return this.blob.text();
  }

  arrayBuffer(): Promise<ArrayBuffer> {
    return this.blob.arrayBuffer();
  }
}

// Make File available in the global scope if needed
if (typeof File === 'undefined') {
  (global as any).File = ServerFile;
}

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Get form data
    const formData = await request.formData();
    
    // Get and validate file
    const fileData = formData.get('file');
    if (!fileData || !(fileData instanceof Blob)) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(fileData.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${fileData.type}. Only PDF and Word (.docx) files are supported.` },
        { status: 400 }
      );
    }

    // Get original filename
    const originalFilename = (fileData as File).name || 'document';
    
    // Remove file extension if present
    const filenameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '');

    // Get other form data
    const sourceLanguage = formData.get('sourceLanguage') as string;
    const targetLanguage = formData.get('targetLanguage') as string;
    const preserveFormatting = formData.get('preserveFormatting') === 'true';
    const customPrompt = formData.get('customPrompt') as string;

    // Validate required fields
    if (!sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Source and target languages are required' },
        { status: 400 }
      );
    }

    // Get target language display name
    const targetLanguageInfo = SUPPORTED_LANGUAGES.find(lang => lang.code === targetLanguage);
    const targetLanguageName = targetLanguageInfo ? targetLanguageInfo.name : targetLanguage;

    // Create new filename with target language
    const newFilename = `${filenameWithoutExt} - ${targetLanguageName}.docx`;

    // Parse document to Markdown based on file type
    console.log(`Processing ${fileData.type} file...`);
    let documentContent;
    try {
      if (fileData.type === 'application/pdf') {
        console.log('Parsing PDF...');
        documentContent = await parsePDF(fileData);
      } else {
        console.log('Parsing Word document...');
        documentContent = await parseWord(fileData);
      }
      console.log('Document parsed successfully');
    } catch (error) {
      console.error('Error parsing document:', error);
      return NextResponse.json(
        { 
          error: 'Failed to parse document',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 400 }
      );
    }

    // Translate content
    console.log('Starting translation...');
    let translationResult;
    try {
      translationResult = await translateContent({
        content: documentContent,
        sourceLanguage,
        targetLanguage,
        preserveFormatting,
        customPrompt
      });
      console.log('Translation completed');
    } catch (error) {
      console.error('Translation error:', error);
      return NextResponse.json(
        { 
          error: 'Translation failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Generate Word document
    console.log('Generating Word document...');
    try {
      const buffer = await generateWordDocument(translationResult.content);
      
      // Check if direct download is requested
      const downloadDirectly = formData.get('downloadDirectly') === 'true';
      
      if (downloadDirectly) {
        // Return the document as a downloadable file
        const headers = new Headers();
        headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        headers.set('Content-Disposition', `attachment; filename="${newFilename}"`);
        
        return new NextResponse(buffer, {
          status: 200,
          headers
        });
      } else {
        // Return as base64 in JSON response
        const base64Doc = buffer.toString('base64');
        console.log('Word document generated successfully');

        return NextResponse.json({
          ...translationResult,
          document: base64Doc,
          filename: newFilename
        });
      }
    } catch (error) {
      console.error('Error generating Word document:', error);
      return NextResponse.json(
        { 
          error: 'Failed to generate Word document',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 