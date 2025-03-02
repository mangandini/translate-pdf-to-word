import { useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../../lib/constants';

interface DocumentFiltersProps {
  onFilterChange?: (filters: DocumentFilters) => void;
}

interface DocumentFilters {
  status?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  sortBy?: 'date' | 'name' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export function DocumentFilters({ onFilterChange }: DocumentFiltersProps) {
  const [filters, setFilters] = useState<DocumentFilters>({
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const handleFilterChange = (key: keyof DocumentFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="flex-1 min-w-[200px]">
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          id="status"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          value={filters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="processing">Processing</option>
          <option value="error">Error</option>
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label htmlFor="sourceLanguage" className="block text-sm font-medium text-gray-700 mb-1">
          Source Language
        </label>
        <select
          id="sourceLanguage"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          value={filters.sourceLanguage || ''}
          onChange={(e) => handleFilterChange('sourceLanguage', e.target.value)}
          aria-label="Filter by source language"
        >
          <option value="">All Languages</option>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label htmlFor="targetLanguage" className="block text-sm font-medium text-gray-700 mb-1">
          Target Language
        </label>
        <select
          id="targetLanguage"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          value={filters.targetLanguage || ''}
          onChange={(e) => handleFilterChange('targetLanguage', e.target.value)}
          aria-label="Filter by target language"
        >
          <option value="">All Languages</option>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
          Sort By
        </label>
        <select
          id="sortBy"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          aria-label="Sort documents by"
        >
          <option value="date">Date</option>
          <option value="name">Name</option>
          <option value="status">Status</option>
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
          Sort Order
        </label>
        <select
          id="sortOrder"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          value={filters.sortOrder}
          onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
          aria-label="Sort order"
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>
    </div>
  );
} 