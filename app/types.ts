export type Language = {
  code: string;
  name: string;
  nativeName: string;
};

export type TranslationFormData = {
  sourceLanguage: string;
  targetLanguage: string;
  preserveFormatting: boolean;
  customPrompt: string;
};

export type TranslationStatus = 
  | "idle"
  | "processing"
  | "downloading"
  | "completed"
  | "error";

export type UploadedFile = {
  name: string;
  url: string;
  size: number;
  type: string;
  lastModified: number;
};

export interface TranslationResult {
  document: string; // base64 encoded document
  filename: string;
  content: {
    text: string;
    format?: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      header?: number;
      list?: 'bullet' | 'ordered';
    };
  }[];
} 