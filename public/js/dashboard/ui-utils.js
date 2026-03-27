export function setStatus(el, text, isError = false) {
  el.textContent = text;
  el.classList.toggle("error", Boolean(isError));
}

export function setBusy(el, isBusy) {
  if (!el) return;
  el.setAttribute("aria-busy", isBusy ? "true" : "false");
}

export async function withButtonLoading(button, loadingText, task, busyEl) {
  const originalText = button.textContent;
  button.disabled = true;
  if (loadingText) button.textContent = loadingText;
  setBusy(busyEl, true);
  try {
    return await task();
  } finally {
    setBusy(busyEl, false);
    button.disabled = false;
    button.textContent = originalText;
  }
}

export function fillTable(id, rows, columns) {
  const table = document.querySelector("#" + id + " tbody");
  table.innerHTML = "";

  if (!rows || rows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = columns.length;
    td.textContent = "Sin datos";
    tr.appendChild(td);
    table.appendChild(tr);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    columns.forEach((key) => {
      const td = document.createElement("td");
      td.textContent = row[key] ?? "-";
      tr.appendChild(td);
    });
    table.appendChild(tr);
  });
}

export function csvEscape(value) {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes("\n") || raw.includes('"')) {
    return '"' + raw.replaceAll('"', '""') + '"';
  }
  return raw;
}
