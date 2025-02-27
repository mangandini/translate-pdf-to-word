"use client"

import { useCallback, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import type { UploadedFile } from "../types";

interface FileUploadProps {
  onFileUpload?: (file: UploadedFile) => void;
}

export function FileUpload({ onFileUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'application/pdf':
        return <FileText className="h-8 w-8 text-purple-500" />;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return <FileText className="h-8 w-8 text-blue-500" />;
      default:
        return <FileText className="h-8 w-8 text-primary" />;
    }
  };

  const getFileTypeLabel = (fileType: string) => {
    switch (fileType) {
      case 'application/pdf':
        return 'PDF';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'Word';
      default:
        return 'Document';
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Please upload a file smaller than 8MB.",
      });
      return;
    }

    if (file.type !== "application/pdf" && 
        file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      toast.error("Invalid file type", {
        description: "Please upload a PDF or Word (.docx) file.",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Create a local URL for the file
      const fileUrl = URL.createObjectURL(file);
      
      const uploadedFile = {
        name: file.name,
        url: fileUrl,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      };

      setFile(file);
      if (onFileUpload) onFileUpload(uploadedFile);
      toast.success("File ready", {
        description: `Your ${getFileTypeLabel(file.type)} file has been loaded successfully.`,
      });
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "An error occurred while processing the file.",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onFileUpload]);

  const clearFile = () => {
    if (file) {
      setFile(null);
      if (onFileUpload) {
        onFileUpload(undefined as never);
      }
    }
  };

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    handleFileUpload(droppedFile);
  }, [handleFileUpload]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    handleFileUpload(selectedFile);
  }, [handleFileUpload]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Upload Document</h2>
      
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 ${
          isDragging 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : file 
              ? file.type === 'application/pdf'
                ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20"
                : "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-border hover:border-primary/50 hover:bg-secondary/50"
        } ${isProcessing ? "opacity-70 cursor-not-allowed" : ""}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={onFileSelect}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
        />
        
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-md ${
                file.type === 'application/pdf' 
                  ? 'bg-red-100 dark:bg-red-950/40' 
                  : 'bg-blue-100 dark:bg-blue-950/40'
              }`}>
                {getFileTypeIcon(file.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {getFileTypeLabel(file.type)} • {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            
            <button 
              onClick={clearFile}
              className="p-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
              aria-label="Remove file"
              tabIndex={0}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="file-upload"
            className={`flex flex-col items-center gap-4 ${
              isProcessing ? "cursor-not-allowed" : "cursor-pointer"
            }`}
            tabIndex={0}
            role="button"
            aria-label="Upload document"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                document.getElementById("file-upload")?.click();
              }
            }}
          >
            <div className="p-4 rounded-full bg-primary/10">
              <UploadCloud className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">
                {isProcessing ? "Processing..." : "Drop your PDF or Word file here or click to upload"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supported formats: PDF, Word (.docx) • Maximum size: 8MB
              </p>
            </div>
          </label>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm font-medium">Processing your {file ? getFileTypeLabel(file.type) : 'document'}...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 