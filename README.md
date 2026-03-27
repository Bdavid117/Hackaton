# Data & Growth Copilot

Convierte datos crudos de comportamiento web en decisiones de marketing y growth accionables en minutos, potenciado por IA.

Data & Growth Copilot combina analitica operativa con capacidades de lenguaje natural para responder preguntas complejas de negocio como:

- ¿Dónde estamos perdiendo conversión?
- ¿Qué subconjunto de páginas retienen mejor el tráfico calificado?
- ¿Qué acciones debe priorizar el equipo esta semana para levantar resultados?

## Propuesta de valor

- **Velocidad:** pasas de CSV a insights ejecutivos sin usar hojas de cálculo complejas.
- **Claridad Visual:** visualizaciones interactivas impulsadas por Plotly y respuestas del chat renderizadas en markdown limpio tipo burbuja.
- **Continuidad operativa & Anti-fragilidad:** aunque la API de Anthropic tenga timeout, agote cuota o falle, el sistema responde con un completo análisis local sin bloquear al usuario.
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
- Integración de **Anthropic Claude 3** para inferencia compleja.
- Gráficas responsivas e interactivas utilizando **Plotly.js**.
- UI del chat conversacional inspirada en aplicaciones de mensajería (burbujas, markdown a través de \marked.js\).

### Motores Internos
1. **Motor de Ingestión:** Upload de CSV, normalización y versionado en el Session Store.
2. **Motor de Métricas:** Cálculo de Top Pages, Exit Rate, Flujos de página a página, Engagement e Intención de Conversión.
3. **Capa de Decision Intelligence:** El usuario pregunta -> El backend selecciona un tool (ej. obtener base de datos) -> El Contexto se empaqueta junto a reglas estrictas -> Claude devuelve la acción orientada a rentabilidad.

### Protecciones de IA
- *Fallback Local Automático:* Si falta saldo en la cuenta de Claude (error 400) o hay exceso de peticiones, el sistema de fallback local formatea los hallazgos duros y simula una experiencia enriquecida de todas formas.
- *Filtros de Contexto:* En la capa del sistema (\ngine.ts\), existe directriz absoluta que detiene cualquier query fuera de analítica de sitios o negocios.

---

## 🚀 Despliegue en GitHub Pages

Este repositorio está configurado y altamente optimizado para desplegarse mediante GitHub Actions hacia GitHub Pages. 

### ¡Atención sobre el Entorno SSR!
La aplicación actual ha sido construida con una arquitectura \Astro SSR (Server-Side Rendering)\ usando \@astrojs/node\ dado a que la aplicación necesita un runtime de Node.js permanente para:
1. Parsear, procesar y almacenar archivos CSV (\/api/upload\).
2. Conectarse de forma encriptada y segura a la API de Anthropic a través de \/api/chat\.
3. Consultar métricas dinámicas (\/api/metrics\).

> **Nota importante sobre GitHub Pages:** Dado que GitHub pages es un hosting de archivos exclusivamente estáticos (SSG), los endpoints \/api\ (Astro SSR) **no funcionarán inherentemente en el live de páginas de GitHub.** 
> 
> *Solución corporativa recomendada:* Si se busca mostrar el panel al público, recomendamos hospedar la API backend en **Vercel, Render o Railway** y configurar en modo \static\ el front-end de Astro, o derechamente hacer deploy del bloque a una plataforma Full-stack (ej: Netlify o Vercel donde Node ejecuta Edge Functions automáticamente). 

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
ANTHROPIC_API_KEY=sk-ant-api03-xxxx...
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
- Timeout del proveedor (Anthropic).
- Falta de fondos en la cuenta / Rate Limit excedido.

**¿Problemas de 400 bad request en el chat local?** Revisa si la clave Anthropic tiene fondos pre-cargados (Credits). El sistema mostrará un informe enriquecido *offline* en lugar de botar la app en caso de que falten fondos.
