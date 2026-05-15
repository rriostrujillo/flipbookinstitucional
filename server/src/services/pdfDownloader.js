import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function downloadPDF(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadPDF(response.headers.location).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
      }
      
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('pdf') && !url.toLowerCase().endsWith('.pdf')) {
        // Allow if URL ends with .pdf even if content-type is different
      }
      
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          
          // Validate PDF magic bytes
          if (buffer.slice(0, 5).toString() !== '%PDF-') {
            throw new Error('File is not a valid PDF');
          }
          
          const uploadsDir = join(__dirname, '../../uploads');
          
          // Ensure uploads directory exists
          await mkdir(uploadsDir, { recursive: true });
          
          const filename = `${uuidv4()}.pdf`;
          const filePath = join(uploadsDir, filename);
          
          await writeFile(filePath, buffer);
          
          resolve({
            filename,
            filePath,
            size: buffer.length
          });
        } catch (err) {
          reject(err);
        }
      });
      
      response.on('error', reject);
    });
    
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

export function isValidPDFUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    return (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') && 
           url.toLowerCase().endsWith('.pdf');
  } catch {
    return false;
  }
}