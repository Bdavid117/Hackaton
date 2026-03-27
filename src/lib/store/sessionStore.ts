import type { ClaritySession } from "../data/loader";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

type SessionState = {
  datasetId: string;
  sessions: ClaritySession[];
  sourceName: string;
  updatedAt: string;
};

export type DatasetSummary = {
  datasetId: string;
  sourceName: string;
  updatedAt: string;
  sessionsCount: number;
};

type DatasetManifestEntry = DatasetSummary & {
  storageFile: string;
};

type DatasetsManifest = {
  activeDatasetId: string;
  datasets: DatasetManifestEntry[];
};

type StoreConfig = {
  maxDatasets: number;
};

const state: SessionState = {
  datasetId: "",
  sessions: [],
  sourceName: "",
  updatedAt: "",
};

const isVercel = Boolean(process.env.VERCEL) || Boolean(process.env.VERCEL_ENV);
const RUNTIME_ROOT = isVercel 
  ? path.join("/tmp", "hackaton-runtime")
  : path.join(process.cwd(), "data", "runtime");
const DATASETS_DIR = path.join(RUNTIME_ROOT, "datasets");
const MANIFEST_PATH = path.join(DATASETS_DIR, "manifest.json");
const LEGACY_SESSION_STORE_PATH = path.join(RUNTIME_ROOT, "session-store.json");
const DEFAULT_MAX_DATASETS = 10;

let hasLoadedFromDisk = false;
const manifest: DatasetsManifest = {
  activeDatasetId: "",
  datasets: [],
};

const config: StoreConfig = {
  maxDatasets: DEFAULT_MAX_DATASETS,
};

function createDatasetId() {
  return `${Date.now()}-${randomUUID().slice(0, 8)}`;
}

function getDatasetStorageFile(datasetId: string) {
  return `${datasetId}.json`;
}

function getDatasetStoragePath(storageFile: string) {
  return path.join(DATASETS_DIR, storageFile);
}

function normalizeSessionState(raw: unknown): SessionState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Partial<SessionState>;
  if (!Array.isArray(candidate.sessions)) return null;

  return {
    datasetId: typeof candidate.datasetId === "string" ? candidate.datasetId : "",
    sessions: candidate.sessions,
    sourceName: typeof candidate.sourceName === "string" ? candidate.sourceName : "",
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : "",
  };
}

async function writeManifest() {
  await mkdir(DATASETS_DIR, { recursive: true });
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest), "utf-8");
}

async function safeDeleteFile(filePath: string) {
  try {
    await unlink(filePath);
  } catch {
    // Ignora faltantes o bloqueos temporales para no romper flujo principal.
  }
}

function resolveMaxDatasets() {
  const raw = Number(import.meta.env.MAX_DATASET_VERSIONS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_MAX_DATASETS;
  return Math.floor(raw);
}

async function applyRetentionPolicy(keepValue?: number): Promise<string[]> {
  const keep = Math.max(keepValue ?? config.maxDatasets, 1);
  if (manifest.datasets.length <= keep) return [];

  const removed = manifest.datasets.slice(keep);
  manifest.datasets = manifest.datasets.slice(0, keep);

  await Promise.all(removed.map((entry) => safeDeleteFile(getDatasetStoragePath(entry.storageFile))));

  if (!manifest.datasets.some((entry) => entry.datasetId === manifest.activeDatasetId)) {
    manifest.activeDatasetId = "";
  }

  return removed.map((entry) => entry.datasetId);
}

async function migrateLegacyStoreIfPresent() {
  try {
    const raw = await readFile(LEGACY_SESSION_STORE_PATH, "utf-8");
    const normalized = normalizeSessionState(JSON.parse(raw));
    if (!normalized || normalized.sessions.length === 0) return;

    const datasetId = createDatasetId();
    const storageFile = getDatasetStorageFile(datasetId);
    const nextState: SessionState = {
      datasetId,
      sessions: normalized.sessions,
      sourceName: normalized.sourceName || "legacy-dataset.csv",
      updatedAt: normalized.updatedAt || new Date().toISOString(),
    };

    await writeFile(getDatasetStoragePath(storageFile), JSON.stringify(nextState), "utf-8");

    manifest.datasets = [
      {
        datasetId,
        sourceName: nextState.sourceName,
        updatedAt: nextState.updatedAt,
        sessionsCount: nextState.sessions.length,
        storageFile,
      },
    ];
    manifest.activeDatasetId = "";
    await writeManifest();
  } catch {
    // Si no hay archivo legacy o esta corrupto, continua sin migracion.
  }
}

async function loadManifestIfNeeded() {
  if (hasLoadedFromDisk) return;
  hasLoadedFromDisk = true;
  config.maxDatasets = resolveMaxDatasets();

  await mkdir(DATASETS_DIR, { recursive: true });

  try {
    const raw = await readFile(MANIFEST_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DatasetsManifest>;

    if (Array.isArray(parsed.datasets)) {
      manifest.datasets = parsed.datasets
        .filter((entry) => {
          return (
            typeof entry?.datasetId === "string" &&
            typeof entry?.sourceName === "string" &&
            typeof entry?.updatedAt === "string" &&
            typeof entry?.sessionsCount === "number" &&
            typeof entry?.storageFile === "string"
          );
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }

    const activeCandidate = typeof parsed.activeDatasetId === "string" ? parsed.activeDatasetId : "";

    // Nunca autoseleccionar dataset al arrancar: la activacion debe ser manual del usuario.
    manifest.activeDatasetId = "";
    if (activeCandidate) {
      await writeManifest();
    }
  } catch {
    await migrateLegacyStoreIfPresent();
  }
}

async function loadDatasetState(datasetId: string): Promise<SessionState | null> {
  const entry = manifest.datasets.find((item) => item.datasetId === datasetId);
  if (!entry) return null;

  try {
    const raw = await readFile(getDatasetStoragePath(entry.storageFile), "utf-8");
    const normalized = normalizeSessionState(JSON.parse(raw));
    if (!normalized) return null;

    return {
      datasetId: entry.datasetId,
      sessions: normalized.sessions,
      sourceName: normalized.sourceName || entry.sourceName,
      updatedAt: normalized.updatedAt || entry.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function setSessions(sessions: ClaritySession[], sourceName: string): Promise<SessionState> {
  await loadManifestIfNeeded();

  const datasetId = createDatasetId();
  const updatedAt = new Date().toISOString();
  const storageFile = getDatasetStorageFile(datasetId);

  const nextState: SessionState = {
    datasetId,
    sessions,
    sourceName,
    updatedAt,
  };

  await writeFile(getDatasetStoragePath(storageFile), JSON.stringify(nextState), "utf-8");

  manifest.datasets = [
    {
      datasetId,
      sourceName,
      updatedAt,
      sessionsCount: sessions.length,
      storageFile,
    },
    ...manifest.datasets,
  ];
  manifest.activeDatasetId = datasetId;

  await applyRetentionPolicy();

  await writeManifest();

  state.datasetId = datasetId;
  state.sessions = sessions;
  state.sourceName = sourceName;
  state.updatedAt = updatedAt;

  return state;
}

export async function setActiveDataset(datasetId: string): Promise<SessionState | null> {
  await loadManifestIfNeeded();

  const nextState = await loadDatasetState(datasetId);
  if (!nextState) return null;

  manifest.activeDatasetId = datasetId;
  await writeManifest();

  state.datasetId = nextState.datasetId;
  state.sessions = nextState.sessions;
  state.sourceName = nextState.sourceName;
  state.updatedAt = nextState.updatedAt;

  return state;
}

export async function listDatasets(): Promise<DatasetSummary[]> {
  await loadManifestIfNeeded();
  return manifest.datasets.map(({ datasetId, sourceName, updatedAt, sessionsCount }) => ({
    datasetId,
    sourceName,
    updatedAt,
    sessionsCount,
  }));
}

export async function deleteDataset(datasetId: string): Promise<{ deleted: boolean; activeDatasetId: string }> {
  await loadManifestIfNeeded();

  const entry = manifest.datasets.find((item) => item.datasetId === datasetId);
  if (!entry) {
    return { deleted: false, activeDatasetId: manifest.activeDatasetId };
  }

  manifest.datasets = manifest.datasets.filter((item) => item.datasetId !== datasetId);
  await safeDeleteFile(getDatasetStoragePath(entry.storageFile));

  if (manifest.activeDatasetId === datasetId) {
    manifest.activeDatasetId = "";
  }

  if (state.datasetId === datasetId) {
    state.datasetId = "";
    state.sessions = [];
    state.sourceName = "";
    state.updatedAt = "";
  }

  await writeManifest();

  return { deleted: true, activeDatasetId: manifest.activeDatasetId };
}

export async function cleanupDatasets(
  keepRecent: number
): Promise<{ removedDatasetIds: string[]; activeDatasetId: string }> {
  await loadManifestIfNeeded();

  const removedDatasetIds = await applyRetentionPolicy(keepRecent);
  await writeManifest();

  if (state.datasetId && !manifest.datasets.some((item) => item.datasetId === state.datasetId)) {
    state.datasetId = "";
    state.sessions = [];
    state.sourceName = "";
    state.updatedAt = "";
  }

  return {
    removedDatasetIds,
    activeDatasetId: manifest.activeDatasetId,
  };
}

export async function getActiveDatasetId(): Promise<string> {
  await loadManifestIfNeeded();
  return manifest.activeDatasetId;
}

export async function getSessions(): Promise<SessionState> {
  await loadManifestIfNeeded();

  if (!manifest.activeDatasetId) return state;

  if (state.datasetId === manifest.activeDatasetId && state.sessions.length > 0) {
    return state;
  }

  const activeState = await loadDatasetState(manifest.activeDatasetId);
  if (!activeState) {
    manifest.activeDatasetId = "";
    await writeManifest();
    state.datasetId = "";
    state.sessions = [];
    state.sourceName = "";
    state.updatedAt = "";
    return state;
  }

  state.datasetId = activeState.datasetId;
  state.sessions = activeState.sessions;
  state.sourceName = activeState.sourceName;
  state.updatedAt = activeState.updatedAt;

  return state;
}
