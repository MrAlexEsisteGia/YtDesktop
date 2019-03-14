const {app, BrowserWindow, Menu, Tray} = require('electron')
var path = require('path')

let mainWindow
let loadingWindow
function createWindow () {
  loadingWindow = new BrowserWindow({
	backgroundColor: '#00FFFFFF',
    width: 256,
    height: 256,
    transparent: true,
	resizable: false,
	alwaysOnTop: true,
    frame:false
  })
  loadingWindow.setMenuBarVisibility(false)
  loadingWindow.loadFile('assets/icons/png/icon.html')
  

  mainWindow = new BrowserWindow({
	icon: ('assets/icons/png/512x512.png'),
	backgroundColor: '#000000',
	show: false,
    webPreferences: {
      nodeIntegration: true
    }})

    mainWindow.once('ready-to-show', () => {
     mainWindow.show()
	 mainWindow.maximize()
	 loadingWindow.close()
    })

  mainWindow.setMenuBarVisibility(false)
  mainWindow.loadURL('https://music.youtube.com/')

  mainWindow.on('closed', function () {
   mainWindow = null
  })

let tray = null
mainWindow.once('ready-to-show', () => {
tray = new Tray('assets/icons/png/256x256.png')
tray.setToolTip('Yt Desktop')
tray.on('click', () => {
 if(mainWindow.isVisible()){
  mainWindow.hide()
  tray.setImage('assets/icons/png/256x256mono.png')
} else {
  mainWindow.show()
  tray.setImage('assets/icons/png/256x256.png')
}
})
})
}
app.on('ready', createWindow)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
}})