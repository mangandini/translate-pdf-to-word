import OpenAI from 'openai';
import type { PDFContent } from './pdf-parser';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI API configuration
const API_CONFIG = {
  model: 'gpt-4o-mini', //NEVER change this gpt model
  temperature: 0.3,
  max_tokens: 4000,
} as const;

export interface TranslationResult {
  document: string; // base64 encoded document
  filename?: string;
  content: string; // Markdown content
}

interface TranslateContentParams {
  content: PDFContent;
  sourceLanguage: string;
  targetLanguage: string;
  preserveFormatting: boolean;
  customPrompt?: string;
}

const DEFAULT_SYSTEM_INSTRUCTIONS = `You are a professional translator specialized in document translation with format preservation.
Your task is to translate documents from {sourceLanguage} to {targetLanguage}.

Translation guidelines:
- Provide a faithful translation that maintains the tone and style of the original text.
- Adapt the text to the Chilean cultural context when necessary.
- Translate or interpret English words that wouldn't be understood in Spanish, according to context (like OB = obstetrician, OB/GYN = obstetrician/gynecologist, etc).
- Maintain all punctuation marks, including question marks (¿?), exclamation marks (¡!), quotation marks, parentheses, and any other symbols in the original text.
- Any text matching the structure of a biblical reference (e.g., "John 3:16" or "Mateo 5:3") should NOT be translated. Instead, detect the Bible version provided in the original text and replace the verse with the exact text a spanish Bible version.
`;

const DEFAULT_FORMATTING_INSTRUCTIONS = `IMPORTANT: This document uses Markdown formatting. You MUST preserve all Markdown syntax in your translation:
- Keep all '#' for headings of any level
- Preserve '**text**' for bold
- Maintain '*text*' for italic
- Keep all list markers ('- ' or '1. ')
- Preserve line breaks and paragraph structure
- Maintain any other Markdown formatting markers
- Fix broken sentences if there are strange characters or line breaks`;

const TRANSLATION_EXAMPLES = [
  {
    original: "Please join us for the **church dinner** this Sunday.",
    translated: "Por favor, acompáñenos en la **cena de la iglesia** este domingo."
  },
  {
    original: "We all put time and effort into selecting the outfits we wear",
    translated: "Todos ponemos tiempo y esfuerzo en seleccionar las ropas que usamos"
  }
];

/**
 * Generates messages for the chat completions API
 */
function generateMessages(params: {
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
  preserveFormatting: boolean;
  customPrompt?: string;
}): ChatCompletionMessageParam[] {
  const { content, sourceLanguage, targetLanguage, preserveFormatting, customPrompt } = params;

  // Replace placeholders in the system instructions
  const systemInstructions = DEFAULT_SYSTEM_INSTRUCTIONS
    .replace('{sourceLanguage}', sourceLanguage)
    .replace('{targetLanguage}', targetLanguage);

  // Add formatting instructions if needed
  const formattingInstructions = preserveFormatting ? DEFAULT_FORMATTING_INSTRUCTIONS : '';

  // Process custom prompt if provided
  const customInstructions = customPrompt ? `
Additional Translation Instructions:
${customPrompt.replace('{targetLanguage}', targetLanguage)}

Preserve all Markdown formatting in your translation.` : '';

  // Combine all instructions for the system role
  const systemMessage = `${systemInstructions}

${formattingInstructions}
${customInstructions}

Respond ONLY with the translated text, maintaining all formatting markers.`;

  // Create the messages array
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemMessage
    },
    {
      role: "user",
      content: `Please translate the following document:\n\n${content}`
    }
  ];

  // Add examples if preserving formatting
  if (preserveFormatting) {
    // Insert examples between system and user messages
    messages.splice(1, 0, {
      role: "assistant",
      content: `I understand. I'll translate the document from ${sourceLanguage} to ${targetLanguage} while preserving all formatting and following your guidelines. Here are examples of how I'll handle different elements:

Original: "${TRANSLATION_EXAMPLES[0].original}"
Translation: "${TRANSLATION_EXAMPLES[0].translated}"

Original: "${TRANSLATION_EXAMPLES[1].original}"
Translation: "${TRANSLATION_EXAMPLES[1].translated}"`
    });
  }

  return messages;
}

/**
 * Main translation function that handles Markdown content
 */
export async function translateContent({
  content,
  sourceLanguage,
  targetLanguage,
  preserveFormatting,
  customPrompt = '',
}: TranslateContentParams): Promise<TranslationResult> {
  try {
    console.log('Starting translation with Markdown...');
    
    const messages = generateMessages({
      content: content.markdown,
      sourceLanguage,
      targetLanguage,
      preserveFormatting,
      customPrompt
    });
    
    const completion = await openai.chat.completions.create({
      ...API_CONFIG,
      messages: messages
    });

    const translatedMarkdown = completion.choices[0]?.message?.content || '';
    
    console.log('Translation completed, generating document...');
    
    return {
      document: '', // This will be filled by the docx generator
      content: translatedMarkdown
    };
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Translation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
} 