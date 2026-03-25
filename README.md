# FlipBook - Crea flipbooks interactivos como Issuu

Plataforma completa para convertir PDFs en flipbooks interactivos embebibles.

## 🚀 Características

- 📖 **Flipbooks interactivos** - Efecto de pasar páginas realista
- 🔍 **Búsqueda semántica** - Encuentra contenido en tus documentos (gratis con FastEmbed)
- 👤 **Autenticación** - Sistema de usuarios con JWT
- 🔐 **OAuth** - Login con Google y GitHub
- 📤 **Subida de PDFs** - Arrastra y suelta
- 🎨 **Templates** - 8 temas diferentes para tus flipbooks
- 📊 **Analytics** - Estadísticas detalladas de tus documentos
- 📱 **PWA** - Instala como app en tu móvil
- 🔗 **Embedding** - Código iframe para tu sitio web
- 🎯 **Diseño moderno** - Estilo Canva

## 🏗️ Estructura

```
issuu/
├── frontend/           # Panel de usuario
│   ├── src/
│   │   ├── js/       # App principal
│   │   └── css/      # Estilos
│   ├── public/
│   │   ├── manifest.json
│   │   └── sw.js     # Service Worker
│   └── index.html
├── server/            # Backend API
│   ├── src/
│   │   ├── routes/   # auth, documents, search, analytics, oauth
│   │   ├── services/ # pdf, embed, search
│   │   └── models/   # PostgreSQL
│   └── package.json
├── src/               # Viewer embebible
│   ├── main.js
│   ├── templates.js  # Temas visuales
│   └── ...
├── SPEC.md           # Especificaciones técnicas
└── README.md
```

## 🛠️ Requisitos

- Node.js 18+
- PostgreSQL con extensión pgvector
- npm o yarn

## 📦 Instalación

### 1. Clona el proyecto

```bash
cd issuu
```

### 2. Instala dependencias

```bash
npm install
cd server && npm install
cd ../frontend && npm install
cd ..
```

### 3. Configura las variables de entorno

```bash
cp server/.env.example server/.env
```

Edita `server/.env` con tus valores:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flipbook
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
JWT_SECRET=una-clave-secreta
JWT_REFRESH_SECRET=otra-clave-secreta
BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# OAuth (opcional)
GOOGLE_CLIENT_ID=tu-google-id
GOOGLE_CLIENT_SECRET=tu-google-secret
GITHUB_CLIENT_ID=tu-github-id
GITHUB_CLIENT_SECRET=tu-github-secret
```

### 4. Inicia PostgreSQL con pgvector

```bash
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=flipbook pgvector/pgvector:pg16
```

### 5. Inicializa la base de datos

```bash
cd server
npm run db:init
```

## 🚀 Ejecución

### Modo desarrollo

```bash
# Terminal 1 - Backend
cd server && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

- **Panel de usuario**: http://localhost:3000
- **API**: http://localhost:3001
- **Viewer embebido**: http://localhost:3000/?pdf=URL

### Production

```bash
npm run build
cd server && npm start
```

## 📡 API Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/auth/register | Registro |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Renovar token |
| GET | /api/auth/me | Usuario actual |
| GET | /api/auth/oauth/google | Login con Google |
| GET | /api/auth/oauth/github | Login con GitHub |

### Documentos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/documents | Lista de documentos |
| POST | /api/documents | Subir PDF |
| GET | /api/documents/:id | Ver documento |
| PUT | /api/documents/:id | Actualizar |
| DELETE | /api/documents/:id | Eliminar |
| GET | /api/documents/:id/embed | Código iframe |

### Búsqueda

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/search?q=... | Búsqueda semántica |

### Analytics

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/analytics/track | Registrar evento |
| GET | /api/analytics/overview | Estadísticas generales |
| GET | /api/analytics/document/:id | Estadísticas por documento |

## 🎨 Templates

Usa el parámetro `template` en la URL:

```html
<iframe src="http://localhost:3000/?pdf=URL&template=modern"></iframe>
```

Templates disponibles:

| Template | Descripción |
|---------|-------------|
| default | Clásico |
| modern | Moderno oscuro |
| dark | Oscuro |
| magazine | Revista colorida |
| minimalist | Minimalista |
| elegant | Elegante |
| comic | Estilo cómic |
| corporate | Corporativo |

## 📱 PWA

La app es instalable como aplicación nativa:

1. Abre http://localhost:3000 en Chrome/Safari
2. Busca el ícono de instalar en la barra de direcciones
3. ¡Instala FlipBook como app!

## 🔧 Uso del Viewer

### Parámetros de URL

```html
<iframe 
  src="http://localhost:3000/?pdf=URL_DEL_PDF&title=Título&template=modern&controls=1"
  width="100%" 
  height="500"
></iframe>
```

### Parámetros disponibles

| Parámetro | Descripción | Ejemplo |
|-----------|-------------|---------|
| pdf | URL del PDF | `?pdf=https://.../doc.pdf` |
| title | Título del documento | `&title=Mi Revista` |
| template | Tema visual | `&template=modern` |
| controls | Mostrar controles (1/0) | `&controls=0` |
| page | Página inicial | `&page=3` |

## 🐳 Docker

```bash
cd server
docker-compose up -d
```

## 📊 Analytics

El sistema registra:

- Vistas por documento
- Página más leída
- Tiempo de lectura
- Visitantes únicos
- Historial por fecha

## 📚 Tecnologías

- **Frontend**: Vanilla JS + CSS moderno + PWA
- **Backend**: Node.js + Express
- **DB**: PostgreSQL + pgvector
- **Embeddings**: FastEmbed (gratis, local, sin API key)
- **PDF**: PDF.js + StPageFlip
- **Auth**: JWT + bcrypt + OAuth (Google/GitHub)

## 📄 Licencia

MIT
