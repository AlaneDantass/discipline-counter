// ============================================================
//  CONFIGURAÇÃO PADRÃO (usada ao criar a primeira disciplina)
// ============================================================
const DEFAULT_DISCIPLINE = {
  name: 'Cálculo II',
  semester: 'Semestre 2026.1',
  startDate: '2026-03-02',
  endDate: '2026-07-18',
};
// ============================================================

const STORAGE_KEY_DISCIPLINES = 'discipline-counter-disciplines';
const STORAGE_KEY_MANUAL      = 'discipline-counter-manual-days';

// --- Helpers -------------------------------------------------

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function daysBetween(a, b) {
  const msPerDay = 86400000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / msPerDay);
}

function formatDateBR(date) {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// --- Data persistence ----------------------------------------

function loadDisciplines() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISCIPLINES);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }

  // First run — create a default entry
  const initial = [{ id: uid(), ...DEFAULT_DISCIPLINE, manualDays: [] }];
  saveDisciplines(initial);
  return initial;
}

function saveDisciplines(list) {
  localStorage.setItem(STORAGE_KEY_DISCIPLINES, JSON.stringify(list));
}

// Migrate old manual-days from v1 (single discipline) into the first discipline
function migrateOldData(disciplines) {
  try {
    const old = localStorage.getItem(STORAGE_KEY_MANUAL);
    if (old && disciplines.length > 0) {
      const parsed = JSON.parse(old);
      if (Array.isArray(parsed) && parsed.length > 0) {
        disciplines[0].manualDays = [
          ...new Set([...(disciplines[0].manualDays || []), ...parsed]),
        ];
        saveDisciplines(disciplines);
      }
      localStorage.removeItem(STORAGE_KEY_MANUAL);
    }
  } catch { /* ignore */ }
}

// --- Rendering -----------------------------------------------

const ICONS = ['📚', '📐', '🧪', '💻', '📝', '🎨', '🔬', '📊', '🧮', '🌍'];

function pickIcon(index) {
  return ICONS[index % ICONS.length];
}

function renderAll() {
  const app = document.getElementById('app');
  const disciplines = loadDisciplines();
  app.innerHTML = '';

  disciplines.forEach((disc, idx) => renderCard(app, disc, idx));

  // "+" add button
  const addBtn = document.createElement('button');
  addBtn.className = 'add-btn';
  addBtn.innerHTML = '<span class="add-btn__icon">+</span> Nova disciplina';
  addBtn.addEventListener('click', () => openModal(null));
  app.appendChild(addBtn);
}

function renderCard(container, disc, idx) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = parseDate(disc.startDate);
  const end   = parseDate(disc.endDate);

  const totalDays   = daysBetween(start, end) + 1;
  const elapsedDays = Math.max(0, Math.min(totalDays, daysBetween(start, today) + 1));
  const remaining   = Math.max(0, totalDays - elapsedDays);
  const progress    = Math.min(100, (elapsedDays / totalDays) * 100);
  const manualDays  = disc.manualDays || [];
  const done        = remaining <= 0;

  const card = document.createElement('div');
  card.className = 'card' + (done ? ' card--done' : '');

  card.innerHTML = `
    <div class="card__header">
      <div class="card__icon">${pickIcon(idx)}</div>
      <div class="card__title-group">
        <h2 class="card__title">${escHtml(disc.name)}</h2>
        <p class="card__subtitle">${escHtml(disc.semester)}</p>
      </div>
      <button class="card__edit-btn" data-id="${disc.id}" title="Editar">✎</button>
    </div>

    <div class="countdown">
      <div class="countdown__number">${remaining}</div>
      <div class="countdown__label">${done ? '🎉 Encerrado!' : 'dias restantes'}</div>
      <div class="countdown__bar-track">
        <div class="countdown__bar-fill" style="width: ${progress}%"></div>
      </div>
      <div class="countdown__dates">
        <span>${formatDateBR(start)}</span>
        <span>${formatDateBR(end)}</span>
      </div>
    </div>

    <div class="grid-section">
      <p class="grid-section__legend">
        <span class="legend-dot legend-dot--past"></span> Passados
        <span class="legend-dot legend-dot--today"></span> Hoje
        <span class="legend-dot legend-dot--future"></span> Restantes
        <span class="legend-dot legend-dot--manual"></span> Marcados
      </p>
      <div class="grid" data-grid-id="${disc.id}"></div>
    </div>
  `;

  // Edit button
  card.querySelector('.card__edit-btn').addEventListener('click', () => openModal(disc.id));

  // Day grid
  const grid = card.querySelector('.grid');

  for (let i = 0; i < totalDays; i++) {
    const cellDate = new Date(start);
    cellDate.setDate(cellDate.getDate() + i);

    const dateStr  = cellDate.toISOString().slice(0, 10);
    const isToday  = daysBetween(cellDate, today) === 0;
    const isPast   = cellDate < today && !isToday;
    const isManual = manualDays.includes(dateStr);

    const el = document.createElement('div');
    el.className = 'day';
    el.title = `Dia ${i + 1} — ${formatDateBR(cellDate)}`;

    if (isToday)     el.classList.add('day--today');
    else if (isPast) el.classList.add('day--past');
    else             el.classList.add('day--future');

    if (isManual) el.classList.add('day--manual');

    el.addEventListener('click', () => {
      toggleManualDay(disc.id, dateStr);
    });

    grid.appendChild(el);
  }

  container.appendChild(card);
}

function toggleManualDay(discId, dateStr) {
  const disciplines = loadDisciplines();
  const disc = disciplines.find((d) => d.id === discId);
  if (!disc) return;

  if (!disc.manualDays) disc.manualDays = [];

  const idx = disc.manualDays.indexOf(dateStr);
  if (idx === -1) {
    disc.manualDays.push(dateStr);
  } else {
    disc.manualDays.splice(idx, 1);
  }

  saveDisciplines(disciplines);
  renderAll();
}

function escHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}

// --- Modal ---------------------------------------------------

let editingId = null;

const overlay    = () => document.getElementById('modalOverlay');
const inputName  = () => document.getElementById('inputName');
const inputSem   = () => document.getElementById('inputSemester');
const inputStart = () => document.getElementById('inputStart');
const inputEnd   = () => document.getElementById('inputEnd');
const btnDelete  = () => document.getElementById('btnDelete');
const modalTitle = () => document.getElementById('modalTitle');

function openModal(id) {
  editingId = id;

  if (id) {
    // Edit existing
    const disc = loadDisciplines().find((d) => d.id === id);
    if (!disc) return;
    modalTitle().textContent = 'Editar Disciplina';
    inputName().value  = disc.name;
    inputSem().value   = disc.semester;
    inputStart().value = disc.startDate;
    inputEnd().value   = disc.endDate;
    btnDelete().classList.remove('hidden');
  } else {
    // New
    modalTitle().textContent = 'Nova Disciplina';
    inputName().value  = '';
    inputSem().value   = '';
    inputStart().value = '';
    inputEnd().value   = '';
    btnDelete().classList.add('hidden');
  }

  overlay().classList.add('active');

  // Notifica o main process para habilitar foco na janela
  if (window.widgetBridge) window.widgetBridge.modalOpened();

  setTimeout(() => inputName().focus(), 200);
}

function closeModal() {
  overlay().classList.remove('active');
  editingId = null;

  // Notifica o main process para desabilitar foco (volta a ficar atrás)
  if (window.widgetBridge) window.widgetBridge.modalClosed();
}

function saveModal() {
  const name  = inputName().value.trim();
  const sem   = inputSem().value.trim();
  const start = inputStart().value;
  const end   = inputEnd().value;

  if (!name || !start || !end) return;

  const disciplines = loadDisciplines();

  if (editingId) {
    const disc = disciplines.find((d) => d.id === editingId);
    if (disc) {
      disc.name      = name;
      disc.semester  = sem;
      disc.startDate = start;
      disc.endDate   = end;
    }
  } else {
    disciplines.push({
      id: uid(),
      name,
      semester: sem,
      startDate: start,
      endDate: end,
      manualDays: [],
    });
  }

  saveDisciplines(disciplines);
  closeModal();
  renderAll();
}

function deleteDisc() {
  if (!editingId) return;
  let disciplines = loadDisciplines();
  disciplines = disciplines.filter((d) => d.id !== editingId);
  saveDisciplines(disciplines);
  closeModal();
  renderAll();
}

// --- Bootstrap -----------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const disciplines = loadDisciplines();
  migrateOldData(disciplines);
  renderAll();

  // Modal buttons
  document.getElementById('btnSave').addEventListener('click', saveModal);
  document.getElementById('btnCancel').addEventListener('click', closeModal);
  document.getElementById('btnDelete').addEventListener('click', deleteDisc);

  // Close modal on overlay click
  overlay().addEventListener('click', (e) => {
    if (e.target === overlay()) closeModal();
  });

  // Keyboard: Escape to close, Enter to save
  document.addEventListener('keydown', (e) => {
    if (!overlay().classList.contains('active')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter')  saveModal();
  });

  // Re-render every minute
  setInterval(renderAll, 60000);
});
