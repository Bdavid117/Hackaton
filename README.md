# Marketing Copilot - Astro + Gemini

MVP para hackathon que analiza comportamiento web (estilo Microsoft Clarity) y responde preguntas de negocio en lenguaje natural con soporte de Gemini.

## Stack

- Astro 6
- TypeScript
- Gemini (`@google/genai`)
- PapaParse

## Funcionalidades

- Carga de CSV desde la UI.
- Capa de interpretacion de marketing con:
  - Resumen ejecutivo
  - Fortalezas y riesgos
  - Oportunidades
  - Acciones recomendadas con horizonte e impacto
  - Enfoque por objetivo de negocio (leads, retencion, engagement)
  - Segmentacion por dispositivo y canal
  - Exportacion CSV del resumen ejecutivo
- Motor analitico con metricas clave:
  - Top pages
  - Exit rate
  - Flujos frecuentes
  - Interaccion promedio
  - Conversion intent
- Insights adicionales:
  - Paginas fantasma
  - Sesiones de alta intencion
  - Caida de embudo
- Chat de copiloto con respuestas:
  - Dato clave
  - Interpretacion
  - Accion recomendada

## Requisitos

- Node.js 22+
- Clave de Gemini

## Instalacion

1. Instalar dependencias:

```bash
npm install
```

1. Configurar entorno:

```bash
cp .env.example .env
```

Luego edita `.env` y define `GEMINI_API_KEY`.

Variables opcionales recomendadas para entorno profesional:

- `MAX_UPLOAD_BYTES` (default `10485760`): limite maximo del archivo CSV en bytes.
- `CHAT_RATE_LIMIT_MAX` (default `20`): maximo de consultas de chat por ventana.
- `CHAT_RATE_LIMIT_WINDOW_MS` (default `60000`): ventana de rate limit en milisegundos.
- `GEMINI_TIMEOUT_MS` (default `20000`): timeout de llamada a Gemini.
- `GEMINI_MAX_RETRIES` (default `2`): cantidad de reintentos en errores transitorios.
- `MAX_DATASET_VERSIONS` (default `10`): cantidad maxima de versiones de dataset retenidas.

1. Ejecutar en desarrollo:

```bash
npm run dev
```

## Uso rapido

1. Abre la app en `http://localhost:4321`.
1. Carga un CSV (puedes usar `data/datasets/1_Data_Recordings.csv` o `data/datasets/2_Data_Metrics.csv`).
1. Pulsa **Cargar y Procesar**.
1. Haz preguntas en el chat.

## Dataset sintetico opcional

```bash
npm run generate:sample
```

Genera `data/sample_clarity.csv` para pruebas y demo.

## Organizacion de datos

- Datasets base del proyecto: `data/datasets/`.
- Estado y manifiesto del dataset activo: `data/runtime/datasets/manifest.json`.
- Historial versionado de cargas: `data/runtime/datasets/*.json`.
- Auditoria operativa (JSONL): `data/runtime/audit/events.jsonl`.

## Preguntas demo recomendadas

- Cuales son las paginas con mayor trafico y que porcentaje concentran?
- En que paginas abandonan mas los usuarios?
- Cual es el flujo mas frecuente antes de llegar a pricing o demo?
- Que porcentaje muestra intencion de conversion?
- Hay paginas que atraen trafico pero no retienen?

## Notas de implementacion

- El estado de sesiones se mantiene en memoria del servidor para simplificar el MVP.
- El estado del ultimo CSV cargado se persiste automaticamente en disco.
- Cada carga CSV crea una nueva version de dataset y puedes activarla desde la UI.
- Puedes eliminar datasets desde la UI; el sistema reasigna automaticamente el dataset activo.
- Puedes limpiar datasets antiguos desde la UI manteniendo solo N versiones recientes.
- Las acciones criticas (upload, activar, eliminar, limpieza, chat) quedan registradas en auditoria.
- El dashboard incluye panel de auditoria operativa con eventos recientes.
- El endpoint de chat incluye rate limiting en memoria para proteger cuota y estabilidad.
- El endpoint de upload valida extension `.csv` y limite de tamano configurable.
- El dashboard prioriza lectura estrategica de negocio por encima de tablas tecnicas.
