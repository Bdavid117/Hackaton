export async function refreshGeminiHealth(ctx, options = {}) {
  // Ya no necesitamos badges de estado de IA en la UI manual
  // El backend manejara las cuotas y fallbacks automaticamente
  ctx.state.chatEnabled = true;
}

export function bindHealthActions(ctx) {
  // Sin UI de health especifica para evitar clutter
}
