import { ScenesLibrary } from "./ScenesLibrary.js";

Hooks.on("getSceneControlButtons", (controls) => {
    if (!game.user.isGM) return;

    if (controls && typeof controls === "object" && !Array.isArray(controls)) {
        const tokenGroup = controls.tokens || controls.token;
        if (tokenGroup && tokenGroup.tools) {
            tokenGroup.tools.sceneslibrary = {
                name: "sceneslibrary",
                title: "Библиотека Сцен",
                icon: "fas fa-map",
                visible: true,
                button: true,
                onClick: () => { new ScenesLibrary().render(true); }
            };
            return; 
        }
    }
    if (Array.isArray(controls)) {
        const tokenGroup = controls.find(c => c.name === "token");
        if (tokenGroup) {
            tokenGroup.tools.push({
                name: "sceneslibrary",
                title: "Навигатор Сцен",
                icon: "fas fa-map-marked-alt",
                visible: true,
                button: true,
                onClick: () => { new ScenesLibrary().render(true); }
            });
        }
    }
});