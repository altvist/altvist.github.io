/**
 * toc.js
 *
 * On DOMContentLoaded:
 *  1. Finds all article elements.
 *  2. Inside each, finds all h1–h6 headings.
 *  3. Assigns a unique human-readable id to each heading (with Cyrillic
 *     transliteration) and appends a clickable «#» anchor at the end.
 *  4. If a div#toc exists — prepends an «Contents» h1 (with its own
 *     anchor) and builds a hierarchical ToC, preserving rich content
 *     (e.g. <code>, KaTeX spans) inside ToC links.
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
                // Preserve original capitalisation on the first output character
                return ch !== lower
                    ? latin.charAt(0).toUpperCase() + latin.slice(1)
                    : latin;
            })
            .join('');
    }

    // ── Slug generation ───────────────────────────────────────────────────────

    /** Converts arbitrary text to a URL-friendly ASCII slug. */
    function slugify(text) {
        return translit(text)
            .trim()
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s-]/gu, '') // strip punctuation / special chars
            .replace(/\s+/g, '-')
            .replace(/-{2,}/g, '-')
            .replace(/^-|-$/g, '') || 'heading';
    }

    /** Returns a document-unique id; appends -2, -3, … on collision. */
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

    // ── Heading helpers ───────────────────────────────────────────────────────

    /** Plain-text content of a heading, skipping injected .heading-anchor nodes. */
    function headingPlainText(el) {
        return Array.from(el.childNodes)
            .filter((n) => !isAnchorNode(n))
            .map((n) => n.textContent)
            .join('')
            .trim();
    }

    /**
     * Deep-clones all heading children except .heading-anchor nodes into a
     * DocumentFragment — preserves <code>, KaTeX spans, etc. for ToC links.
     */
    function headingContentClone(el) {
        const frag = document.createDocumentFragment();
        el.childNodes.forEach((n) => {
            if (!isAnchorNode(n)) frag.appendChild(n.cloneNode(true));
        });
        return frag;
    }

    function isAnchorNode(n) {
        return n.nodeType === Node.ELEMENT_NODE && n.classList.contains('heading-anchor');
    }

    // ── Heading processing ────────────────────────────────────────────────────

    /**
     * Assigns a unique id to a heading and appends a «#» anchor.
     * Returns { id, text, contentClone } for the ToC builder.
     */
    function processHeading(heading) {
        const text = headingPlainText(heading);
        const id = uniqueId(slugify(text));

        heading.id = id;

        const anchor = Object.assign(document.createElement('a'), {
            href: `#${id}`,
            className: 'heading-anchor',
            textContent: '#',
        });
        anchor.setAttribute('aria-label', `Link to section "${text}"`);
        heading.appendChild(anchor);

        // Clone rich content *after* the anchor has been added so the filter
        // in headingContentClone() correctly excludes it.
        return { id, text, contentClone: headingContentClone(heading) };
    }

    // Flat ordered list of all processed headings — fed into the ToC builder
    const tocEntries = [];

    document.querySelectorAll('article').forEach((container) => {
        container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
            const entry = processHeading(heading);
            tocEntries.push({ level: parseInt(heading.tagName[1], 10), ...entry });
        });
    });

    // ── ToC construction ──────────────────────────────────────────────────────

    const tocContainer = document.getElementById('toc');
    if (!tocContainer || tocEntries.length === 0) return;

    // --- «On this page» title heading ----------------------------------------
    // Gets its own anchor and id, but is NOT listed inside the ToC itself.

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

    // --- Nested list ----------------------------------------------------------

    /**
     * Builds a nested <ul> from flat heading descriptors.
     *
     * Level-stack algorithm:
     *   stack[i] = { level, ul }
     *   For each entry, pop until the top has a strictly lower level (= ancestor),
     *   append a new <li> carrying a rich-content link, then push a nested <ul>
     *   for potential children. Empty <ul> nodes are removed at the end.
     */
    function buildToC(entries) {
        const root = document.createElement('ul');
        const stack = [{ level: 0, ul: root }];

        entries.forEach(({ level, id, contentClone }) => {
            while (stack.length > 1 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }

            const a = Object.assign(document.createElement('a'), { href: `#${id}` });
            a.appendChild(contentClone); // preserves <code>, KaTeX, etc.

            const li = document.createElement('li');
            const nestedUl = document.createElement('ul');
            li.appendChild(a);
            li.appendChild(nestedUl);
            stack[stack.length - 1].ul.appendChild(li);

            stack.push({ level, ul: nestedUl });
        });

        root.querySelectorAll('ul:empty').forEach((el) => el.remove());
        return root;
    }

    tocContainer.appendChild(buildToC(tocEntries));
});