import { withButtonLoading } from "./ui-utils.js";

function setGeminiStatusUI(dom, mode, badgeText, detailText) {
  dom.geminiStatusBadge.textContent = badgeText;
  dom.geminiStatusBadge.classList.remove("warn", "ok", "error");
  dom.geminiStatusBadge.classList.add(mode);
  dom.geminiStatusText.textContent = detailText;
}

function setChatEnabled(dom, enabled) {
  dom.chatBtn.disabled = !enabled;
  dom.chatInput.disabled = !enabled;

  const quickButtons = dom.quickQuestions?.querySelectorAll("button[data-question]") ?? [];
  quickButtons.forEach((button) => {
    button.disabled = !enabled;
  });
}

export async function refreshGeminiHealth(ctx, options = {}) {
  const deep = options?.deep === true;

  try {
    const endpoint = deep ? "/api/health?deep=1" : "/api/health";
    const res = await fetch(endpoint);
    const data = await res.json();

    if (!res.ok) {
      ctx.state.geminiReady = false;
      setChatEnabled(ctx.dom, false);
      setGeminiStatusUI(
        ctx.dom,
        "error",
        "Gemini no disponible",
        data.error || "No se pudo verificar el estado de Gemini."
      );
      return;
    }

    if (typeof data?.limits?.maxUploadBytes === "number") {
      ctx.state.maxUploadBytes = data.limits.maxUploadBytes;
      ctx.state.maxUploadMB = data.limits.maxUploadMB;
    }

    const status = data?.gemini?.status;
    const ready = Boolean(data?.gemini?.ready);
    ctx.state.geminiReady = ready;
    
    // Habilitar chat siempre que haya una clave, para usar el fallback local si Gemini falla
    const canUseChat = status !== "missing_key" && status !== "invalid_key_format";
    ctx.state.chatEnabled = canUseChat;
    setChatEnabled(ctx.dom, canUseChat);

    if (ready) {
      setGeminiStatusUI(
        ctx.dom,
        "ok",
        "Gemini listo",
        data?.gemini?.probeMessage || "Gemini disponible y respondiendo correctamente."
      );
      return;
    }

    if (status === "invalid_key_format") {
      setGeminiStatusUI(
        ctx.dom,
        "error",
        "Clave API invalida",
        "El formato de GEMINI_API_KEY no coincide con una clave valida."
      );
      return;
    }

    if (status === "provider_auth_error") {
      setGeminiStatusUI(
        ctx.dom,
        "error",
        "Gemini rechazo autenticacion",
        data?.gemini?.probeMessage || "La API Key no tiene permisos validos para este proyecto."
      );
      return;
    }

    if (status === "provider_timeout") {
      setGeminiStatusUI(
        ctx.dom,
        "warn",
        "Gemini lento o sin respuesta",
        data?.gemini?.probeMessage || "Gemini excedio el tiempo de espera. Reintenta en unos segundos."
      );
      return;
    }

    if (status === "provider_quota_exceeded") {
      setGeminiStatusUI(
        ctx.dom,
        "warn",
        "Modo Offline (Sin Cuota AI)",
        "La clave se leyo bien pero Google rechaza por cuota superada (o limite 0 en tu region). El chat usara modelo de fallback."
      );
      return;
    }

    if (status === "provider_unreachable") {
      setGeminiStatusUI(
        ctx.dom,
        "warn",
        "Gemini no alcanzable",
        data?.gemini?.probeMessage || "No se pudo conectar con Gemini en este momento."
      );
      return;
    }

    setGeminiStatusUI(
      ctx.dom,
      "warn",
      "Gemini no configurado",
      "Define GEMINI_API_KEY en .env y reinicia el servidor para habilitar el chat."
    );
  } catch {
    ctx.state.geminiReady = false;
    setChatEnabled(ctx.dom, false);
    setGeminiStatusUI(
      ctx.dom,
      "error",
      "Sin conexion de estado",
      "No fue posible consultar el endpoint /api/health."
    );
  }
}

export function bindHealthActions(ctx) {
  ctx.dom.refreshGeminiHealthBtn.addEventListener("click", async () => {
    await withButtonLoading(ctx.dom.refreshGeminiHealthBtn, "Validando...", async () => {
      await refreshGeminiHealth(ctx, { deep: true });
    }, ctx.dom.appMain);
  });
}
