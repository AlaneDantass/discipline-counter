// ============================================================
//  widget/widget.js — Lógica do widget desktop
//  Usa: shared/utils.js, shared/store.js (carregados via <script>)
// ============================================================

const ICONS = ['📚', '📐', '🧪', '💻', '📝', '🎨', '🔬', '📊', '🧮', '🌍'];

function pickIcon(index) {
  return ICONS[index % ICONS.length];
}

// --- Rendering -----------------------------------------------

async function renderAll() {
  const app = document.getElementById('app');
  const disciplines = await Store.loadDisciplines();
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

    el.addEventListener('click', () => toggleManualDay(disc.id, dateStr));
    grid.appendChild(el);
  }

  container.appendChild(card);
}

async function toggleManualDay(discId, dateStr) {
  const disciplines = await Store.loadDisciplines();
  const disc = disciplines.find((d) => d.id === discId);
  if (!disc) return;

  if (!disc.manualDays) disc.manualDays = [];

  const idx = disc.manualDays.indexOf(dateStr);
  if (idx === -1) {
    disc.manualDays.push(dateStr);
  } else {
    disc.manualDays.splice(idx, 1);
  }

  await Store.saveDisciplines(disciplines);
  renderAll();
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

async function openModal(id) {
  editingId = id;

  if (id) {
    const disciplines = await Store.loadDisciplines();
    const disc = disciplines.find((d) => d.id === id);
    if (!disc) return;
    modalTitle().textContent = 'Editar Disciplina';
    inputName().value  = disc.name;
    inputSem().value   = disc.semester;
    inputStart().value = disc.startDate;
    inputEnd().value   = disc.endDate;
    btnDelete().classList.remove('hidden');
  } else {
    modalTitle().textContent = 'Nova Disciplina';
    inputName().value  = '';
    inputSem().value   = '';
    inputStart().value = '';
    inputEnd().value   = '';
    btnDelete().classList.add('hidden');
  }

  overlay().classList.add('active');
  if (window.studyBridge) window.studyBridge.send('modal-opened');
  setTimeout(() => inputName().focus(), 200);
}

function closeModal() {
  overlay().classList.remove('active');
  editingId = null;
  if (window.studyBridge) window.studyBridge.send('modal-closed');
}

async function saveModal() {
  const name  = inputName().value.trim();
  const sem   = inputSem().value.trim();
  const start = inputStart().value;
  const end   = inputEnd().value;

  if (!name || !start || !end) return;

  const disciplines = await Store.loadDisciplines();

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

  await Store.saveDisciplines(disciplines);
  closeModal();
  renderAll();
}

async function deleteDisc() {
  if (!editingId) return;
  let disciplines = await Store.loadDisciplines();
  disciplines = disciplines.filter((d) => d.id !== editingId);
  await Store.saveDisciplines(disciplines);
  closeModal();
  renderAll();
}

// --- Bootstrap -----------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  renderAll();

  // Expand button → open app
  document.getElementById('expandBtn').addEventListener('click', () => {
    if (window.studyBridge) window.studyBridge.send('open-app');
  });

  // Modal buttons
  document.getElementById('btnSave').addEventListener('click', saveModal);
  document.getElementById('btnCancel').addEventListener('click', closeModal);
  document.getElementById('btnDelete').addEventListener('click', deleteDisc);

  overlay().addEventListener('click', (e) => {
    if (e.target === overlay()) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay().classList.contains('active')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter')  saveModal();
  });

  // Re-render every minute
  setInterval(renderAll, 60000);
});
