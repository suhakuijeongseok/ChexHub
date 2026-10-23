const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chexhub', {
  scan: () => ipcRenderer.invoke('chrome:scan'),
  openStore: (directory, extensionId) => ipcRenderer.invoke('chrome:open-store', { directory, extensionId }),
  openExtensionManager: (directory, extensionId) => ipcRenderer.invoke('chrome:open-extension-manager', { directory, extensionId }),
  listSets: () => ipcRenderer.invoke('sets:list'),
  saveSet: (set) => ipcRenderer.invoke('sets:save', set),
  deleteSet: (id) => ipcRenderer.invoke('sets:delete', id),
});
