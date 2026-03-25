import { PDFLoader } from './pdf-loader.js';
import { FlipViewer } from './flip-viewer.js';
import { Controls } from './controls.js';
import { EmbedHandler } from './embed.js';
import { applyTemplate, getTemplate } from './templates.js';

class FlipBookApp {
  constructor() {
    this.pdfLoader = null;
    this.flipViewer = null;
    this.controls = null;
    this.embedHandler = null;
    this.config = this.parseConfig();
    
    this.init();
  }

  parseConfig() {
    const params = new URLSearchParams(window.location.search);
    return {
      pdf: params.get('pdf'),
      page: parseInt(params.get('page')) || 1,
      theme: params.get('theme') || 'light',
      template: params.get('template') || 'default',
      controls: params.get('controls') !== '0',
      fullscreen: params.get('fullscreen') === '1',
      title: params.get('title') || 'FlipBook'
    };
  }

  async init() {
    try {
      this.applyTemplate();
      this.updateTitle(this.config.title);
      this.toggleControls(this.config.controls);
      
      if (!this.config.pdf) {
        this.showDemoMode();
        return;
      }

      await this.loadPDF(this.config.pdf);
    } catch (error) {
      console.error('Error initializing FlipBook:', error);
      this.showError(error.message);
    }
  }

  applyTemplate() {
    const template = getTemplate(this.config.template);
    applyTemplate(this.config.template, 'flipbook-wrapper');
    
    const container = document.getElementById('viewer-container');
    if (container && template.background) {
      container.style.background = template.background;
    }
  }

  updateTitle(title) {
    const titleEl = document.getElementById('document-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  toggleControls(visible) {
    const controls = document.getElementById('controls');
    const header = document.getElementById('header');
    if (controls) controls.style.display = visible ? 'flex' : 'none';
    if (header) header.style.display = visible ? 'flex' : 'none';
  }

  async loadPDF(pdfUrl) {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error-message');
    
    try {
      loadingEl.style.display = 'flex';
      errorEl.style.display = 'none';

      this.pdfLoader = new PDFLoader();
      const pages = await this.pdfLoader.loadFromURL(pdfUrl);
      
      this.flipViewer = new FlipViewer(pages, {
        onPageChange: (page) => this.onPageChange(page),
        onZoomChange: (zoom) => this.onZoomChange(zoom)
      });

      this.controls = new Controls({
        totalPages: pages.length,
        currentPage: this.config.page,
        onPageChange: (page) => this.flipViewer.goToPage(page),
        onZoomIn: () => this.flipViewer.zoomIn(),
        onZoomOut: () => this.flipViewer.zoomOut(),
        onFullscreen: () => this.toggleFullscreen()
      });

      this.embedHandler = new EmbedHandler({
        onPageChange: (page) => {
          this.flipViewer.goToPage(page);
          this.controls.setPage(page);
        }
      });

      if (this.config.page > 1) {
        this.flipViewer.goToPage(this.config.page);
      }

      loadingEl.style.display = 'none';
      
    } catch (error) {
      loadingEl.style.display = 'none';
      this.showError(error.message);
    }
  }

  showDemoMode() {
    const loadingEl = document.getElementById('loading');
    loadingEl.style.display = 'none';
    
    const wrapper = document.getElementById('flipbook-wrapper');
    wrapper.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <h2>FlipBook Demo</h2>
        <p style="margin: 16px 0; color: var(--text-secondary);">
          Agrega el parámetro <code>?pdf=URL</code> para cargar un PDF
        </p>
        <p style="color: var(--text-secondary); font-size: 0.875rem;">
          Ejemplo: <code>?pdf=https://example.com/document.pdf</code>
        </p>
      </div>
    `;
  }

  onPageChange(page) {
    this.controls.setPage(page);
    this.embedHandler?.notifyPageChange(page);
    
    const pageCounter = document.getElementById('page-counter');
    if (pageCounter) {
      const total = this.flipViewer?.totalPages || 1;
      pageCounter.textContent = `Página ${page} de ${total}`;
    }
  }

  onZoomChange(zoom) {
    this.controls?.setZoom(zoom);
  }

  showError(message) {
    const errorEl = document.getElementById('error-message');
    const loadingEl = document.getElementById('loading');
    
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    errorEl.querySelector('p').textContent = message;
    
    const retryBtn = document.getElementById('retry-btn');
    retryBtn?.addEventListener('click', () => {
      if (this.config.pdf) {
        this.loadPDF(this.config.pdf);
      }
    });
  }

  toggleFullscreen() {
    const container = document.getElementById('viewer-container');
    
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FlipBookApp();
});
