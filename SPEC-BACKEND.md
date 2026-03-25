# FlipBook Backend - Especificación Técnica

## Visión General

Sistema backend para una plataforma de flipbooks con las siguientes características:
- 📤 Subida de PDFs
- 🔄 Conversión a flipbook interactivo
- 🔍 Vectorización para búsqueda semántica
- 👤 Sistema de autenticación
- 📚 Gestión de documentos por usuario

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  (FlipBook Viewer + Panel de Usuario)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND API                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Auth Routes  │  │ Document API │  │ Embed API            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Storage    │  │  Processing  │  │  Database   │
│  (S3/Local)  │  │  (PDF.js)    │  │ (PostgreSQL)│
└──────────────┘  └──────────────┘  └──────────────┘
                           │
                           ▼
                   ┌──────────────┐
                   │ Vector Store │
                   │ (pgvector)   │
                   └──────────────┘
```

---

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL + pgvector |
| **Auth** | JWT + bcrypt |
| **File Storage** | Local o S3 |
| **PDF Processing** | PDF.js + StPageFlip |
| **Vector Search** | pgvector / OpenAI Embeddings |
| **API Documentation** | Swagger |

---

## Base de Datos

### Esquema de Usuarios

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  plan VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Esquema de Documentos

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  original_filename VARCHAR(255),
  file_path TEXT NOT NULL,
  file_size BIGINT,
  page_count INTEGER,
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, ready, error
  is_public BOOLEAN DEFAULT false,
  embed_code TEXT,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Esquema de Embeddings

```sql
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI ada-002 dimension
  page_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON document_chunks USING ivfflat (embedding vector_cosine_ops);
```

---

## API Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/auth/register | Registro de usuario |
| POST | /api/auth/login | Inicio de sesión |
| POST | /api/auth/logout | Cerrar sesión |
| GET | /api/auth/me | Obtener usuario actual |
| POST | /api/auth/refresh | Renovar token |

### Documentos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/documents | Listar documentos del usuario |
| POST | /api/documents | Subir nuevo documento |
| GET | /api/documents/:id | Obtener documento |
| PUT | /api/documents/:id | Actualizar documento |
| DELETE | /api/documents/:id | Eliminar documento |
| GET | /api/documents/:id/embed | Obtener código embed |

### Búsqueda

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/search?q=... | Búsqueda semántica |

### Utilidades

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/health | Estado del servidor |

---

## Flujo de Subida de PDF

```
1. Usuario sube PDF
   │
   ▼
2. Backend valida archivo (tipo, tamaño)
   │
   ▼
3. Se guarda en storage (local/S3)
   │
   ▼
4. PDF.js extrae páginas como imágenes
   │
   ▼
5. Se generan thumbnails
   │
   ▼
6. Se vectoriza el texto (OpenAI Embeddings)
   │
   ▼
7. Se guarda en database
   │
   ▼
8. Estado = "ready"
   │
   ▼
9. Se genera código embed
```

---

## Autenticación

### JWT Tokens

```javascript
{
  "access_token": "eyJhbGciOiJIUzI1...",
  "refresh_token": "eyJhbGciOiJIUzI1...",
  "expires_in": 3600
}
```

### Middleware de Autenticación

```javascript
// Verificar token
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  // Verificar y decodificar token
  // Adjuntar usuario a req.user
};
```

---

## Seguridad

- ✅ Contraseñas hasheadas con bcrypt
- ✅ Tokens JWT con expiración
- ✅ Validación de archivos subidos
- ✅ Rate limiting en APIs
- ✅ CORS configurado
- ✅ Helmet para headers HTTP

---

## Configuración de Variables de Entorno

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/flipbook

# Auth
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800  # 50MB

# OpenAI (para embeddings)
OPENAI_API_KEY=sk-...

# External Services
S3_BUCKET=flipbook-docs
S3_REGION=us-east-1
```

---

## Tareas por Agente

### Hephaestus (Backend Core)
- Servidor Express
- Database setup (PostgreSQL)
- Middleware de autenticación
- CRUD de documentos

### Atlas (DevOps/Infra)
- Docker setup
- Environment configuration
- Deployment scripts

### Prometheus (Planificación)
- Diseño de APIs
- Flujos de usuario

### Sisyphus (Orquestación)
- Coordinar todo el equipo
- Asegurar integración

---

## Consideraciones de Escalabilidad

1. **Procesamiento de PDFs** - Usar colas (Bull/Redis) para procesamiento async
2. **Storage** - S3 para archivos, CDN para serve
3. **Vector Search** - pgvector es suficiente para inicio, escalar a Pinecone/Weaviate si es necesario
4. **Rate Limiting** - Implementar en producción
