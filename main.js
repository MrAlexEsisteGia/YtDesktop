const {app, BrowserWindow, Menu, Tray} = require('electron')

let mainWindow
function createWindow () {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true
    }})
	
  mainWindow.setMenuBarVisibility(false)
  mainWindow.loadURL('https://music.youtube.com/')
  mainWindow.on('closed', function () {
    mainWindow = null
  })}
  
  let tray = null
app.on('ready', () => {
  tray = new Tray('icon.ico')
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Youtube Music', type: 'radio', checked: true },
  ])
  tray.setToolTip('Yt Desktop')
  tray.setContextMenu(contextMenu)
})
  
app.on('ready', createWindow)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }})