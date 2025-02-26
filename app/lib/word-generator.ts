import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import type { TranslationResult } from './openai';

export async function generateWordDocument(
  translation: TranslationResult,
  title: string
): Promise<Blob> {
  const doc = new Document({
    title,
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          text: title,
          heading: HeadingLevel.TITLE,
          spacing: {
            after: 400,
          },
        }),

        // Headers
        ...translation.structure.headers.map(
          header => new Paragraph({
            text: header,
            heading: HeadingLevel.HEADING_1,
            spacing: {
              before: 400,
              after: 200,
            },
          })
        ),

        // Paragraphs
        ...translation.structure.paragraphs.map(
          paragraph => new Paragraph({
            children: [
              new TextRun({
                text: paragraph,
                size: 24, // 12pt
              }),
            ],
            spacing: {
              before: 200,
              after: 200,
            },
          })
        ),

        // Lists
        ...translation.structure.lists.flatMap(list => {
          return list.map(
            item => new Paragraph({
              text: item,
              bullet: {
                level: 0,
              },
              spacing: {
                before: 100,
                after: 100,
              },
            })
          );
        }),
      ],
    }],
  });

  // Generate blob
  const buffer = await Packer.toBlob(doc);
  return buffer;
} 