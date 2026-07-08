// ============================================================
//  shared/store.js — Camada de abstração de dados
//  Phase 1: usa IPC → main process → arquivo JSON
//  Phase 5: será trocado por SQLite sem alterar a API
// ============================================================

const Store = {
  // Carrega disciplinas do main process via IPC
  async loadDisciplines() {
    if (window.studyBridge) {
      return await window.studyBridge.invoke('get-disciplines');
    }
    return [];
  },

  // Salva disciplinas via IPC
  async saveDisciplines(list) {
    if (window.studyBridge) {
      await window.studyBridge.invoke('save-disciplines', list);
    }
  },

  // Carrega eventos do calendário
  async loadEvents() {
    if (window.studyBridge) {
      return await window.studyBridge.invoke('get-events');
    }
    return [];
  },

  // Salva eventos
  async saveEvents(list) {
    if (window.studyBridge) {
      await window.studyBridge.invoke('save-events', list);
    }
  },
};
