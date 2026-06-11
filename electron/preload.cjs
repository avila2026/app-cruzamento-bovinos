const { contextBridge } = require('electron');

// Bridge segura entre main e renderer (se necessário no futuro)
// Por enquanto expomos apenas uma API vazia para evitar warnings
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
