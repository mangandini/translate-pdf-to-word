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

export type TranslationStatus = 'idle' | 'uploading' | 'processing' | 'translating' | 'downloading' | 'completed' | 'error';

export type UploadedFile = {
  name: string;
  url: string;
  size: number;
  type: string;
  lastModified: number;
}; 