// import { createIcons, icons } from 'lucide';
const { createIcons, icons } = lucide;

// State
let notes = JSON.parse(localStorage.getItem('cyberVaultNotes')) || [];

// DOM Elements
const form = document.getElementById('note-form');
const notesGrid = document.getElementById('notes-grid');
const searchInput = document.getElementById('search-input');
const datalist = document.getElementById('existing-categories');
const modal = document.getElementById('form-modal');
const toggleBtn = document.getElementById('toggle-form-btn');
const closeBtn = document.getElementById('close-modal-btn');
const categoryBtns = document.querySelectorAll('.category-btn');
const navTabs = document.querySelectorAll('.nav-tab');

let selectedSection = 'video_booth';
let currentTab = 'video_booth';

// Initialize Icons
const initIcons = () => createIcons({ icons });

// Modal Logic
toggleBtn.addEventListener('click', () => {
  modal.classList.remove('hidden');
});

closeBtn.addEventListener('click', () => {
  modal.classList.add('hidden');
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('hidden');
});

// Save Data
const saveNotes = () => {
  localStorage.setItem('cyberVaultNotes', JSON.stringify(notes));
  updateDatalist();
};

// Autocomplete
const updateDatalist = () => {
  const categories = [...new Set(notes.map(n => n.category))];
  datalist.innerHTML = categories.map(cat => `<option value="${cat}">`).join('');
};

// Category/Section Selection
categoryBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    categoryBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedSection = btn.dataset.category;
  });
});

// Tab Navigation
navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    navTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    renderNotes(searchInput.value);
  });
});

// Render Cards
const renderNotes = (filterText = '') => {
  notesGrid.innerHTML = '';

  const filtered = notes.filter(note => {
    // Filter by Tab/Section
    const noteSection = note.section || 'video_booth';
    if (noteSection !== currentTab) return false;

    const text = filterText.toLowerCase();
    return note.title.toLowerCase().includes(text) ||
      note.category.toLowerCase().includes(text);
  });

  if (filtered.length === 0) {
    notesGrid.innerHTML = `
      <div style="text-align: center; opacity: 0.5; padding: 3rem; font-family: var(--font-serif); color: var(--text-gold);">
        NO DATA IN ${currentTab.toUpperCase().replace('_', ' ')}
      </div>
    `;
    return;
  }

  filtered.forEach(note => {
    const card = document.createElement('div');
    card.className = 'glass-card';

    // Determine Status Styling
    let statusIconClass = 'icon-status-process';
    let statusIconName = 'loader'; // Default

    if (note.status === 'complete') {
      statusIconClass = 'icon-status-complete';
      statusIconName = 'check-circle';
    } else if (note.status === 'cancel') {
      statusIconClass = 'icon-status-cancel';
      statusIconName = 'x-circle';
    }

    // Link HTML
    const linkHtml = note.link ? `
      <div class="link-row">
        <div class="icon-circle icon-video">
          <i data-lucide="video"></i>
        </div>
        <a href="${note.link}" target="_blank" class="link-text">${note.link}</a>
      </div>
    ` : '';

    card.innerHTML = `
      <button class="delete-btn" data-id="${note.id}"><i data-lucide="x"></i></button>
      
      <div class="card-main-row">
        <!-- Title -->
        <div class="info-item">
          <div class="icon-circle icon-bulb">
            <i data-lucide="lightbulb"></i>
          </div>
          <span class="info-text">${note.title}</span>
        </div>

        <!-- Category/Author -->
        <div class="info-item">
          <div class="icon-circle icon-user">
            <i data-lucide="user"></i>
          </div>
          <span class="info-sub">${note.category}</span>
        </div>

        <!-- Status (Editable) -->
        <div class="info-item">
          <div class="icon-circle ${statusIconClass}">
            <i data-lucide="${statusIconName}"></i>
          </div>
          <select class="status-select" data-id="${note.id}">
            <option value="process" ${note.status === 'process' ? 'selected' : ''}>PROCESS</option>
            <option value="complete" ${note.status === 'complete' ? 'selected' : ''}>COMPLETE</option>
            <option value="cancel" ${note.status === 'cancel' ? 'selected' : ''}>CANCEL</option>
          </select>
        </div>
      </div>

      ${note.content ? `<p style="color: #ddd; font-size: 0.9rem; margin-top: 0.5rem; line-height: 1.5; font-family: var(--font-sans);">${note.content}</p>` : ''}

      ${linkHtml}
    `;

    notesGrid.appendChild(card);
  });

  initIcons();
};

// Form Submit
form.addEventListener('submit', (e) => {
  e.preventDefault();

  const category = document.getElementById('note-category').value.trim();
  const title = document.getElementById('note-title').value.trim();
  const content = document.getElementById('note-content').value.trim();
  const link = document.getElementById('note-link').value.trim();
  const status = document.querySelector('input[name="status"]:checked').value;

  if (!category || !title) return;

  const newNote = {
    id: Date.now().toString(),
    category,
    title,
    content,
    link,
    status,
    status,
    section: selectedSection,
    createdAt: new Date().toISOString()
  };

  notes.unshift(newNote);
  saveNotes();
  renderNotes(searchInput.value);

  // Close Modal & Reset
  modal.classList.add('hidden');
  form.reset();

  // Update Tab if needed
  if (currentTab !== selectedSection) {
    currentTab = selectedSection;
    navTabs.forEach(t => {
      if (t.dataset.tab === currentTab) t.classList.add('active');
      else t.classList.remove('active');
    });
  }

  // Convert underscores to spaces for display might be nice, but we use keys
  renderNotes(searchInput.value);

  // Reset defaults
  selectedSection = 'video_booth';
  categoryBtns.forEach(b => b.classList.remove('active'));
  categoryBtns[0].classList.add('active');
});

// Event Delegation for Delete and Status Change
notesGrid.addEventListener('click', (e) => {
  // Delete
  const btn = e.target.closest('.delete-btn');
  if (btn) {
    if (confirm('DELETE THIS ENTRY?')) {
      notes = notes.filter(n => n.id !== btn.dataset.id);
      saveNotes();
      renderNotes(searchInput.value);
    }
  }
});

notesGrid.addEventListener('change', (e) => {
  // Status Change
  if (e.target.classList.contains('status-select')) {
    const id = e.target.dataset.id;
    const newStatus = e.target.value;
    const note = notes.find(n => n.id === id);
    if (note) {
      note.status = newStatus;
      saveNotes();
      renderNotes(searchInput.value); // Re-render to update icon color
    }
  }
});

// Search Listener
searchInput.addEventListener('input', (e) => {
  renderNotes(e.target.value);
});

// Init
document.addEventListener('DOMContentLoaded', () => {
  updateDatalist();
  renderNotes();
});
