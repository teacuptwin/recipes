const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(CONFIG.SHEET_TAB)}`;

let recipes = [];
let filteredRecipes = [];

// DOM elements
const appScreen = document.getElementById('app-screen');
const recipeGrid = document.getElementById('recipe-grid');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const emptyState = document.getElementById('empty-state');
const errorMessage = document.getElementById('error-message');
const searchInput = document.getElementById('search-input');
const filterBar = document.getElementById('filter-bar');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');

// Fetch & parse CSV
async function fetchRecipes() {
  try {
    showLoadingState();
    
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const csv = await response.text();
    recipes = parseCSV(csv);
    
    if (recipes.length === 0) {
      showEmptyState();
      return;
    }
    
    filteredRecipes = [...recipes];
    renderRecipes();
    renderFilters();
    hideLoadingState();
  } catch (error) {
    console.error('Error fetching recipes:', error);
    showErrorState(`Failed to load recipes. Check console.`);
  }
}

// Parse CSV
function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = parseCSVLine(lines[0]);
  const recipes = [];
  
  const headerMap = {
    title: headers.indexOf('Title'),
    category: headers.indexOf('Category'),
    description: headers.indexOf('Description'),
    prepTime: headers.indexOf('Prep Time'),
    cookTime: headers.indexOf('Cook Time'),
    servings: headers.indexOf('Servings'),
    ingredients: headers.indexOf('Ingredients'),
    steps: headers.indexOf('Steps'),
    notes: headers.indexOf('Notes'),
    imageUrl: headers.indexOf('Image URL'),
    emoji: headers.indexOf('Emoji'),
  };
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (!values[headerMap.title]) continue; // Skip empty rows
    
    recipes.push({
      title: values[headerMap.title] || '',
      category: values[headerMap.category] || 'Other',
      description: values[headerMap.description] || '',
      prepTime: values[headerMap.prepTime] || '—',
      cookTime: values[headerMap.cookTime] || '—',
      servings: values[headerMap.servings] || '—',
      ingredients: parseList(values[headerMap.ingredients] || ''),
      steps: parseList(values[headerMap.steps] || ''),
      notes: values[headerMap.notes] || '',
      imageUrl: values[headerMap.imageUrl] || '',
      emoji: values[headerMap.emoji] || '🍴',
    });
  }
  
  return recipes;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseList(text) {
  if (!text) return [];
  
  // Check if numbered (1. 2. 3.)
  if (/^\d+\./.test(text)) {
    return text.split(/\n|;/).map(item => item.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
  }
  
  // Otherwise split by newline or semicolon
  return text.split(/\n|;/).map(item => item.trim()).filter(Boolean);
}

// Render recipes
function renderRecipes() {
  recipeGrid.innerHTML = '';
  
  filteredRecipes.forEach((recipe, index) => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    let heroHTML;
    if (recipe.imageUrl) {
      heroHTML = `<img src="${recipe.imageUrl}" alt="${recipe.title}" />`;
    } else {
      heroHTML = `<div class="card-hero-emoji">${recipe.emoji}</div>`;
    }
    
    card.innerHTML = `
      <div class="card-hero">
        ${heroHTML}
      </div>
      <div class="card-body">
        <div class="card-category">${recipe.category}</div>
        <h3 class="card-title">${recipe.title}</h3>
        <p class="card-desc">${recipe.description}</p>
        <div class="card-meta">
          <span>⏱ ${recipe.prepTime}</span>
          <span class="meta-dot"></span>
          <span>🔥 ${recipe.cookTime}</span>
          <span class="meta-dot"></span>
          <span>🍽 ${recipe.servings}</span>
        </div>
      </div>
    `;
    
    card.addEventListener('click', () => showRecipeModal(index));
    recipeGrid.appendChild(card);
  });
  
  recipeGrid.classList.remove('hidden');
}

// Render filters
function renderFilters() {
  const categories = ['all', ...new Set(recipes.map(r => r.category))];
  filterBar.innerHTML = '';
  filterBar.classList.remove('hidden');
  
  categories.forEach(category => {
    const button = document.createElement('button');
    button.className = `filter-pill ${category === 'all' ? 'active' : ''}`;
    button.dataset.category = category;
    button.textContent = category === 'all' ? 'All' : category;
    button.addEventListener('click', () => filterByCategory(category, button));
    filterBar.appendChild(button);
  });
}

function filterByCategory(category, button) {
  document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  
  if (category === 'all') {
    filteredRecipes = [...recipes];
  } else {
    filteredRecipes = recipes.filter(r => r.category === category);
  }
  
  renderRecipes();
}

// Search
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  
  filteredRecipes = recipes.filter(recipe => 
    recipe.title.toLowerCase().includes(query) ||
    recipe.description.toLowerCase().includes(query) ||
    recipe.category.toLowerCase().includes(query)
  );
  
  renderRecipes();
  
  // Reset filters
  document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
  document.querySelector('[data-category="all"]').classList.add('active');
});

// Modal
function showRecipeModal(index) {
  const recipe = filteredRecipes[index];
  
  document.getElementById('modal-title').textContent = recipe.title;
  document.getElementById('modal-category').textContent = recipe.category;
  document.getElementById('modal-description').textContent = recipe.description;
  document.getElementById('modal-prep').textContent = recipe.prepTime;
  document.getElementById('modal-cook').textContent = recipe.cookTime;
  document.getElementById('modal-servings').textContent = recipe.servings;
  
  // Ingredients
  const ingredientsList = document.getElementById('modal-ingredients');
  ingredientsList.innerHTML = recipe.ingredients.map(ing => `<li>${ing}</li>`).join('');
  
  // Steps
  const stepsList = document.getElementById('modal-steps');
  stepsList.innerHTML = recipe.steps.map(step => `<li>${step}</li>`).join('');
  
  // Notes
  const notesWrap = document.getElementById('modal-notes-wrap');
  if (recipe.notes) {
    document.getElementById('modal-notes').textContent = recipe.notes;
    notesWrap.classList.remove('hidden');
  } else {
    notesWrap.classList.add('hidden');
  }
  
  // Hero section
  const modalHero = document.getElementById('modal-hero');
  const modalEmoji = document.getElementById('modal-emoji');
  
  if (recipe.imageUrl) {
    modalHero.style.backgroundImage = `url('${recipe.imageUrl}')`;
    modalEmoji.style.display = 'none';
    modalHero.innerHTML = `<img src="${recipe.imageUrl}" alt="${recipe.title}" />`;
  } else {
    modalHero.style.backgroundImage = 'none';
    modalHero.innerHTML = '';
    modalEmoji.textContent = recipe.emoji;
    modalEmoji.style.display = 'block';
    modalHero.appendChild(modalEmoji);
  }
  
  modalOverlay.classList.remove('hidden');
}

modalClose.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.classList.add('hidden');
  }
});

// UI States
function showLoadingState() {
  loadingState.classList.remove('hidden');
  errorState.classList.add('hidden');
  emptyState.classList.add('hidden');
  recipeGrid.classList.add('hidden');
}

function hideLoadingState() {
  loadingState.classList.add('hidden');
}

function showErrorState(message) {
  errorMessage.textContent = message;
  errorState.classList.remove('hidden');
  loadingState.classList.add('hidden');
  emptyState.classList.add('hidden');
  recipeGrid.classList.add('hidden');
}

function showEmptyState() {
  emptyState.classList.remove('hidden');
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
  recipeGrid.classList.add('hidden');
}

// Init
fetchRecipes();
