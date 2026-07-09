const { contextBridge, ipcRenderer } = require('electron');

// ============================================================
//  studyBridge — API exposta ao renderer (widget + app)
// ============================================================
contextBridge.exposeInMainWorld('studyBridge', {
  // Fire-and-forget messages
  send: (channel, ...args) => {
    const validChannels = ['modal-opened', 'modal-closed', 'open-app', 'close-app', 'resize-widget'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  // Request-response (async)
  invoke: (channel, ...args) => {
    const validChannels = ['get-disciplines', 'save-disciplines', 'get-events', 'save-events', 'get-schedules', 'save-schedules'];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Canal inválido: ${channel}`));
  },
});
