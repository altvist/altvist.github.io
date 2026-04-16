/**
 * toc-numbered.js
 *
 * On DOMContentLoaded:
 *  1. Finds all article elements.
 *  2. Inside each, finds all h1–h6 headings.
 *  3. Assigns a unique human-readable id to each heading (with Cyrillic
 *     transliteration) and appends a clickable «#» anchor at the end.
 *  4. Numbers headings hierarchically (1 / 1.1 / 1.1.1 / …) and wraps
 *     each heading in <ul><li class="header-li" style='list-style-type:"N "'>
 *     so the number appears as the list marker with zero left-indent via CSS.
 *  5. If a div#toc exists — prepends an «On this page» h1 (with its own
 *     anchor) and builds a hierarchical ToC where each <li> carries the same
 *     number as its heading via list-style-type, preserving rich content
 *     (<code>, KaTeX spans, …) inside ToC links.
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // ── Cyrillic transliteration (Ukrainian primary, Russian supplement) ──────

    const TRANSLIT_MAP = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd',
        'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i',
        'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
        'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
        'ь': '', 'ю': 'yu', 'я': 'ya',
        // Russian-only
        'ъ': '', 'ы': 'y', 'э': 'e', 'ё': 'yo',
    };

    /** Transliterates Cyrillic characters to Latin equivalents. */
    function translit(text) {
        return Array.from(text)
            .map((ch) => {
                const lower = ch.toLowerCase();
                if (!(lower in TRANSLIT_MAP)) return ch;
                const latin = TRANSLIT_MAP[lower];
                return ch !== lower
                    ? latin.charAt(0).toUpperCase() + latin.slice(1)
                    : latin;
            })
            .join('');
    }

    // ── Slug generation ───────────────────────────────────────────────────────

    function slugify(text) {
        return translit(text)
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s-]/gu, '')
            .replace(/\s+/g, '-')
            .replace(/-{2,}/g, '-')
            .replace(/^-|-$/g, '') || 'heading';
    }

    const usedIds = new Set(
        Array.from(document.querySelectorAll('[id]')).map((el) => el.id)
    );

    function uniqueId(base) {
        if (!usedIds.has(base)) { usedIds.add(base); return base; }
        let n = 2;
        while (usedIds.has(`${base}-${n}`)) n++;
        const id = `${base}-${n}`;
        usedIds.add(id);
        return id;
    }

    // ── Hierarchical numbering ────────────────────────────────────────────────

    // counters[0] = current h1 count, counters[1] = h2, …, counters[5] = h6
    const counters = [0, 0, 0, 0, 0, 0];

    /**
     * Increments the counter for `level`, resets all deeper counters,
     * and returns the dot-separated number string (e.g. "2.3.1").
     */
    function nextNumber(level) {
        counters[level - 1]++;
        for (let i = level; i < 6; i++) counters[i] = 0;
        return counters.slice(0, level).join('.');
    }

    // ── Heading helpers ───────────────────────────────────────────────────────

    function isAnchorNode(n) {
        return n.nodeType === Node.ELEMENT_NODE && n.classList.contains('heading-anchor');
    }

    function headingPlainText(el) {
        return Array.from(el.childNodes)
            .filter((n) => !isAnchorNode(n))
            .map((n) => n.textContent)
            .join('')
            .trim();
    }

    /** Deep-clones all heading children except .heading-anchor nodes. */
    function headingContentClone(el) {
        const frag = document.createDocumentFragment();
        el.childNodes.forEach((n) => {
            if (!isAnchorNode(n)) frag.appendChild(n.cloneNode(true));
        });
        return frag;
    }

    // ── Heading processing ────────────────────────────────────────────────────

    /**
     * For a given heading element:
     *  - computes its hierarchical number,
     *  - assigns a unique id and appends a «#» anchor,
     *  - wraps the heading in <ul><li class="header-li"> with the number
     *    set as the list-style-type marker.
     *
     * Returns { level, id, text, contentClone, number } for the ToC builder.
     */
    function processHeading(heading) {
        const level = parseInt(heading.tagName[1], 10);
        const number = nextNumber(level);
        const text = headingPlainText(heading);
        const id = uniqueId(slugify(text));

        heading.id = id;

        // Append «#» anchor
        const anchor = Object.assign(document.createElement('a'), {
            href: `#${id}`,
            className: 'heading-anchor',
            textContent: '#',
        });
        anchor.setAttribute('aria-label', `Link to section "${text}"`);
        heading.appendChild(anchor);

        // Clone rich content after anchor injection so the filter excludes it
        const contentClone = headingContentClone(heading);

        // Wrap: 
        // <h1 class="header-wrapper">
        //      <div class="header-number">1.&nbsp;</div>
        //      <div class="header-content">This is another h1 header</div>
        // </h1>
        const headerNumber = document.createElement('div');
        headerNumber.className = 'header-number';
        headerNumber.innerHTML = `${number}.&nbsp;`;

        const headerContent = document.createElement('div');
        headerContent.className = 'header-content';
        headerContent.innerHTML = heading.innerHTML;

        // Insert wrapper before heading, then move heading inside
        heading.innerHTML = '';
        heading.className = 'header-wrapper';
        heading.appendChild(headerNumber);
        heading.appendChild(headerContent);

        return { level, id, text, contentClone, number };
    }

    const tocEntries = [];

    document.querySelectorAll('article').forEach((container) => {
        container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
            tocEntries.push(processHeading(heading));
        });
    });

    // ── ToC construction ──────────────────────────────────────────────────────

    const tocContainer = document.getElementById('toc');
    if (!tocContainer || tocEntries.length === 0) return;

    // «On this page» title — gets its own anchor but is NOT in the list
    const TOC_TITLE_TEXT = 'Contents';
    const tocTitleId = uniqueId(slugify(TOC_TITLE_TEXT));

    const tocTitleAnchor = Object.assign(document.createElement('a'), {
        href: `#${tocTitleId}`,
        className: 'heading-anchor',
        textContent: '#',
    });
    tocTitleAnchor.setAttribute('aria-label', `Link to section "${TOC_TITLE_TEXT}"`);

    const tocTitle = document.createElement('h1');
    tocTitle.id = tocTitleId;
    tocTitle.appendChild(document.createTextNode(TOC_TITLE_TEXT));
    tocTitle.appendChild(tocTitleAnchor);
    tocContainer.appendChild(tocTitle);

    /**
     * Builds a nested <ul> from flat heading descriptors.
     * Each <li> in the ToC receives list-style-type equal to the heading's
     * hierarchical number, so numbering is rendered as the list marker.
     *
     * Level-stack algorithm — same as before, now also threads `number` through.
     */
    function buildToC(entries) {
        const root = document.createElement('ul');
        const stack = [{ level: 0, ul: root }];

        entries.forEach(({ level, id, number, contentClone }) => {
            while (stack.length > 1 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }

            const a = Object.assign(document.createElement('a'), { href: `#${id}` });
            a.appendChild(contentClone);

            const li = document.createElement('li');
            li.style.listStyleType = `"${number}. "`;
            li.appendChild(a);

            const nestedUl = document.createElement('ul');
            li.appendChild(nestedUl);
            stack[stack.length - 1].ul.appendChild(li);

            stack.push({ level, ul: nestedUl });
        });

        root.querySelectorAll('ul:empty').forEach((el) => el.remove());
        return root;
    }

    tocContainer.appendChild(buildToC(tocEntries));
});