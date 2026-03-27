import type { APIRoute } from "astro";
import { errorJson, okJson } from "../../lib/http/response";
import { logAuditEvent } from "../../lib/observability/audit";
import { getRequestIdentity } from "../../lib/security/rateLimit";
import {
  cleanupDatasets,
  deleteDataset,
  getActiveDatasetId,
  listDatasets,
  setActiveDataset,
} from "../../lib/store/sessionStore";

export const GET: APIRoute = async () => {
  try {
    const [datasets, activeDatasetId] = await Promise.all([listDatasets(), getActiveDatasetId()]);

    return okJson({
      activeDatasetId,
      datasets,
    });
  } catch (error) {
    console.error("[api/datasets][GET]", error);
    return errorJson("No se pudo obtener la lista de datasets.", 500, "DATASETS_LIST_INTERNAL_ERROR");
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const actor = getRequestIdentity(request);
    const body = await request.json();
    const datasetId = String(body?.datasetId ?? "").trim();

    if (!datasetId) {
      return errorJson("Debes enviar datasetId.", 400, "DATASET_ID_REQUIRED");
    }

    const selected = await setActiveDataset(datasetId);

    if (!selected) {
      return errorJson("No se encontro el dataset solicitado.", 404, "DATASET_NOT_FOUND");
    }

    await logAuditEvent("activate_dataset", actor, {
      datasetId: selected.datasetId,
      sourceName: selected.sourceName,
      sessions: selected.sessions.length,
    });

    return okJson({
      datasetId: selected.datasetId,
      sourceName: selected.sourceName,
      updatedAt: selected.updatedAt,
      sessions: selected.sessions.length,
    });
  } catch (error) {
    console.error("[api/datasets][POST]", error);
    return errorJson("No se pudo activar el dataset.", 500, "DATASET_SELECT_INTERNAL_ERROR");
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const actor = getRequestIdentity(request);
    const body = await request.json();
    const datasetId = String(body?.datasetId ?? "").trim();

    if (!datasetId) {
      return errorJson("Debes enviar datasetId para eliminar.", 400, "DATASET_ID_REQUIRED");
    }

    const result = await deleteDataset(datasetId);

    if (!result.deleted) {
      return errorJson("No se encontro el dataset solicitado.", 404, "DATASET_NOT_FOUND");
    }

    const datasets = await listDatasets();

    await logAuditEvent("delete_dataset", actor, {
      deletedDatasetId: datasetId,
      activeDatasetId: result.activeDatasetId,
      remainingDatasets: datasets.length,
    });

    return okJson({
      deletedDatasetId: datasetId,
      activeDatasetId: result.activeDatasetId,
      datasets,
    });
  } catch (error) {
    console.error("[api/datasets][DELETE]", error);
    return errorJson("No se pudo eliminar el dataset.", 500, "DATASET_DELETE_INTERNAL_ERROR");
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const actor = getRequestIdentity(request);
    const body = await request.json();
    const keepRecentValue = Number(body?.keepRecent ?? NaN);

    if (!Number.isFinite(keepRecentValue) || keepRecentValue <= 0) {
      return errorJson("Debes enviar keepRecent como numero positivo.", 400, "KEEP_RECENT_INVALID");
    }

    const keepRecent = Math.floor(keepRecentValue);
    const result = await cleanupDatasets(keepRecent);
    const datasets = await listDatasets();

    await logAuditEvent("cleanup_datasets", actor, {
      keepRecent,
      removedCount: result.removedDatasetIds.length,
      removedDatasetIds: result.removedDatasetIds,
      activeDatasetId: result.activeDatasetId,
      remainingDatasets: datasets.length,
    });

    return okJson({
      keepRecent,
      removedDatasetIds: result.removedDatasetIds,
      activeDatasetId: result.activeDatasetId,
      datasets,
    });
  } catch (error) {
    console.error("[api/datasets][PUT]", error);
    return errorJson("No se pudo limpiar datasets antiguos.", 500, "DATASET_CLEANUP_INTERNAL_ERROR");
  }
};