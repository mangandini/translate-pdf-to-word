import { DocumentListParams, DocumentFilter } from './document.service'
import { DocumentSortOptions, DocumentFilterOptions } from '../../types/document'

export function buildPaginationParams(
  page: number = 1,
  limit: number = 10,
  sort?: DocumentSortOptions
): Pick<DocumentListParams, 'page' | 'limit' | 'sortBy' | 'sortOrder'> {
  return {
    page,
    limit,
    sortBy: sort?.field ?? 'createdAt',
    sortOrder: sort?.direction ?? 'desc'
  }
}

export function buildFilterParams(filters?: DocumentFilterOptions): DocumentFilter {
  if (!filters) return {}

  const filter: DocumentFilter = {}

  if (filters.userId) filter.userId = filters.userId
  if (filters.status) filter.status = filters.status
  if (filters.fileType) filter.fileType = filters.fileType
  if (filters.sourceLanguage) filter.sourceLanguage = filters.sourceLanguage
  if (filters.targetLanguage) filter.targetLanguage = filters.targetLanguage
  if (filters.dateRange) {
    filter.fromDate = filters.dateRange.from
    filter.toDate = filters.dateRange.to
  }

  return filter
}

export function calculatePagination(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit)
  
  return {
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  }
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
} 