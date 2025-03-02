import { NextRequest, NextResponse } from 'next/server';
import { translationService } from '../../lib/services/translation.service';

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
  (global as unknown as { File: typeof File }).File = ServerFile as unknown as typeof File;
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

    // Get translation options
    const sourceLanguage = formData.get('sourceLanguage') as string;
    const targetLanguage = formData.get('targetLanguage') as string;
    const preserveFormatting = formData.get('preserveFormatting') === 'true';
    const customPrompt = formData.get('customPrompt') as string;
    const downloadDirectly = formData.get('downloadDirectly') === 'true';

    // Validate required fields
    if (!sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: 'Source and target languages are required' },
        { status: 400 }
      );
    }

    // Process translation with database integration
    const result = await translationService.processDocument(
      fileData as File,
      {
        sourceLanguage,
        targetLanguage,
        preserveFormatting,
        customPrompt,
        userId: 'anonymous', // TODO: Replace with actual user ID when auth is implemented
        downloadDirectly
      }
    );

    // Handle direct download response
    if (downloadDirectly && result.headers) {
      return new NextResponse(result.document as Buffer, {
        status: 200,
        headers: result.headers
      });
    }

    // Return JSON response
    return NextResponse.json({
      documentId: result.documentId,
      document: result.document,
      filename: result.filename,
      content: result.content
    });
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