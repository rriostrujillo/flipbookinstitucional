import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export class PDFLoader {
  constructor() {
    this.pdfDoc = null;
    this.scale = 1.5;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  async loadFromURL(url) {
    const loadingTask = pdfjsLib.getDocument({
      url: url,
      withCredentials: false
    });

    this.pdfDoc = await loadingTask.promise;
    const pages = [];

    for (let i = 1; i <= this.pdfDoc.numPages; i++) {
      const page = await this.renderPage(i);
      pages.push(page);
    }

    return pages;
  }

  async loadFromFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    
    this.pdfDoc = await loadingTask.promise;
    const pages = [];

    for (let i = 1; i <= this.pdfDoc.numPages; i++) {
      const page = await this.renderPage(i);
      pages.push(page);
    }

    return pages;
  }

  async renderPage(pageNum) {
    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: this.scale });

    this.canvas.width = viewport.width;
    this.canvas.height = viewport.height;

    const renderContext = {
      canvasContext: this.ctx,
      viewport: viewport
    };

    await page.render(renderContext).promise;

    const dataURL = this.canvas.toDataURL('image/jpeg', 0.9);
    
    return {
      num: pageNum,
      width: viewport.width,
      height: viewport.height,
      image: dataURL
    };
  }

  getPageCount() {
    return this.pdfDoc?.numPages || 0;
  }
}
