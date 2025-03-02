import { parsePDF } from '../pdf-parser';
import { parseWord } from '../word-parser';
import { translateContent } from '../openai';
import { generateWordDocument } from '../docx-generator';
import { documentService } from '../db/document.service';
import { SUPPORTED_LANGUAGES } from '../constants';
import type { Document } from '@prisma/client';
import type { DocumentStatus } from '../../types/document';

export interface TranslationOptions {
  sourceLanguage: string;
  targetLanguage: string;
  preserveFormatting: boolean;
  customPrompt?: string;
  userId: string;
  downloadDirectly?: boolean;
}

export interface TranslationServiceResult {
  documentId: string;
  document: string | Buffer; // base64 encoded document or Buffer for direct download
  filename: string;
  content: string;
  headers?: Headers; // For direct download
}

export class TranslationService {
  async processDocument(
    file: File,
    options: TranslationOptions
  ): Promise<TranslationServiceResult> {
    try {
      // Get target language display name
      const targetLanguageInfo = SUPPORTED_LANGUAGES.find(lang => lang.code === options.targetLanguage);
      const targetLanguageName = targetLanguageInfo ? targetLanguageInfo.name : options.targetLanguage;

      // 1. Create initial document record
      const document = await documentService.createDocument({
        filename: file.name,
        fileType: file.type.includes('pdf') ? 'pdf' : 'docx',
        originalMarkdown: '', // Will be updated after parsing
        translatedMarkdown: '',
        sourceLanguage: options.sourceLanguage,
        targetLanguage: options.targetLanguage,
        preserveFormatting: options.preserveFormatting,
        customPrompt: options.customPrompt,
        userId: options.userId,
      });

      // 2. Parse document to markdown
      let documentContent;
      try {
        console.log(`Processing ${file.type} file...`);
        if (file.type === 'application/pdf') {
          console.log('Parsing PDF...');
          documentContent = await parsePDF(file);
        } else {
          console.log('Parsing Word document...');
          documentContent = await parseWord(file);
        }
        console.log('Document parsed successfully');

        // Update document with original markdown
        await documentService.updateDocument(document.id, {
          originalMarkdown: documentContent.markdown,
          status: 'processing'
        });
      } catch (error) {
        console.error('Error parsing document:', error);
        await this.handleError(document.id, 'Failed to parse document');
        throw error;
      }

      // 3. Translate content
      let translationResult;
      try {
        console.log('Starting translation...');
        translationResult = await translateContent({
          content: documentContent,
          sourceLanguage: options.sourceLanguage,
          targetLanguage: options.targetLanguage,
          preserveFormatting: options.preserveFormatting,
          customPrompt: options.customPrompt
        });
        console.log('Translation completed');

        // Update document with translated markdown
        await documentService.updateDocument(document.id, {
          translatedMarkdown: translationResult.content,
          status: 'processing'
        });
      } catch (error) {
        console.error('Translation error:', error);
        await this.handleError(document.id, 'Translation failed');
        throw error;
      }

      // 4. Generate Word document
      try {
        console.log('Generating Word document...');
        const buffer = await generateWordDocument(translationResult.content);
        
        // Create filename with target language
        const filenameWithoutExt = document.filename.replace(/\.[^/.]+$/, '');
        const newFilename = `${filenameWithoutExt} - ${targetLanguageName}.docx`;

        // Update document status to completed
        await documentService.updateDocument(document.id, {
          status: 'completed'
        });

        // Handle direct download if requested
        if (options.downloadDirectly) {
          const headers = new Headers();
          headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          headers.set('Content-Disposition', `attachment; filename="${newFilename}"`);

          return {
            documentId: document.id,
            document: buffer,
            filename: newFilename,
            content: translationResult.content,
            headers
          };
        }

        // Return as base64 for regular response
        const base64Doc = buffer.toString('base64');
        console.log('Word document generated successfully');

        return {
          documentId: document.id,
          document: base64Doc,
          filename: newFilename,
          content: translationResult.content
        };
      } catch (error) {
        console.error('Error generating Word document:', error);
        await this.handleError(document.id, 'Failed to generate Word document');
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  private async handleError(documentId: string, message: string): Promise<void> {
    await documentService.updateDocumentStatus(documentId, 'error', message);
  }

  async getDocumentStatus(documentId: string): Promise<DocumentStatus> {
    const document = await documentService.getDocument(documentId);
    return document?.status as DocumentStatus;
  }
}

// Export singleton instance
export const translationService = new TranslationService(); 