export class EmbedHandler {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.isEmbedded = window.self !== window.top;
    
    if (this.isEmbedded) {
      this.setupMessageHandling();
      this.notifyParentReady();
    }
  }

  setupMessageHandling() {
    window.addEventListener('message', (event) => {
      const { type, data } = event.data || {};
      
      switch (type) {
        case 'gotoPage':
          this.callbacks.onPageChange?.(data.page);
          break;
        case 'getStatus':
          this.sendStatus();
          break;
        case 'zoomIn':
          this.callbacks.onZoomIn?.();
          break;
        case 'zoomOut':
          this.callbacks.onZoomOut?.();
          break;
        case 'fullscreen':
          this.callbacks.onFullscreen?.();
          break;
      }
    });
  }

  notifyParentReady() {
    this.sendMessage({
      type: 'ready',
      data: {
        page: 1,
        totalPages: 1,
        zoom: 100
      }
    });
  }

  notifyPageChange(page) {
    if (!this.isEmbedded) return;
    
    this.sendMessage({
      type: 'pageChanged',
      data: { page }
    });
  }

  notifyZoomChange(zoom) {
    if (!this.isEmbedded) return;
    
    this.sendMessage({
      type: 'zoomChanged',
      data: { zoom }
    });
  }

  sendStatus() {
    this.sendMessage({
      type: 'status',
      data: {
        currentPage: this.callbacks.currentPage || 1,
        totalPages: this.callbacks.totalPages || 1,
        zoom: this.callbacks.zoom || 100
      }
    });
  }

  sendMessage(message) {
    if (window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
  }
}
