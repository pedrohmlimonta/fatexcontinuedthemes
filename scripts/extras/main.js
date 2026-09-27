/**
 * FateX Continued Themes — Extras
 *
 * Incorpora o antigo módulo "FateX Extras", de shrade (https://github.com/shradee/FateX-Extras),
 * atualizado para o Foundry VTT v14 e para o sistema FateX Continued:
 *  - Gerenciador de Aspectos (aspectos de cena, categorias, etiquetas, invocações) e aspectos no mapa
 *  - "Pagar custo" antes do +2 / rolar de novo, e +1 / -1 do GM nas cartas de rolagem
 *  - Invocações grátis nos aspectos e consequências da ficha, consequências no chat
 *  - Botão "nova sessão" (recarrega os pontos de destino), modo escuro e o dado de ponto de destino do Dice So Nice
 */
import {
  MODULE_ID, SYSTEM_ID, DICE_SYSTEM_ID, DICE_MODEL_PATH, KO_FI_URL,
  isFateXContinued, toElement, isResponsibleGM
} from "./constants.js";
import { SceneAspectsApp } from "./scene-aspects.js";
import { RollModifiers } from "./roll-modifiers.js";
import { AspectStorage } from "./aspect-storage.js";
import { createAspectDrawingData, updateAspectDrawings, fitAspectDrawingFont } from "./drawings.js";
import { migrateLegacyExtras, migrateLegacyClientSettings } from "./migration.js";

/* ====================================================================== */
/*  Configurações                                                           */
/* ====================================================================== */

Hooks.once("init", () => {
  // Nomes e dicas são chaves de tradução: o Foundry traduz ao exibir as configurações
  game.settings.register(MODULE_ID, "darkMode", {
    name: "FAx.Settings.DarkMode",
    hint: "FAx.Settings.DarkModeHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => document.body.classList.toggle("fatex-dark-mode", !!value)
  });

  game.settings.register(MODULE_ID, "sceneDrawingFont", {
    name: "FAx.Settings.SceneDrawingFont",
    hint: "FAx.Settings.SceneDrawingFontHint",
    scope: "world",
    config: true,
    type: String,
    default: "Signika",
    choices: {
      "Signika": "Signika",
      "Roboto": "Roboto",
      "Roboto Condensed": "Roboto Condensed",
      "Arial": "Arial",
      "Georgia": "Georgia",
      "Times New Roman": "Times New Roman"
    }
  });

  game.settings.register(MODULE_ID, "sceneDrawingBgAlpha", {
    name: "FAx.Settings.SceneDrawingBgAlpha",
    hint: "FAx.Settings.SceneDrawingBgAlphaHint",
    scope: "world",
    config: true,
    type: Number,
    default: 1,
    range: { min: 0, max: 1, step: 0.1 }
  });

  game.settings.register(MODULE_ID, "sceneDrawingShowTags", {
    name: "FAx.Settings.SceneDrawingShowTags",
    hint: "FAx.Settings.SceneDrawingShowTagsHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "sceneDrawingShowHostile", {
    name: "FAx.Settings.SceneDrawingShowHostile",
    hint: "FAx.Settings.SceneDrawingShowHostileHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "sceneDrawingShowInvokes", {
    name: "FAx.Settings.SceneDrawingShowInvokes",
    hint: "FAx.Settings.SceneDrawingShowInvokesHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "sceneDrawingStrokeColor", {
    name: "FAx.Settings.SceneDrawingStrokeColor",
    hint: "FAx.Settings.SceneDrawingStrokeColorHint",
    scope: "world",
    config: true,
    type: new foundry.data.fields.ColorField({ nullable: false, initial: "#ffffff" }),
    default: "#ffffff"
  });

  game.settings.register(MODULE_ID, "sceneDrawingStrokeAlpha", {
    name: "FAx.Settings.SceneDrawingStrokeAlpha",
    hint: "FAx.Settings.SceneDrawingStrokeAlphaHint",
    scope: "world",
    config: true,
    type: Number,
    default: 0.3,
    range: { min: 0, max: 1, step: 0.1 }
  });

  game.settings.register(MODULE_ID, "showKoFiMessage", {
    name: "FAx.KoFi.ShowMessage",
    hint: "FAx.KoFi.ShowMessageHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "koFiDismissed", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  // Interno: indica se os dados do antigo "fatex-extras" já foram copiados para este módulo
  game.settings.register(MODULE_ID, "legacyExtrasMigrated", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
});

RollModifiers.init();

/* ====================================================================== */
/*  Gerenciador de Aspectos: botão nos controles de token                   */
/* ====================================================================== */

Hooks.on("getSceneControlButtons", (controls) => {
  const tokens = controls?.tokens ?? controls?.token;
  if (!tokens?.tools || tokens.tools["scene-aspects"]) return;

  tokens.tools["scene-aspects"] = {
    name: "scene-aspects",
    title: "FAx.Global.ManageAspects",
    icon: "fas fa-book-open",
    order: Object.keys(tokens.tools).length,
    button: true,
    visible: true,
    onChange: () => SceneAspectsApp.open()
  };
});

/* ====================================================================== */
/*  Dice So Nice: dado de ponto de destino                                  */
/* ====================================================================== */

Hooks.once("diceSoNiceReady", (dice3d) => {
  dice3d.addSystem({ id: DICE_SYSTEM_ID, name: game.i18n.localize("FAx.Dice.SystemName") }, "default");
  dice3d.addDicePreset({
    type: "dc",
    labels: ["", ""],
    modelFile: DICE_MODEL_PATH,
    system: DICE_SYSTEM_ID
  });
});

/* ====================================================================== */
/*  Aspectos de cena no mapa                                                */
/* ====================================================================== */

// Soltar um aspecto do Gerenciador no mapa cria um desenho com o texto dele (só o GM)
Hooks.on("dropCanvasData", (canvas, data) => {
  if (data?.type !== "SceneAspect") return;
  if (game.user.isGM) createAspectDrawing(canvas.scene, data);
  return false;
});

async function createAspectDrawing(scene, data) {
  try {
    if (!scene) return;
    const storage = await AspectStorage.getStorage();
    const aspects = storage?.getFlag(MODULE_ID, AspectStorage.FLAGS.ASPECTS) || [];
    const aspect = aspects.find(a => a.id === data.id);
    if (!aspect) return;
    const tags = storage.getFlag(MODULE_ID, AspectStorage.FLAGS.TAGS) || [];

    await scene.createEmbeddedDocuments("Drawing", [createAspectDrawingData(aspect, tags, data.x, data.y)]);
    ui.notifications.info(game.i18n.format("FAx.Global.AspectAddedToScene", { name: aspect.name }));
  } catch (err) {
    console.error(`${MODULE_ID} | Erro ao criar o desenho do aspecto:`, err);
  }
}

Hooks.on("updateDrawing", (drawing, changes, options, userId) => fitAspectDrawingFont(drawing, changes, userId));

/* ====================================================================== */
/*  Diário de armazenamento dos aspectos                                    */
/* ====================================================================== */

Hooks.on("preDeleteJournalEntry", (doc) => {
  if (doc.getFlag(MODULE_ID, AspectStorage.FLAGS.IS_GLOBAL_STORAGE)) {
    ui.notifications.warn(game.i18n.localize("FAx.Global.CannotDeleteStorage"));
    return false;
  }
});

// Invocações grátis de um aspecto/consequência da ficha mudaram → copia para o diário
Hooks.on("updateItem", (item, change, options, userId) => {
  if (options?.fromGlobalSync) return;
  if (item.type !== "aspect" && item.type !== "consequence") return;
  if (!item.parent || userId !== game.user.id) return;

  const invokesChanged = change.flags?.[MODULE_ID]?.freeInvokes !== undefined;
  const nameChanged = change.name !== undefined;
  const textChanged = change.system?.value !== undefined;
  if (invokesChanged || nameChanged || textChanged) AspectStorage.syncItemToGlobal(item);
});

Hooks.on("updateJournalEntry", async (doc, change) => {
  if (!doc.getFlag(MODULE_ID, AspectStorage.FLAGS.IS_GLOBAL_STORAGE)) return;

  refreshApps();

  const moduleChange = change.flags?.[MODULE_ID] ?? {};

  // Texto e cor dos aspectos no mapa acompanham o Gerenciador (feito pelo GM ativo)
  if ((moduleChange[AspectStorage.FLAGS.ASPECTS] !== undefined || moduleChange[AspectStorage.FLAGS.TAGS] !== undefined)
      && isResponsibleGM()) {
    await updateAspectDrawings();
  }

  // Invocações dos aspectos das fichas gastas pelo diário (ex.: no "Pagar custo") → volta para o item
  const itemIds = new Set();
  for (const key of Object.keys(foundry.utils.flattenObject(change))) {
    const parts = key.split(".");
    const index = parts.indexOf(AspectStorage.FLAGS.CHARACTER_INVOKES);
    if (index !== -1 && parts.length > index + 1) itemIds.add(parts[index + 1]);
  }
  if (!itemIds.size) return;

  const allInvokes = doc.getFlag(MODULE_ID, AspectStorage.FLAGS.CHARACTER_INVOKES) || {};
  for (const itemId of itemIds) {
    const data = allInvokes[itemId];
    if (!data) continue;
    const actor = game.actors.get(data.actorId);
    if (!actor) continue;

    // Um usuário só faz a atualização: o GM ativo ou, sem GM online, um dono da ficha
    if (game.users.activeGM ? !isResponsibleGM() : !actor.isOwner) continue;

    const item = actor.items.get(itemId);
    if (item && item.getFlag(MODULE_ID, "freeInvokes") !== data.value) {
      await item.update({ [`flags.${MODULE_ID}.freeInvokes`]: data.value }, { fromGlobalSync: true });
    }
  }
});

function refreshApps() {
  for (const app of Object.values(ui.windows)) {
    if (app instanceof SceneAspectsApp) app.render();
  }
}

/** O diário de armazenamento não aparece na lista de diários */
function hideAspectJournal() {
  const journal = AspectStorage.findStorage();
  if (!journal) return;
  const cssId = "fatex-extras-hide-storage";
  document.getElementById(cssId)?.remove();

  const style = document.createElement("style");
  style.id = cssId;
  style.textContent = ["#journal", ".journal-directory", ".journal-sidebar"]
    .flatMap(scope => [`${scope} [data-entry-id="${journal.id}"]`, `${scope} [data-document-id="${journal.id}"]`])
    .join(",\n") + " { display: none !important; }";
  document.head.appendChild(style);
}

/* ====================================================================== */
/*  Ficha: nova sessão, invocações grátis e consequências no chat           */
/* ====================================================================== */

Hooks.on("renderActorSheet", (sheet, html) => {
  const actor = sheet.actor;
  if (!actor || actor.type !== "character") return;
  if (!isFateXContinued()) return;

  const root = toElement(html);
  if (!root?.querySelectorAll) return;

  addNewSessionButton(root, actor);
  addInvokeTools(root, actor);
});

function addNewSessionButton(root, actor) {
  if (!actor.isOwner) return;
  const wrapper = root.querySelector(".fatex-header__fate-points-wrapper");
  if (!wrapper || wrapper.querySelector(".fatex-js-refresh-fatepoints")) return;

  const button = document.createElement("i");
  button.className = "fas fa-sync-alt fatex-js-refresh-fatepoints";
  button.title = game.i18n.localize("FAx.NewSession.Title");
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    startNewSession(actor);
  });
  wrapper.append(button);
}

async function startNewSession(actor) {
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("FAx.NewSession.Title"), icon: "fas fa-sync-alt" },
    content: `<p>${game.i18n.localize("FAx.NewSession.Question")}</p>`,
    yes: { label: game.i18n.localize("FAx.NewSession.Confirm"), icon: "fas fa-check" },
    no: { label: game.i18n.localize("FAx.NewSession.Cancel"), icon: "fas fa-times" },
    rejectClose: false
  });
  if (confirmed !== true) return;

  const fp = actor.system.fatepoints;
  if (fp.current < fp.refresh) {
    const diff = fp.refresh - fp.current;
    await actor.update({ "system.fatepoints.current": fp.refresh });
    if (game.dice3d) {
      const dice = Array.from({ length: diff }, () => ({ result: 1, resultLabel: 1, type: "dc", vectors: [], options: {} }));
      game.dice3d.show({ throws: [{ dice }] }, game.user, true);
    }
    ui.notifications.info(game.i18n.format("FAx.NewSession.Success", { name: actor.name }));
  } else {
    ui.notifications.info(game.i18n.format("FAx.NewSession.AlreadyFull", { name: actor.name }));
  }
}

function addInvokeTools(root, actor) {
  const canEdit = actor.isOwner;

  for (const itemElement of root.querySelectorAll(".fatex-item, .fatex-js-item")) {
    const itemId = itemElement.dataset.id || itemElement.dataset.itemId;
    const item = itemId ? actor.items.get(itemId) : null;
    if (!item || (item.type !== "aspect" && item.type !== "consequence")) continue;

    const container = itemElement.querySelector(".fatex-u-pos-relative");
    if (!container) continue;
    container.querySelector(".fatex-extras-item-tools")?.remove();

    const freeInvokes = item.getFlag(MODULE_ID, "freeInvokes") || 0;
    const tools = document.createElement("div");
    tools.className = "fatex-extras-item-tools";
    tools.innerHTML = `<div class="character-invoke-counter" title="${game.i18n.localize("FAx.Global.Invokes")}">`
      + (canEdit ? `<i class="fas fa-minus fatex-extras-invoke-ctrl" data-action="decrease"></i>` : "")
      + `<span class="invoke-value">${freeInvokes}</span>`
      + (canEdit ? `<i class="fas fa-plus fatex-extras-invoke-ctrl" data-action="increase"></i>` : "")
      + `</div>`;
    container.append(tools);

    // O ícone do chat vai para junto do contador; consequências ganham o ícone (o sistema só tem nos aspectos)
    let chatIcon = container.querySelector(".fatex-js-item-to-chat");
    if (!chatIcon && item.type === "consequence") {
      chatIcon = document.createElement("i");
      chatIcon.className = "fatex-js-item-to-chat fatex-actions__icon fatex-actions__icon--no-hide fa fa-comment";
      chatIcon.dataset.item = itemId;
      chatIcon.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        sendConsequenceToChat(item);
      });
    }
    if (chatIcon) {
      chatIcon.classList.add("fatex-extras-chat-icon");
      tools.prepend(chatIcon);
    }

    for (const control of tools.querySelectorAll(".fatex-extras-invoke-ctrl")) {
      control.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const current = item.getFlag(MODULE_ID, "freeInvokes") || 0;
        const next = control.dataset.action === "increase" ? current + 1 : Math.max(0, current - 1);
        if (next !== current) await item.setFlag(MODULE_ID, "freeInvokes", next);
      });
    }
  }
}

/** Consequência no chat, no mesmo formato das cartas de aspecto do sistema */
async function sendConsequenceToChat(item) {
  const TextEditor = foundry.applications.ux.TextEditor.implementation;
  const options = { secrets: false, relativeTo: item };
  const name = await TextEditor.enrichHTML(item.system.label || item.name, options);
  const description = await TextEditor.enrichHTML(item.system.value || "", options);

  const content = await foundry.applications.handlebars.renderTemplate(
    `systems/${SYSTEM_ID}/templates/chat/item-card.hbs`,
    { item: { name, img: item.img, system: { enrichedDescription: description } } }
  );

  const ChatMessage = CONFIG.ChatMessage.documentClass;
  await ChatMessage.create({
    author: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    content
  });
}

/* ====================================================================== */
/*  Mensagem de apoio ao autor do FateX Extras                              */
/* ====================================================================== */

function showKoFiMessage() {
  if (!isResponsibleGM()) return;
  if (game.settings.get(MODULE_ID, "koFiDismissed")) return;
  if (game.settings.get(MODULE_ID, "showKoFiMessage") === false) return;

  CONFIG.ChatMessage.documentClass.create({
    author: game.user.id,
    whisper: [game.user.id],
    flags: { [MODULE_ID]: { koFi: true } },
    content: `
      <div style="background: linear-gradient(135deg, #794bc4 0%, #ff5e62 100%); padding: 15px; border-radius: 8px; color: white; font-family: inherit; max-width: 350px;">
        <p style="margin: 0 0 10px 0; font-size: 14px;">${game.i18n.localize("FAx.KoFi.SupportMessage")}</p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <a href="${KO_FI_URL}" target="_blank" rel="noopener" style="display: inline-block; background: white; color: #794bc4; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 13px;">${game.i18n.localize("FAx.KoFi.Support")}</a>
          <button type="button" class="fatex-ko-fi-dismiss" style="background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.4); padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 13px;">${game.i18n.localize("FAx.KoFi.DontShowAgain")}</button>
        </div>
      </div>`
  });
}

Hooks.on("renderChatMessageHTML", (message, html) => {
  if (!message.getFlag?.(MODULE_ID, "koFi")) return;
  toElement(html)?.querySelector?.(".fatex-ko-fi-dismiss")?.addEventListener("click", async () => {
    await game.settings.set(MODULE_ID, "showKoFiMessage", false);
    await message.delete();
  });
});

/* ====================================================================== */
/*  Ready                                                                   */
/* ====================================================================== */

Hooks.once("ready", async () => {
  try {
    await migrateLegacyClientSettings();
  } catch (err) {
    console.error(`${MODULE_ID} | Falha ao migrar o modo escuro do "fatex-extras"`, err);
  }
  if (game.settings.get(MODULE_ID, "darkMode")) document.body.classList.add("fatex-dark-mode");

  try {
    await migrateLegacyExtras();
  } catch (err) {
    console.error(`${MODULE_ID} | Falha ao migrar os dados do "fatex-extras"`, err);
  }

  try {
    await AspectStorage.getStorage();
  } catch (err) {
    console.error(`${MODULE_ID} | Falha ao preparar o diário dos aspectos`, err);
  }
  hideAspectJournal();
  showKoFiMessage();
});
