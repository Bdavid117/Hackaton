# Data & Growth Copilot

Convierte datos crudos de comportamiento web en decisiones de marketing y growth accionables en minutos, potenciado por IA.

Data & Growth Copilot combina analitica operativa con capacidades de lenguaje natural para responder preguntas complejas de negocio como:

- ¿Dónde estamos perdiendo conversión?
- ¿Qué subconjunto de páginas retienen mejor el tráfico calificado?
- ¿Qué acciones debe priorizar el equipo esta semana para levantar resultados?

## Propuesta de valor

- **Velocidad:** pasas de CSV a insights ejecutivos sin usar hojas de cálculo complejas.
- **Claridad Visual:** visualizaciones interactivas impulsadas por Plotly y respuestas del chat renderizadas en markdown limpio tipo burbuja.
- **Continuidad operativa & Anti-fragilidad:** aunque la API de Groq tenga timeout, agote cuota o falle, el sistema responde con un completo análisis local sin bloquear al usuario.
- **Gobierno de datos:** versionado de datasets para comparar cargas y mantener el contexto del negocio intacto durante el análisis.
- **Seguridad:** protección de \
Prompt
Injection\ incorporada en la raíz del backend para evitar suplantaciones de roles o tareas no orientadas a datos.

## Para quién es este producto

- Equipos de Growth y Performance Marketing.
- Product Managers que optimizan funnels digitales B2B / B2C.
- Equipos de CRO (Conversion Rate Optimization) y analítica digital.
- Líderes de negocio que necesitan una lectura ejecutiva (Insights), no sólo tablas.       

## Arquitectura y Flujos

### AI y UI
- Integración de **Groq (Llama 3)** para inferencia compleja.
- Gráficas responsivas e interactivas utilizando **Plotly.js**.
- UI del chat conversacional inspirada en aplicaciones de mensajería (burbujas, markdown a través de \marked.js\).

### Motores Internos
1. **Motor de Ingestión:** Upload de CSV, normalización y versionado en el Session Store.
2. **Motor de Métricas:** Cálculo de Top Pages, Exit Rate, Flujos de página a página, Engagement e Intención de Conversión.
3. **Capa de Decision Intelligence:** El usuario pregunta -> El backend selecciona un tool (ej. obtener base de datos) -> El Contexto se empaqueta junto a reglas estrictas -> Llama 3 devuelve la acción orientada a rentabilidad.

### Protecciones de IA
- *Fallback Local Automático:* Si falta saldo en la cuenta de Llama 3 (error 400) o hay exceso de peticiones, el sistema de fallback local formatea los hallazgos duros y simula una experiencia enriquecida de todas formas.
- *Filtros de Contexto:* En la capa del sistema (\ngine.ts\), existe directriz absoluta que detiene cualquier query fuera de analítica de sitios o negocios.

---

## 🚀 Despliegue en Vercel (Producción)

Este repositorio ha sido configurado robustamente para desplegarse mediante **Vercel** usando el adaptador serverless oficial (`@astrojs/vercel`).

### Arquitectura Serverless (Edge & Node.js)
El entorno ahora está construido puramente para funcionar sobre Serverless Functions (SSR), permitiendo:
1. **Subida Compaginada de Archivos (Chunking):** Superamos el estricto límite de payloads de 4.5MB en Vercel fraccionando grandes datasets (CSVs > 20MB) de lado del cliente en partes de 3MB y armándolos de forma nativa en la capa `/tmp` temporal de Vercel (`/api/upload-chunk`).
2. **Conexión API IA:** Usa directamente el Endpoint API compatible con OpenAI que provee **Groq** integrando el modelo ultrarrápido `llama-3.3-70b-versatile` asegurando tiempos de respuestas inmediatos en las funciones tipo chat.
3. **Escritura Segura de Sesiones:** Los CSV parseados en metadatos se guardan de forma segura bajo `os.tmpdir()` para evadir el error _"read-only filesystem"_ típico de ecosistemas severless.

> **Importante:** Recuerda añadir en tu entorno de producción de Vercel la variable de entorno `GROQ_API_KEY` para posibilitar que la plataforma complete las inferencias AI. El sistema Astro Serverless detectará la infraestructura Vercel de forma automática.

---

## Instalación y Ejecución local de manera completa

Para levantar el producto 100% operativo con su propio procesador de datos:

### Requisitos
- Node.js 22+
- npm

### Configuración

1. Instala dependencias:
\\\ash
npm install
\\\

2. Configura variables en archivo .env:
Copia \.env.example\ o crea \.env\ con:
\\\nv
GROQ_API_KEY=gsk_...
MAX_UPLOAD_BYTES=31457280
CHAT_RATE_LIMIT_MAX=20
CHAT_RATE_LIMIT_WINDOW_MS=60000
AI_TIMEOUT_MS=20000
MAX_DATASET_VERSIONS=10
\\\

3. Ejecuta en desarrollo:
\\\ash
npm run dev
\\\

4. Genera data de prueba si no tienes (en \/public\):
\\\ash
npm run generate:sample
\\\

## Estado de salud IA y métricas internas

El endpoint local interno detecta fallas y diferencia entre:
- Error de autenticación.
- Timeout del proveedor (Groq).
- Falta de fondos en la cuenta / Rate Limit excedido.

**¿Problemas de 400 bad request en el chat local?** Revisa si la clave Groq tiene fondos pre-cargados (Credits). El sistema mostrará un informe enriquecido *offline* en lugar de botar la app en caso de que falten fondos.
