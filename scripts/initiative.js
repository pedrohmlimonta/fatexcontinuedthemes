/**
 * FateX Continued Themes — Iniciativa por perícia
 *
 * Incorpora o antigo módulo "fatex-initiative-skill".
 *
 * Como funciona:
 *   - Configuração do mundo: nome da perícia padrão para iniciativa (ex.: "Velocidade")
 *   - Flag por ficha "initiativeSkill": perícia própria da ficha (sem ela, usa a do mundo)
 *   - Flag por ficha "initiativeBonus": bônus numérico que soma na rolagem
 *   - Intercepta Combatant#getInitiativeRoll e rola `4df + rank_da_perícia + bônus`
 *   - Funciona com QUALQUER tracker (Carousel, padrão etc.), porque intercepta no nível do core do Foundry.
 *   - Migra sozinho as configurações e os bônus salvos pelo antigo "fatex-initiative-skill"
 */

const MODULE_ID = "fatexcontinued-themes";
const LEGACY_MODULE_ID = "fatex-initiative-skill";
const SYSTEM_ID = "fatexcontinued";
const FLAG_SKILL = "initiativeSkill";
const FLAG_BONUS = "initiativeBonus";

/* ====================================================================== */
/*  Helpers                                                                 */
/* ====================================================================== */

const isFateXContinued = () => game.system.id === SYSTEM_ID;
const toElement = (value) => (value?.jquery ? value[0] : value) ?? null;

function legacyDataMigrated() {
  try {
    return !!game.settings.get(MODULE_ID, "legacyInitiativeMigrated");
  } catch (err) {
    return true;
  }
}

/**
 * Flag de iniciativa da ficha. Enquanto os dados do antigo "fatex-initiative-skill" ainda não foram migrados
 * (acontece na primeira vez que um GM abre o mundo), o valor salvo pelo módulo antigo também é lido.
 */
function getActorFlag(actor, key) {
  const value = actor?.getFlag(MODULE_ID, key);
  if (value !== undefined && value !== null) return value;
  if (!legacyDataMigrated()) return actor?.flags?.[LEGACY_MODULE_ID]?.[key] ?? null;
  return null;
}

const getGlobalSkillName = () =>
  game.settings.get(MODULE_ID, "initiativeSkill") ?? "";

const getIndividualSkillName = (actor) =>
  getActorFlag(actor, FLAG_SKILL);

const getEffectiveSkillName = (actor) =>
  getIndividualSkillName(actor) ?? getGlobalSkillName();

const getBonus = (actor) =>
  Number(getActorFlag(actor, FLAG_BONUS) ?? 0) || 0;

function canConfigure(actor) {
  if (game.user.isGM) return true;
  if (!game.settings.get(MODULE_ID, "allowPlayerInitiative")) return false;
  return actor.isOwner;
}

/** Acha um item do tipo "skill" pelo nome (sem diferenciar maiúsculas/minúsculas) */
function findSkillItem(actor, skillName) {
  if (!skillName) return null;
  const target = skillName.trim().toLowerCase();
  return actor.items.find(i =>
    i.type === "skill" && i.name?.trim().toLowerCase() === target
  ) ?? null;
}

/** Extrai o rank da perícia. O FateX usa system.rank, com fallbacks defensivos. */
function getSkillRank(skillItem) {
  if (!skillItem) return 0;
  const s = skillItem.system ?? {};
  const rank = s.rank ?? s.value ?? s.level ?? 0;
  return Number(rank) || 0;
}

/** Lista todas as perícias (Items type=skill) de um actor */
function listActorSkills(actor) {
  return actor.items
    .filter(i => i.type === "skill")
    .map(i => ({ id: i.id, name: i.name, rank: getSkillRank(i) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ====================================================================== */
/*  Init: settings                                                          */
/* ====================================================================== */

Hooks.once("init", () => {
  // Nomes e dicas são chaves de tradução: o Foundry traduz ao exibir as configurações
  game.settings.register(MODULE_ID, "initiativeSkill", {
    name: "FATEX_INIT.Settings.GlobalSkill.Name",
    hint: "FATEX_INIT.Settings.GlobalSkill.Hint",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, "allowPlayerInitiative", {
    name: "FATEX_INIT.Settings.AllowPlayer.Name",
    hint: "FATEX_INIT.Settings.AllowPlayer.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Interno: indica se os dados do antigo "fatex-initiative-skill" já foram copiados para este módulo
  game.settings.register(MODULE_ID, "legacyInitiativeMigrated", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
});

// No "setup" todos os sistemas e módulos já definiram a classe de Combatant que será usada
Hooks.once("setup", () => patchCombatant());

/* ====================================================================== */
/*  PATCH: intercepta a rolagem de iniciativa                               */
/* ====================================================================== */

/**
 * Fórmula `4df + rank + bônus` do combatente, ou null para deixar o Foundry usar a fórmula padrão
 * (nenhuma perícia configurada, combatente sem ficha ou outro sistema).
 */
function buildInitiativeFormula(combatant) {
  const actor = combatant.actor;
  if (!actor) return null;
  if (!isFateXContinued()) return null;

  const skillName = getEffectiveSkillName(actor);
  if (!skillName) return null;

  const skillItem = findSkillItem(actor, skillName);
  const rank = getSkillRank(skillItem);
  const bonus = getBonus(actor);

  // Avisa o GM se a perícia configurada não existe nesse actor
  if (!skillItem && game.user.isGM) {
    ui.notifications.warn(
      game.i18n.format("FATEX_INIT.Notif.SkillNotFound", {
        skill: skillName,
        actor: actor.name
      })
    );
  }

  // Monta a fórmula final: 4df + rank + bonus (valores negativos viram subtração)
  const parts = ["4df"];
  if (rank) parts.push(rank >= 0 ? `+ ${rank}` : `- ${Math.abs(rank)}`);
  if (bonus) parts.push(bonus >= 0 ? `+ ${bonus}` : `- ${Math.abs(bonus)}`);
  return parts.join(" ");
}

function patchCombatant() {
  const proto = CONFIG.Combatant?.documentClass?.prototype;
  if (typeof proto?.getInitiativeRoll !== "function") {
    console.error(`${MODULE_ID} | Combatant#getInitiativeRoll não existe — versão do Foundry incompatível?`);
    return;
  }

  const original = proto.getInitiativeRoll;

  proto.getInitiativeRoll = function (formula) {
    // Se outra coisa passou uma fórmula explícita, respeita (ex.: macro custom)
    if (!formula) {
      try {
        formula = buildInitiativeFormula(this) ?? formula;
      } catch (err) {
        console.error(`${MODULE_ID} | Erro ao montar a fórmula de iniciativa:`, err);
      }
    }
    // O próprio Foundry cria a rolagem (com os dados da ficha), como faria normalmente
    return original.call(this, formula);
  };

  console.log(`${MODULE_ID} | Combatant#getInitiativeRoll interceptado (iniciativa por perícia)`);
}

/* ====================================================================== */
/*  UI: botão na ficha do actor                                             */
/* ====================================================================== */

Hooks.on("renderActorSheet", (sheet, html, data) => {
  const actor = sheet.actor;
  if (!actor) return;
  if (!isFateXContinued()) return;
  if (!canConfigure(actor)) return;

  const appEl = toElement(sheet.element);
  if (!appEl) return;

  const header = appEl.querySelector(".window-header .window-title");
  if (!header) return;
  if (appEl.querySelector(".fatex-init-button")) return;

  const hasOverride = getIndividualSkillName(actor) !== null;
  const bonus = getBonus(actor);

  const btn = document.createElement("a");
  btn.classList.add("fatex-init-button");
  btn.title = game.i18n.localize("FATEX_INIT.Tooltip");

  const icon = hasOverride || bonus ? "fa-bolt" : "fa-stopwatch";
  const bonusBadge = bonus ? ` (${bonus >= 0 ? "+" : ""}${bonus})` : "";
  btn.innerHTML = `<i class="fas ${icon}"></i> ${game.i18n.localize("FATEX_INIT.ButtonLabel")}${bonusBadge}`;

  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    openInitiativeConfig(actor);
  });

  header.appendChild(btn);
});

/* ====================================================================== */
/*  Diálogo de configuração                                                 */
/* ====================================================================== */

async function openInitiativeConfig(actor) {
  const escape = foundry.utils.escapeHTML;
  const individual = getIndividualSkillName(actor);
  const global = getGlobalSkillName();
  const bonus = getBonus(actor);

  const skills = listActorSkills(actor);

  // Status
  let statusText;
  if (individual === null) {
    statusText = global
      ? game.i18n.format("FATEX_INIT.Status.UsingGlobal", { skill: escape(global) })
      : game.i18n.localize("FATEX_INIT.Status.NoGlobal");
  } else {
    statusText = game.i18n.format("FATEX_INIT.Status.HasOverride", { skill: escape(individual) });
  }

  // Monta opções do select
  const useGlobalSelected = individual === null ? "selected" : "";
  const globalLabel = global
    ? game.i18n.format("FATEX_INIT.UseGlobalOption", { skill: escape(global) })
    : game.i18n.localize("FATEX_INIT.UseGlobalOptionEmpty");

  let optionsHtml = `<option value="__global__" ${useGlobalSelected}>🌐 ${globalLabel}</option>`;
  optionsHtml += `<option disabled>──────────</option>`;

  if (skills.length === 0) {
    optionsHtml += `<option disabled>${game.i18n.localize("FATEX_INIT.NoSkills")}</option>`;
  } else {
    optionsHtml += skills.map(s => {
      const selected = (individual && s.name.toLowerCase() === String(individual).toLowerCase()) ? "selected" : "";
      return `<option value="${escape(s.name)}" ${selected}>${escape(s.name)} (${s.rank >= 0 ? "+" : ""}${s.rank})</option>`;
    }).join("");
  }

  // O DialogV2 já envolve o conteúdo num <form>
  const content = `
    <div class="fatex-init-config">
      <p style="background: rgba(0,0,0,0.05); padding: 8px; border-radius: 4px; margin-bottom: 10px;">
        <strong>${game.i18n.localize("FATEX_INIT.CurrentStatus")}:</strong><br>
        ${statusText}
      </p>

      <div class="form-group">
        <label><strong>${game.i18n.localize("FATEX_INIT.SkillLabel")}</strong></label>
        <select name="skill" style="width: 100%;">${optionsHtml}</select>
      </div>

      <div class="form-group">
        <label><strong>${game.i18n.localize("FATEX_INIT.BonusLabel")}</strong></label>
        <input type="number" name="bonus" value="${bonus}" style="width: 100%;" />
        <p class="hint" style="font-size: 11px; color: #888; margin: 4px 0 0 0;">
          ${game.i18n.localize("FATEX_INIT.BonusHint")}
        </p>
      </div>

      <p style="font-size: 11px; color: #888; margin-top: 10px;">
        ${game.i18n.localize("FATEX_INIT.DialogHint")}
      </p>
    </div>
  `;

  const result = await foundry.applications.api.DialogV2.wait({
    window: {
      title: `${game.i18n.localize("FATEX_INIT.DialogTitle")} — ${actor.name}`,
      icon: "fas fa-stopwatch"
    },
    content,
    buttons: [
      {
        action: "save",
        icon: "fas fa-check",
        label: game.i18n.localize("FATEX_INIT.Save"),
        default: true,
        callback: (event, button) => ({
          skill: button.form.elements.skill.value,
          bonus: Number(button.form.elements.bonus.value) || 0
        })
      },
      {
        action: "cancel",
        icon: "fas fa-times",
        label: game.i18n.localize("FATEX_INIT.Cancel")
      }
    ],
    rejectClose: false
  });

  // Cancelar ou fechar a janela não muda nada
  if (!result || typeof result !== "object") return;

  if (result.skill === "__global__") {
    await actor.unsetFlag(MODULE_ID, FLAG_SKILL);
  } else {
    await actor.setFlag(MODULE_ID, FLAG_SKILL, result.skill);
  }

  if (result.bonus === 0) {
    await actor.unsetFlag(MODULE_ID, FLAG_BONUS);
  } else {
    await actor.setFlag(MODULE_ID, FLAG_BONUS, result.bonus);
  }

  ui.notifications.info(game.i18n.localize("FATEX_INIT.Notif.Saved"));
  actor.sheet?.render(false);
}

/* ====================================================================== */
/*  Migração do antigo "fatex-initiative-skill"                             */
/* ====================================================================== */

/**
 * Copia para este módulo as configurações de mundo e as flags de iniciativa (perícia e bônus) salvas pelo
 * "fatex-initiative-skill". Nada é apagado. Roda uma única vez, pelo GM ativo.
 */
async function migrateLegacyData() {
  if (!game.user.isGM) return;
  const activeGM = game.users.activeGM;
  if (activeGM && activeGM.id !== game.user.id) return;
  if (legacyDataMigrated()) return;

  // Configurações de mundo (nome antigo → nome novo)
  const settingKeys = { globalSkill: "initiativeSkill", allowPlayerConfig: "allowPlayerInitiative" };
  const worldSettings = [...(game.settings.storage.get("world")?.values?.() ?? [])];
  const storedKeys = new Set(worldSettings.map(s => s.key));
  for (const [legacyKey, key] of Object.entries(settingKeys)) {
    const legacy = worldSettings.find(s => s.key === `${LEGACY_MODULE_ID}.${legacyKey}`);
    if (!legacy || storedKeys.has(`${MODULE_ID}.${key}`)) continue;
    let value = legacy._source?.value ?? legacy.value;
    if (typeof value === "string") {
      try { value = JSON.parse(value); } catch (err) { /* mantém o texto */ }
    }
    await game.settings.set(MODULE_ID, key, value);
  }

  /**
   * Copia perícia e bônus antigos para as flags deste módulo.
   * Fichas: só preenche o que ainda não existe. Tokens não vinculados: aplica o valor próprio do token.
   */
  const copyFlags = async (actor, legacyFlags, { isToken = false } = {}) => {
    const changes = {};
    for (const key of [FLAG_SKILL, FLAG_BONUS]) {
      const value = legacyFlags?.[key];
      if (value === undefined || value === null) continue;
      const current = actor.getFlag(MODULE_ID, key);
      if (isToken ? current === value : current !== undefined) continue;
      changes[`flags.${MODULE_ID}.${key}`] = value;
    }
    if (Object.keys(changes).length) await actor.update(changes);
  };

  for (const actor of game.actors) {
    await copyFlags(actor, actor._source.flags?.[LEGACY_MODULE_ID]);
  }

  for (const scene of game.scenes) {
    for (const token of scene.tokens) {
      if (token.actorLink || !token.delta) continue;
      const legacyFlags = token.delta._source.flags?.[LEGACY_MODULE_ID];
      const actor = legacyFlags ? token.actor : null;
      if (actor) await copyFlags(actor, legacyFlags, { isToken: true });
    }
  }

  await game.settings.set(MODULE_ID, "legacyInitiativeMigrated", true);
  console.log(`${MODULE_ID} | Iniciativa do antigo "${LEGACY_MODULE_ID}" migrada`);
}

/* ====================================================================== */
/*  API para macros                                                         */
/* ====================================================================== */

Hooks.once("ready", async () => {
  // A API é a mesma dos temas: game.modules.get("fatexcontinued-themes").api
  const module = game.modules.get(MODULE_ID);
  module.api = Object.assign(module.api ?? {}, {
    setIndividualSkill: async (actor, skillName) => {
      if (skillName === null || skillName === undefined) {
        await actor.unsetFlag(MODULE_ID, FLAG_SKILL);
      } else {
        await actor.setFlag(MODULE_ID, FLAG_SKILL, String(skillName));
      }
      if (actor.sheet?.rendered) actor.sheet.render(false);
      return true;
    },
    setBonus: async (actor, bonus) => {
      const n = Number(bonus) || 0;
      if (n === 0) await actor.unsetFlag(MODULE_ID, FLAG_BONUS);
      else await actor.setFlag(MODULE_ID, FLAG_BONUS, n);
      if (actor.sheet?.rendered) actor.sheet.render(false);
      return true;
    },
    setGlobalSkill: async (skillName) => {
      if (!game.user.isGM) {
        ui.notifications.warn("Apenas GM.");
        return false;
      }
      await game.settings.set(MODULE_ID, "initiativeSkill", String(skillName ?? ""));
      return true;
    },
    getEffectiveSkill: (actor) => ({
      skillName: getEffectiveSkillName(actor),
      bonus: getBonus(actor),
      isOverride: getIndividualSkillName(actor) !== null
    }),
    listActorSkills
  });

  try {
    await migrateLegacyData();
  } catch (err) {
    console.error(`${MODULE_ID} | Falha ao migrar os dados do "${LEGACY_MODULE_ID}"`, err);
  }
});
