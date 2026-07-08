// ============================================================
//  shared/utils.js — Funções utilitárias compartilhadas
// ============================================================

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

function escHtml(str) {
  const el = document.createElement('span');
  el.textContent = str;
  return el.innerHTML;
}
