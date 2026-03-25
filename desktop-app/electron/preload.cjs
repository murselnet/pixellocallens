const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApi', {
  openFolder: () => ipcRenderer.invoke('media:open-folder'),
  copyFile: (file) => ipcRenderer.invoke('media:copy-file', file),
  changeTargetDirectory: () => ipcRenderer.invoke('media:change-target-directory'),
  getTargetDirectory: () => ipcRenderer.invoke('media:get-target-directory'),
  openInExplorer: (file) => ipcRenderer.invoke('media:open-in-explorer', file),
  getPreviewDataUrl: (file) => ipcRenderer.invoke('media:get-preview-data-url', file)
});
