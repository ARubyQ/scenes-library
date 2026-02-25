export class ScenesLibrary extends Application {
    constructor() {
        super();
        this.activeFolderId = "favorites"; 
        this.sidebarWidth = 280;
        this.mode = "world";
        
        this.folderTerm = "";
        this.sceneTerm = "";
        
        this.useFullImage = false;

        this.expandedState = new Set();
        
        this.scrollTopSidebar = 0;
        this.scrollTopGallery = 0;

        this.shouldFocusSceneSearch = false; 
        
        this.favs = this._loadFavs();
        
        this._tagsCache = null;
        
        this.showTags = this._loadShowTags();
        
        this.usePagination = this._loadUsePagination();
        this.currentPage = 1;
        this.scenesPerPage = 12;

        this._onFolderChange = () => this.render();
        Hooks.on("createFolder", this._onFolderChange);
        Hooks.on("updateFolder", this._onFolderChange);
        Hooks.on("deleteFolder", this._onFolderChange);
        Hooks.on("deleteScene", (scene) => {
            if (this._tagsCache !== null) {
                const deletedTags = this.getSceneTags(scene.id);
                const tagsCacheSet = new Set(this._tagsCache);
                
                deletedTags.forEach(tag => {
                    const tagLower = tag.toLowerCase();
                    const stillUsed = game.scenes.some(s => {
                        const sceneTags = this.getSceneTags(s.id);
                        return sceneTags.some(t => t.toLowerCase() === tagLower);
                    });
                    if (!stillUsed) {
                        tagsCacheSet.delete(tagLower);
                    }
                });
                
                this._tagsCache = Array.from(tagsCacheSet).sort();
            }
            this._onFolderChange();
        });
        Hooks.on("updateScene", this._onFolderChange);
    }

    async close(options) {
        Hooks.off("createFolder", this._onFolderChange);
        Hooks.off("updateFolder", this._onFolderChange);
        Hooks.off("deleteFolder", this._onFolderChange);
        Hooks.off("updateScene", this._onFolderChange);
        Hooks.off("deleteScene", this._onFolderChange);
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        return super.close(options);
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "gm-scenes-library-window",
            title: game.i18n.localize("SCENESLIBRARY.Title"),
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
        const htmlContent = await this.buildHTML();
        return $(htmlContent);
    }

    _loadFavs() { return game.user.getFlag("world", "gmSceneObserverFavs") || { scenes: [], folders: [] }; }
    async _saveFavs() { await game.user.setFlag("world", "gmSceneObserverFavs", this.favs); }
    
    _loadRecent() { return game.user.getFlag("world", "gmSceneObserverRecent") || []; }
    async _saveRecent(list) { await game.user.setFlag("world", "gmSceneObserverRecent", list); }
    
    _loadShowTags() { return game.user.getFlag("world", "gmSceneObserverShowTags") || false; }
    async _saveShowTags(value) { await game.user.setFlag("world", "gmSceneObserverShowTags", value); }
    
    _loadUsePagination() { return game.user.getFlag("world", "gmSceneObserverUsePagination") || false; }
    async _saveUsePagination(value) { await game.user.setFlag("world", "gmSceneObserverUsePagination", value); }
    
    getSceneTags(sceneId) {
        const scene = game.scenes.get(sceneId);
        if (!scene) return [];
        return scene.getFlag("scenes-library", "tags") || [];
    }
    
    async setSceneTags(sceneId, tags) {
        const scene = game.scenes.get(sceneId);
        if (!scene) return;
        
        const oldTags = this.getSceneTags(sceneId);
        const oldTagsSet = new Set(oldTags.map(t => t.toLowerCase()));
        const newTagsSet = new Set(tags.map(t => t.toLowerCase()));
        
        await scene.setFlag("scenes-library", "tags", tags);
        
        if (this._tagsCache !== null) {
            const tagsCacheSet = new Set(this._tagsCache);
            
            oldTags.forEach(tag => {
                const tagLower = tag.toLowerCase();
                if (!newTagsSet.has(tagLower)) {
                    const stillUsed = game.scenes.some(s => {
                        if (s.id === sceneId) return false;
                        const sceneTags = this.getSceneTags(s.id);
                        return sceneTags.some(t => t.toLowerCase() === tagLower);
                    });
                    if (!stillUsed) {
                        tagsCacheSet.delete(tagLower);
                    }
                }
            });
            
            tags.forEach(tag => {
                tagsCacheSet.add(tag.toLowerCase());
            });
            
            this._tagsCache = Array.from(tagsCacheSet).sort();
        }
    }
    
    getAllExistingTags() {
        if (this._tagsCache !== null) {
            return this._tagsCache;
        }
        
        const allTags = new Set();
        game.scenes.forEach(scene => {
            const tags = this.getSceneTags(scene.id);
            tags.forEach(tag => allTags.add(tag.toLowerCase()));
        });
        
        this._tagsCache = Array.from(allTags).sort();
        return this._tagsCache;
    }

    async addToRecent(sceneId) {
        let list = this._loadRecent();
        list = list.filter(id => id !== sceneId);
        list.unshift(sceneId);
        if(list.length > 50) list.pop();
        await this._saveRecent(list);
    }
    
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

    async getData() {
        if (this.mode === "compendium") {
            const packs = game.packs.filter(p => p.documentName === "Scene");
            
            const packFolders = await Promise.all(packs.map(async p => {
                const index = await p.getIndex();
                return {
                    id: p.collection,
                    name: p.title,
                    type: "Pack",
                    color: "#4a5e75",
                    folder: null,
                    count: index.size,
                    pack: p.collection,
                    sort: 0
                };
            }));

            let allFolders = [...packFolders];
            let scenes = [];
            
            const allCompendiumFolders = await Promise.all(packs.map(async (pack) => {
                try {
                    let folderPack = game.packs.find(p => p.metadata.packageName === pack.metadata.packageName && p.documentName === "Folder");
                    if (!folderPack) {
                        const sceneIndex = await pack.getIndex({ fields: ["folder"] });
                        const foldersInScenes = new Set();
                        const entries = Array.isArray(sceneIndex) ? sceneIndex : Array.from(sceneIndex.values());
                        for (const scene of entries) {
                            if (scene && scene.folder) {
                                foldersInScenes.add(scene.folder);
                            }
                        }
                        if (foldersInScenes.size > 0) {
                            const packNameBase = pack.collection.split('.')[0];
                            folderPack = game.packs.find(p => {
                                return (p.collection.includes(packNameBase) || p.metadata.packageName === pack.metadata.packageName) && p.documentName === "Folder";
                            });
                            if (!folderPack) {
                                const folderIds = Array.from(foldersInScenes);
                                const placeholderFolders = folderIds.map((folderId, index) => ({
                                    id: `compendium-${pack.collection}-${folderId}`,
                                    name: `Folder ${index + 1}`,
                                    type: "CompendiumFolder",
                                    color: "#4a5e75",
                                    folder: { id: pack.collection },
                                    pack: pack.collection,
                                    originalId: folderId,
                                    sort: 0
                                }));
                                return placeholderFolders;
                            }
                        } else {
                            return [];
                        }
                    }
                    
                    const folderIndex = await folderPack.getIndex({ fields: ["name", "folder", "color", "sort"] });
                    const folders = [];
                    const folderEntries = Array.isArray(folderIndex) ? folderIndex : Array.from(folderIndex.values());
                    for (const folder of folderEntries) {
                        const id = folder._id || (Array.isArray(folder) ? folder[0] : null);
                        const folderData = Array.isArray(folder) ? folder[1] : folder;
                        const folderId = `compendium-${pack.collection}-${id}`;
                        const parentId = folderData.folder ? `compendium-${pack.collection}-${folderData.folder}` : pack.collection;
                        folders.push({
                            id: folderId,
                            name: folderData.name,
                            type: "CompendiumFolder",
                            color: folderData.color || "#4a5e75",
                            folder: { id: parentId },
                            pack: pack.collection,
                            originalId: id,
                            sort: folderData.sort || 0
                        });
                    }
                    return folders;
                } catch (e) {
                    console.warn("[ScenesLibrary] Error loading folders for pack", pack.collection, e);
                    return [];
                }
            }));
            
            allFolders = [...packFolders, ...allCompendiumFolders.flat()];
            
            for (const folder of allFolders) {
                folder.sceneCount = 0;
            }
            
            const sceneCountPromises = packs.map(async (pack) => {
                try {
                    const sceneIndex = await pack.getIndex({ fields: ["folder"] });
                    const entries = Array.isArray(sceneIndex) ? sceneIndex : Array.from(sceneIndex.values());
                    const counts = {};
                    for (const scene of entries) {
                        if (scene && scene.folder) {
                            const folderId = `compendium-${pack.collection}-${scene.folder}`;
                            counts[folderId] = (counts[folderId] || 0) + 1;
                        } else {
                            counts[pack.collection] = (counts[pack.collection] || 0) + 1;
                        }
                    }
                    return { pack: pack.collection, counts };
                } catch (e) {
                    return { pack: pack.collection, counts: {} };
                }
            });
            
            const sceneCounts = await Promise.all(sceneCountPromises);
            for (const { pack: packId, counts } of sceneCounts) {
                for (const [folderId, count] of Object.entries(counts)) {
                    const folder = allFolders.find(f => f.id === folderId);
                    if (folder) {
                        folder.sceneCount = (folder.sceneCount || 0) + count;
                    }
                }
            }
            
            if (this.activeFolderId) {
                const isCompendiumFolder = this.activeFolderId.startsWith("compendium-");
                let pack = null;
                let targetFolderId = null;
                
                if (isCompendiumFolder) {
                    const idWithoutPrefix = this.activeFolderId.replace("compendium-", "");
                    for (const p of game.packs.values()) {
                        if (idWithoutPrefix.startsWith(p.collection + "-")) {
                            pack = p;
                            targetFolderId = idWithoutPrefix.substring(p.collection.length + 1);
                            break;
                        } else if (idWithoutPrefix === p.collection) {
                            pack = p;
                            targetFolderId = null;
                            break;
                        }
                    }
                } else if (packFolders.some(f => f.id === this.activeFolderId)) {
                    pack = game.packs.get(this.activeFolderId);
                }
                
                if (pack) {
                    try {
                        const sceneIndex = await pack.getIndex({ fields: ["name", "thumb", "background", "folder"] });
                        
                        scenes = sceneIndex.map(s => {
                            let img;
                            if (this.useFullImage) {
                                img = s.background?.src;
                            } else {
                                img = s.thumb;
                                if (!img || img.includes("mystery-man")) img = s.background?.src;
                            }
                            if (!img) img = "icons/svg/mystery-man.svg";

                            const importedScene = game.scenes.find(ws => {
                                const src = ws._stats?.compendiumSource;
                                return src === s.uuid;
                            });

                            const sceneFolderId = s.folder || null;
                            const sceneFolder = sceneFolderId ? `compendium-${pack.collection}-${sceneFolderId}` : pack.collection;

                            return {
                                id: s._id,
                                name: s.name,
                                folder: sceneFolder,
                                img: img,
                                thumb: s.thumb,
                                active: false,
                                nav: false,
                                hasGrid: false,
                                hasVision: false,
                                isFav: false,
                                isCompendium: true,
                                pack: pack.collection,
                                uuid: s.uuid,
                                isImported: !!importedScene,
                                importedId: importedScene?.id,
                                importedFolderId: importedScene?.folder?.id
                            };
                        });
                        
                        if (isCompendiumFolder && targetFolderId) {
                            scenes = scenes.filter(s => {
                                if (s.folder.startsWith(`compendium-${pack.collection}-`)) {
                                    const sceneFolderId = s.folder.replace(`compendium-${pack.collection}-`, "");
                                    return sceneFolderId === targetFolderId;
                                }
                                return false;
                            });
                        } else if (this.activeFolderId === pack.collection) {
                            scenes = scenes.filter(s => s.folder === pack.collection);
                        } else {
                            scenes = [];
                        }
                    } catch (e) {
                        console.warn("Error loading compendium folders", e);
                        const index = await pack.getIndex({ fields: ["name", "thumb", "background"] });
                        scenes = index.map(s => {
                            let img;
                            if (this.useFullImage) {
                                img = s.background?.src;
                            } else {
                                img = s.thumb;
                                if (!img || img.includes("mystery-man")) img = s.background?.src;
                            }
                            if (!img) img = "icons/svg/mystery-man.svg";

                            const importedScene = game.scenes.find(ws => {
                                const src = ws._stats?.compendiumSource;
                                return src === s.uuid;
                            });

                            return {
                                id: s._id,
                                name: s.name,
                                folder: pack.collection,
                                img: img,
                                thumb: s.thumb,
                                active: false,
                                nav: false,
                                hasGrid: false,
                                hasVision: false,
                                isFav: false,
                                isCompendium: true,
                                pack: pack.collection,
                                uuid: s.uuid,
                                isImported: !!importedScene,
                                importedId: importedScene?.id,
                                importedFolderId: importedScene?.folder?.id
                            };
                        });
                    }
                }
            }
            return { folders: allFolders, scenes };
        }

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
            const tags = this.getSceneTags(s.id);

            return {
                id: s.id, name: s.name, folder: s.folder?.id || "root",
                img: img, thumb: s.thumb, active: s.active, nav: s.navigation,
                hasGrid: hasGrid, hasVision: hasVision, 
                isFav: this.isFav('scene', s.id),
                tags: tags
            };
        });
        return { folders, scenes };
    }

    async buildHTML() {
        const data = await this.getData();
        const treeHTML = this.getFolderTreeRecursive(data.folders, data.scenes, null, 0, false);
        const activeScenes = this.getActiveScenes(data.scenes);
        
        const isCompendium = this.mode === 'compendium';
        
        let currentPack = null;
        if(isCompendium && this.activeFolderId && this.activeFolderId !== "all" && this.activeFolderId !== "favorites" && this.activeFolderId !== "root") {
             currentPack = this.activeFolderId;
        }
        
        const rootActive = (this.activeFolderId === "root") ? "active" : "";
        const allActive = (this.activeFolderId === "all") ? "active" : "";
        const favActive = (this.activeFolderId === "favorites") ? "active" : "";
        const recentActive = (this.activeFolderId === "recent") ? "active" : "";
        
        const rootCount = data.scenes.filter(s => s.folder === "root").length;
        const totalCount = data.scenes.length;
        const favCount = data.scenes.filter(s => s.isFav).length;
        const recentCount = (this._loadRecent() || []).filter(id => game.scenes.has(id)).length;

        const sbStyle = `width: ${this.sidebarWidth}px; flex: 0 0 ${this.sidebarWidth}px;`;
        const folderVal = this.folderTerm || "";
        const sceneVal = this.sceneTerm || "";
        const folderClear = folderVal ? '<i class="fas fa-times input-clear" data-target="folder"></i>' : '';
        const sceneClear = sceneVal ? '<i class="fas fa-times input-clear" data-target="scene"></i>' : '';

        const isSystemFolder = ["all", "favorites", "root", "recent"].includes(this.activeFolderId);
        const btnDisabledClass = (isSystemFolder || isCompendium) ? "disabled" : "";

        const toggleBtnClass = this.useFullImage ? "active" : "";
        const modeBtnClass = isCompendium ? "active" : "";
        const modeIcon = isCompendium ? "fa-atlas" : "fa-globe";
        const modeTitle = isCompendium ? game.i18n.localize("SCENESLIBRARY.ModeLibrary") : game.i18n.localize("SCENESLIBRARY.ModeWorld");
        const showTagsBtnClass = this.showTags ? "active" : "";
        const showTagsTitle = this.showTags ? game.i18n.localize("SCENESLIBRARY.HideTags") : game.i18n.localize("SCENESLIBRARY.ShowTags");
        const paginationBtnClass = this.usePagination ? "active" : "";
        const paginationTitle = this.usePagination ? game.i18n.localize("SCENESLIBRARY.DisablePagination") : game.i18n.localize("SCENESLIBRARY.EnablePagination");

        let systemFoldersHTML = "";
        if (!isCompendium) {
             systemFoldersHTML = `
                <div class="sb-row ${recentActive}" data-id="recent" style="color: #aaff80;">
                    <i class="fas fa-history sb-icon" style="margin-left: 18px;"></i> <span class="sb-name">${game.i18n.localize("SCENESLIBRARY.Recent")}</span> <span class="sb-count">${recentCount}</span>
                </div>
                <div class="sb-separator"></div>
                <div class="sb-row ${favActive}" data-id="favorites" style="color: #ffae00;">
                    <i class="fas fa-star sb-icon" style="margin-left: 18px;"></i> <span class="sb-name">${game.i18n.localize("SCENESLIBRARY.Favorites")}</span> <span class="sb-count">${favCount}</span>
                </div>
                <div class="sb-separator"></div>
                <div class="sb-row ${allActive}" data-id="all">
                    <i class="fas fa-layer-group sb-icon" style="margin-left: 18px;"></i> <span class="sb-name">${game.i18n.localize("SCENESLIBRARY.AllScenes")}</span> <span class="sb-count">${totalCount}</span>
                </div>
                <div class="sb-row ${rootActive} draggable-folder" data-id="root" data-folder-id="root">
                    <i class="fas fa-inbox sb-icon" style="margin-left: 18px;"></i> <span class="sb-name">${game.i18n.localize("SCENESLIBRARY.Unsorted")}</span> <span class="sb-count">${rootCount}</span>
                </div>
                <div class="sb-separator"></div>`;
        }

        let createBtnHTML = "";
        if (isCompendium) {
            createBtnHTML = `<button class="gl-btn-create ${currentPack ? '' : 'disabled'}" id="import-all"><i class="fas fa-download"></i> ${game.i18n.localize("SCENESLIBRARY.ImportAll")}</button>`;
        } else {
            if (this.activeFolderId === "recent") {
                createBtnHTML = `<button class="gl-btn-create" id="clear-recent" style="background:#8a1c1c; border-color:#5c1313;"><i class="fas fa-trash"></i> ${game.i18n.localize("SCENESLIBRARY.Clear")}</button>`;
            } else {
                createBtnHTML = `<button class="gl-btn-create" id="create-scene"><i class="fas fa-plus"></i> ${game.i18n.localize("SCENESLIBRARY.Create")}</button>`;
            }
        }
        
        const title = isCompendium ? game.i18n.localize("SCENESLIBRARY.LibraryMode") : game.i18n.localize("SCENESLIBRARY.SceneLibrary");

        let html = `
        <div class="sb-sidebar" style="${sbStyle}">
            <div class="sb-resize-handle"></div>
            
            <div class="sb-header">
                <div class="sb-title">${title}</div>
                <div class="input-wrapper">
                    <input type="text" class="sb-input" id="folder-search" placeholder="${game.i18n.localize("SCENESLIBRARY.SearchFolders")}" value="${folderVal}">
                    ${folderClear}
                </div>
            </div>

            <div class="sb-tree" id="sb-scroll">
                ${systemFoldersHTML}
                ${treeHTML}
            </div>

            <div class="sb-footer">
                <button class="sb-btn ${isCompendium ? 'hidden' : ''}" data-action="create" title="${game.i18n.localize("SCENESLIBRARY.CreateFolder")}"><i class="fas fa-folder-plus"></i></button>
                <button class="sb-btn ${btnDisabledClass} ${isCompendium ? 'hidden' : ''}" data-action="edit" title="${game.i18n.localize("SCENESLIBRARY.Rename")}"><i class="fas fa-pen"></i></button>
                <button class="sb-btn ${btnDisabledClass} ${isCompendium ? 'hidden' : ''}" data-action="color" title="${game.i18n.localize("SCENESLIBRARY.FolderColor")}"><i class="fas fa-palette"></i></button>
                <button class="sb-btn ${btnDisabledClass} ${isCompendium ? 'hidden' : ''}" data-action="delete" title="${game.i18n.localize("SCENESLIBRARY.DeleteFolder")}"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        
        <div class="gl-area">
            <div class="gl-toolbar">
                <div class="input-wrapper gl-search-box" style="position: relative;">
                    <input type="text" class="sb-input" id="scene-search" placeholder="${game.i18n.localize("SCENESLIBRARY.SearchScenes")}" value="${sceneVal}">
                    ${sceneClear}
                    <div class="scene-search-suggestions" id="scene-search-suggestions" style="display: none;"></div>
                </div>
                <button class="gl-btn-icon ${modeBtnClass}" id="toggle-mode" title="${modeTitle}">
                    <i class="fas ${modeIcon}"></i>
                </button>
                <button class="gl-btn-icon ${toggleBtnClass}" id="toggle-thumbs" title="${game.i18n.localize("SCENESLIBRARY.UseBackground")}">
                    <i class="fas fa-image"></i>
                </button>
                <button class="gl-btn-icon ${showTagsBtnClass}" id="toggle-tags" title="${showTagsTitle}">
                    <i class="fas fa-tags"></i>
                </button>
                <button class="gl-btn-icon ${paginationBtnClass}" id="toggle-pagination" title="${paginationTitle}">
                    <i class="fas fa-book"></i>
                </button>
                ${createBtnHTML}
            </div>
            <div class="gl-grid-wrapper">
                <div class="gl-grid ${this.usePagination ? 'pagination-mode' : ''}" id="scene-grid">
                    ${activeScenes.length === 0 ? `<div class="gl-empty">${game.i18n.localize("SCENESLIBRARY.Empty")}</div>` : ''}
                    ${this.usePagination ? this.renderScenesWithPagination(activeScenes) : this.renderScenesHTML(activeScenes)}
            </div>
            </div>
            ${this.usePagination ? this.renderPaginationControls(activeScenes.length) : ''}
        </div>`;

        return html;
    }

    renderScenesWithPagination(scenes) {
        const totalPages = Math.ceil(scenes.length / this.scenesPerPage);
        if (this.currentPage > totalPages && totalPages > 0) {
            this.currentPage = totalPages;
        }
        const startIndex = (this.currentPage - 1) * this.scenesPerPage;
        const endIndex = startIndex + this.scenesPerPage;
        const scenesOnPage = scenes.slice(startIndex, endIndex);
        return this.renderScenesHTML(scenesOnPage);
    }
    
    renderPaginationControls(totalScenes) {
        const totalPages = Math.ceil(totalScenes / this.scenesPerPage);
        if (totalPages <= 1) return '';
        
        const prevDisabled = this.currentPage <= 1 ? 'disabled' : '';
        const nextDisabled = this.currentPage >= totalPages ? 'disabled' : '';
        
        return `<div class="pagination-controls">
            <button class="pagination-btn ${prevDisabled}" id="pagination-prev" ${prevDisabled ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
            <span class="pagination-info">${this.currentPage} / ${totalPages}</span>
            <button class="pagination-btn ${nextDisabled}" id="pagination-next" ${nextDisabled ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>`;
    }

    renderScenesHTML(scenes) {
        return scenes.map(s => {
            const isCompendium = !!s.isCompendium;
            const activeClass = s.active ? "active" : "";
            const activeIcon = s.active ? `<div class="st-icon" title="${game.i18n.localize("SCENESLIBRARY.Active")}"><i class="fas fa-bullseye"></i></div>` : "";
            const navIcon = s.nav ? `<div class="st-icon" style="color:#ccc" title="${game.i18n.localize("SCENESLIBRARY.InNav")}"><i class="fas fa-eye"></i></div>` : "";
            const gridIcon = s.hasGrid ? `<div class="st-icon grid" title="${game.i18n.localize("SCENESLIBRARY.GridOn")}"><i class="fas fa-border-all"></i></div>` : "";
            const visionIcon = s.hasVision ? `<div class="st-icon" style="color:#ffcc00" title="${game.i18n.localize("SCENESLIBRARY.VisionOn")}"><i class="fas fa-lightbulb"></i></div>` : "";

            const safeImg = s.img.replace(/'/g, "\\'");
            const favClass = s.isFav ? "is-fav" : "";
            const favIcon = s.isFav ? "fa-solid fa-star" : "fa-regular fa-star";
            
            const isVideo = safeImg.endsWith(".webm") || safeImg.endsWith(".mp4") || safeImg.endsWith(".m4v");
            let mediaElement;
            if (isVideo) {
                mediaElement = `<video class="cd-img" src="${safeImg}" muted loop preload="metadata" onmouseover="this.play()" onmouseout="this.pause()"></video>`;
            } else {
                mediaElement = `<img class="cd-img" src="${safeImg}" loading="lazy" decoding="async" onerror="this.style.display='none'">`;
            }

            let overlayBtns = "";
            if (isCompendium) {
                const importBtns = `
                    <div class="cd-btn btn-play action-import-view" title="${game.i18n.localize("SCENESLIBRARY.ImportAndView")}"><i class="fas fa-eye"></i></div>
                    <div class="cd-btn btn-play action-import" title="${game.i18n.localize("SCENESLIBRARY.Import")}"><i class="fas fa-download"></i></div>
                `;
                
                if (s.isImported) {
                    overlayBtns = `
                        <div class="cd-btn btn-play action-open-folder" title="${game.i18n.localize("SCENESLIBRARY.OpenFolder")}" data-folder-id="${s.importedFolderId || 'root'}"><i class="fas fa-folder-open"></i></div>
                        ${importBtns}
                    `;
                } else {
                    overlayBtns = importBtns;
                }
            } else {
                if (this.activeFolderId === "recent") {
                    overlayBtns = `
                        <div class="cd-btn btn-del action-remove-recent" title="${game.i18n.localize("SCENESLIBRARY.RemoveFromRecent")}"><i class="fas fa-times"></i></div>
                        <div class="cd-btn btn-play action-activate" title="${game.i18n.localize("SCENESLIBRARY.Activate")}"><i class="fas fa-play"></i></div>
                    `;
            } else {
                overlayBtns = `
                    <div class="cd-btn btn-play action-activate" title="${game.i18n.localize("SCENESLIBRARY.Activate")}"><i class="fas fa-play"></i></div>
                    <div class="cd-btn btn-conf action-tags" title="${game.i18n.localize("SCENESLIBRARY.EditTags")}"><i class="fas fa-tags"></i></div>
                    <div class="cd-btn btn-conf action-config" title="${game.i18n.localize("SCENESLIBRARY.Config")}"><i class="fas fa-cog"></i></div>
                    <div class="cd-btn btn-del action-delete" title="${game.i18n.localize("SCENESLIBRARY.Delete")}"><i class="fas fa-trash"></i></div>
                `;
            }
            }

            const favBtn = isCompendium ? "" : `<div class="cd-fav ${favClass} action-fav-scene" title="${game.i18n.localize("SCENESLIBRARY.AddToFav")}"><i class="${favIcon}"></i></div>`;
            const importedBadge = (isCompendium && s.isImported) ? `<div class="st-icon" style="color:#00ff00" title="${game.i18n.localize("SCENESLIBRARY.AlreadyImported")}"><i class="fas fa-check"></i></div>` : "";
            
            const tags = isCompendium ? [] : (s.tags || []);
            const tagsHTML = (this.showTags && !isCompendium && tags.length > 0) ? `<div class="cd-tags">${tags.map(tag => `<span class="cd-tag" data-tag="${tag.toLowerCase()}">#${tag}</span>`).join("")}</div>` : "";
            const hasTagsClass = (this.showTags && !isCompendium && tags.length > 0) ? "has-tags" : "";

            return `
            <div class="cd-card ${activeClass} ${hasTagsClass}" data-id="${s.id}" data-pack="${s.pack || ''}" data-name="${s.name.toLowerCase()}" data-tags="${tags.map(t => t.toLowerCase()).join(' ')}">
                <div class="cd-img-box">
                    ${mediaElement}
                </div>
                <div class="cd-status">${activeIcon}${navIcon}${gridIcon}${visionIcon}${importedBadge}</div>
                ${favBtn}
                <div class="cd-overlay">
                    ${overlayBtns}
                </div>
                <div class="cd-title" title="${s.name}">${s.name}</div>
                ${tagsHTML}
            </div>`;
        }).join("");
    }

    getFolderTreeRecursive(folders, scenes, parentId, depth, onlyFavsMode) {
        let children = folders.filter(f => {
            const fParent = f.folder?.id || f.folder;
            const targetParent = parentId === null ? null : (parentId || undefined);
            return fParent === targetParent;
        });
        
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
            const hasChildren = folders.some(sub => {
                const subParent = sub.folder?.id || sub.folder;
                return subParent === f.id;
            });
            const chevronState = (isExpanded || forceExpand) ? "" : "closed";
            const chevronClass = hasChildren ? chevronState : "hidden";

            let childrenHTML = "";
            if (showChildren) {
                childrenHTML = this.getFolderTreeRecursive(folders, scenes, f.id, depth + 1, nextOnlyFavs);
            }

            const isActive = this.activeFolderId === f.id ? "active" : "";
            const padding = depth * 15 + 10;
            let count = 0;
            if (f.sceneCount !== undefined) {
                count = f.sceneCount;
            } else if (f.count !== undefined) {
                count = f.count;
            } else {
                count = scenes.filter(s => {
                    const sFolder = s.folder?.id || s.folder;
                    return sFolder === f.id;
                }).length;
            }
            const favClass = isFav ? "is-fav" : "";
            const favIcon = isFav ? "fa-solid fa-star" : "fa-regular fa-star";

            html += `
            <div class="sb-group">
                <div class="sb-row ${isActive} draggable-folder" data-id="${f.id}" data-folder-id="${f.id}" data-name="${f.name.toLowerCase()}" draggable="true" style="padding-left: ${padding}px">
                    <div class="sb-chev-box" style="width:20px; text-align:center; flex-shrink:0;">
                        <i class="fas fa-chevron-down sb-chev ${chevronClass}"></i>
                    </div>
                    
                    <i class="${favIcon} sb-fav-btn ${favClass} action-fav-folder" data-id="${f.id}" title="${game.i18n.localize("SCENESLIBRARY.AddToFav")}"></i>
                    
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
        const children = allFolders.filter(f => {
            const fParent = f.folder?.id || f.folder;
            return fParent === folderId;
        });
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
        else if (this.activeFolderId === "recent") {
            const recentIds = this._loadRecent();
            scenes = allScenes.filter(s => recentIds.includes(s.id));
            scenes.sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));
        }
        else {
            scenes = allScenes.filter(s => s.folder === this.activeFolderId);
        }
        
        if (this.sceneTerm) {
            const term = this.sceneTerm.trim();
            if (term.startsWith("#")) {
                const tagQuery = term.substring(1).trim();
                if (tagQuery) {
                    const tags = tagQuery.split(/\s+/)
                        .map(t => t.trim().replace(/^#+/, "").toLowerCase())
                        .filter(t => t);
                    if (tags.length > 0) {
                        scenes = scenes.filter(s => {
                            const sceneTags = (s.tags || []).map(t => t.toLowerCase());
                            return tags.every(tag => sceneTags.includes(tag));
                        });
                    }
                }
            } else if (term.startsWith("$")) {
                const nameQuery = term.substring(1).trim().toLowerCase();
                if (nameQuery) {
                    scenes = scenes.filter(s => s.name.toLowerCase().includes(nameQuery));
                }
            } else {
                const termLower = term.toLowerCase();
                scenes = scenes.filter(s => {
                    const nameMatch = s.name.toLowerCase().includes(termLower);
                    const tags = (s.tags || []).map(t => t.toLowerCase());
                    const tagMatch = tags.some(tag => tag.includes(termLower));
                    return nameMatch || tagMatch;
                });
            }
        }

        if (this.activeFolderId !== "recent") {
        scenes.sort((a, b) => {
            if (a.isFav && !b.isFav) return -1;
            if (!a.isFav && b.isFav) return 1;
            return a.sort - b.sort;
        });
        }
        return scenes;
    }

    async removeFromRecent(sceneId) {
        let list = this._loadRecent();
        const idx = list.indexOf(sceneId);
        if (idx > -1) {
            list.splice(idx, 1);
            await this._saveRecent(list);
            this.render();
        }
    }

    async clearRecent() {
        await this._saveRecent([]);
        this.render();
    }

    activateListeners(html) {
        super.activateListeners(html);

        const sidebarScroll = html.find("#sb-scroll");
        if (this.scrollTopSidebar > 0) sidebarScroll.scrollTop(this.scrollTopSidebar);

        const galleryScroll = html.find("#scene-grid");
        if (this.scrollTopGallery > 0) galleryScroll.scrollTop(this.scrollTopGallery);


        html.find("#toggle-mode").click((e) => {
            this.mode = this.mode === "world" ? "compendium" : "world";
            this.activeFolderId = this.mode === "world" ? "favorites" : null;
            this.folderTerm = "";
            this.sceneTerm = "";
            this.currentPage = 1;
            this.render();
        });

        html.find("#toggle-thumbs").click((e) => {
            this.useFullImage = !this.useFullImage;
            this.render();
        });

        html.find("#toggle-tags").click(async (e) => {
            this.showTags = !this.showTags;
            await this._saveShowTags(this.showTags);
            this.render();
        });

        html.find("#toggle-pagination").click(async (e) => {
            this.usePagination = !this.usePagination;
            this.currentPage = 1;
            await this._saveUsePagination(this.usePagination);
            this.render();
        });

        html.find("#pagination-prev").click((e) => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.render();
            }
        });

        html.find("#pagination-next").click(async (e) => {
            const data = await this.getData();
            const activeScenes = this.getActiveScenes(data.scenes);
            const totalPages = Math.ceil(activeScenes.length / this.scenesPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.render();
            }
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
                    if (currentFolder) {
                        new Dialog({
                            title: game.i18n.localize("SCENESLIBRARY.DeleteFolderTitle"),
                            content: `
                                <p>${game.i18n.format("SCENESLIBRARY.DeleteFolderConfirm", {name: currentFolder.name})}</p>
                                <div class="form-group">
                                    <label><input type="checkbox" name="deleteScenes" checked> ${game.i18n.localize("SCENESLIBRARY.DeleteContents")}</label>
                                </div>
                            `,
                            buttons: {
                                yes: {
                                    icon: '<i class="fas fa-check"></i>',
                                    label: game.i18n.localize("SCENESLIBRARY.Delete"),
                                    callback: async (html) => {
                                        const deleteScenes = html.find('[name="deleteScenes"]').is(":checked");
                                        await currentFolder.delete({ deleteSubfolders: true, deleteContents: deleteScenes });
                                    }
                                },
                                no: {
                                    icon: '<i class="fas fa-times"></i>',
                                    label: game.i18n.localize("SCENESLIBRARY.BtnCancel")
                                }
                            },
                            default: "yes"
                        }).render(true);
                    }
                    break;
                case "color":
                    if (currentFolder) {
                        new Dialog({
                            title: game.i18n.localize("SCENESLIBRARY.ColorTitle") + currentFolder.name,
                            content: `
                                <div class="form-group">
                                    <label>${game.i18n.localize("SCENESLIBRARY.ChooseColor")}</label>
                                    <div style="display:flex; gap:10px; align-items:center;">
                                        <input type="color" name="color" value="${currentFolder.color || '#000000'}">
                                    </div>
                                </div>
                            `,
                            buttons: {
                                save: {
                                    label: game.i18n.localize("SCENESLIBRARY.Save"),
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
            this.currentPage = 1;
            
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
            const term = e.target.value.trim();
            this.sceneTerm = term;
            this.currentPage = 1;
            
            const wrapper = $(e.target).parent();
            const suggestionsContainer = html.find("#scene-search-suggestions");
            let selectedSuggestionIndex = -1;
            
            if (term && wrapper.find(".input-clear").length === 0) {
                const clearBtn = $('<i class="fas fa-times input-clear" data-target="scene"></i>');
                clearBtn.click(() => { 
                    this.sceneTerm = ""; 
                    this.currentPage = 1;
                    html.find("#scene-search").val("").focus();
                    if (this.usePagination) {
                        this.render();
                    } else {
                    html.find(".cd-card").show();
                    }
                    suggestionsContainer.hide().empty();
                    clearBtn.remove();
                });
                wrapper.append(clearBtn);
            } else if (!term) {
                wrapper.find(".input-clear").remove();
                suggestionsContainer.hide().empty();
            }
            
            if (this.usePagination) {
                const showTagSuggestions = (query) => {
                    if (!query.includes("#")) {
                        suggestionsContainer.hide().empty();
                        return;
                    }
                    
                    const parts = query.split(/\s+/);
                    let currentTagPart = "";
                    let tagStartIndex = -1;
                    
                    for (let i = parts.length - 1; i >= 0; i--) {
                        if (parts[i].startsWith("#")) {
                            currentTagPart = parts[i].substring(1).replace(/^#+/, "").trim();
                            tagStartIndex = i;
                            break;
                        }
                    }
                    
                    if (tagStartIndex === -1 || !currentTagPart) {
                        suggestionsContainer.hide().empty();
                        return;
                    }
                    
                    const allTags = this.getAllExistingTags();
                    const suggestions = allTags
                        .filter(tag => tag.includes(currentTagPart.toLowerCase()))
                        .slice(0, 5);
                    
                    if (suggestions.length === 0) {
                        suggestionsContainer.hide().empty();
                        return;
                    }
                    
                    const suggestionsHTML = suggestions.map((tag, idx) => 
                        `<div class="scene-search-suggestion ${idx === selectedSuggestionIndex ? 'selected' : ''}" data-tag="${tag}" data-tag-index="${tagStartIndex}">#${tag}</div>`
                    ).join("");
                    
                    suggestionsContainer.html(suggestionsHTML).show();
                };
                
                showTagSuggestions(term);
                
                (async () => {
                    const searchInput = html.find("#scene-search");
                    const cursorPosition = searchInput[0].selectionStart;
                    
                    const data = await this.getData();
                    const activeScenes = this.getActiveScenes(data.scenes);
                    const gridElement = html.find("#scene-grid");
                    const paginationControls = html.find(".pagination-controls");
                    
                    if (activeScenes.length === 0) {
                        gridElement.html(`<div class="gl-empty">${game.i18n.localize("SCENESLIBRARY.Empty")}</div>`);
                    } else {
                        gridElement.html(this.usePagination ? this.renderScenesWithPagination(activeScenes) : this.renderScenesHTML(activeScenes));
                    }
                    
                    const newPaginationControls = this.usePagination && activeScenes.length > 0 ? this.renderPaginationControls(activeScenes.length) : '';
                    if (paginationControls.length) {
                        if (newPaginationControls) {
                            paginationControls.replaceWith(newPaginationControls);
                        } else {
                            paginationControls.remove();
                        }
                    } else if (newPaginationControls) {
                        html.find(".gl-grid-wrapper").after(newPaginationControls);
                    }
                    
                    if (newPaginationControls) {
                        const updatePaginationContent = async () => {
                            const data = await this.getData();
                            const activeScenes = this.getActiveScenes(data.scenes);
                            const gridElement = html.find("#scene-grid");
                            const paginationControls = html.find(".pagination-controls");
                            
                            if (activeScenes.length === 0) {
                                gridElement.html(`<div class="gl-empty">${game.i18n.localize("SCENESLIBRARY.Empty")}</div>`);
                            } else {
                                gridElement.html(this.usePagination ? this.renderScenesWithPagination(activeScenes) : this.renderScenesHTML(activeScenes));
                            }
                            
                            const newPaginationControlsHTML = this.usePagination && activeScenes.length > 0 ? this.renderPaginationControls(activeScenes.length) : '';
                            if (paginationControls.length) {
                                if (newPaginationControlsHTML) {
                                    paginationControls.replaceWith(newPaginationControlsHTML);
                                    html.find("#pagination-prev").off("click").on("click", (e) => {
                                        if (this.currentPage > 1) {
                                            this.currentPage--;
                                            updatePaginationContent();
                                        }
                                    });
                                    html.find("#pagination-next").off("click").on("click", async (e) => {
                                        const data = await this.getData();
                                        const activeScenes = this.getActiveScenes(data.scenes);
                                        const totalPages = Math.ceil(activeScenes.length / this.scenesPerPage);
                                        if (this.currentPage < totalPages) {
                                            this.currentPage++;
                                            updatePaginationContent();
                                        }
                                    });
                                } else {
                                    paginationControls.remove();
                                }
                            } else if (newPaginationControlsHTML) {
                                html.find(".gl-grid-wrapper").after(newPaginationControlsHTML);
                                html.find("#pagination-prev").off("click").on("click", (e) => {
                                    if (this.currentPage > 1) {
                                        this.currentPage--;
                                        updatePaginationContent();
                                    }
                                });
                                html.find("#pagination-next").off("click").on("click", async (e) => {
                                    const data = await this.getData();
                                    const activeScenes = this.getActiveScenes(data.scenes);
                                    const totalPages = Math.ceil(activeScenes.length / this.scenesPerPage);
                                    if (this.currentPage < totalPages) {
                                        this.currentPage++;
                                        updatePaginationContent();
                                    }
                                });
                            }
                        };
                        
                        html.find("#pagination-prev").off("click").on("click", (e) => {
                            if (this.currentPage > 1) {
                                this.currentPage--;
                                updatePaginationContent();
                            }
                        });
                        
                        html.find("#pagination-next").off("click").on("click", async (e) => {
                            const data = await this.getData();
                            const activeScenes = this.getActiveScenes(data.scenes);
                            const totalPages = Math.ceil(activeScenes.length / this.scenesPerPage);
                            if (this.currentPage < totalPages) {
                                this.currentPage++;
                                updatePaginationContent();
                            }
                        });
                    }
                    
                    setTimeout(() => {
                        searchInput.focus();
                        if (searchInput[0].setSelectionRange) {
                            searchInput[0].setSelectionRange(cursorPosition, cursorPosition);
                        }
                    }, 0);
                })();
                
                return;
            }

            const showTagSuggestions = (query) => {
                if (!query.includes("#")) {
                    suggestionsContainer.hide().empty();
                    return;
                }
                
                const parts = query.split(/\s+/);
                let currentTagPart = "";
                let tagStartIndex = -1;
                
                for (let i = parts.length - 1; i >= 0; i--) {
                    if (parts[i].startsWith("#")) {
                        currentTagPart = parts[i].substring(1).replace(/^#+/, "").trim();
                        tagStartIndex = i;
                        break;
                    }
                }
                
                if (tagStartIndex === -1 || !currentTagPart) {
                    suggestionsContainer.hide().empty();
                    return;
                }
                
                const allTags = this.getAllExistingTags();
                const suggestions = allTags
                    .filter(tag => tag.includes(currentTagPart.toLowerCase()))
                    .slice(0, 5);
                
                if (suggestions.length === 0) {
                    suggestionsContainer.hide().empty();
                    return;
                }
                
                const suggestionsHTML = suggestions.map((tag, idx) => 
                    `<div class="scene-search-suggestion ${idx === selectedSuggestionIndex ? 'selected' : ''}" data-tag="${tag}" data-tag-index="${tagStartIndex}">#${tag}</div>`
                ).join("");
                
                suggestionsContainer.html(suggestionsHTML).show();
            };
            
            showTagSuggestions(term);

            html.find(".cd-card").each((i, el) => {
                const card = $(el);
                const name = String(card.data("name") || "").toLowerCase();
                const tags = String(card.data("tags") || "").toLowerCase();
                const isCompendiumCard = !!card.data("uuid");
                
                let shouldShow = false;
                
                if (!term) {
                    shouldShow = true;
                } else if (term.startsWith("#")) {
                    const tagQuery = term.substring(1).trim();
                    if (tagQuery) {
                        const searchTags = tagQuery.split(/\s+/)
                            .map(t => t.trim().replace(/^#+/, "").toLowerCase())
                            .filter(t => t);
                        if (searchTags.length > 0) {
                            const cardTags = tags.split(/\s+/).filter(t => t);
                            shouldShow = searchTags.every(tag => cardTags.includes(tag));
                        } else {
                            shouldShow = true;
                        }
                    } else {
                        shouldShow = true;
                    }
                } else if (term.startsWith("$")) {
                    const nameQuery = term.substring(1).trim().toLowerCase();
                    if (nameQuery) {
                        shouldShow = name.includes(nameQuery);
                    } else {
                        shouldShow = true;
                    }
                } else {
                    const termLower = term.toLowerCase();
                    shouldShow = name.includes(termLower) || tags.includes(termLower);
                }
                
                if (shouldShow) card.show(); else card.hide();
            });
        });
        
        html.find("#scene-search").on("keydown", (e) => {
            const suggestionsContainer = html.find("#scene-search-suggestions");
            const suggestions = suggestionsContainer.find(".scene-search-suggestion");
            let selectedSuggestionIndex = parseInt(suggestionsContainer.data("selected") || "-1");
            
            if (e.key === "ArrowDown" && suggestionsContainer.is(":visible")) {
                e.preventDefault();
                if (suggestions.length > 0) {
                    selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
                    suggestions.removeClass("selected");
                    suggestions.eq(selectedSuggestionIndex).addClass("selected");
                    suggestionsContainer.data("selected", selectedSuggestionIndex);
                }
            } else if (e.key === "ArrowUp" && suggestionsContainer.is(":visible")) {
                e.preventDefault();
                if (suggestions.length > 0) {
                    selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
                    suggestions.removeClass("selected");
                    if (selectedSuggestionIndex >= 0) {
                        suggestions.eq(selectedSuggestionIndex).addClass("selected");
                    }
                    suggestionsContainer.data("selected", selectedSuggestionIndex);
                }
            } else if (e.key === "Enter" && suggestionsContainer.is(":visible") && selectedSuggestionIndex >= 0) {
                e.preventDefault();
                const selected = suggestions.eq(selectedSuggestionIndex);
                if (selected.length) {
                    const tag = selected.data("tag");
                    const tagIndex = selected.data("tag-index");
                    const currentValue = html.find("#scene-search").val();
                    const parts = currentValue.split(/\s+/);
                    
                    if (tagIndex >= 0 && tagIndex < parts.length) {
                        parts[tagIndex] = `#${tag}`;
                    } else if (parts.length > 0 && parts[parts.length - 1].startsWith("#")) {
                        parts[parts.length - 1] = `#${tag}`;
                    } else {
                        parts.push(`#${tag}`);
                    }
                    
                    html.find("#scene-search").val(parts.join(" ")).trigger("input");
                    suggestionsContainer.hide().empty().data("selected", -1);
                }
            } else if (e.key === "Escape") {
                suggestionsContainer.hide().empty().data("selected", -1);
            }
        });
        
        html.find("#scene-search").on("blur", (e) => {
            setTimeout(() => {
                const suggestionsContainer = html.find("#scene-search-suggestions");
                if (!suggestionsContainer.is(":hover") && !$(e.relatedTarget).closest(".scene-search-suggestion").length) {
                    suggestionsContainer.hide().empty().data("selected", -1);
                }
            }, 200);
        });
        
        html.find("#scene-search-suggestions").on("click", ".scene-search-suggestion", (e) => {
            const tag = $(e.currentTarget).data("tag");
            const tagIndex = $(e.currentTarget).data("tag-index");
            const currentValue = html.find("#scene-search").val();
            const parts = currentValue.split(/\s+/);
            
            if (tagIndex >= 0 && tagIndex < parts.length) {
                parts[tagIndex] = `#${tag}`;
            } else if (parts.length > 0 && parts[parts.length - 1].startsWith("#")) {
                parts[parts.length - 1] = `#${tag}`;
            } else {
                parts.push(`#${tag}`);
            }
            
            html.find("#scene-search").val(parts.join(" ")).focus().trigger("input");
        });
        
        html.find(".input-clear").click((e) => {
            const target = e.currentTarget.dataset.target;
            if (target === "folder") { this.folderTerm = ""; this.render(); }
            if (target === "scene") { 
                this.sceneTerm = ""; 
                this.currentPage = 1;
                html.find("#scene-search").val("").focus(); 
                if (this.usePagination) {
                    this.render();
                } else {
                html.find(".cd-card").show(); 
                }
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
            this.currentPage = 1;
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
        
        html.find("#clear-recent").click(async () => {
            new Dialog({
                title: game.i18n.localize("SCENESLIBRARY.ClearRecentTitle"),
                content: `<p>${game.i18n.localize("SCENESLIBRARY.ClearRecentConfirm")}</p>`,
                buttons: {
                    yes: { icon: '<i class="fas fa-check"></i>', label: game.i18n.localize("SCENESLIBRARY.Yes"), callback: async () => { await this.clearRecent(); } },
                    no: { icon: '<i class="fas fa-times"></i>', label: game.i18n.localize("SCENESLIBRARY.No") }
                },
                default: "no"
            }).render(true);
        });

        html.find(".action-remove-recent").click(async (e) => {
            e.stopPropagation();
            const id = $(e.currentTarget).closest(".cd-card").data("id");
            await this.removeFromRecent(id);
        });
        
        html.find(".action-activate").click(async (e) => { e.stopPropagation(); await game.scenes.get($(e.currentTarget).closest(".cd-card").data("id"))?.activate(); this.render(); });
        
        html.find(".action-import").click(async (e) => {
            e.stopPropagation();
            const card = $(e.currentTarget).closest(".cd-card");
            const packId = card.data("pack");
            const sceneId = card.data("id");
            const pack = game.packs.get(packId);
            if (pack) {
                let targetFolder = game.folders.find(f => f.name === pack.title && f.type === "Scene");
                if (!targetFolder) {
                     targetFolder = await Folder.create({ name: pack.title, type: "Scene", color: "#4a5e75" });
                }

                try {
                    const imported = await game.scenes.importFromCompendium(pack, sceneId, { folder: targetFolder.id });
                    if(imported) await this.addToRecent(imported.id);
                    ui.notifications.info(game.i18n.localize("SCENESLIBRARY.ImportedMsg"));
                    this.render();
                } catch (err) {
                    console.error(err);
                    ui.notifications.error(game.i18n.localize("SCENESLIBRARY.ImportError"));
                }
            }
        });

        html.find(".action-import-view").click(async (e) => {
            e.stopPropagation();
            const card = $(e.currentTarget).closest(".cd-card");
            const packId = card.data("pack");
            const sceneId = card.data("id");
            const pack = game.packs.get(packId);
            if (pack) {
                let targetFolder = game.folders.find(f => f.name === pack.title && f.type === "Scene");
                if (!targetFolder) {
                     targetFolder = await Folder.create({ name: pack.title, type: "Scene", color: "#4a5e75" });
                }

                try {
                    const scene = await game.scenes.importFromCompendium(pack, sceneId, { folder: targetFolder.id });
                    if(scene) await this.addToRecent(scene.id);
                    ui.notifications.info(game.i18n.localize("SCENESLIBRARY.ImportedMsg"));
                    if(scene) {
                        await scene.view();
                        await scene.activate();
                    }
                    this.render();
                } catch (err) {
                    console.error(err);
                    ui.notifications.error(game.i18n.localize("SCENESLIBRARY.ImportError"));
                }
            }
        });

        html.find("#import-all").click(async (e) => {
            e.stopPropagation();
            let packId = this.activeFolderId;
            let targetFolderId = null;
            let pack = null;
            
            if (packId && packId.startsWith("compendium-")) {
                const idWithoutPrefix = packId.replace("compendium-", "");
                for (const p of game.packs.values()) {
                    if (idWithoutPrefix.startsWith(p.collection + "-")) {
                        pack = p;
                        targetFolderId = idWithoutPrefix.substring(p.collection.length + 1);
                        break;
                    } else if (idWithoutPrefix === p.collection) {
                        pack = p;
                        break;
                    }
                }
            } else {
                pack = game.packs.get(packId);
            }
            
            if(!pack) return;

            let targetFolder = game.folders.find(f => f.name === pack.title && f.type === "Scene");
            if (!targetFolder) {
                 targetFolder = await Folder.create({ name: pack.title, type: "Scene", color: "#4a5e75" });
            }

            try {
                const index = await pack.getIndex({ fields: ["folder"] });
                const entries = Array.isArray(index) ? index : Array.from(index.values());
                
                let scenesToImport = entries;
                if (targetFolderId) {
                    scenesToImport = entries.filter(s => s.folder === targetFolderId);
                } else {
                    scenesToImport = entries.filter(s => !s.folder || s.folder === null);
                }
                
                const startMsg = game.i18n.format("SCENESLIBRARY.ImportStart", { count: scenesToImport.length, folder: pack.title });
                ui.notifications.info(startMsg);
                
                for(const entry of scenesToImport) {
                    const imported = await game.scenes.importFromCompendium(pack, entry._id, { folder: targetFolder.id });
                    if(imported) await this.addToRecent(imported.id);
                }
                ui.notifications.info(game.i18n.localize("SCENESLIBRARY.ImportFinish"));
                this.render();
            } catch(err) {
                console.error(err);
                ui.notifications.error(game.i18n.localize("SCENESLIBRARY.ImportAllError"));
            }
        });

        html.find(".action-open-folder").click(async (e) => {
            e.stopPropagation();
            const folderId = e.currentTarget.dataset.folderId;
            this.mode = "world";
            this.activeFolderId = folderId;
            this.currentPage = 1;
            
            let folder = game.folders.get(folderId);
            while (folder && folder.folder) {
                this.expandedState.add(folder.folder.id);
                folder = folder.folder;
            }
            
            this.render();
        });
        
        html.find(".action-config").click((e) => { e.stopPropagation(); game.scenes.get($(e.currentTarget).closest(".cd-card").data("id"))?.sheet.render(true); });
        html.find(".action-tags").click(async (e) => { 
            e.stopPropagation(); 
            const sceneId = $(e.currentTarget).closest(".cd-card").data("id");
            await this._editSceneTags(sceneId);
        });
        html.find(".cd-card").click((e) => { if ($(e.target).closest(".cd-btn, .cd-fav, .cd-tag").length) return; game.scenes.get(e.currentTarget.dataset.id)?.view(); });
		html.find(".action-delete").click((e) => { 
            e.stopPropagation(); 
            game.scenes.get($(e.currentTarget).closest(".cd-card").data("id"))?.deleteDialog(); 
        });
        
        html.find(".cd-tag").click((e) => {
            e.stopPropagation();
            const tag = e.currentTarget.dataset.tag;
            this.sceneTerm = `#${tag}`;
            this.shouldFocusSceneSearch = true;
            this.render();
        });
        
        html.find(".cd-tags").each((i, el) => {
            const tagsEl = el;
            if (tagsEl.scrollHeight > tagsEl.clientHeight) {
                this._startAutoScroll(tagsEl);
            }
        });
        
        this.initDragDrop(html);
    }
    
    _startAutoScroll(element) {
        const scrollDuration = 8000;
        const pauseDuration = 2000;
        let isScrolling = false;
        let pauseOnHover = false;
        let animationId = null;
        
        const scroll = () => {
            if (isScrolling || pauseOnHover) return;
            isScrolling = true;
            
            const maxScroll = element.scrollHeight - element.clientHeight;
            if (maxScroll <= 0) {
                isScrolling = false;
                return;
            }
            
            const startScroll = element.scrollTop;
            const startTime = Date.now();
            
            const animate = () => {
                if (pauseOnHover) {
                    animationId = null;
                    isScrolling = false;
                    return;
                }
                
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / scrollDuration, 1);
                const easeProgress = progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                
                element.scrollTop = startScroll + (maxScroll * easeProgress);
                
                if (progress < 1 && !pauseOnHover) {
                    animationId = requestAnimationFrame(animate);
                } else if (!pauseOnHover) {
                    setTimeout(() => {
                        if (pauseOnHover) return;
                        
                        const reverseStart = element.scrollTop;
                        const reverseStartTime = Date.now();
                        
                        const reverseAnimate = () => {
                            if (pauseOnHover) {
                                animationId = null;
                                isScrolling = false;
                                return;
                            }
                            
                            const reverseElapsed = Date.now() - reverseStartTime;
                            const reverseProgress = Math.min(reverseElapsed / scrollDuration, 1);
                            const reverseEaseProgress = reverseProgress < 0.5 
                                ? 2 * reverseProgress * reverseProgress 
                                : 1 - Math.pow(-2 * reverseProgress + 2, 2) / 2;
                            
                            element.scrollTop = reverseStart - (maxScroll * reverseEaseProgress);
                            
                            if (reverseProgress < 1 && !pauseOnHover) {
                                animationId = requestAnimationFrame(reverseAnimate);
                            } else if (!pauseOnHover) {
                                setTimeout(() => {
                                    isScrolling = false;
                                    scroll();
                                }, pauseDuration);
                            }
                        };
                        
                        animationId = requestAnimationFrame(reverseAnimate);
                    }, pauseDuration);
                }
            };
            
            animationId = requestAnimationFrame(animate);
        };
        
        element.addEventListener('mouseenter', () => {
            pauseOnHover = true;
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        });
        
        element.addEventListener('mouseleave', () => {
            pauseOnHover = false;
            if (element.scrollHeight > element.clientHeight && !isScrolling) {
                scroll();
            }
        });
        
        scroll();
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
                <label>${game.i18n.localize("SCENESLIBRARY.NameLabel")}</label>
                <input type="text" name="name" value="${game.i18n.localize("SCENESLIBRARY.NewMapDefault")}" autofocus/>
            </div>
            <div class="form-group">
                <label>${game.i18n.localize("SCENESLIBRARY.ImgLabel")}</label>
                <div class="img-group">
                    <input type="text" name="img" placeholder="${game.i18n.localize("SCENESLIBRARY.ImgPlaceholder")}" id="new-scene-img"/>
                    <button type="button" class="file-picker" data-type="image" data-target="new-scene-img" title="${game.i18n.localize("SCENESLIBRARY.SelectFile")}" style="flex:0 0 30px; text-align:center;">
                        <i class="fas fa-file-import"></i>
                    </button>
                    <button type="button" class="paste-btn" title="${game.i18n.localize("SCENESLIBRARY.PasteFromClipboard")}" style="flex:0 0 30px; text-align:center;">
                        <i class="fas fa-paste"></i>
                    </button>
                </div>
            </div>
            
            <div class="dialog-options">
                <div class="checkbox-row">
                    <input type="checkbox" name="tokenVision" id="opt-vision">
                    <label for="opt-vision">${game.i18n.localize("SCENESLIBRARY.OptVision")}</label>
                </div>
                <div class="checkbox-row">
                    <input type="checkbox" name="globalLight" id="opt-light" checked>
                    <label for="opt-light">${game.i18n.localize("SCENESLIBRARY.OptLight")}</label>
                </div>
                <div class="checkbox-row">
                    <input type="checkbox" name="grid" id="opt-grid">
                    <label for="opt-grid">${game.i18n.localize("SCENESLIBRARY.OptGrid")}</label>
                </div>
                <div class="checkbox-row">
                    <input type="checkbox" name="navigate" id="opt-nav" checked>
                    <label for="opt-nav">${game.i18n.localize("SCENESLIBRARY.OptNav")}</label>
                </div>
            </div>
        </div>
        `;

        new Dialog({
            title: game.i18n.localize("SCENESLIBRARY.CreateTitle"),
            content: dialogContent,
            buttons: {
                create: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("SCENESLIBRARY.BtnCreate"),
                    callback: async (html) => {
                        const name = html.find('input[name="name"]').val() || game.i18n.localize("SCENESLIBRARY.NewMapDefault");
                        let imgPath = html.find('input[name="img"]').val();
                        
                        if (imgPath && (imgPath.startsWith("http://") || imgPath.startsWith("https://"))) {
                            try {
                                ui.notifications.info(game.i18n.localize("SCENESLIBRARY.Downloading"));
                                imgPath = await this._downloadImage(imgPath, name);
                                ui.notifications.info(game.i18n.localize("SCENESLIBRARY.ImgSaved") + imgPath);
                            } catch (e) {
                                ui.notifications.error(game.i18n.localize("SCENESLIBRARY.DownloadError") + e.message);
                                console.error(e);
                                return;
                            }
                        }
                        
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
                    label: game.i18n.localize("SCENESLIBRARY.BtnCancel")
                }
            },
            default: "create",
            render: (html) => {
                const imgInput = html.find('input[name="img"]');
                
                html.find(".file-picker").click(ev => {
                    const fp = new FilePicker({
                        type: "image",
                        callback: (path) => {
                            imgInput.val(path);
                        }
                    });
                    fp.browse();
                });

                html.find(".paste-btn").click(async () => {
                    try {
                        const items = await navigator.clipboard.read();
                        for (const item of items) {
                            for (const type of item.types) {
                                if (type.startsWith("image/")) {
                                    const blob = await item.getType(type);
                                    await this._uploadClipboardImage(blob, imgInput);
                                    return;
                                }
                            }
                        }
                        ui.notifications.warn(game.i18n.localize("SCENESLIBRARY.ClipboardEmpty"));
                    } catch (err) {
                        imgInput.focus();
                        ui.notifications.info(game.i18n.localize("SCENESLIBRARY.ClipboardHint"));
                    }
                });

                imgInput.on("paste", async (e) => {
                    const items = (e.originalEvent.clipboardData || e.clipboardData).items;
                    for (const item of items) {
                        if (item.kind === 'file' && item.type.startsWith('image/')) {
                            e.preventDefault();
                            const blob = item.getAsFile();
                            await this._uploadClipboardImage(blob, imgInput);
                            return;
                        }
                    }
                });
            }
        }, {
            classes: ["dialog", "so-dialog"]
        }).render(true);
    }

    async _uploadClipboardImage(blob, inputEl) {
        try {
            ui.notifications.info(game.i18n.localize("SCENESLIBRARY.ClipboardLoading"));
            
            let ext = "png";
            if (blob.type === "image/jpeg") ext = "jpg";
            else if (blob.type === "image/webp") ext = "webp";
            
            const fileName = `clipboard_${Date.now()}.${ext}`;
            const targetDir = "assets/maps/clipboard";
            
            await this._ensureDirectory(targetDir);
            
            const file = new File([blob], fileName, { type: blob.type });
            await FilePicker.upload("data", targetDir, file);
            
            const finalPath = `${targetDir}/${fileName}`;
            inputEl.val(finalPath);
            ui.notifications.info(game.i18n.localize("SCENESLIBRARY.ClipboardSaved"));
        } catch(err) {
            console.error(err);
            ui.notifications.error(game.i18n.localize("SCENESLIBRARY.ClipboardError") + err.message);
        }
    }

    async _downloadImage(url, baseName) {
        let blob;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Direct fetch failed");
            blob = await response.blob();
        } catch (err) {
            console.warn("Direct download failed (CORS?), trying proxy...", err);
            try {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error("Proxy fetch failed");
                blob = await response.blob();
            } catch (e) {
                throw new Error(game.i18n.localize("SCENESLIBRARY.CORSWarning"));
            }
        }
        
        let ext = "png";
        const mime = blob.type;
        if (mime === "image/jpeg") ext = "jpg";
        else if (mime === "image/webp") ext = "webp";
        else if (mime === "image/gif") ext = "gif";
        else if (mime === "video/webm") ext = "webm";
        else if (mime === "video/mp4") ext = "mp4";
        
        if (url.includes(".")) {
            const urlExt = url.split('.').pop().split(/[?#]/)[0].toLowerCase();
            if (["png","jpg","jpeg","webp","webm","mp4","m4v"].includes(urlExt)) {
                ext = urlExt;
            }
        }

        const safeName = baseName.replace(/[^a-z0-9а-яё]/gi, '_').toLowerCase();
        const fileName = `${safeName}_${Date.now()}.${ext}`;
        const targetDir = "assets/maps/autodownloaded";

        await this._ensureDirectory(targetDir);

        const file = new File([blob], fileName, { type: mime });
        await FilePicker.upload("data", targetDir, file);

        return `${targetDir}/${fileName}`;
    }

    async _ensureDirectory(path) {
        const parts = path.split("/");
        let current = "";
        for (let part of parts) {
            current = current ? `${current}/${part}` : part;
            try {
                await FilePicker.browse("data", current);
            } catch (e) {
                await FilePicker.createDirectory("data", current);
            }
        }
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

    async _editSceneTags(sceneId) {
        const scene = game.scenes.get(sceneId);
        if (!scene) return;
        
        const currentTags = this.getSceneTags(sceneId);
        const tagsHTML = currentTags.map(tag => 
            `<span class="tag-editor-tag" data-tag="${tag}">
                <span class="tag-editor-tag-text">${tag}</span>
                <i class="fas fa-times tag-editor-remove"></i>
            </span>`
        ).join("");
        
        const dialogContent = `
        <div class="tag-editor-container">
            <label>${game.i18n.localize("SCENESLIBRARY.TagsLabel")}</label>
            <div class="tag-editor-tags" id="tag-editor-tags">
                ${tagsHTML}
            </div>
            <div class="tag-editor-input-wrapper">
                <input type="text" class="tag-editor-input" id="tag-editor-input" placeholder="${game.i18n.localize("SCENESLIBRARY.AddTagPlaceholder")}" autofocus/>
                <div class="tag-editor-suggestions" id="tag-editor-suggestions" style="display: none;"></div>
            </div>
            <p class="tag-editor-hint">${game.i18n.localize("SCENESLIBRARY.TagsHint")}</p>
        </div>
        `;

        new Dialog({
            title: game.i18n.format("SCENESLIBRARY.EditTagsTitle", {name: scene.name}),
            content: dialogContent,
            classes: ["dialog", "so-dialog"],
            buttons: {
                save: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("SCENESLIBRARY.Save"),
                    callback: async (html) => {
                        const tags = [];
                        html.find(".tag-editor-tag").each((i, el) => {
                            const tag = $(el).data("tag");
                            if (tag && tag.trim()) {
                                tags.push(tag.trim());
                            }
                        });
                        await this.setSceneTags(sceneId, tags);
                        this.render();
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("SCENESLIBRARY.BtnCancel")
                }
            },
            default: "save",
            render: (html) => {
                const input = html.find("#tag-editor-input");
                const tagsContainer = html.find("#tag-editor-tags");
                const suggestionsContainer = html.find("#tag-editor-suggestions");
                const allExistingTags = this.getAllExistingTags();
                let selectedSuggestionIndex = -1;
                
                const addTag = (tagText) => {
                    const tag = tagText.trim().replace(/#/g, "").trim();
                    if (!tag || tag.length === 0) return;
                    
                    const existing = tagsContainer.find(`[data-tag="${tag}"]`);
                    if (existing.length > 0) return;
                    
                    const tagHTML = `
                        <span class="tag-editor-tag" data-tag="${tag}">
                            <span class="tag-editor-tag-text">${tag}</span>
                            <i class="fas fa-times tag-editor-remove"></i>
                        </span>
                    `;
                    tagsContainer.append(tagHTML);
                    input.val("");
                    suggestionsContainer.hide().empty();
                    selectedSuggestionIndex = -1;
                };
                
                const showSuggestions = (query) => {
                    const queryLower = query.toLowerCase().trim().replace(/#/g, "");
                    if (!queryLower || queryLower.length === 0) {
                        suggestionsContainer.hide().empty();
                        return;
                    }
                    
                    const currentTags = [];
                    tagsContainer.find(".tag-editor-tag").each((i, el) => {
                        currentTags.push($(el).data("tag").toLowerCase());
                    });
                    
                    const suggestions = allExistingTags
                        .filter(tag => tag.includes(queryLower) && !currentTags.includes(tag))
                        .slice(0, 5);
                    
                    if (suggestions.length === 0) {
                        suggestionsContainer.hide().empty();
                        return;
                    }
                    
                    const suggestionsHTML = suggestions.map((tag, idx) => 
                        `<div class="tag-editor-suggestion ${idx === selectedSuggestionIndex ? 'selected' : ''}" data-tag="${tag}">${tag}</div>`
                    ).join("");
                    
                    suggestionsContainer.html(suggestionsHTML).show();
                };
                
                input.on("input", (e) => {
                    const value = input.val();
                    showSuggestions(value);
                    selectedSuggestionIndex = -1;
                });
                
                input.on("keydown", (e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        if (selectedSuggestionIndex >= 0 && suggestionsContainer.is(":visible")) {
                            const selected = suggestionsContainer.find(".tag-editor-suggestion").eq(selectedSuggestionIndex);
                            if (selected.length) {
                                addTag(selected.data("tag"));
                                return;
                            }
                        }
                        const value = input.val();
                        if (value) {
                            addTag(value);
                        }
                    } else if (e.key === "ArrowDown") {
                        e.preventDefault();
                        const suggestions = suggestionsContainer.find(".tag-editor-suggestion");
                        if (suggestions.length > 0) {
                            selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
                            suggestions.removeClass("selected");
                            suggestions.eq(selectedSuggestionIndex).addClass("selected");
                        }
                    } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        const suggestions = suggestionsContainer.find(".tag-editor-suggestion");
                        if (suggestions.length > 0) {
                            selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
                            suggestions.removeClass("selected");
                            if (selectedSuggestionIndex >= 0) {
                                suggestions.eq(selectedSuggestionIndex).addClass("selected");
                            }
                        }
                    } else if (e.key === "Escape") {
                        suggestionsContainer.hide().empty();
                        selectedSuggestionIndex = -1;
                    } else if (e.key === "Tab") {
                        e.preventDefault();
                        const value = input.val();
                        if (value) {
                            addTag(value);
                        }
                    }
                });
                
                input.on("blur", (e) => {
                    setTimeout(() => {
                        if (!suggestionsContainer.is(":hover") && !$(e.relatedTarget).closest(".tag-editor-suggestion").length) {
                            suggestionsContainer.hide().empty();
                            selectedSuggestionIndex = -1;
                        }
                    }, 200);
                });
                
                suggestionsContainer.on("click", ".tag-editor-suggestion", (e) => {
                    const tag = $(e.currentTarget).data("tag");
                    addTag(tag);
                });
                
                html.find(".tag-editor-remove").click((e) => {
                    e.stopPropagation();
                    $(e.currentTarget).closest(".tag-editor-tag").remove();
                });
                
                html.on("click", ".tag-editor-remove", (e) => {
                    e.stopPropagation();
                    $(e.currentTarget).closest(".tag-editor-tag").remove();
                });
            }
        }).render(true);
    }
}