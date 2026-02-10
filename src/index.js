const hasNativeSoftkeys =
    (navigator.softkeyManager && typeof navigator.softkeyManager.setKeys === "function") ||
    (navigator.mozSettings && typeof navigator.mozSettings.createLock === "function");

const SoftRight = event => {
    window.location.reload();
};

const SoftLeft = event => {
    const activeElement = document.activeElement;
    if (activeElement && typeof activeElement.blur === "function") {
        activeElement.blur();
    }
    focusIframe();
};

const focusIframe = () => {
    const iframe = document.querySelector(".app-frame");
    if (!iframe) return;
    iframe.focus();
    if (iframe.contentWindow && typeof iframe.contentWindow.focus === "function") {
        iframe.contentWindow.focus();
    }
};

const setNativeSoftkeys = ({ left, center, right }) => {
    if (navigator.softkeyManager && typeof navigator.softkeyManager.setKeys === "function") {
        navigator.softkeyManager.setKeys({
            left: left || "",
            center: center || "",
            right: right || ""
        });
        return;
    }

    if (navigator.mozSettings && typeof navigator.mozSettings.createLock === "function") {
        try {
            navigator.mozSettings.createLock().set({
                "softkey.left": left || "",
                "softkey.center": center || "",
                "softkey.right": right || ""
            });
        } catch (error) {
            return;
        }
    }
};

const setLabels = ({ left, center, right }) => {
    document.getElementById("left").innerText = left ? left : "";
    document.getElementById("center").innerText = center ? center : "";
    document.getElementById("right").innerText = right ? right : "";
    setNativeSoftkeys({ left, center, right });
};

const exitApp = () => {
    if (navigator.app && typeof navigator.app.exit === "function") {
        navigator.app.exit();
        return;
    }

    if (navigator.mozApps && typeof navigator.mozApps.getSelf === "function") {
        const request = navigator.mozApps.getSelf();
        request.onsuccess = () => {
            const app = request.result;
            if (app && typeof app.close === "function") {
                app.close();
                return;
            }
            window.close();
        };
        request.onerror = () => window.close();
        return;
    }

    window.close();
};

const initSoftkeys = () => {
    if (hasNativeSoftkeys) {
        document.documentElement.classList.add("native-softkeys");
    }
    setLabels({ left: "Hide KB", center: "", right: "Reload" });
};

document.addEventListener("keydown", event => {
    switch (event.key) {
        case "SoftLeft":
            return SoftLeft(event);
        case "SoftRight":
            return SoftRight(event);
        default:
            focusIframe();
            return;
    }
});

initSoftkeys();

window.addEventListener("load", () => {
    focusIframe();
});