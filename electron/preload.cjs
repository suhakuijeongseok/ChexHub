const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chexhub', {
  scan: () => ipcRenderer.invoke('chrome:scan'),
  openStore: (directory, extensionId) => ipcRenderer.invoke('chrome:open-store', { directory, extensionId }),
  openExtensionManager: (directory, extensionId) => ipcRenderer.invoke('chrome:open-extension-manager', { directory, extensionId }),
  openExtensionOptions: (directory, extensionId, optionsPage) => ipcRenderer.invoke('chrome:open-extension-options', { directory, extensionId, optionsPage }),
  listSets: () => ipcRenderer.invoke('sets:list'),
  saveSet: (set) => ipcRenderer.invoke('sets:save', set),
  deleteSet: (id) => ipcRenderer.invoke('sets:delete', id),
  showStore: (query, bounds) => ipcRenderer.send('store:show', { query, bounds }),
  resizeStore: (bounds) => ipcRenderer.send('store:bounds', bounds),
  hideStore: () => ipcRenderer.send('store:hide'),
  onStoreNavigate: (callback) => {
    const listener = (_event, selection) => callback(selection);
    ipcRenderer.on('store:navigated', listener);
    return () => ipcRenderer.removeListener('store:navigated', listener);
  },
});
