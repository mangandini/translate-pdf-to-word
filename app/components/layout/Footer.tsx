export function Footer() {
  return (
    <footer className="border-t py-6 mt-auto">
      <div className="container">
        <div className="flex flex-col items-center justify-center gap-2 md:flex-row md:justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} PDF / Word Translator</p>
          <p>OMMM</p>
        </div>
      </div>
    </footer>
  )
} 