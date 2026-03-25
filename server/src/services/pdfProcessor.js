import * as pdfjsLib from 'pdfjs-dist';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export async function processPDF(filePath, documentId) {
  const absolutePath = join(__dirname, '../../uploads', filePath);
  
  const fileBuffer = await readFile(absolutePath);
  const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
  
  const pageCount = pdfDoc.numPages;
  
  return {
    pageCount,
    thumbnail: null
  };
}

export async function extractTextFromPDF(filePath) {
  const absolutePath = join(__dirname, '../../uploads', filePath);
  
  const fileBuffer = await readFile(absolutePath);
  const pdfDoc = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
  
  const chunks = [];
  
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    
    const pageText = textContent.items
      .map(item => item.str)
      .join(' ');
    
    if (pageText.trim()) {
      chunks.push({
        pageNumber: i,
        text: pageText
      });
    }
  }
  
  return chunks;
}
