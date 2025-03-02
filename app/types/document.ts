import { Document } from '@prisma/client'

export type DocumentStatus = 'processing' | 'completed' | 'error'
export type FileType = 'pdf' | 'docx'

export interface DocumentMetadata {
  id: string
  filename: string
  fileType: FileType
  fileSize: number
  createdAt: Date
  updatedAt: Date
  sourceLanguage: string
  targetLanguage: string
  preserveFormatting: boolean
  status: DocumentStatus
  errorMessage?: string
}

export type DocumentWithContent = Document & {
  originalMarkdown: string
  translatedMarkdown: string
  customPrompt?: string
}

export interface DocumentListResponse {
  documents: DocumentMetadata[]
  total: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface DocumentSortOptions {
  field: keyof DocumentMetadata
  direction: 'asc' | 'desc'
}

export interface DocumentFilterOptions {
  userId?: string
  status?: DocumentStatus
  fileType?: FileType
  sourceLanguage?: string
  targetLanguage?: string
  dateRange?: {
    from: Date
    to: Date
  }
}

export interface DocumentFilter {
  status?: DocumentStatus
  sourceLanguage?: string
  targetLanguage?: string
  sortBy?: 'date' | 'name' | 'status'
  sortOrder?: 'asc' | 'desc'
} 