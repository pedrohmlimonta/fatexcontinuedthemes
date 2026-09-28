import { MODULE_ID, TEMPLATES_PATH } from "./constants.js";
import { AspectStorage } from "./aspect-storage.js";

/**
 * Diálogo "Pagar custo", aberto antes do +2 e do "rolar de novo" das cartas de rolagem:
 * gastar um ponto de destino, usar uma invocação grátis (aspecto de cena ou de ficha) ou seguir sem custo.
 */
export class CostDialog {
  /**
   * @param {Actor|null} actor  Personagem da ficha que fez a rolagem: os pontos de destino são dele
   * @returns {Promise<boolean>} true para seguir com a ação, false se cancelou
   */
  static async create(actor) {
    const storage = await AspectStorage.getStorage();
    const sceneAspects = storage ? (storage.getFlag(MODULE_ID, AspectStorage.FLAGS.ASPECTS) || []) : [];
    const isGM = game.user.isGM;

    const availableOptions = [];
    const allCharacterInvokes = storage ? (storage.getFlag(MODULE_ID, AspectStorage.FLAGS.CHARACTER_INVOKES) || {}) : {};

    for (const [itemId, data] of Object.entries(allCharacterInvokes)) {
      if (!(data?.value > 0)) continue;

      let actorName = data.actorName || "?";
      if (data.actorId) {
        const realActor = game.actors.get(data.actorId);
        if (realActor) actorName = realActor.name;
      }

      const typeLabel = data.type === "consequence"
        ? game.i18n.localize("FAx.CostDialog.Consequence")
        : game.i18n.localize("FAx.CostDialog.Aspect");

      let aspectText = data.text || data.name || "";
      if (typeof aspectText === "string") {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = aspectText;
        aspectText = tempDiv.textContent || aspectText;
      }

      availableOptions.push({
        name: `${actorName} - ${typeLabel} - ${aspectText.trim()} (${data.value})`,
        id: itemId,
        actorId: data.actorId,
        type: "character_aspect"
      });
    }

    sceneAspects.forEach((aspect, index) => {
      if (aspect.hidden) return;

      if ((aspect.invokes || 0) > 0) {
        availableOptions.push({
          name: `${aspect.name} (${aspect.invokes})`,
          aspectId: aspect.id,
          aspectIndex: index,
          type: "standard"
        });
      }

      if (isGM && (aspect.hostileInvokes || 0) > 0) {
        availableOptions.push({
          name: `${aspect.name} [${game.i18n.localize("FAx.Global.HostileInvokes")}] (${aspect.hostileInvokes})`,
          aspectId: aspect.id,
          aspectIndex: index,
          type: "hostile"
        });
      }
    });

    const fatePoints = Number(actor?.system?.fatepoints?.current) || 0;
    const canPayFatePoint = !!actor?.isOwner && fatePoints > 0;
    const hasAspects = availableOptions.length > 0;
    const defaultChoice = canPayFatePoint ? "fatepoint" : hasAspects ? "aspect" : "free";

    const content = await foundry.applications.handlebars.renderTemplate(`${TEMPLATES_PATH}/cost-dialog.hbs`, {
      actorName: actor?.name ?? "",
      fatePoints,
      canPayFatePoint,
      aspects: availableOptions,
      hasAspects,
      defaultChoice
    });

    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("FAx.CostDialog.Title"), icon: "fas fa-coins" },
      classes: ["fatex-extras-cost-dialog"],
      position: { width: 420 },
      content,
      buttons: [
        {
          action: "pay",
          icon: "fas fa-check",
          label: game.i18n.localize("FAx.CostDialog.PayAndProceed"),
          default: true,
          callback: (event, button) => ({
            choice: button.form.elements["cost-type"]?.value || "free",
            option: Number(button.form.elements["aspect-select"]?.value) || 0
          })
        },
        {
          action: "cancel",
          icon: "fas fa-times",
          label: game.i18n.localize("FAx.CostDialog.Cancel")
        }
      ],
      render: (event, dialog) => CostDialog._activateListeners(dialog.element),
      rejectClose: false
    });

    if (!result || typeof result !== "object") return false;
    return await CostDialog._pay(result, actor, availableOptions);
  }

  static _activateListeners(element) {
    const select = element?.querySelector(".fatex-select-custom");
    const hidden = element?.querySelector('input[name="aspect-select"]');
    if (!select || !hidden) return;

    for (const option of select.querySelectorAll(".fatex-select-option")) {
      option.addEventListener("click", () => {
        select.querySelectorAll(".fatex-select-option").forEach(o => o.classList.remove("selected"));
        option.classList.add("selected");
        hidden.value = option.dataset.value;
      });
    }

    for (const radio of element.querySelectorAll('input[name="cost-type"]')) {
      radio.addEventListener("change", () => select.classList.toggle("disabled", radio.value !== "aspect" || !radio.checked));
    }
  }

  static async _pay({ choice, option }, actor, availableOptions) {
    if (choice === "fatepoint") {
      const current = Number(actor?.system?.fatepoints?.current) || 0;
      if (!actor?.isOwner || current <= 0) return false;
      await actor.update({ "system.fatepoints.current": current - 1 });

      if (game.dice3d) {
        await game.dice3d.show({
          throws: [{ dice: [{ result: 1, resultLabel: 1, type: "dc", vectors: [], options: {} }] }]
        }, game.user, true);
      }
      return true;
    }

    if (choice === "aspect") {
      const selected = availableOptions[option];
      if (!selected) return false;

      if (selected.type === "character_aspect") {
        const current = await AspectStorage.getGlobalInvokeCount(selected.id);
        const updated = await AspectStorage.updateGlobalInvokeCount(selected.id, Math.max(0, current - 1));
        if (!updated) {
          ui.notifications.warn(game.i18n.localize("FAx.Global.AspectStorageNotAvailable"));
          return false;
        }
        return true;
      }

      const storage = await AspectStorage.getStorage();
      if (!storage?.isOwner) {
        ui.notifications.warn(game.i18n.localize("FAx.Global.AspectStorageNotAvailable"));
        return false;
      }
      const aspects = foundry.utils.deepClone(storage.getFlag(MODULE_ID, AspectStorage.FLAGS.ASPECTS) || []);
      const target = aspects.find(a => a.id === selected.aspectId) ?? aspects[selected.aspectIndex];
      if (!target) return false;

      const field = selected.type === "hostile" ? "hostileInvokes" : "invokes";
      target[field] = Math.max(0, (target[field] || 0) - 1);
      await storage.setFlag(MODULE_ID, AspectStorage.FLAGS.ASPECTS, aspects);
      return true;
    }

    // "free": segue sem custo
    return true;
  }
}
