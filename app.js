/* ══════════════════════════════════════════════════
   Recipe Book — app.js
   Requires PapaParse — add to your HTML before this script:
   <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>

   Ingredients and Steps in your Google Sheet should be
   separated by a pipe character: |
   e.g. "Paella rice | 450g Chicken thighs | 6–8 Langoustines"
   ══════════════════════════════════════════════════ */

// ── Elements ──────────────────────────────────────
const searchInput   = document.getElementById('search-input');
const filterBar     = document.getElementById('filter-bar');
const loadingState  = document.getElementById('loading-state');
const errorState    = document.getElementById('error-state');
const errorMsg      = document.getElementById('error-message');
const emptyState    = document.getElementById('empty-state');
const recipeGrid    = document.getElementById('recipe-grid');
const modalOverlay  = document.getElementById('modal-overlay');
const modalClose    = document.getElementById('modal-close');

// ── State ─────────────────────────────────────────
let allRecipes = [];
let activeCategory = 'all';

// ── Init ──────────────────────────────────────────
loadRecipes();

// ── CSV Fetch ─────────────────────────────────────
function getCsvUrl() {
  const id  = CONFIG.SHEET_ID;
  const tab = encodeURIComponent(CONFIG.SHEET_TAB);
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&sheet=${tab}`;
}

async function loadRecipes() {
  showState('loading');
  try {
    const res = await fetch(getCsvUrl());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csv = await res.text();
    allRecipes = parseCsv(csv);
    buildFilters();
    renderGrid(allRecipes);
    showState('grid');
  } catch (err) {
    console.error(err);
    errorMsg.textContent = 'Could not load recipes. Check your Sheet ID and make sure the sheet is published.';
    showState('error');
  }
}

function showState(state) {
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  emptyState.classList.add('hidden');
  recipeGrid.classList.add('hidden');
  filterBar.classList.add('hidden');
  if (state === 'loading')    loadingState.classList.remove('hidden');
  else if (state === 'error') errorState.classList.remove('hidden');
  else if (state === 'empty') emptyState.classList.remove('hidden');
  else if (state === 'grid') {
    recipeGrid.classList.remove('hidden');
    filterBar.classList.remove('hidden');
  }
}

// ── Parser (PapaParse) ────────────────────────────
function parseCsv(text) {
  const result = Papa.parse(text, {
    header: true,
    delimiter: ',',
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase(),
    // No transform — trimming is done per field below
  });

  if (result.errors.length) {
    console.warn('PapaParse warnings:', result.errors);
  }

  return result.data.map(row => ({
    title:       (row['title']       || '').trim() || 'Untitled',
    category:    (row['category']    || '').trim(),
    description: (row['description'] || '').trim(),
    prepTime:    (row['prep time']   || row['prep_time']   || '').trim(),
    cookTime:    (row['cook time']   || row['cook_time']   || '').trim(),
    servings:    (row['servings']    || '').trim(),
    ingredients: splitPipes(row['ingredients'] || ''),
    steps:       parsePipeSteps(row['steps']   || ''),
    notes:       (row['notes']       || '').trim(),
    imageUrl:    (row['image url']   || row['image_url']   || '').trim(),
    emoji:       (row['emoji']       || '').trim() || '🍽️',
  }));
}

// Split on pipe | character — use this as separator in your sheet
function splitPipes(str) {
  return str
    .split('|')
    .map(s => s.replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean);
}

function parsePipeSteps(str) {
  return str
    .split('|')
    .map(s => s.replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean)
    .map(l => l.replace(/^\d+[\.\)]\s*/, '')); // strip leading numbers if present
}

// ── Filters ───────────────────────────────────────
function buildFilters() {
  const categories = [...new Set(allRecipes.map(r => r.category).filter(Boolean))].sort();
  filterBar.innerHTML = '';
  filterBar.appendChild(makeFilterPill('All', 'all'));
  categories.forEach(cat => filterBar.appendChild(makeFilterPill(cat, cat)));
  filterBar.addEventListener('click', e => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    filterBar.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeCategory = pill.dataset.category;
    applyFilters();
  });
}

function makeFilterPill(label, value) {
  const btn = document.createElement('button');
  btn.className = 'filter-pill' + (value === 'all' ? ' active' : '');
  btn.dataset.category = value;
  btn.textContent = label;
  return btn;
}

// ── Search ────────────────────────────────────────
searchInput.addEventListener('input', applyFilters);

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  let results = allRecipes;
  if (activeCategory !== 'all') {
    results = results.filter(r => r.category === activeCategory);
  }
  if (query) {
    results = results.filter(r =>
      r.title.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      r.category.toLowerCase().includes(query) ||
      r.ingredients.some(i => i.toLowerCase().includes(query))
    );
  }
  renderGrid(results);
  showState(results.length === 0 ? 'empty' : 'grid');
}

// ── Grid Render ───────────────────────────────────
function renderGrid(recipes) {
  recipeGrid.innerHTML = '';
  recipes.forEach((recipe, i) => {
    const card = buildCard(recipe);
    card.style.animationDelay = `${Math.min(i * 0.05, 0.5)}s`;
    recipeGrid.appendChild(card);
  });
}

function buildCard(recipe) {
  const card = document.createElement('div');
  card.className = 'recipe-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `View recipe: ${recipe.title}`);

  const heroHtml = recipe.imageUrl
    ? `<img src="${escHtml(recipe.imageUrl)}" alt="${escHtml(recipe.title)}" loading="lazy" />`
    : `<span class="card-hero-emoji">${recipe.emoji}</span>`;

  const metaParts = [];
  if (recipe.prepTime) metaParts.push(`<span><span class="meta-dot"></span>${recipe.prepTime} prep</span>`);
  if (recipe.cookTime) metaParts.push(`<span><span class="meta-dot"></span>${recipe.cookTime} cook</span>`);
  if (recipe.servings) metaParts.push(`<span><span class="meta-dot"></span>Serves ${recipe.servings}</span>`);

  card.innerHTML = `
    <div class="card-hero">${heroHtml}</div>
    <div class="card-body">
      ${recipe.category ? `<div class="card-category">${escHtml(recipe.category)}</div>` : ''}
      <h2 class="card-title">${escHtml(recipe.title)}</h2>
      ${recipe.description ? `<p class="card-desc">${escHtml(recipe.description)}</p>` : ''}
      ${metaParts.length ? `<div class="card-meta">${metaParts.join('')}</div>` : ''}
    </div>
  `;

  card.addEventListener('click', () => openModal(recipe));
  card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(recipe); });
  return card;
}

// ── Modal ─────────────────────────────────────────
function openModal(recipe) {
  const hero      = document.getElementById('modal-hero');
  const emoji     = document.getElementById('modal-emoji');
  const catTag    = document.getElementById('modal-category');
  const title     = document.getElementById('modal-title');
  const desc      = document.getElementById('modal-description');
  const prep      = document.getElementById('modal-prep');
  const cook      = document.getElementById('modal-cook');
  const servings  = document.getElementById('modal-servings');
  const ingList   = document.getElementById('modal-ingredients');
  const stepList  = document.getElementById('modal-steps');
  const notesWrap = document.getElementById('modal-notes-wrap');
  const notesP    = document.getElementById('modal-notes');

  hero.querySelectorAll('img').forEach(el => el.remove());
  if (recipe.imageUrl) {
    const img = document.createElement('img');
    img.src = recipe.imageUrl;
    img.alt = recipe.title;
    emoji.style.display = 'none';
    hero.appendChild(img);
  } else {
    emoji.style.display = '';
    emoji.textContent = recipe.emoji;
  }

  catTag.textContent   = recipe.category;
  title.textContent    = recipe.title;
  desc.textContent     = recipe.description;
  prep.textContent     = recipe.prepTime || '—';
  cook.textContent     = recipe.cookTime || '—';
  servings.textContent = recipe.servings || '—';

  ingList.innerHTML  = recipe.ingredients.length
    ? recipe.ingredients.map(i => `<li>${escHtml(i)}</li>`).join('')
    : '<li>No ingredients listed.</li>';

  stepList.innerHTML = recipe.steps.length
    ? recipe.steps.map(s => `<li>${escHtml(s)}</li>`).join('')
    : '<li>No method listed.</li>';

  if (recipe.notes) {
    notesP.textContent = recipe.notes;
    notesWrap.classList.remove('hidden');
  } else {
    notesWrap.classList.add('hidden');
  }

  modalOverlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  modalClose.focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ── Util ──────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}
