/**
 * FateX Continued Themes — Adicionar personagens à iniciativa sem precisar do mapa
 *
 * Botão no rastreador de combate (só para o GM) que abre a lista dos personagens do mundo, separados por pasta e
 * com busca. Os personagens marcados entram no encontro de uma vez, como combatentes sem token: não é preciso
 * colocá-los no mapa. Quem tiver um token ligado na cena em vista entra por esse token, como faria pelo mapa.
 *
 * O combatente sem token é o mesmo que o próprio Foundry cria quando um personagem rola iniciativa sem estar no
 * mapa ({ actorId, hidden }): a rolagem por perícia, o "Rolar todos" e o "Rolar PdMs" funcionam normalmente.
 */

const MODULE_ID = "fatexcontinued-themes";
const TEMPLATE = `modules/${MODULE_ID}/templates/initiative/add-actors.hbs`;
const BUTTON_CLASS = "fatex-add-to-initiative";

const toElement = (value) => (value?.jquery ? value[0] : value) ?? null;

/** Texto comparável na busca: sem acentos, sem diferença entre maiúsculas e minúsculas */
const normalize = (text) => String(text ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

/** Personagens que podem entrar na iniciativa: fichas de personagem visíveis (nem grupos, nem modelos de ficha) */
function isCandidate(actor) {
  if (!actor || actor.type !== "character") return false;
  if (actor.isTemplateActor) return false;
  return actor.visible !== false;
}

/** O encontro aberto no rastreador de combate (o mesmo em que o mapa coloca os tokens) */
const viewedCombat = () => ui.combat?.viewed ?? game.combats?.viewed ?? null;

/** A cena em vista: é nela que se procura o token ligado de cada personagem (se o encontro não for de outra cena) */
const viewedScene = () => globalThis.canvas?.scene ?? game.scenes?.viewed ?? null;

const resolveFolder = (folder) => (typeof folder === "string" ? game.folders?.get(folder) : folder) ?? null;

/** Caminho da pasta, como "Campanha / Capangas" */
function folderPath(folder) {
  const names = [];
  for (let current = folder, depth = 0; current && depth < 20; current = resolveFolder(current.folder), depth++) {
    names.unshift(current.name);
  }
  return names.join(" / ");
}

/** Token ligado ao personagem ("Vincular dados do ator") na cena, se houver */
function linkedToken(scene, actor) {
  for (const token of scene?.tokens ?? []) {
    if (token.actorLink && token.actorId === actor.id) return token;
  }
  return null;
}

/* ====================================================================== */
/*  Adicionar ao encontro                                                   */
/* ====================================================================== */

/**
 * Adiciona personagens ao encontro aberto no rastreador (ou a um novo, se não houver nenhum).
 * Quem já está no encontro é ignorado.
 * @param {Array<Actor|string>} actorsOrIds  fichas do mundo ou seus ids (grupos e modelos de ficha ficam de fora)
 * @param {{combat?: Combat, hidden?: boolean}} [options]  hidden: entram ocultos dos jogadores
 * @returns {Promise<Combatant[]>} os combatentes criados
 */
export async function addActorsToInitiative(actorsOrIds, { combat = null, hidden = false } = {}) {
  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("FATEX_INIT.AddActors.GMOnly"));
    return [];
  }

  // Sempre a ficha do mundo: um id, a própria ficha ou o ator de um token levam a ela
  const actors = [...(actorsOrIds ?? [])]
    .map(entry => game.actors?.get(typeof entry === "string" ? entry : entry?.id))
    .filter(isCandidate);
  if (!actors.length) return [];

  combat ??= viewedCombat();
  if (!combat) {
    // Como o "Criar encontro" do Foundry (desde o v13): o encontro novo não fica preso a uma cena
    combat = await CONFIG.Combat.documentClass.create({ active: true });
    if (!combat) return [];
  }

  const inCombat = new Set([...(combat.combatants ?? [])].map(c => c.actorId).filter(Boolean));
  const scene = combat.scene ?? viewedScene();
  const data = [];
  for (const actor of actors) {
    if (inCombat.has(actor.id)) continue;
    inCombat.add(actor.id);
    const token = linkedToken(scene, actor);
    data.push(token
      ? { tokenId: token.id, sceneId: scene.id, actorId: actor.id, hidden: !!hidden || !!token.hidden }
      : { actorId: actor.id, hidden: !!hidden });
  }

  if (!data.length) {
    ui.notifications.info(game.i18n.localize("FATEX_INIT.AddActors.NothingNew"));
    return [];
  }

  // Um módulo pode barrar a criação (preCreateCombatant): conta só quem entrou de fato
  const created = (await combat.createEmbeddedDocuments("Combatant", data)) ?? [];
  if (created.length) ui.notifications.info(game.i18n.format("FATEX_INIT.AddActors.Added", { count: created.length }));
  return created;
}

/* ====================================================================== */
/*  Diálogo com a lista de personagens                                      */
/* ====================================================================== */

/** Ordem alfabética no idioma do Foundry (um código de idioma que o navegador não conhece cai no padrão) */
function collator() {
  const options = { sensitivity: "base", numeric: true };
  try {
    return new Intl.Collator(game.i18n.lang, options);
  } catch (err) {
    return new Intl.Collator(undefined, options);
  }
}

/** Personagens do mundo agrupados por pasta (pastas em ordem alfabética, sem pasta por último) */
function buildGroups(combat) {
  const inCombat = new Set([...(combat?.combatants ?? [])].map(c => c.actorId).filter(Boolean));
  const groups = new Map();

  for (const actor of game.actors ?? []) {
    if (!isCandidate(actor)) continue;
    const folder = resolveFolder(actor.folder);
    const key = folder?.id ?? "";
    if (!groups.has(key)) {
      const label = folder ? folderPath(folder) : game.i18n.localize("FATEX_INIT.AddActors.NoFolder");
      groups.set(key, { id: key, label, actors: [] });
    }
    groups.get(key).actors.push({
      id: actor.id,
      name: actor.name,
      img: actor.img || CONST.DEFAULT_TOKEN,
      isPlayer: !!actor.hasPlayerOwner,
      inCombat: inCombat.has(actor.id),
      search: normalize(actor.name)
    });
  }

  const compare = collator().compare;
  const list = [...groups.values()];
  for (const group of list) group.actors.sort((a, b) => compare(a.name, b.name));
  list.sort((a, b) => (a.id === "") - (b.id === "") || compare(a.label, b.label));
  return list;
}

/** Ids marcados no diálogo (quem já está no encontro vem desativado e não conta) */
const checkedIds = (root) =>
  [...(root?.querySelectorAll?.('input[name="actorIds"]:checked') ?? [])].filter(box => !box.disabled).map(box => box.value);

/** O que foi escolhido no diálogo: os personagens e se entram ocultos */
const readChoice = (root) => ({
  ids: checkedIds(root),
  hidden: !!root?.querySelector?.(".fatex-add-combat__hidden")?.checked
});

/** Marca/desmarca uma caixa "todos" conforme as caixas que ela controla */
function syncToggle(toggle, boxes) {
  if (!toggle) return;
  const enabled = boxes.filter(box => !box.disabled);
  const checked = enabled.filter(box => box.checked).length;
  toggle.disabled = enabled.length === 0;
  toggle.checked = enabled.length > 0 && checked === enabled.length;
  toggle.indeterminate = checked > 0 && checked < enabled.length;
}

function activateDialog(root) {
  if (!root?.querySelector) return;
  const search = root.querySelector(".fatex-add-combat__search");
  const toggleAll = root.querySelector(".fatex-add-combat__toggle-all");
  const empty = root.querySelector(".fatex-add-combat__empty");
  const confirm = root.querySelector('button[data-action="add"]');
  const confirmLabel = confirm?.querySelector("span") ?? confirm;

  const rows = [...root.querySelectorAll(".fatex-add-combat__actor")];
  const boxesOf = (items) => items.map(li => li.querySelector('input[name="actorIds"]')).filter(Boolean);
  const visibleRows = (scope) => [...scope.querySelectorAll(".fatex-add-combat__actor")].filter(li => !li.hidden);

  const update = () => {
    const query = normalize(search?.value);
    for (const li of rows) li.hidden = !!query && !(li.dataset.search ?? "").includes(query);

    for (const group of root.querySelectorAll(".fatex-add-combat__group")) {
      const visible = visibleRows(group);
      group.hidden = visible.length === 0;
      syncToggle(group.querySelector(".fatex-add-combat__toggle-group"), boxesOf(visible));
    }
    syncToggle(toggleAll, boxesOf(visibleRows(root)));
    // Aviso de "nenhum com esse nome": o texto muda dentro de uma região de status, que o leitor de tela anuncia
    if (empty && rows.length) empty.textContent = rows.some(li => !li.hidden) ? "" : (empty.dataset.noMatches ?? "");

    const count = checkedIds(root).length;
    if (confirm) confirm.disabled = count === 0;
    if (confirmLabel) {
      confirmLabel.textContent = count
        ? game.i18n.format("FATEX_INIT.AddActors.ConfirmCount", { count })
        : game.i18n.localize("FATEX_INIT.AddActors.Confirm");
    }
  };

  // Marca ou desmarca de uma vez os personagens visíveis (todos ou os de uma pasta)
  const setAll = (scope, checked) => {
    for (const box of boxesOf(visibleRows(scope))) if (!box.disabled) box.checked = checked;
    update();
  };

  search?.addEventListener("input", update);
  // Enter na busca não envia o diálogo: a lista já filtra enquanto se digita
  search?.addEventListener("keydown", (event) => { if (event.key === "Enter") event.preventDefault(); });
  toggleAll?.addEventListener("change", () => setAll(root, toggleAll.checked));
  for (const group of root.querySelectorAll(".fatex-add-combat__group")) {
    const toggle = group.querySelector(".fatex-add-combat__toggle-group");
    toggle?.addEventListener("change", () => setAll(group, toggle.checked));
  }
  for (const box of boxesOf(rows)) box.addEventListener("change", update);

  update();
  search?.focus();
}

/** O diálogo aberto agora (um só por vez: um segundo clique só o traz para a frente) */
let openDialog = null;

/**
 * Abre a lista de personagens para adicionar à iniciativa.
 * @returns {Promise<Combatant[]|null>} os combatentes criados, ou null se cancelou
 */
export async function openAddToInitiative() {
  if (!game.user.isGM) {
    ui.notifications.warn(game.i18n.localize("FATEX_INIT.AddActors.GMOnly"));
    return null;
  }
  if (openDialog) {
    if (openDialog.dialog?.rendered) openDialog.dialog.bringToFront?.();
    return null;
  }

  const state = (openDialog = { dialog: null });
  try {
    const combat = viewedCombat();
    const content = await foundry.applications.handlebars.renderTemplate(TEMPLATE, {
      groups: buildGroups(combat),
      hasCombat: !!combat,
      target: game.i18n.localize(combat ? "FATEX_INIT.AddActors.TargetCurrent" : "FATEX_INIT.AddActors.TargetNew")
    });

    const choice = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("FATEX_INIT.AddActors.Title"), icon: "fa-solid fa-user-plus" },
      classes: ["fatex-add-combat-dialog"],
      position: { width: 460 },
      content,
      buttons: [
        {
          action: "add",
          icon: "fa-solid fa-user-plus",
          label: game.i18n.localize("FATEX_INIT.AddActors.Confirm"),
          default: true,
          callback: (event, button) => readChoice(button.form)
        },
        {
          action: "cancel",
          icon: "fa-solid fa-xmark",
          label: game.i18n.localize("FATEX_INIT.Cancel")
        }
      ],
      render: (event, dialog) => {
        state.dialog = dialog;
        activateDialog(dialog.element);
      },
      rejectClose: false
    });

    if (!choice?.ids?.length) return null;
    // O encontro que o diálogo mostrou, se ainda existir (o rastreador pode ter trocado de encontro nesse meio-tempo)
    const target = combat && game.combats?.has(combat.id) ? combat : null;
    return await addActorsToInitiative(choice.ids, { combat: target, hidden: choice.hidden });
  } finally {
    if (openDialog === state) openDialog = null;
  }
}

/* ====================================================================== */
/*  Botão no rastreador de combate                                          */
/* ====================================================================== */

/**
 * Coloca o botão ao lado de "Rolar todos" / "Rolar PdMs". O rastreador redesenha o cabeçalho a cada mudança, então
 * o botão é recolocado a cada renderização (só uma vez por rastreador: o da barra lateral e o destacado).
 */
function injectTrackerButton(app, html) {
  if (!game.user?.isGM) return;
  const root = toElement(html) ?? toElement(app?.element);
  if (!root?.querySelector || root.querySelector(`.${BUTTON_CLASS}`)) return;

  const label = game.i18n.localize("FATEX_INIT.AddActors.Button");
  const button = document.createElement("button");
  button.type = "button";
  button.className = `inline-control icon fa-solid fa-user-plus ${BUTTON_CLASS}`;
  button.dataset.tooltip = label;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openAddToInitiative().catch((error) => {
      console.error(`${MODULE_ID} | Adicionar à iniciativa:`, error);
      ui.notifications.error(game.i18n.localize("FATEX_INIT.AddActors.Error"));
    });
  });

  const anchor = root.querySelector('.encounter-controls [data-action="rollNPC"]')
    ?? root.querySelector('.encounter-controls [data-action="rollAll"]');
  if (anchor) return anchor.after(button);

  // Sem os botões de rolar (outro módulo ou sistema pode tirá-los): no mesmo grupo, ou no começo dos controles
  const group = root.querySelector(".encounter-controls .control-buttons.left")
    ?? root.querySelector(".encounter-controls .control-buttons");
  if (group) return group.append(button);

  // (o cabeçalho do rastreador, não o da janela, quando ele está destacado)
  const controls = root.querySelector(".encounter-controls") ?? root.querySelector(".combat-tracker-header");
  controls?.prepend(button);
}

Hooks.on("renderCombatTracker", injectTrackerButton);

/* ====================================================================== */
/*  API para macros                                                         */
/* ====================================================================== */

Hooks.once("ready", () => {
  const module = game.modules.get(MODULE_ID);
  if (!module) return;
  module.api = Object.assign(module.api ?? {}, { addActorsToInitiative, openAddToInitiative });
});
