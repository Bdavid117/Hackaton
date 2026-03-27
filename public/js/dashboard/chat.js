import { withButtonLoading } from "./ui-utils.js";

function addMessage(chatBox, type, text) {
  const div = document.createElement("div");
  div.className = "msg " + type;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function buildErrorHint(code) {
  if (code === "DATASET_REQUIRED") return "Carga o activa un dataset antes de preguntar.";
  if (code === "GEMINI_TIMEOUT") return "Haz una pregunta mas concreta para reducir el tiempo de respuesta.";
  if (code === "GEMINI_AUTH") return "Verifica permisos de la API Key en el proyecto de Gemini.";
  if (code === "RATE_LIMIT") return "Espera unos segundos para volver a consultar.";
  return "Reintenta y si persiste revisa el estado de Gemini en la cabecera.";
}

async function sendChatMessage(ctx, rawMessage) {
  if (!ctx.state.geminiReady) {
    ctx.setStatus(
      ctx.dom.chatStatus,
      "Gemini no esta listo. Revisa el estado en la cabecera y usa Revalidar.",
      true
    );
    return;
  }

  const message = String(rawMessage ?? "").trim();
  if (!message) return;

  addMessage(ctx.dom.chatBox, "user", message);
  ctx.dom.chatInput.value = "";
  ctx.setStatus(ctx.dom.chatStatus, "Consultando a Gemini...");

  await withButtonLoading(ctx.dom.chatBtn, "Consultando...", async () => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    if (!res.ok) {
      const hint = buildErrorHint(data?.code);
      const fullError = (data.error || "No pude responder en este momento.") + "\nSugerencia: " + hint;
      ctx.setStatus(ctx.dom.chatStatus, data.error || "Error en chat", true);
      addMessage(ctx.dom.chatBox, "bot", fullError);
      return;
    }

    const toolsUsed = Array.isArray(data?.toolsUsed) ? data.toolsUsed.join(", ") : data.tool;
    ctx.setStatus(ctx.dom.chatStatus, "Respuesta generada con: " + toolsUsed);
    if (data?.sourceName) {
      ctx.dom.chatDataset.textContent = "Dataset activo para chat: " + data.sourceName;
    }
    addMessage(ctx.dom.chatBox, "bot", data.answer);
  }, ctx.dom.appMain);
}

export function bindChatActions(ctx) {
  addMessage(
    ctx.dom.chatBox,
    "bot",
    "Hola. Soy tu copiloto de marketing. Respondo en base al dataset activo con acciones priorizadas para conversion y retencion."
  );

  ctx.dom.chatBtn.addEventListener("click", async () => {
    await sendChatMessage(ctx, ctx.dom.chatInput.value);
  });

  ctx.dom.chatInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await sendChatMessage(ctx, ctx.dom.chatInput.value);
    }
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isFormField =
      target instanceof HTMLElement &&
      (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");

    if (event.key === "/" && !isFormField) {
      event.preventDefault();
      ctx.dom.chatInput.focus();
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      ctx.dom.chatInput.focus();
    }
  });

  ctx.dom.quickQuestions.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-question]");
    if (!button) return;
    await sendChatMessage(ctx, button.dataset.question || "");
  });
}
