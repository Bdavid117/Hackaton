import fs from "node:fs";
import path from "node:path";

const pages = [
  "/",
  "/pricing",
  "/cursos",
  "/contacto",
  "/request-demo",
  "/blog",
  "/aws-training",
  "/azure-training",
];

const referers = ["https://google.com", "https://linkedin.com", "https://cloudlabslearning.com", "direct"];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(list) {
  return list[randInt(0, list.length - 1)];
}

function dateString(offsetDays = 0) {
  const d = new Date(Date.now() - offsetDays * 24 * 3600 * 1000);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function timeString() {
  const hh = String(randInt(8, 20)).padStart(2, "0");
  const mm = String(randInt(0, 59)).padStart(2, "0");
  return `${hh}:${mm}`;
}

const rows = [];
for (let i = 0; i < 500; i++) {
  const entry = pick(pages);
  const exit = Math.random() > 0.45 ? pick(pages) : entry;
  const pagesCount = randInt(1, 8);
  const clicks = randInt(0, 12);
  const durationSec = randInt(8, 520);
  const quickExit = pagesCount <= 1 && durationSec < 20 ? 1 : 0;
  const clicksPerPage = Number((clicks / Math.max(pagesCount, 1)).toFixed(2));
  const timePerPage = Number((durationSec / Math.max(pagesCount, 1)).toFixed(2));

  rows.push([
    dateString(randInt(0, 3)),
    timeString(),
    "00:00:00",
    `https://cloudlabslearning.com${entry}`,
    `https://cloudlabslearning.com${exit}`,
    pick(referers),
    `usr-${1000 + i}`,
    pick(["Chrome", "Edge", "Safari"]),
    pick(["PC", "Mobile"]),
    pick(["Windows", "Android", "iOS", "MacOS"]),
    pick(["Colombia", "Mexico", "Peru", "Chile"]),
    pagesCount,
    clicks,
    durationSec,
    quickExit,
    clicksPerPage,
    timePerPage,
    clicks + pagesCount,
    Math.random() > 0.8 ? 1 : 0,
    Number((Math.random() * 2 - 0.2).toFixed(3)),
    entry === "/" ? 1 : 0,
    pick([0, 1]),
  ]);
}

const header = [
  "fecha",
  "hora",
  "duracion_sesion",
  "direccion_url_entrada",
  "direccion_url_salida",
  "referente",
  "id_usuario_clarity",
  "explorador",
  "dispositivo",
  "sistema_operativo",
  "pais",
  "recuento_paginas",
  "clics_sesion",
  "duracion_sesion_segundos",
  "abandono_rapido",
  "clicks_por_pagina",
  "tiempo_por_pagina",
  "interaccion_total",
  "posible_frustracion",
  "standarized_engagement_score",
  "entrada_es_home",
  "trafico_externo",
];

const content = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
const outputDir = path.join(process.cwd(), "data");
const outputFile = path.join(outputDir, "sample_clarity.csv");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputFile, content, "utf-8");
console.log(`Dataset generado en ${outputFile} con ${rows.length} sesiones.`);
