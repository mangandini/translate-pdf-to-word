'use client';

import { useState, useEffect, useCallback } from 'react';
import { DocumentList } from '../components/documents/DocumentList';
import { DocumentFilters } from '../components/documents/DocumentFilters';
import { Document } from '@prisma/client';

interface FilterState {
  search: string;
  dateFrom: string;
  dateTo: string;
  status: string;
}

const initialFilters: FilterState = {
  search: '',
  dateFrom: '',
  dateTo: '',
  status: 'all'
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const applyFilters = useCallback(() => {
    let filtered = [...documents];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(doc => 
        (doc.filename?.toLowerCase() || '').includes(searchLower) ||
        (doc.originalMarkdown?.toLowerCase() || '').includes(searchLower) ||
        (doc.translatedMarkdown?.toLowerCase() || '').includes(searchLower)
      );
    }

    // Apply date filters
    if (filters.dateFrom) {
      filtered = filtered.filter(doc => 
        doc.createdAt && new Date(doc.createdAt) >= new Date(filters.dateFrom)
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(doc => 
        doc.createdAt && new Date(doc.createdAt) <= new Date(filters.dateTo)
      );
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(doc => doc.status === filters.status);
    }

    setFilteredDocuments(filtered);
  }, [documents, filters]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [documents, filters, applyFilters]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      setDocuments(data);
      setFilteredDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="flex flex-col space-y-2">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Processed Documents
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and view your processed document translations
            </p>
          </div>

          {/* Main Content Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700/50 transition-colors duration-200">
            <div className="p-6">
              {/* Filters Section */}
              <div className="mb-8">
                <DocumentFilters 
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onReset={handleResetFilters}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div 
                  className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4" 
                  role="alert"
                >
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-600 dark:text-red-200">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoading ? (
                <div className="flex justify-center items-center h-48">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full border-t-2 border-b-2 border-gray-900 dark:border-white animate-spin"></div>
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <DocumentList 
                    documents={filteredDocuments} 
                    onRefresh={fetchDocuments}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 