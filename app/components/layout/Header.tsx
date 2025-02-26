import { FileText } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"

export function Header() {
  return (
    <header className="border-b py-4">
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">PDF to Word Translator</h1>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
} 