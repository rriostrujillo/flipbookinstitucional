import { PageFlip } from 'page-flip';

export class FlipViewer {
  constructor(pages, callbacks = {}) {
    this.pages = pages;
    this.callbacks = callbacks;
    this.pageFlip = null;
    this.currentPage = 1;
    this.zoom = 100;
    this.minZoom = 50;
    this.maxZoom = 200;
    this.zoomStep = 25;
    
    this.init();
  }

  init() {
    const container = document.getElementById('flipbook');
    if (!container) return;

    container.innerHTML = '';

    this.pages.forEach((page, index) => {
      const pageEl = document.createElement('div');
      pageEl.className = 'page';
      pageEl.dataset.density = index === 0 || index === this.pages.length - 1 ? 'hard' : 'soft';
      
      const img = document.createElement('img');
      img.src = page.image;
      img.alt = `Página ${page.num}`;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.display = 'block';
      
      pageEl.appendChild(img);
      container.appendChild(pageEl);
    });

    const firstPage = container.querySelector('.page');
    if (firstPage) {
      const baseWidth = firstPage.offsetWidth || 400;
      const baseHeight = firstPage.offsetHeight || 600;
      
      this.pageFlip = new PageFlip(container, {
        width: baseWidth,
        height: baseHeight,
        size: 'stretch',
        minWidth: 300,
        maxWidth: 1200,
        minHeight: 400,
        maxHeight: 1600,
        maxShadowOpacity: 0.5,
        showCover: true,
        mobileScrollSupport: false,
        flippingTime: 300
      });

      this.pageFlip.loadFromHTML(container.querySelectorAll('.page'));

      this.pageFlip.on('flip', (e) => {
        const pageNum = e.data + 1;
        this.currentPage = pageNum;
        this.callbacks.onPageChange?.(pageNum);
        this.updateURL(pageNum);
      });
    }

    this.setupKeyboardNav();
  }

  setupKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      switch(e.key) {
        case 'ArrowLeft':
          this.prevPage();
          break;
        case 'ArrowRight':
          this.nextPage();
          break;
        case 'Home':
          this.goToPage(1);
          break;
        case 'End':
          this.goToPage(this.pages.length);
          break;
      }
    });
  }

  goToPage(pageNum) {
    if (pageNum < 1 || pageNum > this.pages.length) return;
    
    this.pageFlip?.flip(pageNum - 1);
    this.currentPage = pageNum;
    this.callbacks.onPageChange?.(pageNum);
  }

  nextPage() {
    if (this.currentPage < this.pages.length) {
      this.pageFlip?.flipNext();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.pageFlip?.flipPrev();
    }
  }

  zoomIn() {
    if (this.zoom < this.maxZoom) {
      this.zoom = Math.min(this.zoom + this.zoomStep, this.maxZoom);
      this.applyZoom();
    }
  }

  zoomOut() {
    if (this.zoom > this.minZoom) {
      this.zoom = Math.max(this.zoom - this.zoomStep, this.minZoom);
      this.applyZoom();
    }
  }

  applyZoom() {
    const container = document.getElementById('flipbook');
    if (!container) return;

    container.style.transform = `scale(${this.zoom / 100})`;
    container.style.transformOrigin = 'center center';
    
    this.callbacks.onZoomChange?.(this.zoom);
  }

  updateURL(pageNum) {
    const url = new URL(window.location);
    url.searchParams.set('page', pageNum);
    window.history.replaceState({}, '', url);
  }

  get totalPages() {
    return this.pages.length;
  }

  get currentPageNum() {
    return this.currentPage;
  }
}
