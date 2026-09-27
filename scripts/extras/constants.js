/**
 * FateX Continued Themes — Extras (antigo "FateX Extras", de shrade)
 * Constantes e pequenos utilitários compartilhados pelos arquivos dos extras.
 */

export const MODULE_ID = "fatexcontinued-themes";
export const LEGACY_MODULE_ID = "fatex-extras";
export const SYSTEM_ID = "fatexcontinued";
export const LEGACY_SYSTEM_ID = "fatex";

export const MODULE_PATH = `modules/${MODULE_ID}`;
export const TEMPLATES_PATH = `${MODULE_PATH}/templates/extras`;
export const DICE_MODEL_PATH = `${MODULE_PATH}/assets/extras/dc_die.glb`;

// Id do "sistema de dados" no Dice So Nice (mantido do módulo original para não perder a escolha dos jogadores)
export const DICE_SYSTEM_ID = "fatex-extras";

// Página do autor original no Ko-fi (mensagem de apoio do FateX Extras)
export const KO_FI_URL = "https://ko-fi.com/shrade_himself";

export const isFateXContinued = () => game.system.id === SYSTEM_ID;
export const toElement = (value) => (value?.jquery ? value[0] : value) ?? null;

/** Carta de rolagem do FateX guardada na mensagem (escopo novo do sistema, ou o antigo ainda não migrado) */
export const getChatCard = (message) =>
  message?.flags?.[SYSTEM_ID]?.chatCard ?? message?.flags?.[LEGACY_SYSTEM_ID]?.chatCard ?? null;

/** Diálogo de confirmação (DialogV2); fechar a janela conta como "não" */
export async function confirmDialog(title, content) {
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title },
    content,
    rejectClose: false
  });
  return confirmed === true;
}

/** Só um GM (o ativo) executa tarefas que valem para o mundo todo */
export function isResponsibleGM() {
  if (!game.user.isGM) return false;
  const activeGM = game.users.activeGM;
  return !activeGM || activeGM.id === game.user.id;
}
