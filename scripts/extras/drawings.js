import { MODULE_ID } from "./constants.js";
import { AspectStorage } from "./aspect-storage.js";

/**
 * Aspectos de cena arrastados do Gerenciador de Aspectos para o mapa viram desenhos (Drawing) com texto.
 */

const fontSizeFor = (height) => Math.min(64, Math.max(10, Math.round(height * 0.18)));

function getSetting(key, fallback) {
  try {
    return game.settings.get(MODULE_ID, key) ?? fallback;
  } catch (err) {
    return fallback;
  }
}

/** Texto do desenho: nome, etiquetas e invocações (conforme as configurações) */
export function aspectDrawingText(aspect, allTags = []) {
  const aspectTags = (aspect.tagIds || []).map(tid => allTags.find(t => t.id === tid)).filter(Boolean);

  const showTags = getSetting("sceneDrawingShowTags", true);
  const showInvokes = getSetting("sceneDrawingShowInvokes", true);
  const showHostile = getSetting("sceneDrawingShowHostile", true);

  const tagsText = (showTags && aspectTags.length > 0) ? `[${aspectTags.map(t => t.label).join(" | ")}]` : "";

  let invokesLine = "";
  if (showInvokes || showHostile) {
    const invokesLabel = game.i18n.localize("FAx.Global.Invokes");
    const hostileLabel = game.i18n.localize("FAx.Global.HostileInvokes");

    if (showInvokes && showHostile) {
      invokesLine = `${invokesLabel}: ${aspect.invokes || 0} | ${hostileLabel}: ${aspect.hostileInvokes || 0}`;
    } else if (showInvokes) {
      invokesLine = `${invokesLabel}: ${aspect.invokes || 0}`;
    } else {
      invokesLine = `${hostileLabel}: ${aspect.hostileInvokes || 0}`;
    }
  }

  const text = aspect.name + (tagsText ? "\n" + tagsText : "") + (invokesLine ? "\n" + invokesLine : "");
  return { text, tagsText, invokesLine, hasTags: showTags && aspectTags.length > 0 };
}

function colorString(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value.css ?? value.toString?.() ?? fallback;
}

/** Dados do desenho de um aspecto centralizado em (x, y), em coordenadas do mapa */
export function createAspectDrawingData(aspect, allTags, x, y) {
  const { text, tagsText, invokesLine, hasTags } = aspectDrawingText(aspect, allTags);

  const width = Math.max(200, Math.max(aspect.name.length, tagsText.length, invokesLine.length) * 10);
  const height = hasTags ? 100 : 70;
  const bgAlpha = getSetting("sceneDrawingBgAlpha", 1);
  const strokeAlpha = getSetting("sceneDrawingStrokeAlpha", 0.3);
  const rectangle = foundry.data.ShapeData?.TYPES?.RECTANGLE ?? "r";

  return {
    author: game.user.id,
    x: x - width / 2,
    y: y - height / 2,
    shape: { type: rectangle, width, height },
    fillType: bgAlpha > 0 ? CONST.DRAWING_FILL_TYPES.SOLID : CONST.DRAWING_FILL_TYPES.NONE,
    fillColor: aspect.color || "#4a4a4a",
    fillAlpha: bgAlpha,
    strokeWidth: strokeAlpha > 0 ? 2 : 0,
    strokeColor: colorString(getSetting("sceneDrawingStrokeColor", "#ffffff"), "#ffffff"),
    strokeAlpha,
    text,
    fontFamily: getSetting("sceneDrawingFont", "Signika") || "Signika",
    fontSize: fontSizeFor(height),
    textColor: "#ffffff",
    textAlpha: 1,
    rotation: 0,
    hidden: false,
    locked: false,
    flags: {
      [MODULE_ID]: {
        isAspectDrawing: true,
        aspectId: aspect.id
      }
    }
  };
}

export const isAspectDrawing = (drawing) => !!drawing.getFlag(MODULE_ID, "isAspectDrawing");

/**
 * Atualiza o texto e a cor dos desenhos dos aspectos em todas as cenas (só o que mudou). Feito pelo GM.
 */
export async function updateAspectDrawings(aspectIds = null) {
  if (!game.user.isGM) return;
  const storage = AspectStorage.findStorage();
  if (!storage) return;

  const aspects = storage.getFlag(MODULE_ID, AspectStorage.FLAGS.ASPECTS) || [];
  const allTags = storage.getFlag(MODULE_ID, AspectStorage.FLAGS.TAGS) || [];
  const wanted = aspectIds ? new Set(aspectIds) : null;

  for (const scene of game.scenes ?? []) {
    const updates = [];
    for (const drawing of scene.drawings ?? []) {
      if (!isAspectDrawing(drawing)) continue;
      const aspectId = drawing.getFlag(MODULE_ID, "aspectId");
      if (wanted && !wanted.has(aspectId)) continue;
      const aspect = aspects.find(a => a.id === aspectId);
      if (!aspect) continue;

      const { text } = aspectDrawingText(aspect, allTags);
      const fillColor = aspect.color || "#4a4a4a";
      const fontSize = fontSizeFor(drawing.shape?.height ?? 70);
      const current = colorString(drawing.fillColor, "");
      if (drawing.text === text && current.toLowerCase() === fillColor.toLowerCase() && drawing.fontSize === fontSize) continue;
      updates.push({ _id: drawing.id, text, fillColor, fontSize });
    }
    if (updates.length) await scene.updateEmbeddedDocuments("Drawing", updates);
  }
}

/** Quando o desenho de um aspecto é redimensionado, a fonte acompanha a altura */
export async function fitAspectDrawingFont(drawing, changes, userId) {
  if (userId !== game.user.id) return;
  if (!isAspectDrawing(drawing)) return;
  if (changes?.shape?.height === undefined) return;
  const fontSize = fontSizeFor(drawing.shape.height);
  if (drawing.fontSize !== fontSize) await drawing.update({ fontSize });
}
