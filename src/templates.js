export const templates = {
  default: {
    name: 'Clásico',
    background: '#ffffff',
    pageBackground: '#ffffff',
    shadow: '0 4px 20px rgba(0,0,0,0.15)',
    cornerStyle: 'round',
    showCover: true,
    autoFlip: false,
    flipTime: 300
  },
  
  modern: {
    name: 'Moderno',
    background: '#1a1a2e',
    pageBackground: '#ffffff',
    shadow: '0 8px 30px rgba(0,0,0,0.3)',
    cornerStyle: 'bevel',
    showCover: true,
    autoFlip: false,
    flipTime: 400
  },
  
  dark: {
    name: 'Oscuro',
    background: '#0f0f0f',
    pageBackground: '#1a1a1a',
    shadow: '0 4px 20px rgba(0,0,0,0.5)',
    cornerStyle: 'round',
    showCover: true,
    autoFlip: false,
    flipTime: 300,
    textColor: '#e0e0e0'
  },
  
  magazine: {
    name: 'Revista',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    pageBackground: '#ffffff',
    shadow: '0 10px 40px rgba(0,0,0,0.3)',
    cornerStyle: 'bevel',
    showCover: true,
    autoFlip: true,
    flipTime: 500,
    autoFlipInterval: 5000
  },
  
  minimalist: {
    name: 'Minimalista',
    background: '#f8f9fa',
    pageBackground: '#ffffff',
    shadow: '0 2px 10px rgba(0,0,0,0.08)',
    cornerStyle: 'square',
    showCover: true,
    autoFlip: false,
    flipTime: 200
  },
  
  elegant: {
    name: 'Elegante',
    background: 'linear-gradient(135deg, #2c3e50 0%, #3d566e 100%)',
    pageBackground: '#fffef5',
    shadow: '0 15px 50px rgba(0,0,0,0.35)',
    cornerStyle: 'round',
    showCover: true,
    autoFlip: false,
    flipTime: 600,
    fontFamily: 'Georgia, serif'
  },
  
  comic: {
    name: 'Cómic',
    background: '#ffeb3b',
    pageBackground: '#ffffff',
    shadow: '4px 4px 0px rgba(0,0,0,0.2)',
    cornerStyle: 'bevel',
    showCover: true,
    autoFlip: false,
    flipTime: 150,
    borderRadius: '0px'
  },
  
  corporate: {
    name: 'Corporativo',
    background: '#ffffff',
    pageBackground: '#ffffff',
    shadow: '0 2px 8px rgba(0,0,0,0.1)',
    cornerStyle: 'square',
    showCover: true,
    autoFlip: false,
    flipTime: 250,
    primaryColor: '#0066cc'
  }
};

export function getTemplate(name) {
  return templates[name] || templates.default;
}

export function applyTemplate(templateName, container) {
  const template = getTemplate(templateName);
  const containerEl = document.getElementById(container);
  
  if (!containerEl) return;
  
  document.documentElement.style.setProperty('--flip-bg', template.background);
  document.documentElement.style.setProperty('--flip-page-bg', template.pageBackground);
  document.documentElement.style.setProperty('--flip-shadow', template.shadow);
  
  if (template.textColor) {
    document.documentElement.style.setProperty('--flip-text', template.textColor);
  }
  
  if (template.primaryColor) {
    document.documentElement.style.setProperty('--primary', template.primaryColor);
  }
  
  return template;
}

export function getTemplatesList() {
  return Object.entries(templates).map(([key, value]) => ({
    id: key,
    name: value.name,
    preview: value.background
  }));
}
