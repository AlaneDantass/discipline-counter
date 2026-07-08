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

// --- Bootstrap -----------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  initTabs();

  // Load initial tab (disciplinas is the most useful on first open)
  renderDisciplinas();

  // Minimize button → close app window
  document.getElementById('minimizeBtn').addEventListener('click', () => {
    if (window.studyBridge) window.studyBridge.send('close-app');
  });
});
