import fs from 'fs'
import path from 'path'
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    title: 'MTG Deck Manager',
    ...(process.platform === 'linux' ? { icon } : {}),
    icon: path.join(__dirname, '../../build/icon.ico'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  const documentsPath = app.getPath('documents')
  const appFolder = path.join(documentsPath, 'mtg-deck-manager')
  const imagesFolder = path.join(appFolder, 'card_images')

  const cardsDbPath = path.join(appFolder, 'cards_db.json')
  const decksDbPath = path.join(appFolder, 'decks.json')

  if (!fs.existsSync(appFolder)) fs.mkdirSync(appFolder, { recursive: true })
  if (!fs.existsSync(imagesFolder)) fs.mkdirSync(imagesFolder, { recursive: true })

  if (!fs.existsSync(cardsDbPath)) fs.writeFileSync(cardsDbPath, JSON.stringify({}))
  if (!fs.existsSync(decksDbPath)) fs.writeFileSync(decksDbPath, JSON.stringify([]))

  ipcMain.handle('get-card-data', async (_event, cardName, forceUpdate = false) => {
    const db = JSON.parse(fs.readFileSync(cardsDbPath, 'utf8'))

    const cachedKey = Object.keys(db).find((k) => {
      const lowerK = k.toLowerCase()
      const lowerSearch = cardName.toLowerCase()
      return lowerK === lowerSearch || lowerK.startsWith(`${lowerSearch} //`)
    })

    if (cachedKey && db[cachedKey].cmc !== undefined && !forceUpdate) {
      console.log(`Loaded ${cardName} from local offline cache!`)
      return { success: true, data: db[cachedKey] }
    }

    try {
      console.log(`Fetching ${cardName} from Scryfall...`)
      const response = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
      )

      if (!response.ok) throw new Error(`Card not found`)

      const scryfallData = await response.json()

      const cardToSave = {
        id: scryfallData.id,
        name: scryfallData.name,
        mana_cost: scryfallData.mana_cost || scryfallData.card_faces?.[0]?.mana_cost || '',
        cmc: scryfallData.cmc || 0,
        type_line: scryfallData.type_line,
        prices: scryfallData.prices,
        legalities: scryfallData.legalities,
        imageUrl:
          scryfallData.image_uris?.normal || scryfallData.card_faces?.[0]?.image_uris?.normal
      }

      db[scryfallData.name] = cardToSave
      fs.writeFileSync(cardsDbPath, JSON.stringify(db, null, 2))

      await delay(510)

      return { success: true, data: cardToSave }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('get-card-image', async (_event, cardId, imageUrl) => {
    const imagePath = path.join(imagesFolder, `${cardId}.jpg`)

    if (fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath)
      return `data:image/jpeg;base64,${imageBuffer.toString('base64')}`
    }

    if (imageUrl) {
      console.log('Downloading image from Scryfall...')
      try {
        const response = await fetch(imageUrl)
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        fs.writeFileSync(imagePath, buffer)
        return `data:image/jpeg;base64,${buffer.toString('base64')}`
      } catch (error) {
        console.error('Failed to download image:', error)
        return null
      }
    }
    return null
  })

  ipcMain.handle('get-decks', () => {
    return JSON.parse(fs.readFileSync(decksDbPath, 'utf8'))
  })

  ipcMain.handle('save-decks', (_event, decks) => {
    fs.writeFileSync(decksDbPath, JSON.stringify(decks, null, 2))
    return true
  })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
