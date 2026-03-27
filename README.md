# Marketing Copilot - Astro + Gemini

Aplicacion web para analizar eventos de comportamiento (formato CSV tipo analitica de navegacion) y responder preguntas de negocio en lenguaje natural.

## Arquitectura tecnica

### Frontend

- Framework: Astro 6
- UI principal: `src/pages/index.astro`
- Orquestacion cliente modular en `public/js/dashboard/`:
  - `main.js`: bootstrap, tabs y visibilidad del workspace
  - `datasets.js`: upload, activacion, eliminacion y limpieza de versiones
  - `metrics.js`: KPIs, insights y tablas
  - `chat.js`: flujo de preguntas/respuestas
  - `health.js`: estado de proveedor IA
  - `dom.js`: referencias de elementos del DOM

### Backend

- APIs Astro en `src/pages/api/`:
  - `upload.ts`: recibe CSV, valida extension/tamano y crea nueva version de dataset
  - `metrics.ts`: devuelve resumen, insights y detalles del dataset activo
  - `chat.ts`: responde preguntas usando Gemini + herramientas analiticas
  - `health.ts`: estado de configuracion y disponibilidad de Gemini
- Capa IA en `src/lib/ai/`:
  - `gemini.ts`: cliente Gemini, prompt estrategico y fallback local
  - `tools.ts`: seleccion y ejecucion de tools segun la pregunta
- Capa datos en `src/lib/data/`:
  - `loader.ts`, `metrics.ts`, `insights.ts`, `navigator.ts`
- Estado de datasets en `src/lib/store/sessionStore.ts`

## Flujo funcional actual

1. La pantalla inicial muestra solo carga de CSV y chat.
2. No se activa ningun dataset por defecto al arrancar.
3. Tras una carga exitosa, se habilita el workspace de datos procesados (Resumen, Insights, Tablas).
4. El chat usa el contexto del dataset activo cuando existe.
5. Si Gemini falla (timeout/cuota/proveedor), se entrega una respuesta local de fallback basada en metricas.

## Persistencia de datos

- Entrada de ejemplo en raiz:
  - `1_Data_Recordings.csv`
  - `2_Data_Metrics.csv`
- Versiones procesadas y manifiesto:
  - `data/runtime/datasets/manifest.json`
  - `data/runtime/datasets/*.json`
- Limpieza automatica por limite de versiones (`MAX_DATASET_VERSIONS`).

## Variables de entorno

Archivo `.env` (raiz):

```env
GEMINI_API_KEY=AIza...
MAX_UPLOAD_BYTES=31457280
CHAT_RATE_LIMIT_MAX=20
CHAT_RATE_LIMIT_WINDOW_MS=60000
GEMINI_TIMEOUT_MS=20000
GEMINI_MAX_RETRIES=2
MAX_DATASET_VERSIONS=10
```

Notas:
- La lectura de configuracion prioriza `.env` para reflejar cambios recientes de API key.
- `health.ts` invalida cache del probe si detecta cambio de API key.

## Endpoints principales

- `GET /api/health`
  - Estado rapido de configuracion Gemini.
- `GET /api/health?deep=1`
  - Probe real al proveedor Gemini.
- `POST /api/upload`
  - Carga y procesa CSV.
- `GET /api/metrics`
  - Resumen del dataset activo.
- `POST /api/chat`
  - Respuesta de copiloto con IA/fallback.

## Estados de salud Gemini

`/api/health` puede retornar:

- `missing_key`
- `invalid_key_format`
- `ready`
- `provider_auth_error`
- `provider_timeout`
- `provider_quota_exceeded`
- `provider_unreachable`

## Desarrollo local

### Requisitos

- Node.js 22+
- npm

### Instalar dependencias

```bash
npm install
```

### Ejecutar en desarrollo

```bash
npm run dev
```

### Build de produccion

```bash
npm run build
```

### Preview local

```bash
npm run preview
```

## Solucion de problemas

### Cambie la API key y sigue mostrando cuota

1. Verifica que el valor nuevo este en `.env` y tenga formato `AIza...`.
2. Ejecuta `GET /api/health?deep=1` para forzar probe sin cache temporal.
3. Si retorna `provider_quota_exceeded`, la restriccion viene del proyecto/cuenta de Google AI usada por esa key.
4. Si retorna `provider_auth_error`, revisa permisos/API habilitada en Google AI Studio.

### El workspace de datos no aparece

- Confirma que la carga CSV termino correctamente.
- Revisa `GET /api/metrics`; si responde `DATASET_REQUIRED`, aun no hay dataset activo.

## Scripts disponibles

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run generate:sample`

## Estado del producto

El proyecto esta orientado a demo de hackathon con arquitectura modular y puntos de extension claros para:

- Autenticacion por usuarios
- Persistencia en base de datos
- Historial avanzado de conversaciones
- Paneles de observabilidad y costos de IA
