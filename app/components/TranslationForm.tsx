"use client"

import { useState } from "react"
import { SUPPORTED_LANGUAGES } from "../lib/constants"
import type { TranslationFormData, UploadedFile } from "../types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { ArrowRight, Languages, Settings2 } from "lucide-react"

const DEFAULT_PROMPT = `IMPORTANT: DO NOT TRANSLATE any biblical verses, instead, detect the Bible version provided in the original text and replace the verse with an exact Spanish bible version as follows:

- English Standard Version (ESV) > Biblia de las Américas (LBLA)
- New International Version (NIV) > Nueva Versión Internacional (NVI)
- New American Standard Bible (NASB) > Nueva Biblia de las Américas (NBLA)
- New King James Version (NKJV) > Reina-Valera Actualizada (RVA-2015)
- Amplified Bible (AMP) > Biblia del Jubileo (JBS)
- The Message (MSG) > Traducción en lenguaje actual (TLA)

- If the biblical verse is from an English Bible version not listed above, please use the most similar Spanish Bible version available. Ensure that only the non-biblical portions of the text are translated, and that the structure and formatting of the original document are maintained.
`;

interface TranslationFormProps {
  uploadedFile: UploadedFile | null;
  onSubmit: (data: TranslationFormData) => void;
  isProcessing: boolean;
}

export function TranslationForm({ uploadedFile, onSubmit, isProcessing }: TranslationFormProps) {
  const [formData, setFormData] = useState<TranslationFormData>({
    sourceLanguage: "en",
    targetLanguage: "",
    preserveFormatting: true,
    customPrompt: DEFAULT_PROMPT,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Translation Settings</h2>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="sourceLanguage">Source Language</Label>
              </div>
              <Select
                value={formData.sourceLanguage}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, sourceLanguage: value }))
                }
                disabled={isProcessing}
              >
                <SelectTrigger id="sourceLanguage" className="w-full">
                  <SelectValue placeholder="Select source language" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name} ({lang.nativeName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="targetLanguage">Target Language</Label>
              </div>
              <Select
                value={formData.targetLanguage}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, targetLanguage: value }))
                }
                disabled={isProcessing}
              >
                <SelectTrigger id="targetLanguage" className="w-full">
                  <SelectValue placeholder="Select target language" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.filter(
                    (lang) => lang.code !== formData.sourceLanguage
                  ).map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name} ({lang.nativeName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="preserveFormatting"
            checked={formData.preserveFormatting}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, preserveFormatting: checked }))
            }
            disabled={isProcessing}
          />
          <Label htmlFor="preserveFormatting">Preserve document formatting</Label>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={showAdvanced}
          >
            <Settings2 className="h-4 w-4" />
            {showAdvanced ? "Hide advanced settings" : "Show advanced settings"}
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-2 p-4 border rounded-lg bg-secondary/30">
              <Label htmlFor="customPrompt">Translation Instructions</Label>
              <Textarea
                id="customPrompt"
                value={formData.customPrompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev) => ({ ...prev, customPrompt: e.target.value }))
                }
                placeholder="Enter custom translation instructions..."
                className="min-h-[200px] font-mono text-sm"
                disabled={isProcessing}
              />
              <p className="text-sm text-muted-foreground">
                Use {"{targetLanguage}"} in your prompt to automatically insert the selected target language.
              </p>
              <div className="mt-2 p-3 bg-muted/50 rounded border border-muted text-sm">
                <p className="font-medium mb-1">Note about translation instructions:</p>
                <p className="text-muted-foreground">
                  The system already handles basic translation requirements like preserving formatting and biblical verse references. 
                  Use this field for additional context or specific requirements for your document.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        type="submit"
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-primary rounded-md transition-all
          ${
            !uploadedFile || !formData.targetLanguage || isProcessing
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-primary/90 hover:scale-[1.01]"
          }`}
        disabled={!uploadedFile || !formData.targetLanguage || isProcessing}
      >
        {isProcessing ? (
          <>
            <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            <span className=" text-white dark:text-black">Processing...</span>
          </>
        ) : (
          <>
            <span className=" text-white dark:text-black">Translate Document</span>
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
} 