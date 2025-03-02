import { Document } from '@prisma/client'
import { prisma } from './client'
import { PrismaClient, Prisma } from '@prisma/client'
import type { DocumentStatus } from '../../types/document'

export interface DocumentFilter {
  userId?: string;
  status?: string;
  fileType?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface DocumentListParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: DocumentFilter;
}

export interface CreateDocumentData {
  filename: string;
  fileType: string;
  originalMarkdown: string;
  translatedMarkdown: string;
  sourceLanguage: string;
  targetLanguage: string;
  preserveFormatting: boolean;
  customPrompt?: string;
  userId: string;
}

export class DocumentService {
  async createDocument(data: {
    filename: string;
    fileType: string;
    originalMarkdown: string;
    translatedMarkdown: string;
    sourceLanguage: string;
    targetLanguage: string;
    preserveFormatting: boolean;
    customPrompt?: string;
    userId: string;
    status?: DocumentStatus;
  }): Promise<Document> {
    return prisma.document.create({
      data: {
        ...data,
        status: data.status || 'processing',
        fileSize: Buffer.byteLength(data.originalMarkdown, 'utf8')
      }
    });
  }

  async getDocument(id: string): Promise<Document | null> {
    return prisma.document.findUnique({
      where: { id }
    });
  }

  async getDocuments(params: {
    where?: Prisma.DocumentWhereInput;
    orderBy?: Prisma.DocumentOrderByWithRelationInput;
    select?: Prisma.DocumentSelect;
  }): Promise<Partial<Document>[]> {
    return prisma.document.findMany(params);
  }

  async updateDocument(id: string, data: Partial<Document>): Promise<Document> {
    return prisma.document.update({
      where: { id },
      data
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await prisma.document.delete({
      where: { id }
    });
  }

  async listDocuments(params: DocumentListParams): Promise<{ documents: Document[]; total: number }> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', filter } = params;
    const skip = (page - 1) * limit;

    // Construir el where basado en los filtros
    const where: any = {};
    if (filter) {
      if (filter.userId) where.userId = filter.userId;
      if (filter.status) where.status = filter.status;
      if (filter.fileType) where.fileType = filter.fileType;
      if (filter.sourceLanguage) where.sourceLanguage = filter.sourceLanguage;
      if (filter.targetLanguage) where.targetLanguage = filter.targetLanguage;
      if (filter.fromDate || filter.toDate) {
        where.createdAt = {};
        if (filter.fromDate) where.createdAt.gte = filter.fromDate;
        if (filter.toDate) where.createdAt.lte = filter.toDate;
      }
    }

    // Ejecutar las queries en paralelo
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.document.count({ where })
    ]);

    return {
      documents,
      total
    };
  }

  async updateDocumentStatus(id: string, status: string, errorMessage?: string): Promise<Document> {
    return prisma.document.update({
      where: { id },
      data: {
        status,
        errorMessage,
        updatedAt: new Date()
      }
    });
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    return prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }
}

// Exportar una instancia singleton del servicio
export const documentService = new DocumentService(); 