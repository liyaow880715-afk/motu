const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  runtime: "desktop",

  /** Verify activation code against remote server */
  verifyActivation: (serverUrl, key) =>
    ipcRenderer.invoke("desktop:verify-activation", serverUrl, key),

  /** Read saved activation config */
  getActivation: () => ipcRenderer.invoke("desktop:get-activation"),

  /** Clear activation and restart app */
  logout: () => ipcRenderer.invoke("desktop:logout"),
});
