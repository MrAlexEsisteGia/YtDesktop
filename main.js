const {app, BrowserWindow, Menu, Tray, nativeImage} = require('electron')
var path = require('path')

var icon = path.join(__dirname, 'assets/icons/256x256.png');
const trayimage = nativeImage.createFromPath(icon);
var grayicon = path.join(__dirname, 'assets/icons/256x256mono.png');
const graytrayimage = nativeImage.createFromPath(grayicon);

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
  loadingWindow.loadFile('assets/icons/icon.html')
  

  mainWindow = new BrowserWindow({
	icon: (icon),
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
tray = new Tray(trayimage)
tray.setToolTip('Yt Desktop')
tray.on('click', () => {
 if(mainWindow.isVisible()){
  mainWindow.hide()
  tray.setImage(graytrayimage)
} else {
  mainWindow.show()
  tray.setImage(trayimage)
}
})
})
}
app.on('ready', createWindow)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
}})