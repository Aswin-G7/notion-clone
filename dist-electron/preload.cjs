var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// electron/preload.ts
var preload_exports = {};
module.exports = __toCommonJS(preload_exports);
var import_electron = require("electron");
var electronAPI = {
  isElectron: true,
  clipboard: {
    writeText: (text) => import_electron.ipcRenderer.invoke("clipboard:writeText", text),
    readText: () => import_electron.ipcRenderer.invoke("clipboard:readText")
  },
  fileSystem: {
    exportFile: (filename, content, mimeType) => import_electron.ipcRenderer.invoke("file:exportFile", { filename, content, mimeType }),
    importFile: (acceptFilter) => import_electron.ipcRenderer.invoke("file:importFile", acceptFilter)
  },
  dialogs: {
    alert: (message) => import_electron.ipcRenderer.invoke("dialog:alert", message),
    confirm: (message) => import_electron.ipcRenderer.invoke("dialog:confirm", message)
  },
  app: {
    getVersion: () => import_electron.ipcRenderer.invoke("app:getVersion")
  }
};
import_electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
