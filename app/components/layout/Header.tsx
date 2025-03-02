"use client"

import { FileText } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function Header() {
  const pathname = usePathname()

  return (
    <header className="border-b">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">PDF / Word Translator</span>
          </Link>
          
          <nav className="flex items-center gap-4">
            <Button
              variant="link"
              asChild
              className={cn(
                "px-0",
                pathname === "/" ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <Link href="/">Upload Document</Link>
            </Button>
            <Button
              variant="link"
              asChild
              className={cn(
                "px-0",
                pathname === "/documents" ? "text-primary font-medium" : "text-muted-foreground"
              )}
            >
              <Link href="/documents">My Documents</Link>
            </Button>
          </nav>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
} 