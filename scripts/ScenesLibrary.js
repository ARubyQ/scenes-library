export class ScenesLibrary extends Application {
    constructor() {
        super();
        this.activeFolderId = "favorites"; 
        this.sidebarWidth = 280;
        
        this.folderTerm = "";
        this.sceneTerm = "";
        
        this.useFullImage = false;

        this.expandedState = new Set();
        
        this.scrollTopSidebar = 0;
        this.scrollTopGallery = 0;

        this.shouldFocusSceneSearch = false; 
        
        this.favs = this._loadFavs();

        this._onFolderChange = () => this.render();
        Hooks.on("createFolder", this._onFolderChange);
        Hooks.on("updateFolder", this._onFolderChange);
        Hooks.on("deleteFolder", this._onFolderChange);
        Hooks.on("updateScene", this._onFolderChange);
    }

    async close(options) {
        Hooks.off("createFolder", this._onFolderChange);
        Hooks.off("updateFolder", this._onFolderChange);
        Hooks.off("deleteFolder", this._onFolderChange);
        Hooks.off("updateScene", this._onFolderChange);
        return super.close(options);
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "gm-scenes-library-window",
            title: "🗺️ Библиотека Сцен",
            template: "templates/hud/hud.html", 
            width: 1150,
            height: 800,
            resizable: true,
            classes: ["gm-observer-app"],
            popOut: true,
            minimizable: true
        });
    }

    async render(force, options) {
        if (this.element && this.element.length) {
            const sb = this.element.find("#sb-scroll");
            const gl = this.element.find("#scene-grid");
            if (sb.length) this.scrollTopSidebar = sb.scrollTop();
            if (gl.length) this.scrollTopGallery = gl.scrollTop();
        }
        return super.render(force, options);
    }

    async _renderInner(data) {
        const htmlContent = this.buildHTML();
        return $(htmlContent);
    }

    _loadFavs() { return game.user.getFlag("world", "gmSceneObserverFavs") || { scenes: [], folders: [] }; }
    async _saveFavs() { await game.user.setFlag("world", "gmSceneObserverFavs", this.favs); }
    
    async toggleFav(type, id) {
        const list = type === 'scene' ? this.favs.scenes : this.favs.folders;
        const idx = list.indexOf(id);
        if (idx > -1) list.splice(idx, 1); else list.push(id);
        await this._saveFavs();
        this.render();
    }
    
    isFav(type, id) { return (type === 'scene' ? this.favs.scenes : this.favs.folders).includes(id); }
    
    hasFavInside(folderId, allFolders) {
        if (this.isFav('folder', folderId)) return true;
        const children = allFolders.filter(f => f.folder?.id === folderId);
        return children.some(c => this.hasFavInside(c.id, allFolders));
    }

    getData() {
        const folders = game.folders.filter(f => f.type === "Scene");
        const scenes = game.scenes.map(s => {
            let img;
            
            if (this.useFullImage) {
                img = s.background.src;
            } else {
                img = s.thumb;

                if (!img || img.includes("mystery-man")) img = s.background.src;
            }
            
            if (!img) img = "icons/svg/mystery-man.svg";
            
            const hasGrid = s.grid.type !== 0;
            const hasVision = s.tokenVision === true;

            return {
                id: s.id, name: s.name, folder: s.folder?.id || "root",
                img: img, active: s.active, nav: s.navigation,
                hasGrid: hasGrid, hasVision: hasVision, 
                isFav: this.isFav('scene', s.id)
            };
        });
        return { folders, scenes };
    }

    buildHTML() {
        const data = this.getData();
        const treeHTML = this.getFolderTreeRecursive(data.folders, data.scenes, null, 0, false);
        const activeScenes = this.getActiveScenes(data.scenes);
        
        const rootActive = (this.activeFolderId === "root") ? "active" : "";
        const allActive = (this.activeFolderId === "all") ? "active" : "";
        const favActive = (this.activeFolderId === "favorites") ? "active" : "";
        
        const rootCount = data.scenes.filter(s => s.folder === "root").length;
        const totalCount = data.scenes.length;
        const favCount = data.scenes.filter(s => s.isFav).length;

        const sbStyle = `width: ${this.sidebarWidth}px; flex: 0 0 ${this.sidebarWidth}px;`;
        const folderVal = this.folderTerm || "";
        const sceneVal = this.sceneTerm || "";
        const folderClear = folderVal ? '<i class="fas fa-times input-clear" data-target="folder"></i>' : '';
        const sceneClear = sceneVal ? '<i class="fas fa-times input-clear" data-target="scene"></i>' : '';

        const isSystemFolder = ["all", "favorites", "root"].includes(this.activeFolderId);
        const btnDisabledClass = (isSystemFolder) ? "disabled" : "";

        const toggleBtnClass = this.useFullImage ? "active" : "";

        let html = `
        <div class="sb-sidebar" style="${sbStyle}">
            <div class="sb-resize-handle"></div>
            
            <div class="sb-header">
                <div class="sb-title">БИБЛИОТЕКА СЦЕН</div>
                <div class="input-wrapper">
                    <input type="text" class="sb-input" id="folder-search" placeholder="Поиск папок..." value="${folderVal}">
                    ${folderClear}
                </div>
            </div>

            <div class="sb-tree" id="sb-scroll">
                <div class="sb-row ${favActive}" data-id="favorites" style="color: #ffae00;">
                    <i class="fas fa-star sb-icon" style="margin-left: 18px;"></i> <span class="sb-name">Избранное</span> <span class="sb-count">${favCount}</span>
                </div>
                <div class="sb-separator"></div>
                <div class="sb-row ${allActive}" data-id="all">
                    <i class="fas fa-layer-group sb-icon" style="margin-left: 18px;"></i> <span class="sb-name">Все карты</span> <span class="sb-count">${totalCount}</span>
                </div>
                <div class="sb-row ${rootActive} draggable-folder" data-id="root" data-folder-id="root">
                    <i class="fas fa-inbox sb-icon" style="margin-left: 18px;"></i> <span class="sb-name">Неразобранное</span> <span class="sb-count">${rootCount}</span>
                </div>
                <div class="sb-separator"></div>
                ${treeHTML}
            </div>

            <div class="sb-footer">
                <button class="sb-btn" data-action="create" title="Новая папка"><i class="fas fa-folder-plus"></i></button>
                <button class="sb-btn ${btnDisabledClass}" data-action="edit" title="Переименовать"><i class="fas fa-pen"></i></button>
                <button class="sb-btn ${btnDisabledClass}" data-action="color" title="Цвет папки"><i class="fas fa-palette"></i></button>
                <button class="sb-btn ${btnDisabledClass}" data-action="delete" title="Удалить папку"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        
        <div class="gl-area">
            <div class="gl-toolbar">
                <div class="input-wrapper gl-search-box">
                    <input type="text" class="sb-input" id="scene-search" placeholder="Поиск сцен в папке..." value="${sceneVal}">
                    ${sceneClear}
                </div>
                <button class="gl-btn-icon ${toggleBtnClass}" id="toggle-thumbs" title="Использовать фон вместо миниатюр">
                    <i class="fas fa-image"></i>
                </button>
                <button class="gl-btn-create" id="create-scene"><i class="fas fa-plus"></i> Создать</button>
            </div>
            <div class="gl-grid" id="scene-grid">
                ${activeScenes.length === 0 ? '<div class="gl-empty">Пусто</div>' : ''}
                ${this.renderScenesHTML(activeScenes)}
            </div>
        </div>`;

        return html;
    }

    renderScenesHTML(scenes) {
        return scenes.map(s => {
            const activeClass = s.active ? "active" : "";
            const activeIcon = s.active ? `<div class="st-icon" title="Активна"><i class="fas fa-bullseye"></i></div>` : "";
            const navIcon = s.nav ? `<div class="st-icon" style="color:#ccc" title="В навигации"><i class="fas fa-eye"></i></div>` : "";
            const gridIcon = s.hasGrid ? `<div class="st-icon grid" title="Сетка ВКЛ"><i class="fas fa-border-all"></i></div>` : "";
            const visionIcon = s.hasVision ? `<div class="st-icon" style="color:#ffcc00" title="Зрение токенов ВКЛ"><i class="fas fa-lightbulb"></i></div>` : "";

            const safeImg = s.img.replace(/'/g, "\\'");
            const favClass = s.isFav ? "is-fav" : "";
            const favIcon = s.isFav ? "fa-solid fa-star" : "fa-regular fa-star";

            return `
            <div class="cd-card ${activeClass}" data-id="${s.id}" data-name="${s.name.toLowerCase()}">
                <div class="cd-img-box">
                    <img class="cd-img" src="${safeImg}" onerror="this.style.display='none'">
                </div>
                <div class="cd-status">${activeIcon}${navIcon}${gridIcon}${visionIcon}</div>
                <div class="cd-fav ${favClass} action-fav-scene" title="В избранное"><i class="${favIcon}"></i></div>
                <div class="cd-overlay">
                    <div class="cd-btn btn-play action-activate" title="Активировать"><i class="fas fa-play"></i></div>
                    <div class="cd-btn btn-conf action-config" title="Настройки"><i class="fas fa-cog"></i></div>
                    <div class="cd-btn btn-del action-delete" title="Удалить"><i class="fas fa-trash"></i></div>
                </div>
                <div class="cd-title" title="${s.name}">${s.name}</div>
            </div>`;
        }).join("");
    }

    getFolderTreeRecursive(folders, scenes, parentId, depth, onlyFavsMode) {
        let children = folders.filter(f => f.folder?.id === (parentId || undefined));
        
        children.sort((a, b) => {
            const aFav = this.isFav('folder', a.id);
            const bFav = this.isFav('folder', b.id);
            if (aFav && !bFav) return -1;
            if (!aFav && bFav) return 1;
            return a.sort - b.sort;
        });

        let html = "";
        const term = this.folderTerm ? this.folderTerm.toLowerCase() : "";

        children.forEach(f => {
            const isFav = this.isFav('folder', f.id);
            const hasFav = this.hasFavInside(f.id, folders);

            if (onlyFavsMode && !isFav && !hasFav) return;

            const isExpanded = this.expandedState.has(f.id);
            const matchName = f.name.toLowerCase().includes(term);
            const hasMatchInside = this.hasMatchInside(f.id, folders, term);
            const isSearchMode = term !== "";
            
            if (isSearchMode && !matchName && !hasMatchInside) return;
            
            const forceExpand = isSearchMode && hasMatchInside;
            const nextOnlyFavs = onlyFavsMode || (!isExpanded && !forceExpand && hasFav);
            const showChildren = isExpanded || forceExpand || hasFav;
            const hasChildren = folders.some(sub => sub.folder?.id === f.id);
            const chevronState = (isExpanded || forceExpand) ? "" : "closed";
            const chevronClass = hasChildren ? chevronState : "hidden";

            let childrenHTML = "";
            if (showChildren) {
                childrenHTML = this.getFolderTreeRecursive(folders, scenes, f.id, depth + 1, nextOnlyFavs);
            }

            const isActive = this.activeFolderId === f.id ? "active" : "";
            const padding = depth * 15 + 10;
            const count = scenes.filter(s => s.folder === f.id).length;
            const favClass = isFav ? "is-fav" : "";
            const favIcon = isFav ? "fa-solid fa-star" : "fa-regular fa-star";

            html += `
            <div class="sb-group">
                <div class="sb-row ${isActive} draggable-folder" data-id="${f.id}" data-folder-id="${f.id}" data-name="${f.name.toLowerCase()}" draggable="true" style="padding-left: ${padding}px">
                    <div class="sb-chev-box" style="width:20px; text-align:center; flex-shrink:0;">
                        <i class="fas fa-chevron-down sb-chev ${chevronClass}"></i>
                    </div>
                    
                    <i class="${favIcon} sb-fav-btn ${favClass} action-fav-folder" data-id="${f.id}" title="В избранное"></i>
                    
                    <div style="display:flex; align-items:center; overflow:hidden; flex-grow:1;">
                        <i class="fas fa-folder sb-icon" style="color: ${f.color || '#ffae00'}"></i>
                        <span class="sb-name">${f.name}</span>
                    </div>
                    
                    <span class="sb-count">${count}</span>
                </div>
                <div class="sb-children">
                    ${childrenHTML}
                </div>
            </div>`;
        });
        return html;
    }
    
    hasMatchInside(folderId, allFolders, term) {
        if (!term) return false;
        const children = allFolders.filter(f => f.folder?.id === folderId);
        for (let c of children) {
            if (c.name.toLowerCase().includes(term)) return true;
            if (this.hasMatchInside(c.id, allFolders, term)) return true;
        }
        return false;
    }

    getActiveScenes(allScenes) {
        let scenes = [];
        if (this.activeFolderId === "favorites") scenes = allScenes.filter(s => s.isFav);
        else if (this.activeFolderId === "all") scenes = allScenes;
        else if (this.activeFolderId === "root" || this.activeFolderId === null) scenes = allScenes.filter(s => s.folder === "root");
        else scenes = allScenes.filter(s => s.folder === this.activeFolderId);
        
        if (this.sceneTerm) {
            const term = this.sceneTerm.toLowerCase();
            scenes = scenes.filter(s => s.name.toLowerCase().includes(term));
        }

        scenes.sort((a, b) => {
            if (a.isFav && !b.isFav) return -1;
            if (!a.isFav && b.isFav) return 1;
            return a.sort - b.sort;
        });
        return scenes;
    }

    activateListeners(html) {
        super.activateListeners(html);

        const sidebarScroll = html.find("#sb-scroll");
        if (this.scrollTopSidebar > 0) sidebarScroll.scrollTop(this.scrollTopSidebar);

        const galleryScroll = html.find("#scene-grid");
        if (this.scrollTopGallery > 0) galleryScroll.scrollTop(this.scrollTopGallery);

        html.find("#toggle-thumbs").click((e) => {
            this.useFullImage = !this.useFullImage;
            this.render();
        });

        html.find(".sb-btn").click(async (e) => {
            const btn = $(e.currentTarget);
            if (btn.hasClass("disabled")) return;

            const action = btn.data("action");
            const currentId = this.activeFolderId;
            const isSystem = ["root", "favorites", "all"].includes(currentId);
            const currentFolder = isSystem ? null : game.folders.get(currentId);

            switch (action) {
                case "create":
                    const parent = currentFolder ? currentFolder.id : null;
                    await Folder.createDialog({ type: "Scene", folder: parent });
                    break;
                case "edit":
                    if (currentFolder) currentFolder.sheet.render(true);
                    break;
                case "delete":
                    if (currentFolder) currentFolder.deleteDialog();
                    break;
                case "color":
                    if (currentFolder) {
                        new Dialog({
                            title: `Цвет: ${currentFolder.name}`,
                            content: `
                                <div class="form-group">
                                    <label>Выберите цвет:</label>
                                    <div style="display:flex; gap:10px; align-items:center;">
                                        <input type="color" name="color" value="${currentFolder.color || '#000000'}">
                                    </div>
                                </div>
                            `,
                            buttons: {
                                save: {
                                    label: "Сохранить",
                                    icon: '<i class="fas fa-check"></i>',
                                    callback: async (html) => {
                                        const newColor = html.find('[name="color"]').val();
                                        await currentFolder.update({ color: newColor });
                                    }
                                }
                            },
                            default: "save"
                        }).render(true);
                    }
                    break;
            }
        });

        if (this.shouldFocusSceneSearch) {
            const input = html.find("#scene-search");
            input.focus(); 
            const val = input.val();
            input.val("").val(val); 
            this.shouldFocusSceneSearch = false; 
        }

        html.find(".sb-resize-handle").on("mousedown", (e) => {
            e.preventDefault();
            const sidebarEl = this.element.find(".sb-sidebar")[0];
            const startX = e.originalEvent.clientX;
            const startWidth = sidebarEl.getBoundingClientRect().width;

            const doDrag = (moveEv) => {
                const diff = moveEv.clientX - startX;
                const newWidth = Math.max(200, Math.min(800, startWidth + diff));
                sidebarEl.style.width = `${newWidth}px`;
                sidebarEl.style.flex = `0 0 ${newWidth}px`;
                this.sidebarWidth = newWidth;
            };

            const stopDrag = () => {
                window.removeEventListener("mousemove", doDrag);
                window.removeEventListener("mouseup", stopDrag);
            };

            window.addEventListener("mousemove", doDrag);
            window.addEventListener("mouseup", stopDrag);
        });

        html.find("#folder-search").on("input", (e) => {
            const term = e.target.value.toLowerCase();
            this.folderTerm = term;
            
            const wrapper = $(e.target).parent();
            if (term && wrapper.find(".input-clear").length === 0) {
                const clearBtn = $('<i class="fas fa-times input-clear" data-target="folder"></i>');
                clearBtn.click(() => { this.folderTerm = ""; this.render(); });
                wrapper.append(clearBtn);
            } else if (!term) {
                wrapper.find(".input-clear").remove();
            }

            if (!term) {
                this.render();
                return;
            }

            html.find(".sb-row").each((i, el) => {
                const row = $(el);
                const group = row.parent(); 
                if (!group.hasClass("sb-group")) return; 

                const name = String(row.data("name") || "").toLowerCase(); 
                const matchName = name.includes(term);
                const hasMatchInside = group.find(`.sb-row`).filter((idx, child) => {
                    return String($(child).data("name") || "").toLowerCase().includes(term);
                }).length > 0;

                if (matchName || hasMatchInside) {
                    group.show();
                    group.children(".sb-children").show();
                    row.find(".sb-chev").removeClass("closed");
                    group.parents(".sb-group").show().children(".sb-children").show();
                    group.parents(".sb-group").children(".sb-row").find(".sb-chev").removeClass("closed");
                } else {
                    group.hide();
                }
            });
        });

        html.find("#scene-search").on("input", (e) => {
            const term = e.target.value.toLowerCase();
            this.sceneTerm = term;
            
            const wrapper = $(e.target).parent();
            if (term && wrapper.find(".input-clear").length === 0) {
                const clearBtn = $('<i class="fas fa-times input-clear" data-target="scene"></i>');
                clearBtn.click(() => { 
                    this.sceneTerm = ""; 
                    html.find("#scene-search").val("").focus();
                    html.find(".cd-card").show();
                    clearBtn.remove();
                });
                wrapper.append(clearBtn);
            } else if (!term) {
                wrapper.find(".input-clear").remove();
            }

            html.find(".cd-card").each((i, el) => {
                const name = String($(el).data("name") || ""); 
                if (name.includes(term)) $(el).show(); else $(el).hide();
            });
        });
        
        html.find(".input-clear").click((e) => {
            const target = e.currentTarget.dataset.target;
            if (target === "folder") { this.folderTerm = ""; this.render(); }
            if (target === "scene") { 
                this.sceneTerm = ""; 
                html.find("#scene-search").val("").focus(); 
                html.find(".cd-card").show(); 
                $(e.currentTarget).remove();
            }
        });

        html.find(".sb-row").click((e) => {
            if ($(e.target).closest(".action-fav-folder, .sb-chev").length) return;
            const row = $(e.currentTarget);
            const folderId = row.data("id");
            
            if (!["all","favorites","root"].includes(folderId)) {
                this.expandedState.add(folderId);
            }
            
            this.activeFolderId = folderId;
            this.sceneTerm = ""; 
            this.shouldFocusSceneSearch = true; 
            this.render(); 
        });

        html.find(".sb-chev").click((e) => {
            e.stopPropagation(); 
            const row = $(e.currentTarget).closest(".sb-row");
            const folderId = row.data("id");
            if (this.expandedState.has(folderId)) this.expandedState.delete(folderId);
            else this.expandedState.add(folderId);
            this.render();
        });

        html.find(".action-fav-folder").click(async (e) => { e.stopPropagation(); await this.toggleFav('folder', e.currentTarget.dataset.id); });
        html.find(".action-fav-scene").click(async (e) => { e.stopPropagation(); await this.toggleFav('scene', $(e.currentTarget).closest(".cd-card").data("id")); });
        
        html.find("#create-scene").click(async () => {
            const folder = (["all","favorites"].includes(this.activeFolderId)) ? null : (this.activeFolderId === "root" ? null : this.activeFolderId);
            await this._createCustomScene(folder);
        });
        
        html.find(".action-activate").click(async (e) => { e.stopPropagation(); await game.scenes.get($(e.currentTarget).closest(".cd-card").data("id"))?.activate(); this.render(); });
        html.find(".action-config").click((e) => { e.stopPropagation(); game.scenes.get($(e.currentTarget).closest(".cd-card").data("id"))?.sheet.render(true); });
        html.find(".cd-card").click((e) => { if ($(e.target).closest(".cd-btn, .cd-fav").length) return; game.scenes.get(e.currentTarget.dataset.id)?.view(); });
		html.find(".action-delete").click((e) => { 
            e.stopPropagation(); 
            game.scenes.get($(e.currentTarget).closest(".cd-card").data("id"))?.deleteDialog(); 
        });
        this.initDragDrop(html);
    }

    initDragDrop(html) {
        html.find('.cd-card').attr('draggable', true).on('dragstart', (ev) => {
            ev.stopPropagation();
            ev.originalEvent.dataTransfer.setData("application/json", JSON.stringify({ type: "Scene", id: ev.currentTarget.dataset.id }));
        });
        html.find('.draggable-folder').attr('draggable', true).on('dragstart', (ev) => {
            ev.stopPropagation();
            const id = ev.currentTarget.dataset.folderId;
            if(id==="root") return false;
            ev.originalEvent.dataTransfer.setData("application/json", JSON.stringify({ type: "Folder", id: id }));
        });
        html.find('.sb-row').on('dragover', (ev) => {
            ev.preventDefault(); ev.currentTarget.classList.add("drag-over");
        }).on('dragleave', (ev) => {
            ev.currentTarget.classList.remove("drag-over");
        }).on('drop', async (ev) => {
            ev.preventDefault(); ev.currentTarget.classList.remove("drag-over");
            const raw = ev.originalEvent.dataTransfer.getData("application/json");
            if (!raw) return;
            const data = JSON.parse(raw);
            const targetId = ev.currentTarget.dataset.id;
            if (["favorites", "all"].includes(targetId)) return;
            const targetFolder = targetId === "root" ? null : targetId;

            if (data.type === "Scene") {
                const s = game.scenes.get(data.id);
                if(s) { await s.update({ folder: targetFolder }); this.render(); }
            } else if (data.type === "Folder") {
                const f = game.folders.get(data.id);
                if (f && f.id !== targetFolder) {
                    let parent = game.folders.get(targetFolder);
                    let isLoop = false;
                    while(parent) {
                        if(parent.id === f.id) { isLoop = true; break; }
                        parent = parent.folder;
                    }
                    if(!isLoop) { await f.update({ folder: targetFolder }); this.render(); }
                    else ui.notifications.warn("Нельзя вложить папку в себя!");
                }
            }
        });
    }

    async _createCustomScene(folderId) {
        const dialogContent = `
        <div class="so-dialog-content">
            <div class="form-group">
                <label>Название карты:</label>
                <input type="text" name="name" value="Новая карта" autofocus/>
            </div>
            <div class="form-group">
                <label>Изображение:</label>
                <div class="img-group">
                    <input type="text" name="img" placeholder="путь/к/файлу.webp" id="new-scene-img"/>
                    <button type="button" class="file-picker" data-type="image" data-target="new-scene-img" title="Выбрать файл" style="flex:0 0 30px; text-align:center;">
                        <i class="fas fa-file-import"></i>
                    </button>
                </div>
            </div>
            
            <div class="dialog-options">
                <div class="checkbox-row">
                    <input type="checkbox" name="tokenVision" id="opt-vision">
                    <label for="opt-vision">Зрение токенов</label>
                </div>
                <div class="checkbox-row">
                    <input type="checkbox" name="globalLight" id="opt-light" checked>
                    <label for="opt-light">Глобальное освещение</label>
                </div>
                <div class="checkbox-row">
                    <input type="checkbox" name="grid" id="opt-grid">
                    <label for="opt-grid">Показывать сетку</label>
                </div>
                <div class="checkbox-row">
                    <input type="checkbox" name="navigate" id="opt-nav" checked>
                    <label for="opt-nav">Перейти на карту</label>
                </div>
            </div>
        </div>
        `;

        new Dialog({
            title: "Создание новой карты",
            content: dialogContent,
            buttons: {
                create: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Создать карту",
                    callback: async (html) => {
                        const name = html.find('input[name="name"]').val() || "Новая карта";
                        const imgPath = html.find('input[name="img"]').val();
                        
                        const tokenVision = html.find('input[name="tokenVision"]').is(":checked");
                        const globalLight = html.find('input[name="globalLight"]').is(":checked");
                        const showGrid = html.find('input[name="grid"]').is(":checked");
                        const doNavigate = html.find('input[name="navigate"]').is(":checked");

                        let sceneData = {
                            name: name,
                            folder: folderId,
                            tokenVision: tokenVision,
                            globalLight: globalLight,
                            grid: { 
                                type: showGrid ? 1 : 0,
                                alpha: showGrid ? 0.2 : 0
                            },
                            navigation: true
                        };

                        if (imgPath) {
                            try {
                                const details = await this._getImageDetails(imgPath);
                                sceneData.background = { src: imgPath };
                                sceneData.width = details.width;
                                sceneData.height = details.height;
                                sceneData.padding = 0;
                                if (details.color) {
                                    sceneData.backgroundColor = details.color;
                                }
                            } catch (e) {
                                ui.notifications.warn("Не удалось загрузить изображение, создана стандартная карта.");
                                console.error(e);
                            }
                        }

                        const scene = await Scene.create(sceneData);
                        
                        if (doNavigate && scene) {
                            await scene.view();
                        }
                        
                        this.render();
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Отмена"
                }
            },
            default: "create",
            render: (html) => {
                html.find(".file-picker").click(ev => {
                    const fp = new FilePicker({
                        type: "image",
                        callback: (path) => {
                            html.find('input[name="img"]').val(path);
                        }
                    });
                    fp.browse();
                });
            }
        }, {
            classes: ["dialog", "so-dialog"]
        }).render(true);
    }

    async _getImageDetails(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const w = img.naturalWidth;
                const h = img.naturalHeight;
                
                let color = "#000000";
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = 1; 
                    canvas.height = 1;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, 1, 1);
                    const p = ctx.getImageData(0, 0, 1, 1).data;
                    const hex = "#" + ((1 << 24) + (p[0] << 16) + (p[1] << 8) + p[2]).toString(16).slice(1);
                    color = hex;
                } catch(err) {
                    console.warn("Не удалось извлечь цвет (CORS?)", err);
                }

                resolve({ width: w, height: h, color: color });
            };
            img.onerror = reject;
            img.src = url;
        });
    }
}