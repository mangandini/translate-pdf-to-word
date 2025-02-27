# PDF - DOCx Translator to Word

A web application that translates Word and PDF documents to different languages while preserving formatting, and exports the result as a Word document.

## Features

- Upload DOCX / PDF documents
- Extract text and formatting (bold, italic, headers, lists)
- Translate content to multiple languages using OpenAI's API
- Preserve document structure and formatting as much as possible
- Export as Word document (.docx)

## Prerequisites

- Node.js 18 or later
- npm or yarn
- OpenAI API key

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd translate-pdf-to-word
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Click the upload button to select a file
2. Choose the source and target languages
3. Enable/disable formatting preservation
4. Add any custom translation instructions (optional)
5. Click "Translate" to start the process
6. Review and edit the translated content in the preview
7. Click "Download as Word" to save the document

## Technologies Used

- Next.js 14
- TypeScript
- TipTap Editor
- PDF.js
- docx
- OpenAI GPT-4
- Tailwind CSS
- Shadcn/ui
- Mammoth

## License

MIT
