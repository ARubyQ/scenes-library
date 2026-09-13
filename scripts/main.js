import { ScenesLibrary } from "./ScenesLibrary.js";

Hooks.on("getSceneControlButtons", (controls) => {
    if (!game.user.isGM) return;

    let tokenGroup = null;
    if (Array.isArray(controls)) {
        tokenGroup = controls.find(c => c.name === "tokens" || c.name === "token");
    } else if (controls instanceof Map) {
        tokenGroup = controls.get("tokens") || controls.get("token");
    } else if (controls && typeof controls === "object") {
        tokenGroup = controls.tokens || controls.token;
    }

    if (!tokenGroup) return;

    const tool = {
        name: "sceneslibrary",
        title: game.i18n.localize("SCENESLIBRARY.Title") || game.i18n.localize("SCENESLIBRARY.Navigator"),
        icon: "fa-solid fa-map-location-dot",
        visible: true,
        button: true,
        onClick: () => { new ScenesLibrary().render(true); },
        onChange: () => { new ScenesLibrary().render(true); }
    };

    if (Array.isArray(tokenGroup.tools)) {
        if (!tokenGroup.tools.some(t => t.name === "sceneslibrary")) {
            tokenGroup.tools.push(tool);
        }
    } else if (tokenGroup.tools instanceof Map) {
        tokenGroup.tools.set("sceneslibrary", tool);
    } else if (tokenGroup.tools && typeof tokenGroup.tools === "object") {
        tokenGroup.tools.sceneslibrary = tool;
    }
});