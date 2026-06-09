// ─────────────────────────────────────────────
// Načtení seznamu článků z lokálního JSON souboru
// ─────────────────────────────────────────────
let lokalniClanky = [];

async function loadBlog() {
    const grid = document.getElementById('blog-grid');
    if (!grid) return;
    grid.innerHTML = '';

    try {
        // Stáhneme vygenerovaný JSON soubor, který Netlify bezpečně připravilo
        const response = await fetch('/clanky.json');
        if (!response.ok) throw new Error();
        
        lokalniClanky = await response.json();

        if (lokalniClanky.length === 0) {
            grid.innerHTML = `<p class="text-slate-500 col-span-full text-center py-12">Zatím jsme nenapsali žádný článek.</p>`;
            return;
        }

        // Vykreslíme karty pro všechny články
        lokalniClanky.forEach(clanek => {
            renderCard(clanek);
        });

    } catch (error) {
        console.error("Kritická chyba při načítání blogu:", error);
        grid.innerHTML = `<p class="text-slate-500 col-span-full text-center py-12">Nepodařilo se načíst články. Zkuste obnovit stránku.</p>`;
    }
}

// Pomocné funkce pro parsování frontmatteru z textu
function splitFrontmatter(rawText) {
    const text = rawText.replace(/\r\n/g, '\n');
    const delimiter = /^---\s*$/m;
    const first = text.search(delimiter);
    if (first === -1) return { meta: '', body: text };
    const afterFirst = text.indexOf('\n', first) + 1;
    const second = text.slice(afterFirst).search(delimiter);
    if (second === -1) return { meta: '', body: text };
    const metaEnd = afterFirst + second;
    const meta = text.slice(afterFirst, metaEnd);
    const body = text.slice(text.indexOf('\n', metaEnd) + 1);
    return { meta, body };
}

function parseFrontmatterLine(line) {
    const trimmed = line.trim();
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) return { key: null, value: null };
    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();
    value = value.replace(/^["']|["']$/g, '');
    return { key, value };
}

// ─────────────────────────────────────────────
// Vykreslení jedné karty
// ─────────────────────────────────────────────
function renderCard(clanek) {
    const grid = document.getElementById('blog-grid');
    
    const { meta } = splitFrontmatter(clanek.obsah);
    const metadataLines = meta.split('\n');

    let title = 'Bez názvu';
    let description = '';
    let image = 'public/hero3.jpg';
    let dateRaw = '';

    metadataLines.forEach(line => {
        const { key, value } = parseFrontmatterLine(line);
        if (!key) return;
        if (key === 'title') title = value || 'Bez názvu';
        else if (key === 'description') description = value || '';
        else if (key === 'image') image = value || '';
        else if (key === 'date') dateRaw = value || '';
    });

    if (!image || image === 'undefined') image = 'public/hero3.jpg';

    const date = dateRaw
        ? new Date(dateRaw).toLocaleDateString('cs-CZ')
        : new Date().toLocaleDateString('cs-CZ');

    const safeTitle = title.replace(/"/g, '&quot;').replace(/</g, '&lt;');

    const card = document.createElement('div');
    card.className = "group bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:border-blue-600/50 hover:bg-white transition-all duration-300 flex flex-col justify-between shadow-md hover:shadow-xl hover:-translate-y-1 transform";
    card.innerHTML = `
        <div>
            <div class="relative aspect-video overflow-hidden bg-slate-200">
                <img src="${image}" alt="${safeTitle}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='public/hero3.jpg'">
            </div>
            <div class="p-6">
                <div class="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">${date}</div>
                <h3 class="text-xl font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors duration-200 line-clamp-2">${safeTitle}</h3>
                <p class="text-slate-600 text-sm mt-3 leading-relaxed line-clamp-3">${description}</p>
            </div>
        </div>
        <div class="p-6 pt-0">
            <button data-slug="${clanek.slug}" class="btn-read-article inline-flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider group-hover:text-blue-600 transition-colors duration-200 cursor-pointer bg-transparent border-0 p-0">
                Číst článek <svg class="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
            </button>
        </div>
    `;

    card.querySelector('.btn-read-article').addEventListener('click', function() {
        openArticle(this.dataset.slug);
    });

    grid.appendChild(card);
}

// ─────────────────────────────────────────────
// Otevření článku v modalu
// ─────────────────────────────────────────────
function openArticle(slug) {
    const modal = document.getElementById('article-modal');
    const content = document.getElementById('modal-content');

    const clanek = lokalniClanky.find(c => c.slug === slug);
    if (!clanek) return;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const { body } = splitFrontmatter(clanek.obsah);
    content.innerHTML = marked.parse(body);
}

function closeModal() {
    document.getElementById('article-modal').classList.add('hidden');
    document.body.style.overflow = '';
}

function handleModalBackdropClick(event) {
    if (event.target === document.getElementById('article-modal')) {
        closeModal();
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
});

document.addEventListener('DOMContentLoaded', loadBlog);