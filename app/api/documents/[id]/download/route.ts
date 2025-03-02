import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '../../../../lib/db/document.service';
import { generateWordDocument } from '../../../../lib/docx-generator';
import { SUPPORTED_LANGUAGES } from '../../../../lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const document = await documentService.getDocument(params.id);
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    if (document.status !== 'completed') {
      return NextResponse.json(
        { error: 'Document is not ready for download' },
        { status: 400 }
      );
    }

    // Get target language display name
    const targetLanguageInfo = SUPPORTED_LANGUAGES.find(
      lang => lang.code === document.targetLanguage
    );
    const targetLanguageName = targetLanguageInfo ? targetLanguageInfo.name : document.targetLanguage;

    // Generate Word document
    const buffer = await generateWordDocument(document.translatedMarkdown);

    // Create filename with target language
    const filenameWithoutExt = document.filename.replace(/\.[^/.]+$/, '');
    const newFilename = `${filenameWithoutExt} - ${targetLanguageName}.docx`;

    // Set response headers
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    headers.set('Content-Disposition', `attachment; filename="${newFilename}"`);

    return new NextResponse(buffer, {
      status: 200,
      headers
    });
  } catch (error) {
    console.error('Error downloading document:', error);
    return NextResponse.json(
      { error: 'Failed to download document' },
      { status: 500 }
    );
  }
} 