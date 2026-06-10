/* 

    Add an external link marker (an arrow inside a square) to all external
    links without `.not-external-link` in all `.external-links` containers

*/

document.addEventListener("DOMContentLoaded", () => {
    const currentHost = location.hostname;

    const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z"/></svg>`;
    
    document.querySelectorAll(".external-links").forEach((container) => {
        container.querySelectorAll("a").forEach((link) => {
            if (link.classList.contains("not-external-link")) return;

            let host;
            try {
                host = new URL(link.href).hostname;
            } catch {
                return;
            }

            if (host && host !== currentHost) {
                link.target = "_blank";
                link.rel = "noopener";

                const children = [...link.childNodes];
                const hasText = children.some(
                    (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== ""
                );
                const iconCount = link.querySelectorAll("i").length;

                if (!hasText && iconCount === 1) return;

                let wrapper = document.createElement("span");
                wrapper.innerHTML = ICON_SVG;
                wrapper.classList.add("external-link-icon");
                link.appendChild(wrapper);
            }
        });
    });
});