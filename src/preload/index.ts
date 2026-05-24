import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getCardImage: (cardId: string, imageUrl: string) =>
    ipcRenderer.invoke('get-card-image', cardId, imageUrl),
  getCardData: (cardName: string, forceUpdate: boolean) => ipcRenderer.invoke('get-card-data', cardName, forceUpdate),
  getDecks: () => ipcRenderer.invoke('get-decks'),
  saveDecks: (decks: any) => ipcRenderer.invoke('save-decks', decks),
  hydrateCards: (identifiers: string[]) => ipcRenderer.invoke('hydrate-cards', identifiers),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
