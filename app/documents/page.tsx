'use client';

import { useState, useEffect } from 'react';
import { DocumentList } from '../components/documents/DocumentList';
import { DocumentFilters } from '../components/documents/DocumentFilters';
import { Document } from '@prisma/client';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Processed Documents</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6">
        <DocumentFilters />
        
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4" role="alert">
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <DocumentList documents={documents} onRefresh={fetchDocuments} />
        )}
      </div>
    </main>
  );
} 