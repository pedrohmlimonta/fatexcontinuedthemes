import { MODULE_ID, SYSTEM_ID, getChatCard, toElement } from "./constants.js";
import { CostDialog } from "./cost-dialog.js";

/**
 * Extras nas cartas de rolagem do FateX:
 *  - botões -1 e +1 para o GM ajustar o resultado;
 *  - diálogo "Pagar custo" antes do +2 e do "rolar de novo" (quem executa a ação continua sendo o sistema).
 *
 * Os ajustes de ±1 entram no bônus da rolagem e no histórico dela (como um aumento). O texto certo do histórico
 * ("adicionou +1") fica guardado nesta mensagem, pela hora do ajuste, e é reaplicado sempre que ela aparece.
 */
export class RollModifiers {
  static init() {
    Hooks.on("renderChatMessageHTML", (message, html) => RollModifiers.onRenderChatMessage(message, toElement(html)));
  }

  static onRenderChatMessage(message, html) {
    const card = getChatCard(message);
    if (!html?.querySelectorAll || !card) return;

    for (const rollElement of html.querySelectorAll(".fatex-chat__roll")) {
      const rollIndex = Number(rollElement.dataset.rollIndex);
      const actions = rollElement.querySelector(".fatex-roll-actions");

      if (actions) {
        if (game.user.isGM && !actions.querySelector('[data-action="increase-one"]')) {
          const decrease = RollModifiers._button("decrease-one", "-1");
          const increase = RollModifiers._button("increase-one", "+1");
          const increaseTwo = actions.querySelector('button[data-action="increase"]');
          actions.insertBefore(decrease, increaseTwo);
          actions.insertBefore(increase, increaseTwo);
          decrease.addEventListener("click", (event) => RollModifiers._onModifier(event, message, rollIndex, -1));
          increase.addEventListener("click", (event) => RollModifiers._onModifier(event, message, rollIndex, 1));
        }

        // Captura no contêiner: roda antes do clique chegar ao botão (e ao sistema)
        if (!actions.dataset.fatexExtrasCost) {
          actions.dataset.fatexExtrasCost = "true";
          actions.addEventListener("click", (event) => RollModifiers._payBeforeAction(event, message), { capture: true });
        }
      }

      RollModifiers._repairHistory(message, card, rollElement, rollIndex);
    }
  }

  static _button(action, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.classList.add("fatex-extras-btn");
    button.textContent = label;
    return button;
  }

  static async _onModifier(event, message, rollIndex, amount) {
    event.preventDefault();
    event.stopPropagation();
    await RollModifiers.applyModifier(message, rollIndex, amount);
  }

  /** Quem paga o custo: o personagem do usuário ou, sem ele, quem fez a rolagem */
  static getPayingActor(message) {
    return game.user.character ?? message.speakerActor ?? game.actors.get(message.speaker?.actor) ?? null;
  }

  static async _payBeforeAction(event, message) {
    const button = event.target?.closest?.('button[data-action="increase"], button[data-action="reroll"]');
    if (!button || button.disabled) return;
    if (button.dataset.fatexExtrasPaid === "true") return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const proceed = await CostDialog.create(RollModifiers.getPayingActor(message));
    if (!proceed) return;

    // Repete o clique já pago: agora ele segue para o sistema, que aplica o +2 ou rola de novo
    button.dataset.fatexExtrasPaid = "true";
    try {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: event.shiftKey }));
    } finally {
      delete button.dataset.fatexExtrasPaid;
    }
  }

  /** Aplica um ajuste (±1) na rolagem `rollIndex` da carta. Só o GM. */
  static async applyModifier(message, rollIndex, amount) {
    if (!game.user.isGM) return;

    const msg = game.messages.get(message.id) ?? message;
    const card = foundry.utils.deepClone(getChatCard(msg));
    const roll = card?.rolls?.[rollIndex];
    if (!roll) return;

    const timestamp = Date.now();
    roll.bonus = (Number(roll.bonus) || 0) + amount;
    roll.history = [...(roll.history ?? []), { user: game.user.name, type: "increase", timestamp }];

    const notes = { ...(msg.getFlag(MODULE_ID, "rollModifiers") ?? {}), [timestamp]: amount };
    const total = RollModifiers.total(roll);

    // Atualiza o HTML já salvo da carta (total, escada e histórico) sem precisar redesenhar pelo sistema
    const container = document.createElement("div");
    container.innerHTML = msg.content ?? "";
    const rollElement = container.querySelector(`.fatex-chat__roll[data-roll-index="${rollIndex}"]`) ?? container;

    const totalElement = rollElement.querySelector(".fatex-roll__total");
    if (totalElement) totalElement.textContent = RollModifiers.signed(total);
    const ladderElement = rollElement.querySelector(".fatex-roll__ladder");
    if (ladderElement) ladderElement.textContent = RollModifiers.ladder(total);

    let history = rollElement.querySelector(".fatex-roll__history");
    if (!history) {
      history = document.createElement("div");
      history.className = "fatex-roll__history";
      rollElement.querySelector(".fatex-result")?.appendChild(history);
    }
    const entry = document.createElement("div");
    entry.className = "fatex-roll__history__entry";
    entry.textContent = `${game.user.name} ${RollModifiers.addedText(amount)}`;
    history.appendChild(entry);

    await msg.update({
      content: container.innerHTML,
      [`flags.${SYSTEM_ID}.chatCard`]: card,
      [`flags.${MODULE_ID}.rollModifiers`]: notes
    });
  }

  /** Troca o texto dos ajustes ±1 no histórico (o sistema os mostra como um +2 comum) */
  static _repairHistory(message, card, rollElement, rollIndex) {
    const notes = message.getFlag?.(MODULE_ID, "rollModifiers");
    if (!notes) return;
    const history = card.rolls?.[rollIndex]?.history ?? [];
    const entries = rollElement.querySelectorAll(".fatex-roll__history__entry");

    history.forEach((item, index) => {
      const amount = notes[item?.timestamp];
      if (amount === undefined || !entries[index]) return;
      entries[index].textContent = `${item.user} ${RollModifiers.addedText(amount)}`;
    });
  }

  static addedText(amount) {
    return game.i18n.format("FAx.RollHistory.Added", { amount: RollModifiers.signed(amount) });
  }

  static signed(value) {
    return `${value < 0 ? "-" : "+"}${Math.abs(value)}`;
  }

  /** Total como o sistema calcula: dados (ou 1d6-1d6) + perícia + bônus */
  static total(roll) {
    const faces = roll.faces ?? [];
    const dice = roll.options?.rollmode === "1d6-1d6"
      ? (faces[0] ?? 0) - (faces[1] ?? 0)
      : faces.reduce((a, b) => a + b, 0);
    return dice + (Number(roll.rank) || 0) + (Number(roll.bonus) || 0);
  }

  static ladder(total) {
    const clamped = Math.min(Math.max(total, -4), 8);
    return game.i18n.localize(`FAx.Global.Ladder.${RollModifiers.signed(clamped)}`);
  }
}
