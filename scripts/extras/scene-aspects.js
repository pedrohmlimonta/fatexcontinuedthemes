import { MODULE_ID, TEMPLATES_PATH, confirmDialog } from "./constants.js";
import { AspectStorage } from "./aspect-storage.js";

const escape = (value) => foundry.utils.escapeHTML(String(value ?? ""));

/**
 * Gerenciador de Aspectos: aspectos de cena organizados em categorias, com etiquetas, invocações grátis,
 * invocações do GM, visibilidade e arrastar-e-soltar (inclusive para o mapa).
 * Janela no formato Application V1 (o mesmo das fichas do FateX), que o Foundry mantém até a v16.
 */
export class SceneAspectsApp extends foundry.appv1.api.FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "fatex-scene-aspects",
      title: game.i18n.localize("FAx.Global.ManageAspects"),
      template: `${TEMPLATES_PATH}/scene-aspects.hbs`,
      width: 500,
      height: 600,
      classes: ["fatex", "fatex-extras-app"],
      resizable: true,
      closeOnSubmit: false,
      submitOnChange: false,
      scrollY: [".fatex-desk__content"],
      dragDrop: [
        { dragSelector: ".fatex-scene-aspect, .aspect-tag-pill, .fatex-group-header", dropSelector: ".fatex-desk__aspects" }
      ]
    });
  }

  /** Reabre (ou traz para frente) a janela */
  static open() {
    const existing = Object.values(ui.windows).find(w => w instanceof SceneAspectsApp);
    if (existing) return existing.render(true);
    return new SceneAspectsApp().render(true);
  }

  _autoResizeTextareas() {
    this.element.find("textarea.aspect-name").each(function () {
      this.style.height = "auto";
      this.style.height = (this.scrollHeight) + "px";
    });
  }

  _onResize(event) {
    super._onResize(event);
    this._autoResizeTextareas();
  }

  async getData() {
    const storage = await AspectStorage.getStorage();

    const aspects = storage ? (storage.getFlag(MODULE_ID, AspectStorage.FLAGS.ASPECTS) || []) : [];
    const groups = storage ? (storage.getFlag(MODULE_ID, AspectStorage.FLAGS.GROUPS) || []) : [];
    const globalTags = storage ? (storage.getFlag(MODULE_ID, AspectStorage.FLAGS.TAGS) || []) : [];

    const filteredAspects = game.user.isGM ? aspects : aspects.filter(a => !a.hidden);
    const filteredGroups = game.user.isGM ? groups : groups.filter(g => !g.hidden);

    const withTags = (a) => {
      const aspectTags = (a.tagIds || []).map(tid => globalTags.find(t => t.id === tid)).filter(t => !!t);
      return { ...a, displayTags: aspectTags, isGM: game.user.isGM };
    };

    const groupedData = filteredGroups.map(g => ({
      ...g,
      aspects: filteredAspects.filter(a => a.groupId === g.id).map(withTags)
    }));

    const orphanAspects = filteredAspects.filter(a => !a.groupId || !groups.some(g => g.id === a.groupId)).map(withTags);
    if (orphanAspects.length > 0) {
      groupedData.push({ id: "default", label: game.i18n.localize("FAx.Global.Uncategorized"), aspects: orphanAspects });
    }

    return {
      groups: groupedData,
      globalTags,
      isGM: game.user.isGM,
      waitingForGM: !storage && !game.user.isGM
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".create-group").on("click", (e) => this._onCreateGroup(e));
    html.find(".group-label").on("change", (e) => this._onUpdateGroupLabel(e));
    html.find(".group-delete").on("click", (e) => this._onDeleteGroup(e));
    html.find(".group-visibility").on("click", (e) => this._onToggleGroupVisibility(e));
    html.find(".group-collapse").on("click", (e) => this._onToggleGroupCollapse(e));
    html.find(".manage-tags").on("click", (e) => this._onManageTags(e));
    html.find(".aspect-color-trigger").on("change", (e) => this._onUpdateAspect(e));
    html.find(".create-aspect").on("click", (e) => this._onCreateAspect(e));
    html.find(".aspect-delete").on("click", (e) => this._onDeleteAspect(e));
    html.find(".aspect-name").on("change", (e) => this._onUpdateAspect(e));
    html.find(".aspect-tag-remove").on("click", (e) => this._onRemoveTagFromAspect(e));
    html.find(".add-tag-to-aspect").on("click", (e) => this._onShowTagPicker(e));
    html.find(".aspect-visibility").on("click", (e) => this._onToggleVisibility(e));
    html.find("textarea.aspect-name").each(function () {
      this.style.height = "auto";
      this.style.height = (this.scrollHeight) + "px";
    }).on("input", function () {
      this.style.height = "auto";
      this.style.height = (this.scrollHeight) + "px";
    });
    html.find(".invoke-control").on("click", (e) => this._onModifyInvokes(e));
  }

  static _tagRow(tag = {}) {
    return `<div class="fatex-tag-row" data-id="${escape(tag.id)}">`
      + `<input type="text" class="tag-label" value="${escape(tag.label ?? game.i18n.localize("FAx.Global.NewTag"))}" placeholder="${escape(game.i18n.localize("FAx.Global.TagName"))}">`
      + `<input type="color" class="tag-color" value="${escape(tag.color || "#7a7a7a")}">`
      + `<i class="fas fa-trash delete-tag"></i></div>`;
  }

  async _onManageTags(event) {
    event.preventDefault();
    if (!game.user.isGM) return;
    const storage = await AspectStorage.getStorage();
    if (!storage) return;

    const tags = storage.getFlag(MODULE_ID, AspectStorage.FLAGS.TAGS) || [];
    const content = `<div class="fatex-tag-manager">${tags.map(tag => SceneAspectsApp._tagRow(tag)).join("")}`
      + `<button type="button" class="add-tag-btn"><i class="fas fa-plus"></i> ${game.i18n.localize("FAx.Global.AddTag")}</button></div>`;

    const newTags = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("FAx.Global.ManageTags"), icon: "fas fa-tags" },
      classes: ["fatex-extras-tags-dialog"],
      content,
      buttons: [{
        action: "save",
        icon: "fas fa-check",
        label: game.i18n.localize("FAx.Global.Save"),
        default: true,
        callback: (ev, button) => [...button.form.querySelectorAll(".fatex-tag-row")].map(row => ({
          id: row.dataset.id || foundry.utils.randomID(),
          label: row.querySelector(".tag-label").value,
          color: row.querySelector(".tag-color").value
        }))
      }],
      render: (ev, dialog) => {
        const manager = dialog.element.querySelector(".fatex-tag-manager");
        const bindDelete = (root) => root.querySelectorAll(".delete-tag").forEach(icon => {
          icon.addEventListener("click", () => icon.closest(".fatex-tag-row")?.remove());
        });
        bindDelete(manager);
        manager.querySelector(".add-tag-btn").addEventListener("click", () => {
          const template = document.createElement("template");
          template.innerHTML = SceneAspectsApp._tagRow({ id: "" });
          const row = template.content.firstElementChild;
          manager.querySelector(".add-tag-btn").before(row);
          bindDelete(row);
        });
      },
      rejectClose: false
    });

    if (!Array.isArray(newTags)) return;
    const aspects = await this._getAspects();
    const validTagIds = newTags.map(t => t.id);
    aspects.forEach(a => { if (a.tagIds) a.tagIds = a.tagIds.filter(tid => validTagIds.includes(tid)); });
    await this._saveAll(aspects, null, newTags);
  }

  async _onShowTagPicker(event) {
    if (!game.user.isGM) return;
    const aspectId = event.currentTarget.dataset.id;
    const storage = await AspectStorage.getStorage();
    if (!storage) return;

    const globalTags = storage.getFlag(MODULE_ID, AspectStorage.FLAGS.TAGS) || [];
    const aspects = await this._getAspects();
    const aspect = aspects.find(a => a.id === aspectId);
    if (!aspect) return;

    const currentTagIds = aspect.tagIds || [];
    const availableTags = globalTags.filter(t => !currentTagIds.includes(t.id));

    let content = `<div class="fatex-tag-picker">`;
    if (availableTags.length > 0) {
      content += `<label><b>${game.i18n.localize("FAx.Global.PickExistingTag")}</b></label><div class="tag-list-scroll">`;
      availableTags.forEach(t => {
        content += `<button type="button" class="pick-tag" data-tag-id="${escape(t.id)}" style="border-left: 4px solid ${escape(t.color)}">${escape(t.label)}</button>`;
      });
      content += `</div><hr>`;
    }
    content += `<label><b>${game.i18n.localize("FAx.Global.CreateNewTag")}</b></label>`
      + `<div class="form-group"><input type="text" name="new-tag-name" placeholder="${escape(game.i18n.localize("FAx.Global.TagName"))}" style="margin-bottom: 5px;">`
      + `<div style="display: flex; align-items: center; gap: 10px;"><label>${game.i18n.localize("FAx.Global.Color")}</label>`
      + `<input type="color" name="new-tag-color" value="#7a7a7a" style="height: 30px; cursor: pointer;"></div></div></div>`;

    const result = await foundry.applications.api.DialogV2.wait({
      window: { title: game.i18n.localize("FAx.Global.AddTag"), icon: "fas fa-tag" },
      classes: ["fatex-extras-tags-dialog"],
      position: { width: 400 },
      content,
      buttons: [{
        action: "create",
        icon: "fas fa-plus",
        label: game.i18n.localize("FAx.Global.CreateAndAdd"),
        default: true,
        callback: (ev, button) => ({
          name: button.form.elements["new-tag-name"].value.trim(),
          color: button.form.elements["new-tag-color"].value
        })
      }],
      render: (ev, dialog) => {
        dialog.element.querySelectorAll(".pick-tag").forEach(pick => {
          pick.addEventListener("click", async () => {
            const tid = pick.dataset.tagId;
            const updatedAspects = await this._getAspects();
            const targetAspect = updatedAspects.find(a => a.id === aspectId);
            if (targetAspect) targetAspect.tagIds = [...(targetAspect.tagIds || []), tid];
            await this._saveAspects(updatedAspects);
            dialog.close();
          });
        });
      },
      rejectClose: false
    });

    if (!result?.name) return;
    const newTag = { id: foundry.utils.randomID(), label: result.name, color: result.color };
    const updatedGlobalTags = [...globalTags, newTag];
    const updatedAspects = await this._getAspects();
    const targetAspect = updatedAspects.find(a => a.id === aspectId);
    if (targetAspect) targetAspect.tagIds = [...(targetAspect.tagIds || []), newTag.id];
    await this._saveAll(updatedAspects, null, updatedGlobalTags);
  }

  async _onRemoveTagFromAspect(event) {
    if (!game.user.isGM) return;
    const aspects = await this._getAspects();
    const aspect = aspects.find(a => a.id === event.currentTarget.dataset.id);
    if (aspect && aspect.tagIds) {
      aspect.tagIds = aspect.tagIds.filter(tid => tid !== event.currentTarget.dataset.tagId);
      await this._saveAspects(aspects);
    }
  }

  async _onToggleGroupVisibility(event) {
    event.preventDefault();
    if (!game.user.isGM) return;
    const groups = await this._getGroups();
    const group = groups.find(g => g.id === event.currentTarget.dataset.groupId);
    if (group) { group.hidden = !group.hidden; await this._saveGroups(groups); }
  }

  async _onToggleGroupCollapse(event) {
    event.preventDefault();
    const groups = await this._getGroups();
    const group = groups.find(g => g.id === event.currentTarget.dataset.groupId);
    if (group) { group.collapsed = !group.collapsed; await this._saveGroups(groups); }
  }

  async _onToggleVisibility(event) {
    event.preventDefault();
    if (!game.user.isGM) return;
    const aspects = await this._getAspects();
    const aspect = aspects.find(a => a.id === event.currentTarget.dataset.id);
    if (aspect) { aspect.hidden = !aspect.hidden; await this._saveAspects(aspects); }
  }

  async _onCreateAspect(event) {
    if (!game.user.isGM) return;
    const groupId = event.currentTarget.dataset.groupId || "default";
    const aspects = await this._getAspects();
    aspects.push({
      id: foundry.utils.randomID(),
      name: game.i18n.localize("FAx.Global.NewAspect"),
      color: "#4a4a4a",
      tagIds: [],
      invokes: 0,
      hostileInvokes: 0,
      groupId
    });
    await this._saveAspects(aspects);
  }

  async _onCreateGroup(event) {
    if (!game.user.isGM) return;
    const groups = await this._getGroups();
    groups.push({ id: foundry.utils.randomID(), label: game.i18n.localize("FAx.Global.NewCategory") });
    await this._saveGroups(groups);
  }

  async _onUpdateGroupLabel(event) {
    if (!game.user.isGM) return;
    const groups = await this._getGroups();
    const group = groups.find(g => g.id === event.currentTarget.dataset.groupId);
    if (group) { group.label = event.currentTarget.value; await this._saveGroups(groups); }
  }

  async _onDeleteGroup(event) {
    if (!game.user.isGM) return;
    const groupId = event.currentTarget.dataset.groupId;
    const confirmed = await confirmDialog(
      game.i18n.localize("FAx.Global.DeleteCategory"),
      `<p>${game.i18n.localize("FAx.Global.DeleteCategoryConfirm")}</p>`
    );
    if (!confirmed) return;

    const groups = (await this._getGroups()).filter(g => g.id !== groupId);
    const aspects = (await this._getAspects()).filter(a => a.groupId !== groupId);
    await this._saveAll(aspects, groups);
  }

  async _onDeleteAspect(event) {
    if (!game.user.isGM) return;
    const aspectId = event.currentTarget.dataset.id;
    const confirmed = await confirmDialog(
      game.i18n.localize("FAx.Global.DeleteAspectTitle"),
      `<p>${game.i18n.localize("FAx.Global.DeleteAspectConfirm")}</p>`
    );
    if (!confirmed) return;

    const aspects = (await this._getAspects()).filter(a => a.id !== aspectId);
    await this._saveAspects(aspects);
  }

  async _onUpdateAspect(event) {
    if (!game.user.isGM) return;
    const input = event.currentTarget;
    const aspects = await this._getAspects();
    const aspect = aspects.find(a => a.id === input.dataset.id);
    if (aspect) { aspect[input.dataset.field || "name"] = input.value; await this._saveAspects(aspects); }
  }

  async _onModifyInvokes(event) {
    const btn = event.currentTarget;
    const aspects = await this._getAspects();
    const aspect = aspects.find(a => a.id === btn.dataset.id);
    if (aspect) {
      const field = btn.dataset.field || "invokes";
      if (btn.dataset.action === "increase") aspect[field] = (aspect[field] || 0) + 1;
      else aspect[field] = Math.max(0, (aspect[field] || 0) - 1);
      await this._saveAspects(aspects);
    }
  }

  async _updateObject(event, formData) {}

  async _getGroups() {
    const storage = await AspectStorage.getStorage();
    return storage ? foundry.utils.deepClone(storage.getFlag(MODULE_ID, AspectStorage.FLAGS.GROUPS) || []) : [];
  }

  async _getAspects() {
    const storage = await AspectStorage.getStorage();
    return storage ? foundry.utils.deepClone(storage.getFlag(MODULE_ID, AspectStorage.FLAGS.ASPECTS) || []) : [];
  }

  async _saveGroups(groups) { await this._saveAll(null, groups); }
  async _saveAspects(aspects) { await this._saveAll(aspects, null); }

  /**
   * Salva no diário de armazenamento. As janelas abertas de todos os usuários e os desenhos dos aspectos no mapa
   * são atualizados pelo hook "updateJournalEntry" (scripts/extras/main.js).
   */
  async _saveAll(aspects = null, groups = null, tags = null) {
    const storage = await AspectStorage.getStorage();
    if (!storage?.isOwner) {
      ui.notifications.warn(game.i18n.localize("FAx.Global.AspectStorageNotAvailable"));
      return;
    }

    const changes = {};
    if (aspects !== null) changes[`flags.${MODULE_ID}.${AspectStorage.FLAGS.ASPECTS}`] = aspects;
    if (groups !== null) changes[`flags.${MODULE_ID}.${AspectStorage.FLAGS.GROUPS}`] = groups;
    if (tags !== null) changes[`flags.${MODULE_ID}.${AspectStorage.FLAGS.TAGS}`] = tags;
    if (Object.keys(changes).length) await storage.update(changes);
  }

  _onDragStart(event) {
    const li = event.currentTarget;
    if (li.classList.contains("aspect-tag-pill")) {
      this._dragType = "tag";
      event.dataTransfer.setData("text/plain", JSON.stringify({ type: "SceneAspectTag", aspectId: li.dataset.id, tagId: li.dataset.tagId }));
    } else if (li.classList.contains("fatex-group-header")) {
      this._dragType = "group";
      event.dataTransfer.setData("text/plain", JSON.stringify({ type: "SceneAspectGroup", id: li.dataset.groupId }));
    } else {
      this._dragType = "aspect";
      event.dataTransfer.setData("text/plain", JSON.stringify({ type: "SceneAspect", id: li.dataset.id }));
    }
  }

  _onDragOver(event) {
    event.preventDefault();

    const clearIndicators = () => {
      this.element.find(".fatex-scene-aspect, .fatex-aspect-group, .aspect-tag-pill").removeClass("drag-left drag-right");
    };

    if (this._dragType === "tag") {
      clearIndicators();
      const tagPill = event.target.closest(".aspect-tag-pill");
      if (tagPill) {
        const rect = tagPill.getBoundingClientRect();
        if (event.clientX < rect.left + rect.width / 2) tagPill.classList.add("drag-left");
        else tagPill.classList.add("drag-right");
      }
    } else if (this._dragType === "group") {
      const group = event.target.closest(".fatex-aspect-group");
      if (!group) {
        clearIndicators();
        return;
      }
      const rect = group.getBoundingClientRect();
      const newClass = event.clientX < rect.left + rect.width / 2 ? "drag-left" : "drag-right";
      if (group.classList.contains(newClass)) return;
      clearIndicators();
      group.classList.add(newClass);
    } else if (this._dragType === "aspect") {
      const aspect = event.target.closest(".fatex-scene-aspect");
      if (aspect) {
        const rect = aspect.getBoundingClientRect();
        const newClass = event.clientX < rect.left + rect.width / 2 ? "drag-left" : "drag-right";
        if (aspect.classList.contains(newClass)) return;
        clearIndicators();
        aspect.classList.add(newClass);
      } else {
        clearIndicators();
      }
    }
  }

  async _onDrop(event) {
    if (!game.user.isGM) return;
    this.element.find(".fatex-scene-aspect, .fatex-aspect-group, .aspect-tag-pill").removeClass("drag-top drag-bottom drag-left drag-right");
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch (err) { return; }

    if (data.type === "SceneAspectGroup") {
      const groups = await this._getGroups();
      const sourceIndex = groups.findIndex(g => g.id === data.id);
      const targetGroup = event.target.closest(".fatex-aspect-group");

      if (!targetGroup) {
        if (sourceIndex > -1) {
          const [item] = groups.splice(sourceIndex, 1);
          groups.push(item);
          await this._saveGroups(groups);
        }
        return;
      }

      if (sourceIndex === -1) return;
      const targetIndex = groups.findIndex(g => g.id === targetGroup.dataset.groupId);
      const rect = targetGroup.getBoundingClientRect();
      let destinationIndex = targetIndex + (event.clientX >= rect.left + rect.width / 2 ? 1 : 0);
      const [item] = groups.splice(sourceIndex, 1);
      if (sourceIndex < destinationIndex) destinationIndex--;
      groups.splice(destinationIndex, 0, item);
      await this._saveGroups(groups);
    } else if (data.type === "SceneAspectTag") {
      const aspects = await this._getAspects();
      const sourceAspect = aspects.find(a => a.id === data.aspectId);
      const targetList = event.target.closest(".aspect-tags-list");
      if (!sourceAspect || !targetList) return;
      const targetAspectId = targetList.querySelector(".add-tag-to-aspect").dataset.id;
      const targetAspect = aspects.find(a => a.id === targetAspectId);
      if (!targetAspect) return;
      if (data.aspectId !== targetAspectId && (targetAspect.tagIds || []).includes(data.tagId)) {
        ui.notifications.warn(game.i18n.localize("FAx.Global.AspectAlreadyHasTag"));
        return;
      }
      sourceAspect.tagIds = (sourceAspect.tagIds || []).filter(tid => tid !== data.tagId);
      targetAspect.tagIds = targetAspect.tagIds || [];
      const targetPill = event.target.closest(".aspect-tag-pill");
      if (targetPill) {
        const rect = targetPill.getBoundingClientRect();
        let targetIndex = targetAspect.tagIds.indexOf(targetPill.dataset.tagId);
        if (event.clientX >= rect.left + rect.width / 2) targetIndex++;
        targetAspect.tagIds.splice(targetIndex, 0, data.tagId);
      } else {
        targetAspect.tagIds.push(data.tagId);
      }
      await this._saveAspects(aspects);
    } else if (data.type === "SceneAspect") {
      const aspects = await this._getAspects();
      const sourceAspect = aspects.find(a => a.id === data.id);
      if (!sourceAspect) return;
      const targetLink = event.target.closest(".fatex-scene-aspect");
      const targetGroup = event.target.closest(".fatex-aspect-group");
      if (targetLink) {
        const targetAspect = aspects.find(a => a.id === targetLink.dataset.id);
        const sourceIndex = aspects.indexOf(sourceAspect);
        const targetIndex = aspects.indexOf(targetAspect);
        const rect = targetLink.getBoundingClientRect();
        let destinationIndex = targetIndex + (event.clientX >= rect.left + rect.width / 2 ? 1 : 0);
        sourceAspect.groupId = targetAspect.groupId;
        aspects.splice(sourceIndex, 1);
        if (sourceIndex < destinationIndex) destinationIndex--;
        aspects.splice(destinationIndex, 0, sourceAspect);
      } else if (targetGroup) {
        sourceAspect.groupId = targetGroup.dataset.groupId;
        aspects.splice(aspects.indexOf(sourceAspect), 1);
        aspects.push(sourceAspect);
      }
      await this._saveAspects(aspects);
    }
    this._dragType = null;
  }
}
