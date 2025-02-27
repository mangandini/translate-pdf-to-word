import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import type { TranslationResult } from './openai';
import { md } from './markdown-utils';

export async function generateWordDocument(
  translation: TranslationResult,
  title: string
): Promise<Blob> {
  // Parse markdown content to get document structure
  const tokens = md.parse(translation.content, {});
  const children: Paragraph[] = [
    // Title
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: {
        after: 400,
      },
    })
  ];

  // Process markdown tokens to create paragraphs
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'heading_open') {
      const level = parseInt(token.tag.slice(1));
      const content = tokens[i + 1].content;
      children.push(
        new Paragraph({
          text: content,
          heading: level === 1 ? HeadingLevel.HEADING_1 :
                  level === 2 ? HeadingLevel.HEADING_2 :
                  level === 3 ? HeadingLevel.HEADING_3 :
                  HeadingLevel.HEADING_4,
          spacing: {
            before: 400,
            after: 200,
          },
        })
      );
      i += 2; // Skip content and closing tag
    } else if (token.type === 'paragraph_open') {
      const content = tokens[i + 1].content;
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: content,
            }),
          ],
          spacing: {
            before: 200,
            after: 200,
          },
        })
      );
      i += 2; // Skip content and closing tag
    }
  }

  const doc = new Document({
    title,
    sections: [{
      properties: {},
      children,
    }],
  });

  return Packer.toBlob(doc);
} 