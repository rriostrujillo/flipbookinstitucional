export class Controls {
  constructor(config) {
    this.config = config;
    this.init();
  }

  init() {
    this.setupNavigation();
    this.setupZoom();
    this.setupFullscreen();
    this.updateButtons();
  }

  setupNavigation() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const slider = document.getElementById('page-slider');
    const input = document.getElementById('page-input');

    prevBtn?.addEventListener('click', () => {
      const newPage = this.config.currentPage - 1;
      if (newPage >= 1) {
        this.config.onPageChange(newPage);
      }
    });

    nextBtn?.addEventListener('click', () => {
      const newPage = this.config.currentPage + 1;
      if (newPage <= this.config.totalPages) {
        this.config.onPageChange(newPage);
      }
    });

    slider?.addEventListener('input', (e) => {
      const page = parseInt(e.target.value);
      this.config.onPageChange(page);
    });

    input?.addEventListener('change', (e) => {
      let page = parseInt(e.target.value);
      page = Math.max(1, Math.min(page, this.config.totalPages));
      e.target.value = page;
      this.config.onPageChange(page);
    });

    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        let page = parseInt(e.target.value);
        page = Math.max(1, Math.min(page, this.config.totalPages));
        e.target.value = page;
        this.config.onPageChange(page);
      }
    });
  }

  setupZoom() {
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');

    zoomInBtn?.addEventListener('click', () => {
      this.config.onZoomIn?.();
    });

    zoomOutBtn?.addEventListener('click', () => {
      this.config.onZoomOut?.();
    });
  }

  setupFullscreen() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    
    fullscreenBtn?.addEventListener('click', () => {
      this.config.onFullscreen?.();
    });
  }

  setPage(page) {
    this.config.currentPage = page;
    
    const slider = document.getElementById('page-slider');
    const input = document.getElementById('page-input');
    
    if (slider) {
      slider.value = page;
      slider.max = this.config.totalPages;
    }
    
    if (input) {
      input.value = page;
      input.max = this.config.totalPages;
    }

    this.updateButtons();
  }

  setZoom(zoom) {
    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) {
      zoomLevel.textContent = `${zoom}%`;
    }
  }

  updateButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
      prevBtn.disabled = this.config.currentPage <= 1;
    }
    
    if (nextBtn) {
      nextBtn.disabled = this.config.currentPage >= this.config.totalPages;
    }
  }
}
