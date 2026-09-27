/**
 * FateX Continued Themes — Temas visuais
 *
 * Continuação do "fatex-themes" para o sistema FateX Continued (fatexcontinued) no Foundry VTT v14.
 * A iniciativa por perícia (antigo "fatex-initiative-skill") fica em scripts/initiative.js.
 *
 * Features:
 *  - Tema global do mundo + tema individual por ficha (override)
 *  - Botão de troca de tema no header (apenas GM por padrão)
 *  - Colapso dos botões do header em dropdown (☰) — economiza espaço
 *  - Restrições via setting (player pode trocar? colapsar header?)
 *  - Cartas que a ficha manda para o chat seguem o tema da ficha
 *  - Migra sozinho os temas e as configurações salvos pelo antigo "fatex-themes"
 */

const MODULE_ID = "fatexcontinued-themes";
const LEGACY_MODULE_ID = "fatex-themes";
const SYSTEM_ID = "fatexcontinued";
const FLAG_THEME = "theme";

const AVAILABLE_THEMES = [
  { id: "default",   label: "Padrão FateX" },
  { id: "bluelock",  label: "Blue Lock" },
  { id: "aegis",  label: "A.E.G.I.S" },
  {id: "jujutsukaisengojo", label: "Jujutsu Kaisen: Gojo" },
  {id: "jujutsukaisensukuna", label: "Jujutsu Kaisen: Sukuna" },
  {id: "jujutsukaisenkael", label: "Jujutsu Kaisen: Kael" },
  {id: "jujutsukaisenvitor", label: "Jujutsu Kaisen: Vitor" },
  {id: "jujutsukaisenbruno", label: "Jujutsu Kaisen: Bruno" },
  {id: "jujutsukaisenabel", label: "Jujutsu Kaisen: Abel" },
  {id: "jujutsukaiseneverin", label: "Jujutsu Kaisen: Everin" },
];

/* ====================================================================== */
/*  Helpers                                                                 */
/* ====================================================================== */

const isFateXContinued = () => game.system.id === SYSTEM_ID;
const moduleVersion = () => game.modules.get(MODULE_ID)?.version ?? "";
const toElement = (value) => (value?.jquery ? value[0] : value) ?? null;
const themeExists = (id) => AVAILABLE_THEMES.some(t => t.id === id);

const getGlobalTheme = () => game.settings.get(MODULE_ID, "globalTheme") ?? "default";
const getEffectiveTheme = (actor) => getIndividualTheme(actor) ?? getGlobalTheme();
const getThemeLabel = (id) => AVAILABLE_THEMES.find(t => t.id === id)?.label ?? id;

/**
 * Tema individual da ficha. Enquanto os dados do antigo "fatex-themes" ainda não foram migrados
 * (acontece na primeira vez que um GM abre o mundo), o tema salvo pelo módulo antigo também é lido.
 */
function getIndividualTheme(actor) {
  const theme = actor?.getFlag(MODULE_ID, FLAG_THEME);
  if (theme !== undefined && theme !== null) return theme;
  if (!legacyDataMigrated()) return actor?.flags?.[LEGACY_MODULE_ID]?.[FLAG_THEME] ?? null;
  return null;
}

function legacyDataMigrated() {
  try {
    return !!game.settings.get(MODULE_ID, "legacyThemesMigrated");
  } catch (err) {
    return true;
  }
}

function canChangeTheme(actor) {
  if (game.user.isGM) return true;
  if (!game.settings.get(MODULE_ID, "allowPlayerThemeChange")) return false;
  return actor.isOwner;
}

function rerenderActorSheets() {
  if (!isFateXContinued()) return;
  for (const app of Object.values(ui.windows)) {
    if (app.actor) app.render(false);
  }
}

/* ====================================================================== */
/*  Init: settings                                                          */
/* ====================================================================== */

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Inicializando v${moduleVersion()}`);

  // Nomes e dicas são chaves de tradução: o Foundry traduz ao exibir as configurações
  game.settings.register(MODULE_ID, "globalTheme", {
    name: "FATEX_THEMES.Settings.GlobalTheme.Name",
    hint: "FATEX_THEMES.Settings.GlobalTheme.Hint",
    scope: "world", config: true, type: String, default: "default",
    choices: AVAILABLE_THEMES.reduce((a, t) => { a[t.id] = t.label; return a; }, {}),
    onChange: () => {
      rerenderActorSheets();
      refreshChatThemes();
    }
  });

  game.settings.register(MODULE_ID, "allowPlayerThemeChange", {
    name: "FATEX_THEMES.Settings.AllowPlayer.Name",
    hint: "FATEX_THEMES.Settings.AllowPlayer.Hint",
    scope: "world", config: true, type: Boolean, default: false
  });

  game.settings.register(MODULE_ID, "collapseHeader", {
    name: "FATEX_THEMES.Settings.CollapseHeader.Name",
    hint: "FATEX_THEMES.Settings.CollapseHeader.Hint",
    scope: "client", config: true, type: Boolean, default: true,
    onChange: () => rerenderActorSheets()
  });

  // Interno: indica se os dados do antigo "fatex-themes" já foram copiados para este módulo
  game.settings.register(MODULE_ID, "legacyThemesMigrated", {
    scope: "world", config: false, type: Boolean, default: false
  });
});

/* ====================================================================== */
/*  Hook principal                                                          */
/* ====================================================================== */

Hooks.on("renderActorSheet", (sheet, html, data) => {
  const actor = sheet.actor;
  if (!actor) return;
  if (!isFateXContinued()) return;

  const effectiveTheme = getEffectiveTheme(actor);

  const form = toElement(html);
  if (!form) return;
  for (const cls of [...form.classList]) {
    if (cls.startsWith("theme-")) form.classList.remove(cls);
  }
  form.classList.add(`theme-${effectiveTheme}`);

  // Aplica a classe no app element também (pra pegar o header da janela)
  const appEl = toElement(sheet.element);
  if (appEl) {
    for (const cls of [...appEl.classList]) {
      if (cls.startsWith("theme-")) appEl.classList.remove(cls);
    }
    appEl.classList.add(`theme-${effectiveTheme}`);
  }

  if (canChangeTheme(actor)) injectThemeButton(sheet, actor);

  if (game.settings.get(MODULE_ID, "collapseHeader")) collapseHeaderButtons(sheet);
});

/* ====================================================================== */
/*  Botão de troca de tema                                                  */
/* ====================================================================== */

function injectThemeButton(sheet, actor) {
  const appEl = toElement(sheet.element);
  if (!appEl) return;

  const header = appEl.querySelector(".window-header .window-title");
  if (!header) return;
  if (appEl.querySelector(".fatex-themes-button")) return;

  const hasOverride = getIndividualTheme(actor) !== null;
  const iconClass = hasOverride ? "fa-palette" : "fa-globe";
  const tooltipKey = hasOverride
    ? "FATEX_THEMES.Tooltip.HasOverride"
    : "FATEX_THEMES.Tooltip.UsingGlobal";

  const btn = document.createElement("a");
  btn.classList.add("fatex-themes-button");
  btn.title = game.i18n.localize(tooltipKey);
  btn.innerHTML = `<i class="fas ${iconClass}"></i> ${game.i18n.localize("FATEX_THEMES.PickTheme")}`;
  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    openThemePicker(actor);
  });

  header.appendChild(btn);
}

/* ====================================================================== */
/*  Colapso dos botões do header em dropdown                                */
/* ====================================================================== */

function collapseHeaderButtons(sheet) {
  const appEl = toElement(sheet.element);
  if (!appEl) return;

  const header = appEl.querySelector(".window-header");
  if (!header) return;

  // Idempotência: se já colapsado, pula
  if (header.classList.contains("fatex-themes-collapsed")) return;

  // Pega todos os botões do header (exceto Close, que fica fora)
  const allButtons = [...header.querySelectorAll("a.header-button")];
  const collapsible = allButtons.filter(b => !b.classList.contains("close"));

  if (collapsible.length === 0) return;

  // Cria o botão toggle (☰ Menu)
  const toggle = document.createElement("a");
  toggle.classList.add("header-button", "fatex-themes-menu-toggle");
  toggle.title = game.i18n.localize("FATEX_THEMES.Menu");
  toggle.innerHTML = `<i class="fas fa-bars"></i> <span class="fatex-themes-menu-label">${game.i18n.localize("FATEX_THEMES.Menu")}</span>`;

  // Cria o dropdown (escondido por padrão)
  const dropdown = document.createElement("div");
  dropdown.classList.add("fatex-themes-dropdown");

  // Move botões para dentro do dropdown
  collapsible.forEach(btn => dropdown.appendChild(btn));

  // Click no toggle → abre/fecha o dropdown
  toggle.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    // Fecha qualquer outro dropdown aberto
    document.querySelectorAll(".fatex-themes-dropdown.open").forEach(d => {
      if (d !== dropdown) d.classList.remove("open");
    });
    dropdown.classList.toggle("open");
  });

  // Click em item do dropdown → fecha o menu (depois que o item executar)
  dropdown.addEventListener("click", (ev) => {
    const item = ev.target.closest("a.header-button");
    if (item) {
      // Pequeno delay pra deixar a ação rolar antes de fechar
      setTimeout(() => dropdown.classList.remove("open"), 50);
    }
  });

  // Posiciona toggle antes do Close, dropdown como filho do header
  const closeBtn = header.querySelector("a.header-button.close");
  if (closeBtn) header.insertBefore(toggle, closeBtn);
  else header.appendChild(toggle);

  header.appendChild(dropdown);
  header.classList.add("fatex-themes-collapsed");
}

/**
 * Click fora de um menu aberto → fecha. Um único listener para todas as fichas
 * (no lugar de um listener por ficha, que acumulava a cada ficha aberta).
 */
function closeDropdownsOnOutsideClick(ev) {
  document.querySelectorAll(".fatex-themes-dropdown.open").forEach(dropdown => {
    const toggle = dropdown.parentElement?.querySelector(".fatex-themes-menu-toggle");
    if (!dropdown.contains(ev.target) && !toggle?.contains(ev.target)) {
      dropdown.classList.remove("open");
    }
  });
}

/* ====================================================================== */
/*  Chat: cartas enviadas pela ficha seguem o tema da ficha                 */
/* ====================================================================== */

// Cartas que o FateX manda da ficha para o chat: aspectos, façanhas, extras e rolagens de perícia
const CHAT_CARD_SELECTOR = ".fatex-item-card, .fatex-chat";

/**
 * Aplica no <li> da mensagem o tema da ficha que a enviou (a do token, quando veio de um token não vinculado).
 * Só mexe nas classes que este módulo colocou (guardadas em data-fatex-theme); mensagens comuns, de outras
 * fichas sem tema ou com o tema "Padrão FateX" ficam como estão.
 */
function applyChatTheme(element, message) {
  if (!element?.classList) return;
  const previous = element.dataset.fatexTheme;
  if (previous) element.classList.remove("fatex-themes-chat", `theme-${previous}`);
  delete element.dataset.fatexTheme;

  if (!isFateXContinued()) return;
  if (!element.querySelector(CHAT_CARD_SELECTOR)) return;
  const actor = message?.speakerActor;
  if (!actor) return;
  const theme = getEffectiveTheme(actor);
  if (!theme || theme === "default") return;

  element.classList.add("fatex-themes-chat", `theme-${theme}`);
  element.dataset.fatexTheme = theme;
}

Hooks.on("renderChatMessageHTML", (message, html) => {
  let element = toElement(html);
  if (element && !element.matches?.(".chat-message")) element = element.querySelector?.(".chat-message") ?? element;
  applyChatTheme(element, message);
});

/** Reaplica o tema nas mensagens que já estão na tela (chat, chat destacado e notificações) */
function refreshChatThemes() {
  for (const element of document.querySelectorAll(".chat-message[data-message-id]")) {
    const message = game.messages?.get(element.dataset.messageId);
    if (message) applyChatTheme(element, message);
  }
}

// Tema trocado numa ficha (por qualquer usuário) → as cartas dela no chat acompanham
const changesTheme = (changes) => changes?.flags?.[MODULE_ID] !== undefined;
Hooks.on("updateActor", (actor, changes) => { if (changesTheme(changes)) refreshChatThemes(); });
Hooks.on("updateActorDelta", (delta, changes) => { if (changesTheme(changes)) refreshChatThemes(); });

/* ====================================================================== */
/*  Diálogo de seleção de tema                                              */
/* ====================================================================== */

async function openThemePicker(actor) {
  const individualTheme = getIndividualTheme(actor);
  const globalTheme = getGlobalTheme();

  const statusText = individualTheme === null
    ? game.i18n.format("FATEX_THEMES.Status.UsingGlobal", { theme: getThemeLabel(globalTheme) })
    : game.i18n.format("FATEX_THEMES.Status.HasOverride", { theme: getThemeLabel(individualTheme) });

  const useGlobalSelected = individualTheme === null ? "selected" : "";
  let optionsHtml = `<option value="__global__" ${useGlobalSelected}>🌐 ${game.i18n.format("FATEX_THEMES.UseGlobalOption", { theme: getThemeLabel(globalTheme) })}</option>`;
  optionsHtml += `<option disabled>──────────</option>`;
  optionsHtml += AVAILABLE_THEMES.map(t => {
    const selected = t.id === individualTheme ? "selected" : "";
    return `<option value="${t.id}" ${selected}>${t.label}</option>`;
  }).join("");

  // O DialogV2 já envolve o conteúdo num <form>
  const content = `
    <p style="background: rgba(0,0,0,0.05); padding: 8px; border-radius: 4px; margin-bottom: 10px;">
      <strong>${game.i18n.localize("FATEX_THEMES.CurrentStatus")}:</strong><br>
      ${statusText}
    </p>
    <div class="form-group">
      <label><strong>${game.i18n.localize("FATEX_THEMES.PickThemeLabel")}</strong></label>
      <select name="theme" style="width: 100%;">${optionsHtml}</select>
    </div>
    <p style="font-size: 11px; color: #888; margin-top: 8px;">
      ${game.i18n.localize("FATEX_THEMES.PickThemeHint")}
    </p>
  `;

  const newValue = await foundry.applications.api.DialogV2.wait({
    window: {
      title: `${game.i18n.localize("FATEX_THEMES.PickTheme")} — ${actor.name}`,
      icon: "fas fa-palette"
    },
    content,
    buttons: [
      {
        action: "save",
        icon: "fas fa-check",
        label: game.i18n.localize("FATEX_THEMES.Save"),
        default: true,
        callback: (event, button) => button.form.elements.theme.value
      },
      {
        action: "cancel",
        icon: "fas fa-times",
        label: game.i18n.localize("FATEX_THEMES.Cancel")
      }
    ],
    rejectClose: false
  });

  // Cancelar ou fechar a janela não muda nada
  if (!newValue || newValue === "cancel") return;

  if (newValue === "__global__") {
    await actor.unsetFlag(MODULE_ID, FLAG_THEME);
    ui.notifications.info(game.i18n.localize("FATEX_THEMES.Notif.ResetToGlobal"));
  } else {
    await actor.setFlag(MODULE_ID, FLAG_THEME, newValue);
    ui.notifications.info(game.i18n.format("FATEX_THEMES.Notif.ThemeSet", { theme: getThemeLabel(newValue) }));
  }
  actor.sheet?.render(false);
}

/* ====================================================================== */
/*  Migração do antigo "fatex-themes"                                       */
/* ====================================================================== */

/**
 * Copia para este módulo os temas individuais (flags dos atores) e as configurações de mundo
 * salvos pelo "fatex-themes". Nada é apagado. Roda uma única vez, pelo GM ativo.
 */
async function migrateLegacyData() {
  if (!game.user.isGM) return;
  const activeGM = game.users.activeGM;
  if (activeGM && activeGM.id !== game.user.id) return;
  if (legacyDataMigrated()) return;

  // Configurações de mundo
  const worldSettings = [...(game.settings.storage.get("world")?.values?.() ?? [])];
  const storedKeys = new Set(worldSettings.map(s => s.key));
  for (const key of ["globalTheme", "allowPlayerThemeChange"]) {
    const legacy = worldSettings.find(s => s.key === `${LEGACY_MODULE_ID}.${key}`);
    if (!legacy || storedKeys.has(`${MODULE_ID}.${key}`)) continue;
    let value = legacy._source?.value ?? legacy.value;
    if (typeof value === "string") {
      try { value = JSON.parse(value); } catch (err) { /* mantém o texto */ }
    }
    if (key === "globalTheme" && !themeExists(value)) continue;
    await game.settings.set(MODULE_ID, key, value);
  }

  // Temas individuais das fichas
  for (const actor of game.actors) {
    const theme = actor._source.flags?.[LEGACY_MODULE_ID]?.[FLAG_THEME];
    if (theme && !actor.getFlag(MODULE_ID, FLAG_THEME)) {
      await actor.setFlag(MODULE_ID, FLAG_THEME, theme);
    }
  }

  // Tokens não vinculados com tema próprio
  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.actorLink || !token.delta) continue;
      const theme = token.delta._source.flags?.[LEGACY_MODULE_ID]?.[FLAG_THEME];
      const actor = theme ? token.actor : null;
      if (actor && actor.getFlag(MODULE_ID, FLAG_THEME) !== theme) {
        await actor.setFlag(MODULE_ID, FLAG_THEME, theme);
      }
    }
  }

  await game.settings.set(MODULE_ID, "legacyThemesMigrated", true);
  console.log(`${MODULE_ID} | Temas do antigo "${LEGACY_MODULE_ID}" migrados`);
}

/**
 * A configuração "colapsar header" é salva por navegador (client); cada usuário migra a sua.
 */
async function migrateLegacyClientSettings() {
  const storage = game.settings.storage.get("client") ?? globalThis.localStorage;
  if (!storage) return;
  const legacy = storage.getItem(`${LEGACY_MODULE_ID}.collapseHeader`);
  if (legacy === null || storage.getItem(`${MODULE_ID}.collapseHeader`) !== null) return;
  try {
    await game.settings.set(MODULE_ID, "collapseHeader", JSON.parse(legacy));
  } catch (err) {
    console.warn(`${MODULE_ID} | Não foi possível migrar a configuração collapseHeader`, err);
  }
}

/* ====================================================================== */
/*  API para macros                                                         */
/* ====================================================================== */

Hooks.once("ready", () => {
  // A iniciativa (scripts/initiative.js) acrescenta as funções dela neste mesmo objeto
  const module = game.modules.get(MODULE_ID);
  module.api = Object.assign(module.api ?? {}, {
    setIndividualTheme: async (actor, themeId) => {
      if (themeId === null) await actor.unsetFlag(MODULE_ID, FLAG_THEME);
      else if (themeExists(themeId)) await actor.setFlag(MODULE_ID, FLAG_THEME, themeId);
      else { ui.notifications.warn(`Tema "${themeId}" não existe.`); return false; }
      if (actor.sheet?.rendered) actor.sheet.render(false);
      return true;
    },
    getIndividualTheme, getGlobalTheme, getEffectiveTheme,
    setGlobalTheme: async (themeId) => {
      if (!game.user.isGM) { ui.notifications.warn("Apenas o GM."); return false; }
      if (!themeExists(themeId)) { ui.notifications.warn(`Tema "${themeId}" não existe.`); return false; }
      await game.settings.set(MODULE_ID, "globalTheme", themeId);
      return true;
    },
    listThemes: () => [...AVAILABLE_THEMES]
  });
  console.log(`${MODULE_ID} | v${moduleVersion()} pronto`);
});

Hooks.once("ready", () => {
  if (game.user.isGM) {
    document.body.classList.add("user-isGM");
  } else {
    document.body.classList.add("user-isPlayer");
  }
  document.addEventListener("click", closeDropdownsOnOutsideClick);
});

Hooks.once("ready", async () => {
  try {
    await migrateLegacyClientSettings();
    await migrateLegacyData();
  } catch (err) {
    console.error(`${MODULE_ID} | Falha ao migrar os dados do "${LEGACY_MODULE_ID}"`, err);
  }
});
