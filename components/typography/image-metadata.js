/*
    The script turns `<img src="..." alt="metadata text">`
    into
    
    ```html
    <img src="..." alt="metadata text">
    <div class="meta" styles="text-align: center">metadata text</div>
    ```

    in all `article` containers.
*/

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("article").forEach((container) => {
    Array.from(container.children)
      .filter((el) => el.tagName === "IMG")
      .forEach((img) => {
        const alt = img.getAttribute("alt");
        if (alt && alt.trim() !== "") {
          const meta = document.createElement("div");
          meta.className = "meta";
          meta.textContent = alt;
          meta.style = "text-align: center";
          img.insertAdjacentElement("afterend", meta);
        }
      });
  });
});