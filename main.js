const {app, BrowserWindow} = require('electron')
var path = require('path')
let mainWindow
function createWindow () {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
	icon: path.join(__dirname, 'assets/icons/png/512x512.png'),
    webPreferences: {
      nodeIntegration: true
    }
  })
  mainWindow.setMenuBarVisibility(false)
  mainWindow.loadURL('https://music.youtube.com/')
  mainWindow.on('closed', function () {
    mainWindow = null
  })
}
app.on('ready', createWindow)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }})