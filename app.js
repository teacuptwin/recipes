// ─────────────────────────────────────────────
//  RECIPE APP — main logic
// ─────────────────────────────────────────────

(function () {

  // ── Column mapping (must match your Google Sheet headers exactly) ──
  const COL = {
    title:       "Title",
    category:    "Category",
    description: "Description",
    prepTime:    "Prep Time",
    cookTime:    "Cook Time",
    servings:    "Servings",
    ingredients: "Ingredients",
    steps:       "Steps",
    notes:       "Notes",
    imageUrl:    "Image URL",
    emoji:       "Emoji",
  };

  // ── State ──
  let allRecipes = [];

  // ── DOM refs ──
  const lockScreen   = document.getElementById('lock-screen');
  const app          = document.getElementById('app');
  const pwInput      = document.getElementById('password-input');
  const unlockBtn    = document.getElementById('unlock-btn');
  const pwError      = document.getElementById('pw-error');
  const searchInput  = document.getElementById('search');
  const filterCat    = document.getElementById('filter-category');
  const grid         = document.getElementById('recipe-grid');
  const loading      = document.getElementById('loading');
  const errorMsg     = document.getElementById('error-msg');
  const emptyMsg     = document.getElementById('empty-msg');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalClose   = document.getElementById('modal-close');
  const modalContent = document.getElementById('modal-content');

  // ─────────────────────────────────────────────
  //  AUTH
  // ─────────────────────────────────────────────

  // Check if already unlocked this session
  if (sessionStorage.getItem('recipe_unlocked') === 'true') {
    unlock();
  }

  unlockBtn.addEventListener('click', attemptUnlock);
  pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') attemptUnlock(); });

  function attemptUnlock() {
    if (pwInput.value === CONFIG.PASSWORD) {
      sessionStorage.setItem('recipe_unlocked', 'true');
      unlock();
    } else {
      pwError.classList.remove('hidden');
      pwInput.value = '';
      pwInput.focus();
    }
  }

  function unlock() {
    lockScreen.classList.add('hidden');
    app.classList.remove('hidden');
    loadRecipes();
  }

  // ─────────────────────────────────────────────
  //  DATA — Google Sheets CSV
  // ─────────────────────────────────────────────

  async function loadRecipes() {
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.SHEET_TAB)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network error');
      const csv = await res.text();
      allRecipes = parseCSV(csv);
      renderAll();
    } catch (err) {
      loading.classList.add('hidden');
      errorMsg.classList.remove('hidden');
      console.error('Failed to load sheet:', err);
    }
  }

  // Minimal CSV parser that handles quoted fields (including multi-line)
  function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuote = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuote) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') { inQuote = false; }
        else { field += ch; }
      } else {
        if (ch === '"') { inQuote = true; }
        else if (ch === ',') { row.push(field); field = ''; }
        else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (ch === '\r') { /* skip */ }
        else { field += ch; }
      }
    }
    if (field || row.length) { row.push(field); rows.push(row); }

    if (rows.length < 2) return [];

    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
      return obj;
    }).filter(r => r[COL.title]); // skip blank rows
  }

  // ─────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────

  function renderAll() {
    loading.classList.add('hidden');

    // Populate category filter
    const cats = [...new Set(allRecipes.map(r => r[COL.category]).filter(Boolean))].sort();
    cats.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      filterCat.appendChild(opt);
    });

    renderFiltered();
  }

  function renderFiltered() {
    const query = searchInput.value.toLowerCase();
    const cat   = filterCat.value;

    const filtered = allRecipes.filter(r => {
      const matchSearch = !query ||
        (r[COL.title] || '').toLowerCase().includes(query) ||
        (r[COL.description] || '').toLowerCase().includes(query) ||
        (r[COL.ingredients] || '').toLowerCase().includes(query);
      const matchCat = !cat || r[COL.category] === cat;
      return matchSearch && matchCat;
    });

    grid.innerHTML = '';

    if (filtered.length === 0) {
      emptyMsg.classList.remove('hidden');
      grid.classList.add('hidden');
      return;
    }

    emptyMsg.classList.add('hidden');
    grid.classList.remove('hidden');

    filtered.forEach(recipe => {
      grid.appendChild(buildCard(recipe));
    });
  }

  function buildCard(r) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.innerHTML = `
      <div class="recipe-card-img">
        ${r[COL.imageUrl]
          ? `<img src="${esc(r[COL.imageUrl])}" alt="${esc(r[COL.title])}" loading="lazy" onerror="this.parentElement.innerHTML='${r[COL.emoji] || '🍽️'}'" />`
          : r[COL.emoji] || '🍽️'}
      </div>
      <div class="recipe-card-body">
        ${r[COL.category] ? `<span class="recipe-card-category">${esc(r[COL.category])}</span>` : ''}
        <div class="recipe-card-title">${esc(r[COL.title])}</div>
        ${r[COL.description] ? `<div class="recipe-card-desc">${esc(r[COL.description])}</div>` : ''}
        <div class="recipe-card-meta">
          ${r[COL.prepTime] ? `<span>⏱ ${esc(r[COL.prepTime])}</span>` : ''}
          ${r[COL.servings] ? `<span>🍽 ${esc(r[COL.servings])}</span>` : ''}
        </div>
      </div>
    `;
    card.addEventListener('click', () => openModal(r));
    return card;
  }

  // ─────────────────────────────────────────────
  //  MODAL
  // ─────────────────────────────────────────────

  function openModal(r) {
    const ingredients = r[COL.ingredients]
      ? r[COL.ingredients].split(/\n|;/).map(s => s.trim()).filter(Boolean)
      : [];

    const steps = r[COL.steps]
      ? r[COL.steps].split(/\n|\d+\.\s+/).map(s => s.trim()).filter(Boolean)
      : [];

    modalContent.innerHTML = `
      ${r[COL.category] ? `<span class="modal-category">${esc(r[COL.category])}</span>` : ''}
      <h2 class="modal-title">${esc(r[COL.title])}</h2>
      ${r[COL.description] ? `<p class="modal-desc">${esc(r[COL.description])}</p>` : ''}

      <div class="modal-meta">
        ${r[COL.prepTime]  ? `<div class="modal-meta-item"><span class="modal-meta-label">Prep</span><span class="modal-meta-value">⏱ ${esc(r[COL.prepTime])}</span></div>` : ''}
        ${r[COL.cookTime]  ? `<div class="modal-meta-item"><span class="modal-meta-label">Cook</span><span class="modal-meta-value">🔥 ${esc(r[COL.cookTime])}</span></div>` : ''}
        ${r[COL.servings]  ? `<div class="modal-meta-item"><span class="modal-meta-label">Serves</span><span class="modal-meta-value">🍽 ${esc(r[COL.servings])}</span></div>` : ''}
      </div>

      ${r[COL.imageUrl] ? `<img class="modal-img" src="${esc(r[COL.imageUrl])}" alt="${esc(r[COL.title])}" loading="lazy" />` : ''}

      ${ingredients.length ? `
        <h3 class="modal-section-title">Ingredients</h3>
        <ul class="ingredients-list">
          ${ingredients.map(i => `<li>${esc(i)}</li>`).join('')}
        </ul>
      ` : ''}

      ${steps.length ? `
        <h3 class="modal-section-title">Method</h3>
        <ol class="steps-list">
          ${steps.map((s, idx) => `
            <li>
              <span class="step-num">${idx + 1}</span>
              <span>${esc(s)}</span>
            </li>
          `).join('')}
        </ol>
      ` : ''}

      ${r[COL.notes] ? `
        <div class="modal-notes">
          <strong>💡 Notes</strong>
          ${esc(r[COL.notes])}
        </div>
      ` : ''}
    `;

    modalOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modalOverlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // ─────────────────────────────────────────────
  //  SEARCH & FILTER
  // ─────────────────────────────────────────────

  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderFiltered, 200);
  });

  filterCat.addEventListener('change', renderFiltered);

  // ─────────────────────────────────────────────
  //  UTILS
  // ─────────────────────────────────────────────

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
