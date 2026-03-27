import { withButtonLoading } from "./ui-utils.js";

export function populateDatasetSelect(dom, datasets, activeDatasetId) {
  dom.datasetSelect.innerHTML = "";

  if (!datasets || datasets.length === 0) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Sin datasets cargados";
    dom.datasetSelect.appendChild(emptyOption);
    dom.datasetSelect.disabled = true;
    dom.activateDatasetBtn.disabled = true;
    dom.deleteDatasetBtn.disabled = true;
    dom.cleanupDatasetsBtn.disabled = true;
    return;
  }

  dom.datasetSelect.disabled = false;
  dom.activateDatasetBtn.disabled = false;
  dom.deleteDatasetBtn.disabled = false;
  dom.cleanupDatasetsBtn.disabled = false;

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Selecciona un dataset para activarlo";
  dom.datasetSelect.appendChild(defaultOption);

  datasets.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.datasetId;
    const time = item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "sin fecha";
    option.textContent = item.sourceName + " | " + item.sessionsCount + " sesiones | " + time;
    dom.datasetSelect.appendChild(option);
  });

  dom.datasetSelect.value = activeDatasetId || "";
}

export async function syncDatasets(ctx) {
  const res = await fetch("/api/datasets");
  const data = await res.json();

  if (!res.ok) {
    ctx.setStatus(ctx.dom.uploadStatus, data.error || "No se pudo consultar datasets.", true);
    return null;
  }

  populateDatasetSelect(ctx.dom, data.datasets ?? [], data.activeDatasetId);

  if (ctx.state.sessionUploadCompleted) {
    ctx.showAdvancedDatasetControls?.();
  }

  return {
    activeDatasetId: data.activeDatasetId || "",
    datasets: data.datasets ?? [],
  };
}

export function bindDatasetActions(ctx) {
  const { dom } = ctx;

  dom.uploadBtn.addEventListener("click", async () => {
    const file = dom.csvFile.files?.[0];
    if (!file) {
      ctx.setStatus(dom.uploadStatus, "Selecciona un CSV antes de cargar.", true);
      return;
    }

    if (typeof ctx.state.maxUploadBytes === "number" && file.size > ctx.state.maxUploadBytes) {
      const fileMB = Number((file.size / (1024 * 1024)).toFixed(2));
      const maxMB = Number((ctx.state.maxUploadBytes / (1024 * 1024)).toFixed(2));
      ctx.setStatus(
        dom.uploadStatus,
        "El archivo pesa " + fileMB + "MB y supera el limite de " + maxMB + "MB. Ajusta MAX_UPLOAD_BYTES o usa un CSV menor.",
        true
      );
      return;
    }

    await withButtonLoading(dom.uploadBtn, "Procesando...", async () => {
      ctx.setStatus(dom.uploadStatus, "Preparando subida...");
      const chunkSize = 3 * 1024 * 1024;
      const totalChunks = Math.ceil(file.size / chunkSize);
      const uploadId = crypto.randomUUID();
      let lastData = null;

      for (let i = 0; i < totalChunks; i++) {
        ctx.setStatus(dom.uploadStatus, `Subiendo parte ${i + 1} de ${totalChunks}...`);
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append("chunk", chunk);
        formData.append("uploadId", uploadId);
        formData.append("chunkIndex", i);
        formData.append("totalChunks", totalChunks);
        formData.append("fileName", file.name);

        const res = await fetch("/api/upload-chunk", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          ctx.setStatus(dom.uploadStatus, data.error || `Error en la parte ${i + 1}`, true);
          return;
        }

        if (data.completed) {
          lastData = data;
        }
      }

      ctx.state.sessionUploadCompleted = true;
      ctx.showAdvancedDatasetControls?.();
      ctx.setStatus(dom.uploadStatus, "Archivo compaginado con éxito: " + lastData.fileName + " (" + lastData.sessions + " sesiones)");
      await ctx.syncDatasets();
      await ctx.refreshMetrics();
    }, dom.appMain);
  });

  dom.refreshBtn.addEventListener("click", async () => {
    await withButtonLoading(dom.refreshBtn, "Actualizando...", async () => {
      await ctx.syncDatasets();
      await ctx.refreshMetrics();
    }, dom.appMain);
  });

  dom.activateDatasetBtn.addEventListener("click", async () => {
    const datasetId = dom.datasetSelect.value;
    if (!datasetId) return;

    await withButtonLoading(dom.activateDatasetBtn, "Activando...", async () => {
      ctx.setStatus(dom.uploadStatus, "Activando dataset...");
      const res = await fetch("/api/datasets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId }),
      });
      const data = await res.json();

      if (!res.ok) {
        ctx.setStatus(dom.uploadStatus, data.error || "No se pudo activar el dataset.", true);
        return;
      }

      ctx.setStatus(dom.uploadStatus, "Dataset activo: " + data.sourceName + " (" + data.sessions + " sesiones)");
      await ctx.syncDatasets();
      await ctx.refreshMetrics();
    }, dom.appMain);
  });

  dom.deleteDatasetBtn.addEventListener("click", async () => {
    const datasetId = dom.datasetSelect.value;
    if (!datasetId) return;

    const confirmDelete = confirm("Esta accion eliminara el dataset seleccionado de forma permanente. Deseas continuar?");
    if (!confirmDelete) return;

    await withButtonLoading(dom.deleteDatasetBtn, "Eliminando...", async () => {
      ctx.setStatus(dom.uploadStatus, "Eliminando dataset...");
      const res = await fetch("/api/datasets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId }),
      });
      const data = await res.json();

      if (!res.ok) {
        ctx.setStatus(dom.uploadStatus, data.error || "No se pudo eliminar el dataset.", true);
        return;
      }

      ctx.setStatus(dom.uploadStatus, "Dataset eliminado: " + data.deletedDatasetId);
      await ctx.syncDatasets();
      await ctx.refreshMetrics();
    }, dom.appMain);
  });

  dom.cleanupDatasetsBtn.addEventListener("click", async () => {
    const keepRaw = prompt("Cuantas versiones recientes deseas conservar?", "5");
    if (!keepRaw) return;
    const keepRecent = Number(keepRaw);
    if (!Number.isFinite(keepRecent) || keepRecent <= 0) {
      ctx.setStatus(dom.uploadStatus, "Ingresa un numero valido mayor a 0.", true);
      return;
    }

    await withButtonLoading(dom.cleanupDatasetsBtn, "Limpiando...", async () => {
      ctx.setStatus(dom.uploadStatus, "Limpiando datasets antiguos...");
      const res = await fetch("/api/datasets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keepRecent: Math.floor(keepRecent) }),
      });
      const data = await res.json();

      if (!res.ok) {
        ctx.setStatus(dom.uploadStatus, data.error || "No se pudo limpiar datasets.", true);
        return;
      }

      ctx.setStatus(
        dom.uploadStatus,
        "Limpieza completada. Eliminados: " + (data.removedDatasetIds?.length || 0) + ". Conservados: " + (data.datasets?.length || 0) + "."
      );
      await ctx.syncDatasets();
      await ctx.refreshMetrics();
    }, dom.appMain);
  });
}

