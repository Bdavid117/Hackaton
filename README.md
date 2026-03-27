# Marketing Copilot

Convierte datos crudos de comportamiento web en decisiones de marketing accionables en minutos.

Marketing Copilot combina analitica operativa con IA para responder preguntas de negocio como:

- Donde estamos perdiendo conversion.
- Que paginas retienen mejor el trafico calificado.
- Que acciones priorizar esta semana para mejorar resultados.

## Propuesta de valor

- Velocidad: pasas de CSV a insights ejecutivos sin hojas de calculo manuales.
- Claridad: te muestra datos, interpretacion y accion sugerida en un mismo flujo.
- Continuidad operativa: aunque Gemini tenga timeout o cuota, el sistema responde con analisis local.
- Gobierno de datos: versionado de datasets para comparar cargas y mantener historial reciente.

## Para quien es este producto

- Equipos de Growth y Performance Marketing.
- Product Managers que optimizan funnels digitales.
- Equipos de CRO y analitica digital.
- Lideres de negocio que necesitan una lectura ejecutiva, no solo tablas.

## Como interactua el usuario con el programa

### 1. Inicio simple, sin friccion

Al abrir la app, el usuario ve solo dos acciones principales:

- Cargar archivo CSV.
- Preguntar al chat.

No se muestra un dataset por defecto. Esto evita tomar decisiones con datos antiguos por error.

### 2. Carga y procesamiento

El usuario sube su CSV de eventos y el sistema:

- Valida formato y tamano.
- Crea una nueva version de dataset.
- Activa el dataset para el analisis actual.

Cuando termina, se habilita automaticamente el workspace de datos procesados.

### 3. Exploracion en workspace analitico

El usuario navega tres vistas principales:

- Resumen: lectura ejecutiva de estado general.
- Insights: hallazgos con foco en oportunidad y riesgo.
- Tablas: detalle para analistas y validacion de hallazgos.

### 4. Conversacion con copiloto

El chat permite preguntas abiertas de negocio y devuelve respuestas estructuradas con:

- Dato clave.
- Interpretacion del comportamiento.
- Accion recomendada.

Ejemplos de preguntas:

- Que paginas tienen mas trafico pero peor salida?
- Donde enfoco presupuesto para aumentar conversion?
- Que friccion se observa en el recorrido antes de pricing o demo?

## Flujos funcionales internos

### Flujo A: Ingestion y versionado

1. Upload de CSV.
2. Parseo y normalizacion de datos.
3. Persistencia en version nueva.
4. Actualizacion de manifiesto de datasets.
5. Activacion del dataset para metricas y chat.

Resultado: trazabilidad y control de cambios en cada carga.

### Flujo B: Motor de metricas

1. Lectura del dataset activo.
2. Calculo de KPIs y agregaciones.
3. Identificacion de patrones e insights.
4. Entrega en endpoints para dashboard y chat.

Resultado: visibilidad de comportamiento y puntos de palanca para decisiones.

### Flujo C: Decision Intelligence con IA

1. El usuario pregunta en lenguaje natural.
2. El sistema selecciona herramientas analiticas segun la pregunta.
3. Se construye contexto con dataset activo y metricas relevantes.
4. Gemini genera respuesta orientada a accion.
5. Si Gemini falla, se aplica fallback local para no interrumpir el analisis.

Resultado: continuidad de consulta aun con incidencias del proveedor.

## Que datos y metricas muestra para tomar decisiones

### KPIs operativos principales

- Top Pages: identifica donde se concentra el trafico.
- Exit Rate: detecta paginas con abandono alto.
- Flujos frecuentes: muestra rutas reales de navegacion.
- Interaccion promedio: evalua profundidad de engagement.
- Conversion Intent: aproxima intencion de conversion.

### Insights de negocio

- Paginas fantasma: trafico sin progresion clara.
- Sesiones de alta intencion: comportamiento cercano a conversion.
- Caida de embudo: puntos del recorrido donde se rompe el avance.

### Como convertir metricas en decisiones

- Top Pages alto + Exit alto: optimizar mensaje, CTA y performance en esas paginas.
- Flujo frecuente con corte temprano: redisenar secuencia o reducir friccion del paso intermedio.
- Conversion Intent bajo en trafico calificado: ajustar oferta, formulario o prueba social.
- Paginas fantasma recurrentes: simplificar arquitectura de contenido y enlaces internos.

## Mapa rapido de decision para equipos de marketing

- Si buscas volumen: prioriza paginas top con mejor retencion.
- Si buscas eficiencia: ataca primero las paginas con mayor salida y trafico.
- Si buscas conversion: enfoca experimentos en pasos previos a pricing, demo o checkout.
- Si buscas rentabilidad: cruza hallazgos del chat con costo por canal y tasa de avance.

## Estado de salud IA y continuidad

El endpoint de salud informa si Gemini esta listo y diferencia entre:

- Error de autenticacion o permisos.
- Timeout del proveedor.
- Cuota o rate limit excedido.
- Proveedor no alcanzable.

Incluso en estados no listos, el producto mantiene respuestas de fallback para no detener la operacion.

## Arquitectura tecnica resumida

- Frontend Astro con dashboard modular en public/js/dashboard.
- API routes en src/pages/api para upload, metricas, chat y health.
- Capa IA en src/lib/ai con orquestacion de tools y respuesta estructurada.
- Capa de datos en src/lib/data para parseo, metricas e insights.
- Store en src/lib/store/sessionStore para versionado y dataset activo.

## Instalacion y puesta en marcha

### Requisitos

- Node.js 22+
- npm

### Configuracion

1. Instala dependencias:

```bash
npm install
```

2. Configura variables en archivo .env:

```env
GEMINI_API_KEY=AIza...
MAX_UPLOAD_BYTES=31457280
CHAT_RATE_LIMIT_MAX=20
CHAT_RATE_LIMIT_WINDOW_MS=60000
GEMINI_TIMEOUT_MS=20000
GEMINI_MAX_RETRIES=2
MAX_DATASET_VERSIONS=10
```

3. Ejecuta en desarrollo:

```bash
npm run dev
```

### Comandos utiles

- npm run dev
- npm run build
- npm run preview
- npm run generate:sample

## FAQ para operacion comercial

### Cambie API key y veo sin cuota

Si la app indica provider_quota_exceeded con key configurada y formato valido, la lectura de clave funciona. El limite proviene de la cuenta o proyecto asociado a esa clave en Google AI.

### El workspace de datos procesados no aparece

Se habilita cuando hay una carga CSV valida y activa. Si no hay dataset activo, la app evita mostrar analitica para no inducir decisiones con datos inexistentes.

## Roadmap recomendado

- Segmentacion por canal de adquisicion y cohortes.
- Priorizacion automatica de backlog de experimentos.
- Integracion con BI y fuentes en tiempo real.
- Alertas proactivas sobre caidas de conversion.
