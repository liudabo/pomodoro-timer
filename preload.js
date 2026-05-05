const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pomodoroAPI', {
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body })
});
