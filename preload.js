const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widgetBridge', {
  modalOpened: () => ipcRenderer.send('modal-opened'),
  modalClosed: () => ipcRenderer.send('modal-closed'),
});
