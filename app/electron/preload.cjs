const { contextBridge, ipcRenderer } = require('electron');

let initialWorkspace = null;
try {
  initialWorkspace = ipcRenderer.sendSync('storage:load-sync');
} catch (e) {
  console.warn('[Preload] Could not fetch initial workspace sync:', e);
}

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  initialWorkspace,
  saveWorkspace: (serializedData) => ipcRenderer.invoke('storage:save', serializedData),
  revealDataFolder: () => ipcRenderer.invoke('storage:reveal'),
  getDataFilePath: () => ipcRenderer.invoke('storage:get-path')
});
