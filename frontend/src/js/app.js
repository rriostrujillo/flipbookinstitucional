const API_URL = 'http://localhost:3001/api';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.log('SW registration failed:', err));
  });
}

class App {
  constructor() {
    this.user = null;
    this.currentPage = 'auth';
    this.init();
  }

  async init() {
    this.checkOAuthCallback();
    this.loadUserFromStorage();
    this.setupEventListeners();
    this.render();
    
    if ('Notification' in window && Notification.permission === 'default') {
      this.requestNotificationPermission();
    }
  }

  requestNotificationPermission() {
    if (confirm('¿Quieres recibir notificaciones de FlipBook?')) {
      Notification.requestPermission();
    }
  }

  checkOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const refresh = params.get('refresh');
    
    if (token && refresh) {
      params.delete('token');
      params.delete('refresh');
      window.history.replaceState({}, '', window.location.pathname);
      
      if (params.get('error')) {
        this.showToast('Error en OAuth', 'error');
        return;
      }
      
      localStorage.setItem('access_token', token);
      localStorage.setItem('refresh_token', refresh);
      this.loadUserFromStorage();
    }
  }

  loadUserFromStorage() {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      this.user = JSON.parse(userData);
      this.currentPage = 'dashboard';
    } else {
      this.currentPage = 'auth';
    }
  }

  saveUser(token, refreshToken, user) {
    localStorage.setItem('access_token', token);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    this.user = user;
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.user = null;
    this.currentPage = 'auth';
    this.render();
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('.nav-link') && !e.target.closest('.nav-link').classList.contains('active')) {
        e.preventDefault();
        const page = e.target.closest('.nav-link').dataset.page;
        if (page) this.navigateTo(page);
      }

      if (e.target.closest('#user-menu-btn')) {
        e.preventDefault();
        document.getElementById('user-dropdown').classList.toggle('show');
      }

      if (e.target.closest('[data-action="logout"]')) {
        e.preventDefault();
        this.logout();
      }

      if (e.target.closest('#modal-close') || e.target.closest('#preview-modal')) {
        this.closeModal();
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#nav-user')) {
        document.getElementById('user-dropdown')?.classList.remove('show');
      }
    });
  }

  navigateTo(page) {
    if (!this.user && page !== 'auth') {
      this.currentPage = 'auth';
    } else {
      this.currentPage = page;
    }
    this.render();
  }

  async render() {
    const main = document.getElementById('main-content');
    const navbar = document.getElementById('navbar');
    const navMenu = document.getElementById('nav-menu');
    const navUser = document.getElementById('nav-user');

    if (!this.user) {
      navbar.style.display = 'none';
      main.innerHTML = await this.renderAuthPage();
      this.setupAuthListeners();
      return;
    }

    navbar.style.display = 'flex';
    navMenu.style.display = 'flex';
    navUser.style.display = 'flex';

    document.getElementById('user-name').textContent = this.user.name || this.user.email;

    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === this.currentPage);
    });

    switch (this.currentPage) {
      case 'dashboard':
        main.innerHTML = await this.renderDashboard();
        this.loadDocuments();
        break;
      case 'upload':
        main.innerHTML = await this.renderUploadPage();
        this.setupUploadListeners();
        break;
      case 'document':
        const docId = new URLSearchParams(window.location.search).get('id');
        if (docId) {
          main.innerHTML = await this.renderDocumentDetail(docId);
          this.loadDocumentDetail(docId);
        } else {
          this.navigateTo('dashboard');
        }
        break;
      default:
        main.innerHTML = await this.renderDashboard();
    }
  }

  async renderAuthPage() {
    return `
      <div class="auth-container">
        <div class="auth-card">
          <div class="auth-header">
            <h1>FlipBook</h1>
            <p>Crea flipbooks interactivos de tus PDFs</p>
          </div>
          
          <div class="auth-tabs">
            <button class="auth-tab active" data-tab="login">Iniciar sesión</button>
            <button class="auth-tab" data-tab="register">Registrarse</button>
          </div>

          <div class="oauth-buttons" style="margin-bottom: 24px;">
            <a href="${API_URL}/auth/oauth/google" class="btn btn-oauth btn-google">
              <i class="fab fa-google"></i>
              Continuar con Google
            </a>
            <a href="${API_URL}/auth/oauth/github" class="btn btn-oauth btn-github">
              <i class="fab fa-github"></i>
              Continuar con GitHub
            </a>
          </div>
          
          <div class="auth-divider">
            <span>o</span>
          </div>
          
          <form class="auth-form active" id="login-form">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" name="email" required placeholder="tu@email.com">
            </div>
            <div class="form-group">
              <label class="form-label">Contraseña</label>
              <input type="password" class="form-input" name="password" required placeholder="••••••••">
            </div>
            <button type="submit" class="btn btn-primary btn-block">
              <i class="fas fa-sign-in-alt"></i>
              Iniciar sesión
            </button>
          </form>
          
          <form class="auth-form" id="register-form">
            <div class="form-group">
              <label class="form-label">Nombre</label>
              <input type="text" class="form-input" name="name" placeholder="Tu nombre">
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" name="email" required placeholder="tu@email.com">
            </div>
            <div class="form-group">
              <label class="form-label">Contraseña</label>
              <input type="password" class="form-input" name="password" required placeholder="••••••••" minlength="6">
            </div>
            <button type="submit" class="btn btn-primary btn-block">
              <i class="fas fa-user-plus"></i>
              Crear cuenta
            </button>
          </form>
        </div>
      </div>
    `;
  }

  setupAuthListeners() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-form`).classList.add('active');
      });
    });

    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const email = form.email.value;
      const password = form.password.value;

      try {
        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');

        this.saveUser(data.access_token, data.refresh_token, data.user);
        this.showToast('¡Bienvenido!', 'success');
        this.navigateTo('dashboard');
      } catch (error) {
        this.showToast(error.message, 'error');
      }
    });

    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const name = form.name.value;
      const email = form.email.value;
      const password = form.password.value;

      try {
        const res = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Error al registrarse');

        this.saveUser(data.access_token, data.refresh_token, data.user);
        this.showToast('¡Cuenta creada!', 'success');
        this.navigateTo('dashboard');
      } catch (error) {
        this.showToast(error.message, 'error');
      }
    });
  }

  async renderDashboard() {
    return `
      <div class="dashboard-header">
        <h1 class="dashboard-title">Mis Documentos</h1>
        <button class="btn btn-primary" onclick="app.navigateTo('upload')">
          <i class="fas fa-plus"></i>
          Subir PDF
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="fas fa-file-pdf"></i>
          </div>
          <div class="stat-value" id="stat-total">0</div>
          <div class="stat-label">Total documentos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #10B981, #34D399);">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="stat-value" id="stat-ready">0</div>
          <div class="stat-label">Listos</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #F59E0B, #FBBF24);">
            <i class="fas fa-eye"></i>
          </div>
          <div class="stat-value" id="stat-views">0</div>
          <div class="stat-label">Visualizaciones</div>
        </div>
      </div>

      <div class="documents-grid" id="documents-grid">
        <div class="loading">
          <div class="spinner"></div>
        </div>
      </div>
    `;
  }

  async loadDocuments() {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Error al cargar documentos');

      const data = await res.json();
      this.renderDocuments(data.documents);
      this.updateStats(data.documents);
    } catch (error) {
      console.error(error);
      document.getElementById('documents-grid').innerHTML = `
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Error al cargar</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  renderDocuments(documents) {
    const grid = document.getElementById('documents-grid');
    
    if (!documents || documents.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-folder-open"></i>
          <h3>No hay documentos</h3>
          <p>Sube tu primer PDF para comenzar</p>
          <button class="btn btn-primary" onclick="app.navigateTo('upload')">
            <i class="fas fa-cloud-upload-alt"></i>
            Subir PDF
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = documents.map(doc => `
      <div class="document-card">
        <div class="document-thumbnail">
          ${doc.thumbnail_path 
            ? `<img src="${API_URL.replace('/api', '')}/uploads/${doc.thumbnail_path}" alt="${doc.title}">`
            : `<i class="fas fa-file-pdf placeholder"></i>`
          }
        </div>
        <div class="document-info">
          <h3 class="document-title">${doc.title}</h3>
          <div class="document-meta">
            <span><i class="fas fa-file"></i> ${doc.page_count || 0} páginas</span>
            <span><i class="fas fa-eye"></i> ${doc.views_count || 0}</span>
          </div>
          <span class="document-status ${doc.status}">
            <i class="fas fa-${doc.status === 'ready' ? 'check' : doc.status === 'processing' ? 'clock' : 'exclamation'}"></i>
            ${doc.status === 'ready' ? 'Listo' : doc.status === 'processing' ? 'Procesando' : 'Error'}
          </span>
          <div class="document-actions" style="margin-top: 12px;">
            <button class="btn btn-secondary" onclick="app.viewDocument('${doc.id}')">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-primary" onclick="app.getEmbedCode('${doc.id}')">
              <i class="fas fa-code"></i>
            </button>
            <button class="btn btn-secondary" onclick="app.deleteDocument('${doc.id}')" style="color: var(--danger);">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  updateStats(documents) {
    const total = documents.length;
    const ready = documents.filter(d => d.status === 'ready').length;
    const views = documents.reduce((sum, d) => sum + (d.views_count || 0), 0);

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-ready').textContent = ready;
    document.getElementById('stat-views').textContent = views;
  }

  async renderUploadPage() {
    return `
      <div class="upload-container">
        <div class="upload-card">
          <div class="upload-header">
            <h1>Subir nuevo documento</h1>
            <p>Sube tu PDF y conviértelo en un flipbook interactivo</p>
          </div>
          
          <div class="upload-zone" id="upload-zone">
            <i class="fas fa-cloud-upload-alt"></i>
            <h3>Arrastra tu PDF aquí</h3>
            <p>o haz clic para seleccionar</p>
            <button class="btn btn-primary">
              <i class="fas fa-folder-open"></i>
              Seleccionar archivo
            </button>
            <input type="file" class="upload-input" id="file-input" accept=".pdf">
          </div>
          
          <div class="upload-form" id="upload-form" style="display: none;">
            <div class="upload-preview" id="upload-preview">
              <div class="upload-preview-icon">
                <i class="fas fa-file-pdf"></i>
              </div>
              <div class="upload-preview-info">
                <div class="upload-preview-name" id="preview-name"></div>
                <div class="upload-preview-size" id="preview-size"></div>
              </div>
              <button class="btn btn-secondary" onclick="app.clearUpload()" style="padding: 8px;">
                <i class="fas fa-times"></i>
              </button>
            </div>
            
            <div class="form-group">
              <label class="form-label">Título</label>
              <input type="text" class="form-input" id="doc-title" placeholder="Mi documento">
            </div>
            
            <div class="form-group">
              <label class="form-label">Descripción (opcional)</label>
              <input type="text" class="form-input" id="doc-description" placeholder="Descripción del documento">
            </div>
            
            <button class="btn btn-primary btn-block" onclick="app.uploadDocument()">
              <i class="fas fa-upload"></i>
              Subir y convertir
            </button>
            
            <div class="upload-progress" id="upload-progress" style="display: none;">
              <div class="progress-bar">
                <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
              </div>
              <div class="progress-text" id="progress-text">Subiendo... 0%</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  setupUploadListeners() {
    const zone = document.getElementById('upload-zone');
    const input = document.getElementById('file-input');

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        this.handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    input.addEventListener('change', () => {
      if (input.files.length) {
        this.handleFileSelect(input.files[0]);
      }
    });
  }

  handleFileSelect(file) {
    if (file.type !== 'application/pdf') {
      this.showToast('Solo se permiten archivos PDF', 'error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      this.showToast('El archivo no puede superar 50MB', 'error');
      return;
    }

    document.getElementById('upload-zone').style.display = 'none';
    document.getElementById('upload-form').style.display = 'block';
    
    document.getElementById('preview-name').textContent = file.name;
    document.getElementById('preview-size').textContent = this.formatFileSize(file.size);
    document.getElementById('doc-title').value = file.name.replace('.pdf', '');
    
    this.selectedFile = file;
  }

  clearUpload() {
    this.selectedFile = null;
    document.getElementById('upload-zone').style.display = 'block';
    document.getElementById('upload-form').style.display = 'none';
    document.getElementById('file-input').value = '';
  }

  async uploadDocument() {
    if (!this.selectedFile) {
      this.showToast('Selecciona un archivo', 'error');
      return;
    }

    const title = document.getElementById('doc-title').value;
    const description = document.getElementById('doc-description').value;

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('title', title);
    formData.append('description', description);

    const progressDiv = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    progressDiv.style.display = 'block';

    try {
      const token = localStorage.getItem('access_token');
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          progressFill.style.width = `${percent}%`;
          progressText.textContent = `Subiendo... ${percent}%`;
        }
      });

      await new Promise((resolve, reject) => {
        xhr.open('POST', `${API_URL}/documents`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(JSON.parse(xhr.responseText).error || 'Error al subir'));
          }
        };
        
        xhr.onerror = () => reject(new Error('Error de conexión'));
        xhr.send(formData);
      });

      this.showToast('¡Documento subido!', 'success');
      this.navigateTo('dashboard');
    } catch (error) {
      this.showToast(error.message, 'error');
      progressDiv.style.display = 'none';
    }
  }

  async renderDocumentDetail(docId) {
    return `
      <div class="detail-container">
        <div class="detail-header">
          <div>
            <h1 class="detail-title" id="doc-title">Cargando...</h1>
            <div class="detail-meta">
              <span id="doc-pages"><i class="fas fa-file"></i> ... páginas</span>
              <span id="doc-views"><i class="fas fa-eye"></i> ... vistas</span>
              <span id="doc-date"><i class="fas fa-calendar"></i> ...</span>
            </div>
          </div>
          <div class="detail-actions">
            <button class="btn btn-secondary" onclick="app.navigateTo('dashboard')">
              <i class="fas fa-arrow-left"></i>
              Volver
            </button>
            <button class="btn btn-primary" onclick="app.getEmbedCode('${docId}')">
              <i class="fas fa-code"></i>
              Obtener código
            </button>
          </div>
        </div>

        <div class="detail-grid">
          <div class="detail-preview">
            <iframe id="preview-frame" src=""></iframe>
          </div>
          <div class="detail-sidebar">
            <div class="detail-card">
              <h3>Estadísticas</h3>
              <div class="detail-stats">
                <div class="detail-stat">
                  <div class="detail-stat-value" id="stat-pages">-</div>
                  <div class="detail-stat-label">Páginas</div>
                </div>
                <div class="detail-stat">
                  <div class="detail-stat-value" id="stat-views">-</div>
                  <div class="detail-stat-label">Vistas</div>
                </div>
              </div>
            </div>
            <div class="detail-card">
              <h3>Estado</h3>
              <span class="document-status" id="doc-status">
                <i class="fas fa-spinner fa-spin"></i>
                Cargando...
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async loadDocumentDetail(docId) {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/documents/${docId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Error al cargar documento');

      const { document: doc } = await res.json();

      document.getElementById('doc-title').textContent = doc.title;
      document.getElementById('doc-pages').innerHTML = `<i class="fas fa-file"></i> ${doc.page_count} páginas`;
      document.getElementById('doc-views').innerHTML = `<i class="fas fa-eye"></i> ${doc.views_count} vistas`;
      document.getElementById('doc-date').innerHTML = `<i class="fas fa-calendar"></i> ${new Date(doc.created_at).toLocaleDateString()}`;
      
      document.getElementById('stat-pages').textContent = doc.page_count;
      document.getElementById('stat-views').textContent = doc.views_count;

      const statusEl = document.getElementById('doc-status');
      statusEl.className = `document-status ${doc.status}`;
      statusEl.innerHTML = `
        <i class="fas fa-${doc.status === 'ready' ? 'check' : doc.status === 'processing' ? 'clock' : 'exclamation'}"></i>
        ${doc.status === 'ready' ? 'Listo' : doc.status === 'processing' ? 'Procesando' : 'Error'}
      `;

      const baseUrl = window.location.origin;
      document.getElementById('preview-frame').src = `${baseUrl}/?pdf=${baseUrl}/uploads/${doc.file_path}&title=${encodeURIComponent(doc.title)}`;

    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  viewDocument(docId) {
    this.navigateTo('document');
    const url = new URL(window.location.href);
    url.searchParams.set('id', docId);
    window.history.pushState({}, '', url);
  }

  async getEmbedCode(docId) {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/documents/${docId}/embed`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Error al obtener código');

      const data = await res.json();

      await navigator.clipboard.writeText(data.embed_code);
      this.showToast('¡Código copiado al portapapeles!', 'success');
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  async deleteDocument(docId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Error al eliminar');

      this.showToast('Documento eliminado', 'success');
      this.loadDocuments();
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  showModal(iframeSrc) {
    const modal = document.getElementById('preview-modal');
    const iframe = document.getElementById('preview-iframe');
    iframe.src = iframeSrc;
    modal.classList.add('show');
  }

  closeModal() {
    document.getElementById('preview-modal').classList.remove('show');
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'exclamation'}"></i>
      </div>
      <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

const app = new App();
window.app = app;
