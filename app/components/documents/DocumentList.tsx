import { Document } from '@prisma/client';
import { useState } from 'react';
import { DocumentStatus } from '@/types/document';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentListProps {
  documents: Document[];
  onRefresh?: () => Promise<void>;
}

interface DocumentDetailsProps {
  document: Document | null;
  onClose: () => void;
  isOpen: boolean;
  isLoading: boolean;
}

function DocumentDetails({ document, onClose, isOpen, isLoading }: DocumentDetailsProps) {
  if (!document) return null;

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950';
      case 'processing':
        return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950';
      case 'error':
        return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950';
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Document Details</DialogTitle>
          </div>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto py-6 px-1">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Filename</label>
                    <p className="font-medium truncate">{document.filename}</p>
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
                    <span className={cn(
                      'px-2.5 py-0.5 inline-flex text-sm font-medium rounded-full',
                      getStatusColor(document.status as DocumentStatus)
                    )}>
                      {document.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Languages</label>
                    <p className="font-medium">
                      {document.sourceLanguage} → {document.targetLanguage}
                    </p>
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">File Size</label>
                    <p className="font-medium">{Math.round(document.fileSize / 1024)} KB</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">Original Content</label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={document.originalMarkdown}
                    className="w-full h-48 p-4 border rounded-lg font-mono text-sm bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Original markdown content"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">Translated Content</label>
                <div className="relative">
                  <textarea
                    readOnly
                    value={document.translatedMarkdown}
                    className="w-full h-48 p-4 border rounded-lg font-mono text-sm bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Translated markdown content"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
                </div>
              </div>

              {document.customPrompt && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-muted-foreground">Custom Prompt</label>
                  <textarea
                    readOnly
                    value={document.customPrompt}
                    className="w-full h-24 p-4 border rounded-lg font-mono text-sm bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Custom prompt used for translation"
                  />
                </div>
              )}

              {document.errorMessage && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                  <label className="block text-sm font-medium text-destructive">Error Message</label>
                  <p className="text-destructive font-mono text-sm">{document.errorMessage}</p>
                </div>
              )}

              <div className="text-sm text-muted-foreground space-y-1">
                <p>Created: {new Date(document.createdAt).toLocaleString()}</p>
                <p>Last Updated: {new Date(document.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function DocumentList({ documents, onRefresh }: DocumentListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async (documentId: string) => {
    try {
      setDownloadingId(documentId);
      const response = await fetch(`/api/documents/${documentId}/download`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'translated-document.docx';

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Refresh the document list after successful download
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewDetails = async (documentId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch document details');
      }
      const document = await response.json();
      setSelectedDocument(document);
    } catch (error) {
      console.error('Error fetching document details:', error);
      alert('Failed to load document details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No documents found</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                File Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {documents.map((document) => (
              <tr key={document.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td 
                  onClick={() => handleViewDetails(document.id)}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {document.filename}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    ${document.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : ''}
                    ${document.status === 'processing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' : ''}
                    ${document.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' : ''}
                    ${document.status === 'pending' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : ''}
                  `}>
                    {document.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(document.createdAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleDownload(document.id)}
                      disabled={document.status !== 'completed' || downloadingId === document.id}
                      variant="default"
                      size="sm"
                      className="gap-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
                    >
                      {downloadingId === document.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Download
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleViewDetails(document.id)}
                      variant="default"
                      size="sm"
                      className="gap-1.5 bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-700 text-white"
                    >
                      View Details
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DocumentDetails
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
        isOpen={!!selectedDocument}
        isLoading={isLoading}
      />
    </>
  );
} 