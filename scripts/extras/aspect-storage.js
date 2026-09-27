import { MODULE_ID, LEGACY_MODULE_ID } from "./constants.js";

/**
 * Os aspectos de cena, as categorias, as etiquetas e as invocações grátis dos aspectos das fichas ficam
 * guardados num diário (JournalEntry) escondido, "Aspectos globais do FateX", do qual todos são donos.
 */
export class AspectStorage {
  static FLAGS = {
    ASPECTS: "sceneAspects",
    GROUPS: "sceneAspectGroups",
    TAGS: "sceneAspectTags",
    IS_GLOBAL_STORAGE: "isGlobalAspectStorage",
    CHARACTER_INVOKES: "characterInvokes"
  };

  /** Diário de armazenamento; o GM cria na primeira vez. Jogadores recebem null enquanto ele não existir. */
  static async getStorage() {
    const journal = AspectStorage.findStorage();
    if (journal) return journal;
    if (!game.user.isGM) return null;
    // Uma criação por vez (várias partes do módulo podem pedir o diário ao mesmo tempo)
    AspectStorage._creating ??= AspectStorage._initializeGlobalStorage().finally(() => { AspectStorage._creating = null; });
    return await AspectStorage._creating;
  }

  static _creating = null;

  static findStorage() {
    return game.journal?.find(j => j.getFlag(MODULE_ID, AspectStorage.FLAGS.IS_GLOBAL_STORAGE)) ?? null;
  }

  static async _initializeGlobalStorage() {
    // Mundo que usava o antigo "fatex-extras": o diário dele passa a ser usado aqui (os dados são copiados)
    const legacy = game.journal?.find(j => j.flags?.[LEGACY_MODULE_ID]?.[AspectStorage.FLAGS.IS_GLOBAL_STORAGE]);
    if (legacy) {
      const copy = {};
      for (const key of Object.values(AspectStorage.FLAGS)) {
        const value = legacy.flags[LEGACY_MODULE_ID][key];
        if (value !== undefined) copy[key] = foundry.utils.deepClone(value);
      }
      copy[AspectStorage.FLAGS.IS_GLOBAL_STORAGE] = true;
      await legacy.update({ [`flags.${MODULE_ID}`]: copy });
      return legacy;
    }

    const defaultTags = [
      { id: "game", label: game.i18n.localize("FAx.Global.Game"), color: "#4a4a4a" },
      { id: "situation", label: game.i18n.localize("FAx.Global.Situation"), color: "#1a75ff" },
      { id: "boost", label: game.i18n.localize("FAx.Global.Boost"), color: "#ff9900" }
    ];

    const journalData = {
      name: game.i18n.localize("FAx.Global.GlobalAspectsJournalName"),
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
      flags: {
        [MODULE_ID]: {
          [AspectStorage.FLAGS.IS_GLOBAL_STORAGE]: true,
          [AspectStorage.FLAGS.ASPECTS]: [],
          [AspectStorage.FLAGS.GROUPS]: [],
          [AspectStorage.FLAGS.TAGS]: defaultTags,
          [AspectStorage.FLAGS.CHARACTER_INVOKES]: {}
        }
      }
    };

    return await CONFIG.JournalEntry.documentClass.create(journalData);
  }

  /** Copia para o diário as invocações grátis de um aspecto/consequência de ficha */
  static async syncItemToGlobal(item) {
    const storage = await AspectStorage.getStorage();
    if (!storage?.isOwner) return;

    const data = {
      value: item.getFlag(MODULE_ID, "freeInvokes") || 0,
      name: item.name,
      text: item.system.value || "",
      type: item.type,
      actorId: item.parent?.id,
      actorName: item.parent?.name
    };

    await storage.setFlag(MODULE_ID, `${AspectStorage.FLAGS.CHARACTER_INVOKES}.${item.id}`, data);
  }

  static async getGlobalInvokeCount(itemId) {
    const storage = await AspectStorage.getStorage();
    if (!storage) return 0;
    const data = storage.getFlag(MODULE_ID, `${AspectStorage.FLAGS.CHARACTER_INVOKES}.${itemId}`);
    return data?.value || 0;
  }

  static async updateGlobalInvokeCount(itemId, newValue) {
    const storage = await AspectStorage.getStorage();
    if (!storage?.isOwner) return false;
    await storage.setFlag(MODULE_ID, `${AspectStorage.FLAGS.CHARACTER_INVOKES}.${itemId}.value`, newValue);
    return true;
  }
}
