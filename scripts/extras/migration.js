import { MODULE_ID, LEGACY_MODULE_ID, SYSTEM_ID, LEGACY_SYSTEM_ID, isResponsibleGM } from "./constants.js";
import { AspectStorage } from "./aspect-storage.js";

/**
 * Migração do antigo "fatex-extras": copia configurações e dados salvos por ele para este módulo, sem apagar nada.
 * O GM ativo faz a parte do mundo uma única vez; a configuração "modo escuro" é por navegador e cada usuário
 * copia a sua.
 */

const WORLD_SETTINGS = [
  "sceneDrawingFont",
  "sceneDrawingBgAlpha",
  "sceneDrawingShowTags",
  "sceneDrawingShowHostile",
  "sceneDrawingShowInvokes",
  "sceneDrawingStrokeColor",
  "sceneDrawingStrokeAlpha",
  "showKoFiMessage",
  "koFiDismissed"
];

export function legacyExtrasMigrated() {
  try {
    return !!game.settings.get(MODULE_ID, "legacyExtrasMigrated");
  } catch (err) {
    return true;
  }
}

export async function migrateLegacyClientSettings() {
  const storage = game.settings.storage.get("client") ?? globalThis.localStorage;
  if (!storage) return;
  const legacy = storage.getItem(`${LEGACY_MODULE_ID}.darkMode`);
  if (legacy === null || storage.getItem(`${MODULE_ID}.darkMode`) !== null) return;
  try {
    await game.settings.set(MODULE_ID, "darkMode", JSON.parse(legacy));
  } catch (err) {
    console.warn(`${MODULE_ID} | Não foi possível migrar a configuração darkMode`, err);
  }
}

export async function migrateLegacyExtras() {
  if (!isResponsibleGM() || legacyExtrasMigrated()) return;

  // Configurações de mundo
  const worldSettings = [...(game.settings.storage.get("world")?.values?.() ?? [])];
  const storedKeys = new Set(worldSettings.map(s => s.key));
  for (const key of WORLD_SETTINGS) {
    const legacy = worldSettings.find(s => s.key === `${LEGACY_MODULE_ID}.${key}`);
    if (!legacy || storedKeys.has(`${MODULE_ID}.${key}`)) continue;
    let value = legacy._source?.value ?? legacy.value;
    if (typeof value === "string") {
      try { value = JSON.parse(value); } catch (err) { /* mantém o texto */ }
    }
    try {
      await game.settings.set(MODULE_ID, key, value);
    } catch (err) {
      console.warn(`${MODULE_ID} | Não foi possível migrar a configuração ${key}`, err);
    }
  }

  // O diário com os aspectos de cena, categorias, etiquetas e invocações é adotado por AspectStorage.getStorage()
  await AspectStorage.getStorage();

  // Invocações grátis marcadas nos aspectos e consequências das fichas
  const itemChanges = (items) => items
    .filter(item => item.flags?.[LEGACY_MODULE_ID]?.freeInvokes !== undefined && item.getFlag(MODULE_ID, "freeInvokes") === undefined)
    .map(item => ({ _id: item.id, [`flags.${MODULE_ID}.freeInvokes`]: item.flags[LEGACY_MODULE_ID].freeInvokes }));

  for (const actor of game.actors) {
    const updates = itemChanges(actor.items);
    // fromGlobalSync: o diário já tem esses valores (foram copiados acima), não precisa sincronizar de novo
    if (updates.length) await actor.updateEmbeddedDocuments("Item", updates, { fromGlobalSync: true });
  }

  for (const scene of game.scenes) {
    // Tokens não vinculados com itens próprios
    for (const token of scene.tokens) {
      if (token.actorLink || !token.actor || !token.delta?._source?.items?.length) continue;
      const deltaIds = new Set(token.delta._source.items.map(i => i._id));
      const updates = itemChanges(token.actor.items.filter(i => deltaIds.has(i.id)));
      if (updates.length) await token.actor.updateEmbeddedDocuments("Item", updates, { fromGlobalSync: true });
    }

    // Desenhos de aspectos no mapa
    const drawingUpdates = scene.drawings
      .filter(d => d.flags?.[LEGACY_MODULE_ID]?.isAspectDrawing && !d.getFlag(MODULE_ID, "isAspectDrawing"))
      .map(d => ({
        _id: d.id,
        [`flags.${MODULE_ID}.isAspectDrawing`]: true,
        [`flags.${MODULE_ID}.aspectId`]: d.flags[LEGACY_MODULE_ID].aspectId
      }));
    if (drawingUpdates.length) await scene.updateEmbeddedDocuments("Drawing", drawingUpdates);
  }

  // Histórico dos ajustes ±1 nas cartas de rolagem: o antigo guardava pela posição, o novo guarda pela hora
  const messageUpdates = [];
  for (const message of game.messages) {
    const legacyHistory = message.flags?.[LEGACY_MODULE_ID]?.history;
    if (!Array.isArray(legacyHistory) || message.getFlag(MODULE_ID, "rollModifiers")) continue;
    const card = message.flags?.[SYSTEM_ID]?.chatCard ?? message.flags?.[LEGACY_SYSTEM_ID]?.chatCard;
    const history = card?.rolls?.[0]?.history ?? [];
    const notes = {};
    legacyHistory.forEach((entry, index) => {
      const amount = Number(/[+-]\d+/.exec(entry?.message ?? "")?.[0]);
      const timestamp = history[index]?.timestamp;
      if (Number.isFinite(amount) && timestamp && history[index]?.type === "increase") notes[timestamp] = amount;
    });
    if (Object.keys(notes).length) messageUpdates.push({ _id: message.id, [`flags.${MODULE_ID}.rollModifiers`]: notes });
  }
  if (messageUpdates.length) await CONFIG.ChatMessage.documentClass.updateDocuments(messageUpdates);

  await game.settings.set(MODULE_ID, "legacyExtrasMigrated", true);
  console.log(`${MODULE_ID} | Dados do antigo "${LEGACY_MODULE_ID}" migrados`);
}
