// ============================================================
//  app/app.js — Lógica da janela principal do StudyOS
// ============================================================

const ICONS = ['📚', '📐', '🧪', '💻', '📝', '🎨', '🔬', '📊', '🧮', '🌍'];

// --- Tab Navigation ------------------------------------------

function initTabs() {
  const navItems = document.querySelectorAll('.nav-item[data-tab]');
  const panels = document.querySelectorAll('.tab-panel');

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const tabId = item.dataset.tab;

      // Deactivate all
      navItems.forEach((n) => n.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));

      // Activate selected
      item.classList.add('active');
      const panel = document.getElementById(`tab-${tabId}`);
      if (panel) panel.classList.add('active');

      // Load tab content
      if (tabId === 'disciplinas') renderDisciplinas();
      else if (tabId === 'calendario') renderCalendario();
      else if (tabId === 'horarios') renderHorarios();
    });
  });
}

// --- Disciplinas Tab -----------------------------------------

async function renderDisciplinas() {
  const list = document.getElementById('discList');
  const disciplines = await Store.loadDisciplines();
  list.innerHTML = '';

  if (disciplines.length === 0) {
    list.innerHTML = `
      <div class="placeholder-panel" style="padding: 60px 0;">
        <div class="placeholder-icon">📚</div>
        <h3 class="placeholder-title">Nenhuma disciplina</h3>
        <p class="placeholder-text">Adicione disciplinas pelo widget na área de trabalho.</p>
      </div>
    `;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  disciplines.forEach((disc, idx) => {
    const start = parseDate(disc.startDate);
    const end   = parseDate(disc.endDate);

    const totalDays   = daysBetween(start, end) + 1;
    const elapsedDays = Math.max(0, Math.min(totalDays, daysBetween(start, today) + 1));
    const remaining   = Math.max(0, totalDays - elapsedDays);
    const progress    = Math.min(100, (elapsedDays / totalDays) * 100);

    const card = document.createElement('div');
    card.className = 'disc-card';
    card.innerHTML = `
      <div class="disc-card__icon">${ICONS[idx % ICONS.length]}</div>
      <div class="disc-card__info">
        <div class="disc-card__name">${escHtml(disc.name)}</div>
        <div class="disc-card__semester">${escHtml(disc.semester)}</div>
        <div class="disc-card__dates">${formatDateBR(start)} → ${formatDateBR(end)}</div>
      </div>
      <div class="disc-card__stats">
        <div class="disc-card__days">${remaining}</div>
        <div class="disc-card__days-label">${remaining === 0 ? 'Encerrado' : 'dias'}</div>
        <div class="disc-card__progress">
          <div class="disc-card__progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>
    `;
    list.appendChild(card);
  });
}

// --- Calendar State & Logic (Phase 2) ------------------------

const CalendarState = {
  currentDate: new Date(),
  selectedDate: new Date(),
  currentView: 'month',
  events: [],
  disciplines: []
};

let editingEventId = null;

function getDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function initCalendario() {
  // Load initial data
  CalendarState.events = await Store.loadEvents();
  CalendarState.disciplines = await Store.loadDisciplines();

  // Populate discipline select in modal
  const discSelect = document.getElementById('eventInputDiscipline');
  if (discSelect) {
    discSelect.innerHTML = '<option value="">Nenhuma / Geral</option>';
    CalendarState.disciplines.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      discSelect.appendChild(opt);
    });
  }

  // Navigation listeners
  document.getElementById('calendarPrevBtn').addEventListener('click', () => navigateCalendar(-1));
  document.getElementById('calendarNextBtn').addEventListener('click', () => navigateCalendar(1));

  // View toggle listeners
  document.getElementById('viewMonthBtn').addEventListener('click', () => switchCalendarView('month'));
  document.getElementById('viewWeekBtn').addEventListener('click', () => switchCalendarView('week'));

  // Add event buttons
  document.getElementById('addEventBtn').addEventListener('click', () => openEventModal());

  // Modal buttons
  document.getElementById('eventBtnCancel').addEventListener('click', closeEventModal);
  document.getElementById('eventBtnSave').addEventListener('click', saveEventFromModal);
  document.getElementById('eventBtnDelete').addEventListener('click', deleteEventFromModal);

  // Close modal on overlay click
  const overlay = document.getElementById('eventModalOverlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeEventModal();
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') closeEventModal();
    if (e.key === 'Enter') saveEventFromModal();
  });

  // Render initial calendar
  renderCalendario();
}

function renderCalendario() {
  if (CalendarState.currentView === 'month') {
    renderMonthView();
  } else {
    renderWeekView();
  }
  renderSidebarEvents();
}

function navigateCalendar(direction) {
  if (CalendarState.currentView === 'month') {
    CalendarState.currentDate.setMonth(CalendarState.currentDate.getMonth() + direction);
  } else {
    CalendarState.currentDate.setDate(CalendarState.currentDate.getDate() + direction * 7);
  }
  renderCalendario();
}

function switchCalendarView(view) {
  CalendarState.currentView = view;
  
  const mBtn = document.getElementById('viewMonthBtn');
  const wBtn = document.getElementById('viewWeekBtn');
  const mGrid = document.getElementById('monthGrid');
  const wGrid = document.getElementById('weekGrid');

  if (view === 'month') {
    mBtn.classList.add('active');
    wBtn.classList.remove('active');
    mGrid.classList.remove('hidden');
    wGrid.classList.add('hidden');
  } else {
    mBtn.classList.remove('active');
    wBtn.classList.add('active');
    mGrid.classList.add('hidden');
    wGrid.classList.remove('hidden');
  }

  renderCalendario();
}

function renderMonthView() {
  const date = CalendarState.currentDate;
  const year = date.getFullYear();
  const month = date.getMonth();

  // Update title
  const monthName = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  document.getElementById('calendarTitle').textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const monthGrid = document.getElementById('monthGrid');
  // Remove existing day cells
  const dayCells = monthGrid.querySelectorAll('.day-cell');
  dayCells.forEach(cell => cell.remove());

  // First day of current month and starting day of week (0-6)
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();

  // Number of days in current and previous months
  const numDays = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  // 1. Previous Month Days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const cellDate = new Date(year, month - 1, prevMonthDays - i);
    createDayCell(monthGrid, cellDate, true);
  }

  // 2. Current Month Days
  for (let d = 1; d <= numDays; d++) {
    const cellDate = new Date(year, month, d);
    createDayCell(monthGrid, cellDate, false);
  }

  // 3. Next Month Days (to make 42 cells total)
  const totalCells = firstDayOfWeek + numDays;
  const nextCells = 42 - totalCells;
  for (let d = 1; d <= nextCells; d++) {
    const cellDate = new Date(year, month + 1, d);
    createDayCell(monthGrid, cellDate, true);
  }
}

function createDayCell(grid, cellDate, isOtherMonth) {
  const dateStr = getDateStr(cellDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = daysBetween(cellDate, today) === 0;
  const isSelected = daysBetween(cellDate, CalendarState.selectedDate) === 0;

  const cell = document.createElement('div');
  cell.className = 'day-cell';
  if (isOtherMonth) cell.classList.add('day-cell--other-month');
  if (isToday) cell.classList.add('day-cell--today');
  if (isSelected) cell.classList.add('day-cell--selected');

  cell.innerHTML = `
    <div class="day-number">${cellDate.getDate()}</div>
    <div class="day-events-preview"></div>
  `;

  // Find events on this date
  const dayEvents = CalendarState.events.filter(e => e.date === dateStr);
  const previewContainer = cell.querySelector('.day-events-preview');
  
  // Show up to 3 event dots, then show a count if more
  dayEvents.slice(0, 3).forEach(event => {
    const dot = document.createElement('span');
    dot.className = `event-dot dot-${event.category || 'outro'}`;
    dot.title = event.title;
    previewContainer.appendChild(dot);
  });

  if (dayEvents.length > 3) {
    const countBadge = document.createElement('span');
    countBadge.style.fontSize = '8px';
    countBadge.style.fontWeight = '700';
    countBadge.style.color = 'var(--color-text-muted)';
    countBadge.textContent = `+${dayEvents.length - 3}`;
    previewContainer.appendChild(countBadge);
  }

  cell.addEventListener('click', () => {
    CalendarState.selectedDate = cellDate;
    // Update active highlight class
    grid.querySelectorAll('.day-cell').forEach(c => c.classList.remove('day-cell--selected'));
    cell.classList.add('day-cell--selected');
    renderSidebarEvents();
  });

  grid.appendChild(cell);
}

function renderWeekView() {
  const date = CalendarState.currentDate;
  // Get Monday of active week
  const currentDay = date.getDay(); // 0 = Sun, 1 = Mon...
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(date);
  monday.setDate(monday.getDate() + distanceToMonday);

  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  // Update title to date range
  const optMonth = { month: 'short' };
  const startStr = monday.toLocaleDateString('pt-BR', optMonth);
  const endStr = sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  document.getElementById('calendarTitle').textContent = `${monday.getDate()} ${startStr} - ${endStr}`;

  const weekGrid = document.getElementById('weekGrid');
  weekGrid.innerHTML = '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekDaysShort = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  for (let i = 0; i < 7; i++) {
    const cellDate = new Date(monday);
    cellDate.setDate(cellDate.getDate() + i);

    const isToday = daysBetween(cellDate, today) === 0;
    const dateStr = getDateStr(cellDate);

    const col = document.createElement('div');
    col.className = 'week-col';
    if (isToday) col.classList.add('active');

    col.innerHTML = `
      <div class="week-col__header">
        <span class="week-col__header-day">${weekDaysShort[i]}</span>
        <span class="week-col__header-date">${cellDate.getDate()}</span>
      </div>
      <div class="week-col__body"></div>
    `;

    const body = col.querySelector('.week-col__body');
    const dayEvents = CalendarState.events.filter(e => e.date === dateStr);

    dayEvents.forEach(event => {
      const card = document.createElement('div');
      card.className = `week-event-card cat-${event.category || 'outro'}`;
      card.innerHTML = `
        <div class="week-event-card__title">${escHtml(event.title)}</div>
        ${event.time ? `<div class="week-event-card__time">${event.time}</div>` : ''}
      `;
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        openEventModal(event.id);
      });
      body.appendChild(card);
    });

    // Make clicking the column header/empty space select that day
    col.addEventListener('click', () => {
      CalendarState.selectedDate = cellDate;
      renderSidebarEvents();
    });

    weekGrid.appendChild(col);
  }
}

function renderSidebarEvents() {
  const date = CalendarState.selectedDate;
  const label = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('selectedDateLabel').textContent = label.charAt(0).toUpperCase() + label.slice(1);

  const container = document.getElementById('dayEventsList');
  container.innerHTML = '';

  const dateStr = getDateStr(date);
  const dayEvents = CalendarState.events.filter(e => e.date === dateStr);

  // Sort by time
  dayEvents.sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  if (dayEvents.length === 0) {
    container.innerHTML = '<div class="no-events">Nenhum evento agendado</div>';
    return;
  }

  dayEvents.forEach(event => {
    const disc = CalendarState.disciplines.find(d => d.id === event.disciplineId);
    const card = document.createElement('div');
    card.className = `event-card cat-${event.category || 'outro'}`;
    card.innerHTML = `
      <div class="event-card__header">
        <div class="event-card__title">${escHtml(event.title)}</div>
        ${event.time ? `<div class="event-card__time">${event.time}</div>` : ''}
      </div>
      ${disc ? `<div class="event-card__disc">📚 ${escHtml(disc.name)}</div>` : ''}
      ${event.description ? `<div class="event-card__desc">${escHtml(event.description)}</div>` : ''}
      <div class="event-card__actions">
        <button class="btn-action btn-action--edit" data-id="${event.id}">Editar</button>
        <button class="btn-action btn-action--delete" data-id="${event.id}">Excluir</button>
      </div>
    `;

    card.querySelector('.btn-action--edit').addEventListener('click', () => openEventModal(event.id));
    card.querySelector('.btn-action--delete').addEventListener('click', () => deleteEvent(event.id));

    container.appendChild(card);
  });
}

// --- Event Modal Actions ---

function openEventModal(eventId = null) {
  editingEventId = eventId;
  const overlay = document.getElementById('eventModalOverlay');
  const titleEl = document.getElementById('eventModalTitle');
  const inputTitle = document.getElementById('eventInputTitle');
  const inputDate = document.getElementById('eventInputDate');
  const inputTime = document.getElementById('eventInputTime');
  const inputDisc = document.getElementById('eventInputDiscipline');
  const inputCat = document.getElementById('eventInputCategory');
  const inputDesc = document.getElementById('eventInputDesc');
  const btnDelete = document.getElementById('eventBtnDelete');

  if (eventId) {
    const event = CalendarState.events.find(e => e.id === eventId);
    if (!event) return;

    titleEl.textContent = 'Editar Evento';
    inputTitle.value = event.title;
    inputDate.value = event.date;
    inputTime.value = event.time || '';
    inputDisc.value = event.disciplineId || '';
    inputCat.value = event.category || 'prova';
    inputDesc.value = event.description || '';
    btnDelete.classList.remove('hidden');
  } else {
    titleEl.textContent = 'Novo Evento';
    inputTitle.value = '';
    inputDate.value = getDateStr(CalendarState.selectedDate);
    inputTime.value = '';
    inputDisc.value = '';
    inputCat.value = 'prova';
    inputDesc.value = '';
    btnDelete.classList.add('hidden');
  }

  overlay.classList.add('active');
  if (window.studyBridge) window.studyBridge.send('modal-opened');
  setTimeout(() => inputTitle.focus(), 150);
}

function closeEventModal() {
  document.getElementById('eventModalOverlay').classList.remove('active');
  editingEventId = null;
  if (window.studyBridge) window.studyBridge.send('modal-closed');
}

async function saveEventFromModal() {
  const title = document.getElementById('eventInputTitle').value.trim();
  const date = document.getElementById('eventInputDate').value;
  const time = document.getElementById('eventInputTime').value;
  const disciplineId = document.getElementById('eventInputDiscipline').value;
  const category = document.getElementById('eventInputCategory').value;
  const description = document.getElementById('eventInputDesc').value.trim();

  if (!title || !date) {
    alert('Por favor, preencha o título e a data do evento.');
    return;
  }

  if (editingEventId) {
    const event = CalendarState.events.find(e => e.id === editingEventId);
    if (event) {
      event.title = title;
      event.date = date;
      event.time = time;
      event.disciplineId = disciplineId;
      event.category = category;
      event.description = description;
    }
  } else {
    CalendarState.events.push({
      id: uid(),
      title,
      date,
      time,
      disciplineId,
      category,
      description
    });
  }

  await Store.saveEvents(CalendarState.events);
  closeEventModal();
  renderCalendario();
}

async function deleteEvent(eventId) {
  CalendarState.events = CalendarState.events.filter(e => e.id !== eventId);
  await Store.saveEvents(CalendarState.events);
  renderCalendario();
}

async function deleteEventFromModal() {
  if (editingEventId) {
    await deleteEvent(editingEventId);
    closeEventModal();
  }
}

// --- Schedule State & Logic (Phase 3) ------------------------

const ScheduleState = {
  schedules: [],
  editingId: null
};

async function initHorarios() {
  ScheduleState.schedules = await Store.loadSchedules();

  populateTimeSelects();
  populateScheduleDisciplineSelect();

  // Button triggers
  document.getElementById('addScheduleBtn').addEventListener('click', () => openScheduleModal());
  document.getElementById('schedBtnCancel').addEventListener('click', closeScheduleModal);
  document.getElementById('schedBtnSave').addEventListener('click', saveScheduleFromModal);
  document.getElementById('schedBtnDelete').addEventListener('click', deleteScheduleFromModal);

  const overlay = document.getElementById('schedModalOverlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeScheduleModal();
  });

  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') closeScheduleModal();
    if (e.key === 'Enter') saveScheduleFromModal();
  });
}

function populateTimeSelects() {
  const startSelect = document.getElementById('schedInputStart');
  const endSelect = document.getElementById('schedInputEnd');
  if (!startSelect || !endSelect) return;

  startSelect.innerHTML = '';
  endSelect.innerHTML = '';

  for (let h = 7; h <= 22; h++) {
    const hs = String(h).padStart(2, '0');
    
    // HH:00
    const opt1 = document.createElement('option');
    opt1.value = `${hs}:00`;
    opt1.textContent = `${hs}:00`;
    startSelect.appendChild(opt1);

    // HH:30
    const opt2 = document.createElement('option');
    opt2.value = `${hs}:30`;
    opt2.textContent = `${hs}:30`;
    startSelect.appendChild(opt2);
  }

  for (let h = 7; h <= 23; h++) {
    const hs = String(h).padStart(2, '0');
    
    if (h > 7) {
      // HH:00
      const opt1 = document.createElement('option');
      opt1.value = `${hs}:00`;
      opt1.textContent = `${hs}:00`;
      endSelect.appendChild(opt1);
    }

    if (h < 23) {
      // HH:30
      const opt2 = document.createElement('option');
      opt2.value = `${hs}:30`;
      opt2.textContent = `${hs}:30`;
      endSelect.appendChild(opt2);
    }
  }
}

function populateScheduleDisciplineSelect() {
  const discSelect = document.getElementById('schedInputDiscipline');
  if (discSelect) {
    discSelect.innerHTML = '<option value="">Nenhuma / Geral</option>';
    CalendarState.disciplines.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      discSelect.appendChild(opt);
    });
  }
}

function renderHorarios() {
  const grid = document.getElementById('scheduleGrid');
  if (!grid) return;

  // Clear existing dynamically generated hour labels and cards
  grid.querySelectorAll('.sched-hour-label, .sched-card').forEach(el => el.remove());

  // Render hour labels (07:00 to 22:00)
  for (let h = 7; h <= 22; h++) {
    const label = document.createElement('div');
    label.className = 'sched-hour-label';
    label.style.gridRow = `${(h - 7) * 2 + 2} / span 2`;
    label.textContent = `${String(h).padStart(2, '0')}:00`;
    grid.appendChild(label);
  }

  // Render cards
  ScheduleState.schedules.forEach(item => {
    const col = Number(item.dayOfWeek) + 1; // Mon = 1 => Col 2
    const rowStart = timeToRowIndex(item.startTime);
    let rowEnd = timeToRowIndex(item.endTime);
    if (rowEnd <= rowStart) rowEnd = rowStart + 1;

    const durationMinutes = (rowEnd - rowStart) * 30;

    const card = document.createElement('div');
    card.className = `sched-card sc-${item.category || 'outro'}`;
    card.style.gridColumn = col;
    card.style.gridRow = `${rowStart} / ${rowEnd}`;

    const disc = CalendarState.disciplines.find(d => d.id === item.disciplineId);
    const discLabel = disc ? `📚 ${disc.name}` : '';

    card.innerHTML = `
      <div class="sched-card__title" title="${item.title}">${escHtml(item.title)}</div>
      <div class="sched-card__time">${item.startTime} - ${item.endTime}</div>
      ${durationMinutes >= 60 && item.description ? `<div class="sched-card__desc">${escHtml(item.description)}</div>` : ''}
    `;

    card.addEventListener('click', () => openScheduleModal(item.id));
    grid.appendChild(card);
  });
}

function timeToRowIndex(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const halfHours = (h - 7) * 2 + (m >= 30 ? 1 : 0);
  return halfHours + 2; // row 1 is header
}

function openScheduleModal(id = null) {
  ScheduleState.editingId = id;
  populateScheduleDisciplineSelect(); // ensure latest disciplines are populated

  const overlay = document.getElementById('schedModalOverlay');
  const titleEl = document.getElementById('schedModalTitle');
  const inputTitle = document.getElementById('schedInputTitle');
  const inputDay = document.getElementById('schedInputDay');
  const inputStart = document.getElementById('schedInputStart');
  const inputEnd = document.getElementById('schedInputEnd');
  const inputDisc = document.getElementById('schedInputDiscipline');
  const inputCat = document.getElementById('schedInputCategory');
  const inputDesc = document.getElementById('schedInputDesc');
  const btnDelete = document.getElementById('schedBtnDelete');

  if (id) {
    const item = ScheduleState.schedules.find(s => s.id === id);
    if (!item) return;

    titleEl.textContent = 'Editar Horário Fixo';
    inputTitle.value = item.title;
    inputDay.value = item.dayOfWeek;
    inputStart.value = item.startTime;
    inputEnd.value = item.endTime;
    inputDisc.value = item.disciplineId || '';
    inputCat.value = item.category || 'aula';
    inputDesc.value = item.description || '';
    btnDelete.classList.remove('hidden');
  } else {
    titleEl.textContent = 'Novo Horário Fixo';
    inputTitle.value = '';
    inputDay.value = '1'; // Monday default
    inputStart.value = '08:00';
    inputEnd.value = '09:00';
    inputDisc.value = '';
    inputCat.value = 'aula';
    inputDesc.value = '';
    btnDelete.classList.add('hidden');
  }

  overlay.classList.add('active');
  if (window.studyBridge) window.studyBridge.send('modal-opened');
  setTimeout(() => inputTitle.focus(), 150);
}

function closeScheduleModal() {
  document.getElementById('schedModalOverlay').classList.remove('active');
  ScheduleState.editingId = null;
  if (window.studyBridge) window.studyBridge.send('modal-closed');
}

async function saveScheduleFromModal() {
  const title = document.getElementById('schedInputTitle').value.trim();
  const dayOfWeek = document.getElementById('schedInputDay').value;
  const startTime = document.getElementById('schedInputStart').value;
  const endTime = document.getElementById('schedInputEnd').value;
  const disciplineId = document.getElementById('schedInputDiscipline').value;
  const category = document.getElementById('schedInputCategory').value;
  const description = document.getElementById('schedInputDesc').value.trim();

  if (!title) {
    alert('Por favor, preencha o título do compromisso.');
    return;
  }

  // Validate start < end time
  const startRow = timeToRowIndex(startTime);
  const endRow = timeToRowIndex(endTime);
  if (endRow <= startRow) {
    alert('A hora de fim deve ser posterior à hora de início.');
    return;
  }

  if (ScheduleState.editingId) {
    const item = ScheduleState.schedules.find(s => s.id === ScheduleState.editingId);
    if (item) {
      item.title = title;
      item.dayOfWeek = dayOfWeek;
      item.startTime = startTime;
      item.endTime = endTime;
      item.disciplineId = disciplineId;
      item.category = category;
      item.description = description;
    }
  } else {
    ScheduleState.schedules.push({
      id: uid(),
      title,
      dayOfWeek,
      startTime,
      endTime,
      disciplineId,
      category,
      description
    });
  }

  await Store.saveSchedules(ScheduleState.schedules);
  closeScheduleModal();
  renderHorarios();
}

async function deleteSchedule(id) {
  ScheduleState.schedules = ScheduleState.schedules.filter(s => s.id !== id);
  await Store.saveSchedules(ScheduleState.schedules);
  renderHorarios();
}

async function deleteScheduleFromModal() {
  if (ScheduleState.editingId) {
    await deleteSchedule(ScheduleState.editingId);
    closeScheduleModal();
  }
}

// --- Bootstrap -----------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initCalendario();
  initHorarios();
  renderDisciplinas();

  // Minimize button → close app window
  document.getElementById('minimizeBtn').addEventListener('click', () => {
    if (window.studyBridge) window.studyBridge.send('close-app');
  });
});
