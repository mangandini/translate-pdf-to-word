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

  const handleFileUpload = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Please upload a file smaller than 8MB.",
      });
      return;
    }

    if (file.type !== "application/pdf") {
      toast.error("Invalid file type", {
        description: "Please upload a PDF file.",
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
      onFileUpload?.(uploadedFile);
      toast.success("File ready", {
        description: "Your PDF has been loaded successfully.",
      });
    } catch (error) {
      toast.error("Upload failed", {
        description: error instanceof Error ? error.message : "An error occurred while processing the file.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFile = () => {
    if (file) {
      setFile(null);
      onFileUpload?.(null as any);
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
  }, []);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    handleFileUpload(selectedFile);
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Upload PDF</h2>
      
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 ${
          isDragging 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : file 
              ? "border-green-500 bg-green-50 dark:bg-green-950/20" 
              : "border-border hover:border-primary/50 hover:bg-secondary/50"
        } ${isProcessing ? "opacity-70 cursor-not-allowed" : ""}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          type="file"
          accept=".pdf"
          onChange={onFileSelect}
          className="hidden"
          id="file-upload"
          disabled={isProcessing}
        />
        
        {file ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
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
            aria-label="Upload PDF file"
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
                {isProcessing ? "Processing..." : "Drop your PDF here or click to upload"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Maximum file size: 8MB
              </p>
            </div>
          </label>
        )}
      </div>
    </div>
  );
} 