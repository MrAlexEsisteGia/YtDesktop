const {
  app,
  BrowserWindow,
  Tray,
  nativeImage,
  globalShortcut
} = require('electron')
var path = require('path')

var icon = path.join(__dirname, 'assets/icons/256x256.png')
const trayimage = nativeImage.createFromPath(icon)
var grayicon = path.join(__dirname, 'assets/icons/256x256mono.png')
const graytrayimage = nativeImage.createFromPath(grayicon)

let oldtitle
let tray = null
let notificationWindow
let mainWindow
let loadingWindow
function createWindow () {
  // startup screen
  loadingWindow = new BrowserWindow({
    backgroundColor: '#00FFFFFF',
    width: 256,
    height: 256,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    skipTaskbar: true
  })
  loadingWindow.setMenuBarVisibility(false)
  loadingWindow.loadFile('assets/icons/icon.html')

  // main window
  mainWindow = new BrowserWindow({
    icon: icon,
    backgroundColor: '#000000',
    show: false,
    MenuBarVisibility: false
  })
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
    loadingWindow.close()
    globalShortcut.register('Alt+x', () => {
      if (mainWindow.getTitle() !== 'YouTube Music') {
        notificationWindow.webContents.executeJavaScript(
          'changesong("' + mainWindow.getTitle().slice(0, -16) + '");'
        )
      } else {
        notificationWindow.webContents.executeJavaScript(
          'changesong(" Paused ");'
        )
      }
    })
  })
  mainWindow.setMenuBarVisibility(false)
  mainWindow.loadURL('https://music.youtube.com/')
  mainWindow.on('closed', function () {
    app.quit()
  })

  // notifications
  notificationWindow = new BrowserWindow({
    backgroundColor: '#00FFFFFF',
    width: 1920,
    height: 1080,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    skipTaskbar: true,
    type: 'toolbar'
  })
  notificationWindow.setIgnoreMouseEvents(true)
  notificationWindow.setMenuBarVisibility(false)
  notificationWindow.loadFile('assets/notifications/notification.html')
  oldtitle = 'YouTube Music'
  setInterval(function () {
    if (oldtitle !== mainWindow.getTitle()) {
      if (mainWindow.getTitle() !== 'YouTube Music') {
        notificationWindow.webContents.executeJavaScript(
          'changesong("' + mainWindow.getTitle().slice(0, -16) + '");'
        )
      }
    }
    oldtitle = mainWindow.getTitle()
  }, 2000)

  // tray
  mainWindow.once('ready-to-show', () => {
    tray = new Tray(trayimage)
    tray.setToolTip('YtDesktop')
    tray.on('click', () => {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
        tray.setImage(graytrayimage)
      } else {
        mainWindow.show()
        tray.setImage(trayimage)
      }
    })
  })
}
app.on('ready', createWindow) // create main window
