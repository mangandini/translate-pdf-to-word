"use client"

import { useState, useEffect } from "react"
import { FileUpload } from "./components/FileUpload"
import { TranslationForm } from "./components/TranslationForm"
import type { TranslationFormData, TranslationStatus, UploadedFile } from "./types"
import type { TranslationResult } from "./lib/openai"
import { CheckCircle, Download, Loader2 } from "lucide-react"

export default function Home() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [status, setStatus] = useState<TranslationStatus>("idle")
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleFileUpload = (file: UploadedFile) => {
    setUploadedFile(file)
    setStatus("idle")
    setTranslationResult(null)
  }

  const handleTranslationSubmit = async (data: TranslationFormData) => {
    if (!uploadedFile) return

    try {
      setStatus("processing")

      const formData = new FormData()
      // Convert base64 URL to File object
      const response = await fetch(uploadedFile.url)
      const blob = await response.blob()
      const file = new File([blob], uploadedFile.name, { type: uploadedFile.type })
      
      formData.append('file', file)
      formData.append('sourceLanguage', data.sourceLanguage)
      formData.append('targetLanguage', data.targetLanguage)
      formData.append('preserveFormatting', data.preserveFormatting.toString())
      formData.append('customPrompt', data.customPrompt)

      const result = await fetch('/api/translate', {
        method: 'POST',
        body: formData,
      })

      if (!result.ok) {
        throw new Error('Translation failed')
      }

      const json = await result.json()
      if (json.error) {
        throw new Error(json.error)
      }

      setTranslationResult(json)
      setStatus("completed")
    } catch (error) {
      console.error("Translation error:", error)
      setStatus("error")
    }
  }

  useEffect(() => {
    const downloadDocument = async () => {
      if (!translationResult || status !== "downloading") return;

      try {
        // Convert base64 to blob
        const byteCharacters = atob(translationResult.document)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        
        // Ensure correct MIME type for Word documents
        const blob = new Blob([byteArray], { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        })

        // Create download link with proper filename
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        
        // Use the filename provided by the API
        const filename = translationResult.filename || 'translated-document.docx'
        
        a.download = filename
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        
        // Clean up
        setTimeout(() => {
          URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }, 100)

        setStatus("completed")
      } catch (error) {
        console.error("Download error:", error)
        setStatus("error")
      }
    }

    downloadDocument()
  }, [translationResult, status])

  const handleDownload = () => {
    if (!translationResult) return
    setStatus("downloading")
  }

  return (
    <div className="container max-w-6xl py-8">
      {isClient && (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-8">
            <FileUpload onFileUpload={handleFileUpload} />
            
            {uploadedFile && (
              <TranslationForm
                uploadedFile={uploadedFile}
                onSubmit={handleTranslationSubmit}
                isProcessing={status === "processing"}
              />
            )}
          </div>

          <div className="lg:border-l lg:pl-8">
            {status === "processing" ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
                <h2 className="text-xl font-semibold mb-2">Translating Document</h2>
                <p className="text-muted-foreground">
                  This may take a few moments depending on the document size...
                </p>
              </div>
            ) : translationResult ? (
              <div className="space-y-6 p-6 border rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Translation Complete</h2>
                    <p className="text-sm text-muted-foreground">
                      Your document has been successfully translated
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleDownload}
                  disabled={status === "downloading"}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white dark:text-black bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {status === "downloading" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download as Word
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <p>Upload a PDF or Word file and configure translation settings to get started</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 